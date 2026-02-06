/**
 * useDataAnalyzer.ts
 * 數據分析與圖表推薦 Composable
 */
import { ref, computed } from 'vue';
import type { WidgetType } from '@/types/dashboard';

/** 數據欄位類型 */
export type FieldType = 'numerical' | 'categorical' | 'temporal' | 'unknown';

/** 欄位分析結果 */
export interface FieldProfile {
  name: string;
  type: FieldType;
  sampleValues: (string | number | null)[];
  uniqueCount: number;
  nullCount: number;
  min?: number;
  max?: number;
  isPercentage?: boolean;
}

/** 圖表推薦結果 */
export interface ChartRecommendation {
  type: WidgetType;
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  xAxis?: string;
  yAxis?: string | string[];
  category?: string;
  value?: string;
  source?: string;
  target?: string;
  fields: string[];
}

/** 數據分析結果 */
export interface DataAnalysis {
  rowCount: number;
  fieldProfiles: FieldProfile[];
  recommendations: ChartRecommendation[];
  isTreeStructure?: boolean;
}

/**
 * 檢測是否為樹狀結構的 JSON
 */
function isTreeStructure(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // 檢查是否有名稱欄位
  const hasName = ['name', 'label', 'id', 'title', 'key', 'text'].some(
    (key) => typeof obj[key] === 'string'
  );

  // 檢查是否有子節點欄位（陣列類型）
  const childrenKey = ['children', 'nodes', 'items', 'branches', 'subtree'].find(
    (key) => Array.isArray(obj[key])
  );

  if (hasName && childrenKey) {
    const children = obj[childrenKey] as unknown[];
    // 檢查子節點是否也是樹狀結構
    if (children.length > 0) {
      // 至少有一個子節點也是物件（可能有自己的子節點）
      return children.some((child) => {
        if (typeof child === 'object' && child !== null) {
          const childObj = child as Record<string, unknown>;
          const childHasName = ['name', 'label', 'id', 'title', 'key', 'text'].some(
            (key) => typeof childObj[key] === 'string'
          );
          return childHasName;
        }
        return false;
      });
    }
  }

  return false;
}

/**
 * 計算樹的深度和節點數
 */
function analyzeTreeStructure(data: unknown): { depth: number; nodeCount: number; leafCount: number } {
  let nodeCount = 0;
  let leafCount = 0;
  let maxDepth = 0;

  function traverse(node: unknown, depth: number): void {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;

    nodeCount++;
    maxDepth = Math.max(maxDepth, depth);

    const obj = node as Record<string, unknown>;
    const childrenKey = ['children', 'nodes', 'items', 'branches', 'subtree'].find(
      (key) => Array.isArray(obj[key])
    );

    if (childrenKey) {
      const children = obj[childrenKey] as unknown[];
      if (children.length === 0) {
        leafCount++;
      } else {
        children.forEach((child) => traverse(child, depth + 1));
      }
    } else {
      leafCount++;
    }
  }

  traverse(data, 0);
  return { depth: maxDepth, nodeCount, leafCount };
}

/**
 * 檢測是否為盒鬚圖結構的 JSON
 * 格式: [{ name, type: 'boxPlot', data: [{ x, y: [min, Q1, median, Q3, max] }] }]
 * 或: [{ x, y: [5個數值] }]
 */
function isBoxPlotStructure(data: unknown): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  const firstItem = data[0] as Record<string, unknown>;

  // 格式 1: ApexCharts series 格式 { name, type: 'boxPlot', data: [...] }
  if (firstItem.type === 'boxPlot' && Array.isArray(firstItem.data)) {
    const boxData = firstItem.data as Record<string, unknown>[];
    if (boxData.length > 0) {
      const firstBox = boxData[0];
      // 檢查是否有 x 和 y（5個數值的陣列）
      if (firstBox && 'x' in firstBox && Array.isArray(firstBox.y)) {
        const yArr = firstBox.y as unknown[];
        return yArr.length === 5 && yArr.every(v => typeof v === 'number');
      }
    }
  }

  // 格式 2: 直接是 [{ x, y: [5個數值] }] 的陣列
  if ('x' in firstItem && Array.isArray(firstItem.y)) {
    const yArr = firstItem.y as unknown[];
    return yArr.length === 5 && yArr.every(v => typeof v === 'number');
  }

  return false;
}

