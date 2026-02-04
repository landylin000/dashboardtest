<script setup lang="ts">
/**
 * MetricCard.vue
 * 數值指標卡片組件
 */
import { computed } from 'vue';
import type { MetricData } from '@/types/dashboard';

interface Props {
  data: MetricData | null;
}

const props = defineProps<Props>();

const formattedValue = computed(() => {
  if (!props.data) return '--';
  const { value } = props.data;
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
});

const trendIcon = computed(() => {
  if (!props.data?.trend) return null;
  return props.data.trend;
});

const trendColorClass = computed(() => {
  if (!props.data?.trend) return 'text-slate-400';
  switch (props.data.trend) {
    case 'up':
      return props.data.status === 'danger' ? 'text-rose-400' : 'text-emerald-400';
    case 'down':
      return props.data.status === 'success' ? 'text-emerald-400' : 'text-rose-400';
    default:
      return 'text-slate-400';
  }
});

const statusColorClass = computed(() => {
  if (!props.data?.status) return 'text-slate-100';
  switch (props.data.status) {
    case 'success':
      return 'text-emerald-400';
    case 'warning':
      return 'text-amber-400';
    case 'danger':
      return 'text-rose-400';
    default:
      return 'text-slate-100';
  }
});
</script>

<template>
  <div class="h-full flex flex-col justify-center px-2">
    <!-- Label -->
    <p
      v-if="data?.label"
      class="text-sm text-slate-400 mb-1"
    >
      {{ data.label }}
    </p>

    <!-- Main Value -->
    <div class="flex items-baseline gap-2">
      <span
        class="text-4xl font-semibold tracking-tight"
        :class="statusColorClass"
      >
        {{ formattedValue }}
      </span>
      <span
        v-if="data?.unit"
        class="text-lg text-slate-400"
      >
        {{ data.unit }}
      </span>
    </div>

    <!-- Trend -->
    <div
      v-if="data?.trend"
      class="flex items-center gap-1.5 mt-2"
      :class="trendColorClass"
    >
      <!-- Up Arrow -->
      <svg
        v-if="trendIcon === 'up'"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>

      <!-- Down Arrow -->
      <svg
        v-else-if="trendIcon === 'down'"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>

      <!-- Stable Indicator -->
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M5 12h14" />
      </svg>

      <span class="text-sm">
        {{ data?.trendValue !== undefined ? `${data.trendValue > 0 ? '+' : ''}${data.trendValue}%` : '' }}
        {{ data?.trendLabel || '' }}
      </span>
    </div>
  </div>
</template>
