<script setup lang="ts">
/**
 * LineChart.vue
 * 折線圖組件
 */
import { computed, ref, watch, onMounted } from 'vue';
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
  return getChartOptions('line', props.data, props.config);
});

const series = computed(() => {
  return props.data?.series || [];
});

// 當數據變化時更新圖表
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
      type="line"
      height="100%"
      :options="chartOptions"
      :series="series"
    />
  </div>
</template>
