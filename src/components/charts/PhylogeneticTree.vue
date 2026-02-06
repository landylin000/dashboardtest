<script setup lang="ts">
/**
 * PhylogeneticTree.vue
 * 系統發生樹 / 放射狀樹狀圖組件
 * 使用 D3.js 實現放射狀樹狀佈局
 */
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { select } from 'd3-selection';
import { hierarchy, tree } from 'd3-hierarchy';
import { linkRadial } from 'd3-shape';
import 'd3-transition';
import type { HierarchyPointNode, HierarchyPointLink } from 'd3-hierarchy';
import type { WidgetConfig } from '@/types/dashboard';

// 通用 JSON 物件類型
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

interface Props {
  data: JsonObject | null;
  config?: WidgetConfig;
}

const props = defineProps<Props>();

const containerRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const dimensions = ref({ width: 400, height: 400 });

// 動態顏色池
const colorPalette = [
  '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#a855f7', '#f43f5e',
  '#84cc16', '#0ea5e9', '#d946ef', '#eab308', '#64748b',
];

// 預設顏色名稱映射
const namedColors: Record<string, string> = {
  'red': '#ef4444',
  'orange': '#f97316',
  'blue': '#3b82f6',
  'green': '#22c55e',
  'purple': '#8b5cf6',
  'pink': '#ec4899',
  'cyan': '#06b6d4',
  'yellow': '#eab308',
  'teal': '#14b8a6',
  'indigo': '#6366f1',
};

// 動態群體顏色映射
const groupColorMap = new Map<string, string>();
let colorIndex = 0;

function getGroupColor(group: string): string {
  // 檢查是否在預定義的顏色中
  for (const [key, val] of Object.entries(namedColors)) {
    if (key === group) return val;
  }
  
  const cached = groupColorMap.get(group);
  if (cached) return cached;
  
  const index = colorIndex % colorPalette.length;
  const newColor = colorPalette[index] || '#64748b';
  colorIndex++;
  groupColorMap.set(group, newColor);
  return newColor;
}

// 獲取節點顏色
function getNodeColor(d: HierarchyPointNode<JsonObject>): string {
  const node = d.data;
  // 優先使用節點自身的 color 屬性
  const nodeColor = node.color;
  if (nodeColor && typeof nodeColor === 'string') {
    // 在預定義顏色中查找
    for (const [key, val] of Object.entries(namedColors)) {
      if (key === nodeColor) return val;
    }
    return nodeColor;
  }
  // 使用父節點名稱作為群體
  const group = d.parent?.data?.name;
  if (typeof group === 'string') {
    return getGroupColor(group);
  }
  return '#64748b';
}

// 生成默認數據
const defaultData: JsonObject = {
  name: '10902 SNPs',
  children: [
    {
      name: 'KonaBay',
      children: [
        { name: 'sample001' },
        { name: 'sample002' },
        { name: 'sample003' },
      ],
    },
    {
      name: 'SyaquaB',
      children: [
        { name: 'sample127', color: 'red' },
        { name: 'sample128', color: 'red' },
        { name: 'sample129', color: 'red' },
      ],
    },
    {
      name: 'CP',
      children: [
        { name: 'sample085', color: 'orange' },
        { name: 'sample086', color: 'orange' },
      ],
    },
  ],
};

// 處理數據
const treeData = computed(() => {
  return props.data || defaultData;
});

// 獲取根節點標籤
const centerLabel = computed(() => {
  const data = treeData.value;
  const nameKey = ['name', 'label', 'title', 'id'].find(k => typeof data[k] === 'string');
  return nameKey ? String(data[nameKey]) : 'Root';
});

// 獲取唯一群體列表
const uniqueGroups = computed(() => {
  const groups = new Set<string>();
  const data = treeData.value;

  function traverse(node: JsonObject) {
    const children = node.children as JsonArray | undefined;
    if (children && Array.isArray(children)) {
      // 如果有子節點，這個節點是群體
      const name = node.name;
      if (typeof name === 'string' && children.length > 0) {
        // 檢查子節點是否為葉節點
        const firstChild = children[0] as JsonObject;
        if (firstChild && !firstChild.children) {
          groups.add(name);
        }
      }
      children.forEach(child => {
        if (typeof child === 'object' && child !== null) {
          traverse(child as JsonObject);
        }
      });
    }
  }

  traverse(data);
  return Array.from(groups);
});

