<template>
  <div class="dashboard">
      <!-- Background decoration -->
      <div class="bg-layer"></div>

      <!-- Module 1: Full-screen map background + Module 6 bottom bar -->
      <div class="map-bg-layer" v-if="data">
        <Module1InputReduction
          :provinces="data.provinces"
          :levelCounts="data.levelCounts"
          :selectedYear="selectedYear"
          :activeLevels="activeLevels"
          @update:activeLevels="activeLevels = $event"
        />
        <!-- Module 6 embedded at bottom -->
        <div class="map-bottom-bar">
          <Module6Recommendation
            :provinces="data.provinces"
            :selectedYear="selectedYear"
            :activeLevels="activeLevels"
          />
        </div>
        <!-- Shared legend below Module 6 -->
        <div class="map-legend-bar">
          <span
            class="legend-tag"
            :class="{ active: activeLevels.has('high'), inactive: !activeLevels.has('high') }"
            @click="onToggleLevel('high')"
          >
            <span class="legend-dot" style="background:#1EC96B"></span>高度响应
          </span>
          <span
            class="legend-tag"
            :class="{ active: activeLevels.has('normal'), inactive: !activeLevels.has('normal') }"
            @click="onToggleLevel('normal')"
          >
            <span class="legend-dot" style="background:#2B9EED"></span>正常
          </span>
          <span
            class="legend-tag"
            :class="{ active: activeLevels.has('weak'), inactive: !activeLevels.has('weak') }"
            @click="onToggleLevel('weak')"
          >
            <span class="legend-dot" style="background:#F5B642"></span>弱响应
          </span>
          <span
            class="legend-tag"
            :class="{ active: activeLevels.has('none'), inactive: !activeLevels.has('none') }"
            @click="onToggleLevel('none')"
          >
            <span class="legend-dot" style="background:#F0473C"></span>未响应
          </span>
        </div>
      </div>

      <!-- Header -->
      <header class="header">
        <div class="header-left">
          <span class="header-icon">🌾</span>
        </div>
        <div class="header-center">
          <h1>中国农业绿色转型监测大屏</h1>
          <p>政策驱动 · 数据见证 —— 化肥减量增效与农业高质量发展</p>
        </div>
        <div class="header-right">
          <span class="header-icon">🌿</span>
        </div>
      </header>

      <!-- Policy Timeline -->
      <PolicyTimeline @update:year="onYearChange" />



      <!-- Dashboard Grid -->
    <div class="grid-container" v-if="data">
      <!-- Left Column: 模块5、模块4 -->
      <div class="card module-5">
        <div class="card-grip" @click="focusedModule = 'module5'" title="点击放大">
          <span class="grip-icon">⛶</span>
        </div>
        <Module5Efficiency
          :provinces="data.provinces"
          :efficiencyRanking="data.efficiencyRanking"
        />
      </div>
      <div class="card module-4">
        <div class="card-grip" @click="focusedModule = 'module4'" title="点击放大">
          <span class="grip-icon">⛶</span>
        </div>
        <Module4Economy />
      </div>

      <!-- Right Column: 模块2、模块3 -->
      <div class="card module-2">
        <div class="card-grip" @click="focusedModule = 'module2'" title="点击放大">
          <span class="grip-icon">⛶</span>
        </div>
        <Module2OutputSecurity
          :nationalFert="data.nationalFertilizerTrend"
          :nationalGrain="data.nationalGrainTrend"
          :provinces="data.provinces"
        />
      </div>
      <div class="card module-3">
        <div class="card-grip" @click="focusedModule = 'module3'" title="点击放大">
          <span class="grip-icon">⛶</span>
        </div>
        <Module3Substitution
          :fertStructure="data.fertStructure"
          :provinces="data.provinces"
        />
      </div>
    </div>

      <!-- Loading -->
      <div class="loading" v-else>
        <div class="loading-spinner">🌱</div>
        <p>数据加载中...</p>
      </div>

    <!-- ========== Modal Overlay for Focused Module ========== -->
    <Teleport to="body">
      <div
        v-if="focusedModule && data"
        class="modal-overlay"
        @click.self="focusedModule = null"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">{{ focusedTitle }}</h2>
            <button class="modal-close" @click="focusedModule = null" title="关闭">✕</button>
          </div>
          <div class="modal-body">
            <Module1InputReduction
              v-if="focusedModule === 'module1'"
              :provinces="data.provinces"
              :levelCounts="data.levelCounts"
              :selectedYear="selectedYear"
              :activeLevels="activeLevels"
              @update:activeLevels="activeLevels = $event"
            />
            <Module2OutputSecurity
              v-if="focusedModule === 'module2'"
              :nationalFert="data.nationalFertilizerTrend"
              :nationalGrain="data.nationalGrainTrend"
              :provinces="data.provinces"
            />
            <Module3Substitution
              v-if="focusedModule === 'module3'"
              :fertStructure="data.fertStructure"
              :provinces="data.provinces"
            />
            <Module4Economy v-if="focusedModule === 'module4'" />
            <Module5Efficiency
              v-if="focusedModule === 'module5'"
              :provinces="data.provinces"
              :efficiencyRanking="data.efficiencyRanking"
            />
            <Module6Recommendation
              v-if="focusedModule === 'module6'"
              :provinces="data.provinces"
              :selectedYear="selectedYear"
              :activeLevels="activeLevels"
            />
          </div>
        </div>
      </div>
    </Teleport>

      <!-- Footer -->
      <footer class="footer">
        <span>数据来源：国家统计局分省年度数据（2016-2024）</span>
        <span>|</span>
        <span>政策依据：2024年中央一号文件"推进化肥农药减量增效"</span>
        <span>|</span>
        <span>数据更新：2026年6月</span>
      </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { fetchDashboard, type DashboardData } from './api'
