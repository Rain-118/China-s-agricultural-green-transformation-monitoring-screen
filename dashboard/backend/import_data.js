import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_BASE = path.resolve(__dirname, '..', '..');
const PROV_DATA = path.join(DATA_BASE, '分省数据', '数据');

// --------------- helper ---------------
function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parse(raw, { skip_empty_lines: true, relax_column_count: true });
}

function safeFloat(v) {
  if (!v || v.trim() === '') return null;
  const n = Number(v.replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

// Province name normalization
const NAME_MAP = {
  '北京市': '北京', '天津市': '天津', '河北省': '河北', '山西省': '山西',
  '内蒙古自治区': '内蒙古', '辽宁省': '辽宁', '吉林省': '吉林', '黑龙江省': '黑龙江',
  '上海市': '上海', '江苏省': '江苏', '浙江省': '浙江', '安徽省': '安徽',
  '福建省': '福建', '江西省': '江西', '山东省': '山东', '河南省': '河南',
  '湖北省': '湖北', '湖南省': '湖南', '广东省': '广东', '广西壮族自治区': '广西',
  '海南省': '海南', '重庆市': '重庆', '四川省': '四川', '贵州省': '贵州',
  '云南省': '云南', '西藏自治区': '西藏', '陕西省': '陕西', '甘肃省': '甘肃',
  '青海省': '青海', '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆',
};

const PROVINCES = Object.keys(NAME_MAP);

// --------------- parser for consolidated CSVs (rows=provinces, col0=地区) ---------------
function parseConsolidated(rows, category, indicator) {
  const records = [];
  const header = rows[0]; // first row is metadata
  // find the year-header row
  let yearRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].includes('地区')) { yearRow = i; break; }
  }
  if (yearRow < 0) {
    // Try without 地区 — some files use different format
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === '地区') { yearRow = i; break; }
    }
  }
  if (yearRow < 0) {
    console.warn(`  ⚠ Cannot find header row for ${category}/${indicator}`);
    return records;
  }
  const yrHeader = rows[yearRow];
  // Map col index -> year
  const colYear = {};
  for (let c = 1; c < yrHeader.length; c++) {
    const m = yrHeader[c] ? yrHeader[c].match(/(\d{4})/) : null;
    if (m) colYear[c] = parseInt(m[1]);
  }
  // Data rows
  for (let i = yearRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || row[0].startsWith('注：') || row[0].startsWith('数据来源')) continue;
    const provRaw = row[0].trim();
    const prov = NAME_MAP[provRaw] || provRaw;
    if (!PROVINCES.includes(provRaw)) continue;
    for (const [c, year] of Object.entries(colYear)) {
      const v = safeFloat(row[parseInt(c)]);
      if (v !== null) {
        records.push({ province: prov, year, category, indicator, value: v });
      }
    }
  }
  return records;
}

// --------------- parser for individual province CSVs (rows=indicators, filename=province) ---------------
function parseProvinceFile(rows, province, indicatorsToExtract) {
  const records = [];
  // find year-header row (the row whose first column contains "指标" or similar)
  let yearRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] && (rows[i][0].includes('指标') || rows[i][0] === '指标')) {
      yearRow = i; break;
    }
  }
  if (yearRow < 0) return records;
  const yrHeader = rows[yearRow];
  const colYear = {};
  for (let c = 1; c < yrHeader.length; c++) {
    const m = yrHeader[c] ? yrHeader[c].match(/(\d{4})/) : null;
    if (m) colYear[c] = parseInt(m[1]);
  }
  // Process each data row
  for (let i = yearRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || row[0].startsWith('注：') || row[0].startsWith('数据来源')) continue;
    const rawName = row[0].trim();
    // match against our extraction list
    for (const [pattern, category, indicator] of indicatorsToExtract) {
      if (rawName.includes(pattern)) {
        for (const [c, year] of Object.entries(colYear)) {
          const v = safeFloat(row[parseInt(c)]);
          if (v !== null) {
            records.push({ province, year, category, indicator, value: v });
          }
        }
        break;
      }
    }
  }
  return records;
}

