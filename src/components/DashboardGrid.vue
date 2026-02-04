<script setup lang="ts">
/**
 * DashboardGrid.vue
 * 佈局核心組件 - 整合 GridStack.js 實現拖拉式佈局
 */
import {
  ref,
  reactive,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  type Component,
} from 'vue';
import { GridStack, type GridStackNode, type GridStackWidget } from 'gridstack';
import WidgetWrapper from './WidgetWrapper.vue';
import {
  LineChart,
  AreaChart,
  BarChart,
  RadialBarChart,
  MetricCard,
  GaugeChart,
  PieChart,
  DataGridWidget,
  ActivityWidget,
} from './charts';
import type {
  Widget,
  WidgetType,
  WidgetStatus,
  ChartDataResponse,
  MetricData,
  GaugeData,
  DataGridData,
  ActivityData,
  DashboardLayout,
  GridStackItem,
} from '@/types/dashboard';

interface Props {
  widgets: Widget[];
  columns?: number;
  cellHeight?: number;
  margin?: number;
}

const props = withDefaults(defineProps<Props>(), {
  columns: 12,
  cellHeight: 80,
  margin: 12,
});

const emit = defineEmits<{
  'layout-change': [layout: GridStackItem[]];
  'widget-refresh': [widgetId: string];
  'widget-added': [widget: Widget];
}>();

// GridStack instance
let grid: GridStack | null = null;
const gridContainer = ref<HTMLElement | null>(null);

// Widget 狀態管理
const widgetStates = reactive<Map<string, WidgetStatus>>(new Map());
const widgetData = reactive<Map<string, ChartDataResponse | MetricData | GaugeData | DataGridData | ActivityData | null>>(new Map());

// 動態 widgets 列表
const dynamicWidgets = ref<Widget[]>([]);

// 合併 props.widgets 和動態添加的 widgets
const allWidgets = ref<Widget[]>([]);

// 圖表組件映射
const chartComponents: Record<string, Component> = {
  line: LineChart,
  area: AreaChart,
  bar: BarChart,
  radialBar: RadialBarChart,
  metric: MetricCard,
  gauge: GaugeChart,
  pie: PieChart,
  dataGrid: DataGridWidget,
  activity: ActivityWidget,
};

// Widget 預設標題映射
const widgetDefaultTitles: Record<string, string> = {
  line: 'Line Chart',
  area: 'Area Chart',
  bar: 'Bar Chart',
  radialBar: 'Radial Bar',
  metric: 'Metric',
  gauge: 'Gauge',
  pie: 'Pie Chart',
  dataGrid: 'Data Grid',
  activity: 'Activity',
};

// 取得對應的圖表組件
function getChartComponent(type: WidgetType): Component {
  return chartComponents[type] || LineChart;
}

// 取得 Widget 狀態
function getWidgetStatus(id: string): WidgetStatus {
  return widgetStates.get(id) || 'idle';
}

// 取得 Widget 數據
function getWidgetData(id: string): ChartDataResponse | MetricData | GaugeData | DataGridData | ActivityData | null {
  return widgetData.get(id) || null;
}

// 設定 Widget 狀態
function setWidgetStatus(id: string, status: WidgetStatus) {
  widgetStates.set(id, status);
}

// 設定 Widget 數據
function setWidgetData(id: string, data: ChartDataResponse | MetricData | GaugeData | DataGridData | ActivityData | null) {
  widgetData.set(id, data);
}

// 生成即時時間戳
function generateTimeStamps(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const time = new Date(now.getTime() - (count - i - 1) * 6000);
    return time.toLocaleTimeString('en-US', { hour12: false });
  });
}

// 模擬 API 請求取得數據
async function fetchWidgetData(widget: Widget): Promise<ChartDataResponse | MetricData | GaugeData | DataGridData | ActivityData> {
  // 模擬網路延遲
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300));

  // 根據 Widget 類型生成模擬數據
  switch (widget.type) {
    case 'metric':
      return generateMetricData(widget);
    case 'gauge':
      return generateGaugeData(widget);
    case 'dataGrid':
      return generateDataGridData();
    case 'activity':
      return generateActivityData();
    case 'pie':
      return generatePieData();
    default:
      return generateChartData(widget);
  }
}

// 生成模擬圖表數據
function generateChartData(widget: Widget): ChartDataResponse {
  const categories = generateTimeStamps(8);
  const generateWaveValues = () =>
    categories.map((_, i) => 6.5 + Math.sin(i * 0.8) * 1.5 + Math.random() * 0.5);

  switch (widget.type) {
    case 'radialBar':
      return {
        series: [{ name: widget.title, data: [Math.floor(Math.random() * 40) + 60] }],
        categories: [widget.title],
      };
    case 'area':
      return {
        series: [
          { name: 'pH Level', data: generateWaveValues() },
          { name: 'Dissolved Oxygen', data: generateWaveValues().map(v => v + 1) },
        ],
        categories,
      };
    default:
      return {
        series: [
          { name: 'Series A', data: categories.map(() => Math.floor(Math.random() * 100) + 20) },
          { name: 'Series B', data: categories.map(() => Math.floor(Math.random() * 100) + 20) },
        ],
        categories,
      };
  }
}

