# 🎮 CraftDock — Next-Gen Minecraft Server Manager

<div align="center">
  <img src="resources/icon.png" width="130" height="130" alt="CraftDock Logo" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(14, 165, 233, 0.3);" />
  <h1 style="margin-top: 12px; margin-bottom: 4px;">CraftDock v3.4.0</h1>
  <p><b>The ultimate, ultra-fast, and beautiful desktop Minecraft Server Manager for Windows & macOS.</b></p>
  <p><i>Host, optimize, automate, control from your phone, and play with friends in under 60 seconds — 100% on your own hardware, zero subscription fees.</i></p>

  <p>
    <a href="https://github.com/itsnotsimple/craftdock/releases/latest"><img src="https://img.shields.io/badge/version-3.4.0-sky.svg?style=for-the-badge&logo=electron" alt="Version 3.4.0" /></a>
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue.svg?style=for-the-badge&logo=apple" alt="Platform" />
    <img src="https://img.shields.io/badge/react-18.3.1-61dafb.svg?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/typescript-5.5-3178c6.svg?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/license-MIT-emerald.svg?style=for-the-badge" alt="License" />
  </p>

  <p>
    <a href="#-quick-download"><b>⚡ Quick Download</b></a> •
    <a href="#-key-features"><b>✨ Features</b></a> •
    <a href="#-mobile-remote-web-app"><b>📱 Mobile Remote</b></a> •
    <a href="#-task-scheduler--cron"><b>⏰ Scheduler</b></a> •
    <a href="#-seed-map--structure-radar"><b>🧭 Seed Radar</b></a> •
    <a href="#-performance--optimization"><b>⚡ Optimization</b></a> •
    <a href="#-development--building"><b>🛠️ Development</b></a> •
    <a href="#-faq"><b>❓ FAQ</b></a>
  </p>
</div>

---

## ⚡ Quick Download

Download the official compiled release for your operating system:

