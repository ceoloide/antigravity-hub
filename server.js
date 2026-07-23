import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3333;

let cachedConfig = { port: null, csrfToken: null, useHttps: false, lastUpdated: 0 };

function discoverLanguageServerConfig() {
  const now = Date.now();
  // Throttle updates to once every 2 seconds unless forced
  if (now - cachedConfig.lastUpdated < 2000 && cachedConfig.port && cachedConfig.csrfToken) {
    return cachedConfig;
  }

  let port = null;
  let csrfToken = null;

  try {
    const psOutput = execSync('ps aux | grep "language_server --standalone" | grep -v grep', { encoding: 'utf8', timeout: 2000 });
    const csrfMatch = psOutput.match(/--csrf_token\s+([a-f0-9-]+)/);
    if (csrfMatch) csrfToken = csrfMatch[1];
  } catch(e) {}

  try {
    const ssOutput = execSync('ss -tulpn 2>/dev/null | grep language_server', { encoding: 'utf8', timeout: 2000 });
    const portMatches = [...ssOutput.matchAll(/127\.0\.0\.1:(\d+)/g)];
    for (const match of portMatches) {
      const p = parseInt(match[1], 10);
      if (p !== 9224) {
        port = p;
        break;
      }
    }
  } catch(e) {}

  if (port) cachedConfig.port = port;
  if (csrfToken) cachedConfig.csrfToken = csrfToken;
  cachedConfig.lastUpdated = now;

  return cachedConfig;
}

// Agents for proxy requests
const httpAgent = new http.Agent({ keepAlive: false });
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: false
});

const iconsCacheDir = path.join(__dirname, 'icons_cache');
if (!fs.existsSync(iconsCacheDir)) {
  fs.mkdirSync(iconsCacheDir, { recursive: true });
}

