# 🎬 Moltcraft Demo Video Guide

## What to Showcase

### 1. **Opening Shot** (0-10s)
- Pan across the isometric world at medium zoom
- Show 4 large buildings with torches, shadows, and agents walking
- Highlight the day/night cycle starting at dawn

### 2. **Visual Effects** (10-30s)
- **Water pond** (bottom-right): Zoom in to show rippling waves and sparkles
- **Building shadows**: Show consistent shadow direction
- **Weather**: Snow particles drifting across the screen
- **Fog of war**: Pan to world edges, show vignette darkening

### 3. **Day/Night Cycle** (30-50s)
- Speed through time (or wait ~2 minutes for full cycle):
  - **Day**: Bright blue tint, clear visibility
  - **Sunset**: Warm orange glow
  - **Night**: Dark blue overlay, stars twinkling, windows glowing brighter
  - **Dawn**: Stars fade, light returns

### 4. **Agent Activity** (50-70s)
- Show agents walking between buildings on dirt paths
- Click an agent to select it
- Bottom panel appears showing:
  - Agent portrait (pixel art character)
  - Model, channel, token usage
  - Context bar (green progress)
  - Live chat messages

### 5. **Chat Interaction** (70-90s)
- Type a message in the input: "What are you working on?"
- Click ⚡ send button
- Message appears in chat instantly
- (In real demo: wait for assistant response)

### 6. **Spawn New Quest** (90-110s)
- Click **⚔️ NEW QUEST** button in top bar
- Modal appears with gold borders
- Type quest: "Find the best pizza recipe in Rome"
- Click **SPAWN AGENT**
- **Fireworks explode** at Agent Hall! 🎆
- **Toast notification** slides in: "🎉 New agent spawned: quest-[timestamp]"
- New agent appears in world and sidebar

### 7. **Live Stats** (110-120s)
- Zoom to top bar showing:
  - **💰 Total Cost**: Animating upward as tokens accumulate
  - **⏱️ Active Time**: Ticking clock showing uptime
  - **Token counter**: Smoothly animating numbers
  - **Working/Idle/Waiting badges**: Dynamic counts

### 8. **Minimap** (120-130s)
- Zoom to bottom-right minimap
- Show simplified world view:
  - Brown squares = buildings
  - Green dots = agents (moving in real-time)
  - White rectangle = viewport
- Pan camera around, minimap viewport follows

### 9. **Particle Systems** (130-145s)
- Show footstep dust when agents walk
- Mining particles (gold sparkles) from active agents
- Torch flames flickering on Command Center
- Chimney smoke puffing from roof

### 10. **Finale** (145-160s)
- Spawn 2-3 more quests rapidly
- Multiple firework bursts across the world
- Toast notifications stacking in top-right
- Stats rapidly updating
- Day/night transitioning to sunset for dramatic effect
- Zoom out to full world view
- Fade to "⛏️ MOLTCRAFT" title card

---

## Camera Tips

### Zoom Levels
- **Wide (0.5x)**: Shows entire world, good for establishing shots
- **Medium (1.5x)**: Default, balanced view
- **Close (3.0x)**: Detail shots (water, particles, agents)

### Pan & Drag
- Click and drag canvas to pan camera
- Use mouse wheel to zoom
- Minimap shows current viewport

### Best Angles
1. **Command Center**: Center building, shows torches + beacon
2. **Water Pond**: Bottom-right (tiles x:40-48, y:12-20)
3. **Agent Paths**: Center paths between buildings
4. **Barracks**: Top-center, where fireworks spawn

---

## Color Palette

### Time of Day
- **Day**: #87CEEB (sky blue) at 10% opacity
- **Sunset**: #FF8C3C (orange) at 30% opacity
- **Night**: #141E3C (dark blue) at 50% opacity + white stars

### Buildings
- **Command Center**: Brown walls, dark peaked roof, gold windows
- **Clock Tower**: Stone gray, blue accents
- **Token Mine**: Dark brown, orange glow
- **Agent Hall**: Castle gray, red banners, gold shield

### UI
- **Gold**: #c8a832 (borders, titles)
- **Green**: #4ade80 (success, working agents)
- **Blue**: #60a5fa (user messages, info)
- **Orange**: #ff6600 (New Quest button, fire)

---

## Technical Setup

### Launch
```bash
cd /home/bernard/moltbot-dashboard
# Open index.html in browser
# Or serve via: python3 -m http.server 8000
```

### Connection
1. Enter Gateway URL (e.g., http://192.168.1.108:8080)
2. Enter auth token
3. Click **JOIN SERVER**

### Performance
- Runs at 60 FPS
- ~100-200 particles active
- Canvas auto-scales to window
- Minimap: 150x150px (minimal overhead)

---

## Music Suggestions

**Soundtrack vibes:**
- Fantasy/medieval ambient
- Lo-fi pixel game OST
- Upbeat orchestral for action shots
- Calm piano for chat/interaction scenes

**Tempo:**
- Sync fireworks to beat drops
- Day/night transitions on key changes

---

## Voiceover Script (Optional)

> "In the world of Moltcraft, AI agents aren't just running tasks—they're alive.

> Watch as they traverse an isometric realm, mining tokens, managing quests, and chatting in real-time.

> Day turns to night, snow falls gently, and every action is celebrated with fireworks and notifications.

> Spawn new quests with a single click. Monitor live stats. See your entire operation at a glance.

> This isn't a dashboard. This is an AI civilization.

> **Moltcraft**—where agents become legends."

---

## Final Checklist

- [ ] Test all features before recording
- [ ] Clear any test data/sessions
- [ ] Set zoom to 1.5x (balanced view)
- [ ] Start at dawn (timeOfDay ≈ 0.2) for dramatic lighting
- [ ] Have 2-3 agents active for motion
- [ ] Prepare quest text in advance
- [ ] Record at 1080p or higher
- [ ] Capture audio separately for clean voiceover
- [ ] Export at 60fps for smooth particles

**Ready to roll! 🎥✨**
