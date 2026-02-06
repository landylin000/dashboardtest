<script setup lang="ts">
/**
 * AdmixturePlot.vue
 * 遺傳組成結構圖 / Admixture Plot
 * 使用 100% 堆疊柱狀圖呈現個體的基因混合比例
 */
import { computed, ref, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ChartDataResponse, WidgetConfig } from '@/types/dashboard';

interface AdmixtureData {
  samples: string[];
  clusters: {
    name: string;
    values: number[];
    color?: string;
  }[];
  groups?: {
    name: string;
    startIndex: number;
    endIndex: number;
  }[];
}

// ApexCharts series 格式
interface SeriesData {
  name: string;
  data: number[];
}

interface Props {
  data: AdmixtureData | ChartDataResponse | SeriesData[] | null;
  config?: WidgetConfig;
}

const props = defineProps<Props>();

type ApexChartInstance = InstanceType<typeof VueApexCharts> & {
  updateOptions: (options: unknown, redraw?: boolean, animate?: boolean) => void;
};

const chartRef = ref<ApexChartInstance | null>(null);

// 預設色彩
const defaultColors = [
  '#3b82f6', // Blue - Cluster 1
  '#22c55e', // Green - Cluster 2
  '#f59e0b', // Amber - Cluster 3
  '#8b5cf6', // Purple - Cluster 4
  '#ec4899', // Pink - Cluster 5
  '#06b6d4', // Cyan - Cluster 6
  '#f43f5e', // Rose - Cluster 7
];

// 生成模擬數據
const defaultData = computed<AdmixtureData>(() => {
  const clusterCount = 5;
  const samples: string[] = [];
  const clusters: AdmixtureData['clusters'] = [];

  // 生成群體
  const groups = [
    { name: 'KonaBay', count: 6 },
    { name: 'SyaquaA', count: 6 },
    { name: 'SyaquaB', count: 6 },
    { name: 'SyaquaC', count: 6 },
    { name: 'opptyshrimp', count: 6 },
  ];

  let sampleIndex = 0;
  const groupInfo: AdmixtureData['groups'] = [];

  groups.forEach((group) => {
    const startIndex = sampleIndex;
    for (let i = 0; i < group.count; i++) {
      samples.push(`${group.name}-${String(i + 1).padStart(2, '0')}`);
      sampleIndex++;
    }
    groupInfo.push({
      name: group.name,
      startIndex,
      endIndex: sampleIndex - 1,
    });
  });

  // 生成各 cluster 的比例值
  for (let c = 0; c < clusterCount; c++) {
    const values: number[] = [];

    for (let g = 0; g < groups.length; g++) {
      const group = groups[g]!;
      for (let i = 0; i < group.count; i++) {
        // 模擬基因組成：每個群體主要由特定 cluster 組成
        let baseValue = 0;

        if (g === c) {
          // 主要 cluster
          baseValue = 60 + Math.random() * 30;
        } else if (Math.abs(g - c) === 1) {
          // 相鄰 cluster 有混合
          baseValue = 5 + Math.random() * 20;
        } else {
          // 其他 cluster 較少
          baseValue = Math.random() * 10;
        }

        values.push(baseValue);
      }
    }

    clusters.push({
      name: `Cluster ${c + 1}`,
      values,
      color: defaultColors[c],
    });
  }

  // 正規化：確保每個樣本的總和為 100%
  for (let s = 0; s < samples.length; s++) {
    const total = clusters.reduce((sum, cluster) => sum + (cluster.values[s] ?? 0), 0);
    clusters.forEach((cluster) => {
      const currentValue = cluster.values[s] ?? 0;
      cluster.values[s] = (currentValue / total) * 100;
    });
  }

  return {
    samples,
    clusters,
    groups: groupInfo,
  };
});

