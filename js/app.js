// ========================================
// MOLTCRAFT v3 - Enhanced Isometric Agent Dashboard
// Pure vanilla JS + Canvas with Particles & Animations
// ========================================

function sessionUID(s) {
    return s.sessionId || s.id || s.key || ('unknown-' + Math.random());
}

// ========================================
// SOUND ENGINE - Synthesized Retro Sounds
// ========================================

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.volume = 0.3;
        this.initialized = false;
        // Ambient
        this.ambientPlaying = false;
        this.ambientGain = null;
        this.ambientOscillators = [];
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio not available');
        }
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.masterGain) {
            this.masterGain.gain.value = muted ? 0 : this.volume;
        }
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    _tone(freq, duration, type = 'square', delay = 0) {
        if (!this.initialized || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime + delay);
        osc.stop(this.ctx.currentTime + delay + duration);
    }

    // --- Sound effects ---

    connect() {
        // Ascending arpeggio — gateway connected
        this._tone(262, 0.12, 'square', 0);
        this._tone(330, 0.12, 'square', 0.1);
        this._tone(392, 0.12, 'square', 0.2);
        this._tone(523, 0.2, 'square', 0.3);
    }

    selectAgent() {
        // Quick blip
        this._tone(440, 0.08, 'square', 0);
        this._tone(660, 0.1, 'square', 0.06);
    }

    newAgent() {
        // Fanfare — new session detected
        this._tone(392, 0.1, 'square', 0);
        this._tone(494, 0.1, 'square', 0.1);
        this._tone(587, 0.15, 'square', 0.2);
        this._tone(784, 0.25, 'triangle', 0.3);
    }

    sendMessage() {
        // Whoosh send
        this._tone(300, 0.06, 'sawtooth', 0);
        this._tone(500, 0.08, 'sawtooth', 0.04);
    }

    receiveMessage() {
        // Gentle ping
        this._tone(880, 0.1, 'sine', 0);
        this._tone(660, 0.12, 'sine', 0.08);
    }

    spawnQuest() {
        // Epic spawn — horn call
        this._tone(294, 0.15, 'sawtooth', 0);
        this._tone(392, 0.15, 'sawtooth', 0.12);
        this._tone(494, 0.15, 'sawtooth', 0.24);
        this._tone(587, 0.3, 'sawtooth', 0.36);
        this._tone(784, 0.4, 'triangle', 0.5);
    }

    firework() {
        // Pop + sparkle
        this._tone(200, 0.05, 'sawtooth', 0);
        this._tone(800, 0.08, 'sine', 0.05);
        this._tone(1200, 0.06, 'sine', 0.1);
        this._tone(600, 0.1, 'sine', 0.15);
    }

    toast() {
        // Notification ding
        this._tone(523, 0.08, 'sine', 0);
        this._tone(659, 0.12, 'sine', 0.06);
    }

    error() {
        // Descending buzz
        this._tone(300, 0.15, 'square', 0);
        this._tone(200, 0.2, 'square', 0.12);
    }

    click() {
        // UI click
        this._tone(800, 0.03, 'square', 0);
    }

    // Ambient background — low drone + wind
    startAmbient() {
        if (!this.initialized || this.ambientPlaying) return;
        this.ambientPlaying = true;
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.value = 0.04;
        this.ambientGain.connect(this.masterGain);

        // Low drone
        const drone = this.ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = 55;
        drone.connect(this.ambientGain);
        drone.start();
        this.ambientOscillators.push(drone);

        // Subtle wind noise via filtered oscillator
        const wind = this.ctx.createOscillator();
        wind.type = 'sawtooth';
        wind.frequency.value = 80;
        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 120;
        wind.connect(windFilter);
        windFilter.connect(this.ambientGain);
        wind.start();
        this.ambientOscillators.push(wind);
    }

    stopAmbient() {
        this.ambientOscillators.forEach(o => { try { o.stop(); } catch(e) {} });
        this.ambientOscillators = [];
        this.ambientPlaying = false;
    }
}

// Global sound engine
const sfx = new SoundEngine();

// ========================================
// VOICE ENGINE - ElevenLabs TTS + Browser STT
// ========================================

class VoiceEngine {
    constructor() {
        this.elevenLabsKey = '';
        this.defaultVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel
        this.autoSpeak = false;
        this.autoSpeakToasts = false;
        this.speaking = false;
        this.audioQueue = [];
        this.recognition = null;
        this.isRecording = false;
        this.loadSettings();
        this.initSTT();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('moltcraft_voice_settings');
            if (saved) {
                const s = JSON.parse(saved);
                this.elevenLabsKey = s.elevenLabsKey || '';
                this.defaultVoiceId = s.defaultVoiceId || '21m00Tcm4TlvDq8ikWAM';
                this.autoSpeak = s.autoSpeak || false;
                this.autoSpeakToasts = s.autoSpeakToasts || false;
            }
        } catch (e) {}
    }

    saveSettings() {
        localStorage.setItem('moltcraft_voice_settings', JSON.stringify({
            elevenLabsKey: this.elevenLabsKey,
            defaultVoiceId: this.defaultVoiceId,
            autoSpeak: this.autoSpeak,
            autoSpeakToasts: this.autoSpeakToasts
        }));
    }

    get isConfigured() {
        return !!this.elevenLabsKey;
    }

    // --- Speech-to-Text (Browser native) ---

    initSTT() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported');
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            const input = document.getElementById('messageInput');
            if (input) input.value = transcript;

            // If final result, auto-focus input
            if (event.results[event.results.length - 1].isFinal) {
                if (input) input.focus();
            }
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            const btn = document.getElementById('micBtn');
            if (btn) btn.classList.remove('recording');
        };

        this.recognition.onerror = (event) => {
            console.warn('STT error:', event.error);
            this.isRecording = false;
            const btn = document.getElementById('micBtn');
            if (btn) btn.classList.remove('recording');
        };
    }

    toggleRecording() {
        if (!this.recognition) {
            alert('Speech Recognition not supported in this browser. Use Chrome.');
            return;
        }

        if (this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
            document.getElementById('micBtn')?.classList.remove('recording');
        } else {
            // Detect language from page or default
            this.recognition.lang = navigator.language || 'en-US';
            this.recognition.start();
            this.isRecording = true;
            document.getElementById('micBtn')?.classList.add('recording');
            sfx.click();
        }
    }

    // --- Text-to-Speech (ElevenLabs) ---

    async speak(text, voiceId) {
        if (!this.isConfigured || !text) return;

        const vid = voiceId || this.defaultVoiceId;
        // Truncate very long texts
        const truncated = text.length > 500 ? text.slice(0, 500) + '...' : text;

        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': this.elevenLabsKey
                },
                body: JSON.stringify({
                    text: truncated,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) {
                console.warn('ElevenLabs TTS error:', response.status);
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            await this.playAudio(url);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.warn('TTS failed:', e);
        }
    }

    playAudio(url) {
        return new Promise((resolve) => {
            const audio = new Audio(url);
            this.speaking = true;
            audio.onended = () => {
                this.speaking = false;
                resolve();
            };
            audio.onerror = () => {
                this.speaking = false;
                resolve();
            };
            audio.play().catch(() => {
                this.speaking = false;
                resolve();
            });
        });
    }

    // Auto-speak agent response if enabled
    async speakAgentResponse(text) {
        if (this.autoSpeak && this.isConfigured && text) {
            await this.speak(text);
        }
    }

    // Auto-speak toast if enabled
    async speakToast(message) {
        if (this.autoSpeakToasts && this.isConfigured && message) {
            // Strip emoji for cleaner speech
            const clean = message.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu, '').trim();
            if (clean) await this.speak(clean);
        }
    }
}

// Global voice engine
const voice = new VoiceEngine();

