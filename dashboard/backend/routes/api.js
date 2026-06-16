import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Helper: query indicator data
async function queryIndicator(category, indicator, years = [2021, 2022, 2023, 2024]) {
  const [rows] = await pool.query(
    `SELECT province, year, value FROM indicator_data
     WHERE category = ? AND indicator = ? AND year IN (?) ORDER BY province, year`,
    [category, indicator, years]
  );
  return rows;
}

// Helper: pivot data by province
function pivotByProvince(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.province]) map[r.province] = {};
    map[r.province][r.year] = r.value;
  }
  return map;
}

// Helper: get all provinces' data for a category+indicator for a given year
async function getYearMap(category, indicator, year) {
  const [rows] = await pool.query(
    `SELECT province, value FROM indicator_data WHERE category=? AND indicator=? AND year=?`,
    [category, indicator, year]
  );
  const m = {};
  for (const r of rows) m[r.province] = r.value;
  return m;
}

// ==================== MAIN DASHBOARD ENDPOINT ====================
router.get('/dashboard', async (req, res) => {
  try {
    const years = [2021, 2022, 2023, 2024];
    const PROVINCES = ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆'];

    // Fetch all data in parallel
    const [
      fertTotal, fertN, fertP, fertK, fertCompound,
      grainYield, plantTotal, plantGrain,
      machinery, irrigation, electricity,
      agriOutput, income, consumption,
      popUrban, popRural, gdpTotal, gdpFirst,
    ] = await Promise.all([
      queryIndicator('fertilizer', 'total', years),
      queryIndicator('fertilizer', 'n', years),
      queryIndicator('fertilizer', 'p', years),
      queryIndicator('fertilizer', 'k', years),
      queryIndicator('fertilizer', 'compound', years),
      queryIndicator('grain', 'yield', years),
      queryIndicator('plant_area', 'total', years),
      queryIndicator('plant_area', 'grain', years),
      queryIndicator('machinery', 'power', years),
      queryIndicator('irrigation', 'area', years),
      queryIndicator('electricity', 'rural_usage', years),
      queryIndicator('agri_output', 'total', years),
      queryIndicator('income', 'disposable', years),
      queryIndicator('consumption', 'expenditure', years),
      queryIndicator('population', 'urban', years),
      queryIndicator('population', 'rural', years),
      queryIndicator('gdp', 'total', years),
      queryIndicator('gdp', 'first_industry', years),
    ]);

    const pivot = (rows) => pivotByProvince(rows);

    const fTotal = pivot(fertTotal);
    const fN = pivot(fertN); const fP = pivot(fertP);
    const fK = pivot(fertK); const fCompound = pivot(fertCompound);
    const gYield = pivot(grainYield);
    const pTotal = pivot(plantTotal);
    const pGrain = pivot(plantGrain);
    const mach = pivot(machinery);
    const irrig = pivot(irrigation);
    const elec = pivot(electricity);
    const agri = pivot(agriOutput);
    const inc = pivot(income);
    const cons = pivot(consumption);
    const pUrban = pivot(popUrban);
    const pRural = pivot(popRural);
    const gdpT = pivot(gdpTotal);
    const gdpF = pivot(gdpFirst);

    // national aggregates
    const natFertTotal = {}; const natGrainYield = {};
    for (const y of years) {
      natFertTotal[y] = PROVINCES.reduce((s, p) => s + ((fTotal[p] && fTotal[p][y]) || 0), 0);
      natGrainYield[y] = PROVINCES.reduce((s, p) => s + ((gYield[p] && gYield[p][y]) || 0), 0);
    }

    // per-province computed indicators
    const provincesData = PROVINCES.map(prov => {
      const f21 = (fTotal[prov] && fTotal[prov][2021]) || null;
      const f24 = (fTotal[prov] && fTotal[prov][2024]) || null;
      const g21 = (gYield[prov] && gYield[prov][2021]) || null;
      const g24 = (gYield[prov] && gYield[prov][2024]) || null;
      const m21 = (mach[prov] && mach[prov][2021]) || null;
      const m24 = (mach[prov] && mach[prov][2024]) || null;
      const ag21 = (agri[prov] && agri[prov][2021]) || null;
      const ag24 = (agri[prov] && agri[prov][2024]) || null;
      const inc21 = (inc[prov] && inc[prov][2021]) || null;
      const inc24 = (inc[prov] && inc[prov][2024]) || null;

      const fertReductionRate = f21 && f24 ? ((f21 - f24) / f21) : null;
      const grainIncreaseRate = g21 && g24 ? ((g24 - g21) / g21) : null;
      const machIncreaseRate = m21 && m24 ? ((m24 - m21) / m21) : null;
      const agriOutputChangeRate = ag21 && ag24 ? ((ag24 - ag21) / ag21) : null;
      const incomeIncreaseRate = inc21 && inc24 ? ((inc24 - inc21) / inc21) : null;

      // 效率: 粮食产量 / 化肥施用量
      const eff21 = f21 && g21 ? (g21 * 10000 / f21) : null;
      const eff24 = f24 && g24 ? (g24 * 10000 / f24) : null;
      const efficiencyChangeRate = eff21 && eff24 ? ((eff24 - eff21) / eff21) : null;

      // 综合响应度 (综合减量率归一化)
      const natFertReduction = natFertTotal[2021] && natFertTotal[2024] ? ((natFertTotal[2021] - natFertTotal[2024]) / natFertTotal[2021]) : 0;
      const responseDegree = fertReductionRate !== null && natFertReduction ? (fertReductionRate / natFertReduction) : null;

      return {
        name: prov,
        fertilizer: fTotal[prov] || {},
        fertilizerN: fN[prov] || {},
        fertilizerP: fP[prov] || {},
        fertilizerK: fK[prov] || {},
        fertilizerCompound: fCompound[prov] || {},
        grain: gYield[prov] || {},
        plantTotal: pTotal[prov] || {},
        plantGrain: pGrain[prov] || {},
        machinery: mach[prov] || {},
        irrigation: irrig[prov] || {},
        electricity: elec[prov] || {},
        agriOutput: agri[prov] || {},
        income: inc[prov] || {},
        consumption: cons[prov] || {},
        popUrban: pUrban[prov] || {},
        popRural: pRural[prov] || {},
        gdpTotal: gdpT[prov] || {},
        gdpFirst: gdpF[prov] || {},
        fertReductionRate,
        grainIncreaseRate,
        machIncreaseRate,
        agriOutputChangeRate,
        incomeIncreaseRate,
        efficiency: eff24,
        efficiencyChangeRate,
        responseDegree,
        // response level
        responseLevel: responseDegree === null ? 'unknown' :
          responseDegree >= 1.5 ? 'high' :
          responseDegree >= 1.0 ? 'normal' :
          responseDegree >= 0.5 ? 'weak' : 'none',
      };
    });

    // national fertilizer structure by year
    const fertStructure = years.map(y => {
      const n = PROVINCES.reduce((s, p) => s + ((fN[p] && fN[p][y]) || 0), 0);
      const p = PROVINCES.reduce((s, pv) => s + ((fP[pv] && fP[pv][y]) || 0), 0);
      const k = PROVINCES.reduce((s, pv) => s + ((fK[pv] && fK[pv][y]) || 0), 0);
      const comp = PROVINCES.reduce((s, pv) => s + ((fCompound[pv] && fCompound[pv][y]) || 0), 0);
      return { year: y, n: Math.round(n * 100) / 100, p: Math.round(p * 100) / 100, k: Math.round(k * 100) / 100, compound: Math.round(comp * 100) / 100 };
    });

    // national rates
    const natFertReductionRate = natFertTotal[2021] && natFertTotal[2024] ? Math.round(((natFertTotal[2021] - natFertTotal[2024]) / natFertTotal[2021]) * 10000) / 100 : null;
    const natGrainIncreaseRate = natGrainYield[2021] && natGrainYield[2024] ? Math.round(((natGrainYield[2024] - natGrainYield[2021]) / natGrainYield[2021]) * 10000) / 100 : null;

    // quadrant data for module 2
    const quadrantData = provincesData
      .filter(p => p.fertReductionRate !== null && p.grainIncreaseRate !== null)
      .map(p => ({
        name: p.name,
        x: Math.round(p.fertReductionRate * 10000) / 100,
        y: Math.round(p.grainIncreaseRate * 10000) / 100,
        quadrant: p.fertReductionRate > 0 && p.grainIncreaseRate > 0 ? 'green' :
                  p.fertReductionRate <= 0 && p.grainIncreaseRate > 0 ? 'blue' :
                  p.fertReductionRate > 0 && p.grainIncreaseRate <= 0 ? 'red' : 'orange',
        responseLevel: p.responseLevel,
      }));

    // bubble data for module 4
    const bubbleData = provincesData
      .filter(p => p.fertReductionRate !== null && p.agriOutputChangeRate !== null && p.incomeIncreaseRate !== null)
      .map(p => ({
        name: p.name,
        x: Math.round(p.fertReductionRate * 10000) / 100,
        y: Math.round(p.agriOutputChangeRate * 10000) / 100,
        size: Math.round(p.incomeIncreaseRate * 10000) / 100,
        responseLevel: p.responseLevel,
      }));

    // response level counts
    const levelCounts = { high: 0, normal: 0, weak: 0, none: 0, unknown: 0 };
    for (const p of provincesData) { levelCounts[p.responseLevel]++; }

    // efficiency ranking (module 5)
    const efficiencyRanking = provincesData
      .filter(p => p.efficiency !== null)
      .sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0))
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        efficiency: Math.round(p.efficiency * 100) / 100,
        efficiencyChangeRate: p.efficiencyChangeRate !== null ? Math.round(p.efficiencyChangeRate * 10000) / 100 : null,
        direction: p.efficiencyChangeRate !== null ? (p.efficiencyChangeRate > 0 ? 'up' : 'down') : null,
      }));

    // response dashboard (module 6)
    const responseDashboard = provincesData
      .filter(p => p.responseDegree !== null)
      .sort((a, b) => (b.responseDegree || 0) - (a.responseDegree || 0))
      .map(p => ({
        name: p.name,
        responseDegree: p.responseDegree !== null ? Math.round(p.responseDegree * 100) / 100 : null,
        responseLevel: p.responseLevel,
        fertReductionRate: p.fertReductionRate !== null ? Math.round(p.fertReductionRate * 10000) / 100 : null,
        grainIncreaseRate: p.grainIncreaseRate !== null ? Math.round(p.grainIncreaseRate * 10000) / 100 : null,
      }));

    // Generate suggestions (module 6)
    const suggestions = generateSuggestions(provincesData);

    res.json({
      success: true,
      years,
      // national trends
      nationalFertilizerTrend: years.map(y => ({ year: y, value: Math.round(natFertTotal[y] * 100) / 100 })),
      nationalGrainTrend: years.map(y => ({ year: y, value: Math.round(natGrainYield[y] * 100) / 100 })),
      nationalFertReductionRate: natFertReductionRate,
      nationalGrainIncreaseRate: natGrainIncreaseRate,
      // fertilizer structure
      fertStructure,
      // provinces
      provinces: provincesData,
      // module data
      quadrantData,
      bubbleData,
      efficiencyRanking,
      responseDashboard,
      levelCounts,
      suggestions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

function generateSuggestions(provinces) {
  const suggestions = [];
  const noneList = provinces.filter(p => p.responseLevel === 'none');
  const weakList = provinces.filter(p => p.responseLevel === 'weak');
  const highList = provinces.filter(p => p.responseLevel === 'high');

  if (noneList.length > 0) {
    const names = noneList.map(p => p.name).join('、');
    suggestions.push({
      type: 'warning',
      title: '未响应省份需专项督导',
      detail: `${names}等${noneList.length}个省份化肥减量响应度<0.5，建议农业农村部开展专项督查，排查减量障碍。`,
    });
  }
  if (weakList.length > 0) {
    const names = weakList.slice(0, 5).map(p => p.name).join('、');
    suggestions.push({
      type: 'push',
      title: '弱响应省份需加大推动力度',
      detail: `${names}等${weakList.length}个省份响应度0.5-1.0，低于全国均值，建议加强技术培训和替代补贴。`,
    });
  }
  if (highList.length > 0) {
    const names = highList.map(p => p.name).join('、');
    suggestions.push({
      type: 'success',
      title: '高度响应省份经验值得推广',
      detail: `${names}等${highList.length}个省份响应度≥1.5，建议总结其减量增效模式，向全国推广。`,
    });
  }
  return suggestions;
}

// ==================== SINGLE PROVINCE DETAIL ====================
router.get('/province/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const [rows] = await pool.query(
      `SELECT category, indicator, year, value FROM indicator_data WHERE province=? AND year BETWEEN 2016 AND 2024 ORDER BY category, indicator, year`,
      [name]
    );
    const data = {};
    for (const r of rows) {
      const key = `${r.category}_${r.indicator}`;
      if (!data[key]) data[key] = {};
      data[key][r.year] = r.value;
    }
    res.json({ success: true, province: name, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== PESTICIDE / PLASTIC FILM HISTORICAL ====================
router.get('/historical/:category', async (req, res) => {
  try {
    const { category } = req.params; // 'pesticide' or 'plastic_film'
    const [rows] = await pool.query(
      `SELECT province, year, value FROM indicator_data WHERE category=? AND year BETWEEN 2016 AND 2020 ORDER BY province, year`,
      [category]
    );
    const map = {};
    for (const r of rows) {
      if (!map[r.province]) map[r.province] = {};
      map[r.province][r.year] = r.value;
    }
    res.json({ success: true, category, data: map });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== NATIONAL ECONOMY DATA (Module 4) ====================
router.get('/national-economy', async (req, res) => {
  try {
    const [fertRows] = await pool.query(
      `SELECT year, value FROM indicator_data WHERE province='全国' AND category='fertilizer' AND indicator='total' AND year BETWEEN 2016 AND 2024 ORDER BY year`
    );
    const [areaRows] = await pool.query(
      `SELECT year, value FROM indicator_data WHERE province='全国' AND category='plant_area' AND indicator='total' AND year BETWEEN 2016 AND 2024 ORDER BY year`
    );
    const [agriRows] = await pool.query(
      `SELECT year, value FROM indicator_data WHERE province='全国' AND category='agri_output' AND indicator='total' AND year BETWEEN 2016 AND 2024 ORDER BY year`
    );

    const fertMap = {}; fertRows.forEach(r => fertMap[r.year] = r.value);
    const areaMap = {}; areaRows.forEach(r => areaMap[r.year] = r.value);
    const agriMap = {}; agriRows.forEach(r => agriMap[r.year] = r.value);

    const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
    const data = years.map(y => {
      const fert = fertMap[y] || null;
      const area = areaMap[y] || null;
      const agri = agriMap[y] || null;
      const fertPerMu = fert && area ? Math.round(fert / area * 666.67 * 10) / 10 : null;
      const incomePerMu = agri && area ? Math.round(agri / area * 6666.67) : null;
      return { year: y, fertPerMu, incomePerMu, fertTotal: fert, plantArea: area, agriTotal: agri };
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
