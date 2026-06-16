<template>
  <div class="module">
    <h3 class="module-title">效率响应度（分区域雷达图）</h3>
    <div class="chart-wrap" ref="radarContainer"></div>
    <!-- Custom legend row with toggle -->
    <div class="legend-row">
      <span
        v-for="r in regionList"
        :key="r.name"
        class="legend-item"
        :class="{ dimmed: !isSelected(r.name) }"
        @click="toggleRegion(r.name)"
      >
        <span class="legend-block" :style="{ background: isSelected(r.name) ? r.color : '#ccc' }"></span>
        <span class="legend-text" :style="{ color: isSelected(r.name) ? '#333' : '#bbb' }">{{ r.name }}</span>
      </span>
    </div>
    <div class="insight">
      <span>最优：<span style="color:#1EC96B;font-weight:700">{{ bestRegion.name }}（{{ bestRegion.score }}分）</span></span>
      <span>最弱：<span style="color:#F0473C;font-weight:700">{{ worstRegion.name }}（{{ worstRegion.score }}分）</span></span>
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
let resizeObserver: ResizeObserver | null = null

/* ======== Region groups ======== */
const REGIONS: Record<string, string[]> = {
  '东北': ['辽宁', '吉林', '黑龙江'],
  '华北': ['北京', '天津', '河北', '山西', '内蒙古'],
  '华东': ['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东'],
  '华中': ['河南', '湖北', '湖南'],
  '华南': ['广东', '广西', '海南'],
  '西南': ['重庆', '四川', '贵州', '云南', '西藏'],
  '西北': ['陕西', '甘肃', '青海', '宁夏', '新疆'],
}

/* 7 种鲜亮色彩，完全区分 */
const REGION_COLORS: Record<string, string> = {
  '东北': '#E8384F',  // 鲜红
  '华北': '#F5A623',  // 鲜橙
  '华东': '#2196F3',  // 亮蓝
  '华中': '#4CAF50',  // 翠绿
  '华南': '#00BCD4',  // 青蓝
  '西南': '#9C27B0',  // 亮紫
  '西北': '#FF5722',  // 深橙红
}

const regionList = Object.entries(REGION_COLORS).map(([name, color]) => ({ name, color }))

// ---- Legend toggle state ----
const selectedMap = ref<Record<string, boolean>>(
  Object.fromEntries(Object.keys(REGION_COLORS).map(r => [r, true]))
)

function isSelected(region: string): boolean {
  return selectedMap.value[region] ?? true
}

function toggleRegion(region: string) {
  if (!chart) return
  chart.dispatchAction({ type: 'legendToggleSelect', name: region })
}

/* ======== 6 dimensions ======== */
const DIMENSIONS = ['肥料利用率', '养分留存率', '节水效率', '面源污染降幅', '土壤酸化改善', '板结修复']

/** Per-province 0-100 scores for all 6 dimensions */
function calcProvinceScores(prov: ProvinceData): number[] {
  const fTotal = prov.fertilizer
  const fN = prov.fertilizerN
  const fCompound = prov.fertilizerCompound
  const gYield = prov.grain
  const irrig = prov.irrigation

  const f16 = fTotal[2016] || 0, f24 = fTotal[2024] || 0
  const n16 = fN[2016] || 0, n24 = fN[2024] || 0
  const comp16 = fCompound[2016] || 0, comp24 = fCompound[2024] || 0
  const g16 = gYield[2016] || 0, g24 = gYield[2024] || 0
  const ir16 = irrig[2016] || 0, ir24 = irrig[2024] || 0

  // 1. 肥料利用率 — 吨粮/吨肥，0-3000 → 0-100
  const eff = prov.efficiency || 0
  const s1 = Math.min(100, Math.max(0, (eff / 3000) * 100))

  // 2. 养分留存率 — 当前复合肥占比
  const ratio24 = f24 > 0 ? comp24 / f24 : 0
  const s2 = Math.min(100, Math.max(0, ratio24 * 200))

  // 3. 节水效率 — 灌溉效率提升率 (2016→2024)
  const irEff16 = ir16 > 0 && g16 > 0 ? g16 / ir16 : 0
  const irEff24 = ir24 > 0 && g24 > 0 ? g24 / ir24 : 0
  const irChange = irEff16 > 0 ? (irEff24 - irEff16) / irEff16 : 0
  const s3 = Math.min(100, Math.max(0, (irChange + 0.15) * 250))

  // 4. 面源污染降幅 — 化肥总减量率 (2016→2024)
  const fertRed = f16 > 0 ? (f16 - f24) / f16 : 0
  const s4 = Math.min(100, Math.max(0, fertRed * 200))

  // 5. 土壤酸化改善 — 氮肥减量率 (2016→2024)
  const nRed = n16 > 0 ? (n16 - n24) / n16 : 0
  const s5 = Math.min(100, Math.max(0, nRed * 200))

  // 6. 板结修复 — 复合肥占比提升 (2016→2024)
  const r16 = f16 > 0 ? comp16 / f16 : 0
  const r24 = f24 > 0 ? comp24 / f24 : 0
  const compUp = r24 - r16
  const s6 = Math.min(100, Math.max(0, (compUp + 0.05) * 400))

  return [s1, s2, s3, s4, s5, s6]
}

