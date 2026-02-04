<script setup lang="ts">
/**
 * RadialBarChart.vue
 * 徑向進度條/儀表板組件
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
  return getChartOptions('radialBar', props.data, props.config);
});

const series = computed(() => {
  if (!props.data) return [];
  return props.data.series.map((s) =>
    typeof s === 'number' ? s : (s.data[0] as number) || 0
  );
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
  <div class="h-full w-full flex items-center justify-center">
    <VueApexCharts
      v-if="chartOptions"
      ref="chartRef"
      type="radialBar"
      height="100%"
      :options="chartOptions"
      :series="series"
    />
  </div>
</template>
