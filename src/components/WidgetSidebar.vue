<script setup lang="ts">
/**
 * WidgetSidebar.vue
 * 左側配置面板 - 設定資料來源與圖表
 */
import { ref, computed, watch } from 'vue';
import type { Widget, WidgetType, WidgetConfig } from '@/types/dashboard';
import { useDataStore } from '@/composables/useDataStore';
import { useDataAnalyzer } from '@/composables/useDataAnalyzer';

interface Props {
  collapsed?: boolean;
  selectedWidget?: Widget | null;
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  selectedWidget: null,
});

const emit = defineEmits<{
  toggle: [];
  'upload-data': [];
  'config-change': [payload: { widgetId: string; config: Partial<WidgetConfig> }];
  'type-change': [payload: { widgetId: string; type: WidgetType }];
  'add-widget': [];
}>();

const { dataSourceOptions, getDataKeys, getDataSource } = useDataStore();
const { analyzeData } = useDataAnalyzer();

const selectedSourceId = ref('');
const selectedXAxis = ref('');
const selectedYAxis = ref('');
const selectedValueAxis = ref('');
const selectedChartType = ref<WidgetType>('line');

const availableKeys = computed(() => getDataKeys(selectedSourceId.value));

const chartTypeLabels: Record<WidgetType, string> = {
  line: '折線圖',
  area: '面積圖',
  bar: '長條圖',
  stepLine: '階梯線圖',
  stackedBar: '堆疊長條圖',
  scatter: '散點圖',
  bubble: '氣泡圖',
  dotPlot: '點圖',
  radar: '雷達圖',
  heatmap: '熱力圖',
  treemap: '樹狀圖',
  sankey: '桑基圖',
  pie: '圓餅圖',
  radialBar: '儀表圖',
  metric: '指標卡',
  gauge: '儀錶',
  dataGrid: '資料表格',
  activity: '活動時間軸',
  phylogenetic: '系統發生樹',
  admixture: '遺傳結構圖',
  boxPlot: '盒鬚圖',
};

const allChartTypes: WidgetType[] = [
  'line',
  'area',
  'bar',
  'stepLine',
  'stackedBar',
  'scatter',
  'bubble',
  'dotPlot',
  'radar',
  'heatmap',
  'treemap',
  'sankey',
  'pie',
  'radialBar',
  'metric',
  'gauge',
  'dataGrid',
  'activity',
  'phylogenetic',
  'admixture',
  'boxPlot',
];

const recommendedChartTypes = computed(() => {
  const source = getDataSource(selectedSourceId.value);
  if (!source) return [] as WidgetType[];
  const analysis = analyzeData(source.rows);
  const types = analysis.recommendations.map((rec) => rec.type);
  return Array.from(new Set(types));
});

const chartTypeOptions = computed(() => {
  const recommended = recommendedChartTypes.value;
  return recommended.length > 0 ? recommended : allChartTypes;
});


watch(
  () => props.selectedWidget,
  (widget) => {
    if (!widget) {
      selectedSourceId.value = '';
      selectedXAxis.value = '';
      selectedYAxis.value = '';
      selectedChartType.value = 'line';
      return;
    }

    selectedChartType.value = widget.type;
    selectedSourceId.value = widget.config?.dataSourceId || '';
    
    // 自動填入欄位（如果已配置）
    selectedXAxis.value =
      widget.type === 'pie' || widget.type === 'treemap'
        ? widget.config?.category || ''
        : widget.type === 'sankey'
          ? widget.config?.source || widget.config?.xAxis || ''
          : widget.config?.xAxis || '';
    const yAxisValue = Array.isArray(widget.config?.yAxis)
      ? widget.config?.yAxis[0]
      : widget.config?.yAxis;
    selectedYAxis.value =
      widget.type === 'pie' || widget.type === 'treemap'
        ? widget.config?.value || ''
        : widget.type === 'sankey'
          ? widget.config?.target || yAxisValue || ''
          : widget.type === 'metric' || widget.type === 'gauge' || widget.type === 'radialBar'
            ? widget.config?.value || yAxisValue || ''
            : yAxisValue || '';
    selectedValueAxis.value = widget.config?.value || '';
  },
  { immediate: true }
);

