<template>
  <div class="policy-timeline" @wheel.prevent="handleWheel">
    <!-- Timeline row: track + badge side by side -->
    <div class="timeline-row">
      <!-- Track area -->
      <div class="track-area" ref="trackRef">
        <div class="timeline-line"></div>
        <div class="timeline-progress" :style="{ width: progressPercent + '%' }"></div>

        <!-- Policy markers -->
        <div
          v-for="node in nodes"
          :key="node.year"
          class="policy-marker"
          :class="{ active: displayYear === node.year, passed: displayYear > node.year }"
          :style="{ left: toPct(node.year) + '%' }"
          @click="goToYear(node.year)"
        >
          <div class="marker-dot">
            <div class="dot-inner"></div>
            <div class="dot-pulse" v-if="displayYear === node.year"></div>
          </div>
          <div class="marker-label">
            <span class="marker-year">{{ node.year }}</span>
            <span class="marker-title">{{ node.title }}</span>
          </div>
        </div>

        <!-- Slider thumb -->
        <div
          class="slider-thumb"
          :class="{ dragging: isDragging }"
          :style="{ left: sliderPct + '%' }"
          @mousedown.prevent="startDrag"
          @touchstart.prevent="startDrag"
        >
          <div class="thumb-glow"></div>
          <div class="thumb-core"><span class="thumb-pin">▼</span></div>
          <div class="thumb-year">{{ displayYear }}</div>
        </div>
      </div>

      <!-- Badge at right end of timeline -->
      <div class="data-window-badge">
        <span class="badge-icon">{{ displayYear < 2021 ? '🔬' : '📡' }}</span>
        <span class="badge-text">{{ displayYear < 2021 ? '化肥减量启动期' : '绿色转型加速期' }}</span>
        <span class="badge-year">{{ displayYear }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  (e: 'update:year', year: number): void
}>()

const nodes = [
  { year: 2015, title: '零增长行动', desc: '农业部《到2020年化肥使用量零增长行动方案》', effect: '政策破冰·减量序幕' },
  { year: 2016, title: '', desc: '', effect: '' },
  { year: 2017, title: '五大行动', desc: '果菜茶有机肥替代化肥行动启动', effect: '有机肥替代试点推广' },
  { year: 2018, title: '', desc: '', effect: '' },
  { year: 2019, title: '', desc: '', effect: '' },
  { year: 2020, title: '', desc: '', effect: '' },
  { year: 2021, title: '绿色发展规划', desc: '"十四五"全国农业绿色发展规划', effect: '化肥减量纳入考核' },
  { year: 2022, title: '减量化行动', desc: '《到2025年化肥减量化行动方案》', effect: '量化减量目标设定' },
  { year: 2023, title: '', desc: '', effect: '' },
  { year: 2024, title: '一号文件', desc: '中央一号文件: 推进化肥农药减量增效', effect: '政策驱动持续加码' },
]

const YEAR_MIN = 2015
const YEAR_MAX = 2024
const DATA_MIN = 2016

const trackRef = ref<HTMLDivElement>()
const selectedYear = ref(2024)
const displayYear = ref(2024)
const isDragging = ref(false)

/** Convert a year to percentage within the track (2015=0%, 2024=100%) */
function toPct(year: number): number {
  return ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100
}

/** Current slider position as track-relative percentage */
const sliderPct = computed(() => toPct(displayYear.value))

/** Progress bar width */
const progressPercent = computed(() => toPct(displayYear.value))

/* ---- Drag (snap to nearest year) ---- */
function startDrag(e: MouseEvent | TouchEvent) {
  isDragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', stopDrag)
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value || !trackRef.value) return
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const rect = trackRef.value.getBoundingClientRect()
  const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  const raw = YEAR_MIN + (pct / 100) * (YEAR_MAX - YEAR_MIN)
  const snapped = Math.round(raw)
  goToYear(Math.max(DATA_MIN, Math.min(YEAR_MAX, snapped)))
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

/* ---- Scroll: one tick = one year ---- */
function handleWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? 1 : -1
  const next = displayYear.value + delta
  if (next >= DATA_MIN && next <= YEAR_MAX) {
    goToYear(next)
  }
}

function goToYear(year: number) {
  const clamped = Math.max(DATA_MIN, Math.min(YEAR_MAX, year))
  displayYear.value = clamped
  if (clamped !== selectedYear.value) {
    selectedYear.value = clamped
    emit('update:year', clamped)
  }
}

/* ---- Keyboard ---- */
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') {
    const next = displayYear.value - 1
    if (next >= DATA_MIN) goToYear(next)
    e.preventDefault()
  }
  if (e.key === 'ArrowRight') {
    const next = displayYear.value + 1
    if (next <= YEAR_MAX) goToYear(next)
    e.preventDefault()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  stopDrag()
})
</script>

<style scoped>
.policy-timeline {
  position: relative; z-index: 1;
  height: 85px;
  padding: 6px 20px 0;
  background: transparent;
  border-bottom: 1px solid rgba(30,201,107,0.18);
  flex-shrink: 0;
  user-select: none;
}

/* ======== Timeline row (track + badge) ======== */
.timeline-row {
  display: flex; align-items: stretch;
  height: 70px; gap: 0;
}

/* ======== Track area ======== */
.track-area {
  position: relative;
  flex: 1; min-width: 0;
  margin: 0 60px 0 80px;
  cursor: ew-resize;
}

