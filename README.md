# 🎮 CraftDock - Minecraft Server Manager

<div align="center">
  <img src="resources/icon.png" width="128" height="128" alt="CraftDock Icon" />
  <h2>CraftDock v2.0.9</h2>
  <p><b>Modern, ultra-fast, and elegant Minecraft Server Manager for Windows & macOS.</b></p>
  <p>
    <img src="https://img.shields.io/badge/version-2.0.9-sky.svg" alt="Version 2.0.9" />
    <img src="https://img.shields.io/badge/electron-44.3.0-blue.svg" alt="Electron" />
    <img src="https://img.shields.io/badge/react-18.3.1-61dafb.svg" alt="React" />
    <img src="https://img.shields.io/badge/typescript-5.5.4-3178c6.svg" alt="TypeScript" />
    <img src="https://img.shields.io/badge/tailwindcss-3.4.10-38bdf8.svg" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/license-MIT-emerald.svg" alt="License" />
  </p>
</div>

---

## ✨ Overview

**CraftDock** simplifies hosting and managing local Minecraft servers on your PC without terminal commands or complex config edits. Build, launch, and play with friends in under 60 seconds with zero network friction.

---

## 🚀 Key Features

### ⚡ 1-Click Server Wizard
- Supports **PaperMC**, **Purpur**, **Fabric**, and **Vanilla Mojang**.
- Automatic online API resolution for the latest Minecraft releases (1.21+, 1.20+, and legacy versions).
- Zero bloat: Downloads server binaries and assets on-demand only.

### 🧠 Intelligent Dynamic RAM Allocation Advisor
- Inspects your host system hardware (total RAM and free available RAM).
- Suggests realistic memory allocations based on target player count and server engine (Paper vs Fabric).
- Real-time safety guard prevents host system freezes and memory exhaustion.

### 💀 Hardcore Mode (1 Life & Permadeath)
- 1-Click Hardcore toggle in both the Server Wizard and Server Properties tab.
- Automatically locks difficulty to **Hard** and enforces spectator mode upon player death.
- Glowing visual indicators and warnings in UI.

### 🌐 Zero-Config Global Multiplayer (Playit.gg Embedded Tunnel)
- Play with friends worldwide without port forwarding or router access.
- Embedded, managed **Playit.gg** agent with instant tunnel generation.
- 1-Click copy address (`*.joinmc.link`) ready to share with friends.
- LAN IP display for players on the same local Wi-Fi.

### 🛡️ Single-Server Concurrency Protection
- Enforces strictly **1 active server at a time** to eliminate port collisions (`25565`) and prevent network tunnel conflicts.
- Smart conflict modal lets you smoothly stop the running world and switch to the target world with one click.

### 💻 Real-Time Interactive Console
- Live ANSI-colored log output with auto-scrolling.
- Quick-action buttons: Day (`/time set day`), Clear Weather (`/weather clear`), Save World (`/save-all`), TPS (`/tps`).
- Real-time player join/leave notices and admin commands execution.

### 🔌 Plugins & Resource Packs Manager
- Curated 1-click installations for essential server plugins:
  - **SkinsRestorer**: Displays skins for all players on offline/cracked servers (`/skin <name>`).
  - **GeyserMC & Floodgate**: Seamless Bedrock crossplay (iOS, Android, Xbox, Nintendo Switch, PS).
  - **EssentialsX**: Server essentials (`/sethome`, `/home`, `/spawn`, `/tpa`, `/warp`, economy).
  - **ViaVersion**: Version compatibility so friends on different versions can connect.
  - **Chunky**: World chunk pre-generation to eliminate chunk-loading lag while flying.
- **Resource Pack Manager**: Add direct `.zip` URLs with join prompts and mandatory pack toggles. Direct integration with `server.properties` and free merge tools.

### ⚙️ Full World Properties & Custom 64x64 Server Icon
- Custom server icon uploader: automatically crops and resizes any image (PNG, JPG, WEBP) to the exact 64x64 pixel format required by Minecraft.
- Real-time Minecraft multiplayer list preview (icon, MOTD, player count, signal strength).
- Offline / Cracked mode toggle (allow friends using TLauncher or non-premium accounts).
- Spawn Protection radius presets (0, 16, 32, 64 blocks).
- Adjustable view distance, simulation distance, default gamemode, and PvP combat switch.

### 👥 Player & Whitelist Management
- Live list of currently connected players with 1-click **Make OP** and **Kick** actions.
- Full Whitelist management: Add/remove usernames and toggle server protection.

### 💾 1-Click World Backups
- Instant world archiving to compressed `.zip` snapshots in `backups/`.
- Protects world builds before updates, mod installations, or experiments.

### 🌐 Dual Language Support (English Default + Bulgarian)
- **English** is the default language across all views and dialogs.
- Instant 1-click language switcher (`🌐 EN | BG`) located in both the TitleBar and Sidebar.
- Selection is remembered across app restarts via persistent storage.

---

## 🛠️ Development & Installation

### Requirements
- **Node.js** 18.x or 20.x
- **npm** or **yarn**
- **Java 17 / 21** installed on your system

### 1. Clone the repository
```bash
git clone https://github.com/itsnotsimple/craftdock.git
cd craftdock
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run in development mode
```bash
npm run dev
```

### 4. Build for production (Windows .exe installer)
```bash
npm run build
npm run dist:win
```
The installer executable (`CraftDock Setup 2.0.9.exe`) will be generated inside the `dist_release/` directory.

---

## 📁 Architecture & File Layout

```text
craftdock/
├── .github/workflows/          # Continuous Integration & Automated Release workflows
├── resources/                  # App icon, visual assets, and binary dependencies
│   ├── icon.ico                # Windows executable icon
│   └── icon.png                # High-res application logo
├── src/
│   ├── main/                   # Electron Main Process
│   │   ├── main.ts             # Window lifecycle, native menus & IPC handlers
│   │   ├── preload.ts          # Secure context bridge API
│   │   ├── server-runner.ts    # Child process management & log streaming
│   │   ├── server-config.ts    # server.properties & curated plugins definitions
│   │   ├── server-store.ts     # JSON persistence for servers & profiles
│   │   ├── system-info.ts      # Hardware metrics (RAM, CPU, IP addresses)
│   │   ├── java-manager.ts     # System Java detection and verification
│   │   └── tunnel-service.ts   # Embedded Playit.gg tunnel runner
│   │
│   └── renderer/               # React Application
│       └── src/
│           ├── i18n/           # English (en) & Bulgarian (bg) dictionaries
│           ├── context/        # LanguageContext, DialogContext
│           ├── components/     # TitleBar, Sidebar, RamSlider, ConsoleView, etc.
│           ├── views/          # LibraryView, WizardView, DashboardView
│           ├── types/          # TypeScript interfaces
│           └── styles/         # Tailwind CSS & custom glassmorphism styles
├── package.json
└── tsconfig.json
```

---

## 📜 License
Distributed under the MIT License. Developed with ❤️ for the Minecraft community.