// 當資料來源改變時，自動偵測並填入最佳欄位
watch(
  () => selectedSourceId.value,
  (newSourceId) => {
    if (!newSourceId || !props.selectedWidget) return;
    
    // 如果欄位已手動配置，不要覆蓋
    if (selectedXAxis.value || selectedYAxis.value) return;
    
    const source = getDataSource(newSourceId);
    if (!source) return;
    
    const analysis = analyzeData(source.rows);
    const recommendation = analysis.recommendations.find(r => r.type === selectedChartType.value);
    
    if (recommendation) {
      // 自動填入推薦的欄位配置
      selectedXAxis.value = recommendation.xAxis || recommendation.category || recommendation.source || '';
      selectedYAxis.value = 
        Array.isArray(recommendation.yAxis) 
          ? recommendation.yAxis[0] || ''
          : recommendation.yAxis || recommendation.target || '';
      selectedValueAxis.value = recommendation.value || '';
    }
  }
);

watch(
  () => selectedChartType.value,
  (type) => {
    const widget = props.selectedWidget;
    if (!widget) return;
    if (widget.type === type) return;
    emit('type-change', { widgetId: widget.id, type });
  }
);

watch(
  () => chartTypeOptions.value,
  (options) => {
    if (!options.length) return;
    if (!options.includes(selectedChartType.value)) {
      selectedChartType.value = options[0]!;
    }
  },
  { immediate: true }
);

function emitConfigChange() {
  const widget = props.selectedWidget;
  if (!widget) return;

  const config: Partial<WidgetConfig> = {
    dataSourceId: selectedSourceId.value || undefined,
  };

  if (widget.type === 'pie') {
    config.category = selectedXAxis.value || undefined;
    config.value = selectedYAxis.value || undefined;
  } else if (widget.type === 'treemap') {
    config.category = selectedXAxis.value || undefined;
    config.value = selectedYAxis.value || undefined;
  } else if (widget.type === 'sankey') {
    config.source = selectedXAxis.value || undefined;
    config.target = selectedYAxis.value || undefined;
    config.value = selectedValueAxis.value || undefined;
  } else if (widget.type === 'metric' || widget.type === 'gauge' || widget.type === 'radialBar') {
    config.value = selectedYAxis.value || undefined;
  } else if (widget.type === 'line' || widget.type === 'area' || widget.type === 'bar' || widget.type === 'radar') {
    config.xAxis = selectedXAxis.value || undefined;
    config.yAxis = selectedYAxis.value || undefined;
  }

  emit('config-change', { widgetId: widget.id, config });
}


watch(
  () => selectedSourceId.value,
  (value) => {
    if (!value) {
      selectedXAxis.value = '';
      selectedYAxis.value = '';
      emitConfigChange();
      return;
    }

    const keys = getDataKeys(value);
    if (!keys.includes(selectedXAxis.value)) {
      selectedXAxis.value = '';
    }
    if (!keys.includes(selectedYAxis.value)) {
      selectedYAxis.value = '';
    }
    emitConfigChange();
  }
);

watch(
  () => [selectedXAxis.value, selectedYAxis.value],
  () => {
    emitConfigChange();
  }
);

function handleToggle() {
  emit('toggle');
}
</script>

