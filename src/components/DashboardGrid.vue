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
import { GridStack, type GridStackNode } from 'gridstack';
import WidgetWrapper from './WidgetWrapper.vue';
import { useDataStore } from '@/composables/useDataStore';
import {
  LineChart,
  AreaChart,
  BarChart,
  StepLineChart,
  StackedBarChart,
  ScatterChart,
  BubbleChart,
  DotPlotChart,
  RadarChart,
  TreemapChart,
  SankeyChart,
  HeatmapChart,
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
  SankeyData,
  DashboardLayout,
  GridStackItem,
  WidgetConfig,
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
  'widget-selected': [widget: Widget];
  'widget-removed': [widgetId: string];
}>();

const { dataSources, getDataSource } = useDataStore();

// GridStack instance
let grid: GridStack | null = null;
const gridContainer = ref<HTMLElement | null>(null);

// Widget 狀態管理
const widgetStates = reactive<Map<string, WidgetStatus>>(new Map());
const widgetData = reactive<Map<string, ChartDataResponse | MetricData | GaugeData | DataGridData | ActivityData | SankeyData | null>>(new Map());

// 動態 widgets 列表
const dynamicWidgets = ref<Widget[]>([]);

// 合併 props.widgets 和動態添加的 widgets
const allWidgets = ref<Widget[]>([]);

// 釘選位置記錄（避免被擠動）
type LockedPosition = { x: number; y: number; w: number; h: number };
const lockedPositions = new Map<string, LockedPosition>();
let isRestoringLocked = false;

