<script setup lang="ts">
/**
 * ActivityWidget.vue
 * 活動時間軸組件
 */
import { computed } from 'vue';
import type { ActivityData, WidgetConfig } from '@/types/dashboard';

interface Props {
  data: ActivityData | null;
  config?: WidgetConfig;
}

const props = defineProps<Props>();

const items = computed(() => {
  return props.data?.items || [];
});

function getTypeClass(type: string) {
  switch (type) {
    case 'error':
      return 'bg-rose-500';
    case 'warning':
      return 'bg-amber-500';
    case 'success':
      return 'bg-emerald-500';
    default:
      return 'bg-blue-500';
  }
}

function getTypeIcon(type: string) {
  return type;
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="space-y-3">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex gap-3"
      >
        <!-- Timeline Dot -->
        <div class="flex flex-col items-center">
          <div
            class="w-2.5 h-2.5 rounded-full mt-1.5"
            :class="getTypeClass(item.type)"
          />
          <div class="flex-1 w-px bg-slate-700/50 mt-1" />
        </div>

        <!-- Content -->
        <div class="flex-1 pb-4">
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm text-slate-200">
              {{ item.event }}
            </p>
            <span class="text-xs text-slate-500 whitespace-nowrap">
              {{ item.time }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="items.length === 0"
        class="flex items-center justify-center h-32 text-slate-500 text-sm"
      >
        No recent activity
      </div>
    </div>
  </div>
</template>
