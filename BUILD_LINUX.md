# Linux Build Instructions

## Brandmeister Monitor - Linux Build Script

This repository includes `build.sh` - a comprehensive build script compatible with Ubuntu, Debian, and Alpine Linux distributions.

## Prerequisites

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install nodejs npm
```

### Alpine Linux:
```bash
sudo apk add nodejs npm
```

## Quick Start

1. **Make the script executable:**
   ```bash
   chmod +x build.sh
   ```

2. **Run the build script:**
   ```bash
   ./build.sh
   ```

3. **Choose from the menu:**
   - `[1]` Development Mode - Start dev server
   - `[2]` Build Linux executable - Build for current platform
   - `[3]` Build ALL platforms - Build for Windows, Linux, macOS
   - `[4]` AUTO BUILD (recommended) - Clean build with detailed output
   - `[5]` Open dist folder - View build results
   - `[6]` Install/Update Neutralino CLI - Setup/update build tools
   - `[7]` Update Neutralino binaries - Update binary dependencies

## Features

✅ **Distribution Detection**: Automatically detects Ubuntu, Debian, Alpine
✅ **Dependency Checking**: Validates Node.js, npm, Neutralino CLI
✅ **Auto Installation**: Guides through missing dependency installation
✅ **Cross-platform Builds**: Generates Windows, Linux, macOS executables
✅ **Colored Output**: Clear visual feedback with color coding
✅ **Error Handling**: Robust error checking and user guidance

## Build Outputs

After successful build, you'll find in `dist/brandmeister-monitor/`:

- `brandmeister-monitor-linux_x64` - Linux 64-bit executable (~1.8MB)
- `brandmeister-monitor-linux_armhf` - Linux ARM32 executable
- `brandmeister-monitor-linux_arm64` - Linux ARM64 executable  
- `brandmeister-monitor-win_x64.exe` - Windows 64-bit executable (~2.6MB)
- `brandmeister-monitor-mac_x64` - macOS Intel executable (~2.3MB)
- `brandmeister-monitor-mac_arm64` - macOS Apple Silicon executable
- `brandmeister-monitor-mac_universal` - macOS Universal executable
- `resources.neu` - Required resource bundle

## Troubleshooting

### Permission Issues:
```bash
# If npm global install fails:
sudo npm install -g @neutralinojs/neu

# Make script executable:
chmod +x build.sh
```

### Missing Dependencies:
The script will detect and guide you through installing missing dependencies based on your Linux distribution.

### Build Failures:
1. Ensure all dependencies are installed
2. Run option `[6]` to install/update Neutralino CLI
3. Run option `[7]` to update Neutralino binaries
4. Try option `[4]` for clean auto build

## File Structure

```
brandmeister-monitor/
├── build.sh           # Linux build script  
├── build.bat          # Windows build script
├── neutralino.config.json
├── resources/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── icons/
└── dist/              # Build output directory
```

## Development Mode

For development with hot-reload:
```bash
./build.sh
# Choose option [1]
```

This starts the Neutralino development server with auto-reload on file changes.

## Distribution

The generated executables are standalone and can be distributed without additional dependencies. Each platform's executable (~1.8-2.6MB) includes everything needed to run your app.

## Compatibility

- ✅ Ubuntu 18.04+ 
- ✅ Debian 9+
- ✅ Alpine Linux 3.10+
- ✅ Other Linux distributions (with Node.js support)

---

**Note**: This script mirrors all functionality of the Windows `build.bat` with Linux-specific adaptations and distribution-aware dependency management.