const regionScores = computed(() => {
  const results: Record<string, { scores: number[]; provinces: string[] }> = {}
  for (const [region, provNames] of Object.entries(REGIONS)) {
    const provList = provNames
      .map(n => props.provinces.find(p => p.name === n))
      .filter((p): p is ProvinceData => p !== undefined)
    if (provList.length === 0) continue
    const allScores = provList.map(p => calcProvinceScores(p))
    const avg = [0, 1, 2, 3, 4, 5].map(i =>
      allScores.reduce((s, sc) => s + sc[i], 0) / allScores.length
    )
    results[region] = { scores: avg, provinces: provList.map(p => p.name) }
  }
  return results
})

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
  // Uniform 0-100 for all dimensions
  const indicator = DIMENSIONS.map(d => ({ name: d, max: 100 }))

  const series: any[] = Object.entries(regionScores.value).map(([region, data]) => ({
    name: region,
    type: 'radar',
    data: [{ value: data.scores.map(s => Math.round(s * 10) / 10) }],
    symbol: 'circle',
    symbolSize: 3,
    lineStyle: { width: 2, color: REGION_COLORS[region] },
    areaStyle: { color: REGION_COLORS[region], opacity: 0.18 },
    itemStyle: { color: REGION_COLORS[region] },
    emphasis: {
      lineStyle: { width: 3 },
      areaStyle: { opacity: 0.30 },
    },
  }))

  return {
    backgroundColor: 'transparent',
    legend: { show: false },  // use custom legend below
    radar: {
      center: ['50%', '50%'],
      radius: '65%',
      indicator,
      axisName: {
        color: '#333',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 0,
        padding: [0, 0],
      },
      shape: 'polygon',
      splitNumber: 5,
      axisLabel: { show: true, fontSize: 9, color: '#888' },
      axisLine: { lineStyle: { color: 'rgba(0,0,0,0.12)' } },
      axisTick: { show: true, lineStyle: { color: 'rgba(0,0,0,0.15)' } },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      splitArea: {
        areaStyle: {
          color: ['rgba(139,196,161,0.02)', 'rgba(139,196,161,0.06)'],
        },
      },
      name: {
        textStyle: { color: '#333', fontSize: 11, fontWeight: 600 },
      },
    },
    series,
  }
}

onMounted(() => {
  if (!radarContainer.value) return
  chart = echarts.init(radarContainer.value)
  chart.setOption(buildRadarOption())

  // Sync legend toggle state back from chart
  chart.on('legendselectchanged', (params: any) => {
    selectedMap.value = { ...selectedMap.value, ...params.selected }
  })

  resizeObserver = new ResizeObserver(() => {
    chart?.resize()
  })
  resizeObserver.observe(radarContainer.value)
})

onUnmounted(() => { resizeObserver?.disconnect(); chart?.dispose() })
</script>

<style scoped>
.module { display: flex; flex-direction: column; height: 100%; }
.module-title {
  font-family: 'Noto Serif SC', 'STSong', serif;
  font-size: 16px; font-weight: 600; color: #000;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 196, 161, 0.2);
  flex-shrink: 0;
}
.chart-wrap { flex: 1; min-height: 0; }

/* ======== Custom legend row ======== */
.legend-row {
  display: flex; justify-content: center; flex-wrap: wrap;
  gap: 8px 12px; padding: 3px 0;
  flex-shrink: 0;
}
.legend-item {
  display: flex; align-items: center; gap: 4px;
  cursor: pointer; font-size: 10px; color: #333;
  transition: opacity 0.2s;
}
.legend-item:hover { opacity: 0.7; }
.legend-item.dimmed { opacity: 0.35; }
.legend-item.dimmed:hover { opacity: 0.55; }
.legend-block {
  width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0;
}
.legend-text { white-space: nowrap; }

.insight {
  display: flex; align-items: center; gap: 10px;
  padding-top: 3px; font-size: 11px;
  font-family: 'Noto Serif SC', 'Microsoft YaHei', serif;
  font-weight: 600; color: #4A3528;
  border-top: 1px solid rgba(30, 201, 107, 0.12);
  flex-shrink: 0;
}
</style>
