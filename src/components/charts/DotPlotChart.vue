<script setup lang="ts">
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
  return getChartOptions('dotPlot', props.data, props.config);
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

const series = computed(() => {
  return props.data?.series || [];
});
</script>

<template>
  <div class="w-full h-full">
    <VueApexCharts
      v-if="chartOptions"
      ref="chartRef"
      type="scatter"
      :options="chartOptions as any"
      :series="series"
    />
  </div>
</template>