// 生成模擬 Metric 數據
function generateMetricData(widget: Widget): MetricData {
  const presets: Record<string, Partial<MetricData>> = {
    'System Uptime': { value: 99.96, unit: '%', trendValue: 0.02 },
    'Data Throughput': { value: 1.49, unit: 'GB/s', trendValue: 0.08 },
    'Avg Latency': { value: 14, unit: 'ms', trendValue: 2.00 },
    'Active Alerts': { value: 6, unit: '', trendValue: 1.00 },
  };

  const preset = presets[widget.title];
  if (preset) {
    return {
      value: preset.value!,
      unit: preset.unit,
      label: widget.title,
      trend: preset.trendValue! > 0 ? 'up' : preset.trendValue! < 0 ? 'down' : 'stable',
      trendValue: preset.trendValue,
      trendLabel: '',
      status: widget.title === 'Active Alerts' ? 'warning' : 'neutral',
    };
  }

  const value = Math.floor(Math.random() * 10000) + 1000;
  const trendValue = Math.floor(Math.random() * 20) - 10;
  return {
    value,
    unit: widget.config?.unit || '',
    label: widget.title,
    trend: trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'stable',
    trendValue: Math.abs(trendValue),
    trendLabel: '',
    status: trendValue > 5 ? 'success' : trendValue < -5 ? 'warning' : 'neutral',
  };
}

// 生成模擬 Gauge 數據
function generateGaugeData(widget: Widget): GaugeData {
  return {
    value: 53.1,
    min: 0,
    max: 100,
    unit: 'PSI',
    label: widget.title,
    status: 'normal',
  };
}

// 生成模擬 DataGrid 數據
function generateDataGridData(): DataGridData {
  const now = new Date();
  return {
    columns: ['TIME', 'SENSOR', 'VALUE', 'STATUS'],
    rows: [
      { time: now.toLocaleTimeString('en-US', { hour12: false }), sensor: 'pH Sensor', value: '6.62', status: 'normal' },
      { time: new Date(now.getTime() - 30000).toLocaleTimeString('en-US', { hour12: false }), sensor: 'Temperature', value: '24.5°C', status: 'normal' },
      { time: new Date(now.getTime() - 60000).toLocaleTimeString('en-US', { hour12: false }), sensor: 'Turbidity', value: '2.1 NTU', status: 'warning' },
      { time: new Date(now.getTime() - 90000).toLocaleTimeString('en-US', { hour12: false }), sensor: 'Dissolved O2', value: '8.2 mg/L', status: 'normal' },
    ],
  };
}

// 生成模擬 Activity 數據
function generateActivityData(): ActivityData {
  return {
    items: [
      { id: '1', time: '2 min ago', event: 'pH sensor reading normalized', type: 'success' },
      { id: '2', time: '5 min ago', event: 'High turbidity detected in Tank 3', type: 'warning' },
      { id: '3', time: '12 min ago', event: 'System backup completed', type: 'info' },
      { id: '4', time: '25 min ago', event: 'Sensor calibration started', type: 'info' },
    ],
  };
}

// 生成模擬 Pie 數據
function generatePieData(): ChartDataResponse {
  return {
    series: [
      { name: 'Tank A', data: [35] },
      { name: 'Tank B', data: [25] },
      { name: 'Tank C', data: [20] },
      { name: 'Tank D', data: [20] },
    ],
    categories: ['Tank A', 'Tank B', 'Tank C', 'Tank D'],
  };
}

// 載入 Widget 數據
async function loadWidgetData(widget: Widget) {
  setWidgetStatus(widget.id, 'loading');
  try {
    const data = await fetchWidgetData(widget);
    setWidgetData(widget.id, data);
    setWidgetStatus(widget.id, 'success');
  } catch (error) {
    console.error(`Failed to load widget ${widget.id}:`, error);
    setWidgetStatus(widget.id, 'error');
  }
}

// 刷新單個 Widget
async function handleRefresh(widget: Widget) {
  emit('widget-refresh', widget.id);
  await loadWidgetData(widget);
}

// 刪除 Widget
function handleRemove(widgetId: string) {
  if (!grid) return;

  const el = gridContainer.value?.querySelector(`[gs-id="${widgetId}"]`);
  if (el) {
    grid.removeWidget(el as HTMLElement);
  }

  // 從動態列表移除
  const index = dynamicWidgets.value.findIndex(w => w.id === widgetId);
  if (index > -1) {
    dynamicWidgets.value.splice(index, 1);
  }

  // 清理狀態
  widgetStates.delete(widgetId);
  widgetData.delete(widgetId);

  updateAllWidgets();
}