// 渲染樹狀圖
function renderTree() {
  if (!svgRef.value || !containerRef.value) return;

  // 清除現有內容
  select(svgRef.value).selectAll('*').remove();

  // 重置顏色映射
  groupColorMap.clear();
  colorIndex = 0;

  const width = dimensions.value.width;
  const height = dimensions.value.height;
  const radius = Math.min(width, height) / 2 - 80;

  const svg = select(svgRef.value)
    .attr('width', width)
    .attr('height', height);

  // 創建主要群組並置中
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  // 創建層次結構
  const root = hierarchy(treeData.value, (d: JsonObject) => {
    const children = d.children;
    return Array.isArray(children) ? children as JsonObject[] : undefined;
  });

  // 創建放射狀樹佈局
  const treeLayout = tree<JsonObject>()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

  // 計算節點位置
  const treeRoot = treeLayout(root);

  // 繪製背景圓環
  const ringGroup = g.append('g').attr('class', 'rings');
  for (let i = 1; i <= 3; i++) {
    ringGroup.append('circle')
      .attr('r', (radius * i) / 3)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(100, 116, 139, 0.15)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');
  }

  // 繪製連線
  const linkGroup = g.append('g')
    .attr('class', 'links')
    .attr('fill', 'none')
    .attr('stroke', 'rgba(100, 116, 139, 0.5)')
    .attr('stroke-width', 1.5);

  linkGroup.selectAll('path')
    .data(treeRoot.links())
    .join('path')
    .attr('d', linkRadial<HierarchyPointLink<JsonObject>, HierarchyPointNode<JsonObject>>()
      .angle((d: HierarchyPointNode<JsonObject>) => d.x)
      .radius((d: HierarchyPointNode<JsonObject>) => d.y) as unknown as string);

  // 繪製節點
  const nodeGroup = g.append('g').attr('class', 'nodes');

  const nodes = nodeGroup.selectAll('g')
    .data(treeRoot.descendants())
    .join('g')
    .attr('transform', (d: HierarchyPointNode<JsonObject>) => `rotate(${(d.x * 180 / Math.PI) - 90}) translate(${d.y},0)`);

  // 節點圓點
  nodes.append('circle')
    .attr('r', (d: HierarchyPointNode<JsonObject>) => d.children ? 4 : 6)
    .attr('fill', (d: HierarchyPointNode<JsonObject>) => d.children ? '#334155' : getNodeColor(d))
    .attr('stroke', (d: HierarchyPointNode<JsonObject>) => d.children ? 'none' : 'rgba(255,255,255,0.3)')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .on('mouseover', function(this: SVGCircleElement, _event: MouseEvent, d: HierarchyPointNode<JsonObject>) {
      select(this)
        .transition()
        .duration(200)
        .attr('r', d.children ? 6 : 8);
    })
    .on('mouseout', function(this: SVGCircleElement, _event: MouseEvent, d: HierarchyPointNode<JsonObject>) {
      select(this)
        .transition()
        .duration(200)
        .attr('r', d.children ? 4 : 6);
    });

  // 節點標籤（只顯示葉節點）
  nodes.filter((d: HierarchyPointNode<JsonObject>) => !d.children)
    .append('text')
    .attr('dy', '0.31em')
    .attr('x', (d: HierarchyPointNode<JsonObject>) => d.x < Math.PI ? 10 : -10)
    .attr('text-anchor', (d: HierarchyPointNode<JsonObject>) => d.x < Math.PI ? 'start' : 'end')
    .attr('transform', (d: HierarchyPointNode<JsonObject>) => d.x >= Math.PI ? 'rotate(180)' : '')
    .attr('fill', (d: HierarchyPointNode<JsonObject>) => getNodeColor(d))
    .attr('font-size', '9px')
    .attr('opacity', 0.9)
    .text((d: HierarchyPointNode<JsonObject>) => {
      const name = d.data.name;
      return typeof name === 'string' ? name : '';
    });

  // 中心標籤
  g.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#f1f5f9')
    .attr('font-size', '14px')
    .attr('font-weight', '600')
    .text(centerLabel.value);
}

// 監聽容器大小變化
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value) {
    // 初始尺寸
    dimensions.value = {
      width: containerRef.value.clientWidth || 400,
      height: containerRef.value.clientHeight || 400,
    };

    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        dimensions.value = {
          width: entry.contentRect.width || 400,
          height: entry.contentRect.height || 400,
        };
        renderTree();
      }
    });
    resizeObserver.observe(containerRef.value);

    // 初始渲染
    renderTree();
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

// 監聽數據變化
watch(() => props.data, () => {
  renderTree();
}, { deep: true });

// 監聽尺寸變化
watch(dimensions, () => {
  renderTree();
});
</script>

<template>
  <div ref="containerRef" class="phylogenetic-tree">
    <svg ref="svgRef" class="tree-svg"></svg>

    <!-- 圖例 -->
    <div class="legend">
      <div
        v-for="group in uniqueGroups"
        :key="group"
        class="legend-item"
      >
        <span
          class="legend-dot"
          :style="{ backgroundColor: getGroupColor(group) }"
        />
        <span class="legend-text">{{ group }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phylogenetic-tree {
  width: 100%;
  height: 100%;
  position: relative;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.tree-svg {
  overflow: visible;
  width: 100%;
  height: 100%;
}

.legend {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(15, 23, 42, 0.8);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(51, 65, 85, 0.5);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-text {
  font-size: 10px;
  color: #94a3b8;
}
</style>
