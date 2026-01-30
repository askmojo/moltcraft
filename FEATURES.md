# ⛏️ Moltcraft Features Reference

## Visual Enhancements

### 🌅 Day/Night Cycle
- **Duration**: 2 minutes per full cycle (at 60fps)
- **Phases**:
  - 0.00-0.25: Night → Dawn (stars fade out)
  - 0.25-0.50: Day (blue sky tint)
  - 0.50-0.75: Sunset (orange glow)
  - 0.75-1.00: Night (stars twinkle, buildings glow)
- **Visuals**: Stars appear/disappear, overlay colors shift smoothly
- **Effect**: Buildings' windows/torches appear brighter at night

### 💧 Enhanced Water
- **Location**: Bottom-right pond (tiles x:40-48, y:12-20)
- **Wave Animation**: Dual sine waves create realistic rippling
- **Sparkles**: Random white particles on water surface
- **Jumping Fish**: Rare event (0.02% chance) with arc trajectory
- **Color**: Dynamic shimmer based on wave motion

### 🌫️ Fog of War
- **Type**: Radial gradient vignette
- **Center**: 0% opacity (clear)
- **70% radius**: 30% opacity
- **Edge**: 80% opacity (dark shadow)
- **Effect**: Cinematic focus on center action

### 🏰 Building Shadows
- **Direction**: Bottom-right (consistent lighting)
- **Shape**: Parallelogram
- **Opacity**: 30% black
- **Sizes**: Scale with building type (Command Center largest)

### ❄️ Weather (Snow)
- **Particles**: 100 snowflakes
- **Size**: 1-3px (variable)
- **Speed**: 0.5-2.0 units/frame
- **Motion**: Diagonal fall with horizontal drift
- **Toggle**: `weatherEnabled` variable (default: true)

### 🗺️ Mini-Map
- **Location**: Bottom-right corner
- **Size**: 150x150px
- **Buildings**: Brown squares
- **Agents**: Green dots (real-time positions)
- **Viewport**: White rectangle (current camera view)
- **Border**: Gold, semi-transparent background
- **Updates**: Every frame

---

## Interactive Features

### 💬 Live Chat Panel
- **Trigger**: Click any agent in the world or sidebar
- **Display**: Bottom panel slides up
- **Messages**: Last 5 from session history
- **User Messages**: Right-aligned, blue border
- **Assistant Messages**: Left-aligned, green border
- **Truncation**: 200 chars max per message
- **Auto-scroll**: To bottom when new messages arrive

### ✉️ Send Message
- **Input**: Text field in bottom panel
- **Shortcuts**: Enter key or ⚡ button
- **API**: `sessions_send` with session key
- **Feedback**: Immediate display, refreshes after 2s
- **Clear**: Input auto-clears after sending

### ⚔️ Spawn New Quest
- **Button**: Top-left bar (next to title)
- **Modal**: Gold-bordered with textarea
- **API**: `sessions_spawn` with task description
- **Label**: `quest-[timestamp]`
- **Celebration**: Fireworks at Agent Hall (tile 31,23)
- **Notification**: Success toast slides in
- **Refresh**: Auto-updates after 1 second

### 🎉 Toast Notifications
- **Location**: Top-right corner
- **Types**:
  - 🎉 **Success** (green): New agent spawned
  - ✅ **Info** (blue): Agent completed
  - ⚠️ **Warning** (yellow): Validation errors
  - ❌ **Error** (red): API failures
- **Animation**: Slide in from right
- **Duration**: 5 seconds auto-dismiss
- **Stacking**: Multiple toasts queue vertically

### 🎆 Fireworks
- **Trigger**: New agent spawn detection
- **Particles**: 80 per burst
- **Colors**: 6 vibrant (red, orange, pink, cyan, green, magenta)
- **Physics**: Arc trajectory with gravity
- **Lifetime**: 60 frames (~1 second)
- **Location**: Agent Hall entrance