/**
 * 分析盒鬚圖資料
 */
function analyzeBoxPlotStructure(data: unknown[]): { seriesName: string; categories: string[]; boxCount: number } {
  const firstItem = data[0] as Record<string, unknown>;

  // 格式 1: ApexCharts series 格式
  if (firstItem.type === 'boxPlot' && Array.isArray(firstItem.data)) {
    const boxData = firstItem.data as Record<string, unknown>[];
    const categories = boxData.map(item => String(item.x || ''));
    return {
      seriesName: String(firstItem.name || 'Box Plot'),
      categories,
      boxCount: boxData.length,
    };
  }

  // 格式 2: 直接的陣列
  const categories = data.map(item => {
    const obj = item as Record<string, unknown>;
    return String(obj.x || '');
  });
  return {
    seriesName: 'Box Plot',
    categories,
    boxCount: data.length,
  };
}

/**
 * 檢測是否為遺傳組成結構圖 (Admixture) 的 JSON
 * 格式 1: { samples: string[], clusters: [{ name, values: number[], color? }], groups?: [...] }
 * 格式 2: [{ name: 'Cluster X', data: number[] }] - ApexCharts series 格式
 */
function isAdmixtureStructure(data: unknown): boolean {
  // 格式 1: 物件格式 { samples, clusters }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.samples) && Array.isArray(obj.clusters)) {
      const samples = obj.samples as unknown[];
      const clusters = obj.clusters as unknown[];

      if (samples.length === 0 || !samples.every(s => typeof s === 'string')) {
        return false;
      }

      if (clusters.length === 0) {
        return false;
      }

      return clusters.every(cluster => {
        if (typeof cluster !== 'object' || cluster === null) return false;
        const c = cluster as Record<string, unknown>;
        return (
          typeof c.name === 'string' &&
          Array.isArray(c.values) &&
          (c.values as unknown[]).every(v => typeof v === 'number')
        );
      });
    }
  }

  // 格式 2: ApexCharts series 格式 [{ name: 'Cluster X', data: [...] }]
  if (Array.isArray(data) && data.length >= 2) {
    const items = data as Record<string, unknown>[];

    // 檢查是否所有項目都有 name 和 data
    const allHaveNameAndData = items.every(item => {
      if (typeof item !== 'object' || item === null) return false;
      return (
        typeof item.name === 'string' &&
        Array.isArray(item.data) &&
        (item.data as unknown[]).length > 0 &&
        (item.data as unknown[]).every(v => typeof v === 'number')
      );
    });

    if (!allHaveNameAndData) return false;

    // 檢查是否所有 data 長度相同
    const firstItem = items[0];
    if (!firstItem) return false;
    const firstDataLength = (firstItem.data as number[]).length;
    const allSameLength = items.every(item => (item.data as number[]).length === firstDataLength);

    if (!allSameLength) return false;

    // 檢查名稱是否包含 cluster 相關詞彙
    const hasClusterName = items.some(item =>
      String(item.name).toLowerCase().includes('cluster') ||
      String(item.name).toLowerCase().includes('群集') ||
      /^k\d+$/i.test(String(item.name))
    );

    // 檢查每個樣本的總和是否接近 1 或 100（表示這是比例數據）
    let isProportionData = true;
    for (let i = 0; i < firstDataLength; i++) {
      const sum = items.reduce((acc, item) => acc + ((item.data as number[])[i] || 0), 0);
      // 允許一些誤差
      if (!(Math.abs(sum - 1) < 0.15 || Math.abs(sum - 100) < 10)) {
        isProportionData = false;
        break;
      }
    }

    return hasClusterName || isProportionData;
  }

  return false;
}

/**
 * 分析遺傳組成結構圖資料
 */