class MoltcraftApp {
    constructor() {
        this.gatewayUrl = window.location.origin;
        this.gatewayToken = '';
        this.sessions = [];
        this.selectedSession = null;
        this.world = null;
        this.refreshInterval = null;
        this.previousSessionIds = new Set();
        this.startTime = Date.now();
        
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
        document.getElementById('newQuestBtn').addEventListener('click', () => this.showNewQuestModal());
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('micBtn').addEventListener('click', () => voice.toggleRecording());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('muteBtn').addEventListener('click', () => {
            sfx.init();
            const muted = sfx.toggleMute();
            const btn = document.getElementById('muteBtn');
            btn.textContent = muted ? '🔇' : '🔊';
            btn.classList.toggle('muted', muted);
        });
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
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
            
            // Init sound & play connect SFX + ambient
            sfx.init();
            sfx.connect();
            sfx.startAmbient();
            
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
        const baseUrl = this.gatewayUrl || window.location.origin;
        const response = await fetch(`${baseUrl}/api/tools/invoke`, {
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

        // Detect new and removed agents
        const currentIds = new Set(sessions.map(s => sessionUID(s)));
        
        // New agents
        currentIds.forEach(id => {
            if (!this.previousSessionIds.has(id) && this.previousSessionIds.size > 0) {
                const session = sessions.find(s => sessionUID(s) === id);
                const label = session?.label || 'Agent';
                this.showToast('🎉 New agent spawned: ' + label, 'success');
                sfx.newAgent();
                if (this.world) {
                    this.world.spawnFireworks(31, 23);
                }
            }
        });
        
        // Removed agents
        this.previousSessionIds.forEach(id => {
            if (!currentIds.has(id)) {
                this.showToast('✅ Agent completed task', 'info');
            }
        });
        
        this.previousSessionIds = currentIds;
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
        const key = session.key || sessionUID(session) || session.sessionId || '';
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

        if (this.selectedSession?.id === sessionUID(session)) {
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
        sfx.selectAgent();
        this.updateUI();
        this.updateBottomPanel();
        this.loadChatHistory(); // Load chat when selecting
        this.world.selectAgent(sessionUID(session));
    }

    updateBottomPanel() {
        const panel = document.getElementById('bottomPanel');
        const chatPanel = document.getElementById('chatSidebar');
        
        if (!this.selectedSession) {
            panel.classList.add('hidden');
            chatPanel.classList.add('hidden');
            document.body.classList.remove('panel-open');
            this.resizeCanvas();
            return;
        }

        panel.classList.remove('hidden');
        chatPanel.classList.remove('hidden');
        document.body.classList.add('panel-open');
        this.resizeCanvas();

        const session = this.selectedSession;
        
        // Update header
        const type = this.getSessionType(session);
        let panelLabel = 'Unknown';
        if (type === 'main' && !session.label) {
            panelLabel = 'Bernard 🐢 (main)';
        } else {
            panelLabel = session.label || session.key || sessionUID(session);
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
        
        const msgCount = session.messageCount || session.messages?.length || 0;
        document.getElementById('messageCount').textContent = msgCount;
        
        document.getElementById('channelBadge').textContent = session.channel || 'telegram';

        // Chat is now loaded separately via loadChatHistory()

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

    showSettings() {
        const modal = document.getElementById('settingsModal');
        document.getElementById('elevenLabsKey').value = voice.elevenLabsKey;
        document.getElementById('elevenLabsVoice').value = voice.defaultVoiceId;
        document.getElementById('autoSpeakEnabled').checked = voice.autoSpeak;
        document.getElementById('autoSpeakToasts').checked = voice.autoSpeakToasts;
        modal.classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    saveSettings() {
        voice.elevenLabsKey = document.getElementById('elevenLabsKey').value.trim();
        voice.defaultVoiceId = document.getElementById('elevenLabsVoice').value.trim() || '21m00Tcm4TlvDq8ikWAM';
        voice.autoSpeak = document.getElementById('autoSpeakEnabled').checked;
        voice.autoSpeakToasts = document.getElementById('autoSpeakToasts').checked;
        voice.saveSettings();
        this.hideSettings();
        this.showToast('✅ Voice settings saved', 'success');
    }

    showNewQuestModal() {
        const modal = document.getElementById('newQuestModal');
        const input = document.getElementById('questTaskInput');
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
    }

    hideNewQuestModal() {
        document.getElementById('newQuestModal').classList.add('hidden');
    }

    async spawnNewQuest() {
        const input = document.getElementById('questTaskInput');
        const task = input.value.trim();
        
        if (!task) {
            this.showToast('⚠️ Please enter a quest description', 'warning');
            return;
        }

        try {
            const label = 'quest-' + Date.now();
            await this.invokeAPI('sessions_spawn', { task, label });
            
            this.hideNewQuestModal();
            this.showToast('🎉 New quest spawned: ' + label, 'success');
            sfx.spawnQuest();
            
            // Trigger fireworks at the barracks
            if (this.world) {
                this.world.spawnFireworks(31, 23);
                setTimeout(() => sfx.firework(), 500);
            }
            
            // Refresh to show new agent
            setTimeout(() => this.refreshData(), 1000);
        } catch (error) {
            this.showToast('❌ Failed to spawn quest: ' + error.message, 'error');
        }
    }

    showToast(message, type = 'info') {
        if (type === 'error') sfx.error();
        else sfx.toast();
        voice.speakToast(message);
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Slide in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 5000);
    }

    async loadChatHistory() {
        if (!this.selectedSession || !this.selectedSession.key) return;
        
        try {
            const result = await this.invokeAPI('sessions_history', {
                sessionKey: this.selectedSession.key,
                limit: 5
            });
            
            let messages = [];
            if (result.result?.details?.messages) {
                messages = result.result.details.messages;
            } else if (result.result?.content?.[0]?.text) {
                try {
                    const parsed = JSON.parse(result.result.content[0].text);
                    messages = parsed.messages || [];
                } catch (e) {
                    console.error('Failed to parse history:', e);
                }
            }
            
            this.displayChat(messages);
        } catch (error) {
            console.error('Failed to load chat:', error);
        }
    }

    displayChat(messages) {
        const chatContent = document.getElementById('chatMessages');
        chatContent.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            chatContent.innerHTML = '<div class="chat-empty">No messages yet...</div>';
            this._lastChatMsgCount = 0;
            return;
        }
        
        // Detect new assistant messages and auto-speak the latest
        const assistantMsgs = messages.filter(m => m.role === 'assistant');
        const prevCount = this._lastChatMsgCount || 0;
        if (assistantMsgs.length > prevCount && prevCount > 0) {
            const newest = assistantMsgs[assistantMsgs.length - 1];
            let spText = '';
            if (newest.content) {
                for (const part of (Array.isArray(newest.content) ? newest.content : [newest.content])) {
                    if (part.type === 'text' && part.text) { spText = part.text; break; }
                }
                if (!spText && typeof newest.content === 'string') spText = newest.content;
            }
            if (spText) voice.speakAgentResponse(spText);
        }
        this._lastChatMsgCount = assistantMsgs.length;
        
        messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble chat-' + (msg.role || 'user');
            
            let text = '';
            if (msg.content) {
                for (const part of (Array.isArray(msg.content) ? msg.content : [msg.content])) {
                    if (part.type === 'text' && part.text) {
                        text = part.text;
                        break;
                    }
                }
                if (!text && typeof msg.content === 'string') {
                    text = msg.content;
                }
            }
            
            // Truncate long messages
            if (text.length > 200) {
                text = text.substring(0, 200) + '...';
            }
            
            bubble.textContent = text || '(empty message)';
            chatContent.appendChild(bubble);
        });
        
        // Auto-scroll to bottom
        chatContent.scrollTop = chatContent.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || !this.selectedSession || !this.selectedSession.key) return;
        sfx.sendMessage();
        
        try {
            await this.invokeAPI('sessions_send', {
                sessionKey: this.selectedSession.key,
                message: message
            });
            
            // Show message immediately
            const chatContent = document.getElementById('chatMessages');
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble chat-user';
            bubble.textContent = message;
            chatContent.appendChild(bubble);
            chatContent.scrollTop = chatContent.scrollHeight;
            
            input.value = '';
            
            // Refresh after a moment to get assistant response
            setTimeout(() => this.loadChatHistory(), 2000);
        } catch (error) {
            this.showToast('❌ Failed to send message: ' + error.message, 'error');
        }
    }

    animate() {
        this.world.update();
        this.world.render();
        this.updateLiveStats();
        requestAnimationFrame(() => this.animate());
    }

    updateLiveStats() {
        // Animate token count
        const stats = this.calculateStats();
        const currentTokens = parseInt(document.getElementById('tokenCount').textContent.replace(/[^0-9]/g, '')) || 0;
        const targetTokens = stats.totalTokens;
        
        if (currentTokens !== targetTokens) {
            const diff = (targetTokens - currentTokens) * 0.1;
            const newValue = Math.round(currentTokens + diff);
            document.getElementById('tokenCount').textContent = this.formatNumber(newValue);
        }
        
        // Update total cost
        const totalCost = stats.totalTokens * 0.000015; // Rough estimate
        document.getElementById('totalCost').textContent = '$' + totalCost.toFixed(4);
        
        // Update active time
        const activeTime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(activeTime / 3600);
        const mins = Math.floor((activeTime % 3600) / 60);
        const secs = activeTime % 60;
        document.getElementById('activeTime').textContent = 
            `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        this.weatherParticles = [];
        this.fireworks = [];
        this.selectedAgentId = null;
        
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        
        this.animFrame = 0;
        this.terrainMap = [];
        this.pathMap = [];
        
        // Day/night cycle (120 seconds = 2 minutes per full cycle)
        this.timeOfDay = 0; // 0-1 (0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk)
        this.dayNightSpeed = 1 / (120 * 60); // Full cycle in 2 minutes (at 60fps)
        
        // Mini-map
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        // Weather enabled
        this.weatherEnabled = true;
        
        this.initWorld();
        this.bindEvents();
        this.initWeather();
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
                label: '⚡ COMMAND CENTER',
                speechBubble: {
                    text: '',
                    opacity: 0,
                    fadeDir: 0, // -1 fade out, 0 idle, 1 fade in
                    timer: 120,
                    msgIndex: 0,
                    messages: [
                        () => { const s = window.moltcraftApp?.sessions; return s ? `${s.length} sessions active` : 'Connecting to gateway...'; },
                        () => { const s = window.moltcraftApp?.calculateStats(); return s?.working ? `${s.working} agents processing` : 'Idle — waiting for tasks'; },
                        () => { const c = document.getElementById('totalCost')?.textContent; return c && c !== '$0.0000' ? `Spend: ${c}` : 'No API calls yet'; },
                        () => { const s = window.moltcraftApp?.sessions; const channels = [...new Set((s||[]).map(x=>x.channel).filter(Boolean))]; return channels.length ? `Channels: ${channels.join(', ')}` : 'No channels connected'; },
                        () => { const s = window.moltcraftApp?.calculateStats(); return s ? `${s.working} working, ${s.idle} idle, ${s.waiting} waiting` : 'Loading stats...'; },
                        () => { const s = window.moltcraftApp?.sessions; const models = [...new Set((s||[]).map(x=>x.model).filter(Boolean))]; return models.length ? `Models: ${models.map(m=>m.split('/').pop()).join(', ')}` : 'No models loaded'; },
                        () => { const t = document.getElementById('activeTime')?.textContent; return t && t !== '00:00:00' ? `Uptime: ${t}` : 'Just started'; }
                    ]
                }
            },
            // Clock Tower (Cron) - 4x3 footprint
            {
                type: 'craft',
                x: 20,
                y: 24,
                width: 4,
                height: 3,
                label: '⏰ CLOCK TOWER',
                speechBubble: {
                    text: '',
                    opacity: 0,
                    fadeDir: 0,
                    timer: 180,
                    msgIndex: 0,
                    messages: [
                        () => { const app = window.moltcraftApp; if (!app?.gatewayUrl) return 'No gateway'; try { fetch(`${app.gatewayUrl}/api/cron/list`, {headers:{'Authorization':`Bearer ${app.gatewayToken}`}}).then(r=>r.json()).then(d=>{window._cronJobs=d.jobs||[];}).catch(()=>{}); } catch(e){} const jobs = window._cronJobs; return jobs?.length ? `${jobs.length} cron jobs` : 'Loading cron...'; },
                        () => { const jobs = window._cronJobs; if (!jobs?.length) return 'No schedules'; const j = jobs[Math.floor(Math.random()*jobs.length)]; return j.name ? `Job: ${j.name}` : 'Job running...'; },
                        () => { const jobs = window._cronJobs; if (!jobs?.length) return 'Idle clock'; const enabled = jobs.filter(j=>j.enabled!==false).length; return `${enabled}/${jobs.length} jobs enabled`; },
                        () => { const jobs = window._cronJobs; if (!jobs?.length) return 'Waiting...'; const j = jobs.find(j=>j.schedule?.kind==='cron'); return j ? `Schedule: ${j.schedule.expr||'custom'}` : 'Timer-based jobs'; },
                        () => { const jobs = window._cronJobs; if (!jobs?.length) return 'No timers'; const every = jobs.filter(j=>j.schedule?.kind==='every'); return every.length ? `${every.length} recurring timers` : 'Cron expressions only'; }
                    ]
                }
            },
            // Token Mine - 3x4 footprint
            {
                type: 'mine',
                x: 37,
                y: 29,
                width: 3,
                height: 4,
                label: '⛏️ TOKEN MINE',
                speechBubble: {
                    text: '',
                    opacity: 0,
                    fadeDir: 0,
                    timer: 150,
                    msgIndex: 0,
                    messages: [
                        () => { const t = document.getElementById('tokenCount')?.textContent; return t && t !== '0' ? `${Number(t).toLocaleString()} tokens used` : 'No tokens yet'; },
                        () => { const c = document.getElementById('totalCost')?.textContent; return c && c !== '$0.0000' ? `Cost so far: ${c}` : 'Zero spend'; },
                        () => { const s = window.moltcraftApp?.sessions; if (!s?.length) return 'No sessions'; const total = s.reduce((a,x)=>a+(x.totalTokens||0),0); return total ? `${total.toLocaleString()} total tokens` : 'Waiting for usage...'; },
                        () => { const s = window.moltcraftApp?.sessions; if (!s?.length) return 'Idle mine'; const biggest = s.reduce((max,x)=>(x.totalTokens||0)>(max.totalTokens||0)?x:max,s[0]); return biggest?.label ? `Top miner: ${biggest.label.slice(0,20)}` : 'Mining...'; },
                        () => { const s = window.moltcraftApp?.sessions; if (!s?.length) return 'Empty shaft'; const msgs = s.reduce((a,x)=>a+(x.messageCount||0),0); return `${msgs} messages processed`; }
                    ]
                }
            },
            // Agent Hall (Barracks) - 4x4 footprint
            {
                type: 'barracks',
                x: 28,
                y: 20,
                width: 4,
                height: 4,
                label: '🏰 AGENT HALL',
                speechBubble: {
                    text: '',
                    opacity: 0,
                    fadeDir: 0,
                    timer: 200,
                    msgIndex: 0,
                    messages: [
                        () => { const s = window.moltcraftApp?.sessions; if (!s?.length) return 'No agents'; const main = s.filter(x=>x.kind==='main').length; const sub = s.filter(x=>x.kind==='subagent').length; return `${main} main, ${sub} sub-agents`; },
                        () => { const s = window.moltcraftApp?.sessions; if (!s?.length) return 'Empty hall'; const latest = s[s.length-1]; return latest?.label ? `Latest: ${latest.label.slice(0,25)}` : 'Awaiting recruits'; },
                        () => { const s = window.moltcraftApp?.sessions; if (!s?.length) return 'Doors open'; const active = s.filter(x=>x.lastActivity && (Date.now()-new Date(x.lastActivity).getTime())<300000).length; return `${active} active in last 5min`; },
                        () => { const s = window.moltcraftApp?.sessions; if (!s?.length) return 'Roll call...'; const channels = (s||[]).map(x=>x.channel).filter(Boolean); const tg = channels.filter(c=>c==='telegram').length; const wa = channels.filter(c=>c==='whatsapp').length; return tg||wa ? `${tg} Telegram, ${wa} WhatsApp` : `${s.length} sessions total`; },
                        () => { const s = window.moltcraftApp?.sessions; if (!s?.length) return 'Recruiting...'; const models = (s||[]).map(x=>x.model).filter(Boolean); const opus = models.filter(m=>m.includes('opus')).length; const sonnet = models.filter(m=>m.includes('sonnet')).length; return `${opus} Opus, ${sonnet} Sonnet`; }
                    ]
                }
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
                this.selectedAgentId = agent.uid;
                // Notify app to select in sidebar
                if (window.moltcraftApp) {
                    const session = window.moltcraftApp.sessions.find(s => sessionUID(s) === agent.uid);
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
        const existingIds = new Set(this.agents.map(a => a.uid));
        const sessionIds = new Set(sessions.map(s => sessionUID(s)));

        // Remove agents that no longer exist
        this.agents = this.agents.filter(a => sessionIds.has(a.uid));

        // Add new agents
        sessions.forEach(session => {
            if (!existingIds.has(sessionUID(session))) {
                this.createAgent(session);
            } else {
                // Update existing agent
                const agent = this.agents.find(a => a.uid === sessionUID(session));
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
        const id = sessionUID(session) || '';
        if (id.includes('subagent')) return 'subagent';
        if (id.includes('isolated')) return 'isolated';
        return 'main';
    }

    createAgent(session) {
        const type = this.getAgentType(session);
        const state = this.getAgentState(session);

        // Building front positions (entrance side, aligned with paths)
        // Gateway(27,27 6x4), Cron(20,24 4x3), Mine(37,29 3x4), Barracks(28,20 4x4)
        const buildingFronts = [
            { name: 'gateway',  x: 31, y: 30 },  // Gateway entrance (center-front)
            { name: 'cron',     x: 23, y: 26 },  // Cron entrance
            { name: 'mine',     x: 39, y: 32 },  // Mine entrance
            { name: 'barracks', x: 31, y: 23 },  // Barracks entrance
        ];

        // Distribute agents evenly across buildings
        const agentIndex = this.agents.length;
        const assignedBuilding = buildingFronts[agentIndex % buildingFronts.length];
        const offsetX = (Math.random() - 0.5) * 4;
        const offsetY = (Math.random() - 0.5) * 3;

        const agent = {
            uid: sessionUID(session),
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

    hashCode(str) {
        if (!str) str = 'default';
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    }

    selectAgent(id) {
        this.selectedAgentId = id;
    }

    initWeather() {
        // Initialize snow particles
        for (let i = 0; i < 100; i++) {
            this.weatherParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 1 + Math.random() * 2,
                speed: 0.5 + Math.random() * 1.5,
                drift: (Math.random() - 0.5) * 0.5
            });
        }
    }

    spawnFireworks(tileX, tileY) {
        const pos = this.toScreen(tileX, tileY);
        const colors = ['#ff6600', '#ffcc00', '#ff0066', '#00ccff', '#00ff66', '#ff00ff'];
        
        // Explosion at target
        for (let i = 0; i < 80; i++) {
            const angle = (Math.PI * 2 * i) / 80;
            const speed = 2 + Math.random() * 4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.fireworks.push({
                x: pos.x,
                y: pos.y - 100,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                color: color,
                life: 60,
                maxLife: 60,
                size: 2 + Math.random() * 2
            });
        }
    }

    update() {
        this.animFrame++;
        
        // Update day/night cycle
        this.timeOfDay = (this.timeOfDay + this.dayNightSpeed) % 1;
        
        // Smooth zoom
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;

        // Update agents
        this.agents.forEach(agent => {
            agent.animFrame++;

            // Building destination points (entrances, aligned with paths)
            const buildingDestinations = {
                gateway:  { x: 31, y: 30 },  // Gateway front
                cron:     { x: 23, y: 26 },  // Cron front
                mine:     { x: 39, y: 32 },  // Mine front
                barracks: { x: 31, y: 23 },  // Barracks front
            };

            // Path waypoints between buildings (on the dirt/stone paths)
            const pathWaypoints = [
                { x: 27, y: 28 },  // Between Cron and Gateway (on path)
                { x: 35, y: 31 },  // Between Gateway and Mine (on path)
                { x: 31, y: 26 },  // Between Gateway and Barracks (on path)
                { x: 27, y: 24 },  // Between Cron and Barracks (on path)
                { x: 35, y: 27 },  // Between Barracks and Mine (on path)
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
        
        // Update weather particles
        if (this.weatherEnabled) {
            this.weatherParticles.forEach(p => {
                p.y += p.speed;
                p.x += p.drift;
                
                // Wrap around
                if (p.y > this.canvas.height) {
                    p.y = 0;
                    p.x = Math.random() * this.canvas.width;
                }
                if (p.x < 0) p.x = this.canvas.width;
                if (p.x > this.canvas.width) p.x = 0;
            });
        }
        
        // Update fireworks
        this.fireworks = this.fireworks.filter(f => {
            f.x += f.vx;
            f.y += f.vy;
            f.vy += 0.15; // Gravity
            f.life--;
            return f.life > 0;
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

        // Update speech bubbles
        this.buildings.forEach(building => {
            const sb = building.speechBubble;
            if (!sb) return;

            sb.timer--;

            if (sb.timer <= 0) {
                if (sb.fadeDir === 0 && sb.opacity === 0) {
                    // Pick next message and start fading in
                    const msgFn = sb.messages[sb.msgIndex % sb.messages.length];
                    const result = typeof msgFn === 'function' ? msgFn() : msgFn;
                    // Handle async messages (Promises)
                    if (result && typeof result.then === 'function') {
                        result.then(text => { sb.text = text || '...'; }).catch(() => { sb.text = '...'; });
                        sb.text = '...';
                    } else {
                        sb.text = result;
                    }
                    sb.msgIndex++;
                    sb.fadeDir = 1;
                } else if (sb.fadeDir === 0 && sb.opacity >= 1) {
                    // Been showing, now fade out
                    sb.fadeDir = -1;
                }
            }

            if (sb.fadeDir === 1) {
                sb.opacity = Math.min(1, sb.opacity + 0.04);
                if (sb.opacity >= 1) {
                    sb.fadeDir = 0;
                    sb.timer = 120 + Math.floor(Math.random() * 60); // Show for 2-3 sec
                }
            } else if (sb.fadeDir === -1) {
                sb.opacity = Math.max(0, sb.opacity - 0.04);
                if (sb.opacity <= 0) {
                    sb.fadeDir = 0;
                    sb.timer = 90 + Math.floor(Math.random() * 120); // Wait 1.5-3.5 sec before next
                }
            }
        });
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
        
        // Draw shadows first
        sortedBuildings.forEach(building => this.drawBuildingShadow(building));
        
        // Then buildings
        sortedBuildings.forEach(building => this.drawBuilding(building));

        // Layer 2.5: Speech bubbles (above buildings, below agents)
        sortedBuildings.forEach(building => this.drawSpeechBubble(building));

        // Layer 3: Agents ALWAYS drawn last (always visible, never hidden by buildings)
        const sortedAgents = [...this.agents].sort((a, b) => a.y - b.y);
        sortedAgents.forEach(agent => this.drawAgent(agent));

        // Draw particles
        this.particles.forEach(p => p.draw(ctx));
        
        // Draw fireworks (world space)
        this.fireworks.forEach(f => {
            ctx.fillStyle = f.color;
            ctx.globalAlpha = f.life / f.maxLife;
            ctx.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
        });
        ctx.globalAlpha = 1;

        ctx.restore();
        
        // === Post-transform overlays (screen space) ===
        
        // Fog of war / edge vignette
        this.drawFogOfWar();
        
        // Day/night overlay
        this.drawDayNightOverlay();
        
        // Weather particles (screen space)
        if (this.weatherEnabled) {
            ctx.fillStyle = '#ffffff';
            this.weatherParticles.forEach(p => {
                ctx.globalAlpha = 0.6;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });
            ctx.globalAlpha = 1;
        }
        
        // Minimap
        this.drawMinimap();

        // Draw UI overlay (zoom indicator)
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(10, 10, 120, 30);
        ctx.fillStyle = '#c8a832';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(1)}x`, 20, 30);
    }
    