// 更新合併的 widgets 列表
function updateAllWidgets() {
  allWidgets.value = [...props.widgets, ...dynamicWidgets.value];
}

// 儲存佈局為 JSON
function saveLayout(): DashboardLayout {
  if (!grid) return { version: '1.0', timestamp: Date.now(), widgets: [] };

  const items = grid.getGridItems();
  const layout: Widget[] = items.map((el) => {
    const node = el.gridstackNode;
    const widgetId = el.getAttribute('gs-id') || '';
    const originalWidget = allWidgets.value.find((w) => w.id === widgetId);

    return {
      id: widgetId,
      x: node?.x || 0,
      y: node?.y || 0,
      w: node?.w || 1,
      h: node?.h || 1,
      type: originalWidget?.type || 'line',
      title: originalWidget?.title || '',
      apiEndpoint: originalWidget?.apiEndpoint,
      config: originalWidget?.config,
    };
  });

  return {
    version: '1.0',
    timestamp: Date.now(),
    widgets: layout,
  };
}

// 取得當前佈局項目
function getCurrentLayout(): GridStackItem[] {
  if (!grid) return [];
  return grid.getGridItems().map((el) => {
    const node = el.gridstackNode;
    return {
      id: el.getAttribute('gs-id') || '',
      x: node?.x || 0,
      y: node?.y || 0,
      w: node?.w || 1,
      h: node?.h || 1,
    };
  });
}

// 處理外部拖入
function handleDropped(node: GridStackNode) {
  const type = (node.el?.getAttribute('data-type') || 'line') as WidgetType;
  const id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const newWidget: Widget = {
    id,
    x: node.x || 0,
    y: node.y || 0,
    w: node.w || 4,
    h: node.h || 4,
    type,
    title: widgetDefaultTitles[type] || 'New Widget',
    config: {},
  };

  // 更新節點 ID
  if (node.el) {
    node.el.setAttribute('gs-id', id);
  }

  dynamicWidgets.value.push(newWidget);
  updateAllWidgets();

  // 載入新 widget 數據
  loadWidgetData(newWidget);

  emit('widget-added', newWidget);
}

// 初始化 GridStack
function initGrid() {
  if (!gridContainer.value) return;

  grid = GridStack.init(
    {
      column: props.columns,
      cellHeight: props.cellHeight,
      margin: props.margin,
      animate: true,
      float: false,
      acceptWidgets: true,
      draggable: {
        handle: '.gs-drag-handle',
      },
      resizable: {
        handles: 'se, sw',
      },
    },
    gridContainer.value
  );

  // 監聽佈局變動
  grid.on('change', () => {
    emit('layout-change', getCurrentLayout());
  });

  // 監聽外部拖入
  grid.on('dropped', (_event: Event, _previousNode: GridStackNode, newNode: GridStackNode) => {
    if (newNode) {
      handleDropped(newNode);
    }
  });
}

// 載入所有 Widget 數據
async function loadAllWidgetsData() {
  await Promise.all(allWidgets.value.map((widget) => loadWidgetData(widget)));
}

// Expose methods
defineExpose({
  saveLayout,
  getCurrentLayout,
  refreshWidget: handleRefresh,
  getGrid: () => grid,
});

onMounted(async () => {
  updateAllWidgets();
  await nextTick();
  initGrid();
  await loadAllWidgetsData();
});

onUnmounted(() => {
  if (grid) {
    grid.destroy(false);
    grid = null;
  }
});

// 監聽 widgets 變化
watch(
  () => props.widgets,
  async () => {
    updateAllWidgets();
    await nextTick();
    await loadAllWidgetsData();
  },
  { deep: true }
);
</script>

<template>
  <div
    ref="gridContainer"
    class="grid-stack"
  >
    <div
      v-for="widget in allWidgets"
      :key="widget.id"
      class="grid-stack-item"
      :gs-id="widget.id"
      :gs-x="widget.x"
      :gs-y="widget.y"
      :gs-w="widget.w"
      :gs-h="widget.h"
      :gs-min-w="widget.minW || 2"
      :gs-min-h="widget.minH || 2"
    >
      <div class="grid-stack-item-content">
        <WidgetWrapper
          :title="widget.title"
          :status="getWidgetStatus(widget.id)"
          :show-live="widget.type === 'line' || widget.type === 'area' || widget.type === 'dataGrid'"
          @refresh="handleRefresh(widget)"
          @remove="handleRemove(widget.id)"
        >
          <component
            :is="getChartComponent(widget.type)"
            :data="getWidgetData(widget.id)"
            :config="widget.config"
          />
        </WidgetWrapper>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-stack {
  min-height: 600px;
  background: transparent;
}
</style>
