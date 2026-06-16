<template>
  <div class="module">
    <h3 class="module-title">
      中国各省份化肥减量响应度
      <span class="year-badge" :class="{ animating: isAnimating }">
        <span class="year-icon">{{ isAnimating ? '💥' : '📊' }}</span>
        {{ currentYear }}年
        <span class="year-label">{{ currentYear < 2016 ? '无数据' : currentYear < 2021 ? '启动期' : '加速期' }}</span>
      </span>
      <button class="replay-btn" :class="{ spinning: isAnimating }" @click="triggerShockwave" title="重新播放冲击波">
        ▶
      </button>
    </h3>
    <div class="chart-wrap" ref="mapContainer">
      <canvas
        ref="shockwaveCanvas"
        class="shockwave-canvas"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
    </div>
    <div class="insight">
      <span
        class="legend-tag"
        :class="{ active: activeLevels.has('high'), inactive: !activeLevels.has('high') }"
        @click="toggleLevel('high')"
      >
        <span class="insight-dot green"></span>高度响应 <b>{{ counts.high }}</b>省
      </span>
      <span
        class="legend-tag"
        :class="{ active: activeLevels.has('normal'), inactive: !activeLevels.has('normal') }"
        @click="toggleLevel('normal')"
      >
        <span class="insight-dot blue"></span>正常 <b>{{ counts.normal }}</b>省
      </span>
      <span
        class="legend-tag"
        :class="{ active: activeLevels.has('weak'), inactive: !activeLevels.has('weak') }"
        @click="toggleLevel('weak')"
      >
        <span class="insight-dot orange"></span>弱响应 <b>{{ counts.weak }}</b>省
      </span>
      <span
        class="legend-tag"
        :class="{ active: activeLevels.has('none'), inactive: !activeLevels.has('none') }"
        @click="toggleLevel('none')"
      >
        <span class="insight-dot red"></span>未响应 <b>{{ counts.none }}</b>省
      </span>
      <span class="insight-text">{{ insightText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { ProvinceData } from '../api'

const props = defineProps<{
  provinces: ProvinceData[]
  levelCounts: Record<string, number>
  selectedYear: number
}>()

const mapContainer = ref<HTMLDivElement>()
const shockwaveCanvas = ref<HTMLCanvasElement>()
const canvasWidth = ref(800)
const canvasHeight = ref(600)
let chart: echarts.ECharts | null = null
let geoJsonData: any = null

const currentYear = ref(props.selectedYear || 2024)
const BASELINE_YEAR = 2016
const isAnimating = ref(false)
let animFrameId = 0

/* ---- Legend interaction state ---- */
const activeLevels = ref<Set<string>>(new Set(['high', 'normal', 'weak', 'none']))

function toggleLevel(level: string) {
  if (activeLevels.value.has(level)) {
    // Don't allow deselecting all levels
    if (activeLevels.value.size <= 1) return
    activeLevels.value.delete(level)
  } else {
    activeLevels.value.add(level)
  }
  // Trigger reactivity by replacing the Set
  activeLevels.value = new Set(activeLevels.value)
  // Apply filter to map immediately
  applyLegendFilterToMap()
}

/** Apply current legend filter to map data without animation */
function applyLegendFilterToMap() {
  if (!chart) return
  const data = yearlyData.value
  const mapData = data.map(p => {
    const isActive = activeLevels.value.has(p.responseLevel)
    if (isActive) {
      const color = levelColors[p.responseLevel] || levelColors.unknown
      return {
        name: p.geoName,
        value: p.responseDegree,
        level: p.responseLevel,
        itemStyle: { areaColor: color, borderColor: 'rgba(74,53,40,0.35)', borderWidth: 1.2 },
      }
    } else {
      return {
        name: p.geoName,
        value: 0,
        level: p.responseLevel,
        itemStyle: { areaColor: '#E8E3DA', borderColor: 'rgba(180,175,165,0.3)', borderWidth: 0.5, opacity: 0.35 },
      }
    }
  })
  chart.setOption({ series: [{ data: mapData }] }, false)
}

/* ---- Province centroids (lon, lat) ---- */
const provinceCentroids: Record<string, [number, number]> = {
  '北京市': [116.4, 39.9], '天津市': [117.2, 39.1], '河北省': [114.5, 38.0],
  '山西省': [112.5, 37.9], '内蒙古自治区': [111.7, 40.8], '辽宁省': [123.4, 41.8],
  '吉林省': [125.3, 43.9], '黑龙江省': [126.6, 45.7], '上海市': [121.5, 31.2],
  '江苏省': [118.8, 32.1], '浙江省': [120.2, 29.2], '安徽省': [117.3, 31.8],
  '福建省': [119.3, 26.1], '江西省': [115.9, 27.6], '山东省': [117.0, 36.7],
  '河南省': [113.6, 34.8], '湖北省': [114.3, 30.6], '湖南省': [112.9, 27.6],
  '广东省': [113.3, 23.1], '广西壮族自治区': [108.3, 22.8], '海南省': [110.3, 19.0],
  '重庆市': [106.5, 29.6], '四川省': [104.1, 30.7], '贵州省': [106.7, 26.6],
  '云南省': [102.7, 25.0], '西藏自治区': [91.1, 29.7], '陕西省': [108.9, 34.3],
  '甘肃省': [103.8, 36.1], '青海省': [101.8, 36.6], '宁夏回族自治区': [106.3, 38.5],
  '新疆维吾尔自治区': [87.6, 43.8],
}
const nameMap: Record<string, string> = {
  '北京':'北京市','天津':'天津市','河北':'河北省','山西':'山西省',
  '内蒙古':'内蒙古自治区','辽宁':'辽宁省','吉林':'吉林省','黑龙江':'黑龙江省',
  '上海':'上海市','江苏':'江苏省','浙江':'浙江省','安徽':'安徽省',
  '福建':'福建省','江西':'江西省','山东':'山东省','河南':'河南省',
  '湖北':'湖北省','湖南':'湖南省','广东':'广东省','广西':'广西壮族自治区',
  '海南':'海南省','重庆':'重庆市','四川':'四川省','贵州':'贵州省',
  '云南':'云南省','西藏':'西藏自治区','陕西':'陕西省','甘肃':'甘肃省',
  '青海':'青海省','宁夏':'宁夏回族自治区','新疆':'新疆维吾尔自治区',
}
const levelColors: Record<string, string> = {
  high: '#1EC96B', normal: '#2B9EED', weak: '#F5B642', none: '#F0473C', unknown: '#C5B9A8'
}

/* ---- Computed yearly data ---- */
const counts = computed(() => {
  const result = { high: 0, normal: 0, weak: 0, none: 0 }
  for (const p of yearlyData.value) {
    if (p.responseLevel === 'high') result.high++
    else if (p.responseLevel === 'normal') result.normal++
    else if (p.responseLevel === 'weak') result.weak++
    else if (p.responseLevel === 'none') result.none++
  }
  return result
})

// Compute yearly response degrees from existing province data
interface YearlyProvince {
  geoName: string
  shortName: string
  responseDegree: number
  responseLevel: string
  reachDelay: number // seconds for wave to reach this province
}

const ALL_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]

const yearlyData = computed(() => {
  const year = currentYear.value
  const provData: YearlyProvince[] = []

  if (year < 2016) {
    // Pre-data: all neutral
    for (const p of props.provinces) {
      const geoName = nameMap[p.name] || p.name
      provData.push({ geoName, shortName: p.name, responseDegree: 0, responseLevel: 'unknown', reachDelay: 0 })
    }
    return computeDelays(provData)
  }

  // National totals for all years (2016 baseline)
  const natTotals: Record<number, number> = {}
  for (const y of ALL_YEARS) {
    natTotals[y] = props.provinces.reduce((s, p) => s + ((p.fertilizer[y] || 0)), 0)
  }
  const natBase = natTotals[2016] || 1

  for (const p of props.provinces) {
    const geoName = nameMap[p.name] || p.name
    const fBaseline = p.fertilizer[2016] || 0
    const fTarget = p.fertilizer[year]

    let responseDegree: number
    if (fTarget === undefined || fTarget === null || fBaseline === 0) {
      responseDegree = 0
    } else {
      // Province reduction rate from 2016 to selected year
      const provReduction = (fBaseline - fTarget) / fBaseline
      // National reduction rate from 2016 to selected year
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

    provData.push({ geoName, shortName: p.name, responseDegree, responseLevel, reachDelay: 0 })
  }

  return computeDelays(provData)
})

/** Compute wave reach delays based on distance from Beijing */
function computeDelays(provData: YearlyProvince[]): YearlyProvince[] {
  const beijingCenter: [number, number] = [116.4, 39.9]
  let maxDist = 0
  const distances = provData.map(p => {
    const ctr = provinceCentroids[p.geoName] || beijingCenter
    const dx = ctr[0] - beijingCenter[0]
    const dy = ctr[1] - beijingCenter[1]
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > maxDist) maxDist = dist
    return dist
  })
  for (let i = 0; i < provData.length; i++) {
    provData[i].reachDelay = maxDist > 0 ? (distances[i] / maxDist) * 2.5 : 0
  }
  const bjIdx = provData.findIndex(p => p.geoName === '北京市')
  if (bjIdx >= 0) provData[bjIdx].reachDelay = 0
  return provData
}

/* ---- Insight text (dynamic per year) ---- */
const reachedCount = ref(0)
const insightText = computed(() => {
  const y = currentYear.value
  if (y < 2016) return `2015年：零增长行动方案发布，吹响化肥减量号角（暂无分省数据）`
  if (y < 2021) return `${y}年：化肥减量启动期，各省响应正在逐步形成`
  const responding = counts.value.high + counts.value.normal
  if (responding >= 20) return `截至${y}年，全国${responding}省响应度≥1.0，减量增效态势良好。`
  if (counts.value.none > 10) return `⚠ 截至${y}年，${counts.value.none}省未响应，需加大推动力度。`
  return `截至${y}年，${responding}/${props.provinces.length}省响应度高于全国均值。`
})


/* ---- Map setup ---- */
function buildMapOption(geoJson: any) {
  echarts.registerMap('china', geoJson)
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: 'rgba(30,201,107,0.5)',
      borderWidth: 1,
      textStyle: { color: '#4A3528', fontSize: 13, fontWeight: 500 },
      extraCssText: 'border-radius:8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 10px 14px;',
      formatter: (p: any) => {
        if (!p.data || p.data.value === undefined) return `<b>${p.name}</b>`
        const val = p.data.value
        const level = p.data.level || 'unknown'
        const lvlMap: Record<string,string> = { high:'🟢 高度响应', normal:'🔵 正常', weak:'🟠 弱响应', none:'🔴 未响应', unknown:'⚪ 待激活' }
        const lvlColor: Record<string,string> = { high:'#1EC96B', normal:'#2B9EED', weak:'#F5B642', none:'#F0473C', unknown:'#C5B9A8' }
        return `<div style="font-size:15px;font-weight:700;margin-bottom:6px">${p.name}</div>
          <div style="line-height:1.8;font-size:12px">
            响应度：<b style="color:${lvlColor[level]}">${typeof val === 'number' ? val.toFixed(2) : '--'}</b><br/>
            等级：<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:${lvlColor[level]}22;color:${lvlColor[level]};font-weight:600;font-size:11px">${lvlMap[level] || '--'}</span>
          </div>`
      }
    },
    visualMap: {
      min: 0, max: 2, left: 8, bottom: 8,
      text: ['高响应', '低响应'], textStyle: { color: '#4A3528', fontSize: 10 },
      inRange: { color: ['#F0473C', '#F5B642', '#2B9EED', '#1EC96B'] },
      calculable: false, show: false,
    },
    series: [{
      type: 'map', map: 'china', roam: true, zoom: 1.4,
      scaleLimit: { min: 0.8, max: 8 },
      top: '20%', left: 'center', width: 'auto', height: 'auto',
      label: { show: false },
      itemStyle: {
        borderColor: 'rgba(74,53,40,0.35)',
        borderWidth: 1.2,
        areaColor: '#F0EBE3',
        shadowBlur: 0,
        shadowColor: 'transparent',
      },
      emphasis: {
        scale: 1.3,
        label: { show: true, color: '#4A3528', fontSize: 13, fontWeight: 'bold' },
        itemStyle: {
          borderColor: '#F5B642', borderWidth: 3.5,
          shadowBlur: 20, shadowColor: 'rgba(245,182,66,0.5)',
          areaColor: null,
        },
      },
      select: { disabled: true },
      data: yearlyData.value.map(p => ({
        name: p.geoName,
        value: 0,
        level: 'unknown',
        itemStyle: { areaColor: '#F0EBE3' },
      })),
      nameMap: {},
      animationDurationUpdate: 400,
      animationEasingUpdate: 'cubicOut',
    }]
  }
}