    drawFogOfWar() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.max(this.canvas.width, this.canvas.height) * 0.7;
        
        const gradient = ctx.createRadialGradient(centerX, centerY, maxRadius * 0.4, centerX, centerY, maxRadius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawDayNightOverlay() {
        const ctx = this.ctx;
        let overlayColor;
        let starOpacity = 0;
        
        // 0-0.25: Night -> Dawn
        // 0.25-0.5: Day
        // 0.5-0.75: Dusk -> Sunset
        // 0.75-1.0: Night
        
        if (this.timeOfDay < 0.25) {
            // Night -> Dawn
            const t = this.timeOfDay / 0.25;
            overlayColor = `rgba(20, 20, 60, ${0.5 * (1 - t)})`;
            starOpacity = 1 - t;
        } else if (this.timeOfDay < 0.5) {
            // Day
            overlayColor = 'rgba(135, 206, 250, 0.1)'; // Light blue tint
            starOpacity = 0;
        } else if (this.timeOfDay < 0.75) {
            // Sunset
            const t = (this.timeOfDay - 0.5) / 0.25;
            overlayColor = `rgba(255, 140, 60, ${0.3 * t})`;
            starOpacity = 0;
        } else {
            // Dusk -> Night
            const t = (this.timeOfDay - 0.75) / 0.25;
            overlayColor = `rgba(20, 20, 60, ${0.5 * t})`;
            starOpacity = t;
        }
        
        ctx.fillStyle = overlayColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars during night
        if (starOpacity > 0) {
            ctx.fillStyle = '#ffffff';
            const starCount = 100;
            for (let i = 0; i < starCount; i++) {
                const x = (i * 1234567) % this.canvas.width;
                const y = (i * 7654321) % this.canvas.height;
                const twinkle = Math.sin(this.animFrame * 0.05 + i) * 0.3 + 0.7;
                ctx.globalAlpha = starOpacity * twinkle * 0.8;
                ctx.fillRect(x, y, 2, 2);
            }
            ctx.globalAlpha = 1;
        }
    }
    
    drawMinimap() {
        const mc = this.minimapCanvas;
        const ctx = this.minimapCtx;
        const size = 150;
        
        ctx.clearRect(0, 0, size, size);
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, size, size);
        
        // Border
        ctx.strokeStyle = '#c8a832';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, size, size);
        
