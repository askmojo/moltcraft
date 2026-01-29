# 🎬 MOLTCRAFT — Script de Tournage Vidéo Démo

**Durée cible :** 2-3 minutes
**Résolution :** 1080p ou 4K, 60fps
**Outil recommandé :** OBS Studio / ScreenFlow / QuickTime

---

## 🎥 PRÉ-TOURNAGE — Checklist

### Setup technique
- [ ] Ouvrir http://192.168.1.108:8080/ dans Chrome (plein écran, F11)
- [ ] S'assurer que le gateway Moltbot tourne (`moltbot status`)
- [ ] Avoir 2-3 sessions/agents actifs (lance quelques tâches avant)
- [ ] Préparer le texte de la quest : `"Analyze the top 5 competitors of Moltbot and create a summary report"`
- [ ] Vérifier que le son fonctionne (bouton 🔊 en haut à droite)
- [ ] Commencer l'enregistrement écran

---

## SCÈNE 1 — CONNEXION (0:00 - 0:15)

**Action :** Écran de connexion "JOIN SERVER"

1. On voit l'overlay de connexion avec le titre ⛏️ MOLTCRAFT
2. L'URL gateway est pré-remplie
3. Taper le token (on voit les astérisques)
4. Cliquer **JOIN SERVER**
5. 🔊 *Son : arpège ascendant de connexion*
6. L'overlay disparaît, le monde isométrique apparaît

**Voix off :** *"Welcome to Moltcraft. Connect to your Moltbot gateway and your AI agents come alive."*

---

## SCÈNE 2 — DÉCOUVERTE DU MONDE (0:15 - 0:40)

**Action :** Pan lent à travers le monde

1. Le monde se charge — on voit les bâtiments, les agents qui marchent
2. Pan lentement vers la droite pour montrer :
   - ⚡ COMMAND CENTER (centre, avec torches)
   - ⏰ CLOCK TOWER (gauche, cron jobs)
   - ⛏️ TOKEN MINE (droite, tokens)
   - 🏰 AGENT HALL (haut, agents)
3. Montrer les **bulles de texte** des bâtiments avec les données réelles :
   - "3 sessions active"
   - "2 cron jobs"
   - "45,231 tokens used"
4. Montrer l'eau qui brille, les poissons qui sautent
5. Attendre la transition jour → nuit (étoiles qui apparaissent)
6. Montrer la neige qui tombe

**Voix off :** *"Each building represents a real part of your infrastructure. The Command Center shows live sessions. The Clock Tower tracks your cron jobs. The Token Mine counts every API token. Everything is real data."*

---

## SCÈNE 3 — SÉLECTION D'AGENT (0:40 - 1:00)

**Action :** Cliquer sur un agent dans la sidebar gauche

1. Montrer la sidebar AGENTS à gauche avec la liste des sessions
2. Cliquer sur un agent (ex: "Bernard 🐢 (main)")
3. 🔊 *Son : blip de sélection*
4. **Panneau du bas** glisse vers le haut :
   - Portrait pixel art de l'agent
   - Nom + modèle (claude-opus-4-5)
   - Barre CTX (contexte utilisé)
   - Tokens, messages, channel (TELEGRAM)
5. **Colonne chat** apparaît à droite :
   - Historique des messages récents
   - Bulles bleues (user) / vertes (assistant)

**Voix off :** *"Click any agent to inspect it. See its model, token usage, context window, and live chat history. It's like looking through a window into each agent's mind."*

---

## SCÈNE 4 — CHAT EN DIRECT (1:00 - 1:20)

**Action :** Envoyer un message à l'agent

1. Cliquer dans le champ de saisie du chat
2. Taper : `"What have you been working on today?"`
3. Cliquer ⚡ ou appuyer Entrée
4. 🔊 *Son : whoosh d'envoi*
5. Le message apparaît en bulle bleue (user)
6. Attendre la réponse (bulle verte)

**Voix off :** *"Chat directly with any agent. Send instructions, ask questions, check progress. Real-time, no terminal needed."*

---

## SCÈNE 5 — SPAWN UNE NOUVELLE QUEST (1:20 - 1:50)

**⭐ Moment fort de la démo**