/* ---- Shockwave Animation ---- */
function triggerShockwave() {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (!chart || !shockwaveCanvas.value || !mapContainer.value) return

  const canvas = shockwaveCanvas.value
  const container = mapContainer.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // Non-null binding for TS closure narrowing
  const c = ctx

  // Resize canvas to container
  const rect = container.getBoundingClientRect()
  const W = rect.width
  const H = rect.height
  canvas.width = W * window.devicePixelRatio
  canvas.height = H * window.devicePixelRatio
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  c.scale(window.devicePixelRatio, window.devicePixelRatio)
  canvasWidth.value = W
  canvasHeight.value = H

  // Reset map to neutral (respecting legend filter)
  if (chart) {
    chart.setOption({
      series: [{
        data: yearlyData.value.map(p => {
          const levelActive = activeLevels.value.has(p.responseLevel)
          return {
            name: p.geoName,
            value: 0,
            level: levelActive ? 'unknown' : p.responseLevel,
            itemStyle: levelActive
              ? { areaColor: '#F0EBE3' }
              : { areaColor: '#E8E3DA', borderColor: 'rgba(180,175,165,0.3)', borderWidth: 0.5, opacity: 0.35 },
          }
        })
      }]
    })
  }

  // ---- Mercator projection to compute pixel positions from GeoJSON bounds ----
  function mercatorY(lat: number): number {
    const rad = lat * Math.PI / 180
    return Math.log(Math.tan(Math.PI / 4 + rad / 2))
  }

  // China bounds and canvas margins (match ECharts map zoom=1.4, centered)
  const CHINA_BOUNDS = { minLng: 70, maxLng: 140, minLat: 15, maxLat: 55 }
  const Y_TOP = mercatorY(CHINA_BOUNDS.maxLat)
  const Y_BOT = mercatorY(CHINA_BOUNDS.minLat)
  const X_LEFT = CHINA_BOUNDS.minLng
  const X_RIGHT = CHINA_BOUNDS.maxLng
  const xScale = W / (X_RIGHT - X_LEFT)
  const yScale = H / (Y_TOP - Y_BOT)

  function toPixel(lng: number, lat: number): [number, number] {
    const x = (lng - X_LEFT) * xScale
    const y = (Y_TOP - mercatorY(lat)) * yScale
    return [x, y]
  }

  const origin = toPixel(116.4, 39.9)

  // Calculate pixel positions for all provinces
  let maxPixelDist = 0
  const pixelPositions: [number, number][] = yearlyData.value.map(p => {
    const c = provinceCentroids[p.geoName] || [116.4, 39.9]
    const px = toPixel(c[0], c[1])
    const dx = px[0] - origin[0]
    const dy = px[1] - origin[1]
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > maxPixelDist) maxPixelDist = dist
    return px
  })
  if (maxPixelDist === 0) maxPixelDist = Math.max(W, H) * 0.6

  isAnimating.value = true
  const ANIM_DURATION = 3200 // ms
  const MAX_WAVE_RADIUS = maxPixelDist * 1.3
  const startTime = performance.now()
  let lastRevealTime: Record<string, number> = {}

  // Particles
  const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }[] = []
  function spawnParticles(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.5 + Math.random() * 2
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, maxLife: 30 + Math.random() * 30,
        size: 1 + Math.random() * 2.5,
      })
    }
  }

  function animate(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / ANIM_DURATION)
    // Ease-out cubic: fast start, slow end
    const eased = 1 - Math.pow(1 - progress, 3)
    const waveRadius = eased * MAX_WAVE_RADIUS

    // Clear canvas
    c.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

    // ---- Draw origin pulse ----
    const pulseAlpha = 0.4 + Math.sin(elapsed * 0.008) * 0.3
    const pulseRadius = 6 + Math.sin(elapsed * 0.006) * 3
    c.beginPath()
    c.arc(origin[0], origin[1], pulseRadius, 0, Math.PI * 2)
    c.fillStyle = `rgba(30, 201, 107, ${pulseAlpha})`
    c.fill()
    // Origin glow
    const glowGrad = c.createRadialGradient(origin[0], origin[1], 0, origin[0], origin[1], 30)
    glowGrad.addColorStop(0, `rgba(30, 201, 107, ${pulseAlpha * 0.4})`)
    glowGrad.addColorStop(1, 'rgba(30, 201, 107, 0)')
    c.beginPath()
    c.arc(origin[0], origin[1], 30, 0, Math.PI * 2)
    c.fillStyle = glowGrad
    c.fill()

    // ---- Draw expanding rings (sonar effect) ----
    for (let r = 0; r < 4; r++) {
      const ringRadius = waveRadius - r * 40
      if (ringRadius < 0) continue
      const alpha = Math.max(0, (1 - ringRadius / MAX_WAVE_RADIUS) * (1 - r * 0.2) * 0.7)
      const lineW = Math.max(0.5, (1 - r * 0.25) * 3 * (1 - ringRadius / MAX_WAVE_RADIUS))

      c.beginPath()
      c.arc(origin[0], origin[1], ringRadius, 0, Math.PI * 2)
      c.strokeStyle = `rgba(30, 201, 107, ${alpha})`
      c.lineWidth = lineW
      c.stroke()

      // Inner glow ring
      if (r === 0 && alpha > 0.1) {
        c.beginPath()
        c.arc(origin[0], origin[1], ringRadius, 0, Math.PI * 2)
        c.strokeStyle = `rgba(43, 158, 237, ${alpha * 0.4})`
        c.lineWidth = lineW * 3
        c.stroke()
      }
    }

    // ---- Fill area behind wavefront ----
    if (waveRadius > 5) {
      const fillGrad = c.createRadialGradient(origin[0], origin[1], 0, origin[0], origin[1], waveRadius)
      fillGrad.addColorStop(0, 'rgba(30, 201, 107, 0.02)')
      fillGrad.addColorStop(0.7, 'rgba(30, 201, 107, 0.04)')
      fillGrad.addColorStop(1, 'rgba(30, 201, 107, 0)')
      c.beginPath()
      c.arc(origin[0], origin[1], waveRadius, 0, Math.PI * 2)
      c.fillStyle = fillGrad
      c.fill()
    }

    // ---- Update particles ----
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i]
      pt.x += pt.vx
      pt.y += pt.vy
      pt.vx *= 0.98
      pt.vy *= 0.98
      pt.life -= 1 / pt.maxLife
      if (pt.life <= 0) { particles.splice(i, 1); continue }
      c.beginPath()
      c.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2)
      c.fillStyle = `rgba(30, 201, 107, ${pt.life * 0.7})`
      c.fill()
    }

    // ---- Spawn particles along wavefront ----
    if (progress < 0.85 && Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2
      const px = origin[0] + Math.cos(angle) * waveRadius
      const py = origin[1] + Math.sin(angle) * waveRadius
      spawnParticles(px, py, 2)
    }

    // ---- Update provinces as wave reaches them ----
    let reachedSoFar = 0
    const mapUpdates: any[] = []
    for (let i = 0; i < yearlyData.value.length; i++) {
      const prov = yearlyData.value[i]
      const px = pixelPositions[i]

      const dx = px[0] - origin[0]
      const dy = px[1] - origin[1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      const isReached = dist <= waveRadius

      if (isReached) {
        reachedSoFar++
        // Check if this level is hidden by legend
        const levelActive = activeLevels.value.has(prov.responseLevel)
        if (!levelActive) {
          // Hidden by legend: render as grayed out
          mapUpdates.push({
            name: prov.geoName,
            value: prov.responseDegree,
            level: prov.responseLevel,
            itemStyle: { areaColor: '#E8E3DA', borderColor: 'rgba(180,175,165,0.3)', borderWidth: 0.5, opacity: 0.35 },
          })
          continue
        }
        // Just reached: flash + particles
        if (!lastRevealTime[prov.geoName]) {
          lastRevealTime[prov.geoName] = now
          spawnParticles(px[0], px[1], 8)
        }
        const revealElapsed = now - lastRevealTime[prov.geoName]
        const revealProgress = Math.min(1, revealElapsed / 500)

        const color = levelColors[prov.responseLevel] || levelColors.unknown
        const rgb = hexToRgb(color)

        // Flash effect on first reveal
        let flashAlpha = 0
        if (revealProgress < 0.3) {
          flashAlpha = (1 - revealProgress / 0.3) * 0.6
        }

        mapUpdates.push({
          name: prov.geoName,
          value: prov.responseDegree,
          level: prov.responseLevel,
          itemStyle: {
            areaColor: color,
            borderColor: revealProgress < 0.5 ? '#fff' : 'rgba(74,53,40,0.5)',
            borderWidth: revealProgress < 0.5 ? 2.5 : 1,
            shadowBlur: revealProgress < 0.5 ? 15 * (1 - revealProgress * 2) : 0,
            shadowColor: revealProgress < 0.5 ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)` : 'transparent',
          }
        })

        // Draw flash ring on canvas
        if (flashAlpha > 0) {
          c.beginPath()
          c.arc(px[0], px[1], 10 + revealProgress * 20, 0, Math.PI * 2)
          c.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${flashAlpha})`
          c.lineWidth = 2
          c.stroke()
        }
      } else {
        // Not reached yet: neutral
        if (lastRevealTime[prov.geoName]) {
          delete lastRevealTime[prov.geoName]
        }
        // Respect legend filter even for unreached provinces
        const levelActive = activeLevels.value.has(prov.responseLevel)
        mapUpdates.push({
          name: prov.geoName,
          value: 0,
          level: levelActive ? 'unknown' : prov.responseLevel,
          itemStyle: levelActive
            ? { areaColor: '#F0EBE3', borderColor: 'rgba(74,53,40,0.2)', borderWidth: 1 }
            : { areaColor: '#E8E3DA', borderColor: 'rgba(180,175,165,0.3)', borderWidth: 0.5, opacity: 0.35 },
        })
      }
    }
    reachedCount.value = reachedSoFar

    // Batch update map
    if (chart && mapUpdates.length > 0) {
      chart.setOption({ series: [{ data: mapUpdates }] }, false)
    }

    // Continue or finish
    if (progress < 1) {
      animFrameId = requestAnimationFrame(animate)
    } else {
      // Animation complete: fade out canvas
      setTimeout(() => {
        fadeOutCanvas(c, canvas)
        isAnimating.value = false
      }, 300)
    }
  }

  animFrameId = requestAnimationFrame(animate)
}

