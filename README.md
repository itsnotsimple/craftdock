# 🎮 CraftDock - Minecraft Server Manager

<div align="center">
  <img src="resources/icon.png" width="128" height="128" alt="CraftDock Icon" />
  <h3>Модерен, интуитивен и мощен мениджър за Minecraft сървъри за Windows & macOS.</h3>
  <p>Създаден с <b>Electron</b>, <b>React</b>, <b>TypeScript</b> и <b>Tailwind CSS</b>.</p>
</div>

---

## ✨ Основни възможности (Features)

- ⚡ **1-Click Създаване на сървър**:
  - Поддръжка на **Vanilla**, **Paper**, **Purpur**, **Spigot** и **Fabric**.
  - Автоматично сваляне на най-новите официални `.jar` файлове и управление на Java версиите.
- 🎛️ **Интелигентно разпределение на RAM**:
  - Интерактивен плъзгач за RAM памет с автоматично изчисляване на оптималните параметри за сървъра и защита на системната памет.
- 💻 **Реално време конзола**:
  - Цветно форматиране на логовете, авто-скрол, статус индикатори и поле за директно въвеждане на команди.
- 🔌 **Плъгини & Ресурс пакети**:
  - Библиотека за управление на ресурс пакети с визуализация на активния пакет в `server.properties`.
  - Препоръчани популярни плъгини (EssentialsX, LuckPerms, Vault, CoreProtect, WorldEdit) с инсталация с 1 клик (за Paper/Purpur/Spigot).
- ⚙️ **Детайлни настройки на света**:
  - Качване и автоматично преоразмеряване на сървърна иконка (64x64 PNG) с визуален преглед.
  - Настройка на Защита на зоната за раждане (Spawn Protection) с бързи бутони.
  - Дистанция на рендиране (View Distance) и симулация (Simulation Distance).
  - Трудност, Gamemode, PvP, Hardcore, Whitelist, Command Blocks, Flight и други.
- 🌐 **Вграден мрежов тунел (Playit.gg)**:
  - Играйте с приятели през интернет без отваряне на портове (Port Forwarding).
- 💾 **Архивиране и възстановяване (Backups)**:
  - Създаване на архиви на целия свят и сървър с един клик.

---

## 🚀 Инсталация и Стартиране за разработчици

### Изисквания:
- [Node.js](https://nodejs.org/) (версия 18 или 20+)
- [Git](https://git-scm.com/)

### 1. Клониране на репозиторито:
```bash
git clone https://github.com/<YOUR_USERNAME>/craftdock.git
cd craftdock
```

### 2. Инсталиране на зависимостите:
```bash
npm install
```

### 3. Стартиране в режим на разработка:
```bash
npm run dev
```

### 4. Компилиране на готов инсталационен файл (.exe):
```bash
npm run dist
```
Готовият инсталатор ще бъде генериран в папката `dist_release/`.

---

## 📁 Структура на проекта

```text
├── .github/workflows/   # Автоматични GitHub Actions за компилация на Releases
├── resources/           # Логота и иконки на приложението
├── src/
│   ├── main/            # Electron Main Process (сървърен бекенд, Java, процеси)
│   └── renderer/        # React + TypeScript + Tailwind UI (интерфейс)
├── public/              # Статични файлове
├── package.json         # Зависимости и скриптове
└── tsconfig.json        # TypeScript конфигурация
```

---

## 📜 Лиценз
Този проект е разработен за лично и общностно ползване.
