<script setup lang="ts">
/**
 * SankeyChart.vue
 * 桑基圖組件 - 使用 D3.js
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import * as d3 from 'd3-selection';
import { sankey, sankeyLinkHorizontal, type SankeyGraph, type SankeyNode, type SankeyLink } from 'd3-sankey';
import type { SankeyData, WidgetConfig } from '@/types/dashboard';

interface Props {
  data: SankeyData | null;
  config?: WidgetConfig;
}

const props = defineProps<Props>();

const containerRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);

// D3 桑基圖節點和連結類型
interface D3SankeyNode extends SankeyNode<D3SankeyNode, D3SankeyLink> {
  name: string;
}

interface D3SankeyLink extends SankeyLink<D3SankeyNode, D3SankeyLink> {
  value: number;
}

function renderChart() {
  if (!props.data || !containerRef.value || !svgRef.value) return;

  const container = containerRef.value;
  const svg = d3.select(svgRef.value);
  
  // 清空現有內容
  svg.selectAll('*').remove();

  // 取得容器尺寸
  const width = container.clientWidth;
  const height = container.clientHeight;

  // 設置邊距
  const margin = { top: 10, right: 10, bottom: 10, left: 10 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // 建立主要群組
  const g = svg
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // 從數據中提取節點和連結
  const links = props.data.series[0]?.data || [];
  
  // 建立節點集合
  const nodeNames = new Set<string>();
  links.forEach(link => {
    nodeNames.add(link.from);
    nodeNames.add(link.to);
  });

  const nodes: D3SankeyNode[] = Array.from(nodeNames).map(name => ({ name } as D3SankeyNode));
  const nodeMap = new Map(nodes.map((node, i) => [node.name, i]));

  // 建立連結
  const d3Links: D3SankeyLink[] = links.map(link => ({
    source: nodeMap.get(link.from)!,
    target: nodeMap.get(link.to)!,
    value: link.value,
  } as D3SankeyLink));

  // 建立桑基圖佈局
  const sankeyLayout = sankey<D3SankeyNode, D3SankeyLink>()
    .nodeWidth(15)
    .nodePadding(10)
    .extent([[0, 0], [innerWidth, innerHeight]]);

  const graph: SankeyGraph<D3SankeyNode, D3SankeyLink> = {
    nodes,
    links: d3Links,
  };

  sankeyLayout(graph);

  // 顏色配置
  const colors = props.config?.colors || [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4',
    '#6366f1', '#a855f7', '#ef4444', '#f97316', '#84cc16', '#14b8a6'
  ];

  // 繪製連結
  g.append('g')
    .selectAll('path')
    .data(graph.links)
    .join('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke', (d, i) => colors[i % colors.length])
    .attr('stroke-width', (d) => Math.max(1, d.width || 0))
    .attr('fill', 'none')
    .attr('opacity', 0.5)
    .on('mouseover', function() {
      d3.select(this).attr('opacity', 0.8);
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.5);
    })
    .append('title')
    .text((d) => `${(d.source as D3SankeyNode).name} → ${(d.target as D3SankeyNode).name}\n${d.value}`);

  // 繪製節點
  const node = g.append('g')
    .selectAll('rect')
    .data(graph.nodes)
    .join('g');

  node.append('rect')
    .attr('x', (d) => d.x0!)
    .attr('y', (d) => d.y0!)
    .attr('height', (d) => d.y1! - d.y0!)
    .attr('width', (d) => d.x1! - d.x0!)
    .attr('fill', (d, i) => colors[i % colors.length])
    .attr('opacity', 0.8)
    .on('mouseover', function() {
      d3.select(this).attr('opacity', 1);
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.8);
    })
    .append('title')
    .text((d) => `${d.name}\n${d.value || 0}`);

  // 添加節點標籤
  node.append('text')
    .attr('x', (d) => (d.x0! < innerWidth / 2) ? d.x1! + 6 : d.x0! - 6)
    .attr('y', (d) => (d.y1! + d.y0!) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d) => (d.x0! < innerWidth / 2) ? 'start' : 'end')
    .attr('fill', '#94a3b8')
    .attr('font-size', '12px')
    .text((d) => d.name);
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  renderChart();
  
  // 監聽容器大小變化
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      renderChart();
    });
    resizeObserver.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

watch(
  () => props.data,
  () => {
    renderChart();
  },
  { deep: true }
);
</script>

<template>
  <div 
    ref="containerRef"
    class="h-full w-full"
  >
    <svg 
      ref="svgRef"
      class="w-full h-full"
    ></svg>
  </div>
</template>