<template>
  <aside
    class="sidebar relative"
    :class="{ collapsed }"
  >
    <!-- Toggle Button -->
    <button
      type="button"
      class="sidebar-toggle"
      @click="handleToggle"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-slate-400 transition-transform"
        :class="{ 'rotate-180': collapsed }"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>

    <!-- Header -->
    <div class="sidebar-header">
      <h2
        v-if="!collapsed"
        class="text-sm font-semibold text-slate-100"
      >
        資料配置
      </h2>
      <p
        v-if="!collapsed"
        class="text-xs text-slate-500 mt-1"
      >
        選取 Widget 後設定資料來源與圖表
      </p>
    </div>

    <!-- Configuration Panel -->
    <div
      v-if="!collapsed"
      class="px-3 pb-3"
    >
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div class="text-xs font-semibold text-slate-200">設定</div>
        <div class="mt-1 text-xs text-slate-500">選取 Widget 後配置資料來源與欄位</div>

        <div
          v-if="!selectedWidget"
          class="mt-3 text-xs text-slate-400"
        >
          尚未選取 Widget
        </div>

        <div v-else class="mt-3 space-y-3">
          <div class="text-xs text-slate-400">
            已選取：<span class="text-slate-200">{{ selectedWidget.title }}</span>
          </div>

          <label class="block text-xs text-slate-400">圖表類型</label>
          <select
            v-model="selectedChartType"
            class="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-200"
          >
            <option
              v-for="type in chartTypeOptions"
              :key="type"
              :value="type"
            >
              {{ chartTypeLabels[type] }}
            </option>
          </select>

          <label class="block text-xs text-slate-400">資料來源</label>
          <select
            v-model="selectedSourceId"
            class="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-200"
          >
            <option value="">請選擇資料來源</option>
            <option
              v-for="source in dataSourceOptions"
              :key="source.id"
              :value="source.id"
            >
              {{ source.name }} ({{ source.rowCount }})
            </option>
          </select>

          <label class="block text-xs text-slate-400">X 軸 / 類別欄位</label>
          <select
            v-model="selectedXAxis"
            class="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-200"
            :disabled="!selectedSourceId"
          >
            <option value="">請選擇欄位</option>
            <option
              v-for="key in availableKeys"
              :key="key"
              :value="key"
            >
              {{ key }}
            </option>
          </select>

          <label class="block text-xs text-slate-400">Y 軸 / 數值欄位</label>
          <select
            v-model="selectedYAxis"
            class="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-200"
            :disabled="!selectedSourceId"
          >
            <option value="">請選擇欄位</option>
            <option
              v-for="key in availableKeys"
              :key="key"
              :value="key"
            >
              {{ key }}
            </option>
          </select>

          <!-- 桑基圖專用：值欄位 -->
          <template v-if="selectedChartType === 'sankey'">
            <label class="block text-xs text-slate-400">權重欄位 (Value)</label>
            <select
              v-model="selectedValueAxis"
              class="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-200"
              :disabled="!selectedSourceId"
            >
              <option value="">自動偵測</option>
              <option
                v-for="key in availableKeys"
                :key="key"
                :value="key"
              >
                {{ key }}
              </option>
            </select>
          </template>

          <!-- 自動配置提示 -->
          <div 
            v-if="selectedSourceId && selectedXAxis && selectedYAxis"
            class="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2"
          >
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="text-xs text-emerald-300">
                <div class="font-medium">已自動配置</div>
                <div class="text-emerald-400/70 mt-0.5">欄位已根據數據自動選擇，您可以手動調整</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Upload Data Button -->
    <div
      v-if="!collapsed"
      class="px-3 pb-3"
    >
      <button
        type="button"
        class="mb-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium transition-colors"
        @click="emit('add-widget')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        <span>新增空白 Widget</span>
      </button>
      <button
        type="button"
        class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        @click="emit('upload-data')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
        <span>上傳資料</span>
      </button>
    </div>

    <!-- Footer -->
    <div
      v-if="!collapsed"
      class="p-4 border-t border-slate-800"
    >
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <span class="w-2 h-2 rounded-full bg-emerald-500" />
        <span>v2.4.1</span>
        <span class="ml-auto text-emerald-400">CONNECTED</span>
      </div>
    </div>
  </aside>
</template>
