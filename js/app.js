// Moltcraft Visual World - 2D Canvas Dashboard

class MoltcraftWorld {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        
        // World data
        this.agents = [];
        this.trees = [];
        this.buildings = [];
        this.flowers = [];
        this.camera = { x: 0, y: 0 };
        
        // World settings
        this.tileSize = 32;
        this.worldWidth = 50; // tiles
        this.worldHeight = 40; // tiles
        
        // Mouse tracking
        this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
        this.hoveredAgent = null;
        
        // Animation
        this.animFrame = 0;
        
        this.init();
    }
    
    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Generate world
        this.generateWorld();
        
        // Start render loop
        this.loop();
    }
    
    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        
        this.ctx.scale(dpr, dpr);
    }
    
    generateWorld() {
        const centerX = (this.worldWidth * this.tileSize) / 2;
        const centerY = (this.worldHeight * this.tileSize) / 2;
        
        // Generate trees (20-30 random positions)
        for (let i = 0; i < 25; i++) {
            this.trees.push({
                x: Math.random() * this.worldWidth * this.tileSize,
                y: Math.random() * this.worldHeight * this.tileSize
            });
        }
        
        // Generate flowers (40-50 random positions)
        for (let i = 0; i < 45; i++) {
            this.flowers.push({
                x: Math.random() * this.worldWidth * this.tileSize,
                y: Math.random() * this.worldHeight * this.tileSize,
                color: Math.random() > 0.5 ? '#ff5555' : '#ffff55'
            });
        }
        
        // Command Center (center)
        this.buildings.push({
            type: 'command-center',
            x: centerX - 60,
            y: centerY - 60,
            width: 120,
            height: 100,
            label: 'Gateway'
        });
        
        // Crafting Table (nearby)
        this.buildings.push({
            type: 'crafting-table',
            x: centerX + 100,
            y: centerY - 40,
            width: 60,
            height: 50,
            label: 'Cron Jobs'
        });
    }
    
    updateAgents(sessions) {
        const centerX = (this.worldWidth * this.tileSize) / 2;
        const centerY = (this.worldHeight * this.tileSize) / 2;
        
        // Update or create agents
        sessions.forEach(session => {
            let agent = this.agents.find(a => a.key === session.key);
            
            if (!agent) {
                // New agent - spawn at random position near center
                agent = {
                    key: session.key,
                    label: session.label || session.key.split(':').pop(),
                    x: centerX + (Math.random() - 0.5) * 200,
                    y: centerY + (Math.random() - 0.5) * 200,
                    dx: (Math.random() - 0.5) * 2,
                    dy: (Math.random() - 0.5) * 2,
                    wanderTimer: 60 + Math.random() * 120,
                    animFrame: 0,
                    session: session
                };
                this.agents.push(agent);
            } else {
                // Update existing agent data
                agent.session = session;
                agent.label = session.label || session.key.split(':').pop();
            }
        });
        
        // Remove agents that no longer exist
        this.agents = this.agents.filter(agent => 
            sessions.some(s => s.key === agent.key)
        );
    }
    
    update() {
        this.animFrame++;
        
        // Update agent positions (wander AI)
        this.agents.forEach(agent => {
            agent.wanderTimer--;
            
            if (agent.wanderTimer <= 0) {
                // Change direction
                agent.dx = (Math.random() - 0.5) * 2;
                agent.dy = (Math.random() - 0.5) * 2;
                agent.wanderTimer = 60 + Math.random() * 120;
            }
            
            // Move
            agent.x += agent.dx * 0.5;
            agent.y += agent.dy * 0.5;
            
            // Keep in bounds with padding
            const padding = 50;
            agent.x = Math.max(padding, Math.min(this.worldWidth * this.tileSize - padding, agent.x));
            agent.y = Math.max(padding, Math.min(this.worldHeight * this.tileSize - padding, agent.y));
            
            agent.animFrame = (agent.animFrame + 1) % 60;
        });
        
        // Update camera to follow agents (center on world)
        const targetX = (this.worldWidth * this.tileSize) / 2 - this.width / 2;
        const targetY = (this.worldHeight * this.tileSize) / 2 - this.height / 2;
        
        this.camera.x = targetX;
        this.camera.y = targetY;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB'; // Sky blue
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw in world coordinates
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.drawGround();
        this.drawFlowers();
        this.drawTrees();
        this.drawBuildings();
        this.drawAgents();
        this.drawUI();
        
        this.ctx.restore();
        
        // Draw world overlay (top-left)
        this.drawWorldOverlay();
    }
    
    drawGround() {
        const startX = Math.floor(this.camera.x / this.tileSize);
        const startY = Math.floor(this.camera.y / this.tileSize);
        const endX = Math.ceil((this.camera.x + this.width) / this.tileSize);
        const endY = Math.ceil((this.camera.y + this.height) / this.tileSize);
        
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                
                // Grass base
                this.ctx.fillStyle = '#5a8c3e';
                this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                
                // Occasional dirt patches
                if ((x * 7 + y * 13) % 17 === 0) {
                    this.ctx.fillStyle = '#8B7355';
                    this.ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
                }
                
                // Grass details
                if ((x * 5 + y * 11) % 7 === 0) {
                    this.ctx.fillStyle = '#4a7c2e';
                    this.ctx.fillRect(px + 8, py + 8, 4, 4);
                    this.ctx.fillRect(px + 20, py + 16, 4, 4);
                }
            }
        }
    }
    
    drawFlowers() {
        this.flowers.forEach(flower => {
            this.ctx.fillStyle = flower.color;
            this.ctx.fillRect(flower.x - 2, flower.y - 2, 4, 4);
            this.ctx.fillStyle = '#4a7c2e';
            this.ctx.fillRect(flower.x - 1, flower.y + 2, 2, 4);
        });
    }
    
    drawTrees() {
        this.trees.forEach(tree => {
            // Shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.fillRect(tree.x - 10, tree.y + 16, 20, 6);
            
            // Trunk
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(tree.x - 3, tree.y, 6, 18);
            
            // Leaves (3 layers)
            this.ctx.fillStyle = '#228B22';
            this.ctx.fillRect(tree.x - 10, tree.y - 6, 20, 8);
            this.ctx.fillRect(tree.x - 8, tree.y - 12, 16, 8);
            this.ctx.fillRect(tree.x - 6, tree.y - 18, 12, 8);
        });
    }
    
    drawBuildings() {
        this.buildings.forEach(building => {
            if (building.type === 'command-center') {
                this.drawCommandCenter(building);
            } else if (building.type === 'crafting-table') {
                this.drawCraftingTable(building);
            }
        });
    }
    
    drawCommandCenter(building) {
        const x = building.x;
        const y = building.y;
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(x + 4, y + building.height, building.width, 8);
        
        // Walls
        this.ctx.fillStyle = '#8B7355';
        this.ctx.fillRect(x, y + 30, building.width, building.height - 30);
        
        // Roof
        this.ctx.fillStyle = '#696969';
        this.ctx.fillRect(x - 10, y, building.width + 20, 35);
        this.ctx.fillStyle = '#505050';
        this.ctx.fillRect(x - 8, y + 5, building.width + 16, 25);
        
        // Door
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(x + 45, y + 60, 30, 40);
        
        // Windows
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(x + 20, y + 50, 15, 15);
        this.ctx.fillRect(x + 85, y + 50, 15, 15);
        
        // Label
        this.ctx.font = '10px "Press Start 2P"';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(building.label, x + building.width / 2, y - 5);
    }
    
    drawCraftingTable(building) {
        const x = building.x;
        const y = building.y;
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(x + 2, y + building.height, building.width, 4);
        
        // Table top
        this.ctx.fillStyle = '#8B7355';
        this.ctx.fillRect(x, y, building.width, 20);
        
        // Grid pattern (crafting table)
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 20, y);
        this.ctx.lineTo(x + 20, y + 20);
        this.ctx.moveTo(x + 40, y);
        this.ctx.lineTo(x + 40, y + 20);
        this.ctx.stroke();
        
        // Legs
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(x + 5, y + 20, 8, 30);
        this.ctx.fillRect(x + building.width - 13, y + 20, 8, 30);
        
        // Label
        this.ctx.font = '8px "Press Start 2P"';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(building.label, x + building.width / 2, y - 5);
    }
    
    drawAgents() {
        // Sort by Y position for proper layering
        const sorted = [...this.agents].sort((a, b) => a.y - b.y);
        
        sorted.forEach(agent => {
            this.drawAgent(agent);
        });
    }
    
    drawAgent(agent) {
        const x = agent.x;
        const y = agent.y;
        const session = agent.session;
        
        // Determine agent type and color
        const type = this.getSessionType(session.key);
        let color = '#55ff55'; // emerald (subagent)
        if (type === 'main') color = '#55ffff'; // diamond
        if (type === 'isolated') color = '#aa55ff'; // purple
        
        // Check if working
        const isWorking = this.isRecentlyActive(session.updatedAt);
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(x - 6, y + 28, 12, 4);
        
        // Legs (animated if walking)
        const legOffset = isWorking ? Math.sin(this.animFrame / 5) * 2 : 0;
        this.ctx.fillStyle = '#4444ff';
        this.ctx.fillRect(x - 4, y + 16 + legOffset, 3, 12);
        this.ctx.fillRect(x + 1, y + 16 - legOffset, 3, 12);
        
        // Body
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 4, y + 4, 8, 12);
        
        // Head
        this.ctx.fillStyle = '#dba87e'; // skin
        this.ctx.fillRect(x - 4, y - 4, 8, 8);
        
        // Eyes
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x - 2, y - 1, 2, 2);
        this.ctx.fillRect(x + 1, y - 1, 2, 2);
        
        // Mining animation if working
        if (isWorking) {
            const swing = Math.sin(Date.now() / 200) * 0.5;
            // Pickaxe handle
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(x + 4, y - 2 + swing * 4, 2, 10);
            // Pickaxe head
            this.ctx.fillStyle = '#888';
            this.ctx.fillRect(x + 6, y - 6 + swing * 4, 6, 2);
            this.ctx.fillRect(x + 10, y - 6 + swing * 4, 2, 4);
            
            // Particles
            if (Math.random() > 0.7) {
                this.ctx.fillStyle = '#ff5';
                this.ctx.fillRect(x + Math.random() * 20 - 10, y + Math.random() * 10, 2, 2);
            }
        }
        
        // Nametag
        this.ctx.font = '8px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        const text = agent.label;
        const textWidth = this.ctx.measureText(text).width;
        
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(x - textWidth / 2 - 3, y - 22, textWidth + 6, 12);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(text, x, y - 13);
        
        // Highlight if hovered
        if (this.hoveredAgent === agent) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x - 8, y - 8, 16, 36);
        }
    }
    
    drawUI() {
        // Any additional in-world UI elements can go here
    }
    
    drawWorldOverlay() {
        // Top-left: Server name and status
        this.ctx.font = '16px "Press Start 2P"';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('⛏️ MOLTCRAFT', 20, 35);
        
        // Connection status dot
        const statusColor = this.isConnected ? '#55ff55' : '#ff5555';
        this.ctx.fillStyle = statusColor;
        this.ctx.fillRect(20, 50, 12, 12);
        
        // Online count
        this.ctx.font = '12px "Press Start 2P"';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`${this.agents.length} online`, 40, 60);
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        
        // Convert to world coordinates
        this.mouse.worldX = this.mouse.x + this.camera.x;
        this.mouse.worldY = this.mouse.y + this.camera.y;
        
        // Check for hovered agent
        this.hoveredAgent = null;
        for (const agent of this.agents) {
            const dx = this.mouse.worldX - agent.x;
            const dy = this.mouse.worldY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 20) {
                this.hoveredAgent = agent;
                this.showTooltip(agent);
                return;
            }
        }
        
        this.hideTooltip();
    }
    
    handleClick(e) {
        if (this.hoveredAgent) {
            this.showDetailPanel(this.hoveredAgent);
        }
    }
    
    showTooltip(agent) {
        const tooltip = document.getElementById('tooltip');
        const session = agent.session;
        
        const timeSince = this.getTimeSince(session.updatedAt);
        const tokens = (session.totalTokens || 0).toLocaleString();
        
        tooltip.innerHTML = `
            <div class="tooltip-title">${this.escapeHtml(agent.label)}</div>
            <div class="tooltip-line">Model: <code>${this.escapeHtml(this.shortModel(session.model))}</code></div>
            <div class="tooltip-line">Tokens: ${tokens}</div>
            <div class="tooltip-line">Channel: ${this.escapeHtml(session.channel || session.lastChannel || 'n/a')}</div>
            <div class="tooltip-line">Last active: ${timeSince}</div>
        `;
        
        tooltip.style.left = (this.mouse.x + 15) + 'px';
        tooltip.style.top = (this.mouse.y + 15) + 'px';
        tooltip.classList.remove('hidden');
    }
    
    hideTooltip() {
        document.getElementById('tooltip').classList.add('hidden');
    }
    
    showDetailPanel(agent) {
        const panel = document.getElementById('detailPanel');
        const content = document.getElementById('detailContent');
        const session = agent.session;
        
        const type = this.getSessionType(session.key);
        const timeSince = this.getTimeSince(session.updatedAt);
        const cost = session.usage?.cost ? '$' + session.usage.cost.toFixed(4) : 'N/A';
        
        content.innerHTML = `
            <div class="detail-section">
                <div class="detail-section-title">IDENTITY</div>
                <div class="detail-item"><strong>Label:</strong> ${this.escapeHtml(agent.label)}</div>
                <div class="detail-item"><strong>Key:</strong> ${this.escapeHtml(session.key)}</div>
                <div class="detail-item"><strong>Type:</strong> ${type}</div>
            </div>
            
            <div class="detail-section">
                <div class="detail-section-title">STATS</div>
                <div class="detail-item"><strong>Model:</strong> ${this.escapeHtml(session.model || 'unknown')}</div>
                <div class="detail-item"><strong>Tokens:</strong> ${(session.totalTokens || 0).toLocaleString()}</div>
                <div class="detail-item"><strong>Cost:</strong> ${cost}</div>
                <div class="detail-item"><strong>Messages:</strong> ${session.messageCount || 0}</div>
            </div>
            
            <div class="detail-section">
                <div class="detail-section-title">ACTIVITY</div>
                <div class="detail-item"><strong>Channel:</strong> ${this.escapeHtml(session.channel || session.lastChannel || 'n/a')}</div>
                <div class="detail-item"><strong>Last active:</strong> ${timeSince}</div>
                <div class="detail-item"><strong>Created:</strong> ${this.formatDate(session.createdAt)}</div>
                <div class="detail-item"><strong>Updated:</strong> ${this.formatDate(session.updatedAt)}</div>
            </div>
            
            ${session.lastMessage ? `
            <div class="detail-section">
                <div class="detail-section-title">LAST MESSAGE</div>
                <div class="detail-item" style="color: #ccc; font-size: 0.7rem; line-height: 1.4;">
                    ${this.escapeHtml(this.truncate(session.lastMessage, 200))}
                </div>
            </div>
            ` : ''}
        `;
        
        panel.classList.remove('hidden');
    }
    
    loop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }
    
    // Utility methods
    getSessionType(key) {
        if (key.includes('subagent')) return 'subagent';
        if (key.includes('isolated')) return 'isolated';
        return 'main';
    }
    
    isRecentlyActive(timestamp) {
        if (!timestamp) return false;
        const now = Date.now();
        const then = new Date(timestamp).getTime();
        const diffMinutes = (now - then) / 1000 / 60;
        return diffMinutes < 5;
    }
    
    getTimeSince(timestamp) {
        if (!timestamp) return 'Unknown';
        const now = Date.now();
        const then = new Date(timestamp).getTime();
        const diffMs = now - then;
        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return `${seconds}s ago`;
    }
    
    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString();
    }
    
    shortModel(model) {
        if (!model) return 'unknown';
        const parts = model.split('/');
        const name = parts[parts.length - 1];
        return name.replace('claude-', '').replace('anthropic/', '');
    }
    
    truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Main Application Controller