function fadeOutCanvas(c: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  let opacity = 1
  function fade() {
    opacity -= 0.05
    if (opacity <= 0) {
      c.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    // Just clear and reduce global alpha
    c.clearRect(0, 0, canvas.width, canvas.height)
    requestAnimationFrame(fade)
  }
  fade()
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 30, g: 201, b: 107 }
}

/* ---- Watch year changes ---- */
watch(() => props.selectedYear, (newYear) => {
  if (newYear && newYear !== currentYear.value) {
    currentYear.value = newYear
    // Small delay for DOM update
    nextTick(() => {
      triggerShockwave()
    })
  }
})

/* ---- Resize handling ---- */
let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  if (!mapContainer.value) return
  chart = echarts.init(mapContainer.value)

  // Fetch GeoJSON and initialize map
  try {
    const r = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
    geoJsonData = await r.json()
  } catch {
    try {
      const r2 = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/geojson/china.json')
      geoJsonData = await r2.json()
    } catch {}
  }

  if (geoJsonData && chart) {
    chart.setOption(buildMapOption(geoJsonData))
  }

  // Setup resize observer
  resizeObserver = new ResizeObserver(() => {
    chart?.resize()
    if (shockwaveCanvas.value && mapContainer.value) {
      const rect = mapContainer.value.getBoundingClientRect()
      shockwaveCanvas.value.width = rect.width * window.devicePixelRatio
      shockwaveCanvas.value.height = rect.height * window.devicePixelRatio
      shockwaveCanvas.value.style.width = rect.width + 'px'
      shockwaveCanvas.value.style.height = rect.height + 'px'
      canvasWidth.value = rect.width
      canvasHeight.value = rect.height
    }
  })
  resizeObserver.observe(mapContainer.value)

  // Initial shockwave after a brief delay
  setTimeout(() => {
    if (currentYear.value) triggerShockwave()
  }, 800)
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  resizeObserver?.disconnect()
  chart?.dispose()
})
</script>

