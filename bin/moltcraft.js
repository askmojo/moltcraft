#!/usr/bin/env node

// Moltcraft CLI — zero-dependency dashboard for Moltbot
// https://moltcraft.pages.dev

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');

const VERSION = '0.1.0';
const DEFAULT_PORT = 8080;
const DEFAULT_GATEWAY_PORT = 18789;

// ─── ANSI colors ───────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// ─── Argument parsing ──────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    port: DEFAULT_PORT,
    tunnel: false,
    open: true,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--version' || arg === '-v') {
      opts.version = true;
    } else if (arg === '--tunnel' || arg === '-t') {
      opts.tunnel = true;
    } else if (arg === '--no-open') {
      opts.open = false;
    } else if (arg === '--port' || arg === '-p') {
      const val = parseInt(args[++i], 10);
      if (isNaN(val) || val < 1 || val > 65535) {
        console.error(`${c.red}✖ Invalid port: ${args[i]}${c.reset}`);
        process.exit(1);
      }
      opts.port = val;
    } else {
      console.error(`${c.red}✖ Unknown flag: ${arg}${c.reset}`);
      console.error(`  Run ${c.cyan}moltcraft --help${c.reset} for usage.`);
      process.exit(1);
    }
  }

  return opts;
}

// ─── Help text ─────────────────────────────────────────
function showHelp() {
  console.log(`
${c.bold}⛏️  MOLTCRAFT${c.reset} — Turn your AI agents into a living pixel world

${c.bold}USAGE${c.reset}
  ${c.cyan}moltcraft${c.reset}                    Start the dashboard
  ${c.cyan}npx @askmojo/moltcraft${c.reset}       Run without installing

${c.bold}OPTIONS${c.reset}
  ${c.green}-p, --port PORT${c.reset}    Dashboard port (default: ${DEFAULT_PORT})
  ${c.green}-t, --tunnel${c.reset}       Create a public tunnel via cloudflared
  ${c.green}    --no-open${c.reset}      Don't auto-open the browser
  ${c.green}-h, --help${c.reset}         Show this help
  ${c.green}-v, --version${c.reset}      Show version

${c.bold}EXAMPLES${c.reset}
  ${c.dim}# Start on custom port${c.reset}
  ${c.cyan}moltcraft --port 3000${c.reset}

  ${c.dim}# Share publicly via tunnel${c.reset}
  ${c.cyan}moltcraft --tunnel${c.reset}

  ${c.dim}# Headless mode${c.reset}
  ${c.cyan}moltcraft --no-open${c.reset}

${c.bold}CONFIG${c.reset}
  Auto-detects Moltbot config from:
    ~/.moltbot/moltbot.json
    ~/.clawdbot/moltbot.json

${c.dim}https://moltcraft.pages.dev${c.reset}
`);
}

// ─── Config detection ──────────────────────────────────
function detectConfig() {
  const home = os.homedir();
  const paths = [
    path.join(home, '.moltbot', 'moltbot.json'),
    path.join(home, '.clawdbot', 'moltbot.json'),
  ];

  for (const configPath of paths) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);
      const gw = config.gateway || {};
      return {
        path: configPath,
        displayPath: configPath.replace(home, '~'),
        port: gw.port || DEFAULT_GATEWAY_PORT,
        token: (gw.auth && gw.auth.token) || null,
      };
    } catch {
      // try next
    }
  }

  return null;
}

// ─── Browser opener ────────────────────────────────────
function openBrowser(url) {
  const platform = os.platform();
  let cmd;
  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.log(`${c.yellow}⚠️  Could not open browser automatically.${c.reset}`);
      console.log(`   Open ${c.cyan}${url}${c.reset} manually.`);
    }
  });
}

// ─── Tunnel ────────────────────────────────────────────
function startTunnel(port, token) {
  return new Promise((resolve) => {
    const tunnelProc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;

    tunnelProc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        console.log(`\n${c.red}✖ cloudflared not found!${c.reset}`);
        console.log(`  Install it: ${c.cyan}https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/${c.reset}\n`);
      } else {
        console.log(`\n${c.red}✖ Tunnel error: ${err.message}${c.reset}`);
      }
      resolve(null);
    });

    // cloudflared prints tunnel URL to stderr
    tunnelProc.stderr.on('data', (data) => {
      const output = data.toString();
      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        resolved = true;
        const tunnelUrl = match[0];
        printTunnelBox(tunnelUrl, token);
        resolve(tunnelProc);
      }
    });

    // Timeout after 30s
    setTimeout(() => {
      if (!resolved) {
        console.log(`${c.yellow}⚠️  Tunnel timed out waiting for URL.${c.reset}`);
        resolved = true;
        resolve(tunnelProc);
      }
    }, 30000);
  });
}