1. Cliquer le bouton **⚔️ NEW QUEST** dans la barre du haut
2. 🔊 *Son : click*
3. La modal apparaît avec les bordures dorées
4. Taper : `"Analyze the top 5 competitors of Moltbot and create a summary report"`
5. Cliquer **SPAWN AGENT**
6. 🔊 *Son : appel de cor épique !*
7. 🎆 **FIREWORKS** explosent au-dessus de l'Agent Hall !
8. 🔊 *Son : pop des feux d'artifice*
9. 🔔 **Toast notification** glisse depuis la droite : "🎉 New agent spawned: quest-..."
10. 🔊 *Son : ding notification*
11. Un nouvel agent apparaît dans la sidebar et commence à marcher dans le monde

**Voix off :** *"Spawn a new quest with one click. Watch as a new AI agent is born, celebrated with fireworks, and immediately gets to work. This is what AI management should feel like."*

---

## SCÈNE 6 — STATS EN DIRECT (1:50 - 2:05)

**Action :** Montrer la barre du haut

1. Zoomer (zoom navigateur) sur la barre du haut pour montrer :
   - ⬡ Token counter (qui s'anime en temps réel)
   - 💰 Total Cost ($)
   - ⏱️ Active Time (compteur qui tourne)
   - WORKING / IDLE / WAITING badges
2. Montrer la mini-map en bas à droite :
   - Carrés marron = bâtiments
   - Points verts = agents en mouvement
   - Rectangle blanc = viewport

**Voix off :** *"Live stats at a glance. Total cost, token usage, active time. The minimap shows your entire operation. Everything updates in real-time at 60 frames per second."*

---

## SCÈNE 7 — FINALE (2:05 - 2:30)

**Action :** Grand final

1. Spawner 2-3 quests supplémentaires rapidement
2. 🎆 Multiples explosions de fireworks !
3. 🔔 Toasts qui s'empilent
4. Agents qui se multiplient dans le monde
5. Zoomer arrière pour voir le monde entier
6. Laisser le cycle jour/nuit passer en sunset (lumière dorée)
7. Couper le son (🔇) pour un silence dramatique
8. Freeze frame

**Voix off :** *"Moltcraft. Your AI agents, alive in a world. Open source. Built on Moltbot. Star us on GitHub."*

**Texte final à l'écran :**
```
⛏️ MOLTCRAFT
github.com/askmojo/moltcraft
moltcraft.pages.dev
```

---

## 🎵 MUSIQUE

**Option 1 — Pixel Game Vibes :**
- Chercher "pixel game ambient" ou "8-bit adventure" sur YouTube Audio Library (libre de droits)
- Tempo moyen, mystérieux au début, épique vers la fin

**Option 2 — Lo-fi Chill :**
- "lo-fi coding beats" en fond
- Plus adapté pour un ton décontracté

**Option 3 — Orchestral :**
- Montée progressive, crescendo au moment du spawn
- Plus "trailer" si tu vises un style cinématique

---

## 🎤 VOIX OFF

**Option A :** Tu enregistres toi-même (authenticité)
**Option B :** ElevenLabs TTS (je peux générer les audio si tu veux)
**Option C :** Pas de voix, juste de la musique + sous-titres

---

## 📱 VARIANTE COURTE (60 secondes — pour Twitter/LinkedIn)

Si tu veux une version courte :
1. **0-5s** : Connexion rapide (accéléré)
2. **5-20s** : Pan du monde + bulles données réelles
3. **20-35s** : Sélection agent + chat
4. **35-50s** : Spawn quest + FIREWORKS 🎆
5. **50-60s** : Stats + titre final

---

## 🛠️ TIPS DE TOURNAGE

- **Mouvements souris :** Lents et fluides, pas de clics nerveux
- **Timing :** Attends les animations (toast slide-in, fireworks) avant de bouger
- **Zoom navigateur :** Ctrl+/- pour zoomer sur les détails (stats bar, chat)
- **Plein écran :** F11 pour enlever l'UI du navigateur
- **Cache le curseur :** Utilise un outil pour cacher le curseur pendant les pans
- **Résolution :** 1920x1080 minimum, 2560x1440 idéal

**Bonne chance pour le tournage ! 🎬🚀**
