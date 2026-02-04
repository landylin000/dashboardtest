<script setup lang="ts">
/**
 * PieChart.vue
 * 圓餅圖/甜甜圈圖組件
 */
import { computed, ref, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ChartDataResponse, WidgetConfig } from '@/types/dashboard';

interface Props {
  data: ChartDataResponse | null;
  config?: WidgetConfig;
}

const props = defineProps<Props>();

const chartRef = ref<InstanceType<typeof VueApexCharts> | null>(null);

const chartOptions = computed(() => {
  if (!props.data) return null;

  return {
    chart: {
      type: 'donut',
      height: '100%',
      background: 'transparent',
    },
    colors: props.config?.colors || ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'],
    labels: props.data.categories || props.data.series.map((s) => s.name),
    legend: {
      show: props.config?.showLegend !== false,
      position: 'bottom',
      labels: {
        colors: '#94a3b8',
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: {
              show: true,
              color: '#94a3b8',
            },
            value: {
              show: true,
              color: '#f1f5f9',
              fontSize: '20px',
              fontWeight: 600,
            },
            total: {
              show: true,
              label: 'Total',
              color: '#64748b',
              fontSize: '12px',
              formatter: (w: { globals: { seriesTotals: number[] } }) => {
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString();
              },
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: false,
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
    },
  };
});

const series = computed(() => {
  if (!props.data) return [];
  return props.data.series.map((s) => {
    if (typeof s === 'number') return s;
    if (Array.isArray(s.data) && s.data.length > 0) {
      return typeof s.data[0] === 'number' ? s.data[0] : 0;
    }
    return 0;
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
  <div class="h-full w-full">
    <VueApexCharts
      v-if="chartOptions && series.length"
      ref="chartRef"
      type="donut"
      height="100%"
      :options="chartOptions"
      :series="series"
    />
  </div>
</template>
