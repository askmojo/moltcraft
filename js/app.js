// ========================================
// MOLTCRAFT v2 - Isometric Agent Dashboard
// Pure vanilla JS + Canvas
// ========================================

class MoltcraftApp {
    constructor() {
        this.gatewayUrl = '';
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

        if (!this.gatewayUrl || !this.gatewayToken) {
            this.showError('Please enter both URL and token');
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
        const response = await fetch(`${this.gatewayUrl}/api/tools/invoke`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.gatewayToken}`
            },
            body: JSON.stringify({ tool, parameters })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    }

    async fetchSessions() {
        const result = await this.invokeAPI('sessions', {
            action: 'list',
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
        if (!session.lastActivity) return 'idle';
        
        const lastTime = new Date(session.lastActivity).getTime();
        const now = Date.now();
        const minutesAgo = (now - lastTime) / (1000 * 60);

        if (minutesAgo < 2) return 'working';
        if (minutesAgo < 15) return 'idle';
        return 'waiting';
    }

    getSessionType(session) {
        const id = session.id || session.sessionId || '';
        if (id.includes('subagent')) return 'subagent';
        if (id.includes('isolated')) return 'isolated';
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
        label.textContent = session.label || session.id || 'Unknown';

        headerRow.appendChild(avatar);
        headerRow.appendChild(label);

        const description = document.createElement('div');
        description.className = 'session-description';
        const model = session.model || 'claude-opus-4-5';
        const channel = session.channel || 'telegram';
        description.textContent = `${model} · ${channel}`;

        const time = document.createElement('div');
        time.className = 'session-time';
        time.textContent = this.getTimeAgo(session.lastActivity);

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
        document.getElementById('selectedSessionName').textContent = session.label || session.id;
        document.getElementById('selectedModel').textContent = session.model || 'claude-opus-4-5';

        // Update stats
        const ctxPercent = session.stats?.contextUsage || 0;
        document.getElementById('ctxProgress').style.width = ctxPercent + '%';
        document.getElementById('ctxPercent').textContent = Math.round(ctxPercent) + '%';
        
        const tokens = session.stats?.totalTokens || 0;
        document.getElementById('tokenUsage').textContent = this.formatNumber(tokens);
        
        const msgCount = session.stats?.messageCount || 0;
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
        let color;
        if (type === 'main') color = '#60a5fa';
        else if (type === 'subagent') color = '#4ade80';
        else color = '#c084fc';

        // Head
        ctx.fillStyle = '#f0d9b5';
        ctx.fillRect(centerX - 30, centerY - 40, 60, 60);
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(centerX - 20, centerY - 25, 10, 10);
        ctx.fillRect(centerX + 10, centerY - 25, 10, 10);
        
        // Body
        ctx.fillStyle = color;
        ctx.fillRect(centerX - 35, centerY + 25, 70, 50);
        
        // Arms
        ctx.fillRect(centerX - 45, centerY + 30, 10, 40);
        ctx.fillRect(centerX + 35, centerY + 30, 10, 40);
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
// ISOMETRIC WORLD RENDERER
// ========================================

class IsometricWorld {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileWidth = 64;
        this.tileHeight = 32;
        this.mapWidth = 30;
        this.mapHeight = 30;
        
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            targetZoom: 1
        };
        
        this.agents = [];
        this.buildings = [];
        this.decorations = [];
        this.selectedAgentId = null;
        
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        
        this.animFrame = 0;
        
        this.initWorld();
        this.bindEvents();
    }

    initWorld() {
        // Create buildings
        this.buildings = [
            // Command Center (center)
            {
                type: 'command',
                x: 14,
                y: 14,
                width: 3,
                height: 3,
                label: 'GATEWAY'
            },
            // Crafting Hut
            {
                type: 'craft',
                x: 10,
                y: 12,
                width: 2,
                height: 2,
                label: 'CRON'
            },
            // Mine entrance
            {
                type: 'mine',
                x: 20,
                y: 16,
                width: 2,
                height: 2,
                label: 'MINE'
            }
        ];

        // Create decorations (trees, rocks, etc.)
        this.decorations = [];
        for (let i = 0; i < 15; i++) {
            this.decorations.push({
                type: 'tree',
                x: Math.floor(Math.random() * this.mapWidth),
                y: Math.floor(Math.random() * this.mapHeight)
            });
        }
        for (let i = 0; i < 10; i++) {
            this.decorations.push({
                type: 'rock',
                x: Math.floor(Math.random() * this.mapWidth),
                y: Math.floor(Math.random() * this.mapHeight)
            });
        }
    }

    bindEvents() {
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.targetZoom = Math.max(0.5, Math.min(3, this.camera.targetZoom * delta));
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

    handleDoubleClick(e) {
        // Center camera on click position
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left - this.canvas.width / 2;
        const clickY = e.clientY - rect.top - 100;
        
        this.camera.x = -clickX * this.camera.zoom;
        this.camera.y = -clickY * this.camera.zoom;
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
        if (!session.lastActivity) return 'idle';
        
        const lastTime = new Date(session.lastActivity).getTime();
        const now = Date.now();
        const minutesAgo = (now - lastTime) / (1000 * 60);

        if (minutesAgo < 2) return 'working';
        return 'idle';
    }

    getAgentType(session) {
        const id = session.id || '';
        if (id.includes('subagent')) return 'subagent';
        if (id.includes('isolated')) return 'isolated';
        return 'main';
    }

    createAgent(session) {
        // Random position near center
        const centerX = 14;
        const centerY = 14;
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetY = (Math.random() - 0.5) * 8;

        const agent = {
            id: session.id,
            session: session,
            x: centerX + offsetX,
            y: centerY + offsetY,
            targetX: centerX + offsetX,
            targetY: centerY + offsetY,
            type: this.getAgentType(session),
            state: this.getAgentState(session),
            animFrame: 0,
            direction: 0
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

            // Wander behavior
            if (Math.random() < 0.01) {
                // Pick new target near current position
                const range = agent.state === 'working' ? 2 : 4;
                agent.targetX = agent.x + (Math.random() - 0.5) * range;
                agent.targetY = agent.y + (Math.random() - 0.5) * range;
                
                // Clamp to map
                agent.targetX = Math.max(2, Math.min(this.mapWidth - 2, agent.targetX));
                agent.targetY = Math.max(2, Math.min(this.mapHeight - 2, agent.targetY));
            }

            // Move toward target
            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.1) {
                const speed = agent.state === 'working' ? 0.02 : 0.01;
                agent.x += (dx / dist) * speed;
                agent.y += (dy / dist) * speed;
                
                // Update direction for animation
                agent.direction = Math.atan2(dy, dx);
            }
        });
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

        // Collect all drawable objects with depth
        const drawables = [];

        // Add buildings
        this.buildings.forEach(building => {
            drawables.push({
                type: 'building',
                obj: building,
                depth: building.y + building.height
            });
        });

        // Add decorations
        this.decorations.forEach(deco => {
            drawables.push({
                type: 'decoration',
                obj: deco,
                depth: deco.y
            });
        });

        // Add agents
        this.agents.forEach(agent => {
            drawables.push({
                type: 'agent',
                obj: agent,
                depth: agent.y
            });
        });

        // Sort by depth (back to front)
        drawables.sort((a, b) => a.depth - b.depth);

        // Draw all objects
        drawables.forEach(item => {
            if (item.type === 'building') this.drawBuilding(item.obj);
            else if (item.type === 'decoration') this.drawDecoration(item.obj);
            else if (item.type === 'agent') this.drawAgent(item.obj);
        });

        ctx.restore();
    }

    drawTerrain() {
        const ctx = this.ctx;

        // Draw isometric tiles
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                // Determine tile type
                let color = '#4a8c3f'; // grass
                
                // Dirt paths near center
                const distFromCenter = Math.abs(x - 14) + Math.abs(y - 14);
                if (distFromCenter < 6 && Math.random() > 0.7) {
                    color = '#8B6914';
                }

                // Add slight variation to grass
                if (color === '#4a8c3f' && Math.random() > 0.9) {
                    color = '#3f7a35';
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
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    drawBuilding(building) {
        const ctx = this.ctx;
        const pos = this.toScreen(building.x, building.y);

        if (building.type === 'command') {
            // Stone base
            for (let dy = 0; dy < building.height; dy++) {
                for (let dx = 0; dx < building.width; dx++) {
                    this.drawIsometricTile(building.x + dx, building.y + dy, '#888');
                }
            }

            // Walls
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 40, pos.y - 60, 80, 40);

            // Roof
            ctx.fillStyle = '#543210';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 80);
            ctx.lineTo(pos.x + 50, pos.y - 55);
            ctx.lineTo(pos.x, pos.y - 30);
            ctx.lineTo(pos.x - 50, pos.y - 55);
            ctx.closePath();
            ctx.fill();

            // Windows (glow)
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(pos.x - 20, pos.y - 45, 10, 10);
            ctx.fillRect(pos.x + 10, pos.y - 45, 10, 10);

            // Label
            ctx.fillStyle = '#c8a832';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 85);

            // Torches (animated)
            const flicker = Math.sin(this.animFrame * 0.1) * 2;
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(pos.x - 45, pos.y - 65 + flicker, 5, 10);
            ctx.fillRect(pos.x + 40, pos.y - 65 + flicker, 5, 10);

        } else if (building.type === 'craft') {
            // Smaller hut
            for (let dy = 0; dy < building.height; dy++) {
                for (let dx = 0; dx < building.width; dx++) {
                    this.drawIsometricTile(building.x + dx, building.y + dy, '#888');
                }
            }

            ctx.fillStyle = '#8B4513';
            ctx.fillRect(pos.x - 25, pos.y - 40, 50, 30);

            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 55);
            ctx.lineTo(pos.x + 30, pos.y - 40);
            ctx.lineTo(pos.x, pos.y - 25);
            ctx.lineTo(pos.x - 30, pos.y - 40);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#c8a832';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 60);

        } else if (building.type === 'mine') {
            // Dark cave entrance
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 20, 30, 40, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 20, 20, 30, 0, 0, Math.PI * 2);
            ctx.fill();

            // Lantern
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(pos.x - 35, pos.y - 30, 6, 10);

            ctx.fillStyle = '#c8a832';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 50);
        }
    }

    drawDecoration(deco) {
        const ctx = this.ctx;
        const pos = this.toScreen(deco.x, deco.y);

        if (deco.type === 'tree') {
            // Trunk
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 3, pos.y - 25, 6, 25);

            // Leaves (triangular layers)
            ctx.fillStyle = '#2d5016';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 50);
            ctx.lineTo(pos.x + 15, pos.y - 35);
            ctx.lineTo(pos.x - 15, pos.y - 35);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 40);
            ctx.lineTo(pos.x + 12, pos.y - 28);
            ctx.lineTo(pos.x - 12, pos.y - 28);
            ctx.closePath();
            ctx.fill();

        } else if (deco.type === 'rock') {
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.ellipse(pos.x - 2, pos.y - 2, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawAgent(agent) {
        const ctx = this.ctx;
        const pos = this.toScreen(agent.x, agent.y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 5, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Highlight if selected
        if (agent.id === this.selectedAgentId) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Body color
        let bodyColor;
        if (agent.type === 'main') bodyColor = '#60a5fa';
        else if (agent.type === 'subagent') bodyColor = '#4ade80';
        else bodyColor = '#c084fc';

        // Walking animation (leg positions)
        const walkCycle = Math.floor(agent.animFrame / 15) % 2;

        // Legs
        ctx.fillStyle = '#8B4513';
        if (walkCycle === 0) {
            ctx.fillRect(pos.x - 6, pos.y - 5, 4, 10);
            ctx.fillRect(pos.x + 2, pos.y - 2, 4, 7);
        } else {
            ctx.fillRect(pos.x - 6, pos.y - 2, 4, 7);
            ctx.fillRect(pos.x + 2, pos.y - 5, 4, 10);
        }

        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(pos.x - 8, pos.y - 20, 16, 18);

        // Arms
        ctx.fillStyle = '#f0d9b5';
        if (agent.state === 'working') {
            // Pickaxe animation
            const swing = Math.sin(agent.animFrame * 0.2) * 10;
            ctx.fillRect(pos.x - 12, pos.y - 18 + swing, 4, 12);
            ctx.fillRect(pos.x + 8, pos.y - 16, 4, 10);
            
            // Pickaxe
            ctx.fillStyle = '#888';
            ctx.fillRect(pos.x - 14, pos.y - 22 + swing, 8, 2);
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 10, pos.y - 20 + swing, 2, 10);

            // Particles
            if (Math.sin(agent.animFrame * 0.2) > 0.8) {
                ctx.fillStyle = '#fbbf24';
                for (let i = 0; i < 3; i++) {
                    const px = pos.x - 12 + Math.random() * 8;
                    const py = pos.y - 24 + Math.random() * 8;
                    ctx.fillRect(px, py, 2, 2);
                }
            }
        } else {
            ctx.fillRect(pos.x - 12, pos.y - 18, 4, 10);
            ctx.fillRect(pos.x + 8, pos.y - 18, 4, 10);
        }

        // Head
        ctx.fillStyle = '#f0d9b5';
        ctx.fillRect(pos.x - 6, pos.y - 32, 12, 12);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(pos.x - 4, pos.y - 28, 2, 2);
        ctx.fillRect(pos.x + 2, pos.y - 28, 2, 2);

        // Nametag
        const label = agent.session.label || agent.id.substring(0, 10);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(pos.x - 25, pos.y - 45, 50, 12);
        
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, pos.x, pos.y - 37);
    }
}

// ========================================
// INITIALIZE APP
// ========================================

window.addEventListener('DOMContentLoaded', () => {
    new MoltcraftApp();
});
