// Moltbot Minecraft Dashboard - Main Application Logic

class MinecraftDashboard {
    constructor() {
        this.gatewayUrl = localStorage.getItem('gatewayUrl') || 'http://localhost:18789';
        this.gatewayToken = localStorage.getItem('gatewayToken') || '';
        this.isConnected = false;
        this.refreshInterval = null;
        this.refreshIntervalMs = 10000; // 10 seconds
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
        
        // Auto-connect if token is saved
        if (this.gatewayToken) {
            this.connect();
        }
    }

    setupEventListeners() {
        // Connect button
        document.getElementById('connectBtn').addEventListener('click', () => {
            this.saveSettings();
            this.connect();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            if (this.isConnected) {
                this.refreshAll();
                this.animateSlotClick('refreshBtn');
            }
        });
    }

    animateSlotClick(elementId) {
        const element = document.getElementById(elementId);
        element.classList.add('selected');
        setTimeout(() => element.classList.remove('selected'), 200);
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
            // Test connection with session_status call
            await this.callTool('session_status', {});
            
            this.isConnected = true;
            this.updateConnectionStatus('Connected', true);
            
            // Hide connection overlay
            document.getElementById('connectionOverlay').classList.add('hidden');
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            // Initial data load
            this.refreshAll();
        } catch (error) {
            this.isConnected = false;
            this.updateConnectionStatus('Error: ' + error.message, false);
        }
    }

    updateConnectionStatus(text, connected = false) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        statusText.textContent = text;
        statusIndicator.className = 'status-indicator';
        
        if (connected) {
            statusIndicator.classList.add('connected');
        } else {
            statusIndicator.classList.add('disconnected');
        }
    }

    async callTool(toolName, args) {
        const url = `${window.location.origin}/api/tools/invoke`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.gatewayToken}`
            },
            body: JSON.stringify({
                tool: toolName,
                args: args
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        
        this.refreshInterval = setInterval(() => {
            this.refreshAll();
        }, this.refreshIntervalMs);
        
        document.getElementById('autoRefreshStatus').textContent = 'Auto-refresh: On (10s)';
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        document.getElementById('autoRefreshStatus').textContent = 'Auto-refresh: Off';
    }

    async refreshAll() {
        if (!this.isConnected) return;

        const promises = [
            this.refreshSessions(),
            this.refreshStatus(),
            this.refreshCronJobs()
        ];

        await Promise.allSettled(promises);
        
        this.updateLastRefreshTime();
        this.updateXPBar();
    }

    async refreshSessions() {
        try {
            const result = await this.callTool('sessions_list', {
                messageLimit: 1,
                limit: 20
            });

            this.renderSessions(result);
        } catch (error) {
            this.renderError('worldContent', 'Failed to load sessions: ' + error.message);
        }
    }

    async refreshStatus() {
        try {
            const result = await this.callTool('session_status', {});
            this.renderStatus(result);
        } catch (error) {
            console.error('Failed to load status:', error);
        }
    }

    async refreshCronJobs() {
        try {
            const result = await this.callTool('cron', {
                action: 'list'
            });
            this.renderCronJobs(result);
        } catch (error) {
            this.renderError('craftingContent', 'Failed to load cron jobs: ' + error.message);
        }
    }

    renderSessions(apiResponse) {
        const container = document.getElementById('worldContent');
        
        // Parse the nested API response structure
        let sessions = [];
        if (apiResponse?.result?.details?.sessions) {
            sessions = apiResponse.result.details.sessions;
        } else if (apiResponse?.details?.sessions) {
            sessions = apiResponse.details.sessions;
        } else if (apiResponse?.sessions) {
            sessions = apiResponse.sessions;
        }
        
        if (sessions.length === 0) {
            container.innerHTML = '<div class="loading-text">No players in the world</div>';
            return;
        }

        // Update session count in hotbar
        document.getElementById('sessionCount').textContent = sessions.length;

        const html = sessions.map(session => {
            const timeSince = this.getTimeSince(session.updatedAt);
            const sessionType = this.getSessionType(session.key);
            const tokenPercent = this.calculateTokenPercent(session.totalTokens);
            const healthClass = tokenPercent > 70 ? 'warning' : tokenPercent > 90 ? 'danger' : '';
            const isWorking = this.isRecentlyActive(session.updatedAt);
            
            let emoji = '⛏️'; // Mining/working
            if (!isWorking) emoji = '💤'; // Idle
            if (sessionType === 'main') emoji = '💎'; // Diamond for main
            if (sessionType === 'subagent') emoji = '⚡'; // Lightning for subagent
            
            return `
                <div class="player-card ${sessionType}-session ${isWorking ? 'working' : ''}">
                    <div class="player-avatar ${sessionType} ${isWorking ? '' : 'idle'}">
                        ${emoji}
                    </div>
                    <div class="player-info">
                        <div class="player-nametag">${this.escapeHtml(session.label || session.key.split(':').pop())}</div>
                        
                        <div class="player-health">
                            <span class="health-label">HP:</span>
                            <div class="health-bar">
                                <div class="health-fill ${healthClass}" style="width: ${100 - tokenPercent}%"></div>
                            </div>
                        </div>
                        
                        <div class="player-stats">
                            Model: <code>${this.escapeHtml(this.shortModel(session.model))}</code>
                            · Tokens: ${(session.totalTokens || 0).toLocaleString()}
                        </div>
                        
                        <div class="player-stats">
                            Channel: ${this.escapeHtml(session.channel || session.lastChannel || 'n/a')}
                        </div>
                        
                        <div class="player-activity">${timeSince}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderStatus(apiResponse) {
        // Parse nested response
        let data = {};
        try {
            const text = apiResponse?.result?.content?.[0]?.text || '';
            if (text) data = typeof text === 'string' ? JSON.parse(text) : text;
        } catch(e) {
            data = apiResponse || {};
        }
        
        // Update hotbar stats
        if (data.model) {
            document.getElementById('modelName').textContent = this.shortModel(data.model);
        }
        
        if (data.usage) {
            if (data.usage.tokensTotal) {
                const tokens = data.usage.tokensTotal;
                document.getElementById('tokensUsed').textContent = this.formatNumber(tokens);
            }
            if (data.usage.cost) {
                document.getElementById('costDisplay').textContent = '$' + data.usage.cost.toFixed(2);
            }
        }
        
        if (data.uptime) {
            document.getElementById('uptimeDisplay').textContent = this.formatDuration(data.uptime);
        }
    }

    renderCronJobs(data) {
        const container = document.getElementById('craftingContent');
        
        if (!data || !data.jobs || data.jobs.length === 0) {
            container.innerHTML = '<div class="loading-text">No crafts scheduled</div>';
            document.getElementById('cronCount').textContent = '0';
            return;
        }

        // Update cron count in hotbar
        document.getElementById('cronCount').textContent = data.jobs.length;

        const html = data.jobs.map(job => {
            const enabled = job.enabled;
            const lastRun = job.lastRun ? this.formatDate(job.lastRun) : 'Never';
            
            return `
                <div class="craft-item">
                    <div class="craft-header">
                        <div class="craft-name">${this.escapeHtml(job.name || job.id)}</div>
                        <div class="craft-status ${enabled ? 'enabled' : 'disabled'}">
                            ${enabled ? 'ON' : 'OFF'}
                        </div>
                    </div>
                    <div class="craft-schedule">${this.escapeHtml(job.schedule || 'N/A')}</div>
                    <div class="craft-last-run">Last: ${lastRun}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderError(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="loading-text" style="color: var(--red);">${this.escapeHtml(message)}</div>`;
    }

    getSessionType(key) {
        if (key.includes('subagent')) return 'subagent';
        if (key.includes('isolated')) return 'isolated';
        return 'main';
    }

    calculateTokenPercent(tokens) {
        // Assume max context of 100k tokens
        const maxTokens = 100000;
        return Math.min(100, (tokens / maxTokens) * 100);
    }

    isRecentlyActive(timestamp) {
        if (!timestamp) return false;
        const now = Date.now();
        const then = new Date(timestamp).getTime();
        const diffMinutes = (now - then) / 1000 / 60;
        return diffMinutes < 5; // Active if updated in last 5 minutes
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

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString();
        }
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    }

    shortModel(model) {
        if (!model) return 'unknown';
        // Extract short name from model string
        const parts = model.split('/');
        const name = parts[parts.length - 1];
        return name.replace('claude-', '').replace('anthropic/', '');
    }

    updateLastRefreshTime() {
        const now = new Date().toLocaleTimeString();
        document.getElementById('lastUpdate').textContent = `Updated: ${now}`;
    }

    updateXPBar() {
        // Animate XP bar based on time (just for visual effect)
        const seconds = new Date().getSeconds();
        const percent = (seconds / 60) * 100;
        document.getElementById('xpFill').style.width = percent + '%';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new MinecraftDashboard();
});
