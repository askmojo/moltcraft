// ========================================
// MOLTCRAFT v3 - Enhanced Isometric Agent Dashboard
// Pure vanilla JS + Canvas with Particles & Animations
// ========================================

class MoltcraftApp {
    constructor() {
        this.gatewayUrl = window.location.origin;
        this.gatewayToken = '';
        this.sessions = [];
        this.selectedSession = null;
        this.world = null;
        this.refreshInterval = null;
        
        this.init();
    }

    init() {
        // Load saved credentials
        const saved = this.loadCredentials();
        if (saved) {
            document.getElementById('gatewayUrl').value = saved.url;
            document.getElementById('gatewayToken').value = saved.token;
        }

        // Bind connection UI
        document.getElementById('connectBtn').addEventListener('click', () => this.connect());
        
        // Handle Enter key in inputs
        ['gatewayUrl', 'gatewayToken'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.connect();
            });
        });

        // Initialize world canvas
        const canvas = document.getElementById('worldCanvas');
        this.world = new IsometricWorld(canvas);
        
        // Bind action buttons
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        
        // Auto-resize canvas
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();
        
        // Start render loop
        this.animate();
    }

    resizeCanvas() {
        const canvas = document.getElementById('worldCanvas');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        if (this.world) {
            this.world.canvas.width = canvas.width;
            this.world.canvas.height = canvas.height;
        }
    }

    loadCredentials() {
        try {
            const saved = localStorage.getItem('moltcraft_credentials');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    saveCredentials() {
        localStorage.setItem('moltcraft_credentials', JSON.stringify({
            url: this.gatewayUrl,
            token: this.gatewayToken
        }));
    }

    async connect() {
        const urlInput = document.getElementById('gatewayUrl');
        const tokenInput = document.getElementById('gatewayToken');
        const errorEl = document.getElementById('connectionError');
        const connectBtn = document.getElementById('connectBtn');

        this.gatewayUrl = urlInput.value.trim();
        this.gatewayToken = tokenInput.value.trim();

        // URL not needed (proxy handles it), but keep for display
        if (!this.gatewayUrl) this.gatewayUrl = window.location.origin;
        if (!this.gatewayToken) {
            this.showError('Please enter your token');
            return;
        }

        connectBtn.textContent = 'CONNECTING...';
        connectBtn.disabled = true;
        errorEl.classList.remove('show');

        try {
            // Test connection
            await this.fetchSessions();
            
            // Success!
            this.saveCredentials();
            document.getElementById('connectionOverlay').classList.add('hidden');
            document.getElementById('onlineStatus').classList.remove('offline');
            document.getElementById('onlineStatus').classList.add('online');
            document.getElementById('onlineStatus').textContent = 'ONLINE';
            
            // Start auto-refresh
            this.refreshInterval = setInterval(() => this.refreshData(), 10000);
            
        } catch (error) {
            this.showError('Connection failed: ' + error.message);
            connectBtn.textContent = 'JOIN SERVER';
            connectBtn.disabled = false;
        }
    }

    showError(message) {
        const errorEl = document.getElementById('connectionError');
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }

    async invokeAPI(tool, parameters = {}) {
        const response = await fetch(`${window.location.origin}/api/tools/invoke`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.gatewayToken}`
            },
            body: JSON.stringify({ tool, args: parameters })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    }

    async fetchSessions() {
        const result = await this.invokeAPI('sessions_list', {
            messageLimit: 1,
            limit: 20
        });

        // Parse sessions from response
        let sessions = [];
        
        if (result.result?.details?.sessions) {
            sessions = result.result.details.sessions;
        } else if (result.result?.content?.[0]?.text) {
            try {
                const parsed = JSON.parse(result.result.content[0].text);
                sessions = parsed.sessions || [];
            } catch (e) {
                console.error('Failed to parse sessions:', e);
            }
        }

        this.sessions = sessions;
        this.updateUI();
        this.updateWorld();
    }

    async refreshData() {
        try {
            await this.fetchSessions();
        } catch (error) {
            console.error('Refresh failed:', error);
            document.getElementById('onlineStatus').classList.remove('online');
            document.getElementById('onlineStatus').classList.add('offline');
            document.getElementById('onlineStatus').textContent = 'OFFLINE';
        }
    }

    updateUI() {
        // Update top bar stats
        const stats = this.calculateStats();
        document.getElementById('tokenCount').textContent = this.formatNumber(stats.totalTokens);
        document.getElementById('workingCount').textContent = stats.working;
        document.getElementById('idleCount').textContent = stats.idle;
        document.getElementById('waitingCount').textContent = stats.waiting;
        document.getElementById('agentCount').textContent = this.sessions.length;

        // Update session list
        const listEl = document.getElementById('sessionList');
        listEl.innerHTML = '';

        this.sessions.forEach(session => {
            const item = this.createSessionItem(session);
            listEl.appendChild(item);
        });
    }

    calculateStats() {
        let totalTokens = 0;
        let working = 0;
        let idle = 0;
        let waiting = 0;

        this.sessions.forEach(session => {
            // Estimate token usage (if available)
            if (session.stats?.totalTokens) {
                totalTokens += session.stats.totalTokens;
            }

            // Count by state
            const state = this.getSessionState(session);
            if (state === 'working') working++;
            else if (state === 'idle') idle++;
            else if (state === 'waiting') waiting++;
        });

        return { totalTokens, working, idle, waiting };
    }

    getSessionState(session) {
        if (!session.lastActivity && !session.updatedAt) return 'idle';
        
        const timestamp = session.updatedAt || session.lastActivity;
        const lastTime = new Date(timestamp).getTime();
        const now = Date.now();
        const minutesAgo = (now - lastTime) / (1000 * 60);

        if (minutesAgo < 5) return 'working';
        if (minutesAgo < 15) return 'idle';
        return 'waiting';
    }

    getSessionType(session) {
        const key = session.key || session.id || session.sessionId || '';
        if (key.includes('subagent')) return 'subagent';
        if (key.includes('isolated')) return 'isolated';
        return 'main';
    }

    createSessionItem(session) {
        const item = document.createElement('div');
        item.className = 'session-item';
        
        const state = this.getSessionState(session);
        const type = this.getSessionType(session);
        
        if (state === 'working') {
            item.classList.add('active');
        }

        if (this.selectedSession?.id === session.id) {
            item.classList.add('selected');
        }

        const headerRow = document.createElement('div');
        headerRow.className = 'session-header-row';

        const avatar = document.createElement('div');
        avatar.className = `session-avatar ${type}`;
        
        const label = document.createElement('div');
        label.className = 'session-label';
        // Show proper name: label for subagents, "Bernard 🐢" for main
        let displayLabel = 'Unknown';
        if (type === 'main' && !session.label) {
            displayLabel = 'Bernard 🐢';
        } else if (session.label) {
            displayLabel = session.label;
        } else if (session.key) {
            // Extract last meaningful segment from key
            const parts = session.key.split(':');
            displayLabel = parts[parts.length - 1].substring(0, 12);
        }
        label.textContent = displayLabel;

        headerRow.appendChild(avatar);
        headerRow.appendChild(label);

        const description = document.createElement('div');
        description.className = 'session-description';
        const model = session.model || 'claude-opus-4-5';
        const channel = session.channel || 'telegram';
        description.textContent = `${model} · ${channel} · ${state}`;

        const time = document.createElement('div');
        time.className = 'session-time';
        time.textContent = this.getTimeAgo(session.updatedAt || session.lastActivity);

        item.appendChild(headerRow);
        item.appendChild(description);
        item.appendChild(time);

        item.addEventListener('click', () => this.selectSession(session));

        return item;
    }

    selectSession(session) {
        this.selectedSession = session;
        this.updateUI();
        this.updateBottomPanel();
        this.world.selectAgent(session.id);
    }

    updateBottomPanel() {
        const panel = document.getElementById('bottomPanel');
        
        if (!this.selectedSession) {
            panel.classList.add('hidden');
            return;
        }

        panel.classList.remove('hidden');

        const session = this.selectedSession;
        
        // Update header
        const type = this.getSessionType(session);
        let panelLabel = 'Unknown';
        if (type === 'main' && !session.label) {
            panelLabel = 'Bernard 🐢 (main)';
        } else {
            panelLabel = session.label || session.key || session.id;
        }
        document.getElementById('selectedSessionName').textContent = panelLabel;
        document.getElementById('selectedModel').textContent = session.model || 'claude-opus-4-5';

        // Update stats
        const totalTokens = session.totalTokens || 0;
        const contextTokens = session.contextTokens || 200000;
        const ctxPercent = contextTokens > 0 ? (totalTokens / contextTokens) * 100 : 0;
        document.getElementById('ctxProgress').style.width = Math.min(ctxPercent, 100) + '%';
        document.getElementById('ctxPercent').textContent = Math.round(ctxPercent) + '%';
        
        document.getElementById('tokenUsage').textContent = this.formatNumber(totalTokens);
        
        const msgCount = session.messages?.length || 0;
        document.getElementById('messageCount').textContent = msgCount;
        
        document.getElementById('channelBadge').textContent = session.channel || 'telegram';

        // Update chat content
        const chatContent = document.getElementById('chatContent');
        if (session.lastMessage) {
            chatContent.textContent = session.lastMessage;
        } else {
            chatContent.textContent = 'No recent messages...';
        }

        // Draw portrait
        this.drawPortrait(session);
    }

    drawPortrait(session) {
        const canvas = document.getElementById('portraitCanvas');
        const ctx = canvas.getContext('2d');
        const type = this.getSessionType(session);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw large pixel art character
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Get color based on type
        let color, hatColor;
        if (type === 'main') {
            color = '#4488ff';
            hatColor = '#ffd700'; // Gold crown
        } else if (type === 'subagent') {
            color = '#44ff44';
            hatColor = '#888888'; // Iron helmet
        } else {
            color = '#aa44ff';
            hatColor = '#8844ff'; // Wizard hat
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 55, 25, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(centerX - 16, centerY + 20, 12, 28);
        ctx.fillRect(centerX + 4, centerY + 20, 12, 28);

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(centerX - 20, centerY - 10, 40, 32);

        // Arms
        ctx.fillStyle = '#f0d9b5';
        ctx.fillRect(centerX - 28, centerY - 5, 8, 24);
        ctx.fillRect(centerX + 20, centerY - 5, 8, 24);

        // Head
        ctx.fillStyle = '#f0d9b5';
        ctx.fillRect(centerX - 16, centerY - 40, 32, 32);
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(centerX - 10, centerY - 30, 6, 6);
        ctx.fillRect(centerX + 4, centerY - 30, 6, 6);

        // Mouth
        ctx.fillRect(centerX - 6, centerY - 18, 12, 3);

        // Hat/Helmet
        if (type === 'main') {
            // Crown
            ctx.fillStyle = hatColor;
            ctx.fillRect(centerX - 18, centerY - 45, 36, 8);
            ctx.fillRect(centerX - 14, centerY - 52, 6, 7);
            ctx.fillRect(centerX - 4, centerY - 52, 6, 7);
            ctx.fillRect(centerX + 8, centerY - 52, 6, 7);
        } else if (type === 'subagent') {
            // Helmet
            ctx.fillStyle = hatColor;
            ctx.fillRect(centerX - 18, centerY - 46, 36, 12);
            ctx.fillRect(centerX - 20, centerY - 38, 40, 4);
        } else {
            // Wizard hat
            ctx.fillStyle = hatColor;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - 65);
            ctx.lineTo(centerX + 20, centerY - 38);
            ctx.lineTo(centerX - 20, centerY - 38);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(centerX - 22, centerY - 40, 44, 6);
        }
    }

    updateWorld() {
        // Sync agents with sessions
        this.world.syncAgents(this.sessions);
    }

    getTimeAgo(timestamp) {
        if (!timestamp) return 'unknown';
        
        const now = Date.now();
        const time = new Date(timestamp).getTime();
        const diff = now - time;
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    animate() {
        this.world.update();
        this.world.render();
        requestAnimationFrame(() => this.animate());
    }
}

// ========================================
// PARTICLE SYSTEM
// ========================================

class Particle {
    constructor(x, y, color, life, vx, vy) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.vx = vx || 0;
        this.vy = vy || 0;
        this.size = 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // Gravity
        this.life--;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
    }

    isDead() {
        return this.life <= 0;
    }
}

// ========================================
// ISOMETRIC WORLD RENDERER
// ========================================

class IsometricWorld {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileWidth = 64;
        this.tileHeight = 32;
        this.mapWidth = 60;
        this.mapHeight = 60;
        
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1.5, // Start closer
            targetZoom: 1.5
        };
        
        this.agents = [];
        this.buildings = [];
        this.decorations = [];
        this.particles = [];
        this.selectedAgentId = null;
        
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        
        this.animFrame = 0;
        this.terrainMap = [];
        this.pathMap = [];
        
        this.initWorld();
        this.bindEvents();
    }

    initWorld() {
        // Generate terrain
        this.generateTerrain();
        
        // Create buildings (much larger)
        this.buildings = [
            // Command Center (center) - 6x4 footprint
            {
                type: 'command',
                x: 27,
                y: 27,
                width: 6,
                height: 4,
                label: '⚡ GATEWAY'
            },
            // Cron Workshop - 4x3 footprint
            {
                type: 'craft',
                x: 20,
                y: 24,
                width: 4,
                height: 3,
                label: 'CRON'
            },
            // Mine entrance - 3x4 footprint
            {
                type: 'mine',
                x: 37,
                y: 29,
                width: 3,
                height: 4,
                label: 'MINE'
            },
            // Barracks - 4x4 footprint
            {
                type: 'barracks',
                x: 28,
                y: 20,
                width: 4,
                height: 4,
                label: 'BARRACKS'
            }
        ];

        // Create paths connecting buildings
        this.generatePaths();

        // Create decorations (trees, rocks)
        this.generateDecorations();
    }

    generateTerrain() {
        this.terrainMap = [];
        for (let y = 0; y < this.mapHeight; y++) {
            const row = [];
            for (let x = 0; x < this.mapWidth; x++) {
                const distFromCenter = Math.sqrt(
                    Math.pow(x - this.mapWidth / 2, 2) + 
                    Math.pow(y - this.mapHeight / 2, 2)
                );
                
                // Edge fog/dark grass
                if (distFromCenter > 25) {
                    row.push({ type: 'dark-grass', shade: 0 });
                }
                // Water pond (near bottom right)
                else if (x > 40 && x < 48 && y > 12 && y < 20) {
                    row.push({ type: 'water', shade: 0 });
                }
                // Stone path (will be set later)
                else {
                    // Multiple grass shades
                    const rand = Math.random();
                    let shade = 0;
                    if (rand > 0.7) shade = 1;
                    if (rand > 0.85) shade = 2;
                    if (rand > 0.95) shade = 3;
                    row.push({ type: 'grass', shade });
                }
            }
            this.terrainMap.push(row);
        }
    }

    generatePaths() {
        this.pathMap = [];
        
        // Create dirt paths connecting all buildings
        const pathPoints = [
            [30, 30], // Command center
            [22, 25], // Cron
            [39, 31], // Mine
            [30, 22]  // Barracks
        ];
        
        // Connect each building to the next
        for (let i = 0; i < pathPoints.length; i++) {
            const start = pathPoints[i];
            const end = pathPoints[(i + 1) % pathPoints.length];
            this.createPath(start[0], start[1], end[0], end[1]);
        }
    }

    createPath(x1, y1, x2, y2) {
        // Simple line drawing for paths
        const dx = x2 - x1;
        const dy = y2 - y1;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.round(x1 + dx * t);
            const y = Math.round(y1 + dy * t);
            
            // Make path 2-3 tiles wide
            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    const px = x + ox;
                    const py = y + oy;
                    if (px >= 0 && px < this.mapWidth && py >= 0 && py < this.mapHeight) {
                        if (this.terrainMap[py][px].type !== 'water') {
                            if (Math.random() > 0.3) {
                                this.terrainMap[py][px] = { type: 'dirt', shade: 0 };
                            } else {
                                this.terrainMap[py][px] = { type: 'stone', shade: 0 };
                            }
                        }
                    }
                }
            }
        }
    }

    generateDecorations() {
        this.decorations = [];
        
        // Trees
        for (let i = 0; i < 40; i++) {
            const x = Math.floor(Math.random() * this.mapWidth);
            const y = Math.floor(Math.random() * this.mapHeight);
            
            // Don't place on paths or water
            if (this.terrainMap[y][x].type === 'grass' || 
                this.terrainMap[y][x].type === 'dark-grass') {
                this.decorations.push({
                    type: 'tree',
                    x: x,
                    y: y
                });
            }
        }
        
        // Rocks
        for (let i = 0; i < 25; i++) {
            const x = Math.floor(Math.random() * this.mapWidth);
            const y = Math.floor(Math.random() * this.mapHeight);
            
            if (this.terrainMap[y][x].type === 'grass') {
                this.decorations.push({
                    type: 'rock',
                    x: x,
                    y: y
                });
            }
        }
    }

    bindEvents() {
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    handleWheel(e) {
        e.preventDefault();
        console.log('Wheel event:', e.deltaY, 'Current zoom:', this.camera.zoom);
        
        // Mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // World position before zoom
        const worldXBefore = (mouseX - this.canvas.width / 2 - this.camera.x) / this.camera.zoom;
        const worldYBefore = (mouseY - 100 - this.camera.y) / this.camera.zoom;
        
        // Zoom
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.targetZoom = Math.max(0.3, Math.min(4, this.camera.targetZoom * delta));
        
        // Adjust camera to keep mouse position stable
        this.camera.zoom = this.camera.targetZoom; // Instant for zoom-to-cursor
        
        const worldXAfter = (mouseX - this.canvas.width / 2 - this.camera.x) / this.camera.zoom;
        const worldYAfter = (mouseY - 100 - this.camera.y) / this.camera.zoom;
        
        this.camera.x += (worldXAfter - worldXBefore) * this.camera.zoom;
        this.camera.y += (worldYAfter - worldYBefore) * this.camera.zoom;
    }

    handleMouseDown(e) {
        this.isDragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.camera.x += dx;
            this.camera.y += dy;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }

    handleClick(e) {
        // Check if clicked on an agent
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Convert to world coordinates
        const worldX = (mouseX - this.canvas.width / 2 - this.camera.x) / this.camera.zoom;
        const worldY = (mouseY - 100 - this.camera.y) / this.camera.zoom;
        
        // Check each agent
        for (const agent of this.agents) {
            const pos = this.toScreen(agent.x, agent.y);
            const dist = Math.sqrt(
                Math.pow(worldX - pos.x, 2) + 
                Math.pow(worldY - pos.y, 2)
            );
            
            if (dist < 30) {
                this.selectedAgentId = agent.id;
                // Notify app to select in sidebar
                if (window.moltcraftApp) {
                    const session = window.moltcraftApp.sessions.find(s => s.id === agent.id);
                    if (session) {
                        window.moltcraftApp.selectSession(session);
                    }
                }
                return;
            }
        }
    }

    toScreen(tileX, tileY) {
        return {
            x: (tileX - tileY) * this.tileWidth / 2,
            y: (tileX + tileY) * this.tileHeight / 2
        };
    }

    syncAgents(sessions) {
        // Create or update agents based on sessions
        const existingIds = new Set(this.agents.map(a => a.id));
        const sessionIds = new Set(sessions.map(s => s.id));

        // Remove agents that no longer exist
        this.agents = this.agents.filter(a => sessionIds.has(a.id));

        // Add new agents
        sessions.forEach(session => {
            if (!existingIds.has(session.id)) {
                this.createAgent(session);
            } else {
                // Update existing agent
                const agent = this.agents.find(a => a.id === session.id);
                if (agent) {
                    agent.session = session;
                    agent.state = this.getAgentState(session);
                }
            }
        });
    }

    getAgentState(session) {
        if (!session.lastActivity && !session.updatedAt) return 'idle';
        
        const timestamp = session.updatedAt || session.lastActivity;
        const lastTime = new Date(timestamp).getTime();
        const now = Date.now();
        const minutesAgo = (now - lastTime) / (1000 * 60);

        if (minutesAgo < 5) return 'working';
        return 'idle';
    }

    getAgentType(session) {
        const id = session.id || '';
        if (id.includes('subagent')) return 'subagent';
        if (id.includes('isolated')) return 'isolated';
        return 'main';
    }

    createAgent(session) {
        const type = this.getAgentType(session);
        const state = this.getAgentState(session);

        // Building front positions (where agents stand near each building)
        const buildingFronts = [
            { name: 'gateway',  x: 30, y: 34 },  // In front of Gateway
            { name: 'cron',     x: 22, y: 30 },  // In front of Cron
            { name: 'mine',     x: 38, y: 36 },  // In front of Mine
            { name: 'barracks', x: 30, y: 27 },  // In front of Barracks
        ];

        // Distribute agents evenly across buildings
        const agentIndex = this.agents.length;
        const assignedBuilding = buildingFronts[agentIndex % buildingFronts.length];
        const offsetX = (Math.random() - 0.5) * 4;
        const offsetY = (Math.random() - 0.5) * 3;

        const agent = {
            id: session.id,
            session: session,
            x: assignedBuilding.x + offsetX,
            y: assignedBuilding.y + offsetY,
            targetX: assignedBuilding.x + offsetX,
            targetY: assignedBuilding.y + offsetY,
            homeBuilding: assignedBuilding.name,
            currentDestination: null,
            waitTimer: 0,
            type: type,
            state: state,
            animFrame: 0,
            walkFrame: 0,
            direction: 0,
            facingLeft: false
        };

        this.agents.push(agent);
    }

    selectAgent(id) {
        this.selectedAgentId = id;
    }

    update() {
        this.animFrame++;
        
        // Smooth zoom
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;

        // Update agents
        this.agents.forEach(agent => {
            agent.animFrame++;

            // Building destination points (in front of each building)
            const buildingDestinations = {
                gateway:  { x: 30, y: 34 },
                cron:     { x: 22, y: 30 },
                mine:     { x: 38, y: 36 },
                barracks: { x: 30, y: 27 },
            };

            // Path waypoints between buildings (for natural walking routes)
            const pathWaypoints = [
                { x: 26, y: 32 },  // Between Cron and Gateway
                { x: 34, y: 35 },  // Between Gateway and Mine
                { x: 30, y: 30 },  // Between Gateway and Barracks
                { x: 26, y: 28 },  // Between Cron and Barracks
                { x: 34, y: 30 },  // Between Barracks and Mine
            ];

            // Wait timer — agents pause at each destination before moving
            if (agent.waitTimer > 0) {
                agent.waitTimer--;
            } else {
                // Check if agent has arrived at target
                const dx2 = agent.targetX - agent.x;
                const dy2 = agent.targetY - agent.y;
                const distToTarget = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                if (distToTarget < 0.5) {
                    // Arrived! Wait a bit then pick a new destination
                    agent.waitTimer = 60 + Math.floor(Math.random() * 180); // 1-4 seconds

                    // 70% chance: go to a building, 30% chance: go to a path waypoint
                    if (Math.random() < 0.7) {
                        const buildingNames = Object.keys(buildingDestinations);
                        // Prefer going to a DIFFERENT building than current
                        let dest;
                        do {
                            dest = buildingNames[Math.floor(Math.random() * buildingNames.length)];
                        } while (dest === agent.currentDestination && buildingNames.length > 1);
                        
                        agent.currentDestination = dest;
                        const target = buildingDestinations[dest];
                        agent.targetX = target.x + (Math.random() - 0.5) * 4;
                        agent.targetY = target.y + (Math.random() - 0.5) * 3;
                    } else {
                        agent.currentDestination = 'path';
                        const wp = pathWaypoints[Math.floor(Math.random() * pathWaypoints.length)];
                        agent.targetX = wp.x + (Math.random() - 0.5) * 3;
                        agent.targetY = wp.y + (Math.random() - 0.5) * 2;
                    }
                }
            }

            // Move toward target
            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.3 && agent.waitTimer <= 0) {
                const speed = 0.06; // Visible movement between buildings
                agent.x += (dx / dist) * speed;
                agent.y += (dy / dist) * speed;
                
                // Update direction and facing
                agent.direction = Math.atan2(dy, dx);
                agent.facingLeft = dx < 0;
                agent.walkFrame++;
                
                // Footstep particles
                if (agent.walkFrame % 20 === 0) {
                    const pos = this.toScreen(agent.x, agent.y);
                    this.addParticle(pos.x, pos.y, '#8B6914', 20, 
                        (Math.random() - 0.5) * 0.5, -0.5);
                }
            } else {
                agent.walkFrame = 0;
            }

            // Mining particles
            if (agent.state === 'working' && agent.animFrame % 30 === 0) {
                const pos = this.toScreen(agent.x, agent.y);
                for (let i = 0; i < 5; i++) {
                    this.addParticle(
                        pos.x + (Math.random() - 0.5) * 20,
                        pos.y - 20 + (Math.random() - 0.5) * 20,
                        Math.random() > 0.5 ? '#fbbf24' : '#ff6600',
                        30,
                        (Math.random() - 0.5) * 2,
                        -Math.random() * 2
                    );
                }
            }
        });

        // Update particles
        this.particles = this.particles.filter(p => {
            p.update();
            return !p.isDead();
        });

        // Ambient particles (dust motes)
        if (Math.random() < 0.1) {
            const x = (Math.random() - 0.5) * this.canvas.width / this.camera.zoom;
            const y = (Math.random() - 0.5) * this.canvas.height / this.camera.zoom;
            this.particles.push(new Particle(
                x, y, 'rgba(255,255,255,0.3)', 
                100, 
                (Math.random() - 0.5) * 0.2, 
                (Math.random() - 0.5) * 0.2
            ));
        }

        // Torch flame particles
        this.buildings.forEach(building => {
            if (building.type === 'command' && Math.random() < 0.3) {
                const pos = this.toScreen(building.x + building.width / 2, building.y + building.height / 2);
                // Multiple torches
                [-45, 40].forEach(offset => {
                    this.addParticle(
                        pos.x + offset + (Math.random() - 0.5) * 4,
                        pos.y - 65 + (Math.random() - 0.5) * 4,
                        Math.random() > 0.5 ? '#ff6600' : '#ffaa00',
                        20,
                        (Math.random() - 0.5) * 0.3,
                        -Math.random() * 1.5
                    );
                });
            }
        });

        // Water sparkles
        if (Math.random() < 0.05) {
            for (let i = 0; i < 3; i++) {
                const x = 40 + Math.random() * 8;
                const y = 12 + Math.random() * 8;
                const pos = this.toScreen(x, y);
                this.addParticle(
                    pos.x, pos.y,
                    Math.random() > 0.5 ? 'rgba(255,255,255,0.8)' : 'rgba(100,200,255,0.8)',
                    15,
                    0, -0.5
                );
            }
        }
    }

    addParticle(x, y, color, life, vx, vy) {
        this.particles.push(new Particle(x, y, color, life, vx, vy));
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        
        // Apply camera transform
        ctx.translate(this.canvas.width / 2 + this.camera.x, 100 + this.camera.y);
        ctx.scale(this.camera.zoom, this.camera.zoom);

        // Draw terrain
        this.drawTerrain();

        // Draw in layers: 1) decorations, 2) buildings, 3) agents ALWAYS ON TOP
        
        // Layer 1: Decorations (back to front)
        const sortedDecos = [...this.decorations].sort((a, b) => a.y - b.y);
        sortedDecos.forEach(deco => this.drawDecoration(deco));

        // Layer 2: Buildings (back to front)
        const sortedBuildings = [...this.buildings].sort((a, b) => a.y - b.y);
        sortedBuildings.forEach(building => this.drawBuilding(building));

        // Layer 3: Agents ALWAYS drawn last (always visible, never hidden by buildings)
        const sortedAgents = [...this.agents].sort((a, b) => a.y - b.y);
        sortedAgents.forEach(agent => this.drawAgent(agent));

        // Draw particles
        this.particles.forEach(p => p.draw(ctx));

        ctx.restore();

        // Draw UI overlay (zoom indicator)
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(10, 10, 120, 30);
        ctx.fillStyle = '#c8a832';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(1)}x`, 20, 30);
    }

    drawTerrain() {
        const ctx = this.ctx;

        // Draw isometric tiles
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.terrainMap[y][x];
                let color;
                
                switch (tile.type) {
                    case 'grass':
                        const grassColors = ['#4a8c3f', '#3f7a35', '#4f9545', '#5aa050'];
                        color = grassColors[tile.shade];
                        break;
                    case 'dark-grass':
                        color = '#2d5016';
                        break;
                    case 'dirt':
                        color = '#8B6914';
                        break;
                    case 'stone':
                        color = '#6b6b6b';
                        break;
                    case 'water':
                        // Animated water
                        const shimmer = Math.sin(this.animFrame * 0.05 + x + y) * 10;
                        color = `rgb(${60 + shimmer}, ${120 + shimmer}, ${200 + shimmer})`;
                        break;
                    default:
                        color = '#4a8c3f';
                }

                this.drawIsometricTile(x, y, color);
            }
        }
    }

    drawIsometricTile(x, y, color) {
        const pos = this.toScreen(x, y);
        const ctx = this.ctx;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x + this.tileWidth / 2, pos.y + this.tileHeight / 2);
        ctx.lineTo(pos.x, pos.y + this.tileHeight);
        ctx.lineTo(pos.x - this.tileWidth / 2, pos.y + this.tileHeight / 2);
        ctx.closePath();
        ctx.fill();

        // Subtle grid
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    drawBuilding(building) {
        const ctx = this.ctx;
        const pos = this.toScreen(building.x + building.width / 2, building.y + building.height / 2);

        if (building.type === 'command') {
            // Stone base (larger)
            for (let dy = 0; dy < building.height; dy++) {
                for (let dx = 0; dx < building.width; dx++) {
                    this.drawIsometricTile(building.x + dx, building.y + dy, '#555');
                }
            }

            // Walls (multi-layer, taller)
            ctx.fillStyle = '#4a3a2a';
            ctx.fillRect(pos.x - 80, pos.y - 50, 160, 60);
            
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 75, pos.y - 90, 150, 45);

            // Peaked roof (large)
            ctx.fillStyle = '#3a2a1a';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 140);
            ctx.lineTo(pos.x + 90, pos.y - 95);
            ctx.lineTo(pos.x, pos.y - 50);
            ctx.lineTo(pos.x - 90, pos.y - 95);
            ctx.closePath();
            ctx.fill();

            // Ridge
            ctx.strokeStyle = '#2a1a0a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 140);
            ctx.lineTo(pos.x, pos.y - 50);
            ctx.stroke();

            // Windows with glow
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            ctx.fillRect(pos.x - 40, pos.y - 75, 15, 20);
            ctx.fillRect(pos.x + 25, pos.y - 75, 15, 20);
            ctx.shadowBlur = 0;

            // Door
            ctx.fillStyle = '#2a1a0a';
            ctx.fillRect(pos.x - 12, pos.y - 45, 24, 35);
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(pos.x - 2, pos.y - 30, 4, 4);

            // Torches (animated)
            const flicker = Math.sin(this.animFrame * 0.1) * 2;
            [-85, -30, 30, 85].forEach(offset => {
                ctx.fillStyle = '#654321';
                ctx.fillRect(pos.x + offset, pos.y - 95, 5, 15);
                ctx.fillStyle = '#ff6600';
                ctx.fillRect(pos.x + offset, pos.y - 100 + flicker, 5, 10);
            });

            // Chimney
            ctx.fillStyle = '#555';
            ctx.fillRect(pos.x + 50, pos.y - 125, 12, 30);

            // Label/Sign
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(pos.x - 50, pos.y - 155, 100, 18);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 142);

        } else if (building.type === 'craft') {
            // Wooden hut (larger)
            for (let dy = 0; dy < building.height; dy++) {
                for (let dx = 0; dx < building.width; dx++) {
                    this.drawIsometricTile(building.x + dx, building.y + dy, '#6b5a4a');
                }
            }

            ctx.fillStyle = '#8B6914';
            ctx.fillRect(pos.x - 50, pos.y - 60, 100, 50);

            // Roof
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 95);
            ctx.lineTo(pos.x + 60, pos.y - 65);
            ctx.lineTo(pos.x, pos.y - 35);
            ctx.lineTo(pos.x - 60, pos.y - 65);
            ctx.closePath();
            ctx.fill();

            // Crafting table visible inside
            ctx.fillStyle = '#4a3a2a';
            ctx.fillRect(pos.x - 20, pos.y - 40, 40, 20);

            // Spinning gear above
            const gearAngle = this.animFrame * 0.05;
            ctx.save();
            ctx.translate(pos.x, pos.y - 105);
            ctx.rotate(gearAngle);
            ctx.fillStyle = '#888';
            for (let i = 0; i < 8; i++) {
                ctx.save();
                ctx.rotate((i * Math.PI) / 4);
                ctx.fillRect(-3, -20, 6, 40);
                ctx.restore();
            }
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Lanterns
            [-45, 45].forEach(offset => {
                ctx.fillStyle = '#654321';
                ctx.fillRect(pos.x + offset, pos.y - 65, 6, 12);
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(pos.x + offset, pos.y - 70, 6, 8);
            });

            // Label
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(pos.x - 30, pos.y - 110, 60, 14);
            ctx.fillStyle = '#c8a832';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 99);

        } else if (building.type === 'mine') {
            // Hillside (multiple layers)
            ctx.fillStyle = '#5a4a3a';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 20, 70, 80, 0, 0, Math.PI);
            ctx.fill();

            ctx.fillStyle = '#4a3a2a';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 15, 60, 70, 0, 0, Math.PI);
            ctx.fill();

            // Dark cave mouth
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 20, 35, 50, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 20, 25, 40, 0, 0, Math.PI * 2);
            ctx.fill();

            // Minecart on tracks
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 15, pos.y + 10, 30, 3);
            ctx.fillStyle = '#888';
            ctx.fillRect(pos.x - 12, pos.y, 24, 12);
            // Wheels
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.arc(pos.x - 8, pos.y + 12, 4, 0, Math.PI * 2);
            ctx.arc(pos.x + 8, pos.y + 12, 4, 0, Math.PI * 2);
            ctx.fill();

            // Glowing crystals inside
            const crystalGlow = Math.sin(this.animFrame * 0.1) * 0.3 + 0.7;
            [[-15, -25], [10, -30], [-5, -35]].forEach(([ox, oy]) => {
                ctx.fillStyle = `rgba(150, 100, 255, ${crystalGlow})`;
                ctx.shadowColor = '#9966ff';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.moveTo(pos.x + ox, pos.y + oy);
                ctx.lineTo(pos.x + ox - 3, pos.y + oy + 10);
                ctx.lineTo(pos.x + ox + 3, pos.y + oy + 10);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // Lanterns on posts
            [-50, 50].forEach(offset => {
                ctx.fillStyle = '#654321';
                ctx.fillRect(pos.x + offset, pos.y - 40, 4, 30);
                ctx.fillStyle = '#fbbf24';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 10;
                ctx.fillRect(pos.x + offset - 3, pos.y - 45, 10, 12);
                ctx.shadowBlur = 0;
            });

            // Label
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(pos.x - 25, pos.y - 75, 50, 14);
            ctx.fillStyle = '#c8a832';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 64);

        } else if (building.type === 'barracks') {
            // Large building base
            for (let dy = 0; dy < building.height; dy++) {
                for (let dx = 0; dx < building.width; dx++) {
                    this.drawIsometricTile(building.x + dx, building.y + dy, '#6b5a4a');
                }
            }

            // Walls
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(pos.x - 60, pos.y - 55, 120, 50);

            // Roof
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 90);
            ctx.lineTo(pos.x + 70, pos.y - 60);
            ctx.lineTo(pos.x, pos.y - 30);
            ctx.lineTo(pos.x - 70, pos.y - 60);
            ctx.closePath();
            ctx.fill();

            // Multiple doors
            [-30, -10, 10, 30].forEach(offset => {
                ctx.fillStyle = '#2a1a0a';
                ctx.fillRect(pos.x + offset, pos.y - 40, 8, 15);
            });

            // Flag on roof
            const flagWave = Math.sin(this.animFrame * 0.1 + pos.x) * 3;
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x, pos.y - 110, 3, 25);
            ctx.fillStyle = '#c00';
            ctx.beginPath();
            ctx.moveTo(pos.x + 3, pos.y - 110);
            ctx.lineTo(pos.x + 20 + flagWave, pos.y - 105);
            ctx.lineTo(pos.x + 3, pos.y - 100);
            ctx.closePath();
            ctx.fill();

            // Training dummies outside
            [-45, 45].forEach(offset => {
                ctx.fillStyle = '#8B6914';
                ctx.fillRect(pos.x + offset, pos.y - 20, 6, 20);
                ctx.fillStyle = '#654321';
                ctx.beginPath();
                ctx.arc(pos.x + offset + 3, pos.y - 25, 6, 0, Math.PI * 2);
                ctx.fill();
            });

            // Label
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(pos.x - 40, pos.y - 100, 80, 14);
            ctx.fillStyle = '#c8a832';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 89);
        }
    }

    drawDecoration(deco) {
        const ctx = this.ctx;
        const pos = this.toScreen(deco.x, deco.y);

        if (deco.type === 'tree') {
            // Trunk
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 4, pos.y - 35, 8, 35);

            // Leaves (triangular layers)
            ctx.fillStyle = '#2d5016';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 65);
            ctx.lineTo(pos.x + 20, pos.y - 45);
            ctx.lineTo(pos.x - 20, pos.y - 45);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 52);
            ctx.lineTo(pos.x + 18, pos.y - 35);
            ctx.lineTo(pos.x - 18, pos.y - 35);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#3f7a35';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 40);
            ctx.lineTo(pos.x + 15, pos.y - 25);
            ctx.lineTo(pos.x - 15, pos.y - 25);
            ctx.closePath();
            ctx.fill();

        } else if (deco.type === 'rock') {
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.ellipse(pos.x - 3, pos.y - 3, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawAgent(agent) {
        const ctx = this.ctx;
        const pos = this.toScreen(agent.x, agent.y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 8, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Highlight if selected
        if (agent.id === this.selectedAgentId) {
            const pulse = Math.sin(this.animFrame * 0.1) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 15, 28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Body color
        let bodyColor, hatColor;
        if (agent.type === 'main') {
            bodyColor = '#4488ff';
            hatColor = '#ffd700'; // Gold crown
        } else if (agent.type === 'subagent') {
            bodyColor = '#44ff44';
            hatColor = '#888888'; // Iron helmet
        } else {
            bodyColor = '#aa44ff';
            hatColor = '#8844ff'; // Wizard hat
        }

        // Walking animation
        const isWalking = agent.walkFrame > 0;
        const walkCycle = Math.floor(agent.walkFrame / 10) % 2;
        const legSwing = isWalking ? (walkCycle === 0 ? -4 : 4) : 0;

        // Legs (animated)
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(pos.x - 8, pos.y - 8 + legSwing, 6, 16);
        ctx.fillRect(pos.x + 2, pos.y - 8 - legSwing, 6, 16);

        // Body (larger, with texture)
        ctx.fillStyle = bodyColor;
        ctx.fillRect(pos.x - 10, pos.y - 30, 20, 24);
        
        // Armor/shirt texture
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(pos.x - 8, pos.y - 28, 16, 2);
        ctx.fillRect(pos.x - 8, pos.y - 20, 16, 2);
        ctx.fillRect(pos.x - 8, pos.y - 12, 16, 2);

        // Arms (animated)
        ctx.fillStyle = '#f0d9b5';
        if (agent.state === 'working') {
            // Mining animation
            const swing = Math.sin(agent.animFrame * 0.2) * 15;
            ctx.fillRect(pos.x - 16, pos.y - 26 + swing / 2, 6, 18);
            ctx.fillRect(pos.x + 10, pos.y - 24, 6, 16);
            
            // Pickaxe
            ctx.save();
            ctx.translate(pos.x - 13, pos.y - 28 + swing / 2);
            ctx.rotate(swing * 0.02);
            ctx.fillStyle = '#888';
            ctx.fillRect(-8, -2, 16, 4);
            ctx.fillStyle = '#654321';
            ctx.fillRect(-2, 2, 4, 16);
            ctx.restore();
        } else if (isWalking) {
            // Walking arm swing
            const armSwing = walkCycle === 0 ? -3 : 3;
            ctx.fillRect(pos.x - 16, pos.y - 26 + armSwing, 6, 18);
            ctx.fillRect(pos.x + 10, pos.y - 26 - armSwing, 6, 18);
        } else {
            // Idle arms
            const sway = Math.sin(agent.animFrame * 0.05) * 2;
            ctx.fillRect(pos.x - 16, pos.y - 26 + sway, 6, 18);
            ctx.fillRect(pos.x + 10, pos.y - 26 - sway, 6, 18);
        }

        // Head (larger)
        ctx.fillStyle = '#f0d9b5';
        ctx.fillRect(pos.x - 8, pos.y - 50, 16, 16);

        // Face
        ctx.fillStyle = '#000';
        // Eyes
        const blinkFrame = agent.animFrame % 100;
        if (blinkFrame < 95) {
            ctx.fillRect(pos.x - 5, pos.y - 45, 3, 3);
            ctx.fillRect(pos.x + 2, pos.y - 45, 3, 3);
        } else {
            // Blink
            ctx.fillRect(pos.x - 5, pos.y - 44, 3, 1);
            ctx.fillRect(pos.x + 2, pos.y - 44, 3, 1);
        }
        // Mouth
        ctx.fillRect(pos.x - 3, pos.y - 38, 6, 2);

        // Hat/Helmet/Crown
        if (agent.type === 'main') {
            // Crown
            ctx.fillStyle = hatColor;
            ctx.fillRect(pos.x - 10, pos.y - 56, 20, 6);
            ctx.fillRect(pos.x - 8, pos.y - 62, 4, 6);
            ctx.fillRect(pos.x - 2, pos.y - 62, 4, 6);
            ctx.fillRect(pos.x + 4, pos.y - 62, 4, 6);
            // Gems
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(pos.x - 6, pos.y - 60, 2, 2);
            ctx.fillRect(pos.x, pos.y - 60, 2, 2);
            ctx.fillRect(pos.x + 6, pos.y - 60, 2, 2);
        } else if (agent.type === 'subagent') {
            // Helmet
            ctx.fillStyle = hatColor;
            ctx.fillRect(pos.x - 10, pos.y - 56, 20, 8);
            ctx.fillRect(pos.x - 12, pos.y - 50, 24, 4);
        } else {
            // Wizard hat
            ctx.fillStyle = hatColor;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 75);
            ctx.lineTo(pos.x + 12, pos.y - 50);
            ctx.lineTo(pos.x - 12, pos.y - 50);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(pos.x - 14, pos.y - 52, 28, 4);
            // Stars
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(pos.x - 1, pos.y - 65, 2, 2);
            ctx.fillRect(pos.x - 3, pos.y - 60, 2, 2);
            ctx.fillRect(pos.x + 2, pos.y - 58, 2, 2);
        }

        // Nametag (floating above)
        let displayLabel = 'Unknown';
        if (agent.type === 'main' && !agent.session.label) {
            displayLabel = 'Bernard 🐢';
        } else if (agent.session.label) {
            displayLabel = agent.session.label;
        } else if (agent.session.key) {
            const parts = agent.session.key.split(':');
            displayLabel = parts[parts.length - 1].substring(0, 12);
        }
        const nameWidth = ctx.measureText(displayLabel).width + 10;
        
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(pos.x - nameWidth / 2, pos.y - 85, nameWidth, 14);
        
        // Border
        ctx.strokeStyle = agent.type === 'main' ? '#4488ff' : 
                         agent.type === 'subagent' ? '#44ff44' : '#aa44ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(pos.x - nameWidth / 2, pos.y - 85, nameWidth, 14);
        
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(displayLabel, pos.x, pos.y - 75);
    }
}

// ========================================
// INITIALIZE APP
// ========================================

window.addEventListener('DOMContentLoaded', () => {
    window.moltcraftApp = new MoltcraftApp();
});