function analyzeAdmixtureStructure(data: unknown): {
  sampleCount: number;
  clusterCount: number;
  clusterNames: string[];
  groupCount: number;
  isSeriesFormat: boolean;
} {
  // 格式 1: 物件格式 { samples, clusters }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.samples) && Array.isArray(obj.clusters)) {
      const samples = obj.samples as string[];
      const clusters = obj.clusters as { name: string; values: number[] }[];
      const groups = obj.groups as { name: string }[] | undefined;

      return {
        sampleCount: samples.length,
        clusterCount: clusters.length,
        clusterNames: clusters.map(c => c.name),
        groupCount: groups?.length || 0,
        isSeriesFormat: false,
      };
    }
  }

  // 格式 2: ApexCharts series 格式 [{ name, data }]
  if (Array.isArray(data)) {
    const items = data as { name: string; data: number[] }[];
    const firstDataLength = items[0]?.data?.length || 0;

    return {
      sampleCount: firstDataLength,
      clusterCount: items.length,
      clusterNames: items.map(item => item.name),
      groupCount: 0,
      isSeriesFormat: true,
    };
  }

  return {
    sampleCount: 0,
    clusterCount: 0,
    clusterNames: [],
    groupCount: 0,
    isSeriesFormat: false,
  };
}

/**
 * 偵測單一值的數據類型
 */
function detectValueType(value: unknown): FieldType {
  if (value === null || value === undefined || value === '') {
    return 'unknown';
  }

  // 數值型
  if (typeof value === 'number' && !isNaN(value)) {
    return 'numerical';
  }

  // 字串處理
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // 嘗試解析為數字
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      return 'numerical';
    }

    // 時間型偵測 - 多種格式
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,                    // 2024-01-15
      /^\d{4}\/\d{2}\/\d{2}$/,                  // 2024/01/15
      /^\d{2}:\d{2}(:\d{2})?$/,                 // 14:30 or 14:30:00
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,         // ISO format
      /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/,        // 2024-01-15 14:30
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i, // Month names
    ];

    for (const pattern of datePatterns) {
      if (pattern.test(trimmed)) {
        return 'temporal';
      }
    }

    // 嘗試 Date.parse (但要小心誤判)
    if (trimmed.length > 6) {
      const parsed = Date.parse(trimmed);
      if (!isNaN(parsed)) {
        // 額外檢查：確保不是純數字被誤解析
        if (!/^\d+$/.test(trimmed)) {
          return 'temporal';
        }
      }
    }

    // 其他都視為類別型
    return 'categorical';
  }

  // Date 物件
  if (value instanceof Date && !isNaN(value.getTime())) {
    return 'temporal';
  }

  return 'unknown';
}

/**
 * 分析欄位的數據類型（基於多筆樣本）
 */
function analyzeField(name: string, values: unknown[]): FieldProfile {
  const typeCount: Record<FieldType, number> = {
    numerical: 0,
    categorical: 0,
    temporal: 0,
    unknown: 0,
  };

  const validValues: (string | number)[] = [];
  let nullCount = 0;

  values.forEach((value) => {
    if (value === null || value === undefined || value === '') {
      nullCount++;
      return;
    }

    const type = detectValueType(value);
    typeCount[type]++;

    if (type !== 'unknown') {
      validValues.push(value as string | number);
    }
  });

  // 決定主要類型（取最多的）
  let dominantType: FieldType = 'unknown';
  let maxCount = 0;
  for (const [type, count] of Object.entries(typeCount)) {
    if (count > maxCount && type !== 'unknown') {
      maxCount = count;
      dominantType = type as FieldType;
    }
  }

  // 計算唯一值數量
  const uniqueValues = new Set(validValues.map(String));

  // 數值型額外分析
  let min: number | undefined;
  let max: number | undefined;
  let isPercentage = false;

  if (dominantType === 'numerical') {
    const numbers = validValues.map(Number).filter((n) => !isNaN(n));
    if (numbers.length > 0) {
      min = Math.min(...numbers);
      max = Math.max(...numbers);
      // 檢查是否為百分比（0-100 範圍或 0-1 範圍）
      isPercentage = (min >= 0 && max <= 100) || (min >= 0 && max <= 1);
    }
  }

  return {
    name,
    type: dominantType,
    sampleValues: validValues.slice(0, 5),
    uniqueCount: uniqueValues.size,
    nullCount,
    min,
    max,
    isPercentage,
  };
}

/**
 * 基於欄位分析結果生成圖表推薦
 */
