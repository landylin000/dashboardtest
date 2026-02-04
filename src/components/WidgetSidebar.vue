<script setup lang="ts">
/**
 * WidgetSidebar.vue
 * 左側 Widget 元件庫 - 可拖拉到主面板
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { GridStack } from 'gridstack';
import type { WidgetType } from '@/types/dashboard';

interface WidgetTemplate {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultW: number;
  defaultH: number;
}

interface Props {
  collapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
});

const emit = defineEmits<{
  toggle: [];
}>();

// Widget 模板定義
const widgetTemplates: WidgetTemplate[] = [
  {
    type: 'line',
    name: 'Line Chart',
    description: 'Real-time waveform',
    icon: 'line',
    color: '#3b82f6',
    defaultW: 6,
    defaultH: 4,
  },
  {
    type: 'bar',
    name: 'Bar Chart',
    description: 'Comparison view',
    icon: 'bar',
    color: '#8b5cf6',
    defaultW: 4,
    defaultH: 4,
  },
  {
    type: 'radialBar',
    name: 'Gauge',
    description: 'Status indicator',
    icon: 'gauge',
    color: '#22c55e',
    defaultW: 3,
    defaultH: 4,
  },
  {
    type: 'dataGrid',
    name: 'Data Grid',
    description: 'Log viewer',
    icon: 'grid',
    color: '#06b6d4',
    defaultW: 6,
    defaultH: 4,
  },
  {
    type: 'metric',
    name: 'Numeric Hub',
    description: 'Key metrics',
    icon: 'hash',
    color: '#f59e0b',
    defaultW: 3,
    defaultH: 2,
  },
  {
    type: 'pie',
    name: 'Pie Chart',
    description: 'Distribution',
    icon: 'pie',
    color: '#ec4899',
    defaultW: 4,
    defaultH: 4,
  },
  {
    type: 'activity',
    name: 'Activity',
    description: 'Event timeline',
    icon: 'activity',
    color: '#14b8a6',
    defaultW: 4,
    defaultH: 4,
  },
  {
    type: 'area',
    name: 'Stacked',
    description: 'Multi-series',
    icon: 'stacked',
    color: '#6366f1',
    defaultW: 6,
    defaultH: 4,
  },
];

const sidebarRef = ref<HTMLElement | null>(null);

// 設置拖拉功能
function setupDraggable() {
  if (!sidebarRef.value) return;

  const items = sidebarRef.value.querySelectorAll('.widget-library-item');

  items.forEach((item) => {
    const template = widgetTemplates.find(
      (t) => t.type === item.getAttribute('data-type')
    );
    if (!template) return;

    GridStack.setupDragIn(item as HTMLElement, {
      appendTo: 'body',
      helper: 'clone',
    });

    // 設置拖拉數據
    (item as HTMLElement).setAttribute('gs-w', String(template.defaultW));
    (item as HTMLElement).setAttribute('gs-h', String(template.defaultH));
    (item as HTMLElement).setAttribute('gs-id', `new-${Date.now()}-${template.type}`);
  });
}

onMounted(() => {
  setupDraggable();
});

function handleToggle() {
  emit('toggle');
}
</script>

<template>
  <aside
    ref="sidebarRef"
    class="sidebar relative"
    :class="{ collapsed }"
  >
    <!-- Toggle Button -->
    <button
      type="button"
      class="sidebar-toggle"
      @click="handleToggle"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-slate-400 transition-transform"
        :class="{ 'rotate-180': collapsed }"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>

    <!-- Header -->
    <div class="sidebar-header">
      <h2
        v-if="!collapsed"
        class="text-sm font-semibold text-slate-100"
      >
        Widget Library
      </h2>
      <p
        v-if="!collapsed"
        class="text-xs text-slate-500 mt-1"
      >
        Drag widgets to dashboard
      </p>
    </div>

    <!-- Widget List -->
    <div class="sidebar-content">
      <div
        v-for="widget in widgetTemplates"
        :key="widget.type"
        class="widget-library-item grid-stack-item"
        :data-type="widget.type"
        :gs-w="widget.defaultW"
        :gs-h="widget.defaultH"
      >
        <!-- Icon -->
        <div
          class="icon"
          :style="{ backgroundColor: `${widget.color}20` }"
        >
          <!-- Line Chart Icon -->
          <svg
            v-if="widget.icon === 'line'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="{ color: widget.color }"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>

          <!-- Bar Chart Icon -->
          <svg
            v-else-if="widget.icon === 'bar'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="{ color: widget.color }"
          >
            <line x1="12" x2="12" y1="20" y2="10" />
            <line x1="18" x2="18" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="14" />
          </svg>

          <!-- Gauge Icon -->
          <svg
            v-else-if="widget.icon === 'gauge'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="{ color: widget.color }"
          >
            <path d="m12 14 4-4" />
            <path d="M3.34 19a10 10 0 1 1 17.32 0" />
          </svg>

          <!-- Grid Icon -->
          <svg
            v-else-if="widget.icon === 'grid'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="{ color: widget.color }"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
          </svg>

          <!-- Hash Icon -->
          <svg
            v-else-if="widget.icon === 'hash'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="{ color: widget.color }"
          >
            <line x1="4" x2="20" y1="9" y2="9" />
            <line x1="4" x2="20" y1="15" y2="15" />
            <line x1="10" x2="8" y1="3" y2="21" />
            <line x1="16" x2="14" y1="3" y2="21" />
          </svg>

          <!-- Pie Icon -->
          <svg
            v-else-if="widget.icon === 'pie'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="{ color: widget.color }"
          >
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>

          <!-- Activity Icon -->
          <svg
            v-else-if="widget.icon === 'activity'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="{ color: widget.color }"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>

          <!-- Stacked Icon -->
          <svg
            v-else-if="widget.icon === 'stacked'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="{ color: widget.color }"
          >
            <path d="m2 12 8 5 8-5" />
            <path d="m2 17 8 5 8-5" />
            <path d="m2 7 8 5 8-5-8-5z" />
          </svg>
        </div>

        <!-- Info -->
        <div
          v-if="!collapsed"
          class="info"
        >
          <div class="name">{{ widget.name }}</div>
          <div class="desc">{{ widget.description }}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div
      v-if="!collapsed"
      class="p-4 border-t border-slate-800"
    >
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <span class="w-2 h-2 rounded-full bg-emerald-500" />
        <span>v2.4.1</span>
        <span class="ml-auto text-emerald-400">CONNECTED</span>
      </div>
    </div>
  </aside>
</template>
