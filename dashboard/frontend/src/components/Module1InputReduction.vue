<template>
  <div class="module">
    <h3 class="module-title">🌱 中国各省份化肥减量响应度</h3>
    <div class="chart-wrap" ref="mapContainer"></div>
    <div class="insight">
      <span class="insight-dot green"></span>高度响应 {{ counts.high }}省
      <span class="insight-dot blue"></span>正常 {{ counts.normal }}省
      <span class="insight-dot orange"></span>弱响应 {{ counts.weak }}省
      <span class="insight-dot red"></span>未响应 {{ counts.none }}省
      <span class="insight-text">{{ insightText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { ProvinceData } from '../api'

const props = defineProps<{ provinces: ProvinceData[]; levelCounts: Record<string, number> }>()

const mapContainer = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const counts = computed(() => ({
  high: props.levelCounts.high || 0, normal: props.levelCounts.normal || 0,
  weak: props.levelCounts.weak || 0, none: props.levelCounts.none || 0,
}))

const insightText = computed(() => {
  const total = counts.value.high + counts.value.normal + counts.value.weak + counts.value.none
  const responding = counts.value.high + counts.value.normal
  if (responding >= 20) return `全国${responding}省响应度≥1.0，减量增效态势良好。`
  if (counts.value.none > 10) return `⚠ ${counts.value.none}省未响应，需加大推动力度。`
  return `${responding}/${total}省响应度高于全国均值，转型仍在进行中。`
})

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
  high: '#1EC96B', normal: '#2B9EED', weak: '#F5B642', none: '#F0473C', unknown: '#BFB5A5'
}

function buildMapOption(geoJson: any) {
  echarts.registerMap('china', geoJson)
  const mapData = props.provinces.map(p => ({
    name: nameMap[p.name] || p.name,
    value: p.responseDegree !== null ? Math.round(p.responseDegree * 100) / 100 : -1,
    level: p.responseLevel,
    fertRate: p.fertReductionRate !== null ? Math.round(p.fertReductionRate * 10000) / 100 : null,
  }))
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.94)',
      borderColor: 'rgba(30,201,107,0.5)',
      borderWidth: 1,
      textStyle: { color: '#4A3528', fontSize: 13, fontWeight: 500 },
      extraCssText: 'border-radius:8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 10px 14px;',
      formatter: (p: any) => {
        if (!p.data || p.data.value === -1) return `<b>${p.name}</b><br/><span style="color:#A09888">数据暂缺</span>`
        const lvlMap: Record<string,string> = { high:'高度响应', normal:'正常', weak:'弱响应', none:'未响应' }
        const lvlColor: Record<string,string> = { high:'#1EC96B', normal:'#2B9EED', weak:'#F5B642', none:'#F0473C' }
        const lvl = p.data.level || 'unknown'
        return `<div style="font-size:15px;font-weight:700;margin-bottom:6px">${p.name}</div>
          <div style="line-height:1.8;font-size:12px">
            响应度：<b style="color:${lvlColor[lvl] || '#666'}">${p.data.value}</b><br/>
            化肥减量率：<b>${p.data.fertRate ?? '--'}%</b><br/>
            等级：<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${lvlColor[lvl] || '#666'};margin-right:4px"></span>${lvlMap[lvl] || '--'}
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
      type: 'map', map: 'china', roam: false, zoom: 1.4,
      top: '20%', left: 'center', width: 'auto', height: 'auto',
      label: { show: false },
      itemStyle: {
        borderColor: 'rgba(30,201,107,0.35)',
        borderWidth: 1,
        areaColor: '#FFFBF5',
        shadowBlur: 0,
        shadowColor: 'transparent',
      },
      emphasis: {
        scale: 1.5,
        label: {
          show: true,
          color: '#4A3528',
          fontSize: 12,
          fontWeight: 'bold',
        },
        itemStyle: {
          borderColor: '#F5B642',
          borderWidth: 3,
          shadowBlur: 16,
          shadowColor: 'rgba(245,182,66,0.4)',
          shadowOffsetX: 0,
          shadowOffsetY: 0,
        },
      },
      select: {
        disabled: true,
      },
      data: mapData, nameMap: {},
    }]
  }
}

onMounted(() => {
  if (!mapContainer.value) return
  chart = echarts.init(mapContainer.value)
  fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
    .then(r => r.json()).then(geoJson => { if (chart) chart.setOption(buildMapOption(geoJson)) })
    .catch(() => {
      fetch('https://geo.datav.aliyun.com/areas_v3/bound/geojson/china.json')
        .then(r => r.json()).then(geoJson => { if (chart) chart.setOption(buildMapOption(geoJson)) })
    })
})
onUnmounted(() => { chart?.dispose() })
</script>

<style scoped>
.module { display: flex; flex-direction: column; height: 100%; }
.module-title { font-family: 'Noto Serif SC', 'STSong', serif; font-size: 14px; font-weight: 600; color: #4A3528; padding-bottom: 6px; border-bottom: 1px solid rgba(139, 196, 161, 0.2); flex-shrink: 0; }
.chart-wrap { flex: 1; min-height: 0; }
.insight { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding-top: 4px; font-size: 12px; font-family: 'Noto Serif SC', 'Microsoft YaHei', serif; font-weight: 600; color: #4A3528; border-top: 1px solid rgba(139, 196, 161, 0.15); flex-shrink: 0; }
.insight-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.insight-dot.green { background: #1EC96B; } .insight-dot.blue { background: #2B9EED; }
.insight-dot.orange { background: #F5B642; } .insight-dot.red { background: #F0473C; }
.insight-text { margin-left: auto; color: #4A3528; font-style: italic; font-size: 12px; font-family: 'Noto Serif SC', 'Microsoft YaHei', serif; font-weight: 600; }
</style>
