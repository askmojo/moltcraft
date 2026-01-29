// Simple proxy server for Moltbot Dashboard
// Serves static files + proxies /api/* to the Gateway (avoids CORS issues)

const http = require('http');
const fs = require('fs');
const path = require('path');

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

function startServer(options = {}) {
  const port = options.port || 8080;
  const gatewayUrl = options.gatewayUrl || 'http://127.0.0.1:18789';
  const onReady = options.onReady || null;
  const staticDir = options.staticDir || __dirname;

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
      const target = new URL(gatewayPath, gatewayUrl);

      const headers = { 'Content-Type': 'application/json' };
      if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization;
      }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const proxyReq = http.request(target, {
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
    filePath = path.join(staticDir, filePath);

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

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n✖ Port ${port} is already in use.`);
      console.error(`  Try: moltcraft --port ${port + 1}\n`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(port, '0.0.0.0', () => {
    if (onReady) {
      onReady(port, gatewayUrl);
    } else {
      console.log(`🦞 Moltbot Dashboard → http://localhost:${port}`);
      console.log(`   Proxying API to ${gatewayUrl}`);
    }
  });

  return server;
}

// Export for use as module
module.exports = { startServer };

// Run standalone if executed directly
if (require.main === module) {
  startServer();
}