class MoltcraftApp {
    constructor() {
        this.gatewayUrl = localStorage.getItem('gatewayUrl') || 'http://localhost:18789';
        this.gatewayToken = localStorage.getItem('gatewayToken') || '';
        this.isConnected = false;
        this.refreshInterval = null;
        this.world = null;
        
        this.init();
    }
    
    init() {
        // Initialize world
        const canvas = document.getElementById('worldCanvas');
        this.world = new MoltcraftWorld(canvas);
        
        this.setupEventListeners();
        this.loadSettings();
        
        // Auto-connect if token is saved
        if (this.gatewayToken) {
            this.connect();
        }
    }
    
    setupEventListeners() {
        document.getElementById('connectBtn').addEventListener('click', () => {
            this.saveSettings();
            this.connect();
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('connectionOverlay').classList.remove('hidden');
        });
        
        document.getElementById('closeDetailBtn').addEventListener('click', () => {
            document.getElementById('detailPanel').classList.add('hidden');
        });
    }
    
    loadSettings() {
        document.getElementById('gatewayUrl').value = this.gatewayUrl;
        document.getElementById('gatewayToken').value = this.gatewayToken;
    }
    
    saveSettings() {
        this.gatewayUrl = document.getElementById('gatewayUrl').value.trim();
        this.gatewayToken = document.getElementById('gatewayToken').value.trim();
        localStorage.setItem('gatewayUrl', this.gatewayUrl);
        localStorage.setItem('gatewayToken', this.gatewayToken);
    }
    
