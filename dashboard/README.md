# 中国农业绿色转型监测大屏

> **政策驱动 · 数据见证 —— 化肥减量增效与农业高质量发展**

基于 Vue 3 + TypeScript + ECharts 5 的大屏可视化系统，展示 2016-2024 年中国 31 省化肥减量政策的响应度与农业绿色转型成效。

---

## 项目结构

```
dashboard/
├── backend/                     # Node.js + Express 后端
│   ├── server.js                # 入口，端口 3001
│   ├── db.js                    # MySQL 连接池
│   ├── routes/api.js            # API 路由 + 聚合计算
│   ├── import_data.js           # CSV → MySQL 导入脚本
│   └── package.json
├── frontend/                    # Vue 3 + Vite 前端
│   ├── src/
│   │   ├── App.vue              # 主布局 + 全局样式
│   │   ├── api.ts               # 前端 API 层
│   │   ├── main.ts              # 入口
│   │   └── components/
│   │       ├── PolicyTimeline.vue       # 政策时间轴
│   │       ├── Module1InputReduction.vue # 模块1：投入减量响应度（中国地图）
│   │       ├── Module2OutputSecurity.vue # 模块2：产出保障响应度
│   │       ├── Module3Substitution.vue   # 模块3：替代机制响应度
│   │       ├── Module4Economy.vue        # 模块4：经济响应度
│   │       ├── Module5Efficiency.vue     # 模块5：效率响应度（雷达图）
│   │       └── Module6Recommendation.vue # 模块6：促进建议（省份仪表盘）
│   ├── public/                  # 静态资源（背景图片等）
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── setup.bat                   # 一键安装启动脚本
└── README.md
```

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 + Composition API | 3.4 |
| 类型系统 | TypeScript | 5.4 |
| 构建工具 | Vite | 5.1 |
| 图表库 | ECharts (含 echarts-gl) | 5.5 |
| HTTP 客户端 | Axios | 1.6 |
| 后端框架 | Express.js | 4.18 |
| 数据库 | MySQL | 8.0+ |
| 数据库驱动 | mysql2 | 3.9 |
| 数据解析 | csv-parse | 5.5 |

---

## 快速启动

### 环境要求

- Node.js 18+
- MySQL 8.0+（需创建数据库 `agriculture_green`）
- npm 或 yarn

### 1. 数据库初始化

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS agriculture_green CHARACTER SET utf8mb4"

# 导入数据（从 CSV 读取写入 MySQL）
cd backend
npm install
npm run import
```

### 2. 配置数据库连接

编辑 `backend/db.js`，修改用户名密码：
```js
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password',   // 修改为实际密码
  database: 'agriculture_green',
});
```

### 3. 启动后端

```bash
cd backend
npm start
# → API 运行在 http://localhost:3001
```

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
# → 大屏运行在 http://localhost:5173
```

### 4. 一键启动 (Windows)

```bash
setup.bat
```

---

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/dashboard` | GET | 主仪表盘数据（18类指标 + 衍生计算） |
| `/api/national-economy` | GET | 全国亩均施肥量/产值数据 |
| `/api/province/:name` | GET | 单省详细数据 |
| `/api/historical/:category` | GET | 农药/农膜历史数据 |
| `/health` | GET | 健康检查 |

---

## 模块说明

| 模块 | 标题 | 图表类型 | 数据说明 |
|------|------|---------|---------|
| **模块1** | 投入减量响应度 | 中国省级地图 + 冲击波动画 | `响应度 = 省减量率 ÷ 全国减量率`（2016基线） |
| **模块2** | 产出保障响应度 | 双轴折线图 | 全国化肥总量(↓) vs 粮食产量(↑) |
| **模块3** | 替代机制响应度 | 堆叠面积图 + 机械折线 | N/P/K/复合肥结构变化 + 机械总动力 |
| **模块4** | 经济响应度 | 双轴柱状图 | 亩均施肥量 vs 亩均产值（全国数据） |
| **模块5** | 效率响应度 | 七区域雷达图（6维） | 肥料利用率/养分留存/节水/污染/酸化/板结 |
| **模块6** | 促进建议 | 31省色块网格 | 综合响应度排名（与模块1联动） |
| **时间轴** | 政策驱动 | 5节点可点击 | 2015/2017/2021/2022/2024，切换年份联动全模块 |

### 响应度分级

| 等级 | 范围 | 颜色 |
|------|------|------|
| 高度响应 | ≥ 1.5 | 🟢 `#1EC96B` |
| 正常 | 1.0 ~ 1.5 | 🔵 `#2B9EED` |
| 弱响应 | 0.5 ~ 1.0 | 🟠 `#F5B642` |
| 未响应 | < 0.5 | 🔴 `#F0473C` |

---

## 数据源

来自国家统计局分省年度数据（2016-2024），存储于 MySQL 数据库 `agriculture_green`，包含：

| 数据类别 | 使用模块 |
|---------|---------|
| 农用化肥施用折纯量（总量/N/P/K/复合肥） | 模块1/2/3/5/6 |
| 粮食产量 | 模块2/5 |
| 农作物播种面积 | 模块4 |
| 农业机械总动力 | 模块3/5 |
| 有效灌溉面积 | 模块5 |
| 农林牧渔业总产值 | 模块4 |
| 农村居民人均可支配收入/消费支出 | 后端衍生计算 |
| 人口（城镇/乡村） | 后端衍生计算 |

---

## 交互功能

- **时间轴联动**：点击年份 → 全部模块数据自动过滤至选中年
- **冲击波动画**：年份切换时以北京为原点，声呐波纹扩散逐省点亮
- **地图缩放**：滚轮缩放 + 拖拽平移，范围 0.8×~8×
- **图例筛选**：点击图例级别 → 地图省份 + 模块6色块同步显隐
- **卡片弹出**：hover 卡片顶部横条 → 点击放大为全屏浮窗
- **雷达图筛选**：模块5 底部图例点击 toggle 区域
- **模块背景闪烁**：模块2/3/4/5 荧光蓝边框 + 3秒呼吸动画

---

## CSS 主题

| 层级 | 说明 |
|------|------|
| 背景 | `#FFFBF5` 马卡龙暖白底 + 田园光斑 + 用户自定义图片 + 半透明渐变 |
| 标题栏 | 梯形镂空 sci-fi 风格，半透明深蓝毛玻璃 + 淡蓝霓虹发光边框 |
| 模块卡片 | `rgba(255,251,245,0.5)` 半透明 + 荧光蓝边框呼吸动画 |
| 数据色 | 高饱和四色：绿 `#1EC96B` / 蓝 `#2B9EED` / 金 `#F5B642` / 红 `#F0473C` |
| 字体 | Noto Serif SC (思源宋体) + DIN Pro / Consolas (等宽数字) |
