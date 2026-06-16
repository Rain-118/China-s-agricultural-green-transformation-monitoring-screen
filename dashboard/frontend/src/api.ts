import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export interface ProvinceData {
  name: string
  fertilizer: Record<number, number>
  fertilizerN: Record<number, number>
  fertilizerP: Record<number, number>
  fertilizerK: Record<number, number>
  fertilizerCompound: Record<number, number>
  grain: Record<number, number>
  plantTotal: Record<number, number>
  plantGrain: Record<number, number>
  machinery: Record<number, number>
  irrigation: Record<number, number>
  electricity: Record<number, number>
  agriOutput: Record<number, number>
  income: Record<number, number>
  consumption: Record<number, number>
  popUrban: Record<number, number>
  popRural: Record<number, number>
  gdpTotal: Record<number, number>
  gdpFirst: Record<number, number>
  fertReductionRate: number | null
  grainIncreaseRate: number | null
  machIncreaseRate: number | null
  agriOutputChangeRate: number | null
  incomeIncreaseRate: number | null
  efficiency: number | null
  efficiencyChangeRate: number | null
  responseDegree: number | null
  responseLevel: 'high' | 'normal' | 'weak' | 'none' | 'unknown'
}

export interface QuadrantItem {
  name: string
  x: number
  y: number
  quadrant: string
  responseLevel: string
}

export interface BubbleItem {
  name: string
  x: number
  y: number
  size: number
  responseLevel: string
}

export interface EfficiencyItem {
  rank: number
  name: string
  efficiency: number
  efficiencyChangeRate: number | null
  direction: string | null
}

export interface ResponseItem {
  name: string
  responseDegree: number
  responseLevel: string
  fertReductionRate: number
  grainIncreaseRate: number
}

export interface Suggestion {
  type: 'warning' | 'push' | 'success'
  title: string
  detail: string
}

export interface DashboardData {
  success: boolean
  years: number[]
  nationalFertilizerTrend: { year: number; value: number }[]
  nationalGrainTrend: { year: number; value: number }[]
  nationalFertReductionRate: number | null
  nationalGrainIncreaseRate: number | null
  fertStructure: { year: number; n: number; p: number; k: number; compound: number }[]
  provinces: ProvinceData[]
  quadrantData: QuadrantItem[]
  bubbleData: BubbleItem[]
  efficiencyRanking: EfficiencyItem[]
  responseDashboard: ResponseItem[]
  levelCounts: Record<string, number>
  suggestions: Suggestion[]
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get('/dashboard')
  return data
}

export interface NationalEconomyItem {
  year: number
  fertPerMu: number | null
  incomePerMu: number | null
  fertTotal: number | null
  plantArea: number | null
  agriTotal: number | null
}

export async function fetchNationalEconomy(): Promise<NationalEconomyItem[]> {
  const { data } = await api.get('/national-economy')
  return data.data
}