// --------------- main import ---------------
async function main() {
  // Connect without database first, then create it
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '666666', charset: 'utf8mb4', multipleStatements: true
  });
  const schemaSql = fs.readFileSync('./schema.sql', 'utf-8');
  await conn.query(schemaSql);
  await conn.end();

  const pool = mysql.createPool({
    host: 'localhost', user: 'root', password: '666666',
    database: 'agriculture_green', waitForConnections: true, connectionLimit: 5, charset: 'utf8mb4'
  });

  const BATCH_SIZE = 500;

  async function insertBatch(records) {
    if (records.length === 0) return;
    const sql = `INSERT IGNORE INTO indicator_data (province, year, category, indicator, value) VALUES ?`;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE).map(r => [r.province, r.year, r.category, r.indicator, r.value]);
      await pool.query(sql, [batch]);
    }
  }

  let totalInserted = 0;

  // ========== 1. CONSOLIDATED CSV FILES ==========
  const consolidatedFiles = [
    { dir: '农用化肥施用折纯量', file: '农用化肥施用折纯量 (万吨).csv', cat: 'fertilizer', ind: 'total' },
    { dir: '农用化肥施用折纯量', file: '农用氮肥施用折纯量 (万吨).csv', cat: 'fertilizer', ind: 'n' },
    { dir: '农用化肥施用折纯量', file: '农用磷肥施用折纯量 (万吨).csv', cat: 'fertilizer', ind: 'p' },
    { dir: '农用化肥施用折纯量', file: '农用钾肥施用折纯量 (万吨).csv', cat: 'fertilizer', ind: 'k' },
    { dir: '农用化肥施用折纯量', file: '农用复合肥施用折纯量 (万吨).csv', cat: 'fertilizer', ind: 'compound' },
    { dir: '农药使用量', file: '农药使用量 (万吨).csv', cat: 'pesticide', ind: 'usage' },
    { dir: '农用塑料薄膜使用量', file: '农用塑料薄膜使用量 (吨).csv', cat: 'plastic_film', ind: 'usage' },
    { dir: '农业机械总动力', file: '农业机械总动力 (万千瓦).csv', cat: 'machinery', ind: 'power' },
    { dir: '有效灌溉面积', file: '有效灌溉面积 (千公顷).csv', cat: 'irrigation', ind: 'area' },
    { dir: '农村用电量', file: '农村用电量 (亿千瓦小时).csv', cat: 'electricity', ind: 'rural_usage' },
    { dir: '农村发电量', file: '农村发电量 (万千瓦时).csv', cat: 'power_gen', ind: 'rural' },
    { dir: '农村居民人均可支配收入', file: '农村居民人均可支配收入 (元).csv', cat: 'income', ind: 'disposable' },
    { dir: '农村居民人均消费支出', file: '农村居民人均消费支出 (元).csv', cat: 'consumption', ind: 'expenditure' },
    { dir: '人口', file: '城镇人口 (万人).csv', cat: 'population', ind: 'urban' },
    { dir: '人口', file: '乡村人口 (万人).csv', cat: 'population', ind: 'rural' },
  ];

  for (const { dir, file, cat, ind } of consolidatedFiles) {
    const fp = path.join(PROV_DATA, dir, file);
    if (!fs.existsSync(fp)) { console.log(`  ✗ Missing: ${dir}/${file}`); continue; }
    const rows = readCsv(fp);
    const records = parseConsolidated(rows, cat, ind);
    await insertBatch(records);
    totalInserted += records.length;
    console.log(`  ✓ ${cat}/${ind}: ${records.length} rows`);
  }

  // ========== 2. INDIVIDUAL PROVINCE CSV FILES ==========

  // 2a. 粮食产量
  const grainIndicators = [
    ['粮食产量 (万吨)', 'grain', 'yield'],
    ['夏收粮食产量', 'grain', 'summer'],
    ['秋粮产量', 'grain', 'autumn'],
    ['谷物产量', 'grain', 'cereal'],
    ['稻谷产量', 'grain', 'rice'],
    ['小麦产量', 'grain', 'wheat'],
    ['玉米产量', 'grain', 'corn'],
    ['豆类产量', 'grain', 'beans'],
    ['薯类产量', 'grain', 'tubers'],
    ['蔬菜产量', 'grain', 'vegetables'],
  ];
  await processProvinceDir('粮食产量', grainIndicators);

  // 2b. 农作物播种面积
  const areaIndicators = [
    ['农作物总播种面积', 'plant_area', 'total'],
    ['粮食作物播种面积', 'plant_area', 'grain'],
    ['谷物播种面积', 'plant_area', 'cereal'],
    ['稻谷播种面积', 'plant_area', 'rice'],
    ['小麦播种面积', 'plant_area', 'wheat'],
    ['玉米播种面积', 'plant_area', 'corn'],
    ['豆类播种面积', 'plant_area', 'beans'],
    ['薯类播种面积', 'plant_area', 'tubers'],
    ['蔬菜播种面积', 'plant_area', 'vegetables'],
    ['油料播种面积', 'plant_area', 'oil_crops'],
    ['棉花播种面积', 'plant_area', 'cotton'],
  ];
  await processProvinceDir('农作物播种面积', areaIndicators);

  // 2c. 农林牧渔业
  const agriIndicators = [
    ['农林牧渔业总产值 (亿元)', 'agri_output', 'total'],
    ['农业总产值 (亿元)', 'agri_output', 'farming'],
    ['林业总产值 (亿元)', 'agri_output', 'forestry'],
    ['牧业总产值 (亿元)', 'agri_output', 'animal'],
    ['渔业总产值 (亿元)', 'agri_output', 'fishery'],
  ];
  await processProvinceDir('农林牧渔业', agriIndicators);

  // 2d. 第一产业增加值GDP比重
  const gdpIndicators = [
    ['地区生产总值 (亿元)', 'gdp', 'total'],
    ['第一产业增加值 (亿元)', 'gdp', 'first_industry'],
    ['人均地区生产总值', 'gdp', 'per_capita'],
  ];
  await processProvinceDir('第一产业增加值GDP比重', gdpIndicators);

  async function processProvinceDir(dirName, indicators) {
    const dir = path.join(PROV_DATA, dirName);
    if (!fs.existsSync(dir)) { console.log(`  ✗ Missing dir: ${dirName}`); return; }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.csv'));
    for (const file of files) {
      const provRaw = file.replace('.csv', '');
      const prov = NAME_MAP[provRaw] || provRaw;
      if (!PROVINCES.includes(provRaw)) {
        console.warn(`  ⚠ Unknown province: ${provRaw}`);
        continue;
      }
      const rows = readCsv(path.join(dir, file));
      const records = parseProvinceFile(rows, prov, indicators);
      await insertBatch(records);
      totalInserted += records.length;
    }
    console.log(`  ✓ ${dirName}: processed ${files.length} provinces`);
  }

  // ========== 3. NATIONAL CSV FILES (全国汇总数据) ==========
  const NATIONAL_DIR = path.join(DATA_BASE, '全国数据', '全国数据');

  function parseNationalCsv(filePath) {
    const rows = readCsv(filePath);
    let hdrRow = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] && rows[i][0].includes('指标')) { hdrRow = i; break; }
    }
    if (hdrRow < 0) return [];
    const yrRow = rows[hdrRow];
    const colYear = {};
    for (let c = 1; c < yrRow.length; c++) {
      const m = yrRow[c] ? yrRow[c].match(/(\d{4})/) : null;
      if (m) colYear[c] = parseInt(m[1]);
    }
    const records = [];
    for (let i = hdrRow + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || row[0].startsWith('数据来源')) continue;
      const rawName = row[0].trim();
      let category, indicator;
      if (rawName.startsWith('农用化肥施用折纯量') && !rawName.includes('氮') && !rawName.includes('磷') && !rawName.includes('钾') && !rawName.includes('复合')) {
        category = 'fertilizer'; indicator = 'total';
      } else if (rawName.startsWith('农作物总播种面积')) {
        category = 'plant_area'; indicator = 'total';
      } else if (rawName.startsWith('农林牧渔业总产值') && !rawName.includes('指数')) {
        category = 'agri_output'; indicator = 'total';
      } else {
        continue;
      }
      for (const [c, year] of Object.entries(colYear)) {
        const v = safeFloat(row[parseInt(c)]);
        if (v !== null) {
          records.push({ province: '全国', year, category, indicator, value: v });
        }
      }
    }
    return records;
  }

  const nationalFiles = [
    '全国化肥施用折用量.csv',
    '全国播种面积.csv',
    '全国农林牧渔业.csv',
  ];
  for (const fn of nationalFiles) {
    const fp = path.join(NATIONAL_DIR, fn);
    if (!fs.existsSync(fp)) { console.log(`  ✗ Missing: ${fn}`); continue; }
    const records = parseNationalCsv(fp);
    await insertBatch(records);
    totalInserted += records.length;
    console.log(`  ✓ 全国/${fn}: ${records.length} rows`);
  }

  await pool.end();
  console.log(`\n✅ Import complete. Total records: ${totalInserted}`);
}

main().catch(err => { console.error(err); process.exit(1); });
