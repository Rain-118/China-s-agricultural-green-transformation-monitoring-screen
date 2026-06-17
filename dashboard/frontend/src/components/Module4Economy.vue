<template>
  <div class="module">
    <h3 class="module-title">经济响应度</h3>
    <div class="chart-full" ref="chartRef"></div>
    <div class="insight" v-if="filteredData.length">
      <span>亩均施肥量<span style="color:#2B9EED">↓{{ fertTrend }}</span></span>
      <span>亩均产值<span style="color:#1EC96B">↑{{ incomeTrend }}</span></span>
      <span class="insight-text">{{ insightText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { fetchNationalEconomy } from '../api'

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

const props = defineProps<{ selectedYear: number }>()

const chartData = ref<{ year: number; fertPerMu: number | null; incomePerMu: number | null }[]>([])
const allData = ref<{ year: number; fertPerMu: number | null; incomePerMu: number | null }[]>([])

const filteredData = computed(() => allData.value.filter(d => d.year <= props.selectedYear))

const fertTrend = computed(() => {
  const d = filteredData.value; if (d.length < 2) return ''
  const a = d[0].fertPerMu, b = d[d.length - 1].fertPerMu
  if (!a || !b) return ''
  return ((a - b) / a * 100).toFixed(1) + '%'
})

const incomeTrend = computed(() => {
  const d = filteredData.value; if (d.length < 2) return ''
  const a = d[0].incomePerMu, b = d[d.length - 1].incomePerMu
  if (!a || !b) return ''
  return ((b - a) / a * 100).toFixed(1) + '%'
})

const insightText = computed(() => {
  const d = filteredData.value; if (d.length < 2) return ''
  const first = d[0], last = d[d.length - 1]
  if (!first.fertPerMu || !last.fertPerMu || !first.incomePerMu || !last.incomePerMu) return ''
  const fertDrop = first.fertPerMu - last.fertPerMu
  const incRise = last.incomePerMu - first.incomePerMu
  return `化肥减量${fertDrop.toFixed(1)}kg/亩，产值反增${incRise}元/亩，绿色转型实现节本增效。`
})

function buildOption() {
  const filtered = allData.value.filter(d => d.year <= props.selectedYear)
  const years = filtered.map(d => d.year + '年')
  const fertData = filtered.map(d => d.fertPerMu)
  const incomeData = filtered.map(d => d.incomePerMu)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(30,201,107,0.3)', textStyle: { color: '#555555', fontSize: 12 },
      formatter: (ps: any) => {
        const y = ps[0].axisValue
        const f = ps.find((p: any) => p.seriesName.includes('施肥'))?.value ?? '--'
        const i = ps.find((p: any) => p.seriesName.includes('产值'))?.value ?? '--'
        return `<b>${y}</b><br/>亩均施肥量：${f} kg/亩<br/>亩均产值：${i} 元/亩`
      }
    },
    legend: { data: ['亩均施肥量 (kg/亩)', '亩均产值 (元/亩)'], top: 0, right: 2, textStyle: { color: '#4A3528', fontSize: 12 }, itemWidth: 9, itemHeight: 7 },
    grid: { top: 48, right: 45, bottom: 20, left: 48 },
    xAxis: { type: 'category', data: years, boundaryGap: true, axisLabel: { color: '#4A3528', fontSize: 12 }, axisLine: { lineStyle: { color: '#1EC96B' } }, axisTick: { show: false } },
    yAxis: [
      { type: 'value', name: 'kg/亩', nameTextStyle: { color: '#2B9EED', fontSize: 12 }, axisLabel: { color: '#4A3528', fontSize: 12, fontFamily: 'DIN Pro, Consolas, monospace' }, splitLine: { lineStyle: { color: 'rgba(30,201,107,0.06)' } } },
      { type: 'value', name: '元/亩', nameTextStyle: { color: '#1EC96B', fontSize: 12 }, axisLabel: { color: '#4A3528', fontSize: 12, fontFamily: 'DIN Pro, Consolas, monospace' }, splitLine: { show: false } }
    ],
    series: [
      { name: '亩均施肥量 (kg/亩)', type: 'bar', yAxisIndex: 0, data: fertData, itemStyle: { color: '#2B9EED', borderRadius: [1, 1, 0, 0] }, barMaxWidth: 10, emphasis: { focus: 'series' } },
      { name: '亩均产值 (元/亩)', type: 'bar', yAxisIndex: 1, data: incomeData, itemStyle: { color: '#1EC96B', borderRadius: [1, 1, 0, 0] }, barMaxWidth: 10, emphasis: { focus: 'series' } },
    ]
  }
}

onMounted(async () => {
  const rows = await fetchNationalEconomy()
  allData.value = rows.filter(r => r.fertPerMu !== null && r.incomePerMu !== null)
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    chart.setOption(buildOption())
  }
  resizeObserver = new ResizeObserver(() => {
    chart?.resize()
  })
  if (chartRef.value) resizeObserver.observe(chartRef.value)
})

watch(() => props.selectedYear, () => {
  if (chart) chart.setOption(buildOption())
})

onUnmounted(() => { resizeObserver?.disconnect(); chart?.dispose() })
</script>

<style scoped>
.module { display: flex; flex-direction: column; height: 100%; }
.module-title { font-family: 'Noto Serif SC', 'STSong', serif; font-size: 16px; font-weight: 600; color: #000; padding-bottom: 8px; border-bottom: 1px solid rgba(30, 201, 107, 0.2); flex-shrink: 0; }
.chart-full { flex: 1; min-height: 0; max-height: 260px; max-width: 100%; }
.insight { display: flex; align-items: center; gap: 10px; padding-top: 4px; font-size: 12px; font-family: 'Noto Serif SC', 'Microsoft YaHei', serif; font-weight: 600; color: #4A3528; border-top: 1px solid rgba(30, 201, 107, 0.15); flex-shrink: 0; }
.insight-text { margin-left: auto; color: #4A3528; font-style: italic; font-weight: 600; }
</style>
