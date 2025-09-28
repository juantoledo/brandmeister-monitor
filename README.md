# Brandmeister Monitor - Neutralino Desktop App

Ultra-lightweight desktop wrapper for your web app using Neutralino.js

## Features
- ✅ **Ultra-small** executable (~2-5MB)
- ✅ **Cross-platform** (Windows, Linux, macOS)
- ✅ **Uses OS native browser** (no bundled Chromium)
- ✅ **Your existing web app** works unchanged
- ✅ **No server needed** - loads files directly

## Quick Start

### 1. Install Neutralino CLI
```bash
npm install -g @neutralinojs/neu
```

### 2. Development Mode
```bash
neu run
```

### 3. Build Executables
```bash
# Windows
neu build --target win_x64

# Linux  
neu build --target linux_x64

# macOS
neu build --target mac_x64

# All platforms
neu build
```

### 4. Your Executables
After building, find your apps in `dist/` folder:
- **Windows**: `brandmeister-monitor.exe` (~2-5MB)
- **Linux**: `brandmeister-monitor` (~2-5MB) 
- **macOS**: `brandmeister-monitor` (~2-5MB)

## File Structure
```
neutralino-app/
├── neutralino.config.json    (app configuration)
├── resources/
│   ├── index.html           (your web app)
│   ├── app.js
│   ├── styles.css
│   ├── sw.js
│   └── js/
│       └── main.js          (neutralino bootstrap)
└── dist/                    (built executables)
```

## What's Changed
- Added minimal Neutralino.js integration to `index.html`
- Your original web app code is **completely unchanged**
- Just wrapped in a native window!

Perfect for deployment - no dependencies, tiny size, works everywhere! 🚀