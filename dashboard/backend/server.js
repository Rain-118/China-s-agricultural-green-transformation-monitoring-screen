import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🌾 Agriculture Dashboard API running at http://localhost:${PORT}`);
});