.timeline-line {
  position: absolute; top: 28px; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, rgba(30,201,107,0.15), rgba(30,201,107,0.4), rgba(30,201,107,0.15));
  border-radius: 1px;
  pointer-events: none;
}
.timeline-progress {
  position: absolute; top: 27px; left: 0;
  height: 4px;
  background: linear-gradient(90deg, rgba(30,201,107,0.5), rgba(30,201,107,1), rgba(43,158,237,0.8));
  border-radius: 2px;
  transition: width 0.1s ease;
  box-shadow: 0 0 10px rgba(30,201,107,0.35);
  pointer-events: none;
}

/* ======== Policy markers ======== */
.policy-marker {
  position: absolute; top: 14px;
  transform: translateX(-50%);
  z-index: 3; cursor: pointer;
  display: flex; flex-direction: column; align-items: center;
  gap: 3px;
}
.marker-dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: rgba(245,182,66,0.35);
  position: relative; transition: all 0.3s ease;
  flex-shrink: 0;
}
.dot-inner {
  position: absolute; inset: 3px; border-radius: 50%;
  background: #F5B642; transition: all 0.3s;
}
.policy-marker.active .marker-dot {
  width: 19px; height: 19px;
  background: rgba(30,201,107,0.3);
  box-shadow: 0 0 18px rgba(30,201,107,0.5), 0 0 36px rgba(30,201,107,0.15);
}
.policy-marker.active .dot-inner {
  inset: 3px; background: #fff;
  box-shadow: 0 0 8px rgba(30,201,107,0.7);
}
.policy-marker.passed .dot-inner {
  background: #1EC96B;
}
.dot-pulse {
  position: absolute; inset: -6px; border-radius: 50%;
  border: 2px solid rgba(30,201,107,0.4);
  animation: pulse-ring 2s ease-in-out infinite;
}
@keyframes pulse-ring {
  0%,100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.7); opacity: 0; }
}
.marker-label { text-align: center; pointer-events: none; }
.marker-year {
  font-family: 'DIN Pro','Consolas',monospace;
  font-size: 11px; font-weight: 700; color: #4A3528;
}
.marker-title {
  font-size: 10px; color: #1a1a1a; font-weight: 700; display: block; white-space: nowrap;
}
.policy-marker.active .marker-year {
  color: #1EC96B; font-size: 13px;
}

/* ======== Slider thumb ======== */
.slider-thumb {
  position: absolute; top: 14px;
  transform: translateX(-50%);
  z-index: 10; cursor: grab;
  transition: left 0.08s ease;
}
.slider-thumb.dragging { cursor: grabbing; transition: none; }
.thumb-glow {
  width: 34px; height: 34px; border-radius: 50%;
  background: radial-gradient(circle, rgba(30,201,107,0.3) 0%, transparent 70%);
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  animation: thumb-pulse 2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes thumb-pulse {
  0%,100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
  50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.25; }
}
.thumb-core {
  width: 22px; height: 22px; border-radius: 50%;
  background: linear-gradient(135deg, #1EC96B, #2B9EED);
  border: 3px solid #fff;
  box-shadow: 0 0 14px rgba(30,201,107,0.55), 0 2px 10px rgba(0,0,0,0.15);
  margin: 0 auto; position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.2s;
}
.thumb-pin { font-size: 8px; color: #fff; opacity: 0.9; }
.slider-thumb:hover .thumb-core,
.slider-thumb.dragging .thumb-core {
  transform: scale(1.25);
  box-shadow: 0 0 24px rgba(30,201,107,0.7), 0 4px 14px rgba(0,0,0,0.22);
}
.thumb-year {
  position: absolute; top: 24px; left: 50%;
  transform: translateX(-50%);
  font-family: 'DIN Pro','Consolas',monospace;
  font-size: 12px; font-weight: 800;
  color: #1EC96B;
  background: rgba(255,255,255,0.92);
  padding: 2px 7px; border-radius: 10px;
  border: 1px solid rgba(30,201,107,0.3);
  box-shadow: 0 2px 8px rgba(30,201,107,0.15);
  white-space: nowrap; pointer-events: none; z-index: 3;
}

/* ======== Compact node bar ======== */
.timeline-nodes {
  display: flex; justify-content: space-around;
  padding: 0 50px 0 40px;
  margin-top: 2px;
  z-index: 1; position: relative;
}
.timeline-node {
  text-align: center; cursor: pointer;
  transition: all 0.3s ease; opacity: 0.4;
  display: flex; flex-direction: column; gap: 0;
}
.timeline-node:hover { opacity: 0.8; }
.timeline-node.active,
.timeline-node.passed { opacity: 1; }
.node-year {
  font-family: 'DIN Pro','Consolas',monospace;
  font-size: 12px; font-weight: 700; color: #A09888;
  transition: all 0.3s;
}
.timeline-node.active .node-year {
  font-size: 14px; color: #1EC96B;
  text-shadow: 0 0 8px rgba(30,201,107,0.2);
}
.node-title {
  font-size: 9px; color: #BFB5A5; font-weight: 500;
}
.timeline-node.active .node-title { color: #4A3528; }
.timeline-node.passed .node-title { color: #A09888; }

/* ======== Badge (right of timeline) ======== */
.data-window-badge {
  flex-shrink: 0; align-self: center;
  background: rgba(30,201,107,0.06); border: 1px solid rgba(30,201,107,0.2);
  color: #4A3528; font-size: 9px; padding: 6px 10px; border-radius: 14px;
  white-space: nowrap;
  display: flex; align-items: center; gap: 10px;
  font-family: 'SimHei', '黑体', 'Microsoft YaHei', sans-serif;
}
.badge-icon { font-size: 12px; }
.badge-text { font-size: 11px; }
.badge-year {
  font-family: 'DIN Pro','Consolas',monospace;
  font-weight: 800; font-size: 16px; color: #1EC96B;
}
</style>
