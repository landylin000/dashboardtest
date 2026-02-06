<script setup lang="ts">
/**
 * BoxPlotChart.vue
 * 盒鬚圖組件
 * 用於統計群體內樣本的分佈情況（如純合子比例）
 */
import { computed, ref, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ChartDataResponse, WidgetConfig } from '@/types/dashboard';

interface BoxPlotDataPoint {
  x: string;
  y: [number, number, number, number, number]; // [min, q1, median, q3, max]
}

interface BoxPlotData {
  series: {
    name?: string;
    data: BoxPlotDataPoint[];
  }[];
  title?: string;
  yAxisLabel?: string;
}

interface Props {
  data: BoxPlotData | ChartDataResponse | null;
  config?: WidgetConfig;
}

const props = defineProps<Props>();

type ApexChartInstance = InstanceType<typeof VueApexCharts> & {
  updateOptions: (options: unknown, redraw?: boolean, animate?: boolean) => void;
};

const chartRef = ref<ApexChartInstance | null>(null);

// 預設顏色
const defaultColors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

// 計算盒鬚圖統計值
function calculateBoxPlotStats(values: number[]): [number, number, number, number, number] {
  if (values.length === 0) return [0, 0, 0, 0, 0];

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const min = sorted[0] ?? 0;
  const max = sorted[n - 1] ?? min;

  const q1Index = Math.floor(n * 0.25);
  const q2Index = Math.floor(n * 0.5);
  const q3Index = Math.floor(n * 0.75);

  const q1 = sorted[q1Index] ?? min;
  const q2Left = sorted[q2Index - 1] ?? sorted[q2Index] ?? min;
  const q2Right = sorted[q2Index] ?? q2Left;
  const median = n % 2 === 0 ? (q2Left + q2Right) / 2 : q2Right;
  const q3 = sorted[q3Index] ?? max;

  return [min, q1, median, q3, max];
}

// 生成模擬數據
const defaultData = computed<BoxPlotData>(() => {
  const groups = ['KonaBay', 'SyaquaA', 'SyaquaB', 'SyaquaC', 'opptyshrimp'];

  const data: BoxPlotDataPoint[] = groups.map((group, index) => {
    // 模擬不同群體的純合子比例分佈
    const baseValue = 75 + index * 3;
    const spread = 5 + Math.random() * 5;

    // 生成模擬值
    const values: number[] = [];
    for (let i = 0; i < 20; i++) {
      values.push(baseValue + (Math.random() - 0.5) * spread * 2);
    }

    return {
      x: group,
      y: calculateBoxPlotStats(values),
    };
  });

  return {
    series: [{ name: 'Homo Ratio', data }],
    yAxisLabel: 'Homo Ratio (%)',
  };
});

// 處理數據
const chartData = computed(() => {
  if (!props.data) return defaultData.value;

  // 格式 1: BoxPlotData 格式 { series: [...] }
  if ('series' in props.data && props.data.series[0]?.data[0]) {
    const firstItem = props.data.series[0].data[0];
    if (
      firstItem &&
      typeof firstItem === 'object' &&
      'y' in firstItem &&
      Array.isArray((firstItem as BoxPlotDataPoint).y) &&
      (firstItem as BoxPlotDataPoint).y.length === 5
    ) {
      return props.data as BoxPlotData;
    }
  }

  // 格式 2: ApexCharts JSON 格式 [{ name, type: 'boxPlot', data: [...] }]
  if (Array.isArray(props.data) && props.data.length > 0) {
    const firstItem = props.data[0] as Record<string, unknown>;
    if (firstItem.type === 'boxPlot' && Array.isArray(firstItem.data)) {
      const boxData = firstItem.data as BoxPlotDataPoint[];
      return {
        series: [{
          name: String(firstItem.name || 'Box Plot'),
          data: boxData,
        }],
      };
    }

    // 格式 3: 直接是 [{ x, y: [...] }] 陣列
    if ('x' in firstItem && Array.isArray(firstItem.y)) {
      return {
        series: [{
          name: 'Box Plot',
          data: props.data as unknown as BoxPlotDataPoint[],
        }],
      };
    }
  }

  // 格式 4: ChartDataResponse 格式，嘗試轉換
  const response = props.data as ChartDataResponse;
  if (response.series && response.categories) {
    // 將普通數據轉換為盒鬚圖格式
    const categories = response.categories;
    const seriesData = response.series;

    // 按類別分組計算統計值
    const dataPoints: BoxPlotDataPoint[] = categories.map((category, catIndex) => {
      const values = seriesData.map((s) => {
        const data = s.data as number[];
        return data[catIndex] ?? 0;
      });

      return {
        x: category,
        y: calculateBoxPlotStats(values),
      };
    });

    return {
      series: [{ name: seriesData[0]?.name || 'Value', data: dataPoints }],
    };
  }

  return defaultData.value;
});

