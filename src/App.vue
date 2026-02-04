<script setup lang="ts">
/**
 * App.vue
 * AquaMonitor - Water Quality Dashboard
 */
import { ref, onMounted, nextTick, watch } from 'vue';
import WidgetSidebar from './components/WidgetSidebar.vue';
import TopNavbar from './components/TopNavbar.vue';
import DashboardGrid from './components/DashboardGrid.vue';
import DataUploader from './components/DataUploader.vue';
import type { Widget, GridStackItem, WidgetConfig } from '@/types/dashboard';
import type { ChartRecommendation } from '@/composables/useDataAnalyzer';
import { useDataStore } from '@/composables/useDataStore';

// Dashboard Grid 組件引用
const dashboardRef = ref<InstanceType<typeof DashboardGrid> | null>(null);

// Sidebar 狀態
const sidebarCollapsed = ref(false);

// Data Uploader Modal 狀態
const showDataUploader = ref(false);

// 上傳的數據暫存
const uploadedData = ref<Record<string, unknown>[]>([]);

const selectedWidget = ref<Widget | null>(null);
const lastAddAt = ref(0);

const { addDataSource } = useDataStore();


const WIDGETS_STORAGE_KEY = 'dashboard-widgets';

function loadWidgets(): Widget[] {
  try {
    const raw = localStorage.getItem(WIDGETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Widget[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

const widgets = ref<Widget[]>(loadWidgets());

watch(
  () => widgets.value,
  (value) => {
    localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true }
);

// 處理佈局變更事件
function handleLayoutChange(layout: GridStackItem[]) {
  console.log('Layout changed:', layout);
}

// 處理 Widget 刷新事件
function handleWidgetRefresh(widgetId: string) {
  console.log('Widget refreshed:', widgetId);
}

// 處理新增 Widget 事件
function handleWidgetAdded(widget: Widget) {
  console.log('Widget added:', widget);
}

function handleWidgetRemoved(widgetId: string) {
  const index = widgets.value.findIndex((w) => w.id === widgetId);
  if (index > -1) {
    widgets.value.splice(index, 1);
  }

  if (selectedWidget.value?.id === widgetId) {
    selectedWidget.value = null;
  }
}

function handleAddEmptyWidget() {
  const now = Date.now();
  if (now - lastAddAt.value < 300) return;
  lastAddAt.value = now;

  const name = window.prompt('請輸入 Widget 名稱', '新 Widget');
  if (!name) return;

  const maxY = widgets.value.reduce((max, w) => Math.max(max, w.y + w.h), 0);
  const newWidget: Widget = {
    id: `empty-${Date.now()}`,
    x: 0,
    y: maxY,
    w: 6,
    h: 4,
    type: 'line',
    title: name,
    config: {},
  };
  widgets.value.push(newWidget);
  selectedWidget.value = newWidget;
}

function handleWidgetSelected(widget: Widget) {
  selectedWidget.value = widget;
}

// 切換側邊欄
function handleSidebarToggle() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

// 開啟數據上傳對話框
function handleUploadData() {
  showDataUploader.value = true;
}

// 關閉數據上傳對話框
function handleCloseUploader() {
  showDataUploader.value = false;
}

// 處理圖表推薦選擇
function handleChartSelected(recommendation: ChartRecommendation, data: Record<string, unknown>[]) {
  console.log('Chart selected:', recommendation);
  console.log('Data:', data);

  // 儲存數據
  uploadedData.value = data;

  const sourceName = `Uploaded Data ${new Date().toLocaleString()}`;
  const dataSourceId = addDataSource(sourceName, data);

  // 計算新 widget 的位置（找到最大 y 值）
  const maxY = widgets.value.reduce((max, w) => Math.max(max, w.y + w.h), 0);

  // 根據圖表類型決定預設尺寸
  const sizeMap: Record<string, { w: number; h: number }> = {
    line: { w: 6, h: 4 },
    area: { w: 6, h: 4 },
    bar: { w: 6, h: 4 },
    pie: { w: 4, h: 4 },
    radialBar: { w: 3, h: 4 },
    metric: { w: 3, h: 2 },
    dataGrid: { w: 6, h: 4 },
    activity: { w: 4, h: 4 },
    sankey: { w: 8, h: 5 },
    treemap: { w: 6, h: 5 },
    radar: { w: 5, h: 5 },
  };

  const size = sizeMap[recommendation.type] || { w: 4, h: 4 };

  // 創建新的 widget
  const newWidget: Widget = {
    id: `uploaded-${Date.now()}`,
    x: 0,
    y: maxY,
    w: size.w,
    h: size.h,
    type: recommendation.type,
    title: recommendation.title,
    config: {
      dataSourceId,
      // 傳遞欄位映射資訊
      xAxis: recommendation.xAxis,
      yAxis: recommendation.yAxis,
      category: recommendation.category,
      value: recommendation.value,
      source: recommendation.source,
      target: recommendation.target,
    },
    // 附加原始數據（實際應用中應存在 store 或通過 API）
  };

  // 添加到 widgets 列表
  widgets.value.push(newWidget);

  // 關閉對話框
  showDataUploader.value = false;

  console.log('New widget created:', newWidget);
}

function handleConfigChange(payload: { widgetId: string; config: Partial<WidgetConfig> }) {
  const { widgetId, config } = payload;

  const index = widgets.value.findIndex((w) => w.id === widgetId);
  if (index > -1) {
    const target = widgets.value[index]!;
    const updated = {
      ...target,
      config: {
        ...target.config,
        ...config,
      },
    } as Widget;
    widgets.value.splice(index, 1, updated);
    selectedWidget.value = updated;
    return;
  }

  const updated = dashboardRef.value?.updateWidgetConfig?.(widgetId, config);
  if (updated && selectedWidget.value?.id === widgetId) {
    selectedWidget.value = {
      ...selectedWidget.value,
      config: {
        ...selectedWidget.value.config,
        ...config,
      },
    };
  }
}

function handleTypeChange(payload: { widgetId: string; type: Widget['type'] }) {
  const { widgetId, type } = payload;

  const index = widgets.value.findIndex((w) => w.id === widgetId);
  if (index > -1) {
    const target = widgets.value[index];
    const updated = {
      ...target,
      type,
    } as Widget;
    widgets.value.splice(index, 1, updated);
    selectedWidget.value = updated;
    return;
  }

  const updated = dashboardRef.value?.updateWidgetType?.(widgetId, type);
  if (updated && selectedWidget.value?.id === widgetId) {
    selectedWidget.value = {
      ...selectedWidget.value,
      type,
    };
  }
}


// 全螢幕切換
function handleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}


// 設定側邊欄拖拉
onMounted(async () => {
  await nextTick();

  // GridStack.setupDragIn 已在 WidgetSidebar 中處理
});
</script>

<template>
  <div class="dashboard-layout">
    <!-- Sidebar -->
    <WidgetSidebar
      ref="sidebarRef"
      :collapsed="sidebarCollapsed"
      :selected-widget="selectedWidget"
      @toggle="handleSidebarToggle"
      @add-widget="handleAddEmptyWidget"
      @upload-data="handleUploadData"
      @config-change="handleConfigChange"
      @type-change="handleTypeChange"
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top Navbar -->
      <TopNavbar
        :sensor-count="12"
        :is-streaming="true"
        @fullscreen="handleFullscreen"
      />

      <!-- Dashboard Content -->
      <main class="flex-1 overflow-auto p-6 bg-slate-950">
        <!-- Section Title -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-slate-100">System Overview</h2>
        </div>

        <!-- Grid -->
        <DashboardGrid
          ref="dashboardRef"
          :widgets="widgets"
          :columns="12"
          :cell-height="70"
          :margin="12"
          @layout-change="handleLayoutChange"
          @widget-refresh="handleWidgetRefresh"
          @widget-added="handleWidgetAdded"
          @widget-selected="handleWidgetSelected"
          @widget-removed="handleWidgetRemoved"
        />
      </main>
    </div>

    <!-- Data Uploader Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDataUploader"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="handleCloseUploader"
          />

          <!-- Modal Content -->
          <div class="relative w-full max-w-md mx-4">
            <DataUploader
              @chart-selected="handleChartSelected"
              @close="handleCloseUploader"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95) translateY(-10px);
}
</style>