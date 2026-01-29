# 🦞 Moltbot Dashboard

A real-time web dashboard for visualizing what a Moltbot AI agent is doing. Built with pure HTML, CSS, and JavaScript — no frameworks, just clean code.

![Moltbot Dashboard Screenshot](screenshot.png)
*Screenshot placeholder - dashboard showing active sessions, system status, and cron jobs*

## What It Is

Moltbot Dashboard connects to the Moltbot Gateway HTTP API to provide live visibility into your AI agent's activity. Monitor active sessions, system status, and scheduled tasks—all in a sleek, terminal-inspired dark UI.

## Features

✨ **Real-Time Monitoring**
- 🔄 Auto-refresh every 10 seconds
- 🎯 Live session tracking with activity status
- 📊 System metrics and usage statistics
- ⏰ Cron job scheduling overview

🎨 **Clean Dark UI**
- Terminal-inspired hacker aesthetic
- Responsive grid layout
- Smooth animations and status indicators
- Monospaced fonts for data readability

🔒 **Secure Connection**
- Bearer token authentication
- Configurable gateway URL
- Local storage for settings (stay safe!)

## How to Use

### 1. Open the Dashboard

Simply open `index.html` in your web browser. No build step required!

```bash
# Open directly
open index.html

# Or serve with a local HTTP server
python3 -m http.server 8080
# Then visit: http://localhost:8080
```

### 2. Configure Connection

1. Click the ⚙️ **Settings** button in the top-right
2. Enter your **Gateway URL** (default: `http://localhost:18789`)
3. Enter your **Bearer Token** (get this from your Moltbot Gateway)
4. Click **Connect**

Your settings are saved in browser local storage for convenience.

### 3. Monitor Your Agent

Once connected, you'll see:

- **Active Sessions** - All running agent sessions (main, subagents, isolated)
- **System Status** - Current model, token usage, uptime
- **Cron Jobs** - Scheduled tasks with next run times

The dashboard auto-refreshes every 10 seconds. Use the 🔄 button for manual refresh.

## Gateway API

The dashboard connects to Moltbot Gateway via:

```
POST http://localhost:18789/tools/invoke
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "tool": "tool_name",
  "args": {...}
}
```

**Tools used:**
- `sessions_list` - Fetch active sessions
- `session_status` - Get current session stats
- `cron` (action: "list") - List scheduled jobs

## Project Structure

```
moltbot-dashboard/
├── index.html          # Main page
├── css/
│   └── style.css       # Dark theme styles
├── js/
│   └── app.js          # Dashboard logic
└── README.md           # This file
```

Pure vanilla web tech. No dependencies, no build process, no nonsense.

## Tech Stack

- **HTML5** - Semantic structure
- **CSS3** - Grid layout, animations, custom properties
- **Vanilla JavaScript** - ES6+ with fetch API
- **LocalStorage API** - Settings persistence

## Browser Support

Works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Security Note

⚠️ Your gateway token is stored in browser `localStorage`. Only use this dashboard on trusted devices. For production deployments, consider adding:
- HTTPS for all connections
- Token expiration and refresh
- Additional auth layers

## License

MIT License - Use freely, modify as needed, share improvements!

## Learn More

- [Moltbot Documentation](https://moltbot.com/docs) (placeholder)
- [Gateway API Reference](https://moltbot.com/docs/api) (placeholder)
- [Community Discord](https://discord.gg/moltbot) (placeholder)

---

Built with 🦞 by the Moltbot community
