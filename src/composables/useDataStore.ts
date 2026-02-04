/**
 * useDataStore.ts
 * 資料管理層 - 儲存多組匯入的 JSON 數據
 */
import { ref, computed, watch } from 'vue';

export interface DataSource {
  id: string;
  name: string;
  rows: Record<string, unknown>[];
  createdAt: number;
}

const STORAGE_KEY = 'dashboard-data-sources';

function loadFromStorage(): DataSource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DataSource[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

const dataSources = ref<DataSource[]>(loadFromStorage());

function generateId() {
  return `ds-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

function addDataSource(name: string, rows: Record<string, unknown>[]) {
  const id = generateId();
  dataSources.value.push({
    id,
    name,
    rows,
    createdAt: Date.now(),
  });
  return id;
}

function getDataSource(id?: string | null) {
  if (!id) return null;
  return dataSources.value.find((source) => source.id === id) || null;
}

function getDataKeys(id?: string | null) {
  const source = getDataSource(id);
  if (!source) return [];

  const keys = new Set<string>();
  source.rows.slice(0, 200).forEach((row) => {
    Object.keys(row || {}).forEach((key) => keys.add(key));
  });

  return Array.from(keys);
}

const dataSourceOptions = computed(() =>
  dataSources.value.map((source) => ({
    id: source.id,
    name: source.name,
    rowCount: source.rows.length,
  }))
);

export function useDataStore() {
  watch(
    () => dataSources.value,
    (value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    },
    { deep: true }
  );

  return {
    dataSources,
    dataSourceOptions,
    addDataSource,
    getDataSource,
    getDataKeys,
  };
}
