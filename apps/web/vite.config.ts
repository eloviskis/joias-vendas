import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// Ler versão do package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const appVersion = pkg.version || '0.2.0';

const now = new Date();
const buildDateStr = now.toISOString().split('T')[0];
const buildTimeStr = now.toTimeString().split(' ')[0];

// Usar GIT_HASH do argumento do Docker build, ou fallback para 'dev'
const gitHash = process.env.GIT_HASH || 'dev';

// Versão no formato: v0.2.0-YYYYMMDD-HHMM-githash
const versionCode = `${buildDateStr.replace(/-/g, '')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}-${gitHash}`;

export default defineConfig({
  plugins: [react()],
  server: { 
    proxy: { 
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    } 
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(`v${appVersion}-${versionCode}`),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildDateStr),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTimeStr)
  }
});