import PolicyTimeline from './components/PolicyTimeline.vue'
import Module1InputReduction from './components/Module1InputReduction.vue'
import Module2OutputSecurity from './components/Module2OutputSecurity.vue'
import Module3Substitution from './components/Module3Substitution.vue'
import Module4Economy from './components/Module4Economy.vue'
import Module5Efficiency from './components/Module5Efficiency.vue'
import Module6Recommendation from './components/Module6Recommendation.vue'

const data = ref<DashboardData | null>(null)
const selectedYear = ref(2024)

/* ---- Shared legend state (Module 1 + Module 6) ---- */
const activeLevels = ref<Set<string>>(new Set(['high', 'normal', 'weak', 'none']))

function onToggleLevel(level: string) {
  if (activeLevels.value.has(level)) {
    if (activeLevels.value.size <= 1) return
    activeLevels.value.delete(level)
  } else {
    activeLevels.value.add(level)
  }
  activeLevels.value = new Set(activeLevels.value)
}

/* ---- Modal focus state ---- */
const focusedModule = ref<string | null>(null)
const moduleTitles: Record<string, string> = {
  module1: '投入减量响应度',
  module2: '产出保障响应度',
  module3: '替代机制响应度',
  module4: '经济响应度',
  module5: '效率响应度（分区域雷达图）',
  module6: '促进建议',
}
const focusedTitle = computed(() => focusedModule.value ? moduleTitles[focusedModule.value] || '' : '')

// Trigger ECharts resize when modal opens/closes
watch(focusedModule, async (val) => {
  if (val) {
    await nextTick()
    setTimeout(() => window.dispatchEvent(new Event('resize')), 150)
  }
})

function onYearChange(year: number) {
  selectedYear.value = year
}

onMounted(async () => {
  data.value = await fetchDashboard()
})
</script>

<style>
/* ========== Global Styles ========== */
:root {
  /* Background — 低饱和马卡龙田园 */
  --bg-deep: #FFFBF5;
  --bg-card: transparent;
  --bg-card-hover: rgba(139, 196, 161, 0.06);
  --border-card: rgba(139, 196, 161, 0.2);
  /* Text */
  --text-primary: #555555;
  --text-secondary: #A09888;
  --text-muted: #BFB5A5;
  /* Data — 高饱和亮色，数据一眼识别 */
  --accent-green: #1EC96B;
  --accent-blue: #2B9EED;
  --accent-orange: #F5B642;
  --accent-red: #F0473C;
  --accent-gold: #F5B642;
  --main-green: #1EC96B;
  --main-blue: #2B9EED;
  --soil-warm: #F08040;
  --title-dark: #4A3528;
  --card-split-bg: transparent;
  --shadow-card: none;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: 'Noto Serif SC', 'Microsoft YaHei', 'PingFang SC', 'Source Han Serif SC', serif;
  background: #FFFBF5;
  color: var(--text-primary);
}

