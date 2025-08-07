import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Servir les fichiers statiques avec cache approprié
app.use(express.static(join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: false
}));

// Gérer toutes les routes pour les Single Page Applications
app.get('*', (req, res) => {
  // Empêcher la mise en cache de index.html pour les routes SPA
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${port}`);
  console.log(`📱 SPA routes handled correctly for React Router`);
  console.log(`🔄 Cache headers configured for proper SPA routing`);
});