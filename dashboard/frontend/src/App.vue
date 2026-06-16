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
      <PolicyTimeline />

      <!-- Dashboard Grid -->
    <div class="grid-container" v-if="data">
      <!-- Left Column: 模块5、模块4 -->
      <div class="card module-5">
        <Module5Efficiency
          :provinces="data.provinces"
          :efficiencyRanking="data.efficiencyRanking"
        />
      </div>
      <div class="card module-4">
        <Module4Economy />
      </div>

      <!-- Center Column: 模块1 地图 + 模块6 建议 -->
      <div class="card module-1 map-card">
        <Module1InputReduction :provinces="data.provinces" :levelCounts="data.levelCounts" />
      </div>
      <div class="card module-6 module-6-compact">
        <Module6Recommendation
          :responseDashboard="data.responseDashboard"
          :suggestions="data.suggestions"
          :levelCounts="data.levelCounts"
        />
      </div>

      <!-- Right Column: 模块2、模块3 -->
      <div class="card module-2">
        <Module2OutputSecurity
          :nationalFert="data.nationalFertilizerTrend"
          :nationalGrain="data.nationalGrainTrend"
          :provinces="data.provinces"
        />
      </div>
      <div class="card module-3">
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

      <!-- Footer -->
      <footer class="footer">
        <span>数据来源：国家统计局分省年度数据（2021-2024）</span>
        <span>|</span>
        <span>政策依据：2024年中央一号文件"推进化肥农药减量增效"</span>
        <span>|</span>
        <span>数据更新：2026年6月</span>
      </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchDashboard, type DashboardData } from './api'
import PolicyTimeline from './components/PolicyTimeline.vue'
import Module1InputReduction from './components/Module1InputReduction.vue'
import Module2OutputSecurity from './components/Module2OutputSecurity.vue'
import Module3Substitution from './components/Module3Substitution.vue'
import Module4Economy from './components/Module4Economy.vue'
import Module5Efficiency from './components/Module5Efficiency.vue'
import Module6Recommendation from './components/Module6Recommendation.vue'

const data = ref<DashboardData | null>(null)

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

.card { background: transparent; border: 1px solid var(--border-card); border-radius: 8px; box-shadow: none; padding: 10px 12px; overflow: hidden; display: flex; flex-direction: column; transition: border-color 0.3s; }
.card:hover { border-color: rgba(30, 201, 107, 0.35); }

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

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(139, 196, 161, 0.25); border-radius: 2px; }
</style>