// 處理數據
const chartData = computed(() => {
  if (!props.data) return defaultData.value;

  // 格式 1: AdmixtureData 格式 { samples, clusters }
  if ('samples' in props.data && 'clusters' in props.data) {
    return props.data as AdmixtureData;
  }

  // 格式 2: ApexCharts series 格式 [{ name, data }]
  if (Array.isArray(props.data) && props.data.length > 0) {
    const firstItem = props.data[0] as SeriesData;
    if (typeof firstItem.name === 'string' && Array.isArray(firstItem.data)) {
      const items = props.data as SeriesData[];
      const sampleCount = items[0]?.data?.length || 0;

      // 生成預設 sample 名稱
      const samples = Array.from({ length: sampleCount }, (_, i) => `Sample ${i + 1}`);

      return {
        samples,
        clusters: items.map((item, i) => ({
          name: item.name,
          values: item.data,
          color: defaultColors[i % defaultColors.length],
        })),
      };
    }
  }

  // 格式 3: ChartDataResponse 格式，嘗試轉換
  const response = props.data as ChartDataResponse;
  if (response.series && response.categories) {
    return {
      samples: response.categories,
      clusters: response.series.map((s, i) => ({
        name: s.name,
        values: s.data as number[],
        color: defaultColors[i % defaultColors.length],
      })),
    };
  }

  return defaultData.value;
});

// ApexCharts 系列數據
const series = computed(() => {
  return chartData.value.clusters.map((cluster) => ({
    name: cluster.name,
    data: cluster.values,
  }));
});

// ApexCharts 配置
const chartOptions = computed(() => ({
  chart: {
    type: 'bar' as const,
    height: '100%',
    stacked: true,
    stackType: '100%' as const,
    background: 'transparent',
    toolbar: { show: false },
    animations: {
      enabled: true,
      speed: 400,
    },
  },
  colors: chartData.value.clusters.map((c, i) => c.color || defaultColors[i % defaultColors.length]),
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '100%',
      borderRadius: 0,
      borderRadiusWhenStacked: 'last' as const,
    },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 0.5,
    colors: ['#1e293b'],
  },
  grid: {
    show: false,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  },
  xaxis: {
    categories: chartData.value.samples,
    labels: {
      show: false,
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    min: 0,
    max: 100,
    labels: {
      style: { colors: '#94a3b8' },
      formatter: (val: number) => `${val}%`,
    },
  },
  legend: {
    show: true,
    position: 'top' as const,
    horizontalAlign: 'center' as const,
    labels: { colors: '#94a3b8' },
    markers: {
      size: 6,
      strokeWidth: 0,
    },
    itemMargin: {
      horizontal: 8,
      vertical: 4,
    },
  },
  tooltip: {
    enabled: true,
    theme: 'dark',
    shared: true,
    intersect: false,
    y: {
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
  },
  fill: {
    opacity: 1,
  },
}));

// 群體標籤
const groupLabels = computed(() => {
  const groups = chartData.value.groups;
  if (!groups) return [];

  return groups.map((group) => {
    const width = ((group.endIndex - group.startIndex + 1) / chartData.value.samples.length) * 100;
    const left = (group.startIndex / chartData.value.samples.length) * 100;
    return {
      ...group,
      width,
      left,
    };
  });
});

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
  <div class="admixture-plot">
    <div class="chart-container">
      <VueApexCharts
        ref="chartRef"
        type="bar"
        height="100%"
        :options="chartOptions"
        :series="series"
      />
    </div>

    <!-- 群體標籤 -->
    <div v-if="groupLabels.length > 0" class="group-labels">
      <div
        v-for="group in groupLabels"
        :key="group.name"
        class="group-label"
        :style="{
          width: `${group.width}%`,
          left: `${group.left}%`,
        }"
      >
        <div class="group-marker" />
        <span class="group-name">{{ group.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admixture-plot {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.chart-container {
  flex: 1;
  min-height: 0;
}

.group-labels {
  position: relative;
  height: 28px;
  margin-top: 4px;
  padding: 0 10px;
}

.group-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.group-marker {
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(100, 116, 139, 0.6), transparent);
  border-radius: 1px;
}

.group-name {
  font-size: 9px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
