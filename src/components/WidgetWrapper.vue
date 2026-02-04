<script setup lang="ts">
/**
 * WidgetWrapper.vue
 * 通用 Widget 外殼組件 - 具備標題列、拖拉手柄、刷新按鈕、LIVE 標籤
 */
import { computed } from 'vue';
import type { WidgetStatus } from '@/types/dashboard';

interface Props {
  title: string;
  status?: WidgetStatus;
  draggable?: boolean;
  showLive?: boolean;
  removable?: boolean;
  locked?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  status: 'idle',
  draggable: true,
  showLive: false,
  removable: true,
  locked: false,
});

const emit = defineEmits<{
  refresh: [];
  remove: [];
  toggleLock: [];
}>();

const isLoading = computed(() => props.status === 'loading');
const isEmpty = computed(() => props.status === 'empty');
const hasError = computed(() => props.status === 'error');

function handleRefresh() {
  emit('refresh');
}

function handleRemove() {
  emit('remove');
}

function handleToggleLock() {
  emit('toggleLock');
}
</script>

<template>
  <div class="widget-card">
    <!-- Header -->
    <header class="widget-header">
      <div class="flex items-center gap-3 flex-1">
        <!-- Drag Handle -->
        <div
          v-if="draggable && !locked"
          class="drag-handle gs-drag-handle"
          role="button"
          tabindex="0"
          aria-label="Drag to move"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="pointer-events-none"
          >
            <circle cx="9" cy="5" r="1" fill="currentColor" />
            <circle cx="9" cy="12" r="1" fill="currentColor" />
            <circle cx="9" cy="19" r="1" fill="currentColor" />
            <circle cx="15" cy="5" r="1" fill="currentColor" />
            <circle cx="15" cy="12" r="1" fill="currentColor" />
            <circle cx="15" cy="19" r="1" fill="currentColor" />
          </svg>
        </div>
        <h3 class="widget-title">{{ title }}</h3>
        <!-- Locked Indicator -->
        <span
          v-if="locked"
          class="text-xs text-amber-400 flex items-center gap-1 ml-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          已釘選
        </span>
      </div>

      <div class="flex items-center gap-3">
        <!-- LIVE Badge -->
        <span
          v-if="showLive && !isLoading"
          class="live-badge"
        >
          LIVE
        </span>

        <!-- Loading Indicator -->
        <div
          v-if="isLoading"
          class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
        />

        <!-- Refresh Button -->
        <button
          type="button"
          class="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors disabled:opacity-50"
          :disabled="isLoading"
          aria-label="Refresh"
          @click="handleRefresh"
        >
          <svg
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
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>

        <!-- Lock/Unlock Button -->
        <button
          type="button"
          class="p-1.5 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-800/50 transition-colors"
          :aria-label="locked ? 'Unlock widget' : 'Lock widget'"
          @click="handleToggleLock"
        >
          <svg
            v-if="locked"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-amber-400"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
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
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        </button>

        <!-- Remove Button -->
        <button
          v-if="removable"
          type="button"
          class="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-colors"
          aria-label="Remove widget"
          @click="handleRemove"
        >
          <svg
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
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Content Area -->
    <div class="widget-content relative">
      <!-- Loading Overlay -->
      <Transition name="fade">
        <div
          v-if="isLoading"
          class="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-10"
        >
          <div class="flex flex-col items-center gap-3">
            <div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span class="text-sm text-slate-400">Loading...</span>
          </div>
        </div>
      </Transition>

      <!-- Empty State -->
      <div
        v-if="isEmpty && !isLoading"
        class="h-full flex flex-col items-center justify-center text-slate-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mb-3 opacity-50"
        >
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
        <span class="text-sm">未配置</span>
      </div>

      <!-- Error State -->
      <div
        v-else-if="hasError && !isLoading"
        class="h-full flex flex-col items-center justify-center text-rose-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mb-3 opacity-70"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        <span class="text-sm">Failed to load data</span>
        <button
          type="button"
          class="mt-2 text-xs text-rose-300 hover:text-rose-200 underline"
          @click="handleRefresh"
        >
          Retry
        </button>
      </div>

      <!-- Default Slot (Chart Content) -->
      <slot v-else />
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.border-3 {
  border-width: 3px;
}
</style>
