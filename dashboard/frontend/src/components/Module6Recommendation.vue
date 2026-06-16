<template>
  <div class="module">
    <!-- Response Dashboard Grid -->
    <div class="dashboard-grid">
      <div
        v-for="item in dashboardData"
        :key="item.name"
        class="province-block"
        :class="['level-' + item.responseLevel, { dimmed: !props.activeLevels.has(item.responseLevel) }]"
        :title="`${item.name}: 响应度${item.responseDegree.toFixed(2)} (${levelLabel(item.responseLevel)})`"
      >
        <span class="prov-name">{{ item.name }}</span>
        <span class="prov-value">{{ item.responseDegree.toFixed(2) }}</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProvinceData } from '../api'

const props = defineProps<{
  provinces: ProvinceData[]
  selectedYear: number
  activeLevels: Set<string>
}>()

const ALL_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]

interface DashboardItem {
  name: string
  responseDegree: number
  responseLevel: string
}

const dashboardData = computed<DashboardItem[]>(() => {
  const year = props.selectedYear

  if (year < 2016) {
    return props.provinces.map(p => ({
      name: p.name,
      responseDegree: 0,
      responseLevel: 'unknown',
    }))
  }

  // National totals for computing response degree
  const natTotals: Record<number, number> = {}
  for (const y of ALL_YEARS) {
    natTotals[y] = props.provinces.reduce((s, p) => s + ((p.fertilizer[y] || 0)), 0)
  }
  const natBase = natTotals[2016] || 1

  return props.provinces.map(p => {
    const fBaseline = p.fertilizer[2016] || 0
    const fTarget = p.fertilizer[year]

    let responseDegree: number
    if (fTarget === undefined || fTarget === null || fBaseline === 0) {
      responseDegree = 0
    } else {
      const provReduction = (fBaseline - fTarget) / fBaseline
      const natYear = natTotals[year] || natBase
      const natReduction = (natBase - natYear) / natBase
      responseDegree = natReduction > 0.001 ? provReduction / natReduction : 0
    }

    responseDegree = Math.max(0, Math.min(3, responseDegree))

    const responseLevel: string =
      responseDegree >= 1.5 ? 'high' :
      responseDegree >= 1.0 ? 'normal' :
      responseDegree >= 0.5 ? 'weak' :
      responseDegree > 0.05 ? 'none' : 'unknown'

    return { name: p.name, responseDegree: Math.round(responseDegree * 100) / 100, responseLevel }
  })
})

const levelCounts = computed(() => {
  const result = { high: 0, normal: 0, weak: 0, none: 0 }
  for (const p of dashboardData.value) {
    if (p.responseLevel === 'high') result.high++
    else if (p.responseLevel === 'normal') result.normal++
    else if (p.responseLevel === 'weak') result.weak++
    else if (p.responseLevel === 'none') result.none++
  }
  return result
})

function levelLabel(level: string) {
  const map: Record<string, string> = { high: '高度响应', normal: '正常', weak: '弱响应', none: '未响应' }
  return map[level] || '未知'
}

const responseRate = computed(() => {
  const total = dashboardData.value.length
  const high = levelCounts.value.high
  const normal = levelCounts.value.normal
  if (total === 0) return 0
  return Math.round((high + normal) / total * 100)
})
</script>

<style scoped>
.module { display: flex; flex-direction: column; height: 100%; background: transparent; border-radius: 8px; padding: 6px 8px; }

/* Dashboard Grid — 2 rows (16+15 provinces) */
.dashboard-grid {
  display: grid; grid-template-columns: repeat(16, 1fr); gap: 2px;
  padding: 3px 0; flex-shrink: 0;
}
.province-block {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2px 1px; border-radius: 3px; cursor: pointer; transition: transform 0.2s;
  border: 1px solid transparent;
}
.province-block:hover { transform: scale(1.05); z-index: 1; }
.level-high { background: rgba(30,230,80,0.50); border-color: rgba(30,230,80,0.6); }
.level-normal { background: rgba(43,168,255,0.50); border-color: rgba(43,168,255,0.55); }
.level-weak { background: rgba(255,190,50,0.50); border-color: rgba(255,190,50,0.55); }
.level-none { background: rgba(255,60,40,0.50); border-color: rgba(255,60,40,0.55); }
.prov-name { font-size: 10px; color: #000; font-weight: 700; line-height: 1.3; }
.prov-value { font-family: 'DIN Pro', 'Consolas', 'monospace'; font-size: 11px; font-weight: 700; color: #000; line-height: 1.3; }

.province-block.dimmed {
  opacity: 0.3;
  filter: grayscale(60%);
}
</style>
