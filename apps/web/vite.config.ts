import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const now = new Date();
const buildDateStr = now.toISOString().split('T')[0];
const buildTimeStr = now.toTimeString().split(' ')[0];

// Usar GIT_HASH do argumento do Docker build, ou fallback para 'dev'
const gitHash = process.env.GIT_HASH || 'dev';

// Versão no formato: v1.0.0-YYYYMMDD-HHMM-githash
const versionCode = `${buildDateStr.replace(/-/g, '')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}-${gitHash}`;

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(`v1.0-${versionCode}`),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildDateStr),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTimeStr)
  }
});