import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Vérifier que le dossier dist existe
const distPath = join(__dirname, 'dist');
console.log('🔍 Checking dist path:', distPath);
console.log('🔍 Files in current directory:', readdirSync(__dirname));

if (!existsSync(distPath)) {
  console.error('❌ Dist folder not found at:', distPath);
  console.error('📁 Available directories:', readdirSync(__dirname));
  process.exit(1);
}

const indexPath = join(distPath, 'index.html');
console.log('🔍 Checking index.html at:', indexPath);

if (!existsSync(indexPath)) {
  console.error('❌ index.html not found at:', indexPath);
  console.error('📁 Files in dist:', readdirSync(distPath));
  process.exit(1);
}

// Servir les fichiers statiques avec cache approprié
app.use(express.static(distPath, {
  maxAge: '1d',
  etag: false,
  index: false // Ne pas servir automatiquement index.html
}));

// API health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle static assets properly (not SPA routes)
app.get('/assets/*', (req, res, next) => {
  // Let express.static handle assets
  next();
});

// Gérer toutes les autres routes pour les Single Page Applications
app.get('*', (req, res) => {
  console.log(`📱 Serving SPA route: ${req.url}`);
  
  // Empêcher la mise en cache de index.html pour les routes SPA
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).send('Internal Server Error');
    }
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${port}`);
  console.log(`📱 SPA routes handled correctly for React Router`);
  console.log(`🔄 Cache headers configured for proper SPA routing`);
  console.log(`📁 Serving from: ${distPath}`);
  console.log(`📄 Index file: ${indexPath}`);
});