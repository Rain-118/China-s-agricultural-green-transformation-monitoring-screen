<template>
  <div class="module">
    <h3 class="module-title">促进建议</h3>

    <!-- Response Dashboard Grid -->
    <div class="dashboard-grid">
      <div
        v-for="item in responseDashboard"
        :key="item.name"
        class="province-block"
        :class="'level-' + item.responseLevel"
        :title="`${item.name}: 响应度${item.responseDegree} (${levelLabel(item.responseLevel)})`"
      >
        <span class="prov-name">{{ item.name }}</span>
        <span class="prov-value">{{ item.responseDegree }}</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend-row">
      <span class="legend-item"><span class="dot green"></span>高度响应</span>
      <span class="legend-item"><span class="dot blue"></span>正常</span>
      <span class="legend-item"><span class="dot orange"></span>弱响应</span>
      <span class="legend-item"><span class="dot red"></span>未响应</span>
      <span class="summary">综合响应率：{{ responseRate }}%</span>
    </div>

    <!-- Suggestions -->
    <div class="suggestions">
      <div
        v-for="(s, i) in suggestions"
        :key="i"
        class="suggestion-item"
        :class="'sug-' + s.type"
      >
        <span class="sug-icon">{{ s.type === 'warning' ? '⚠' : s.type === 'push' ? '📢' : '✅' }}</span>
        <div>
          <div class="sug-title">{{ s.title }}</div>
          <div class="sug-detail">{{ s.detail }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ResponseItem, Suggestion } from '../api'

const props = defineProps<{
  responseDashboard: ResponseItem[]
  suggestions: Suggestion[]
  levelCounts: Record<string, number>
}>()

function levelLabel(level: string) {
  const map: Record<string, string> = { high: '高度响应', normal: '正常', weak: '弱响应', none: '未响应' }
  return map[level] || '未知'
}

const responseRate = computed(() => {
  const total = props.responseDashboard.length
  const high = props.levelCounts.high || 0
  const normal = props.levelCounts.normal || 0
  if (total === 0) return 0
  return Math.round((high + normal) / total * 100)
})
</script>

<style scoped>
.module { display: flex; flex-direction: column; height: 100%; }
.module-title { font-family: 'Noto Serif SC', 'STSong', serif; font-size: 12px; font-weight: 600; color: #4A3528; padding-bottom: 3px; border-bottom: 1px solid rgba(30, 201, 107, 0.2); flex-shrink: 0; }

/* Dashboard Grid — compact 10-col */
.dashboard-grid {
  display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px;
  padding: 3px 0; flex-shrink: 0;
}
.province-block {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2px 1px; border-radius: 3px; cursor: pointer; transition: transform 0.2s;
  border: 1px solid transparent;
}
.province-block:hover { transform: scale(1.05); z-index: 1; }
.level-high { background: rgba(30,201,107,0.15); border-color: rgba(30,201,107,0.4); }
.level-normal { background: rgba(43,158,237,0.12); border-color: rgba(43,158,237,0.3); }
.level-weak { background: rgba(245,182,66,0.12); border-color: rgba(245,182,66,0.3); }
.level-none { background: rgba(240,71,60,0.12); border-color: rgba(240,71,60,0.3); }
.prov-name { font-size: 8px; color: #A09888; font-weight: 500; line-height: 1.1; }
.prov-value { font-family: 'DIN Pro', 'Consolas', 'monospace'; font-size: 10px; font-weight: 700; color: #4A3528; line-height: 1.2; }

/* Legend — compact */
.legend-row { display: flex; align-items: center; gap: 8px; padding: 2px 0; font-size: 10px; font-family: 'Noto Serif SC', 'Microsoft YaHei', serif; font-weight: 600; color: #4A3528; flex-shrink: 0; border-bottom: 1px solid rgba(30, 201, 107, 0.12); }
.legend-item { display: flex; align-items: center; gap: 3px; }
.dot { width: 7px; height: 7px; border-radius: 2px; }
.dot.green { background: #1EC96B; } .dot.blue { background: #2B9EED; }
.dot.orange { background: #F5B642; } .dot.red { background: #F0473C; }
.summary { margin-left: auto; color: #1EC96B; }

/* Suggestions — compact */
.suggestions { display: flex; flex-direction: column; gap: 3px; flex: 1; padding-top: 3px; overflow-y: auto; }
.suggestion-item { display: flex; gap: 5px; padding: 3px 5px; border-radius: 3px; border-left: 2px solid transparent; background: transparent; }
.sug-warning { border-left-color: #F0473C; }
.sug-push { border-left-color: #F5B642; }
.sug-success { border-left-color: #1EC96B; }
.sug-icon { font-size: 11px; flex-shrink: 0; margin-top: 1px; }
.sug-title { font-size: 9px; font-weight: 600; color: #555555; line-height: 1.2; }
.sug-detail { font-size: 8px; color: #A09888; line-height: 1.3; margin-top: 0; }
</style>
