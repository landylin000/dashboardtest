<script setup lang="ts">
/**
 * App.vue
 * AquaMonitor - Water Quality Dashboard
 */
import { ref, onMounted, nextTick } from 'vue';
import { GridStack } from 'gridstack';
import WidgetSidebar from './components/WidgetSidebar.vue';
import TopNavbar from './components/TopNavbar.vue';
import DashboardGrid from './components/DashboardGrid.vue';
import type { Widget, GridStackItem, DashboardLayout } from '@/types/dashboard';

// Dashboard Grid 組件引用
const dashboardRef = ref<InstanceType<typeof DashboardGrid> | null>(null);
const sidebarRef = ref<InstanceType<typeof WidgetSidebar> | null>(null);

// Sidebar 狀態
const sidebarCollapsed = ref(false);

// 預設 Widget 配置 - 模擬圖片中的佈局
const widgets = ref<Widget[]>([
  // System Overview - Row 1: 4 Metric Cards
  {
    id: 'system-uptime',
    x: 0,
    y: 0,
    w: 3,
    h: 2,
    type: 'metric',
    title: 'System Uptime',
    config: { unit: '%' },
  },
  {
    id: 'data-throughput',
    x: 3,
    y: 0,
    w: 3,
    h: 2,
    type: 'metric',
    title: 'Data Throughput',
    config: { unit: 'GB/s' },
  },
  {
    id: 'avg-latency',
    x: 6,
    y: 0,
    w: 3,
    h: 2,
    type: 'metric',
    title: 'Avg Latency',
    config: { unit: 'ms' },
  },
  {
    id: 'active-alerts',
    x: 9,
    y: 0,
    w: 3,
    h: 2,
    type: 'metric',
    title: 'Active Alerts',
    config: {},
  },
  // Row 2: pH Chart + Water Pressure Gauge
  {
    id: 'ph-dissolved-oxygen',
    x: 0,
    y: 2,
    w: 8,
    h: 5,
    type: 'area',
    title: 'pH & Dissolved Oxygen',
    config: {
      colors: ['#3b82f6', '#22c55e'],
    },
  },
  {
    id: 'water-pressure',
    x: 8,
    y: 2,
    w: 4,
    h: 5,
    type: 'gauge',
    title: 'Water Pressure',
    config: {
      colors: ['#22c55e', '#86efac'],
    },
  },
  // Row 3: Sensor Readings + System Logs
  {
    id: 'sensor-readings',
    x: 0,
    y: 7,
    w: 6,
    h: 4,
    type: 'bar',
    title: 'Sensor Readings',
    config: {
      colors: ['#06b6d4', '#22d3ee'],
    },
  },
  {
    id: 'system-logs',
    x: 6,
    y: 7,
    w: 6,
    h: 4,
    type: 'dataGrid',
    title: 'System Logs',
    config: {},
  },
]);

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

// 切換側邊欄
function handleSidebarToggle() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

// 儲存當前佈局
function handleSaveLayout() {
  if (!dashboardRef.value) return;
  const layout: DashboardLayout = dashboardRef.value.saveLayout();
  console.log('Saved layout:', JSON.stringify(layout, null, 2));
  localStorage.setItem('dashboard-layout', JSON.stringify(layout));
  alert('Layout saved!');
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

  // 設置外部拖拉源
  const sidebarItems = document.querySelectorAll('.widget-library-item');
  sidebarItems.forEach((item) => {
    GridStack.setupDragIn(item as HTMLElement, {
      appendTo: 'body',
      helper: 'clone',
    });
  });
});
</script>

<template>
  <div class="dashboard-layout">
    <!-- Sidebar -->
    <WidgetSidebar
      ref="sidebarRef"
      :collapsed="sidebarCollapsed"
      @toggle="handleSidebarToggle"
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
        />
      </main>
    </div>
  </div>
</template>
