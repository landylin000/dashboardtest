<script setup lang="ts">
/**
 * DataUploader.vue
 * 數據上傳組件 - 支援 JSON/CSV 檔案拖放上傳
 */
import { ref, computed } from 'vue';
import { useDataAnalyzer } from '@/composables/useDataAnalyzer';
import type { ChartRecommendation } from '@/composables/useDataAnalyzer';

const emit = defineEmits<{
  'chart-selected': [recommendation: ChartRecommendation, data: Record<string, unknown>[], fileName: string];
  close: [];
}>();

const {
  rawData,
  analysis,
  isAnalyzing,
  error,
  loadFile,
  suggestedCharts,
  fieldProfiles,
  clearData,
} = useDataAnalyzer();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const fileName = ref<string>('');

// 是否有分析結果
const hasResults = computed(() => analysis.value !== null && analysis.value.rowCount > 0);

// 處理檔案選擇
async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    fileName.value = file.name;
    await loadFile(file);
  }
}

// 處理拖放
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

async function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;

  const file = event.dataTransfer?.files[0];
  if (file) {
    fileName.value = file.name;
    await loadFile(file);
  }
}

// 點擊上傳區域
function triggerFileInput() {
  fileInput.value?.click();
}

// 選擇推薦圖表
function selectChart(recommendation: ChartRecommendation) {
  emit('chart-selected', recommendation, rawData.value, fileName.value);
}

// 取得欄位類型圖示
function getTypeIcon(type: string): string {
  switch (type) {
    case 'numerical':
      return '#';
    case 'temporal':
      return '⏱';
    case 'categorical':
      return 'Aa';
    default:
      return '?';
  }
}

// 取得欄位類型顏色
function getTypeColor(type: string): string {
  switch (type) {
    case 'numerical':
      return 'bg-blue-500/20 text-blue-400';
    case 'temporal':
      return 'bg-purple-500/20 text-purple-400';
    case 'categorical':
      return 'bg-emerald-500/20 text-emerald-400';
    default:
      return 'bg-slate-500/20 text-slate-400';
  }
}

// 取得信心度顏色
function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'medium':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

function getConfidenceLabel(confidence: string): string {
  switch (confidence) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    default:
      return '低';
  }
}

// 取得圖表類型圖示
function getChartIcon(type: string): string {
  switch (type) {
    case 'line':
      return 'line';
    case 'area':
      return 'area';
    case 'bar':
      return 'bar';
    case 'stepLine':
      return 'stepline';
    case 'stackedBar':
      return 'stackedbar';
    case 'scatter':
      return 'scatter';
    case 'bubble':
      return 'bubble';
    case 'dotPlot':
      return 'dotplot';
    case 'radar':
      return 'radar';
    case 'heatmap':
      return 'heatmap';
    case 'treemap':
      return 'treemap';
    case 'sankey':
      return 'sankey';
    case 'pie':
      return 'pie';
    case 'radialBar':
      return 'gauge';
    case 'metric':
      return 'metric';
    case 'dataGrid':
      return 'grid';
    case 'activity':
      return 'activity';
    default:
      return 'chart';
  }
}

// 重置上傳
function resetUpload() {
  clearData();
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}
</script>