// ApexCharts 系列數據
const series = computed(() => {
  return chartData.value.series.map((s) => ({
    name: s.name || 'Value',
    type: 'boxPlot',
    data: s.data,
  }));
});

// ApexCharts 配置
const chartOptions = computed(() => ({
  chart: {
    type: 'boxPlot' as const,
    height: '100%',
    background: 'transparent',
    toolbar: { show: false },
    animations: {
      enabled: true,
      speed: 400,
    },
  },
  colors: props.config?.colors || defaultColors,
  plotOptions: {
    boxPlot: {
      colors: {
        upper: '#3b82f6',
        lower: '#22c55e',
      },
    },
  },
  stroke: {
    colors: ['#94a3b8'],
  },
  grid: {
    show: true,
    borderColor: '#334155',
    strokeDashArray: 3,
    padding: {
      left: 10,
      right: 10,
    },
  },
  xaxis: {
    type: 'category' as const,
    labels: {
      style: {
        colors: '#94a3b8',
        fontSize: '11px',
      },
      rotate: -45,
      rotateAlways: false,
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: '#94a3b8' },
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    title: {
      text: chartData.value.yAxisLabel || props.config?.unit || '',
      style: {
        color: '#94a3b8',
        fontSize: '11px',
      },
    },
  },
  tooltip: {
    enabled: true,
    theme: 'dark',
    custom: function({ seriesIndex, dataPointIndex, w }: { seriesIndex: number; dataPointIndex: number; w: { config: { series: { data: BoxPlotDataPoint[] }[] } } }) {
      const data = w.config.series[seriesIndex]?.data?.[dataPointIndex];
      if (!data) return '';
      const [min, q1, median, q3, max] = data.y;

      return `
        <div class="apexcharts-tooltip-boxplot">
          <div class="tooltip-title">${data.x}</div>
          <div class="tooltip-row"><span>Maximum:</span> <strong>${max.toFixed(2)}%</strong></div>
          <div class="tooltip-row"><span>Q3:</span> <strong>${q3.toFixed(2)}%</strong></div>
          <div class="tooltip-row"><span>Median:</span> <strong>${median.toFixed(2)}%</strong></div>
          <div class="tooltip-row"><span>Q1:</span> <strong>${q1.toFixed(2)}%</strong></div>
          <div class="tooltip-row"><span>Minimum:</span> <strong>${min.toFixed(2)}%</strong></div>
        </div>
      `;
    },
  },
  legend: {
    show: false,
  },
  dataLabels: {
    enabled: false,
  },
}) as any);

watch(
  () => props.data,
  () => {
    if (chartRef.value && props.data) {
      chartRef.value.updateOptions(chartOptions.value, true, true);
    }
  },
  { deep: true }
);
</script>

<template>
  <div class="boxplot-chart">
    <VueApexCharts
      ref="chartRef"
      :type="('boxPlot' as any)"
      height="100%"
      :options="chartOptions"
      :series="series"
    />
  </div>
</template>

<style scoped>
.boxplot-chart {
  width: 100%;
  height: 100%;
}
</style>

<style>
/* 全局樣式用於自定義 tooltip */
.apexcharts-tooltip-boxplot {
  background: rgba(15, 23, 42, 0.95) !important;
  border: 1px solid rgba(51, 65, 85, 0.8) !important;
  border-radius: 8px !important;
  padding: 12px !important;
  min-width: 140px;
}

.apexcharts-tooltip-boxplot .tooltip-title {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.apexcharts-tooltip-boxplot .tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  padding: 3px 0;
}

.apexcharts-tooltip-boxplot .tooltip-row span {
  color: #94a3b8;
}

.apexcharts-tooltip-boxplot .tooltip-row strong {
  color: #f1f5f9;
  font-weight: 500;
}
</style>
