<template>
  <div class="policy-timeline">
    <div class="timeline-line"></div>
    <div class="timeline-nodes">
      <div
        v-for="(node, i) in nodes"
        :key="i"
        class="timeline-node"
        :class="{ highlight: node.year >= 2021 }"
        :style="{ '--delay': i * 0.1 + 's' }"
      >
        <div class="node-dot"></div>
        <div class="node-year">{{ node.year }}</div>
        <div class="node-title">{{ node.title }}</div>
        <div class="node-desc">{{ node.desc }}</div>
        <div class="node-effect">{{ node.effect }}</div>
      </div>
    </div>
    <div class="data-window-badge">当前数据窗口 2021→2024</div>
  </div>
</template>

<script setup lang="ts">
const nodes = [
  { year: 2015, title: '零增长行动', desc: '农业部《到2020年化肥使用量零增长行动方案》', effect: '' },
  { year: 2017, title: '五大行动', desc: '果菜茶有机肥替代化肥行动启动', effect: '有机肥替代试点推广' },
  { year: 2021, title: '绿色发展规划', desc: '"十四五"全国农业绿色发展规划', effect: '化肥减量纳入考核' },
  { year: 2022, title: '减量化行动', desc: '《到2025年化肥减量化行动方案》', effect: '量化减量目标设定' },
  { year: 2024, title: '一号文件', desc: '中央一号文件: 推进化肥农药减量增效', effect: '政策驱动持续加码' },
]
</script>

<style scoped>
.policy-timeline {
  position: relative; z-index: 1;
  height: 110px; padding: 12px 30px;
  background: transparent;
  border-bottom: 1px solid rgba(30,201,107,0.18);
  flex-shrink: 0;
  display: flex; align-items: center;
}
.timeline-line {
  position: absolute; top: 45%; left: 60px; right: 200px;
  height: 2px;
  background: linear-gradient(90deg, rgba(30,201,107,0.2), rgba(30,201,107,0.5), rgba(30,201,107,0.2));
}
.timeline-nodes {
  display: flex; justify-content: space-around; width: 100%; padding: 0 40px 0 20px;
}
.timeline-node {
  text-align: center; position: relative; padding-top: 10px;
  animation: fadeInUp 0.6s ease both;
  animation-delay: var(--delay);
}
@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.node-dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: #F5B642; margin: 0 auto 6px;
  box-shadow: 0 0 8px rgba(245,182,66,0.4);
}
.timeline-node.highlight .node-dot {
  background: #1EC96B; box-shadow: 0 0 14px rgba(30,201,107,0.5); width: 14px; height: 14px;
}
.node-year { font-family: 'DIN Pro', 'Consolas', 'monospace'; font-size: 16px; font-weight: 700; color: #000; }
.node-title { font-size: 12px; color: #000; font-weight: 600; margin-top: 2px; }
.node-desc { font-size: 10px; color: #000; max-width: 180px; margin-top: 1px; }
.node-effect { font-size: 10px; color: #000; margin-top: 1px; font-style: italic; }
.data-window-badge {
  position: absolute; right: 20px; top: 50%; transform: translateY(-50%);
  background: rgba(30,201,107,0.08); border: 1px solid rgba(30,201,107,0.25);
  color: #000; font-size: 11px; padding: 6px 12px; border-radius: 20px;
  white-space: nowrap;
}
</style>
