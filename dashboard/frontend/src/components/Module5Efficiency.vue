<template>
  <div class="module">
    <h3 class="module-title">⚡ 效率响应度（分区域雷达图）</h3>
    <div class="chart-wrap" ref="radarContainer"></div>
    <div class="insight">
      <span>最优区域：<span style="color:#1EC96B;font-weight:700">{{ bestRegion.name }}（{{ bestRegion.score }}分）</span></span>
      <span>最弱区域：<span style="color:#F0473C;font-weight:700">{{ worstRegion.name }}（{{ worstRegion.score }}分）</span></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { ProvinceData } from '../api'

const props = defineProps<{
  provinces: ProvinceData[]
  efficiencyRanking: { rank: number; name: string; efficiency: number; efficiencyChangeRate: number | null; direction: string | null }[]
}>()

const radarContainer = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

// 七大区域分组
const REGIONS: Record<string, string[]> = {
  '东北': ['辽宁', '吉林', '黑龙江'],
  '华北': ['北京', '天津', '河北', '山西', '内蒙古'],
  '华东': ['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东'],
  '华中': ['河南', '湖北', '湖南'],
  '华南': ['广东', '广西', '海南'],
  '西南': ['重庆', '四川', '贵州', '云南', '西藏'],
  '西北': ['陕西', '甘肃', '青海', '宁夏', '新疆'],
}

const REGION_COLORS: Record<string, string> = {
  '东北': '#d9534f',
  '华北': '#f0ad4e',
  '华东': '#5bc0de',
  '华中': '#5cb85c',
  '华南': '#4caf50',
  '西南': '#9c27b0',
  '西北': '#ff9800',
}

// 维度名称
const DIMENSIONS = ['肥料利用率', '土壤酸化改善', '面源污染降幅', '板结修复', '节水效率', '养分留存率']

// 计算各省的6维度得分
function calcProvinceScores(prov: ProvinceData): number[] {
  const fTotal = prov.fertilizer
  const fN = prov.fertilizerN
  const fCompound = prov.fertilizerCompound
  const gYield = prov.grain
  const irrig = prov.irrigation
  const mach = prov.machinery

  const f21 = fTotal[2021] || 0, f24 = fTotal[2024] || 0
  const n21 = fN[2021] || 0, n24 = fN[2024] || 0
  const comp21 = fCompound[2021] || 0, comp24 = fCompound[2024] || 0
  const g21 = gYield[2021] || 0, g24 = gYield[2024] || 0
  const ir21 = irrig[2021] || 0, ir24 = irrig[2024] || 0

  // 1. 肥料利用率 = efficiency (吨粮/吨肥)，归一化到0-100
  const eff = prov.efficiency || 0
  const score1 = Math.min(100, Math.max(0, eff / 5000))

  // 2. 土壤酸化改善 = 氮肥减量率
  const nReduction = n21 > 0 ? (n21 - n24) / n21 : 0
  const score2 = Math.min(100, Math.max(0, (nReduction + 0.1) * 200))

  // 3. 面源污染降幅 = 化肥总减量率
  const fertRed = f21 > 0 ? (f21 - f24) / f21 : 0
  const score3 = Math.min(100, Math.max(0, (fertRed + 0.1) * 200))

  // 4. 板结修复 = 复合肥占比提升
  const ratio21 = f21 > 0 ? comp21 / f21 : 0
  const ratio24 = f24 > 0 ? comp24 / f24 : 0
  const compImprove = ratio24 - ratio21
  const score4 = Math.min(100, Math.max(0, (compImprove + 0.1) * 300))

  // 5. 节水效率 = 灌溉效率变化率
  const irEff21 = ir21 > 0 ? g21 / ir21 : 0
  const irEff24 = ir24 > 0 ? g24 / ir24 : 0
  const irEffChange = irEff21 > 0 ? (irEff24 - irEff21) / irEff21 : 0
  const score5 = Math.min(100, Math.max(0, (irEffChange + 0.1) * 200))

  // 6. 养分留存率 = 复合肥占比(当前)
  const ratio = f24 > 0 ? comp24 / f24 : 0
  const score6 = Math.min(100, Math.max(0, ratio * 100))

  return [score1, score2, score3, score4, score5, score6]
}