function generateRecommendations(profiles: FieldProfile[]): ChartRecommendation[] {
  const recommendations: ChartRecommendation[] = [];

  const numericalFields = profiles.filter((p) => p.type === 'numerical');
  const categoricalFields = profiles.filter((p) => p.type === 'categorical');
  const temporalFields = profiles.filter((p) => p.type === 'temporal');

  // 1. 時間 + 數值 → 折線圖/面積圖
  if (temporalFields.length >= 1 && numericalFields.length >= 1) {
    const temporal = temporalFields[0]!;
    const numerical = numericalFields.slice(0, 3); // 最多取3個數值欄位

    recommendations.push({
      type: 'line',
      title: '趨勢分析',
      description: `追蹤 ${numerical.map((n) => n.name).join('、')} 在 ${temporal.name} 的變化`,
      confidence: 'high',
      xAxis: temporal.name,
      yAxis: numerical.map((n) => n.name),
      fields: [temporal.name, ...numerical.map((n) => n.name)],
    });

    if (numerical.length >= 1) {
      recommendations.push({
        type: 'area',
        title: '時間序列',
        description: `呈現 ${numerical[0]!.name} 隨時間的變化`,
        confidence: 'high',
        xAxis: temporal.name,
        yAxis: [numerical[0]!.name],
        fields: [temporal.name, numerical[0]!.name],
      });

      // 階梯線圖 - 適合數位訊號（開關狀態）
      recommendations.push({
        type: 'stepLine',
        title: '階梯線圖',
        description: `呈現 ${numerical[0]!.name} 在 ${temporal.name} 的開關狀態變化`,
        confidence: 'medium',
        xAxis: temporal.name,
        yAxis: [numerical[0]!.name],
        fields: [temporal.name, numerical[0]!.name],
      });
    }
  }

  // 2. 類別 + 數值 → 長條圖
  if (categoricalFields.length >= 1 && numericalFields.length >= 1) {
    const categorical = categoricalFields[0]!;
    const numerical = numericalFields[0]!;

    // 只有當類別數量合理時才推薦（<20）
    if (categorical.uniqueCount <= 20) {
      recommendations.push({
        type: 'bar',
        title: '類別比較',
        description: `比較不同 ${categorical.name} 的 ${numerical.name}`,
        confidence: categorical.uniqueCount <= 10 ? 'high' : 'medium',
        category: categorical.name,
        value: numerical.name,
        fields: [categorical.name, numerical.name],
      });

      // 如果類別少，也可以推薦圓餅圖
      if (categorical.uniqueCount <= 8) {
        recommendations.push({
          type: 'pie',
          title: '分佈',
          description: `呈現 ${categorical.name} 的 ${numerical.name} 分佈`,
          confidence: 'medium',
          category: categorical.name,
          value: numerical.name,
          fields: [categorical.name, numerical.name],
        });
      }
    }
  }

  // 3. 單一數值（百分比或指標）→ Gauge / Metric
  if (numericalFields.length >= 1) {
    const numerical = numericalFields[0]!;

    if (numerical.isPercentage || numerical.uniqueCount === 1) {
      recommendations.push({
        type: 'radialBar',
        title: '進度指標',
        description: `以儀表呈現 ${numerical.name}`,
        confidence: numerical.isPercentage ? 'high' : 'medium',
        value: numerical.name,
        fields: [numerical.name],
      });
    }

    recommendations.push({
      type: 'metric',
      title: '關鍵指標',
      description: `將 ${numerical.name} 作為關鍵指標`,
      confidence: 'medium',
      value: numerical.name,
      fields: [numerical.name],
    });
  }

  // 4. 如果有多個數值欄位 → 可以做堆疊圖
  if (numericalFields.length >= 2 && (temporalFields.length >= 1 || categoricalFields.length >= 1)) {
    const xField = temporalFields[0] || categoricalFields[0];
    if (xField) {
      recommendations.push({
        type: 'stackedBar',
        title: '堆疊比較',
        description: `比較不同 ${xField.name} 的多個數值欄位組成`,
        confidence: 'medium',
        xAxis: xField.name,
        yAxis: numericalFields.slice(0, 3).map((n) => n.name),
        fields: [xField.name, ...numericalFields.slice(0, 3).map((n) => n.name)],
      });
    }
  }

  // 5. 兩個數值欄位 → 散點圖/氣泡圖
  if (numericalFields.length >= 2) {
    const x = numericalFields[0]!;
    const y = numericalFields[1]!;

    recommendations.push({
      type: 'scatter',
      title: '相關性分析',
      description: `分析 ${x.name} 與 ${y.name} 的相關性`,
      confidence: 'medium',
      xAxis: x.name,
      yAxis: [y.name],
      fields: [x.name, y.name],
    });

    // 如果有三個以上數值欄位，推薦氣泡圖
    if (numericalFields.length >= 3) {
      recommendations.push({
        type: 'bubble',
        title: '氣泡圖',
        description: `以 ${x.name} (X軸)、${y.name} (Y軸) 和 ${numericalFields[2]!.name} (大小) 展示三維關係`,
        confidence: 'medium',
        xAxis: x.name,
        yAxis: [y.name, numericalFields[2]!.name],
        fields: [x.name, y.name, numericalFields[2]!.name],
      });
    }
  }

  // 6. 類別 + 數值 → 點圖
  if (categoricalFields.length >= 1 && numericalFields.length >= 1) {
    const categorical = categoricalFields[0]!;
    const numerical = numericalFields[0]!;

    if (categorical.uniqueCount >= 5 && categorical.uniqueCount <= 30) {
      recommendations.push({
        type: 'dotPlot',
        title: '點圖',
        description: `在不同 ${categorical.name} 上顯示 ${numerical.name} 的分散值`,
        confidence: 'low',
        xAxis: categorical.name,
        yAxis: [numerical.name],
        fields: [categorical.name, numerical.name],
      });
    }
  }

  // 7. 時間 + 類別 → 熱力圖
  if (temporalFields.length >= 1 && categoricalFields.length >= 1 && numericalFields.length >= 1) {
    const temporal = temporalFields[0]!;
    const categorical = categoricalFields[0]!;
    const numerical = numericalFields[0]!;
    
    recommendations.push({
      type: 'heatmap',
      title: '熱力圖',
      description: `根據 ${numerical.name} 顯示 ${temporal.name} 與 ${categorical.name} 的模式`,
      confidence: 'medium',
      xAxis: temporal.name,
      yAxis: [categorical.name],
      value: numerical.name,
      fields: [temporal.name, categorical.name, numerical.name],
    });
  }

  // 8. 類別 + 多數值 → 雷達圖
  if (categoricalFields.length >= 1 && numericalFields.length >= 2) {
    const categorical = categoricalFields[0]!;
    if (categorical.uniqueCount >= 3) {
      recommendations.push({
        type: 'radar',
        title: '雷達圖',
        description: `比較不同 ${categorical.name} 的多維度指標`,
        confidence: 'medium',
        xAxis: categorical.name,
        yAxis: numericalFields.slice(0, 4).map((n) => n.name),
        fields: [categorical.name, ...numericalFields.slice(0, 4).map((n) => n.name)],
      });
    }
  }

  // 9. 兩個類別 + 數值 → 桑基圖
  if (categoricalFields.length >= 2 && numericalFields.length >= 1) {
    const source = categoricalFields[0]!;
    const target = categoricalFields[1]!;
    const value = numericalFields[0]!;
    recommendations.push({
      type: 'sankey',
      title: '桑基圖',
      description: `呈現 ${source.name} 到 ${target.name} 的流向與權重`,
      confidence: 'medium',
      source: source.name,
      target: target.name,
      value: value.name,
      fields: [source.name, target.name, value.name],
    });
  }

  // 10. 類別階層 + 數值 → 樹狀圖
  if (categoricalFields.length >= 1 && numericalFields.length >= 1) {
    const category = categoricalFields[0]!;
    const value = numericalFields[0]!;
    recommendations.push({
      type: 'treemap',
      title: '樹狀圖',
      description: `以區塊大小呈現 ${category.name} 的 ${value.name} 佔比`,
      confidence: 'medium',
      category: category.name,
      value: value.name,
      fields: [category.name, value.name],
    });
  }

  // 11. 活動/日誌資料 → Activity Timeline
  const hasTimeAndText = temporalFields.length >= 1 && categoricalFields.length >= 1;
  if (hasTimeAndText) {
    recommendations.push({
      type: 'activity',
      title: '活動時間軸',
      description: '依時間順序呈現事件',
      confidence: 'low',
      fields: [temporalFields[0]!.name, categoricalFields[0]!.name],
    });
  }

  // 12. 表格資料 → DataGrid
  if (profiles.length >= 3) {
    recommendations.push({
      type: 'dataGrid',
      title: '資料表格',
      description: '以表格方式檢視全部資料',
      confidence: 'low',
      fields: profiles.slice(0, 6).map((p) => p.name),
    });
  }

  return recommendations;
}

