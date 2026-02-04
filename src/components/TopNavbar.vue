<script setup lang="ts">
/**
 * TopNavbar.vue
 * 頂部導航欄
 */
import { ref } from 'vue';

interface Props {
  sensorCount?: number;
  isStreaming?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  sensorCount: 12,
  isStreaming: true,
});

const emit = defineEmits<{
  save: [];
  fullscreen: [];
  settings: [];
}>();

const currentView = ref('Main Overview');
</script>

<template>
  <header class="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center px-6 gap-6">
    <!-- Logo & Title -->
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-lg bg-cyan-600 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-white"
        >
          <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <div>
        <h1 class="text-base font-semibold">
          <span class="text-cyan-400">Aqua</span><span class="text-slate-100">Monitor</span>
        </h1>
        <p class="text-xs text-slate-500">Water Quality System</p>
      </div>
    </div>

    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-sm ml-8">
      <span class="text-slate-500">Dashboard</span>
      <span class="text-slate-600">/</span>
      <span class="text-slate-100 font-medium">{{ currentView }}</span>
    </nav>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Status Indicators -->
    <div class="flex items-center gap-6">
      <!-- Sensors -->
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500" />
        <span class="text-sm text-slate-300">{{ sensorCount }} Sensors</span>
      </div>

      <!-- Streaming -->
      <div class="flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full"
          :class="isStreaming ? 'bg-emerald-500' : 'bg-slate-500'"
        />
        <span class="text-sm text-slate-300">Streaming</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 ml-4">
      <!-- Notifications -->
      <button
        type="button"
        class="relative p-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        <span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />
      </button>

      <!-- Fullscreen -->
      <button
        type="button"
        class="p-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        @click="emit('fullscreen')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>

      <!-- Settings -->
      <button
        type="button"
        class="p-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        @click="emit('settings')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      <!-- User -->
      <button
        type="button"
        class="ml-2 w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
    </div>
  </header>
</template>