function printTunnelBox(url, token) {
  const tokenDisplay = token ? `${token.substring(0, 7)}...` : '(not set)';
  const urlLine = `  URL:   ${url}`;
  const tokenLine = `  Token: ${tokenDisplay}`;
  const warnLine = `  ⚠️  Don't share URL + token together publicly!`;

  // Calculate width
  const lines = [urlLine, tokenLine, warnLine, '  🌍 Moltcraft Tunnel Active!'];
  const maxLen = Math.max(...lines.map(l => stripAnsi(l).length)) + 2;
  const w = Math.max(maxLen, 50);

  const hr = '═'.repeat(w);
  const pad = (s) => {
    const visible = stripAnsi(s).length;
    return s + ' '.repeat(Math.max(0, w - visible));
  };

  console.log(`\n${c.green}╔${hr}╗${c.reset}`);
  console.log(`${c.green}║${c.reset}${pad('  🌍 Moltcraft Tunnel Active!')}${c.green}║${c.reset}`);
  console.log(`${c.green}║${c.reset}${' '.repeat(w)}${c.green}║${c.reset}`);
  console.log(`${c.green}║${c.reset}${pad(urlLine)}${c.green}║${c.reset}`);
  console.log(`${c.green}║${c.reset}${pad(tokenLine)}${c.green}║${c.reset}`);
  console.log(`${c.green}║${c.reset}${' '.repeat(w)}${c.green}║${c.reset}`);
  console.log(`${c.green}║${c.reset}${pad(warnLine)}${c.green}║${c.reset}`);
  console.log(`${c.green}╚${hr}╝${c.reset}\n`);
}

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

// ─── Main ──────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv);

  if (opts.version) {
    console.log(VERSION);
    process.exit(0);
  }

  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  // Banner
  const line = '━'.repeat(38);
  console.log(`\n${c.bold}⛏️  MOLTCRAFT${c.reset} ${c.dim}v${VERSION}${c.reset}`);
  console.log(`${c.dim}${line}${c.reset}`);

  // Detect config
  const config = detectConfig();
  let gatewayPort = DEFAULT_GATEWAY_PORT;
  let token = null;

  if (config) {
    console.log(`${c.green}🔍 Found Moltbot config at ${config.displayPath}${c.reset}`);
    gatewayPort = config.port;
    token = config.token;
    if (token) {
      console.log(`${c.green}🔑 Gateway token: ${token.substring(0, 7)}...${c.reset} ${c.dim}(auto-detected)${c.reset}`);
    }
    console.log(`${c.cyan}🌐 Gateway: http://127.0.0.1:${gatewayPort}${c.reset}`);
  } else {
    console.log(`${c.yellow}⚠️  Moltbot config not found.${c.reset}`);
    console.log(`   Make sure Moltbot is installed. Visit ${c.cyan}https://docs.molt.bot${c.reset}`);
    console.log(`${c.dim}   Using default gateway: http://127.0.0.1:${gatewayPort}${c.reset}`);
  }

  console.log(`${c.dim}${line}${c.reset}`);

  // Resolve path to server.js relative to this script
  const serverPath = path.join(__dirname, '..', 'server.js');
  const { startServer } = require(serverPath);

  const dashboardUrl = `http://localhost:${opts.port}`;

  // Start server
  const server = startServer({
    port: opts.port,
    gatewayUrl: `http://127.0.0.1:${gatewayPort}`,
    staticDir: path.join(__dirname, '..'),
    onReady: () => {
      console.log(`${c.green}🎮 Dashboard: ${c.bold}${dashboardUrl}${c.reset}`);

      if (opts.open) {
        console.log(`${c.cyan}🚀 Opening browser...${c.reset}`);
        openBrowser(dashboardUrl);
      }

      if (!opts.tunnel) {
        console.log(`\n${c.dim}Press Ctrl+C to stop.${c.reset}\n`);
      }
    },
  });

  // Tunnel
  let tunnelProc = null;
  if (opts.tunnel) {
    tunnelProc = await startTunnel(opts.port, token);
    if (tunnelProc) {
      console.log(`${c.dim}Press Ctrl+C to stop.${c.reset}\n`);
    }
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log(`\n${c.bold}👋 Moltcraft stopped. See you next time!${c.reset}\n`);
    if (tunnelProc) {
      tunnelProc.kill('SIGTERM');
    }
    server.close(() => {
      process.exit(0);
    });
    // Force exit after 3s if server doesn't close cleanly
    setTimeout(() => process.exit(0), 3000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(`${c.red}✖ Fatal error: ${err.message}${c.reset}`);
  process.exit(1);
});
