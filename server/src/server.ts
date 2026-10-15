import express from 'express';
import cors from 'cors';
import path from 'path';
import { apiRouter } from './routes/api.routes';

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API routes
app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), service: 'TiendaRegalos-API' });
});

// ── Serve frontend in production ─────────────────────────────────────────────
// The compiled Vite build lives at <root>/client/dist
// __dirname in dist/server.js = <root>/server/dist
// so we go up two levels to reach <root>/client/dist
if (isProduction) {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));

  // SPA fallback — any non-API route returns index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🎁 Tienda de Regalos & Personalizados POS Server running on http://localhost:${PORT}`);
  console.log(`🪙 Multi-currency rates active (GS, BRL, USD)`);
  console.log(`📄 Módulo de Presupuestos y Generador PDF A4 activo`);
  console.log(`🌍 Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
});
