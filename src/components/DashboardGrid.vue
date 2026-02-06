<script setup lang="ts">
/**
 * DashboardGrid.vue
 * 佈局核心組件 - 使用 Sortable.js 實現拖拉式佈局（無碰撞、釘選不被擠）
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
import Sortable from 'sortablejs';
import interact from 'interactjs';
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
  PhylogeneticTree,
  AdmixturePlot,
  BoxPlotChart,
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

// 通用 JSON 物件類型
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

type WidgetDataType = ChartDataResponse | MetricData | GaugeData | DataGridData | ActivityData | SankeyData | JsonObject | null;

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

// Widget 狀態管理
const widgetStates = reactive<Map<string, WidgetStatus>>(new Map());
const widgetData = reactive<Map<string, WidgetDataType>>(new Map());

// 動態 widgets 列表
const dynamicWidgets = ref<Widget[]>([]);

// 合併 props.widgets 和動態添加的 widgets
const allWidgets = ref<Widget[]>([]);

// Sortable 實例
let sortableInstance: Sortable | null = null;
const gridContainer = ref<HTMLElement | null>(null);
type InteractableInstance = ReturnType<typeof interact>;
const resizableInstances = new Map<string, InteractableInstance>();
type ResizeMoveEvent = { rect: { width: number; height: number }; target: HTMLElement };
type ResizeEndEvent = { rect: { width: number; height: number }; target: HTMLElement };

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
  phylogenetic: PhylogeneticTree,
  admixture: AdmixturePlot,
  boxPlot: BoxPlotChart,
};

// 取得 Widget 樣式（基於位置和尺寸計算寬度）
function getWidgetStyle(widget: Widget) {
  const colWidth = `calc((100% - ${(props.columns - 1) * props.margin}px) / ${props.columns})`;
  const widgetWidth = `calc(${widget.w} * ${colWidth} + ${(widget.w - 1) * props.margin}px)`;
  const widgetHeight = `calc(${widget.h} * ${props.cellHeight}px + ${(widget.h - 1) * props.margin}px)`;
  const minW = widget.minW || 2;
  const minH = widget.minH || 2;

  return {
    width: widgetWidth,
    height: widgetHeight,
    minWidth: `calc(${minW} * ${colWidth} + ${(minW - 1) * props.margin}px)`,
    minHeight: `calc(${minH} * ${props.cellHeight}px + ${(minH - 1) * props.margin}px)`,
  };
}

// 取得對應的圖表組件
function getChartComponent(type: WidgetType): Component {
  return chartComponents[type] || LineChart;
}

// 取得 Widget 狀態
function getWidgetStatus(id: string): WidgetStatus {
  return widgetStates.get(id) || 'idle';
}

// 取得 Widget 數據
function getWidgetData(id: string): WidgetDataType {
  return widgetData.get(id) || null;
}

// 設定 Widget 狀態
function setWidgetStatus(id: string, status: WidgetStatus) {
  widgetStates.set(id, status);
}

// 設定 Widget 數據
function setWidgetData(id: string, data: WidgetDataType) {
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

  // phylogenetic, admixture, boxPlot 需要數據源
  if (widget.type === 'phylogenetic' || widget.type === 'admixture' || widget.type === 'boxPlot') {
    return Boolean(config?.dataSourceId);
  }

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

  // 樹狀圖類型 (phylogenetic, admixture, boxPlot) - 使用第一行作為樹狀數據
  if (widget.type === 'phylogenetic' || widget.type === 'admixture' || widget.type === 'boxPlot') {
    const firstRow = rows[0];
    if (firstRow && typeof firstRow === 'object') {
      return firstRow as any;
    }
    return null;
  }

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
  // 從動態列表移除
  const index = dynamicWidgets.value.findIndex(w => w.id === widgetId);
  if (index > -1) {
    dynamicWidgets.value.splice(index, 1);
  }

  emit('widget-removed', widgetId);

  // 清理狀態
  widgetStates.delete(widgetId);
  widgetData.delete(widgetId);

  updateAllWidgets();
  nextTick(() => refreshResizables());
}

// 切換 Widget 鎖定狀態
function handleToggleLock(widgetId: string) {
  const widget = allWidgets.value.find(w => w.id === widgetId);
  if (!widget) return;

  widget.locked = !widget.locked;
  nextTick(() => refreshResizables());
}

// 重新命名 Widget
function handleRename(widgetId: string, newTitle: string) {
  const widget = allWidgets.value.find(w => w.id === widgetId);
  if (!widget) return;

  widget.title = newTitle;
  emit('layout-change', getCurrentLayout());
}

// 更新合併的 widgets 列表
function updateAllWidgets() {
  allWidgets.value = [...props.widgets, ...dynamicWidgets.value];
}

// 儲存佈局為 JSON
function saveLayout(): DashboardLayout {
  const layout: Widget[] = allWidgets.value.map((widget) => ({
    ...widget,
  }));

  return {
    version: '1.0',
    timestamp: Date.now(),
    widgets: layout,
  };
}

// 取得當前佈局項目
function getCurrentLayout(): GridStackItem[] {
  return allWidgets.value.map((widget) => ({
    id: widget.id,
    x: widget.x,
    y: widget.y,
    w: widget.w,
    h: widget.h,
  }));
}

function getColumnWidthPx() {
  const containerWidth = gridContainer.value?.clientWidth ?? 0;
  const totalGaps = (props.columns - 1) * props.margin;
  if (containerWidth <= totalGaps) return 0;
  return (containerWidth - totalGaps) / props.columns;
}

function calculateWidgetUnits(widthPx: number, heightPx: number, widget: Widget) {
  const colWidthPx = getColumnWidthPx();
  if (colWidthPx <= 0) {
    return { w: widget.w, h: widget.h };
  }
  const colUnit = colWidthPx + props.margin;
  const rowUnit = props.cellHeight + props.margin;

  const minW = widget.minW ?? 1;
  const minH = widget.minH ?? 2;
  const maxW = widget.maxW ?? props.columns;
  const maxH = widget.maxH ?? 100;

  const w = Math.max(minW, Math.min(maxW, Math.round((widthPx + props.margin) / colUnit)));
  const h = Math.max(minH, Math.min(maxH, Math.round((heightPx + props.margin) / rowUnit)));

  return { w, h };
}

function handleResizeMove(event: ResizeMoveEvent) {
  event.target.style.width = `${event.rect.width}px`;
  event.target.style.height = `${event.rect.height}px`;
}

function initResizables() {
  if (!gridContainer.value) return;

  const elements = Array.from(gridContainer.value.querySelectorAll<HTMLElement>('.grid-item'));
  elements.forEach((element) => {
    const widgetId = element.dataset.widgetId;
    if (!widgetId) return;
    if (element.dataset.locked !== undefined) return;
    if (resizableInstances.has(widgetId)) return;

    const interactable = interact(element).resizable({
      edges: { right: true, bottom: true },
      allowFrom: '.resize-handle',
      listeners: {
        move: (event) => handleResizeMove(event as ResizeMoveEvent),
        end: (event) => {
          const endEvent = event as ResizeEndEvent;
          const widget = allWidgets.value.find((w) => w.id === widgetId);
          if (widget) {
            const { w, h } = calculateWidgetUnits(endEvent.rect.width, endEvent.rect.height, widget);
            widget.w = w;
            widget.h = h;
          }
          endEvent.target.style.width = '';
          endEvent.target.style.height = '';
          emit('layout-change', getCurrentLayout());
        },
      },
    });

    resizableInstances.set(widgetId, interactable);
  });
}

function destroyResizables() {
  resizableInstances.forEach((instance) => instance.unset());
  resizableInstances.clear();
}

function refreshResizables() {
  destroyResizables();
  initResizables();
}

// 初始化 Sortable
function initSortable() {
  if (!gridContainer.value) return;

  sortableInstance = Sortable.create(gridContainer.value, {
    handle: '.drag-handle',
    filter: '[data-locked]', // 鎖定的不可拖
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: (evt) => {
      if (evt.oldIndex === evt.newIndex) return;

      const orderedIds = Array.from(gridContainer.value!.querySelectorAll('[data-widget-id]')).map(
        (el) => (el as HTMLElement).getAttribute('data-widget-id') || ''
      );

      // 重新排序 widgets
      const newOrder = orderedIds
        .map((id) => allWidgets.value.find((w) => w.id === id))
        .filter(Boolean) as Widget[];

      allWidgets.value = newOrder;

      emit('layout-change', getCurrentLayout());
    },
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
});

onMounted(async () => {
  updateAllWidgets();
  await nextTick();
  initSortable();
  initResizables();
  await loadAllWidgetsData();
});

onUnmounted(() => {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
  destroyResizables();
});

// 監聽 widgets 變化
watch(
  () => props.widgets,
  async () => {
    updateAllWidgets();
    await nextTick();
    refreshResizables();
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
    class="grid-layout"
  >
    <div
      v-for="widget in allWidgets"
      :key="widget.id"
      :data-widget-id="widget.id"
      :data-locked="widget.locked || undefined"
      class="grid-item"
      :class="{ 'is-locked': widget.locked }"
      :style="getWidgetStyle(widget)"
    >
      <div
        class="grid-item-content"
        role="button"
        tabindex="0"
        @click="handleSelect(widget)"
      >
        <WidgetWrapper
          :title="widget.title"
          :widget-id="widget.id"
          :status="getWidgetStatus(widget.id)"
          :locked="widget.locked"
          :show-live="widget.type === 'line' || widget.type === 'area' || widget.type === 'dataGrid'"
          @refresh="handleRefresh(widget)"
          @remove="handleRemove(widget.id)"
          @toggle-lock="handleToggleLock(widget.id)"
          @rename="handleRename(widget.id, $event)"
        >
          <component
            :is="getChartComponent(widget.type)"
            :data="getWidgetData(widget.id)"
            :config="widget.config"
          />
        </WidgetWrapper>
      </div>
      <div
        v-if="!widget.locked"
        class="resize-handle"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
.grid-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 600px;
  background: transparent;
  padding: 12px;
}

.grid-item {
  flex: 0 0 auto;
  cursor: move;
  position: relative;
}

.grid-item.is-locked {
  cursor: not-allowed;
  opacity: 0.95;
}

.grid-item-content {
  height: 100%;
  width: 100%;
}

.resize-handle {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 14px;
  height: 14px;
  border-right: 2px solid rgba(148, 163, 184, 0.9);
  border-bottom: 2px solid rgba(148, 163, 184, 0.9);
  border-radius: 2px;
  cursor: se-resize;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.grid-item:hover .resize-handle {
  opacity: 1;
}

.sortable-ghost {
  opacity: 0.4;
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed #3b82f6;
}
</style>

