<template>
  <div class="dashboard">
      <!-- Background decoration -->
      <div class="bg-layer"></div>

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

      <!-- Center Column: 模块1 地图 + 模块6 建议 -->
      <div class="card module-1 map-card">
        <div class="card-grip" @click="focusedModule = 'module1'" title="点击放大">
          <span class="grip-icon">⛶</span>
        </div>
        <Module1InputReduction
          :provinces="data.provinces"
          :levelCounts="data.levelCounts"
          :selectedYear="selectedYear"
        />
      </div>
      <div class="card module-6 module-6-compact">
        <div class="card-grip" @click="focusedModule = 'module6'" title="点击放大">
          <span class="grip-icon">⛶</span>
        </div>
        <Module6Recommendation
          :responseDashboard="data.responseDashboard"
          :suggestions="data.suggestions"
          :levelCounts="data.levelCounts"
        />
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
              :responseDashboard="data.responseDashboard"
              :suggestions="data.suggestions"
              :levelCounts="data.levelCounts"
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
    /* 低饱和渐变底 */
    linear-gradient(180deg, #FFFBF5 0%, #FDF7ED 25%, #FFFBF5 50%, #FBF4E8 75%, #FFFBF5 100%),
    /* 田园纹理条纹 */
    repeating-linear-gradient(0deg, transparent, transparent 118px, rgba(139, 196, 161, 0.04) 118px, rgba(139, 196, 161, 0.04) 120px);
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

/* Grid — 左右撑满，中间地图固定宽度 */
.grid-container {
  position: relative; z-index: 1;
  display: grid;
  grid-template-columns: 1fr minmax(32vw, 780px) 1fr;
  grid-template-rows: repeat(8, 1fr);
  gap: 10px;
  padding: 8px 14px 4px;
  flex: 1;
  min-height: 0;
}

/* Left column: 2 modules — 50:50 */
.grid-container .module-5 { grid-column: 1; grid-row: 1 / 5; }
.grid-container .module-4 { grid-column: 1; grid-row: 5 / 9; }

/* Center: map (6 rows) + recommendations (2 rows) */
.grid-container .module-1 { grid-column: 2; grid-row: 1 / 7; }
.grid-container .module-6 { grid-column: 2; grid-row: 7 / 9; }

/* Right column: 2 modules — 50:50 */
.grid-container .module-2 { grid-column: 3; grid-row: 1 / 5; }
.grid-container .module-3 { grid-column: 3; grid-row: 5 / 9; }

.card { background: transparent; border: 1px solid var(--border-card); border-radius: 8px; box-shadow: none; padding: 10px 12px; overflow: hidden; display: flex; flex-direction: column; transition: border-color 0.3s; position: relative; }
.card:hover { border-color: rgba(30, 201, 107, 0.35); }

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

/* Center map card — 最高饱和视觉焦点 */
.map-card {
  border-color: rgba(30, 201, 107, 0.5) !important;
  border-width: 2px !important;
  box-shadow:
    0 0 30px rgba(30, 201, 107, 0.15),
    0 0 60px rgba(43, 158, 237, 0.08),
    inset 0 0 40px rgba(30, 201, 107, 0.03) !important;
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
