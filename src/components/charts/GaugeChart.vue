<script setup lang="ts">
/**
 * GaugeChart.vue
 * 儀表板/壓力計組件
 */
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { GaugeData, WidgetConfig } from '@/types/dashboard';

interface Props {
  data: GaugeData | null;
  config?: WidgetConfig;
}

const props = defineProps<Props>();

const chartOptions = computed(() => {
  if (!props.data) return null;

  const value = props.data.value;
  const min = props.data.min ?? 0;
  const max = props.data.max ?? 100;
  const percentage = ((value - min) / (max - min)) * 100;

  return {
    chart: {
      type: 'radialBar',
      height: '100%',
      background: 'transparent',
      offsetY: -10,
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          size: '60%',
          background: 'transparent',
        },
        track: {
          background: '#1e293b',
          strokeWidth: '100%',
          margin: 0,
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: '12px',
            color: '#64748b',
            offsetY: 60,
          },
          value: {
            show: true,
            fontSize: '32px',
            fontWeight: 600,
            color: '#f1f5f9',
            offsetY: -5,
            formatter: () => `${value.toFixed(1)}`,
          },
        },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        shadeIntensity: 0.5,
        gradientToColors: props.config?.colors?.[1] || '#22c55e',
        stops: [0, 100],
      },
    },
    colors: props.config?.colors || ['#22c55e'],
    stroke: {
      lineCap: 'round',
    },
    labels: [props.data.unit || 'PSI'],
  };
});

const series = computed(() => {
  if (!props.data) return [0];
  const min = props.data.min ?? 0;
  const max = props.data.max ?? 100;
  return [((props.data.value - min) / (max - min)) * 100];
});

const statusClass = computed(() => {
  if (!props.data?.status) return 'bg-emerald-500 text-emerald-900';
  switch (props.data.status) {
    case 'warning':
      return 'bg-amber-500 text-amber-900';
    case 'danger':
      return 'bg-rose-500 text-rose-900';
    default:
      return 'bg-emerald-500 text-emerald-900';
  }
});

const statusText = computed(() => {
  if (!props.data?.status) return 'Normal';
  switch (props.data.status) {
    case 'warning':
      return 'Warning';
    case 'danger':
      return 'Critical';
    default:
      return 'Normal';
  }
});
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center">
    <div class="flex-1 w-full">
      <VueApexCharts
        v-if="chartOptions"
        type="radialBar"
        height="100%"
        :options="chartOptions"
        :series="series"
      />
    </div>
    <div
      class="px-4 py-1.5 rounded-full text-xs font-medium -mt-4"
      :class="statusClass"
    >
      {{ statusText }}
    </div>
  </div>
</template>
