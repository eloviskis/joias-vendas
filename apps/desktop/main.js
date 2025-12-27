const path = require('node:path');
const { app, BrowserWindow } = require('electron');
const fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const fastifyHttpProxy = require('@fastify/http-proxy');

let apiStarted = false;

async function startProxyStaticServer() {
  const server = fastify({ logger: false });
  const webDist = path.resolve(__dirname, '../web/dist');

  await server.register(fastifyStatic, {
    root: webDist,
    prefix: '/',
    decorateReply: false
  });

  await server.register(fastifyHttpProxy, {
    upstream: 'http://127.0.0.1:3000',
    prefix: '/api',
    rewritePrefix: ''
  });

  await server.listen({ port: 3333, host: '127.0.0.1' });
  return server;
}

async function startApiServer() {
  if (apiStarted) return;
  apiStarted = true;
  // Use SQLite DB file in userData folder
  const userData = app.getPath('userData');
  const dbUrl = `file:${path.join(userData, 'joias.sqlite')}`;
  process.env.DATABASE_URL = dbUrl;
  process.env.PORT = process.env.PORT || '3000';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'desktop-dev';

  // Load compiled API server (ESM) dynamically
  const apiDist = path.resolve(__dirname, '../api/dist/index.js');
  await import(pathToFileURL(apiDist).href);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true
    }
  });
  win.loadURL('http://127.0.0.1:3333');
}

function pathToFileURL(filePath) {
  const url = new URL('file://');
  // Ensure Windows backslashes become forward slashes
  url.pathname = filePath.replace(/\\/g, '/');
  return url;
}

app.whenReady().then(async () => {
  await startApiServer();
  await startProxyStaticServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
