// Simple proxy server for Moltbot Dashboard
// Serves static files + proxies /api/* to the Gateway (avoids CORS issues)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const GATEWAY = 'http://127.0.0.1:18789';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Proxy /api/* to Gateway
  if (req.url.startsWith('/api/')) {
    const gatewayPath = req.url.replace('/api', '');
    const gatewayUrl = new URL(gatewayPath, GATEWAY);

    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const proxyReq = http.request(gatewayUrl, {
        method: req.method,
        headers,
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      });

      if (body) proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // Serve static files
  const cleanUrl = req.url.split('?')[0];
  let filePath = cleanUrl === '/' ? '/index.html' : cleanUrl;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🦞 Moltbot Dashboard → http://localhost:${PORT}`);
  console.log(`   Proxying API to ${GATEWAY}`);
});