        // Draw world (simplified)
        const scale = size / this.mapWidth;
        
        // Buildings (brown squares)
        ctx.fillStyle = '#8B6914';
        this.buildings.forEach(b => {
            ctx.fillRect(b.x * scale, b.y * scale, b.width * scale, b.height * scale);
        });
        
        // Agents (green dots)
        ctx.fillStyle = '#4ade80';
        this.agents.forEach(a => {
            ctx.beginPath();
            ctx.arc(a.x * scale, a.y * scale, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Viewport indicator (white rectangle)
        const viewW = (this.canvas.width / this.camera.zoom / this.tileWidth) * scale;
        const viewH = (this.canvas.height / this.camera.zoom / this.tileHeight) * scale;
        const viewX = (this.mapWidth / 2) * scale - (this.camera.x / this.camera.zoom / this.tileWidth) * scale - viewW / 2;
        const viewY = (this.mapHeight / 2) * scale - (this.camera.y / this.camera.zoom / this.tileHeight) * scale - viewH / 2;
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(viewX, viewY, viewW, viewH);
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
                        // Animated water with waves
                        const wave1 = Math.sin(this.animFrame * 0.03 + x * 0.5) * 8;
                        const wave2 = Math.cos(this.animFrame * 0.04 + y * 0.4) * 8;
                        const shimmer = wave1 + wave2;
                        color = `rgb(${60 + shimmer}, ${120 + shimmer}, ${200 + shimmer})`;
                        
                        // Sparkles
                        if (Math.random() < 0.005) {
                            const sparklePos = this.toScreen(x, y);
                            this.addParticle(
                                sparklePos.x + (Math.random() - 0.5) * this.tileWidth / 2,
                                sparklePos.y + (Math.random() - 0.5) * this.tileHeight / 2,
                                'rgba(255, 255, 255, 0.9)',
                                15,
                                0, -0.3
                            );
                        }
                        
                        // Jumping fish (rare)
                        if (Math.random() < 0.0002) {
                            const fishPos = this.toScreen(x, y);
                            // Create arc trajectory
                            for (let i = 0; i < 10; i++) {
                                setTimeout(() => {
                                    const t = i / 10;
                                    const arc = Math.sin(t * Math.PI) * 20;
                                    this.addParticle(
                                        fishPos.x + t * 30,
                                        fishPos.y - arc,
                                        '#ff6600',
                                        5,
                                        0, 0
                                    );
                                }, i * 30);
                            }
                        }
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

    drawBuildingShadow(building) {
        const ctx = this.ctx;
        const pos = this.toScreen(building.x + building.width / 2, building.y + building.height / 2);
        
        // Shadow offset (bottom-right direction)
        const shadowOffsetX = 10;
        const shadowOffsetY = 10;
        
        // Determine shadow size based on building type
        let shadowWidth, shadowHeight;
        if (building.type === 'command') {
            shadowWidth = 170;
            shadowHeight = 60;
        } else if (building.type === 'barracks') {
            shadowWidth = 140;
            shadowHeight = 50;
        } else if (building.type === 'craft') {
            shadowWidth = 100;
            shadowHeight = 40;
        } else {
            shadowWidth = 90;
            shadowHeight = 35;
        }
        
        // Draw shadow as parallelogram
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(pos.x - shadowWidth / 2 + shadowOffsetX, pos.y + shadowOffsetY);
        ctx.lineTo(pos.x + shadowWidth / 2 + shadowOffsetX, pos.y + shadowOffsetY);
        ctx.lineTo(pos.x + shadowWidth / 2 + shadowOffsetX + 20, pos.y + shadowHeight + shadowOffsetY);
        ctx.lineTo(pos.x - shadowWidth / 2 + shadowOffsetX + 20, pos.y + shadowHeight + shadowOffsetY);
        ctx.closePath();
        ctx.fill();
    }

    drawBuilding(building) {
        const ctx = this.ctx;
        const pos = this.toScreen(building.x + building.width / 2, building.y + building.height / 2);

        if (building.type === 'command') {
            // ========== ⚡ COMMAND CENTER ==========
            // Stone base (larger)
            for (let dy = 0; dy < building.height; dy++) {
                for (let dx = 0; dx < building.width; dx++) {
                    this.drawIsometricTile(building.x + dx, building.y + dy, '#555');
                }
            }

            // Walls (multi-layer, taller, more imposing)
            ctx.fillStyle = '#4a3a2a';
            ctx.fillRect(pos.x - 85, pos.y - 55, 170, 65);
            
            // Stone brick texture
            ctx.fillStyle = '#5a4a3a';
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 6; col++) {
                    const bx = pos.x - 82 + col * 28 + (row % 2) * 14;
                    const by = pos.y - 52 + row * 15;
                    ctx.fillRect(bx, by, 25, 12);
                }
            }
            
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 80, pos.y - 95, 160, 45);

            // Peaked roof (large)
            ctx.fillStyle = '#3a2a1a';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 145);
            ctx.lineTo(pos.x + 95, pos.y - 100);
            ctx.lineTo(pos.x, pos.y - 55);
            ctx.lineTo(pos.x - 95, pos.y - 100);
            ctx.closePath();
            ctx.fill();

            // Roof highlight
            ctx.fillStyle = '#4a3a2a';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 145);
            ctx.lineTo(pos.x + 95, pos.y - 100);
            ctx.lineTo(pos.x, pos.y - 100);
            ctx.closePath();
            ctx.fill();

