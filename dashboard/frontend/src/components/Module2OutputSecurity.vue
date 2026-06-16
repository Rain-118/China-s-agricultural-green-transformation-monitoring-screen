<template>
  <div class="module">
    <h3 class="module-title">📊 产出保障响应度</h3>
    <div class="chart-full" ref="dualAxisChart"></div>
    <div class="insight">
      <span>化肥<span style="color:#F0473C">↓{{ natFertRate ?? '--' }}%</span></span>
      <span>粮食<span style="color:#1EC96B">↑{{ natGrainRate ?? '--' }}%</span></span>
      <span class="insight-text">{{ insightText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { ProvinceData } from '../api'

const props = defineProps<{
  nationalFert: { year: number; value: number }[]
  nationalGrain: { year: number; value: number }[]
  provinces: ProvinceData[]
}>()

const dualAxisChart = ref<HTMLDivElement>()
let dualChart: echarts.ECharts | null = null

const natFertRate = computed(() => {
  const d = props.nationalFert; if (d.length < 2) return null
  return Math.round(((d[0].value - d[d.length - 1].value) / d[0].value) * 10000) / 100
})
const natGrainRate = computed(() => {
  const d = props.nationalGrain; if (d.length < 2) return null
  return Math.round(((d[d.length - 1].value - d[0].value) / d[0].value) * 10000) / 100
})

const insightText = computed(() => {
  const danger = props.provinces.filter(p => p.responseLevel === 'none').map(p => p.name)
  const high = props.provinces.filter(p => p.responseLevel === 'high').length
  const normal = props.provinces.filter(p => p.responseLevel === 'normal').length
  const responding = high + normal
  if (danger.length > 0) return `⚠ 危险省份：${danger.slice(0, 4).join('、')}${danger.length > 4 ? '等' : ''}`
  if (responding >= 20) return `✅ ${responding}省实现减量增产双赢，粮食安全有保障。`
  return `减量不减产目标基本实现，${31 - responding}省需关注。`
})

function buildDualAxisOption() {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(30,201,107,0.3)', textStyle: { color: '#555555', fontSize: 12 } },
    legend: { data: ['化肥总量(万吨)', '粮食产量(万吨)'], top: 6, textStyle: { color: '#4A3528', fontSize: 11 } },
    grid: { top: 40, right: 60, bottom: 35, left: 55 },
    xAxis: {
      type: 'category', data: props.nationalFert.map(d => d.year + ''),
      axisLabel: { color: '#4A3528', fontSize: 10, interval: 0, rotate: 0 },
      axisLine: { lineStyle: { color: '#1EC96B' } },
      axisTick: { show: false },
    },
    yAxis: (() => {
      const fertVals = props.nationalFert.map(d => d.value)
      const grainVals = props.nationalGrain.map(d => d.value)
      const fMin = Math.min(...fertVals), fMax = Math.max(...fertVals)
      const gMin = Math.min(...grainVals), gMax = Math.max(...grainVals)
      const fPad = (fMax - fMin) * 0.08 || 50
      const gPad = (gMax - gMin) * 0.08 || 200
      return [
        {
          type: 'value', name: '化肥 (万吨)', min: fMin - fPad, max: fMax + fPad,
          nameTextStyle: { color: '#F0473C', fontSize: 10 },
          axisLabel: { color: '#4A3528', fontSize: 10, fontFamily: 'DIN Pro, Consolas, monospace' },
          splitLine: { lineStyle: { color: 'rgba(30,201,107,0.08)' } },
        },
        {
          type: 'value', name: '粮食 (万吨)', min: gMin - gPad, max: gMax + gPad,
          nameTextStyle: { color: '#1EC96B', fontSize: 10 },
          axisLabel: { color: '#4A3528', fontSize: 10, fontFamily: 'DIN Pro, Consolas, monospace', formatter: (v: number) => (v / 10000).toFixed(2) + '亿' },
          splitLine: { show: false },
        }
      ]
    })(),
    series: [
      {
        name: '化肥总量(万吨)', type: 'line', data: props.nationalFert.map(d => d.value), yAxisIndex: 0, smooth: true,
        lineStyle: { color: '#F0473C', width: 2.5 }, itemStyle: { color: '#F0473C' }, symbol: 'circle', symbolSize: 8,
        markLine: {
          silent: true, symbol: 'none', lineStyle: { color: '#F0473C', type: 'dashed', width: 1.5 },
          label: { color: '#F0473C', fontSize: 10, formatter: '↓ 减量' }, data: [{ type: 'max' }, { type: 'min' }]
        },
        markPoint: {
          symbol: 'pin', symbolSize: 36,
          data: [
            { type: 'max', name: '最高', itemStyle: { color: '#F0473C' }, label: { fontSize: 10 } },
            { type: 'min', name: '最低', itemStyle: { color: '#1EC96B' }, label: { fontSize: 10 } }
          ]
        }
      },
      {
        name: '粮食产量(万吨)', type: 'line', data: props.nationalGrain.map(d => d.value), yAxisIndex: 1, smooth: true,
        lineStyle: { color: '#1EC96B', width: 2.5 }, itemStyle: { color: '#1EC96B' }, symbol: 'diamond', symbolSize: 8,
        markLine: {
          silent: true, symbol: 'none', lineStyle: { color: '#1EC96B', type: 'dashed', width: 1.5 },
          label: { color: '#1EC96B', fontSize: 10, formatter: '↑ 增产' }, data: [{ type: 'min' }, { type: 'max' }]
        },
        markPoint: {
          symbol: 'pin', symbolSize: 36,
          data: [
            { type: 'min', name: '最低', itemStyle: { color: '#F0473C' }, label: { fontSize: 10 } },
            { type: 'max', name: '最高', itemStyle: { color: '#1EC96B' }, label: { fontSize: 10 } }
          ]
        }
      }
    ]
  }
}

onMounted(() => {
  if (dualAxisChart.value) {
    dualChart = echarts.init(dualAxisChart.value)
    dualChart.setOption(buildDualAxisOption())
  }
})
onUnmounted(() => { dualChart?.dispose() })
</script>

<style scoped>
.module { display: flex; flex-direction: column; height: 100%; }
.module-title { font-family: 'Noto Serif SC', 'STSong', serif; font-size: 14px; font-weight: 600; color: #4A3528; padding-bottom: 6px; border-bottom: 1px solid rgba(30, 201, 107, 0.2); flex-shrink: 0; }
.chart-full { flex: 1; min-height: 0; }
.insight { display: flex; align-items: center; gap: 10px; padding-top: 4px; font-size: 12px; font-family: 'Noto Serif SC', 'Microsoft YaHei', serif; font-weight: 600; color: #4A3528; border-top: 1px solid rgba(30, 201, 107, 0.15); flex-shrink: 0; }
.insight-text { margin-left: auto; color: #4A3528; font-style: italic; font-weight: 600; }
</style>