/* Numbers and data use monospace */
.module-title, .node-year, .prov-value, .insight, .chart-wrap, .sug-detail, .footer {
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

/* ========== Dashboard Layout — 全局响应式 ========== */
.dashboard {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.bg-layer {
  position: absolute; inset: 0;
  background:
    /* 田园光斑 — 左上青绿、右下杏暖、中间金色 */
    radial-gradient(ellipse at 15% 15%, rgba(30, 201, 107, 0.07) 0%, transparent 45%),
    radial-gradient(ellipse at 85% 85%, rgba(240, 128, 64, 0.05) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 45%, rgba(245, 182, 66, 0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 55% 50%, rgba(43, 158, 237, 0.04) 0%, transparent 40%),
    /* 半透明渐变底 — 露出底层图片 */
    linear-gradient(180deg, rgba(255,251,245,0.45) 0%, rgba(253,247,237,0.45) 25%, rgba(255,251,245,0.45) 50%, rgba(251,244,232,0.45) 75%, rgba(255,251,245,0.45) 100%),
    /* 田园纹理条纹 */
    repeating-linear-gradient(0deg, transparent, transparent 118px, rgba(139, 196, 161, 0.04) 118px, rgba(139, 196, 161, 0.04) 120px),
    /* 用户自定义背景图片 — 最底层 */
    url('/bg-image.jpg');
  background-size: auto, auto, auto, auto, auto, auto, cover;
  background-position: center;
  background-repeat: no-repeat;
  pointer-events: none;
  z-index: 0;
}

/* Header — 透明融入田园背景 */
.header {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: center;
  height: 78px; padding: 0 40px;
  background: transparent;
  border-bottom: 1px solid rgba(139, 196, 161, 0.2);
  flex-shrink: 0;
}
.header-left, .header-right { width: 50px; text-align: center; }
.header-icon { font-size: 32px; }
.header-center { text-align: center; }
.header-center h1 {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'STSong', serif;
  font-size: 28px; font-weight: 900;
  background: linear-gradient(180deg, #4A3528 0%, #1EC96B 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  letter-spacing: 6px;
}
.header-center p {
  font-size: 13px; color: var(--text-secondary); letter-spacing: 2px; margin-top: 2px;
}

/* Grid — 左右模块悬浮在地图上方 */
.grid-container {
  position: relative; z-index: 2;
  display: grid;
  grid-template-columns: 30% 1fr 30%;
  grid-template-rows: repeat(8, 1fr);
  gap: 10px;
  padding: 8px 14px 4px;
  flex: 1;
  min-height: 0;
  pointer-events: none;
}
.grid-container .card { pointer-events: auto; }

/* Left column: 2 modules — 50:50 */
.grid-container .module-5 { grid-column: 1; grid-row: 1 / 5; }
.grid-container .module-4 { grid-column: 1; grid-row: 5 / 9; }

/* Right column: 2 modules — 50:50 */
.grid-container .module-2 { grid-column: 3; grid-row: 1 / 5; }
.grid-container .module-3 { grid-column: 3; grid-row: 5 / 9; }

/* ========== Full-screen Map Background Layer ========== */
.map-title-row {
  position: relative; z-index: 2;
  text-align: center; padding: 2px 0 0;
  flex-shrink: 0;
}
.map-title-row .module-title {
  font-family: 'Noto Serif SC', 'STSong', serif;
  font-size: 14px; font-weight: 600; color: #4A3528;
  display: inline-block;
  background: rgba(255, 251, 245, 0.75);
  backdrop-filter: blur(4px);
  border-radius: 6px;
  padding: 2px 14px;
}
.map-bg-layer {
  position: absolute;
  top: 78px;       /* below header */
  bottom: 30px;    /* above footer */
  left: 0; right: 0;
  z-index: 1;
  pointer-events: auto;
  overflow: hidden;
}
/* Module 1 inside the bg layer: fully transparent, no card chrome */
.map-bg-layer > .module {
  width: 100%; height: 100%;
  background: transparent;
}
.map-bg-layer .module-title {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: rgba(255, 251, 245, 0.18);
  backdrop-filter: blur(2px);
  border-radius: 20px;
  padding: 5px 18px;
  white-space: nowrap;
}
.map-bg-layer .module-title:hover {
  background: rgba(255, 251, 245, 0.45);
}
.map-bg-layer .insight {
  background: rgba(255, 251, 245, 0.18);
  backdrop-filter: blur(2px);
  border-radius: 6px;
  padding: 4px 10px;
}
.map-bg-layer .insight:hover {
  background: rgba(255, 251, 245, 0.45);
}

/* Module 6 embedded bottom bar */
.map-bottom-bar {
  position: absolute;
  bottom: 40px;
  left: 50%; transform: translateX(-50%);
  width: 40%;
  z-index: 5;
  pointer-events: auto;
}
.map-bottom-bar .module {
  background: transparent;
  border-radius: 8px; padding: 4px 8px;
  display: flex; flex-direction: column;
}
.map-bottom-bar .dashboard-grid {
  display: grid; grid-template-columns: repeat(16, 1fr); gap: 2px;
  padding: 3px 0;
}
.map-bottom-bar .province-block {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2px 1px; border-radius: 3px; cursor: pointer; transition: transform 0.2s;
  border: 1px solid transparent;
}
.map-bottom-bar .province-block:hover { transform: scale(1.05); z-index: 1; }
.map-bottom-bar .prov-name {
  font-size: 10px; color: #000; font-weight: 700; line-height: 1.3;
}
.map-bottom-bar .prov-value {
  font-family: 'DIN Pro', 'Consolas', monospace;
  font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;
}
.map-bottom-bar .level-high { background: rgba(30,230,80,0.50); border-color: rgba(30,230,80,0.6); }
.map-bottom-bar .level-normal { background: rgba(43,168,255,0.50); border-color: rgba(43,168,255,0.55); }
.map-bottom-bar .level-weak { background: rgba(255,190,50,0.50); border-color: rgba(255,190,50,0.55); }
.map-bottom-bar .level-none { background: rgba(255,60,40,0.50); border-color: rgba(255,60,40,0.55); }
.map-bottom-bar .legend-row {
  display: flex; align-items: center; gap: 8px;
  padding: 2px 0; font-size: 10px;
  font-family: 'Noto Serif SC', 'Microsoft YaHei', serif;
  font-weight: 600; color: #000;
  border-bottom: 1px solid rgba(30, 201, 107, 0.12);
}
.map-bottom-bar .legend-item { display: flex; align-items: center; gap: 3px; color: #000; }
.map-bottom-bar .dot { width: 7px; height: 7px; border-radius: 2px; opacity: 1; }
.map-bottom-bar .dot.green { background: #1EE650; } .map-bottom-bar .dot.blue { background: #2BA8FF; }
.map-bottom-bar .dot.orange { background: #FFBE32; } .map-bottom-bar .dot.red { background: #FF3C28; }
.map-bottom-bar .summary { margin-left: auto; color: #000; }

/* Shared legend bar — centered below Module 6 */
.map-legend-bar {
  position: absolute;
  bottom: 6px;
  left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px;
  z-index: 6;
  pointer-events: auto;
}
.map-legend-bar .legend-tag {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px;
  border-radius: 14px;
  cursor: pointer;
  font-size: 12px; font-weight: 600;
  font-family: 'Noto Serif SC', 'Microsoft YaHei', serif;
  color: rgba(255,255,255,0.85);
  background: rgba(10, 25, 45, 0.35);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(130, 200, 255, 0.15);
  transition: all 0.25s;
  user-select: none;
  white-space: nowrap;
}
.map-legend-bar .legend-tag.active {
  border-color: rgba(130, 200, 255, 0.35);
  box-shadow: 0 0 8px rgba(100, 180, 240, 0.2);
}
.map-legend-bar .legend-tag.active:hover {
  border-color: rgba(160, 220, 255, 0.55);
  background: rgba(20, 40, 60, 0.5);
  box-shadow: 0 0 14px rgba(120, 200, 255, 0.3);
}
.map-legend-bar .legend-tag.inactive {
  opacity: 0.35;
  border-color: rgba(100, 100, 110, 0.2);
  background: rgba(10, 15, 20, 0.25);
}
.map-legend-bar .legend-tag.inactive:hover {
  opacity: 0.55;
}
.map-legend-bar .legend-dot {
  width: 9px; height: 9px; border-radius: 50%;
  box-shadow: 0 0 5px currentColor;
}

.card {
  background: rgba(255, 251, 245, 0.5);
  border: 1px solid rgba(80, 180, 240, 0.5);
  border-radius: 8px;
  box-shadow:
    0 0 8px rgba(80, 180, 240, 0.2),
    0 0 20px rgba(80, 180, 240, 0.08),
    inset 0 0 12px rgba(80, 180, 240, 0.06);
  padding: 10px 12px; overflow: hidden;
  display: flex; flex-direction: column;
  transition: border-color 0.3s, background 0.3s, box-shadow 0.3s;
  position: relative; backdrop-filter: blur(2px);
  animation: card-glow-pulse 3s ease-in-out infinite;
}
.card:hover {
  border-color: rgba(120, 210, 255, 0.8);
  background: rgba(255, 251, 245, 0.65);
  box-shadow:
    0 0 16px rgba(100, 200, 255, 0.35),
    0 0 36px rgba(80, 180, 240, 0.15),
    inset 0 0 20px rgba(100, 200, 255, 0.1);
}
@keyframes card-glow-pulse {
  0%, 100% {
    border-color: rgba(80, 180, 240, 0.5);
    box-shadow: 0 0 8px rgba(80, 180, 240, 0.2), 0 0 20px rgba(80, 180, 240, 0.08), inset 0 0 12px rgba(80, 180, 240, 0.06);
  }
  50% {
    border-color: rgba(110, 210, 255, 0.7);
    box-shadow: 0 0 14px rgba(100, 200, 255, 0.3), 0 0 30px rgba(90, 190, 250, 0.14), inset 0 0 18px rgba(100, 200, 255, 0.12);
  }
}

/* Grip bar at card top — click to expand */
.card-grip {
  position: absolute; top: 0; left: 0; right: 0; height: 28px;
  z-index: 10;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0.35; transition: opacity 0.3s, background 0.3s;
  border-radius: 8px 8px 0 0;
  background: rgba(139, 196, 161, 0.04);
}
.card:hover .card-grip { opacity: 1; background: rgba(139, 196, 161, 0.08); }
.card-grip:hover {
  background: rgba(30, 201, 107, 0.14) !important;
}
.grip-icon {
  font-size: 13px; color: var(--text-muted);
  transition: transform 0.3s, color 0.3s;
  line-height: 1;
}
.card-grip:hover .grip-icon {
  transform: scale(1.2);
  color: #1EC96B;
}

/* Loading */
.loading {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px;
}
.loading-spinner { font-size: 48px; animation: spin 2s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.loading p { color: var(--text-secondary); font-size: 16px; }

/* Footer — 透明 */
.footer {
  position: relative; z-index: 1;
  height: 30px; display: flex; align-items: center; justify-content: center;
  gap: 16px; font-size: 11px; color: var(--text-muted);
  border-top: 1px solid rgba(139, 196, 161, 0.18);
  flex-shrink: 0;
  background: transparent;
}

/* ========== Modal Overlay ========== */
.modal-overlay {
  position: fixed; inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  animation: modal-fade-in 0.25s ease;
}
@keyframes modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  width: 88vw; height: 88vh;
  background: rgba(255, 251, 245, 0.97);
  border: 1px solid rgba(30, 201, 107, 0.3);
  border-radius: 16px 16px 12px 12px;
  box-shadow: 0 -8px 60px rgba(0, 0, 0, 0.2), 0 0 120px rgba(30, 201, 107, 0.08);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: modal-slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes modal-slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 10px;
  border-bottom: 1px solid rgba(139, 196, 161, 0.2);
  flex-shrink: 0;
}
.modal-title {
  font-family: 'Noto Serif SC', 'STSong', serif;
  font-size: 20px; font-weight: 700; color: #4A3528;
  margin: 0;
}
.modal-close {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(139, 196, 161, 0.3);
  background: rgba(139, 196, 161, 0.06);
  color: #4A3528;
  font-size: 16px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  line-height: 1;
}
.modal-close:hover {
  background: rgba(240, 71, 60, 0.1);
  border-color: rgba(240, 71, 60, 0.4);
  color: #F0473C;
}

.modal-body {
  flex: 1; min-height: 0;
  padding: 12px 20px 16px;
  overflow: hidden;
  display: flex; flex-direction: column;
  font-size: 135% !important;
}
.modal-body .module-title {
  font-size: 20px !important;
}
.modal-body .insight {
  font-size: 16px !important;
}
.modal-body .insight-text {
  font-size: 15px !important;
}
.modal-body .legend-tag {
  font-size: 14px !important;
}
.modal-body .legend-row {
  font-size: 13px !important;
}
.modal-body .module-6-compact .prov-name {
  font-size: 12px !important;
}
.modal-body .module-6-compact .prov-value {
  font-size: 14px !important;
}
.modal-body .sug-title {
  font-size: 12px !important;
}
.modal-body .sug-detail {
  font-size: 11px !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(139, 196, 161, 0.25); border-radius: 2px; }
</style>
