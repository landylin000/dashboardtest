/**
 * Chart Adapter Composable
 * 將後端數據映射為 ApexCharts 的 options 物件
 */
import { computed, type Ref } from 'vue';
import type {
  WidgetType,
  ChartSeries,
  ChartDataResponse,
  WidgetConfig,
  ApexChartOptions,
} from '@/types/dashboard';

/** 預設色彩主題 - 企業級專業配色 */
const DEFAULT_COLORS = {
  primary: ['#3b82f6', '#60a5fa', '#93c5fd'],      // Blue
  success: ['#22c55e', '#4ade80', '#86efac'],      // Green
  warning: ['#f59e0b', '#fbbf24', '#fcd34d'],      // Amber
  danger: ['#f43f5e', '#fb7185', '#fda4af'],       // Rose
  neutral: ['#64748b', '#94a3b8', '#cbd5e1'],      // Slate
  mixed: ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'],
};

/** 基礎圖表配置 - 乾淨簡潔風格 */
const getBaseOptions = (): Partial<ApexChartOptions> => ({
  chart: {
    type: 'line',
    height: '100%',
    background: 'transparent',
    toolbar: { show: false },
    animations: {
      enabled: true,
      speed: 400,
    },
  },
  colors: DEFAULT_COLORS.mixed,
  dataLabels: { enabled: false },
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  grid: {
    show: true,
    borderColor: '#334155',
    strokeDashArray: 3,
  },
  legend: {
    show: true,
    position: 'top',
    labels: { colors: '#94a3b8' },
  },
  xaxis: {
    labels: { style: { colors: '#94a3b8' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { style: { colors: '#94a3b8' } },
  },
  tooltip: {
    enabled: true,
    theme: 'dark',
  },
});

/** Line Chart 配置 */
const getLineChartOptions = (
  data: ChartDataResponse,
  config?: WidgetConfig
): ApexChartOptions => {
  const base = getBaseOptions();
  return {
    ...base,
    chart: {
      ...base.chart!,
      type: 'line',
      sparkline: config?.sparkline ? { enabled: true } : undefined,
    },
    series: data.series as ChartSeries[],
    colors: config?.colors || DEFAULT_COLORS.primary,
    stroke: {
      curve: 'smooth',
      width: config?.sparkline ? 2 : 3,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.1,
        opacityFrom: 0.2,
        opacityTo: 0,
      },
    },
    grid: {
      show: !config?.sparkline,
      borderColor: '#334155',
      strokeDashArray: 3,
    },
    legend: {
      show: config?.showLegend !== false && !config?.sparkline,
      position: 'top',
      labels: { colors: '#94a3b8' },
    },
    xaxis: {
      type: 'category',
      categories: data.categories || [],
      labels: { style: { colors: '#94a3b8' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8' } },
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      y: {
        formatter: (val: number) => {
          const unit = config?.unit || '';
          const decimals = config?.decimals ?? 0;
          return `${val.toFixed(decimals)}${unit}`;
        },
      },
    },
  } as ApexChartOptions;
};

/** Area Chart 配置 */
const getAreaChartOptions = (
  data: ChartDataResponse,
  config?: WidgetConfig
): ApexChartOptions => {
  const lineOptions = getLineChartOptions(data, config);
  return {
    ...lineOptions,
    chart: {
      ...lineOptions.chart,
      type: 'area',
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.3,
        opacityFrom: 0.4,
        opacityTo: 0.05,
      },
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
  } as ApexChartOptions;
};

/** Bar Chart 配置 */
const getBarChartOptions = (
  data: ChartDataResponse,
  config?: WidgetConfig
): ApexChartOptions => {
  const base = getBaseOptions();
  return {
    ...base,
    chart: {
      ...base.chart!,
      type: 'bar',
      stacked: config?.stacked || false,
    },
    series: data.series as ChartSeries[],
    colors: config?.colors || DEFAULT_COLORS.mixed,
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        columnWidth: '60%',
      },
    },
    grid: {
      show: config?.showGrid !== false,
      borderColor: '#334155',
      strokeDashArray: 3,
    },
    legend: {
      show: config?.showLegend !== false,
      position: 'top',
      labels: { colors: '#94a3b8' },
    },
    xaxis: {
      type: 'category',
      categories: data.categories || [],
      labels: { style: { colors: '#94a3b8' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8' } },
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      y: {
        formatter: (val: number) => {
          const unit = config?.unit || '';
          const decimals = config?.decimals ?? 0;
          return `${val.toFixed(decimals)}${unit}`;
        },
      },
    },
    dataLabels: { enabled: false },
  } as ApexChartOptions;
};

/** Radial Bar (Gauge) Chart 配置 */
const getRadialBarChartOptions = (
  data: ChartDataResponse,
  config?: WidgetConfig
): ApexChartOptions => {
  const values = data.series.map((s) =>
    typeof s === 'number' ? s : (s.data[0] as number) || 0
  );
  const labels = data.series.map((s) =>
    typeof s === 'object' ? s.name : ''
  );

  return {
    chart: {
      type: 'radialBar',
      height: '100%',
      background: 'transparent',
      toolbar: { show: false },
    },
    series: values,
    colors: config?.colors || DEFAULT_COLORS.success,
    plotOptions: {
      radialBar: {
        hollow: { size: '55%' },
        track: { background: '#1e293b' },
        dataLabels: {
          name: {
            show: true,
            color: '#94a3b8',
          },
          value: {
            show: true,
            color: '#f1f5f9',
            fontSize: '24px',
          },
        },
      },
    },
    labels: labels.length ? labels : data.categories || ['Progress'],
    legend: {
      show: false,
      position: 'bottom',
      labels: { colors: '#94a3b8' },
    },
    tooltip: {
      enabled: false,
      theme: 'dark',
    },
    stroke: {
      width: 0,
    },
    fill: {
      type: 'gradient',
    },
    dataLabels: { enabled: false },
    grid: { show: false },
  } as ApexChartOptions;
};

/**
 * 根據 Widget 類型取得對應的 ApexCharts options
 */
export function getChartOptions(
  type: WidgetType,
  data: ChartDataResponse,
  config?: WidgetConfig
): ApexChartOptions | null {
  switch (type) {
    case 'line':
      return getLineChartOptions(data, config);
    case 'area':
      return getAreaChartOptions(data, config);
    case 'bar':
      return getBarChartOptions(data, config);
    case 'radialBar':
      return getRadialBarChartOptions(data, config);
    case 'metric':
      return null; // Metric 使用專屬組件，不需要 ApexCharts
    default:
      return getLineChartOptions(data, config);
  }
}

/**
 * Composable: useChartAdapter
 * 響應式圖表配置轉換器
 */
export function useChartAdapter(
  type: Ref<WidgetType>,
  data: Ref<ChartDataResponse | null>,
  config?: Ref<WidgetConfig | undefined>
) {
  const chartOptions = computed(() => {
    if (!data.value) return null;
    return getChartOptions(type.value, data.value, config?.value);
  });

  const isEmpty = computed(() => {
    if (!data.value) return true;
    return data.value.series.length === 0;
  });

  const hasData = computed(() => !isEmpty.value);

  return {
    chartOptions,
    isEmpty,
    hasData,
    DEFAULT_COLORS,
  };
}

export { DEFAULT_COLORS };
