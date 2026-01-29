// Moltbot Dashboard - Main Application Logic

class MoltbotDashboard {
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
        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettings();
        });

        // Close settings
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.hideSettings();
        });

        // Connect button
        document.getElementById('connectBtn').addEventListener('click', () => {
            this.saveSettings();
            this.connect();
        });

        // Manual refresh
        document.getElementById('refreshBtn').addEventListener('click', () => {
            if (this.isConnected) {
                this.refreshAll();
            }
        });

        // Close settings on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSettings();
            }
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

    showSettings() {
        document.getElementById('settingsPanel').classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settingsPanel').classList.add('hidden');
    }

    async connect() {
        this.hideSettings();
        this.updateConnectionStatus('Connecting...', false);

        try {
            // Test connection with session_status call
            await this.callTool('session_status', {});
            
            this.isConnected = true;
            this.updateConnectionStatus('Connected', true);
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            // Initial data load
            this.refreshAll();
        } catch (error) {
            this.isConnected = false;
            this.updateConnectionStatus('Error: ' + error.message, false, true);
            this.stopAutoRefresh();
        }
    }

    updateConnectionStatus(text, connected = false, error = false) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        statusText.textContent = text;
        statusDot.className = 'status-dot';
        
        if (connected) {
            statusDot.classList.add('connected');
        } else if (error) {
            statusDot.classList.add('error');
        }
    }

    async callTool(toolName, args) {
        const response = await fetch(`${this.gatewayUrl}/tools/invoke`, {
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
        
        document.getElementById('autoRefreshStatus').textContent = 'On (10s)';
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        document.getElementById('autoRefreshStatus').textContent = 'Off';
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
    }

    animatePulse(elementId) {
        const pulse = document.getElementById(elementId);
        pulse.classList.remove('active');
        // Trigger reflow to restart animation
        void pulse.offsetWidth;
        pulse.classList.add('active');
    }

    async refreshSessions() {
        this.animatePulse('sessionsPulse');
        
        try {
            const result = await this.callTool('sessions_list', {
                messageLimit: 1,
                limit: 20
            });

            this.renderSessions(result);
        } catch (error) {
            this.renderError('sessionsContent', 'Failed to load sessions: ' + error.message);
        }
    }

    async refreshStatus() {
        this.animatePulse('statusPulse');
        
        try {
            const result = await this.callTool('session_status', {});
            this.renderStatus(result);
        } catch (error) {
            this.renderError('statusContent', 'Failed to load status: ' + error.message);
        }
    }

    async refreshCronJobs() {
        this.animatePulse('cronPulse');
        
        try {
            const result = await this.callTool('cron', {
                action: 'list'
            });
            this.renderCronJobs(result);
        } catch (error) {
            this.renderError('cronContent', 'Failed to load cron jobs: ' + error.message);
        }
    }

    renderSessions(data) {
        const container = document.getElementById('sessionsContent');
        
        if (!data || !data.sessions || data.sessions.length === 0) {
            container.innerHTML = '<div class="loading">No active sessions</div>';
            return;
        }

        const html = data.sessions.map(session => {
            const timeSince = this.getTimeSince(session.lastActivity);
            const messagePreview = this.getMessagePreview(session);
            const badgeClass = session.kind || 'main';
            
            return `
                <div class="session-card">
                    <div class="session-header">
                        <span class="session-key">${this.escapeHtml(session.key)}</span>
                        <span class="session-badge ${badgeClass}">${badgeClass}</span>
                    </div>
                    <div class="session-info">
                        Agent: <code>${this.escapeHtml(session.agentId || 'unknown')}</code>
                    </div>
                    <div class="session-message">${this.escapeHtml(messagePreview)}</div>
                    <div class="session-time">${timeSince}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderStatus(data) {
        const container = document.getElementById('statusContent');
        
        if (!data) {
            container.innerHTML = '<div class="error">No status data</div>';
            return;
        }

        const items = [];

        // Model
        if (data.model) {
            items.push(this.createStatusItem('Model', data.model, true));
        }

        // Session info
        if (data.sessionKey) {
            items.push(this.createStatusItem('Session', data.sessionKey));
        }

        // Usage stats
        if (data.usage) {
            const usage = data.usage;
            if (usage.tokensTotal) {
                items.push(this.createStatusItem('Total Tokens', usage.tokensTotal.toLocaleString()));
            }
            if (usage.cost) {
                items.push(this.createStatusItem('Cost', '$' + usage.cost.toFixed(4)));
            }
        }

        // Uptime
        if (data.uptime) {
            items.push(this.createStatusItem('Uptime', this.formatDuration(data.uptime)));
        }

        // Message count
        if (data.messageCount !== undefined) {
            items.push(this.createStatusItem('Messages', data.messageCount));
        }

        container.innerHTML = items.join('');
    }

    renderCronJobs(data) {
        const container = document.getElementById('cronContent');
        
        if (!data || !data.jobs || data.jobs.length === 0) {
            container.innerHTML = '<div class="loading">No scheduled jobs</div>';
            return;
        }

        const html = data.jobs.map(job => {
            const enabled = job.enabled ? 'yes' : 'no';
            const lastRun = job.lastRun ? this.formatDate(job.lastRun) : 'Never';
            
            return `
                <div class="cron-job">
                    <div class="cron-header">
                        <span class="cron-name">${this.escapeHtml(job.name || job.id)}</span>
                        <span class="cron-enabled ${enabled}">${enabled}</span>
                    </div>
                    <div class="cron-schedule">${this.escapeHtml(job.schedule || 'N/A')}</div>
                    <div class="cron-last-run">Last run: ${lastRun}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderError(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="error">${this.escapeHtml(message)}</div>`;
    }

    createStatusItem(label, value, large = false) {
        const sizeClass = large ? 'large' : '';
        return `
            <div class="status-item">
                <div class="status-label">${label}</div>
                <div class="status-value ${sizeClass}">${this.escapeHtml(String(value))}</div>
            </div>
        `;
    }

    getMessagePreview(session) {
        if (!session.messages || session.messages.length === 0) {
            return 'No messages';
        }
        
        const lastMsg = session.messages[session.messages.length - 1];
        const content = lastMsg.content || lastMsg.text || '[No content]';
        
        // Truncate to 80 chars
        return content.length > 80 ? content.substring(0, 80) + '...' : content;
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
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    updateLastRefreshTime() {
        const now = new Date().toLocaleTimeString();
        document.getElementById('lastUpdate').textContent = now;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new MoltbotDashboard();
});