| Platform | Processor Architecture | Download Link |
|:---|:---|:---|
| 🪟 **Windows** | 64-bit (x64) | [**`CraftDock-3.4.0-Windows-Setup.exe`**](https://github.com/itsnotsimple/craftdock/releases/latest) |
| 🍏 **macOS** | Apple Silicon (**M1 / M2 / M3 / M4**) | [**`CraftDock-3.4.0-macOS-arm64.dmg`**](https://github.com/itsnotsimple/craftdock/releases/latest) |
| 🍏 **macOS** | Intel Processor (x64) | [**`CraftDock-3.4.0-macOS-x64.dmg`**](https://github.com/itsnotsimple/craftdock/releases/latest) |

> [!TIP]
> **🍏 First-Time Launch on macOS (Apple Gatekeeper):**  
> Because CraftDock is a free community project, macOS may show a security notice on first launch (*"CraftDock is damaged and can't be opened"*).  
>
> To allow normal double-clicking, drag CraftDock to your **Applications** folder, open **Terminal**, and run:
> ```bash
> xattr -cr /Applications/CraftDock.app
> ```
> *(Or navigate to **System Settings ➔ Privacy & Security ➔ Security** and click **Open Anyway**).*

---

## ✨ Key Features Overview

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                                CRAFTDOCK v3.4.0                                   ║
╠═════════════════════════════╦═════════════════════════════╦═══════════════════════╣
║ 🚀 SERVER MANAGEMENT        ║ 📱 REMOTE & AUTOMATION      ║ ⚡ OPTIMIZATION & RADAR║
║ • Paper, Purpur, Fabric,    ║ • Mobile Web Remote (Wi-Fi) ║ • Lag Buster & Chunky ║
║   Vanilla 1.12 - 1.21.x     ║ • Worldwide 4G/5G Tunnel    ║ • 5-min Auto-Hibernate║
║ • Auto Adoptium OpenJDK     ║ • 4-Digit Security PIN      ║ • World Slimmer Pruning║
║ • Visual server.properties  ║ • Task Scheduler / Cron     ║ • Seed Map & Structure║
║ • 1-Click Version Upgrader  ║ • Automated Backups         ║   Radar with /tp live ║
║ • 1-Click World Import/Export║ • Live Playtime Leaderboard ║ • Player Inventory NBT║
╚═════════════════════════════╩═════════════════════════════╩═══════════════════════╝
```

---

## 📱 Mobile Remote Web App (Control from Smartphone)

Control your entire Minecraft server farm directly from any smartphone or tablet browser (iOS Safari, Android Chrome, etc.) with **zero app installations**.

* **Local Wi-Fi + Global 4G/5G Access**:
  * **Local Network**: Automatically binds to host LAN IPv4 with instant QR code scanning.
  * **Worldwide Cloudflare Quick Tunnel**: 1-click encrypted HTTPS public address (e.g. `https://xxxx.trycloudflare.com`) with **zero account, zero sign-up, and zero port forwarding**.
* **4-Digit Hardware Security PIN**:
  * Clean on-screen digital keypad on mobile devices with hardware session tokens.
* **Instant Touch Dashboard**:
  * Start, stop, and restart with haptic feedback.
  * Live interactive terminal console with automatic scroll and command chips (`/list`, `/save-all`, `/tps`, `/weather clear`, `/time set day`).
  * Live CPU load, RAM usage, and online player count with 3D player skins.
  * Quick moderation: OP, Kick, Ban directly from your phone.

---

## ⏰ Task Scheduler & Cron Engine

Full automated server operations engine running a precision 30-second cron runner:

* **Frequency Types**: Daily at specific time (`HH:mm`), periodic intervals (minutes/hours), and weekly schedules.
* **Intelligent Restart with In-Game Broadcast**:
  * Warns online players 10 seconds before restart via in-game `/say [CraftDock] Server restarting in 10s... Saving world!`.
  * Automatically issues `/save-all`, stops the process, waits for graceful shutdown, and restarts cleanly.
* **1-Click Presets**:
  * 🌅 **Daily Restart (04:00 AM)**: Nightly memory defragmentation.
  * 💾 **World Backup (Every 6h)**: Non-blocking hot backup of all dimensions.
  * 📢 **Rule Reminder (Every 30m)**: Periodic broadcast to player chat.
  * 🧹 **Lag Cleanup (Every 2h)**: Automatically sweeps floor items.

---

## 🧭 Seed Map & Interactive Structure Radar

Instant Minecraft Java Edition world exploration directly from your server's level data:

* **64-Bit NBT Seed Extraction**:
  * Automatically parses `server.properties` (`level-seed`).
  * If left empty (random default world), decompresses `world/level.dat` via binary NBT scan for the true 64-bit Long `seed`.
* **Mathematical Structure Engine (Java Edition 1.18 – 1.21+)**:
  * **Strongholds**: Concentric orbital rings calculation (Ring 1 at 1280–2816 blocks, Ring 2 at 4352–5888 blocks, etc.).
  * **Overworld Structures**: Villages (Plains, Desert, Savanna, Taiga, Snowy), Ancient Cities, Trial Chambers (1.21+), Woodland Mansions, Ocean Monuments, Pillager Outposts.
  * **Nether Structures**: Nether Fortresses, Bastion Remnants.
  * **The End Structures**: End Cities with Elytra ships.
* **Interactive SVG Canvas**:
  * Concentric range rings (1,000 to 20,000 blocks), cardinal axes (N, S, E, W), and degree markers.
  * Custom origin selection (Spawn `0,0` or your personal player base).
  * 1-click **Copy `/tp` command** and **Live Teleport** directly to running server console.
  * 1-click prefilled **Chunkbase Seed Map** launcher.

---

## ⚡ Performance & Optimization Suite

* **⚡ Lag Buster & Entity Detective**:
  * Scans entity densities to detect animal farms, villagers, or mob spawners causing TPS drops.
  * 1-click dropped item sweeper (`/kill @e[type=item]`).
  * Embedded **Chunky** terrain pre-generator to eliminate flight generation lag.
* **💤 Smart Sleep Mode (Auto-Hibernate)**:
  * When no players are online for 5 minutes (configurable), automatically puts the server to sleep to save CPU and RAM.
  * Wakes up in seconds the moment any player attempts to join.
* **🧹 World Slimmer (Chunk Pruning)**:
  * Scans MCA region files and prunes untouched chunks outside player activity radii, reclaiming gigabytes of disk space without resetting player builds.
* **📈 Performance Analytics & Crash Analyzer**:
  * Live SVG graphs for CPU %, RAM MB, and online players with smart downsampling.
  * Complete session uptime history and playtime leaderboard with 3D player skins.
  * Automated crash log analyzer with instant plain-text solutions for `OutOfMemoryError`, occupied ports, Java class mismatches, and faulty plugins.

---

## 📦 World & Dimension Management

* **Dimension Inspector**:
  * Distinct status cards for **Overworld**, **The Nether**, and **The End**.
  * Shows exact disk size, player data counts, and last modified timestamps.
* **1-Click Nether & End Reset**:
  * Reset nether and end dimensions for new Minecraft updates without touching your main Overworld buildings.
* **Full World ZIP Import & Export**:
  * Import custom adventure maps or singleplayer saves with automatic backup protection.
  * Export worlds into standalone `.zip` packages.
* **Automated & Manual Backups**:
  * Configurable retention policy, compression, and 1-click restore.

---

## 🎮 Server Configuration & Customization

* **Visual `server.properties` GUI + Raw Text Editor**:
  * Over 40+ settings organized into: *Gameplay & World*, *Network & Performance*, *Security & Watchdog*, and *RCON*.
  * Real-time debounced auto-save with toast confirmation.
  * Raw syntax-highlighted editor with line numbers and instant search.
* **🎨 Minecraft MOTD Designer**:
  * Pixel-perfect multiplayer server list preview with authentic Minecraft fonts and ping bars.
  * Full formatting palette (`§0`–`§f`, bold, strike, obfuscated) and 5 ready-to-use presets.
* **👥 Player & Ban Management**:
  * Operator levels (1–4), whitelist control, banned player roster with pardon buttons, and IP bans.
  * Live player inspection with real-time **Inventory & Ender Chest viewer**.
* **🔄 Server Version Upgrader**:
  * Upgrade between Minecraft versions with automatic pre-upgrade world backup and live download progress.
* **🎨 10 Pixel-Art Card Themes**:
  * Custom themes: Dirt, Stone, Netherrack, End Stone, Obsidian, Deepslate, Bedrock, Prismarine, Wood, and Classic.

---

## 🌐 Zero-Config Global Multiplayer (Playit.gg Embedded Tunnel)

* **Play With Friends Anywhere**: No port forwarding, no router admin login, no exposing your private home IP.
* **Embedded Tunnel Engine**: Launches a secure tunnel with 1 click and provides a shareable `*.joinmc.link` address.
* **Local LAN Support**: Automatic local Wi-Fi IP detector for zero-latency LAN parties.

---

## 🛠️ Development & Building

### Prerequisites
* **Node.js** v20.x or v22.x
* **npm** v10+

### 1. Clone the repository
```bash
git clone https://github.com/itsnotsimple/craftdock.git
cd craftdock
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development mode
```bash
npm run dev
```

### 4. Production builds
```bash
# Build TypeScript and Vite renderer
npm run build

# Package Windows installer (.exe)
npm run dist:win

# Package macOS Disk Images (.dmg for Apple Silicon and Intel)
npm run dist:mac
```

---

## 📁 Architecture

```text
craftdock/
├── .github/workflows/          # Automated multi-platform GitHub Actions release CI
├── resources/                  # App icons (.png, .ico, .icns) and DMG background
├── src/
│   ├── main/                   # Electron Main Process (Node.js)
│   │   ├── main.ts             # Window lifecycle, Tray, IPC registry, Updater
│   │   ├── preload.ts          # ContextBridge security barrier & typed API exports
│   │   ├── remote-service.ts   # Mobile Web Remote HTTP server & SSE stream
│   │   ├── qr-generator.ts     # Pure TypeScript ISO/IEC 18004 QR code matrix generator
│   │   ├── task-scheduler.ts   # Automated cron scheduler engine
│   │   ├── seed-locator.ts     # 64-bit NBT seed parser & Java Edition structure math
│   │   ├── lag-buster-service.ts # Mob density scanner & item cleanup
│   │   ├── sleep-manager.ts    # Idle sleep & wake-on-connect socket listener
│   │   ├── world-slimmer.ts    # Region chunk trimmer & disk space optimizer
│   │   ├── world-manager.ts    # Dimension scanner, reset, and ZIP import/export
│   │   ├── version-upgrader.ts # Server core replacement engine
│   │   ├── player-data-service.ts # NBT inventory & ender chest reader
│   │   ├── crash-analyzer.ts   # Crash report heuristic resolver
│   │   ├── api-service.ts      # Paper/Purpur/Fabric/Vanilla & Modrinth API clients
│   │   ├── java-manager.ts     # Automated Adoptium OpenJDK runtime downloader
│   │   ├── server-runner.ts    # Process lifecycle, live log streaming, CPU/RAM telemetry
│   │   ├── server-config.ts    # server.properties read/write & plugin installer
│   │   ├── server-store.ts     # Server profiles persistence & storage tracking
│   │   └── tunnel-service.ts   # Embedded Playit.gg & Cloudflare tunnel controllers
│   │
│   └── renderer/               # React 18 Application (Vite + Tailwind CSS)
│       └── src/
│           ├── components/     # SeedMapRadar, MobileRemoteModal, WorldManager, PlayerManagement...
│           ├── views/          # LibraryView, WizardView, DashboardView, SchedulerView, SettingsView
│           ├── context/        # ThemeContext, LanguageContext, DialogContext
│           ├── i18n/           # 100% Bilingual translations (EN / BG)
│           ├── types/          # Strict TypeScript interfaces
│           └── styles/         # Tailwind CSS & glassmorphic tokens
├── package.json
└── tsconfig.json
```

---

## ❓ FAQ

<details>
<summary><b>Do my friends need CraftDock to join my server?</b></summary>
<br>
<b>No!</b> CraftDock runs the standard Minecraft server. Your friends simply use their regular Minecraft client (Java Edition or Bedrock Edition if Geyser is enabled) and paste the server address or Playit tunnel link into their multiplayer list.
</details>

<details>
<summary><b>How does Mobile Remote work without exposing my network?</b></summary>
<br>
Mobile Remote uses two secure modes:
1. <b>Local Wi-Fi</b>: Connects only across your internal home network with a 4-digit PIN verification.
2. <b>Cloudflare Quick Tunnel</b>: Creates a zero-trust end-to-end encrypted outbound HTTPS tunnel directly through Cloudflare's edge network, completely bypassing open ports, port forwarding, or public IP exposure.
</details>

<details>
<summary><b>Can friends with cracked / TLauncher accounts connect?</b></summary>
<br>
<b>Yes!</b> In your server's settings tab, simply switch <b>Online Mode</b> to <code>Disabled (Offline/Cracked)</code>. You can also install the 1-click <b>SkinsRestorer</b> plugin so cracked accounts have their custom skins displayed.
</details>

<details>
<summary><b>How does Minimize to Tray work?</b></summary>
<br>
When <code>Minimize to Tray</code> is enabled in Settings, clicking the window close button <b>(X)</b> hides CraftDock into the Windows notification tray (next to the clock) or macOS menu bar. Your Minecraft servers will stay online uninterrupted until you explicitly choose <b>Quit CraftDock</b> from the tray menu.
</details>

<details>
<summary><b>Why does macOS say "CraftDock is damaged and can't be opened"?</b></summary>
<br>
This is standard macOS Gatekeeper behavior for free open-source software downloaded outside the Mac App Store. The app is completely safe and undamaged. Simply drag CraftDock to <b>/Applications</b>, open <b>Terminal</b>, and execute:
<pre><code>xattr -cr /Applications/CraftDock.app</code></pre>
Once run, CraftDock will launch with a normal double-click forever.
</details>

---

## 📜 License & Credits

Distributed under the **MIT License**. Created with ❤️ for the Minecraft community.  
CraftDock is not affiliated with Mojang Studios or Microsoft.