// 圖表組件映射
const chartComponents: Record<string, Component> = {
  line: LineChart,
  area: AreaChart,
  bar: BarChart,
  stepLine: StepLineChart,
  stackedBar: StackedBarChart,
  scatter: ScatterChart,
  bubble: BubbleChart,
  dotPlot: DotPlotChart,
  radar: RadarChart,
  treemap: TreemapChart,
  sankey: SankeyChart,
  heatmap: HeatmapChart,
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
  stepLine: 'Step Line Chart',
  stackedBar: 'Stacked Bar Chart',
  scatter: 'Scatter Chart',
  bubble: 'Bubble Chart',
  dotPlot: 'Dot Plot',
  radar: 'Radar Chart',
  treemap: 'Treemap',
  sankey: 'Sankey',
  heatmap: 'Heatmap',
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
function getWidgetData(id: string): ChartDataResponse | MetricData | GaugeData | DataGridData | ActivityData | SankeyData | null {
  return widgetData.get(id) || null;
}

// 設定 Widget 狀態
function setWidgetStatus(id: string, status: WidgetStatus) {
  widgetStates.set(id, status);
}

// 設定 Widget 數據
function setWidgetData(id: string, data: ChartDataResponse | MetricData | GaugeData | DataGridData | ActivityData | SankeyData | null) {
  widgetData.set(id, data);
}

function normalizeNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function isWidgetConfigured(widget: Widget) {
  const config = widget.config;
  if (!config?.dataSourceId) return false;

  switch (widget.type) {
    case 'line':
    case 'area':
    case 'bar':
    case 'stepLine':
    case 'stackedBar':
    case 'radar':
      return Boolean(config.xAxis && config.yAxis);
    case 'scatter':
    case 'bubble':
    case 'dotPlot':
      return Boolean(config.xAxis && config.yAxis);
    case 'heatmap':
      return Boolean(config.xAxis && config.yAxis);
    case 'treemap':
      return Boolean(config.category || config.xAxis);
    case 'sankey':
      return Boolean(config.source || config.xAxis);
    case 'pie':
      return Boolean(config.category && config.value);
    case 'radialBar':
    case 'metric':
    case 'gauge':
      return Boolean(config.value || config.yAxis);
    case 'dataGrid':
    case 'activity':
      return true;
    default:
      return false;
  }
}

function buildDataFromSource(widget: Widget) {
  const config = widget.config;
  const source = getDataSource(config?.dataSourceId);
  if (!source || source.rows.length === 0) return null;

  const rows = source.rows;

  switch (widget.type) {
    case 'line':
    case 'area':
    case 'bar':
    case 'stepLine':
    case 'stackedBar':
    case 'radar': {
      const xKey = config?.xAxis;
      const yKeys = Array.isArray(config?.yAxis)
        ? config?.yAxis
        : config?.yAxis
          ? [config?.yAxis]
          : [];

      if (!xKey || yKeys.length === 0) return null;

      const categories = rows.map((row) => String(row[xKey] ?? ''));
      const series = yKeys.map((key) => ({
        name: key,
        data: rows.map((row) => normalizeNumber(row[key])),
      }));

      return { series, categories } as ChartDataResponse;
    }
    case 'scatter':
    case 'bubble':
    case 'dotPlot': {
      const xKey = config?.xAxis;
      const yKeys = Array.isArray(config?.yAxis)
        ? config?.yAxis
        : config?.yAxis
          ? [config?.yAxis]
          : [];

      if (!xKey || yKeys.length === 0) return null;

      const series = yKeys.map((yKey) => ({
        name: yKey,
        data: rows.map((row) => [
          normalizeNumber(row[xKey]),
          normalizeNumber(row[yKey]),
        ]) as unknown as (number | Record<string, unknown>)[],
      }));

      return { series: series as (number | Record<string, unknown>)[], categories: [] } as unknown as ChartDataResponse;
    }
    case 'heatmap': {
      const xKey = config?.xAxis;
      const yKeys = Array.isArray(config?.yAxis)
        ? config?.yAxis
        : config?.yAxis
          ? [config?.yAxis]
          : [];

      if (!xKey || yKeys.length === 0) return null;

      const categories = rows.map((row) => String(row[xKey] ?? ''));
      const series = yKeys.map((key) => ({
        name: key,
        data: rows.map((row) => normalizeNumber(row[key])),
      }));

      return { series, categories } as ChartDataResponse;
    }
    case 'treemap': {
      const categoryKey = config?.category || config?.xAxis;
      const valueKey = config?.value || (Array.isArray(config?.yAxis) ? config?.yAxis[0] : config?.yAxis);
      if (!categoryKey || !valueKey) return null;

      const data = rows.map((row) => ({
        x: String(row[categoryKey] ?? ''),
        y: normalizeNumber(row[valueKey]),
      }));

      return {
        series: [{ name: categoryKey, data }],
      } as ChartDataResponse;
    }
    case 'sankey': {
      const sourceKey = config?.source || config?.xAxis;
      const targetKey = config?.target || (Array.isArray(config?.yAxis) ? config?.yAxis[0] : config?.yAxis);
      const valueKey = config?.value;

      if (!sourceKey || !targetKey) return null;

      const numericKeys = Object.keys(rows[0] || {}).filter((key) => {
        const sample = rows.find((row) => row[key] !== null && row[key] !== undefined)?.[key];
        return typeof sample === 'number' || (typeof sample === 'string' && !Number.isNaN(Number(sample)));
      });
      const weightKey = valueKey || numericKeys.find((key) => key !== sourceKey && key !== targetKey);
      if (!weightKey) return null;

      const links = rows.map((row) => ({
        from: String(row[sourceKey] ?? ''),
        to: String(row[targetKey] ?? ''),
        value: normalizeNumber(row[weightKey]),
      }));

      return {
        series: [{ data: links }],
      } as SankeyData;
    }
    case 'pie': {
      const categoryKey = config?.category;
      const valueKey = config?.value;
      if (!categoryKey || !valueKey) return null;

      const buckets = new Map<string, number>();
      rows.forEach((row) => {
        const category = String(row[categoryKey] ?? '');
        const value = normalizeNumber(row[valueKey]);
        buckets.set(category, (buckets.get(category) || 0) + value);
      });

      const categories = Array.from(buckets.keys());
      const series = categories.map((name) => ({
        name,
        data: [buckets.get(name) || 0],
      }));

      return { series, categories } as ChartDataResponse;
    }
    case 'radialBar': {
      const valueKey = config?.value || (Array.isArray(config?.yAxis) ? config?.yAxis[0] : config?.yAxis);
      if (!valueKey) return null;
      const lastValue = normalizeNumber(rows[rows.length - 1]?.[valueKey]);
      return {
        series: [{ name: valueKey, data: [lastValue] }],
        categories: [valueKey],
      } as ChartDataResponse;
    }
    case 'metric': {
      const valueKey = config?.value || (Array.isArray(config?.yAxis) ? config?.yAxis[0] : config?.yAxis);
      if (!valueKey) return null;
      const lastValue = normalizeNumber(rows[rows.length - 1]?.[valueKey]);
      return {
        value: lastValue,
        unit: config?.unit,
        label: valueKey,
      } as MetricData;
    }
    case 'gauge': {
      const valueKey = config?.value || (Array.isArray(config?.yAxis) ? config?.yAxis[0] : config?.yAxis);
      if (!valueKey) return null;
      const lastValue = normalizeNumber(rows[rows.length - 1]?.[valueKey]);
      return {
        value: lastValue,
        unit: config?.unit,
        label: valueKey,
      } as GaugeData;
    }
    case 'dataGrid': {
      const keys = Object.keys(rows[0] || {});
      if (keys.length === 0) return null;
      const timeKey = keys.find((key) => /time|date/i.test(key)) || keys[0];
      const sensorKey = keys.find((key) => /sensor|name|type/i.test(key)) || keys[1] || keys[0];
      const valueKey = keys.find((key) => /value|val|count|amount/i.test(key)) || keys[2] || keys[0];
      const statusKey = keys.find((key) => /status|state/i.test(key));

      const rowsData = rows.slice(0, 50).map((row) => ({
        time: String(row[timeKey ?? ''] ?? ''),
        sensor: String(row[sensorKey ?? ''] ?? ''),
        value: row[valueKey ?? ''] ?? '',
        status: String(row[statusKey ?? ''] ?? 'normal').toLowerCase() === 'warning'
          ? 'warning'
          : String(row[statusKey ?? ''] ?? 'normal').toLowerCase() === 'danger'
            ? 'danger'
            : 'normal',
      }));

      return {
        columns: [timeKey, sensorKey, valueKey, statusKey || 'status'],
        rows: rowsData,
      } as DataGridData;
    }
    default:
      return null;
  }
}

// 載入 Widget 數據
async function loadWidgetData(widget: Widget) {
  if (!isWidgetConfigured(widget)) {
    setWidgetStatus(widget.id, 'empty');
    setWidgetData(widget.id, null);
    return;
  }

  setWidgetStatus(widget.id, 'loading');
  try {
    const data = buildDataFromSource(widget);
    if (!data) {
      setWidgetStatus(widget.id, 'empty');
      setWidgetData(widget.id, null);
      return;
    }

    setWidgetData(widget.id, data);
    setWidgetStatus(widget.id, 'success');
  } catch (error) {
    console.error(`Failed to load widget ${widget.id}:`, error);
    setWidgetStatus(widget.id, 'error');
  }
}

function handleSelect(widget: Widget) {
  emit('widget-selected', widget);
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

  emit('widget-removed', widgetId);

  // 清理狀態
  widgetStates.delete(widgetId);
  widgetData.delete(widgetId);
  lockedPositions.delete(widgetId);

  updateAllWidgets();
}

function recordLockedPosition(widgetId: string, el: HTMLElement) {
  const node = el.gridstackNode;
  if (!node) return;

  lockedPositions.set(widgetId, {
    x: node.x ?? 0,
    y: node.y ?? 0,
    w: node.w ?? 1,
    h: node.h ?? 1,
  });
}

function restoreLockedWidgets(): boolean {
  if (!grid || lockedPositions.size === 0) return false;

  let restored = false;

  lockedPositions.forEach((pos, widgetId) => {
    const el = gridContainer.value?.querySelector(`[gs-id="${widgetId}"]`) as HTMLElement;
    if (!el) return;

    const node = el.gridstackNode;
    if (!node) return;

    const moved = node.x !== pos.x || node.y !== pos.y || node.w !== pos.w || node.h !== pos.h;
    if (moved) {
      grid.update(el, {
        x: pos.x,
        y: pos.y,
        w: pos.w,
        h: pos.h,
        locked: true,
        noMove: true,
        noResize: true,
      });
      restored = true;
    }
  });

  return restored;
}

// 切換 Widget 鎖定狀態
function handleToggleLock(widgetId: string) {
  if (!grid) return;

  const widget = allWidgets.value.find(w => w.id === widgetId);
  if (!widget) return;

  const el = gridContainer.value?.querySelector(`[gs-id="${widgetId}"]`) as HTMLElement;
  if (!el) return;

  // 切換鎖定狀態
  widget.locked = !widget.locked;

  // 更新 GridStack
  if (widget.locked) {
    grid.update(el, { locked: true, noMove: true, noResize: true });
    recordLockedPosition(widgetId, el);
  } else {
    grid.update(el, { locked: false, noMove: false, noResize: false });
    lockedPositions.delete(widgetId);
  }
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
  const id = `widget-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

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
      staticGrid: false,
      handle: '.drag-handle',
      resizable: {
        handles: 'se, sw',
      },
    },
    gridContainer.value
  );

  // 手動將現有元素註冊為 GridStack widgets
  const items = gridContainer.value.querySelectorAll('.grid-stack-item');
  items.forEach((el) => {
    grid!.makeWidget(el as HTMLElement);
    
    // 如果 widget 已經鎖定，應用鎖定狀態
    const widgetId = el.getAttribute('gs-id');
    if (widgetId) {
      const widget = allWidgets.value.find(w => w.id === widgetId);
      if (widget?.locked) {
        grid!.update(el as HTMLElement, { locked: true, noMove: true, noResize: true });
        recordLockedPosition(widgetId, el as HTMLElement);
      }
    }
  });

  // 監聽佈局變動
  grid.on('change', () => {
    if (isRestoringLocked) return;

    const restored = restoreLockedWidgets();
    if (restored) {
      isRestoringLocked = true;
      requestAnimationFrame(() => {
        isRestoringLocked = false;
      });
      return;
    }

    emit('layout-change', getCurrentLayout());
  });

  // 監聯外部拖入
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
  updateWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => {
    const target = dynamicWidgets.value.find((w) => w.id === widgetId);
    if (!target) return false;
    target.config = { ...target.config, ...config };
    loadWidgetData(target);
    return true;
  },
  updateWidgetType: (widgetId: string, type: WidgetType) => {
    const target = dynamicWidgets.value.find((w) => w.id === widgetId);
    if (!target) return false;
    target.type = type;
    loadWidgetData(target);
    return true;
  },
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

watch(
  () => dataSources.value,
  async () => {
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
      :gs-locked="widget.locked"
      :gs-no-move="widget.locked"
      :gs-no-resize="widget.locked"
    >
      <div
        class="grid-stack-item-content"
        role="button"
        tabindex="0"
        @click="handleSelect(widget)"
      >
        <WidgetWrapper
          :title="widget.title"
          :status="getWidgetStatus(widget.id)"
          :locked="widget.locked"
          :show-live="widget.type === 'line' || widget.type === 'area' || widget.type === 'dataGrid'"
          @refresh="handleRefresh(widget)"
          @remove="handleRemove(widget.id)"
          @toggle-lock="handleToggleLock(widget.id)"
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