<style scoped>
.module { display: flex; flex-direction: column; height: 100%; position: relative; }
.module-title {
  font-family: 'Noto Serif SC', 'STSong', serif;
  font-size: 14px; font-weight: 600; color: #4A3528;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 196, 161, 0.2);
  flex-shrink: 0;
  display: flex; align-items: center; gap: 8px;
}

.year-badge {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(30,201,107,0.08);
  border: 1px solid rgba(30,201,107,0.25);
  border-radius: 14px;
  padding: 2px 10px;
  font-size: 12px;
  transition: all 0.3s;
}
.year-badge.animating {
  background: rgba(30,201,107,0.15);
  border-color: rgba(30,201,107,0.5);
  box-shadow: 0 0 12px rgba(30,201,107,0.2);
  animation: badge-pulse 1s ease-in-out infinite;
}
@keyframes badge-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(30,201,107,0.2); }
  50% { box-shadow: 0 0 20px rgba(30,201,107,0.4); }
}
.year-icon { font-size: 13px; }
.year-label {
  font-size: 9px;
  color: #A09888;
  background: rgba(0,0,0,0.04);
  padding: 1px 5px;
  border-radius: 6px;
}

.replay-btn {
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(30,201,107,0.3);
  background: rgba(30,201,107,0.06);
  color: #1EC96B;
  font-size: 10px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.3s;
  margin-left: auto;
}
.replay-btn:hover {
  background: rgba(30,201,107,0.15);
  border-color: rgba(30,201,107,0.5);
  box-shadow: 0 0 10px rgba(30,201,107,0.2);
}
.replay-btn.spinning {
  animation: spin-replay 1s linear infinite;
}
@keyframes spin-replay { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.chart-wrap {
  flex: 1; min-height: 0;
  position: relative;
}
.shockwave-canvas {
  position: absolute; inset: 0;
  z-index: 10;
  pointer-events: none;
}

.insight {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 4px 0; font-size: 12px;
  font-family: 'Noto Serif SC', 'Microsoft YaHei', serif;
  font-weight: 600; color: #4A3528;
  border-top: 1px solid rgba(139, 196, 161, 0.15);
  flex-shrink: 0;
}
.insight-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.insight-dot.green { background: #1EC96B; }
.insight-dot.blue { background: #2B9EED; }
.insight-dot.orange { background: #F5B642; }
.insight-dot.red { background: #F0473C; }
.insight-text {
  margin-left: auto; color: #4A3528;
  font-style: italic; font-size: 11px;
  font-family: 'Noto Serif SC', 'Microsoft YaHei', serif;
  font-weight: 600;
}

/* ---- Interactive legend tags ---- */
.legend-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid transparent;
  user-select: none;
  white-space: nowrap;
}
.legend-tag.active {
  border-color: rgba(139, 196, 161, 0.3);
  background: rgba(139, 196, 161, 0.06);
}
.legend-tag.active:hover {
  border-color: rgba(30, 201, 107, 0.5);
  background: rgba(30, 201, 107, 0.12);
  box-shadow: 0 0 8px rgba(30, 201, 107, 0.15);
}
.legend-tag.inactive {
  opacity: 0.45;
  border-color: rgba(180, 175, 165, 0.3);
  background: rgba(180, 175, 165, 0.06);
  text-decoration: line-through;
  text-decoration-color: rgba(180, 175, 165, 0.4);
}
.legend-tag.inactive:hover {
  opacity: 0.65;
  border-color: rgba(180, 175, 165, 0.5);
  background: rgba(180, 175, 165, 0.12);
}
.legend-tag.inactive .insight-dot {
  filter: grayscale(100%);
  opacity: 0.5;
}

.shockwave-legend {
  display: flex; gap: 16px;
  padding: 3px 0 0;
  font-size: 10px; color: #A09888;
  flex-shrink: 0;
}
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-wave {
  display: inline-block;
  width: 20px; height: 10px;
  border: 2px solid rgba(30,201,107,0.6);
  border-radius: 50%;
  animation: legend-wave-anim 2s ease-in-out infinite;
}
@keyframes legend-wave-anim {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}
.legend-speed {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #1EC96B;
  transition: opacity 0.3s;
}
</style>