### 📊 Live Stats Bar
- **💰 Total Cost**: Estimated from tokens ($0.000015 each)
- **⏱️ Active Time**: HH:MM:SS uptime since connection
- **⬡ Token Count**: Smooth animated counter (10% lerp)
- **Working/Idle/Waiting**: Agent state counts
- **Updates**: Every frame (60fps)
- **Formatting**: K for thousands, M for millions

---

## Controls

### Camera
- **Pan**: Click + drag on canvas
- **Zoom**: Mouse wheel (0.3x - 4.0x range)
- **Zoom to cursor**: Zooms toward mouse position

### Selection
- **Click agent**: Select in world or sidebar
- **Bottom panel**: Shows agent details + chat
- **Deselect**: Click background or another agent

### UI Shortcuts
- **Enter**: Send message (when input focused)
- **Escape**: Close modal (implicit browser behavior)
- **Refresh**: 🔄 button in bottom panel

---

## API Endpoints Used

| Endpoint | Parameters | Purpose |
|----------|-----------|---------|
| `sessions_list` | `messageLimit: 1, limit: 20` | Fetch all active sessions |
| `sessions_history` | `sessionKey, limit: 5` | Get chat messages |
| `sessions_send` | `sessionKey, message` | Send message to agent |
| `sessions_spawn` | `task, label` | Create new quest agent |

---

## Performance Metrics

- **Frame Rate**: 60 FPS target
- **Particles**: ~100-200 active (weather + effects)
- **Canvas Size**: Auto-scales to window
- **Minimap Overhead**: ~150x150 = 0.02ms per frame
- **Weather Update**: O(100) simple position updates
- **Agent Update**: O(n) where n = active agents (~5-20)

---

## File Structure

```
moltcraft/
├── index.html          # v11 - UI structure
├── js/
│   └── app.js         # v11 - All logic & rendering
├── css/
│   └── style.css      # v11 - All styles
├── UPGRADE_SUMMARY.md # Complete changelog
├── DEMO_GUIDE.md      # Video production guide
└── FEATURES.md        # This file
```

---

## Known Behaviors

### Agent Movement
- Agents walk between buildings on paths
- Pause at each destination (1-4 seconds)
- 70% chance: go to building
- 30% chance: go to path waypoint
- Speed: 0.06 units/frame (visible motion)

### Speech Bubbles
- Each building has rotating messages
- Fade in: 25 frames
- Display: 120-180 frames (2-3 seconds)
- Fade out: 25 frames
- Wait: 90-210 frames (1.5-3.5 seconds)
- Dynamic content: Shows live stats

### Particle Effects
- **Footsteps**: Every 20 walk frames, brown dust
- **Mining**: Active agents, 5 particles every 30 frames (gold/orange)
- **Torches**: Command Center, flickering flames
- **Smoke**: Chimney, 4 puffs rising with drift
- **Water Sparkles**: 0.5% chance per frame
- **Fish Jumps**: 0.02% chance per water tile

---

## Customization Points

### Colors (CSS variables)
```css
--gold: #c8a832
--gold-bright: #ffd700
--green: #4ade80
--yellow: #fbbf24
--red: #f87171
--blue: #60a5fa
```

### Timing
- Day/night speed: `1 / (120 * 60)` in `IsometricWorld.constructor`
- Weather particle count: `100` in `initWeather()`
- Firework count: `80` in `spawnFireworks()`
- Toast duration: `5000ms` in `showToast()`

### World Size
- Map: `60x60` tiles
- Tile: `64x32` pixels (isometric)
- Buildings: 3x4 to 6x4 footprints

---

## Troubleshooting

### No agents visible?
- Check connection to gateway
- Verify token is valid
- Sessions must be active (check API response)

### Particles not showing?
- Ensure `weatherEnabled = true`
- Check `this.particles` and `this.weatherParticles` arrays
- Verify canvas is rendering (check FPS)

### Minimap blank?
- Element ID: `minimapCanvas` must exist in HTML
- Check z-index (should be 100)
- Verify `this.minimapCtx` is initialized

### Chat not loading?
- Session must have `.key` property
- API endpoint must return messages array
- Check console for errors

---

**Version**: v11  
**Status**: Production Ready ✅  
**Demo**: READY 🎬
