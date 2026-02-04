<script setup lang="ts">
/**
 * RadarChart.vue
 * 雷達圖組件
 */
import { computed, ref, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { getChartOptions } from '@/composables/useChartAdapter';
import type { ChartDataResponse, WidgetConfig } from '@/types/dashboard';

interface Props {
  data: ChartDataResponse | null;
  config?: WidgetConfig;
}

const props = defineProps<Props>();

const chartRef = ref<InstanceType<typeof VueApexCharts> | null>(null);

const chartOptions = computed(() => {
  if (!props.data) return null;
  return getChartOptions('radar', props.data, props.config);
});

const series = computed(() => {
  return props.data?.series || [];
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
      v-if="chartOptions"
      ref="chartRef"
      :type="'radar' as any"
      height="100%"
      :options="chartOptions as any"
      :series="series"
    />
  </div>
</template>
