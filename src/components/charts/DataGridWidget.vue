<script setup lang="ts">
/**
 * DataGridWidget.vue
 * 數據表格/日誌查看器組件
 */
import { computed } from 'vue';
import type { DataGridData, WidgetConfig } from '@/types/dashboard';

interface Props {
  data: DataGridData | null;
  config?: WidgetConfig;
}

const props = defineProps<Props>();

const columns = computed(() => {
  return props.data?.columns || ['TIME', 'SENSOR', 'VALUE', 'STATUS'];
});

const rows = computed(() => {
  return props.data?.rows || [];
});

function getStatusClass(status: string) {
  switch (status) {
    case 'warning':
      return 'text-amber-400';
    case 'danger':
      return 'text-rose-400';
    default:
      return 'text-emerald-400';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'warning':
      return 'warning';
    case 'danger':
      return 'danger';
    default:
      return 'normal';
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Table Header -->
    <div class="grid grid-cols-4 gap-4 px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
      <div
        v-for="col in columns"
        :key="col"
      >
        {{ col }}
      </div>
    </div>

    <!-- Table Body -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="grid grid-cols-4 gap-4 px-3 py-2.5 text-sm border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
      >
        <div class="text-slate-400 font-mono text-xs">
          {{ row.time }}
        </div>
        <div class="text-slate-200">
          {{ row.sensor }}
        </div>
        <div class="text-slate-200 font-medium">
          {{ row.value }}
        </div>
        <div
          class="flex items-center gap-1.5"
          :class="getStatusClass(row.status)"
        >
          <!-- Normal Icon -->
          <svg
            v-if="getStatusIcon(row.status) === 'normal'"
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="m9 11 3 3L22 4" />
          </svg>

          <!-- Warning Icon -->
          <svg
            v-else-if="getStatusIcon(row.status) === 'warning'"
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>

          <!-- Danger Icon -->
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
          </svg>

          <span class="capitalize">{{ row.status }}</span>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="rows.length === 0"
        class="flex items-center justify-center h-32 text-slate-500 text-sm"
      >
        No data available
      </div>
    </div>
  </div>
</template>