<template>
  <div class="data-uploader">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-slate-700">
      <h3 class="text-sm font-semibold text-slate-100">
        {{ hasResults ? '資料分析' : '上傳資料' }}
      </h3>
      <button
        type="button"
        class="p-1 text-slate-400 hover:text-slate-200 transition-colors"
        @click="emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>

    <div class="p-4">
      <!-- Upload Area -->
      <div
        v-if="!hasResults"
        class="upload-zone"
        :class="{ 'drag-over': isDragging }"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @click="triggerFileInput"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".json,.csv"
          class="hidden"
          @change="handleFileSelect"
        />

        <div v-if="isAnalyzing" class="flex flex-col items-center gap-3">
          <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span class="text-sm text-slate-400">正在分析資料...</span>
        </div>

        <div v-else class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
          </div>
          <div class="text-center">
            <p class="text-sm text-slate-200">
              將檔案拖曳至此或 <span class="text-blue-400">瀏覽</span>
            </p>
            <p class="text-xs text-slate-500 mt-1">
              支援 JSON 與 CSV
            </p>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"
      >
        {{ error }}
      </div>

      <!-- Analysis Results -->
      <div v-if="hasResults" class="space-y-4">
        <!-- Stats -->
        <div class="flex items-center gap-4 text-sm">
          <span class="text-slate-400">
            <strong class="text-slate-200">{{ analysis?.rowCount }}</strong> 筆
          </span>
          <span class="text-slate-400">
            <strong class="text-slate-200">{{ fieldProfiles.length }}</strong> 欄位
          </span>
          <button
            type="button"
            class="ml-auto text-xs text-slate-400 hover:text-slate-200"
            @click="resetUpload"
          >
            重新上傳
          </button>
        </div>

        <!-- Field Profiles -->
        <div class="space-y-2">
          <h4 class="text-xs font-medium text-slate-500 uppercase tracking-wider">
            偵測欄位
          </h4>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="field in fieldProfiles"
              :key="field.name"
              class="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
              :class="getTypeColor(field.type)"
            >
              <span class="font-mono">{{ getTypeIcon(field.type) }}</span>
              <span>{{ field.name }}</span>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        <div class="space-y-2">
          <h4 class="text-xs font-medium text-slate-500 uppercase tracking-wider">
            建議圖表
          </h4>
          <div class="space-y-2">
            <button
              v-for="rec in suggestedCharts"
              :key="`${rec.type}-${rec.title}`"
              type="button"
              class="w-full p-3 rounded-lg border text-left transition-all hover:bg-slate-800/50"
              :class="getConfidenceColor(rec.confidence)"
              @click="selectChart(rec)"
            >
              <div class="flex items-start gap-3">
                <!-- Chart Icon -->
                <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <!-- Line -->
                  <svg v-if="getChartIcon(rec.type) === 'line'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                  <!-- Area -->
                  <svg v-else-if="getChartIcon(rec.type) === 'area'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-400">
                    <path d="m2 12 8 5 8-5" />
                    <path d="m2 17 8 5 8-5" />
                    <path d="m2 7 8 5 8-5-8-5z" />
                  </svg>
                  <!-- Bar -->
                  <svg v-else-if="getChartIcon(rec.type) === 'bar'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-400">
                    <line x1="12" x2="12" y1="20" y2="10" />
                    <line x1="18" x2="18" y1="20" y2="4" />
                    <line x1="6" x2="6" y1="20" y2="14" />
                  </svg>
                  <!-- Step Line -->
                  <svg v-else-if="getChartIcon(rec.type) === 'stepline'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-400">
                    <path d="M3 3v18h18" />
                    <path d="m6 15 3 0 0-3 3 0 0-3 3 0 0-3 3 0 0 3" />
                  </svg>
                  <!-- Stacked Bar -->
                  <svg v-else-if="getChartIcon(rec.type) === 'stackedbar'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-fuchsia-400">
                    <rect x="5" y="10" width="2" height="10" />
                    <rect x="5" y="4" width="2" height="6" />
                    <rect x="10" y="8" width="2" height="12" />
                    <rect x="10" y="4" width="2" height="4" />
                    <rect x="15" y="6" width="2" height="14" />
                    <rect x="15" y="3" width="2" height="3" />
                  </svg>
                  <!-- Scatter -->
                  <svg v-else-if="getChartIcon(rec.type) === 'scatter'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-lime-400">
                    <circle cx="7" cy="7" r="1" fill="currentColor" />
                    <circle cx="14" cy="10" r="1" fill="currentColor" />
                    <circle cx="12" cy="17" r="1" fill="currentColor" />
                    <circle cx="18" cy="14" r="1" fill="currentColor" />
                    <circle cx="9" cy="14" r="1" fill="currentColor" />
                  </svg>
                  <!-- Bubble -->
                  <svg v-else-if="getChartIcon(rec.type) === 'bubble'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-rose-400">
                    <circle cx="6" cy="15" r="3" fill="currentColor" fill-opacity="0.3" />
                    <circle cx="15" cy="10" r="2.5" fill="currentColor" fill-opacity="0.3" />
                    <circle cx="18" cy="18" r="1.5" fill="currentColor" fill-opacity="0.3" />
                    <circle cx="10" cy="6" r="2" fill="currentColor" fill-opacity="0.3" />
                  </svg>
                  <!-- Dot Plot -->
                  <svg v-else-if="getChartIcon(rec.type) === 'dotplot'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sky-400">
                    <line x1="3" x2="21" y1="20" y2="20" />
                    <line x1="3" x2="3" y1="4" y2="20" />
                    <circle cx="7" cy="9" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                    <circle cx="17" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                  <!-- Radar -->
                  <svg v-else-if="getChartIcon(rec.type) === 'radar'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 3v18" />
                    <path d="M3 12h18" />
                    <path d="m5.5 5.5 13 13" />
                    <path d="m18.5 5.5-13 13" />
                  </svg>
                  <!-- Heatmap -->
                  <svg v-else-if="getChartIcon(rec.type) === 'heatmap'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-red-400">
                    <rect x="3" y="3" width="4" height="4" fill="currentColor" fill-opacity="0.3" />
                    <rect x="9" y="3" width="4" height="4" fill="currentColor" fill-opacity="0.6" />
                    <rect x="15" y="3" width="4" height="4" fill="currentColor" fill-opacity="0.9" />
                    <rect x="3" y="9" width="4" height="4" fill="currentColor" fill-opacity="0.5" />
                    <rect x="9" y="9" width="4" height="4" fill="currentColor" fill-opacity="0.7" />
                    <rect x="15" y="9" width="4" height="4" fill="currentColor" fill-opacity="0.4" />
                  </svg>
                  <!-- Treemap -->
                  <svg v-else-if="getChartIcon(rec.type) === 'treemap'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400">
                    <rect x="3" y="3" width="8" height="8" />
                    <rect x="13" y="3" width="8" height="5" />
                    <rect x="13" y="10" width="8" height="11" />
                    <rect x="3" y="13" width="8" height="8" />
                  </svg>
                  <!-- Sankey -->
                  <svg v-else-if="getChartIcon(rec.type) === 'sankey'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-400">
                    <path d="M4 5h4" />
                    <path d="M4 19h4" />
                    <path d="M16 12h4" />
                    <path d="M8 5c6 0 6 7 8 7" />
                    <path d="M8 19c6 0 6-7 8-7" />
                  </svg>
                  <!-- Pie -->
                  <svg v-else-if="getChartIcon(rec.type) === 'pie'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-pink-400">
                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                  </svg>
                  <!-- Gauge -->
                  <svg v-else-if="getChartIcon(rec.type) === 'gauge'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400">
                    <path d="m12 14 4-4" />
                    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
                  </svg>
                  <!-- Metric -->
                  <svg v-else-if="getChartIcon(rec.type) === 'metric'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400">
                    <line x1="4" x2="20" y1="9" y2="9" />
                    <line x1="4" x2="20" y1="15" y2="15" />
                    <line x1="10" x2="8" y1="3" y2="21" />
                    <line x1="16" x2="14" y1="3" y2="21" />
                  </svg>
                  <!-- Grid -->
                  <svg v-else-if="getChartIcon(rec.type) === 'grid'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-400">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M3 15h18" />
                    <path d="M9 3v18" />
                  </svg>
                  <!-- Activity -->
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-teal-400">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-slate-200">{{ rec.title }}</span>
                    <span
                      class="text-[10px] uppercase px-1.5 py-0.5 rounded"
                      :class="{
                        'bg-emerald-500/20 text-emerald-400': rec.confidence === 'high',
                        'bg-amber-500/20 text-amber-400': rec.confidence === 'medium',
                        'bg-slate-500/20 text-slate-400': rec.confidence === 'low',
                      }"
                    >
                      {{ getConfidenceLabel(rec.confidence) }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400 mt-0.5 truncate">
                    {{ rec.description }}
                  </p>
                  <div class="flex flex-wrap gap-1 mt-1.5">
                    <span
                      v-for="field in rec.fields"
                      :key="field"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400"
                    >
                      {{ field }}
                    </span>
                  </div>
                </div>

                <!-- Arrow -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500 flex-shrink-0">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-uploader {
  background: #0f172a;
  border-radius: 8px;
  border: 1px solid #1e293b;
  max-height: 80vh;
  overflow-y: auto;
}

.upload-zone {
  border: 2px dashed #334155;
  border-radius: 8px;
  padding: 32px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-zone:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.upload-zone.drag-over {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}
</style>