function fetchIconFromCdn(iconName) {
  return new Promise((resolve) => {
    https.get(`https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/${iconName}.svg`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', () => resolve({ status: 500, data: '' }));
  });
}

async function handleSymbolIconRequest(reqPath, res) {
  let relPath = reqPath.replace(/^\/symbols-icons/, '');
  if (relPath.startsWith('/')) relPath = relPath.substring(1);

  // Check direct local icon file e.g. extracted_web_app/icons_cache/icons/files/typescript.svg
  const directLocalFile = path.join(iconsCacheDir, relPath);
  if (fs.existsSync(directLocalFile) && !fs.statSync(directLocalFile).isDirectory()) {
    const content = fs.readFileSync(directLocalFile);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
    res.end(content);
    return;
  }

  // Also check direct basename search in files/ or folders/
  const baseName = path.basename(reqPath);
  const filesPath = path.join(iconsCacheDir, 'icons', 'files', baseName);
  const foldersPath = path.join(iconsCacheDir, 'icons', 'folders', baseName);

  if (fs.existsSync(filesPath)) {
    const content = fs.readFileSync(filesPath);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
    res.end(content);
    return;
  }

  if (fs.existsSync(foldersPath)) {
    const content = fs.readFileSync(foldersPath);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
    res.end(content);
    return;
  }

  // CDN fallback
  let cleanName = path.basename(reqPath, '.svg');
  if (cleanName.startsWith('file_type_')) cleanName = cleanName.replace('file_type_', '');
  if (cleanName === 'folder' || cleanName === 'folder-open') cleanName = 'folder-base';
  if (cleanName === 'default_file' || cleanName === 'file') cleanName = 'document';

  const cachedFile = path.join(iconsCacheDir, `${cleanName}.svg`);
  if (fs.existsSync(cachedFile)) {
    const content = fs.readFileSync(cachedFile);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
    res.end(content);
    return;
  }

  const cdnRes = await fetchIconFromCdn(cleanName);
  if (cdnRes.status === 200 && cdnRes.data.includes('<svg')) {
    fs.writeFileSync(cachedFile, cdnRes.data);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
    res.end(cdnRes.data);
    return;
  }

  // Fallback SVG
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
  res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
  res.end(fallbackSvg);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let reqPath = parsedUrl.pathname;

  // Set CORS headers for browser RPC requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Agent, X-Grpc-Web, Connect-Protocol-Version, X-Csrf-Token, X-Codeium-Csrf-Token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle symbol icons (file & folder icons)
  if (reqPath.startsWith('/symbols-icons')) {
    handleSymbolIconRequest(reqPath, res);
    return;
  }

  // Proxy RPC API requests to language server backend
  if (reqPath.startsWith('/exa.language_server_pb') || reqPath.startsWith('/api') || reqPath.startsWith('/rpc')) {
    const isStream = reqPath.includes('Stream') || reqPath.includes('Subscribe') || reqPath.includes('StreamAgentState');
    const lsConfig = discoverLanguageServerConfig();
    
    const sendProxyRequest = (useHttps) => {
      const headers = {};
      for (const [key, value] of Object.entries(req.headers)) {
        const lowerKey = key.toLowerCase();
        if (!['host', 'connection', 'transfer-encoding', 'accept-encoding'].includes(lowerKey)) {
          headers[key] = value;
        }
      }
      
      headers['host'] = `127.0.0.1:${lsConfig.port}`;
      headers['origin'] = `${useHttps ? 'https' : 'http'}://127.0.0.1:${lsConfig.port}`;
      headers['x-codeium-csrf-token'] = lsConfig.csrfToken;

      const transport = useHttps ? https : http;
      const proxyReq = transport.request({
        hostname: '127.0.0.1',
        port: lsConfig.port,
        path: `${reqPath}${parsedUrl.search}`,
        method: req.method,
        headers: headers,
        agent: useHttps ? httpsAgent : httpAgent
      }, (proxyRes) => {
        if (isStream) {
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
        }
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        // If protocol mismatch error occurs, switch protocol and retry once
        const isSslErr = err.code === 'EPROTO' || (err.message && (err.message.includes('wrong version number') || err.message.includes('SSL routines') || err.message.includes('packet length')));
        if (isSslErr && !req.retriedProtocol) {
          req.retriedProtocol = true;
          cachedConfig.useHttps = !useHttps;
          sendProxyRequest(!useHttps);
          return;
        }

        if (!res.headersSent) {
          console.error(`[Proxy Error ${reqPath}] (Port ${lsConfig.port})`, err.message);
          // Force refresh config on connection error
          cachedConfig.lastUpdated = 0;
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Language server backend proxy error', message: err.message }));
        }
      });

      req.pipe(proxyReq);
    };

    sendProxyRequest(cachedConfig.useHttps || false);
    return;
  }

  // Extract basename to resolve static assets from subroutes (e.g., /c/123/main.js -> main.js)
  const basename = path.basename(reqPath);
  let staticCandidate = path.join(__dirname, basename);
  
  let filePath;
  if (fs.existsSync(staticCandidate) && !fs.statSync(staticCandidate).isDirectory()) {
    filePath = staticCandidate;
  } else {
    let directPath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);
    if (fs.existsSync(directPath) && !fs.statSync(directPath).isDirectory()) {
      filePath = directPath;
    } else {
      filePath = path.join(__dirname, 'index.html');
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'text/html; charset=utf-8';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      if (ext === '.html') {
        const lsConfig = discoverLanguageServerConfig();
        let htmlStr = content.toString('utf8');
        // Inject current dynamic CSRF token into window.__APP_CONFIG__
        if (lsConfig.csrfToken) {
          htmlStr = htmlStr.replace(/"csrfToken":\s*"[^"]*"/, `"csrfToken": "${lsConfig.csrfToken}"`);
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(htmlStr);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    }
  });
});

server.listen(PORT, () => {
  const lsConfig = discoverLanguageServerConfig();
  console.log(`=======================================================`);
  console.log(`Antigravity Extracted React Web App running live at:`);
  console.log(`http://localhost:${PORT}`);
  console.log(`Dynamic Language Server Port: ${lsConfig.port}`);
  console.log(`Dynamic CSRF Token: ${lsConfig.csrfToken}`);
  console.log(`=======================================================`);
});
