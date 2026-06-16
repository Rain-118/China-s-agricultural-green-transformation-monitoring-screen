<template>
  <div class="module">
    <h3 class="module-title">替代机制响应度</h3>
    <div class="chart-full" ref="chartRef"></div>
    <div class="insight">
      <span>复合肥占比<span style="color:#1EC96B">↑ {{ compoundRatio }}%</span></span>
      <span>机械动力<span style="color:#2B9EED">↑ {{ topMechProvince }}</span></span>
      <span class="insight-text">{{ insightText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { ProvinceData } from '../api'

const props = defineProps<{
  fertStructure: { year: number; n: number; p: number; k: number; compound: number }[]
  provinces: ProvinceData[]
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const topMechProvince = computed(() => {
  const sorted = [...props.provinces].filter(p => p.machIncreaseRate !== null).sort((a, b) => (b.machIncreaseRate || 0) - (a.machIncreaseRate || 0))
  return sorted.length > 0 ? sorted[0].name : '--'
})

const compoundRatio = computed(() => {
  const d = props.fertStructure[props.fertStructure.length - 1]
  if (!d) return 0
  const total = d.n + d.p + d.k + d.compound
  return total > 0 ? Math.round(d.compound / total * 100) : 0
})

const insightText = computed(() => {
  const d = props.fertStructure
  if (d.length < 2) return ''
  const first = d[0], last = d[d.length - 1]
  const t1 = first.n + first.p + first.k + first.compound
  const tL = last.n + last.p + last.k + last.compound
  const r1 = t1 > 0 ? (first.compound / t1 * 100) : 0
  const rL = tL > 0 ? (last.compound / tL * 100) : 0
  return `复合肥占比从${r1.toFixed(1)}%升至${rL.toFixed(1)}%，结构优化推动减量。`
})

// National machinery total per year
const machTrend = computed(() => {
  const map: Record<number, number> = {}
  for (const p of props.provinces) {
    for (const [yr, val] of Object.entries(p.machinery)) {
      const y = Number(yr)
      map[y] = (map[y] || 0) + val
    }
  }
  return Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0])).map(([_, val]) => Math.round(val))
})

function buildOption() {
  const years = props.fertStructure.map(d => d.year + '年')

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderColor: 'rgba(30,201,107,0.3)',
      textStyle: { color: '#555555', fontSize: 12 },
    },
    legend: {
      data: ['氮肥N', '磷肥P', '钾肥K', '复合肥', '机械总动力'],
      bottom: 0,
      textStyle: { color: '#4A3528', fontSize: 10 },
    },
    grid: { top: 12, right: 55, bottom: 38, left: 50 },
    xAxis: {
      type: 'category',
      data: years,
      boundaryGap: false,
      axisLabel: { color: '#4A3528', fontSize: 10 },
      axisLine: { lineStyle: { color: '#1EC96B' } },
    },
    yAxis: (() => {
      // Left Y (肥料 stack): compute stacked totals per year
      const stackTotals = props.fertStructure.map(d => d.n + d.p + d.k + d.compound)
      const fMin = 0
      const fMax = Math.max(...stackTotals) * 1.08
      // Right Y (机械)
      const mVals = machTrend.value
      const mMin = mVals.length > 0 ? Math.min(...mVals) * 0.95 : 0
      const mMax = mVals.length > 0 ? Math.max(...mVals) * 1.05 : 120000
      return [
        {
          type: 'value',
          name: '万吨 (肥料)',
          min: fMin,
          max: fMax,
          nameTextStyle: { color: '#4A3528', fontSize: 10 },
          axisLabel: { color: '#4A3528', fontSize: 10, fontFamily: 'DIN Pro, Consolas, monospace' },
          splitLine: { lineStyle: { color: 'rgba(30,201,107,0.08)' } },
        },
        {
          type: 'value',
          name: '万千瓦 (机械)',
          min: mMin,
          max: mMax,
          nameTextStyle: { color: '#2B9EED', fontSize: 10 },
          axisLabel: { color: '#4A3528', fontSize: 10, fontFamily: 'DIN Pro, Consolas, monospace', formatter: (v: number) => (v / 10000).toFixed(1) + '亿' },
          splitLine: { show: false },
        }
      ]
    })(),
    series: [
      // Stacked area: fertilizer structure (left Y-axis)
      { name: '氮肥N', type: 'line', stack: 'fert', smooth: true, areaStyle: { opacity: 0.7 }, yAxisIndex: 0, data: props.fertStructure.map(d => d.n), itemStyle: { color: '#F0473C' }, lineStyle: { color: '#F0473C', width: 1 }, symbol: 'none', emphasis: { focus: 'series' } },
      { name: '磷肥P', type: 'line', stack: 'fert', smooth: true, areaStyle: { opacity: 0.7 }, yAxisIndex: 0, data: props.fertStructure.map(d => d.p), itemStyle: { color: '#F5B642' }, lineStyle: { color: '#F5B642', width: 1 }, symbol: 'none', emphasis: { focus: 'series' } },
      { name: '钾肥K', type: 'line', stack: 'fert', smooth: true, areaStyle: { opacity: 0.7 }, yAxisIndex: 0, data: props.fertStructure.map(d => d.k), itemStyle: { color: '#2B9EED' }, lineStyle: { color: '#2B9EED', width: 1 }, symbol: 'none', emphasis: { focus: 'series' } },
      { name: '复合肥', type: 'line', stack: 'fert', smooth: true, areaStyle: { opacity: 0.7 }, yAxisIndex: 0, data: props.fertStructure.map(d => d.compound), itemStyle: { color: '#1EC96B' }, lineStyle: { color: '#1EC96B', width: 1 }, symbol: 'none', emphasis: { focus: 'series' } },
      // Line: machinery (right Y-axis, above the area)
      {
        name: '机械总动力', type: 'line', yAxisIndex: 1, smooth: true,
        data: machTrend.value,
        lineStyle: { color: '#2B9EED', width: 3 },
        itemStyle: { color: '#2B9EED' },
        symbol: 'diamond', symbolSize: 10,
        z: 10,
        zlevel: 1,
      },
    ]
  }
}

onMounted(() => {
  if (chartRef.value) { chart = echarts.init(chartRef.value); chart.setOption(buildOption()) }
})
onUnmounted(() => { chart?.dispose() })
</script>

<style scoped>
.module { display: flex; flex-direction: column; height: 100%; }
.module-title { font-family: 'Noto Serif SC', 'STSong', serif; font-size: 14px; font-weight: 600; color: #4A3528; padding-bottom: 6px; border-bottom: 1px solid rgba(30, 201, 107, 0.2); flex-shrink: 0; }
.chart-full { flex: 1; min-height: 0; }
.insight { display: flex; align-items: center; gap: 10px; padding-top: 4px; font-size: 12px; font-family: 'Noto Serif SC', 'Microsoft YaHei', serif; font-weight: 600; color: #4A3528; border-top: 1px solid rgba(30, 201, 107, 0.15); flex-shrink: 0; }
.insight-text { margin-left: auto; color: #4A3528; font-style: italic; font-weight: 600; }
</style>
