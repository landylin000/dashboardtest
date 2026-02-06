/**
 * Dashboard Widget Type Definitions
 * 定義儀表板系統的核心資料結構
 */

/** Widget 圖表類型 */
export type WidgetType =
  | 'line'
  | 'area'
  | 'bar'
  | 'stepLine'
  | 'stackedBar'
  | 'scatter'
  | 'bubble'
  | 'dotPlot'
  | 'radar'
  | 'treemap'
  | 'sankey'
  | 'heatmap'
  | 'radialBar'
  | 'metric'
  | 'pie'
  | 'dataGrid'
  | 'activity'
  | 'gauge'
  | 'phylogenetic'
  | 'admixture'
  | 'boxPlot';

/** Widget 狀態 */
export type WidgetStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

/** Widget 位置與尺寸配置 */
export interface WidgetPosition {
  x: number;      // 水平位置 (0-11 for 12-column grid)
  y: number;      // 垂直位置
  w: number;      // 寬度 (1-12 columns)
  h: number;      // 高度 (grid units)
  minW?: number;  // 最小寬度
  minH?: number;  // 最小高度
  maxW?: number;  // 最大寬度
  maxH?: number;  // 最大高度
}

/** Widget 核心定義 */
export interface Widget extends WidgetPosition {
  id: string;
  type: WidgetType;
  title: string;
  apiEndpoint?: string;
  refreshInterval?: number;  // 自動刷新間隔 (毫秒)
  config?: WidgetConfig;
  locked?: boolean; // 釘選狀態
}

/** Widget 配置選項 */
export interface WidgetConfig {
  dataSourceId?: string;
  colors?: string[];
  unit?: string;
  decimals?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
  sparkline?: boolean;
  // 數據欄位映射
  xAxis?: string;
  yAxis?: string | string[];
  category?: string;
  value?: string;
  source?: string;
  target?: string;
}

/** 圖表資料點 */
export interface DataPoint {
  x: string | number | Date;
  y: number;
}

/** 圖表資料系列 */
export interface ChartSeries {
  name: string;
  data: number[] | DataPoint[];
  color?: string;
}

/** API 回應格式 */
export interface ChartDataResponse {
  series: ChartSeries[];
  categories?: string[];
  total?: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

/** Sankey Widget 專用資料 */
export interface SankeyLink {
  from: string;
  to: string;
  value: number;
}

export interface SankeyData {
  series: { data: SankeyLink[] }[];
}

/** Metric Widget 專用資料 */
export interface MetricData {
  value: number;
  unit?: string;
  label?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  trendLabel?: string;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
}

/** Gauge Widget 專用資料 */
export interface GaugeData {
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
  status?: 'normal' | 'warning' | 'danger';
}

/** DataGrid Widget 專用資料 */
export interface DataGridRow {
  time: string;
  sensor: string;
  value: number | string;
  status: 'normal' | 'warning' | 'danger';
}

export interface DataGridData {
  columns: string[];
  rows: DataGridRow[];
}

/** Activity Widget 專用資料 */
export interface ActivityItem {
  id: string;
  time: string;
  event: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface ActivityData {
  items: ActivityItem[];
}

/** GridStack 佈局項目 */
export interface GridStackItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 儲存的佈局配置 */
export interface DashboardLayout {
  version: string;
  timestamp: number;
  widgets: Widget[];
}

/** Widget 事件類型 */
export interface WidgetEvents {
  onRefresh?: () => void;
  onRemove?: () => void;
  onConfigure?: () => void;
}

/** ApexCharts 基礎選項類型 (簡化版) */
export interface ApexChartOptions {
  chart: {
    type: string;
    height: string | number;
    background: string;
    toolbar: { show: boolean };
    sparkline?: { enabled: boolean };
    animations?: { enabled: boolean; speed?: number };
  };
  colors?: string[];
  series: ChartSeries[] | number[];
  stroke?: {
    curve?: 'smooth' | 'straight' | 'stepline';
    width?: number | number[];
  };
  fill?: {
    type?: string;
    gradient?: {
      shadeIntensity?: number;
      opacityFrom?: number;
      opacityTo?: number;
    };
  };
  dataLabels?: { enabled: boolean };
  legend?: {
    show: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
    labels?: { colors?: string | string[] };
  };
  grid?: {
    show: boolean;
    borderColor?: string;
    strokeDashArray?: number;
  };
  xaxis?: {
    type?: 'category' | 'datetime' | 'numeric';
    categories?: string[];
    labels?: { style?: { colors?: string | string[] } };
    axisBorder?: { show: boolean };
    axisTicks?: { show: boolean };
  };
  yaxis?: {
    labels?: { style?: { colors?: string } };
  };
  tooltip?: {
    enabled: boolean;
    theme?: 'dark' | 'light';
    x?: { show?: boolean };
    y?: { formatter?: (val: number) => string };
  };
  plotOptions?: {
    bar?: {
      horizontal?: boolean;
      borderRadius?: number;
      columnWidth?: string;
    };
    radialBar?: {
      hollow?: { size?: string };
      track?: { background?: string };
      dataLabels?: {
        name?: { show?: boolean; color?: string };
        value?: { show?: boolean; color?: string; fontSize?: string };
      };
    };
  };
  labels?: string[];
}