// 按区域聚合得分
const regionScores = computed(() => {
  const results: Record<string, { scores: number[]; provinces: string[] }> = {}

  for (const [region, provNames] of Object.entries(REGIONS)) {
    const provList = provNames
      .map(n => props.provinces.find(p => p.name === n))
      .filter((p): p is ProvinceData => p !== undefined)

    if (provList.length === 0) continue

    const allScores = provList.map(p => calcProvinceScores(p))
    const avgScores = [0, 1, 2, 3, 4, 5].map(i =>
      allScores.reduce((s, sc) => s + sc[i], 0) / allScores.length
    )
    results[region] = { scores: avgScores, provinces: provList.map(p => p.name) }
  }

  return results
})

// 找最佳和最弱区域
const regionAverages = computed(() => {
  const avgs: Record<string, number> = {}
  for (const [region, data] of Object.entries(regionScores.value)) {
    avgs[region] = data.scores.reduce((a, b) => a + b, 0) / data.scores.length
  }
  return avgs
})

const bestRegion = computed(() => {
  const entries = Object.entries(regionAverages.value)
  if (entries.length === 0) return { name: '--', score: 0 }
  const sorted = entries.sort((a, b) => b[1] - a[1])
  return { name: sorted[0][0], score: Math.round(sorted[0][1] * 10) / 10 }
})

const worstRegion = computed(() => {
  const entries = Object.entries(regionAverages.value)
  if (entries.length === 0) return { name: '--', score: 0 }
  const sorted = entries.sort((a, b) => a[1] - b[1])
  return { name: sorted[0][0], score: Math.round(sorted[0][1] * 10) / 10 }
})

function buildRadarOption() {
  // 计算每个维度的实际最大值
  const maxValues = [0, 0, 0, 0, 0, 0]
  for (const data of Object.values(regionScores.value)) {
    data.scores.forEach((v, i) => {
      if (v > maxValues[i]) maxValues[i] = Math.ceil(v / 10) * 10 || 10
    })
  }
  const indicator = DIMENSIONS.map((d, i) => ({ name: d, max: maxValues[i] }))

  const series: any[] = Object.entries(regionScores.value).map(([region, data]) => ({
    name: region,
    type: 'radar',
    data: [{ value: data.scores.map(s => Math.round(s * 10) / 10) }],
    symbol: 'none',
    lineStyle: { width: 2, color: REGION_COLORS[region] },
    areaStyle: { color: REGION_COLORS[region], opacity: 0.08 },
    itemStyle: { color: REGION_COLORS[region] },
    emphasis: {
      lineStyle: { width: 3 },
      areaStyle: { opacity: 0.2 },
    },
  }))

  return {
    backgroundColor: 'transparent',
    legend: {
      data: Object.keys(regionScores.value),
      top: 0,
      right: 0,
      textStyle: { color: '#000', fontSize: 8 },
      icon: 'circle',
      itemWidth: 6,
      itemHeight: 6,
    },
    radar: {
      indicator,
      center: ['50%', '55%'],
      radius: '80%',
      axisName: {
        color: '#4A3528',
        fontSize: 10,
        fontWeight: 600,
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(139,196,161,0.02)', 'rgba(139,196,161,0.06)'],
        },
      },
      axisLine: { lineStyle: { color: 'rgba(139,196,161,0.2)' } },
      splitLine: { lineStyle: { color: 'rgba(139,196,161,0.15)' } },
    },
    series,
  }
}

onMounted(() => {
  if (!radarContainer.value) return
  chart = echarts.init(radarContainer.value)
  chart.setOption(buildRadarOption())
})

onUnmounted(() => { chart?.dispose() })
</script>

<style scoped>
.module { display: flex; flex-direction: column; height: 100%; }
.module-title { font-family: 'Noto Serif SC', 'STSong', serif; font-size: 14px; font-weight: 600; color: #4A3528; padding-bottom: 6px; border-bottom: 1px solid rgba(139, 196, 161, 0.2); flex-shrink: 0; }
.chart-wrap { flex: 1; min-height: 0; }
.insight { display: flex; align-items: center; gap: 10px; padding-top: 4px; font-size: 12px; font-family: 'Noto Serif SC', 'Microsoft YaHei', serif; font-weight: 600; color: #4A3528; border-top: 1px solid rgba(30, 201, 107, 0.15); flex-shrink: 0; }
</style>
