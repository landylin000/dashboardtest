<script setup lang="ts">
/**
 * AreaChart.vue
 * 面積圖組件
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
  return getChartOptions('area', props.data, props.config);
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
      type="area"
      height="100%"
      :options="chartOptions"
      :series="series"
    />
  </div>
</template>