            // Ridge
            ctx.strokeStyle = '#2a1a0a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 145);
            ctx.lineTo(pos.x, pos.y - 55);
            ctx.stroke();

            // Windows with warm glow
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15;
            ctx.fillRect(pos.x - 45, pos.y - 80, 18, 22);
            ctx.fillRect(pos.x + 28, pos.y - 80, 18, 22);
            ctx.shadowBlur = 0;
            // Window cross beams
            ctx.fillStyle = '#4a3a2a';
            ctx.fillRect(pos.x - 45, pos.y - 70, 18, 2);
            ctx.fillRect(pos.x - 37, pos.y - 80, 2, 22);
            ctx.fillRect(pos.x + 28, pos.y - 70, 18, 2);
            ctx.fillRect(pos.x + 36, pos.y - 80, 2, 22);

            // Door with warm glow
            const doorGlow = Math.sin(this.animFrame * 0.05) * 0.15 + 0.85;
            ctx.fillStyle = `rgba(251, 191, 36, ${doorGlow * 0.5})`;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 20;
            ctx.fillRect(pos.x - 14, pos.y - 50, 28, 40);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#2a1a0a';
            ctx.fillRect(pos.x - 14, pos.y - 50, 28, 40);
            // Door arch
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 50, 14, Math.PI, 0);
            ctx.fill();
            // Inner glow
            ctx.fillStyle = `rgba(251, 191, 36, ${doorGlow * 0.6})`;
            ctx.fillRect(pos.x - 10, pos.y - 46, 20, 34);
            // Door handle
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(pos.x + 5, pos.y - 32, 4, 4);

            // Torches (animated)
            const flicker = Math.sin(this.animFrame * 0.1) * 2;
            [-90, -35, 35, 90].forEach(offset => {
                ctx.fillStyle = '#654321';
                ctx.fillRect(pos.x + offset, pos.y - 100, 5, 18);
                ctx.fillStyle = '#ff6600';
                ctx.shadowColor = '#ff6600';
                ctx.shadowBlur = 8;
                ctx.fillRect(pos.x + offset - 1, pos.y - 106 + flicker, 7, 10);
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(pos.x + offset, pos.y - 104 + flicker, 5, 6);
                ctx.shadowBlur = 0;
            });

            // Chimney with smoke
            ctx.fillStyle = '#555';
            ctx.fillRect(pos.x + 50, pos.y - 130, 14, 35);
            ctx.fillStyle = '#666';
            ctx.fillRect(pos.x + 48, pos.y - 133, 18, 5);
            // Animated smoke puffs
            const smokeTime = this.animFrame * 0.03;
            for (let i = 0; i < 4; i++) {
                const smokeY = pos.y - 135 - i * 12 - (smokeTime * 10 % 12);
                const smokeX = pos.x + 57 + Math.sin(smokeTime + i * 1.5) * 6;
                const smokeAlpha = 0.3 - i * 0.07;
                const smokeSize = 5 + i * 3;
                if (smokeAlpha > 0) {
                    ctx.fillStyle = `rgba(180, 180, 180, ${smokeAlpha})`;
                    ctx.beginPath();
                    ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Glowing antenna/beacon on top
            const beaconPulse = Math.sin(this.animFrame * 0.08) * 0.4 + 0.6;
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 2, pos.y - 160, 4, 18);
            // Beacon light
            ctx.fillStyle = `rgba(0, 200, 255, ${beaconPulse})`;
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 20 * beaconPulse;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 163, 5, 0, Math.PI * 2);
            ctx.fill();
            // Beacon rays
            ctx.strokeStyle = `rgba(0, 200, 255, ${beaconPulse * 0.3})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const angle = (this.animFrame * 0.02) + (i * Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(pos.x + Math.cos(angle) * 6, pos.y - 163 + Math.sin(angle) * 6);
                ctx.lineTo(pos.x + Math.cos(angle) * 14, pos.y - 163 + Math.sin(angle) * 14);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;

            // Label/Sign
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            const labelW = ctx.measureText(building.label).width || 100;
            ctx.fillRect(pos.x - labelW / 2 - 8, pos.y - 185, labelW + 16, 20);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1;
            ctx.strokeRect(pos.x - labelW / 2 - 8, pos.y - 185, labelW + 16, 20);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 171);

        } else if (building.type === 'craft') {
            // ========== ⏰ CLOCK TOWER ==========
            // Stone base
            for (let dy = 0; dy < building.height; dy++) {
                for (let dx = 0; dx < building.width; dx++) {
                    this.drawIsometricTile(building.x + dx, building.y + dy, '#6b5a4a');
                }
            }

            // Tower body (tall and narrow)
            ctx.fillStyle = '#7a6a5a';
            ctx.fillRect(pos.x - 35, pos.y - 100, 70, 90);
            
            // Stone texture
            ctx.fillStyle = '#8a7a6a';
            for (let row = 0; row < 6; row++) {
                for (let col = 0; col < 3; col++) {
                    const bx = pos.x - 33 + col * 22 + (row % 2) * 11;
                    const by = pos.y - 97 + row * 14;
                    ctx.fillRect(bx, by, 19, 11);
                }
            }

            // Upper tower section (narrower)
            ctx.fillStyle = '#6a5a4a';
            ctx.fillRect(pos.x - 28, pos.y - 140, 56, 45);

            // Clock face
            const clockX = pos.x;
            const clockY = pos.y - 118;
            const clockR = 18;
            // Clock background
            ctx.fillStyle = '#f5f0e0';
            ctx.beginPath();
            ctx.arc(clockX, clockY, clockR, 0, Math.PI * 2);
            ctx.fill();
            // Clock border
            ctx.strokeStyle = '#4a3a2a';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Clock tick marks
            ctx.fillStyle = '#333';
            for (let i = 0; i < 12; i++) {
                const a = (i * Math.PI * 2) / 12;
                const len = i % 3 === 0 ? 4 : 2;
                ctx.fillRect(
                    clockX + Math.cos(a) * (clockR - len - 2) - 1,
                    clockY + Math.sin(a) * (clockR - len - 2) - 1,
                    2, 2
                );
            }
            // Clock hands (actually tick!)
            const now = Date.now();
            const seconds = (now / 1000) % 60;
            const minutes = (now / 60000) % 60;
            const hours = (now / 3600000) % 12;
            // Hour hand
            const hourAngle = (hours / 12) * Math.PI * 2 - Math.PI / 2;
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(clockX, clockY);
            ctx.lineTo(clockX + Math.cos(hourAngle) * 10, clockY + Math.sin(hourAngle) * 10);
            ctx.stroke();
            // Minute hand
            const minAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(clockX, clockY);
            ctx.lineTo(clockX + Math.cos(minAngle) * 14, clockY + Math.sin(minAngle) * 14);
            ctx.stroke();
            // Second hand
            const secAngle = (seconds / 60) * Math.PI * 2 - Math.PI / 2;
            ctx.strokeStyle = '#c00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(clockX, clockY);
            ctx.lineTo(clockX + Math.cos(secAngle) * 15, clockY + Math.sin(secAngle) * 15);
            ctx.stroke();
            // Center dot
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(clockX, clockY, 2, 0, Math.PI * 2);
            ctx.fill();

            // Pointed roof
            ctx.fillStyle = '#4a3a2a';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 175);
            ctx.lineTo(pos.x + 35, pos.y - 140);
            ctx.lineTo(pos.x - 35, pos.y - 140);
            ctx.closePath();
            ctx.fill();

            // Bell on top
            ctx.fillStyle = '#c8a832';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 155, 7, 0, Math.PI * 2);
            ctx.fill();
            // Bell clapper (swings)
            const clapperSwing = Math.sin(this.animFrame * 0.06) * 3;
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(pos.x - 1 + clapperSwing, pos.y - 152, 2, 6);

            // Pendulum (visible through arch)
            ctx.fillStyle = '#2a1a0a';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 65, 8, 0, Math.PI);
            ctx.fill();
            // Pendulum rod + bob
            const pendulumAngle = Math.sin(this.animFrame * 0.04) * 0.4;
            ctx.save();
            ctx.translate(pos.x, pos.y - 65);
            ctx.rotate(pendulumAngle);
            ctx.fillStyle = '#654321';
            ctx.fillRect(-1, 0, 2, 28);
            ctx.fillStyle = '#c8a832';
            ctx.beginPath();
            ctx.arc(0, 30, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Small door
            ctx.fillStyle = '#2a1a0a';
            ctx.fillRect(pos.x - 10, pos.y - 20, 20, 18);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(pos.x + 4, pos.y - 12, 3, 3);

            // Lanterns
            [-40, 40].forEach(offset => {
                ctx.fillStyle = '#654321';
                ctx.fillRect(pos.x + offset, pos.y - 65, 5, 14);
                ctx.fillStyle = '#fbbf24';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 8;
                ctx.fillRect(pos.x + offset - 1, pos.y - 70, 7, 8);
                ctx.shadowBlur = 0;
            });

            // Label
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            const craftLabelW = ctx.measureText(building.label).width || 80;
            ctx.fillRect(pos.x - craftLabelW / 2 - 6, pos.y - 192, craftLabelW + 12, 16);
            ctx.strokeStyle = '#c8a832';
            ctx.lineWidth = 1;
            ctx.strokeRect(pos.x - craftLabelW / 2 - 6, pos.y - 192, craftLabelW + 12, 16);
            ctx.fillStyle = '#c8a832';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 180);

        } else if (building.type === 'mine') {
            // ========== ⛏️ TOKEN MINE ==========
            // Hillside (multiple layers)
            ctx.fillStyle = '#5a4a3a';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 20, 75, 85, 0, 0, Math.PI);
            ctx.fill();

            ctx.fillStyle = '#4a3a2a';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 15, 65, 75, 0, 0, Math.PI);
            ctx.fill();

            // Support beams around cave
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 30, pos.y - 55, 8, 50);
            ctx.fillRect(pos.x + 22, pos.y - 55, 8, 50);
            ctx.fillRect(pos.x - 32, pos.y - 58, 64, 6);

            // Dark cave mouth
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 20, 30, 45, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 18, 22, 38, 0, 0, Math.PI * 2);
            ctx.fill();

            // Glowing crystals inside (more of them, different colors)
            const crystalGlow = Math.sin(this.animFrame * 0.1) * 0.3 + 0.7;
            const crystalGlow2 = Math.sin(this.animFrame * 0.1 + 1.5) * 0.3 + 0.7;
            // Purple crystals
            [[-15, -30], [12, -35], [-5, -42], [8, -25]].forEach(([ox, oy], i) => {
                const glow = i % 2 === 0 ? crystalGlow : crystalGlow2;
                ctx.fillStyle = `rgba(150, 100, 255, ${glow})`;
                ctx.shadowColor = '#9966ff';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.moveTo(pos.x + ox, pos.y + oy);
                ctx.lineTo(pos.x + ox - 4, pos.y + oy + 12);
                ctx.lineTo(pos.x + ox + 4, pos.y + oy + 12);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            // Green crystal
            ctx.fillStyle = `rgba(100, 255, 150, ${crystalGlow2})`;
            ctx.shadowColor = '#66ff99';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(pos.x - 10, pos.y - 20);
            ctx.lineTo(pos.x - 13, pos.y - 10);
            ctx.lineTo(pos.x - 7, pos.y - 10);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Minecart tracks
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 40, pos.y + 12, 80, 3);
            ctx.fillStyle = '#888';
            // Track rails
            ctx.fillRect(pos.x - 40, pos.y + 10, 80, 2);
            ctx.fillRect(pos.x - 40, pos.y + 15, 80, 2);
            // Sleepers
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = '#4a3a2a';
                ctx.fillRect(pos.x - 38 + i * 14, pos.y + 8, 4, 10);
            }

            // Moving minecart
            const cartX = Math.sin(this.animFrame * 0.02) * 25;
            ctx.fillStyle = '#888';
            ctx.fillRect(pos.x + cartX - 10, pos.y + 1, 20, 10);
            // Cart ore (colorful tokens!)
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(pos.x + cartX - 6, pos.y - 3, 5, 5);
            ctx.fillStyle = '#9966ff';
            ctx.fillRect(pos.x + cartX + 1, pos.y - 2, 5, 4);
            ctx.fillStyle = '#ff6644';
            ctx.fillRect(pos.x + cartX - 3, pos.y - 5, 4, 4);
            // Wheels
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.arc(pos.x + cartX - 6, pos.y + 12, 3, 0, Math.PI * 2);
            ctx.arc(pos.x + cartX + 6, pos.y + 12, 3, 0, Math.PI * 2);
            ctx.fill();

            // Steam/smoke coming from mine
            const steamTime = this.animFrame * 0.04;
            for (let i = 0; i < 3; i++) {
                const steamY = pos.y - 60 - i * 10 - (steamTime * 8 % 10);
                const steamX = pos.x + Math.sin(steamTime + i * 2) * 8;
                const steamAlpha = 0.25 - i * 0.08;
                const steamSize = 4 + i * 3;
                if (steamAlpha > 0) {
                    ctx.fillStyle = `rgba(200, 200, 210, ${steamAlpha})`;
                    ctx.beginPath();
                    ctx.arc(steamX, steamY, steamSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Lanterns on posts
            [-55, 55].forEach(offset => {
                ctx.fillStyle = '#654321';
                ctx.fillRect(pos.x + offset, pos.y - 40, 5, 30);
                ctx.fillStyle = '#fbbf24';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 10;
                ctx.fillRect(pos.x + offset - 3, pos.y - 45, 11, 12);
                ctx.shadowBlur = 0;
            });

            // Pickaxe sign
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x + 40, pos.y - 20, 4, 16);
            // Crossed pickaxes
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pos.x + 35, pos.y - 28);
            ctx.lineTo(pos.x + 50, pos.y - 18);
            ctx.moveTo(pos.x + 50, pos.y - 28);
            ctx.lineTo(pos.x + 35, pos.y - 18);
            ctx.stroke();

            // Label
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            const mineLabelW = ctx.measureText(building.label).width || 80;
            ctx.fillRect(pos.x - mineLabelW / 2 - 6, pos.y - 80, mineLabelW + 12, 16);
            ctx.strokeStyle = '#9966ff';
            ctx.lineWidth = 1;
            ctx.strokeRect(pos.x - mineLabelW / 2 - 6, pos.y - 80, mineLabelW + 12, 16);
            ctx.fillStyle = '#c8a832';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 68);

        } else if (building.type === 'barracks') {
            // ========== 🏰 AGENT HALL ==========
            // Large building base
            for (let dy = 0; dy < building.height; dy++) {
                for (let dx = 0; dx < building.width; dx++) {
                    this.drawIsometricTile(building.x + dx, building.y + dy, '#6b5a4a');
                }
            }

            // Walls (more imposing)
            ctx.fillStyle = '#7a6a5a';
            ctx.fillRect(pos.x - 65, pos.y - 60, 130, 55);
            
            // Stone brick texture
            ctx.fillStyle = '#8a7a6a';
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 5; col++) {
                    const bx = pos.x - 62 + col * 25 + (row % 2) * 12;
                    const by = pos.y - 57 + row * 16;
                    ctx.fillRect(bx, by, 22, 13);
                }
            }

            // Roof with peaked towers on sides
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 95);
            ctx.lineTo(pos.x + 75, pos.y - 65);
            ctx.lineTo(pos.x, pos.y - 35);
            ctx.lineTo(pos.x - 75, pos.y - 65);
            ctx.closePath();
            ctx.fill();
            // Roof highlight
            ctx.fillStyle = '#755332';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 95);
            ctx.lineTo(pos.x + 75, pos.y - 65);
            ctx.lineTo(pos.x, pos.y - 65);
            ctx.closePath();
            ctx.fill();

            // Shield emblem on building
            ctx.fillStyle = '#c00';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 70);
            ctx.lineTo(pos.x + 12, pos.y - 56);
            ctx.lineTo(pos.x, pos.y - 44);
            ctx.lineTo(pos.x - 12, pos.y - 56);
            ctx.closePath();
            ctx.fill();
            // Shield border
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Sword on shield
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(pos.x - 1, pos.y - 66, 2, 18);
            ctx.fillRect(pos.x - 5, pos.y - 60, 10, 2);

            // Multiple doors
            [-30, 30].forEach(offset => {
                ctx.fillStyle = '#2a1a0a';
                ctx.fillRect(pos.x + offset - 8, pos.y - 45, 16, 25);
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(pos.x + offset + 3, pos.y - 34, 3, 3);
            });

            // Flags on roof (two animated flags)
            [-40, 40].forEach((offset, idx) => {
                const flagWave = Math.sin(this.animFrame * 0.1 + idx * 2) * 3;
                ctx.fillStyle = '#654321';
                ctx.fillRect(pos.x + offset, pos.y - 115, 3, 30);
                ctx.fillStyle = idx === 0 ? '#c00' : '#0066cc';
                ctx.beginPath();
                ctx.moveTo(pos.x + offset + 3, pos.y - 115);
                ctx.lineTo(pos.x + offset + 20 + flagWave, pos.y - 110);
                ctx.lineTo(pos.x + offset + 18 + flagWave * 0.8, pos.y - 105);
                ctx.lineTo(pos.x + offset + 3, pos.y - 100);
                ctx.closePath();
                ctx.fill();
            });

            // Weapon racks outside (left side)
            ctx.fillStyle = '#654321';
            ctx.fillRect(pos.x - 80, pos.y - 20, 12, 4);
            ctx.fillRect(pos.x - 78, pos.y - 30, 3, 14);
            ctx.fillRect(pos.x - 72, pos.y - 30, 3, 14);
            // Weapons on rack
            ctx.fillStyle = '#aaa';
            ctx.fillRect(pos.x - 79, pos.y - 42, 2, 16);
            ctx.fillRect(pos.x - 73, pos.y - 38, 2, 12);
            // Sword tips
            ctx.fillStyle = '#ccc';
            ctx.beginPath();
            ctx.moveTo(pos.x - 78, pos.y - 42);
            ctx.lineTo(pos.x - 80, pos.y - 46);
            ctx.lineTo(pos.x - 76, pos.y - 46);
            ctx.closePath();
            ctx.fill();

            // Training dummies (animated)
            [[-52, pos.y], [52, pos.y]].forEach(([offset, baseY], idx) => {
                const dummySway = Math.sin(this.animFrame * 0.06 + idx * 3) * 3;
                ctx.save();
                ctx.translate(pos.x + offset + 3, baseY - 5);
                ctx.rotate(dummySway * 0.02);
                // Dummy post
                ctx.fillStyle = '#8B6914';
                ctx.fillRect(-3, -15, 6, 25);
                // Dummy arms
                ctx.fillRect(-12, -10, 24, 4);
                // Dummy head
                ctx.fillStyle = '#b8a060';
                ctx.beginPath();
                ctx.arc(0, -20, 6, 0, Math.PI * 2);
                ctx.fill();
                // Target on body
                ctx.strokeStyle = '#c00';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, -6, 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });

            // Lanterns
            [-68, 68].forEach(offset => {
                ctx.fillStyle = '#654321';
                ctx.fillRect(pos.x + offset, pos.y - 55, 5, 14);
                ctx.fillStyle = '#fbbf24';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 8;
                ctx.fillRect(pos.x + offset - 1, pos.y - 60, 7, 8);
                ctx.shadowBlur = 0;
            });

            // Label
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            const barracksLabelW = ctx.measureText(building.label).width || 80;
            ctx.fillRect(pos.x - barracksLabelW / 2 - 6, pos.y - 130, barracksLabelW + 12, 16);
            ctx.strokeStyle = '#c00';
            ctx.lineWidth = 1;
            ctx.strokeRect(pos.x - barracksLabelW / 2 - 6, pos.y - 130, barracksLabelW + 12, 16);
            ctx.fillStyle = '#c8a832';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.label, pos.x, pos.y - 118);
        }
    }

    drawSpeechBubble(building) {
        const sb = building.speechBubble;
        if (!sb || sb.opacity <= 0 || !sb.text) return;

        const ctx = this.ctx;
        const pos = this.toScreen(building.x + building.width / 2, building.y + building.height / 2);

        // Position bubble above the building
        let bubbleY = pos.y - 170;
        if (building.type === 'craft') bubbleY = pos.y - 140;
        if (building.type === 'mine') bubbleY = pos.y - 100;

        ctx.save();
        ctx.globalAlpha = sb.opacity;

        // Measure text
        ctx.font = 'bold 10px monospace';
        const textWidth = ctx.measureText(sb.text).width;
        const padX = 12;
        const padY = 8;
        const bubbleW = textWidth + padX * 2;
        const bubbleH = 22;
        const bubbleX = pos.x - bubbleW / 2;
        const radius = 8;

        // Draw bubble shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.roundRect(ctx, bubbleX + 2, bubbleY + 2, bubbleW, bubbleH, radius);
        ctx.fill();

        // Draw bubble background
        ctx.fillStyle = '#fff';
        this.roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, radius);
        ctx.fill();

        // Draw bubble border
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, radius);
        ctx.stroke();

        // Draw triangle pointer
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(pos.x - 6, bubbleY + bubbleH);
        ctx.lineTo(pos.x, bubbleY + bubbleH + 8);
        ctx.lineTo(pos.x + 6, bubbleY + bubbleH);
        ctx.closePath();
        ctx.fill();

        // Pointer border
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.moveTo(pos.x - 6, bubbleY + bubbleH);
        ctx.lineTo(pos.x, bubbleY + bubbleH + 8);
        ctx.lineTo(pos.x + 6, bubbleY + bubbleH);
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#222';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(sb.text, pos.x, bubbleY + 15);

        ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
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
        if (agent.uid === this.selectedAgentId) {
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

        // === Unique agent appearance based on seeded hash ===
        if (!agent.appearance) {
            // Generate stable appearance from agent id
            const hash = this.hashCode(agent.uid);
            
            // Skin tones
            const skinTones = ['#f0d9b5', '#e8c89e', '#d4a574', '#c68642', '#8d5524', '#ffdbac'];
            
            // Shirt/body colors (varied palette)
            const shirtColors = [
                '#4488ff', '#44bb44', '#ff6644', '#aa44ff', '#44dddd',
                '#ff44aa', '#ffaa22', '#8866cc', '#cc4444', '#2299cc',
                '#66aa44', '#dd6699', '#5577bb', '#bb8833', '#44aa88'
            ];

            // Hair colors
            const hairColors = ['#2a1a0a', '#654321', '#ffd700', '#c84', '#f60', '#333', '#a52a2a', '#ddd', '#c00'];
            
            // Hair styles: 0=short, 1=spiky, 2=long, 3=mohawk, 4=bald, 5=ponytail, 6=afro
            const hairStyles = 7;

            // Pants colors
            const pantsColors = ['#5a4a3a', '#334', '#443322', '#2a3a5a', '#3a2a2a', '#444'];

            // Accessories: 0=none, 1=crown(main only), 2=helmet, 3=bandana, 4=glasses, 5=scarf
            
            agent.appearance = {
                skin: skinTones[Math.abs(hash) % skinTones.length],
                shirt: shirtColors[Math.abs(hash >> 4) % shirtColors.length],
                hair: hairColors[Math.abs(hash >> 8) % hairColors.length],
                hairStyle: Math.abs(hash >> 12) % hairStyles,
                pants: pantsColors[Math.abs(hash >> 16) % pantsColors.length],
                accessory: Math.abs(hash >> 20) % 6,
                eyeStyle: Math.abs(hash >> 24) % 3, // 0=normal, 1=small, 2=wide
            };

            // Main agent always gets crown
            if (agent.type === 'main') {
                agent.appearance.accessory = 1;
                agent.appearance.shirt = '#4488ff';
            }
        }

        const app = agent.appearance;

        // Walking animation
        const isWalking = agent.walkFrame > 0;
        const walkCycle = Math.floor(agent.walkFrame / 10) % 2;
        const legSwing = isWalking ? (walkCycle === 0 ? -4 : 4) : 0;

        // Legs (animated)
        ctx.fillStyle = app.pants;
        ctx.fillRect(pos.x - 8, pos.y - 8 + legSwing, 6, 16);
        ctx.fillRect(pos.x + 2, pos.y - 8 - legSwing, 6, 16);

        // Shoes
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(pos.x - 9, pos.y + 5 + legSwing, 8, 4);
        ctx.fillRect(pos.x + 1, pos.y + 5 - legSwing, 8, 4);

        // Body
        ctx.fillStyle = app.shirt;
        ctx.fillRect(pos.x - 10, pos.y - 30, 20, 24);
        
        // Shirt detail (collar)
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(pos.x - 4, pos.y - 30, 8, 3);
        // Belt
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(pos.x - 10, pos.y - 10, 20, 3);

        // Arms (animated)
        ctx.fillStyle = app.skin;
        if (agent.state === 'working') {
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
            const armSwing = walkCycle === 0 ? -3 : 3;
            ctx.fillRect(pos.x - 16, pos.y - 26 + armSwing, 6, 18);
            ctx.fillRect(pos.x + 10, pos.y - 26 - armSwing, 6, 18);
        } else {
            const sway = Math.sin(agent.animFrame * 0.05) * 2;
            ctx.fillRect(pos.x - 16, pos.y - 26 + sway, 6, 18);
            ctx.fillRect(pos.x + 10, pos.y - 26 - sway, 6, 18);
        }

        // Head
        ctx.fillStyle = app.skin;
        ctx.fillRect(pos.x - 8, pos.y - 50, 16, 16);

        // Eyes (3 styles)
        ctx.fillStyle = '#000';
        const blinkFrame = agent.animFrame % 100;
        if (blinkFrame < 95) {
            if (app.eyeStyle === 0) {
                // Normal eyes
                ctx.fillRect(pos.x - 5, pos.y - 45, 3, 3);
                ctx.fillRect(pos.x + 2, pos.y - 45, 3, 3);
            } else if (app.eyeStyle === 1) {
                // Small dot eyes
                ctx.fillRect(pos.x - 4, pos.y - 44, 2, 2);
                ctx.fillRect(pos.x + 3, pos.y - 44, 2, 2);
            } else {
                // Wide eyes
                ctx.fillRect(pos.x - 6, pos.y - 46, 4, 4);
                ctx.fillRect(pos.x + 2, pos.y - 46, 4, 4);
                // Pupils
                ctx.fillStyle = '#fff';
                ctx.fillRect(pos.x - 5, pos.y - 45, 2, 2);
                ctx.fillRect(pos.x + 3, pos.y - 45, 2, 2);
                ctx.fillStyle = '#000';
            }
        } else {
            ctx.fillRect(pos.x - 5, pos.y - 44, 3, 1);
            ctx.fillRect(pos.x + 2, pos.y - 44, 3, 1);
        }

        // Mouth
        ctx.fillStyle = '#000';
        if (agent.state === 'working') {
            // Open mouth (effort)
            ctx.fillRect(pos.x - 2, pos.y - 38, 4, 3);
        } else {
            ctx.fillRect(pos.x - 3, pos.y - 38, 6, 2);
        }

        // === HAIR (7 styles) ===
        ctx.fillStyle = app.hair;
        switch (app.hairStyle) {
            case 0: // Short flat
                ctx.fillRect(pos.x - 9, pos.y - 53, 18, 5);
                ctx.fillRect(pos.x - 9, pos.y - 50, 3, 6);
                ctx.fillRect(pos.x + 6, pos.y - 50, 3, 6);
                break;
            case 1: // Spiky
                ctx.fillRect(pos.x - 9, pos.y - 53, 18, 4);
                // Spikes
                ctx.fillRect(pos.x - 8, pos.y - 58, 3, 5);
                ctx.fillRect(pos.x - 3, pos.y - 60, 3, 7);
                ctx.fillRect(pos.x + 2, pos.y - 59, 3, 6);
                ctx.fillRect(pos.x + 6, pos.y - 56, 3, 3);
                break;
            case 2: // Long hair
                ctx.fillRect(pos.x - 9, pos.y - 53, 18, 5);
                ctx.fillRect(pos.x - 10, pos.y - 50, 4, 18);
                ctx.fillRect(pos.x + 6, pos.y - 50, 4, 18);
                ctx.fillRect(pos.x - 9, pos.y - 53, 3, 20);
                ctx.fillRect(pos.x + 7, pos.y - 53, 3, 20);
                break;
            case 3: // Mohawk
                ctx.fillRect(pos.x - 2, pos.y - 62, 4, 12);
                ctx.fillRect(pos.x - 3, pos.y - 60, 6, 3);
                break;
            case 4: // Bald (no hair, just a shine)
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(pos.x - 4, pos.y - 50, 4, 3);
                break;
            case 5: // Ponytail
                ctx.fillRect(pos.x - 9, pos.y - 53, 18, 5);
                ctx.fillRect(pos.x + 5, pos.y - 52, 4, 3);
                ctx.fillRect(pos.x + 8, pos.y - 50, 3, 6);
                ctx.fillRect(pos.x + 9, pos.y - 45, 3, 10);
                break;
            case 6: // Afro
                ctx.beginPath();
                ctx.arc(pos.x, pos.y - 52, 14, 0, Math.PI * 2);
                ctx.fill();
                // Re-draw face on top
                ctx.fillStyle = app.skin;
                ctx.fillRect(pos.x - 7, pos.y - 49, 14, 14);
                break;
        }

        // === ACCESSORY ===
        if (app.accessory === 1) {
            // Crown (main agent)
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(pos.x - 10, pos.y - 56, 20, 5);
            ctx.fillRect(pos.x - 8, pos.y - 62, 4, 6);
            ctx.fillRect(pos.x - 2, pos.y - 62, 4, 6);
            ctx.fillRect(pos.x + 4, pos.y - 62, 4, 6);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(pos.x - 6, pos.y - 60, 2, 2);
            ctx.fillRect(pos.x, pos.y - 60, 2, 2);
            ctx.fillRect(pos.x + 6, pos.y - 60, 2, 2);
        } else if (app.accessory === 2) {
            // Iron helmet
            ctx.fillStyle = '#888';
            ctx.fillRect(pos.x - 10, pos.y - 55, 20, 7);
            ctx.fillRect(pos.x - 12, pos.y - 50, 24, 3);
            // Visor slit
            ctx.fillStyle = '#333';
            ctx.fillRect(pos.x - 6, pos.y - 53, 12, 2);
        } else if (app.accessory === 3) {
            // Bandana
            ctx.fillStyle = '#c00';
            ctx.fillRect(pos.x - 9, pos.y - 52, 18, 4);
            // Tails hanging
            ctx.fillRect(pos.x + 7, pos.y - 50, 3, 8);
            ctx.fillRect(pos.x + 9, pos.y - 46, 3, 6);
        } else if (app.accessory === 4) {
            // Glasses
            ctx.fillStyle = '#222';
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(pos.x - 7, pos.y - 47, 6, 5);
            ctx.strokeRect(pos.x + 1, pos.y - 47, 6, 5);
            ctx.beginPath();
            ctx.moveTo(pos.x - 1, pos.y - 45);
            ctx.lineTo(pos.x + 1, pos.y - 45);
            ctx.stroke();
        } else if (app.accessory === 5) {
            // Scarf
            ctx.fillStyle = '#e44';
            ctx.fillRect(pos.x - 10, pos.y - 32, 20, 4);
            ctx.fillRect(pos.x - 12, pos.y - 30, 6, 10);
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