/**
 * 解析 CSV 字串
 */
function parseCSV(csvString: string): Record<string, unknown>[] {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = (lines[0] ?? '').split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const data: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = (lines[i] ?? '').split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      let value: unknown = values[index];
      // 嘗試轉換為數字
      const num = Number(value);
      if (!isNaN(num) && value !== '') {
        value = num;
      }
      row[header] = value;
    });

    data.push(row);
  }

  return data;
}

/**
 * useDataAnalyzer Composable
 */
export function useDataAnalyzer() {
  const rawData = ref<Record<string, unknown>[]>([]);
  const analysis = ref<DataAnalysis | null>(null);
  const isAnalyzing = ref(false);
  const error = ref<string | null>(null);

  /**
   * 分析數據
   */
  function analyzeData(data: Record<string, unknown>[]): DataAnalysis {
    if (data.length === 0) {
      return {
        rowCount: 0,
        fieldProfiles: [],
        recommendations: [],
      };
    }

    // 取得所有欄位名稱
    const fieldNames = Object.keys(data[0] ?? {});

    // 分析每個欄位
    const fieldProfiles = fieldNames.map((name) => {
      const values = data.map((row) => row[name]);
      return analyzeField(name, values);
    });

    // 生成推薦
    const recommendations = generateRecommendations(fieldProfiles);

    return {
      rowCount: data.length,
      fieldProfiles,
      recommendations,
    };
  }

  /**
   * 載入 JSON 數據
   */
  function loadJSON(jsonData: unknown): void {
    isAnalyzing.value = true;
    error.value = null;

    try {
      // 首先檢查是否為盒鬚圖結構
      if (isBoxPlotStructure(jsonData)) {
        const boxInfo = analyzeBoxPlotStructure(jsonData as unknown[]);

        // 創建盒鬚圖的分析結果
        rawData.value = jsonData as Record<string, unknown>[];
        analysis.value = {
          rowCount: boxInfo.boxCount,
          fieldProfiles: [
            {
              name: 'x',
              type: 'categorical',
              sampleValues: boxInfo.categories.slice(0, 5),
              uniqueCount: boxInfo.boxCount,
              nullCount: 0,
            },
            {
              name: 'y',
              type: 'numerical',
              sampleValues: ['[min, Q1, median, Q3, max]'],
              uniqueCount: boxInfo.boxCount,
              nullCount: 0,
            },
          ],
          recommendations: [
            {
              type: 'boxPlot',
              title: '盒鬚圖',
              description: `${boxInfo.seriesName}（${boxInfo.boxCount} 個類別的統計分佈）`,
              confidence: 'high',
              fields: ['x', 'y'],
            },
            {
              type: 'bar',
              title: '長條圖',
              description: '以長條圖呈現各類別數據',
              confidence: 'low',
              fields: ['x', 'y'],
            },
          ],
        };
        return;
      }

      // 檢查是否為遺傳組成結構圖
      if (isAdmixtureStructure(jsonData)) {
        const admixtureInfo = analyzeAdmixtureStructure(jsonData as Record<string, unknown>);

        // 創建遺傳組成結構圖的分析結果
        rawData.value = [jsonData as Record<string, unknown>];
        analysis.value = {
          rowCount: admixtureInfo.sampleCount,
          fieldProfiles: [
            {
              name: 'samples',
              type: 'categorical',
              sampleValues: [`${admixtureInfo.sampleCount} samples`],
              uniqueCount: admixtureInfo.sampleCount,
              nullCount: 0,
            },
            {
              name: 'clusters',
              type: 'numerical',
              sampleValues: admixtureInfo.clusterNames.slice(0, 3),
              uniqueCount: admixtureInfo.clusterCount,
              nullCount: 0,
            },
          ],
          recommendations: [
            {
              type: 'admixture',
              title: '遺傳結構圖',
              description: `${admixtureInfo.sampleCount} 個樣本的 ${admixtureInfo.clusterCount} 個群集組成分析`,
              confidence: 'high',
              fields: ['samples', 'clusters'],
            },
            {
              type: 'stackedBar',
              title: '堆疊長條圖',
              description: '以堆疊長條圖呈現組成比例',
              confidence: 'medium',
              fields: ['samples', 'clusters'],
            },
          ],
        };
        return;
      }

      // 檢查是否為樹狀結構
      if (isTreeStructure(jsonData)) {
        const treeInfo = analyzeTreeStructure(jsonData);
        const obj = jsonData as Record<string, unknown>;

        // 獲取根節點名稱
        const nameKey = ['name', 'label', 'id', 'title'].find((k) => typeof obj[k] === 'string');
        const rootName = nameKey ? String(obj[nameKey]) : 'Root';

        // 創建樹狀結構的分析結果
        rawData.value = [jsonData as Record<string, unknown>];
        analysis.value = {
          rowCount: treeInfo.nodeCount,
          fieldProfiles: [
            {
              name: 'name',
              type: 'categorical',
              sampleValues: [rootName],
              uniqueCount: treeInfo.nodeCount,
              nullCount: 0,
            },
            {
              name: 'children',
              type: 'categorical',
              sampleValues: [`${treeInfo.leafCount} leaves`],
              uniqueCount: treeInfo.leafCount,
              nullCount: 0,
            },
          ],
          recommendations: [
            {
              type: 'phylogenetic',
              title: '系統發生樹',
              description: `以放射狀樹狀圖呈現階層結構（${treeInfo.nodeCount} 節點，深度 ${treeInfo.depth}）`,
              confidence: 'high',
              fields: ['name', 'children'],
            },
            {
              type: 'treemap',
              title: '樹狀圖',
              description: `以區塊方式呈現階層結構`,
              confidence: 'medium',
              fields: ['name', 'children'],
            },
          ],
          isTreeStructure: true,
        };
        return;
      }

      let data: Record<string, unknown>[];

      if (Array.isArray(jsonData)) {
        data = jsonData as Record<string, unknown>[];
      } else if (typeof jsonData === 'object' && jsonData !== null) {
        // 嘗試找到數組屬性
        const arrayProp = Object.values(jsonData).find(Array.isArray);
        if (arrayProp) {
          data = arrayProp as Record<string, unknown>[];
        } else {
          data = [jsonData as Record<string, unknown>];
        }
      } else {
        throw new Error('Invalid JSON format');
      }

      rawData.value = data;
      analysis.value = analyzeData(data);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to parse JSON';
    } finally {
      isAnalyzing.value = false;
    }
  }

  /**
   * 載入 CSV 數據
   */
  function loadCSV(csvString: string): void {
    isAnalyzing.value = true;
    error.value = null;

    try {
      const data = parseCSV(csvString);
      if (data.length === 0) {
        throw new Error('No data found in CSV');
      }

      rawData.value = data;
      analysis.value = analyzeData(data);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to parse CSV';
    } finally {
      isAnalyzing.value = false;
    }
  }

  /**
   * 從檔案載入數據
   */
  async function loadFile(file: File): Promise<void> {
    isAnalyzing.value = true;
    error.value = null;

    try {
      const text = await file.text();
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        const json = JSON.parse(text);
        loadJSON(json);
      } else if (fileName.endsWith('.csv')) {
        loadCSV(text);
      } else {
        // 嘗試自動偵測
        try {
          const json = JSON.parse(text);
          loadJSON(json);
        } catch {
          loadCSV(text);
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to read file';
      isAnalyzing.value = false;
    }
  }

  /**
   * 取得推薦的圖表清單
   */
  const suggestedCharts = computed(() => {
    return analysis.value?.recommendations || [];
  });

  /**
   * 取得欄位分析結果
   */
  const fieldProfiles = computed(() => {
    return analysis.value?.fieldProfiles || [];
  });

  /**
   * 清除數據
   */
  function clearData(): void {
    rawData.value = [];
    analysis.value = null;
    error.value = null;
  }

  return {
    rawData,
    analysis,
    isAnalyzing,
    error,
    loadJSON,
    loadCSV,
    loadFile,
    analyzeData,
    suggestedCharts,
    fieldProfiles,
    clearData,
  };
}