    async connect() {
        this.updateConnectionStatus('Connecting...', false);
        
        try {
            await this.callTool('session_status', {});
            this.isConnected = true;
            this.world.isConnected = true;
            this.updateConnectionStatus('Connected', true);
            document.getElementById('connectionOverlay').classList.add('hidden');
            this.startAutoRefresh();
            this.refreshAll();
        } catch (error) {
            this.isConnected = false;
            this.world.isConnected = false;
            this.updateConnectionStatus('Error', false);
            alert('Connection failed: ' + error.message);
        }
    }
    
    updateConnectionStatus(text, connected) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        statusText.textContent = text;
        indicator.className = 'status-indicator ' + (connected ? 'connected' : 'disconnected');
    }
    
    async callTool(toolName, args) {
        const url = `${window.location.origin}/api/tools/invoke`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.gatewayToken}`
            },
            body: JSON.stringify({ tool: toolName, args: args })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    }
    
    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => this.refreshAll(), 10000);
    }
    
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
    
    async refreshAll() {
        if (!this.isConnected) return;
        
        await Promise.allSettled([
            this.refreshSessions(),
            this.refreshStatus(),
            this.refreshCrons()
        ]);
    }
    
    async refreshSessions() {
        try {
            const result = await this.callTool('sessions_list', { messageLimit: 1, limit: 20 });
            let sessions = result?.result?.details?.sessions || result?.details?.sessions || result?.sessions || [];
            
            document.getElementById('sessionCount').textContent = sessions.length;
            this.world.updateAgents(sessions);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    }
    
    async refreshStatus() {
        try {
            const result = await this.callTool('session_status', {});
            let data = {};
            try {
                const text = result?.result?.content?.[0]?.text || '';
                if (text) data = typeof text === 'string' ? JSON.parse(text) : text;
            } catch(e) {
                data = result || {};
            }
            
            if (data.model) {
                document.getElementById('modelName').textContent = this.shortModel(data.model);
            }
            if (data.usage?.tokensTotal) {
                document.getElementById('tokensUsed').textContent = this.formatNumber(data.usage.tokensTotal);
            }
            if (data.usage?.cost) {
                document.getElementById('costDisplay').textContent = '$' + data.usage.cost.toFixed(2);
            }
            if (data.uptime) {
                document.getElementById('uptimeDisplay').textContent = this.formatDuration(data.uptime);
            }
        } catch (error) {
            console.error('Failed to load status:', error);
        }
    }
    
    async refreshCrons() {
        try {
            const result = await this.callTool('cron', { action: 'list' });
            const jobs = result?.jobs || [];
            document.getElementById('cronCount').textContent = jobs.length;
        } catch (error) {
            console.error('Failed to load crons:', error);
        }
    }
    
    shortModel(model) {
        if (!model) return 'unknown';
        const parts = model.split('/');
        const name = parts[parts.length - 1];
        return name.replace('claude-', '').replace('anthropic/', '');
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    }
    
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MoltcraftApp();
});
