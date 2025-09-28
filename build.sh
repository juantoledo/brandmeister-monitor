#!/bin/bash

# Neutralino Builder for Linux (Ubuntu, Debian, Alpine)
# Compatible shell script equivalent of build.bat

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Clear screen and show header
clear
echo -e "${CYAN}"
echo "=========================================="
echo " NEUTRALINO DESKTOP APP BUILDER (Linux)"
echo "=========================================="
echo -e "${NC}"
echo
echo "Ultra-lightweight desktop wrapper"
echo "Size: ~2-5MB, Cross-platform, No dependencies"
echo

# Detect distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
    elif [ -f /etc/alpine-release ]; then
        DISTRO="alpine"
    elif [ -f /etc/debian_version ]; then
        DISTRO="debian"
    else
        DISTRO="unknown"
    fi
    echo -e "${BLUE}Detected distribution: $DISTRO${NC}"
}

# Check Node.js installation
check_nodejs() {
    echo "Checking Node.js..."
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}SUCCESS: Node.js found ($NODE_VERSION)${NC}"
        return 0
    else
        echo -e "${RED}ERROR: Node.js not found!${NC}"
        echo "Please install Node.js:"
        case "$DISTRO" in
            "ubuntu"|"debian")
                echo "  sudo apt update && sudo apt install nodejs npm"
                ;;
            "alpine")
                echo "  sudo apk add nodejs npm"
                ;;
            *)
                echo "  Visit: https://nodejs.org/"
                ;;
        esac
        return 1
    fi
}

# Check NPM installation
check_npm() {
    echo "Checking npm..."
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}SUCCESS: npm found ($NPM_VERSION)${NC}"
        return 0
    else
        echo -e "${RED}ERROR: npm not found!${NC}"
        echo "Please install npm:"
        case "$DISTRO" in
            "ubuntu"|"debian")
                echo "  sudo apt install npm"
                ;;
            "alpine")
                echo "  sudo apk add npm"
                ;;
        esac
        return 1
    fi
}

# Check Neutralino CLI
check_neutralino() {
    echo "Checking Neutralino CLI..."
    if command -v neu >/dev/null 2>&1; then
        NEU_VERSION=$(neu --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}SUCCESS: Neutralino CLI found ($NEU_VERSION)${NC}"
        return 0
    else
        echo -e "${YELLOW}WARNING: Neutralino CLI not found in PATH${NC}"
        echo "Will attempt to install when needed..."
        return 1
    fi
}

# Install Neutralino CLI
install_neutralino() {
    echo
    echo -e "${CYAN}Installing/Updating Neutralino CLI...${NC}"
    if npm install -g @neutralinojs/neu; then
        echo -e "${GREEN}SUCCESS: Neutralino CLI installed/updated${NC}"
    else
        echo -e "${RED}ERROR: Failed to install Neutralino CLI${NC}"
        echo "Make sure you have npm and Node.js installed"
        echo "Try running with sudo if permission denied"
        return 1
    fi
}

# Update Neutralino binaries
update_binaries() {
    echo
    echo -e "${CYAN}Updating Neutralino binaries...${NC}"
    if neu update; then
        echo -e "${GREEN}SUCCESS: Neutralino binaries updated${NC}"
    else
        echo -e "${RED}ERROR: Failed to update Neutralino binaries${NC}"
        return 1
    fi
}

# Development mode
dev_mode() {
    echo
    echo -e "${CYAN}Starting development mode...${NC}"
    neu run
}

# Build for specific platform
build_linux() {
    echo
    echo -e "${CYAN}Building Linux executable...${NC}"
    neu build --release
    echo
    echo -e "${GREEN}Build complete! Check dist folder.${NC}"
}

# Build all platforms
build_all() {
    echo
    echo -e "${CYAN}Building all platforms...${NC}"
    neu build --release
    echo
    echo -e "${GREEN}Build complete! Files in dist folder:${NC}"
    if [ -d "dist/brandmeister-monitor" ]; then
        for file in dist/brandmeister-monitor/*; do
            filename=$(basename "$file")
            if [ "$filename" != "resources.neu" ]; then
                echo "  $filename"
            fi
        done
    fi
}

# Automatic build with detailed output
auto_build() {
    echo
    echo -e "${CYAN}==========================================${NC}"
    echo -e "${CYAN} AUTOMATIC BUILD - ALL PLATFORMS${NC}"
    echo -e "${CYAN}==========================================${NC}"
    echo
    
    echo "Cleaning previous builds..."
    if [ -d "dist" ]; then
        rm -rf "dist"
    fi
    
    echo "Building all platforms (this may take a moment)..."
    if neu build --release; then
        echo
        echo -e "${CYAN}==========================================${NC}"
        echo -e "${CYAN} BUILD RESULTS${NC}"
        echo -e "${CYAN}==========================================${NC}"
        echo
        
        if [ -f "dist/brandmeister-monitor/brandmeister-monitor-linux_x64" ]; then
            echo -e "${GREEN}SUCCESS: Build completed!${NC}"
            echo
            echo "Generated executables in dist/brandmeister-monitor/:"
            
            for file in dist/brandmeister-monitor/brandmeister-monitor-*; do
                if [ -f "$file" ]; then
                    filename=$(basename "$file")
                    filesize=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown")
                    
                    case "$filename" in
                        *win_x64.exe)
                            echo -e "  ${BLUE}Windows: $filename ($filesize bytes)${NC}"
                            ;;
                        *linux*)
                            echo -e "  ${GREEN}Linux: $filename ($filesize bytes)${NC}"
                            ;;
                        *mac*)
                            echo -e "  ${YELLOW}macOS: $filename ($filesize bytes)${NC}"
                            ;;
                        *)
                            echo -e "  ${CYAN}Other: $filename ($filesize bytes)${NC}"
                            ;;
                    esac
                fi
            done
            
            if [ -f "dist/brandmeister-monitor/resources.neu" ]; then
                echo "  Resources: resources.neu (required)"
            fi
            
            if [ -f "dist/brandmeister-monitor-release.zip" ]; then
                echo "  Package: brandmeister-monitor-release.zip (complete package)"
            fi
            
            echo
            echo "Location: dist/brandmeister-monitor/"
            echo
            echo "Your web app is now packaged into ultra-light desktop executables!"
            echo "• Windows: brandmeister-monitor-win_x64.exe (~2.6MB)"
            echo "• Linux: brandmeister-monitor-linux_x64 (~1.8MB)"
            echo "• macOS: brandmeister-monitor-mac_x64 (~2.3MB)"
            echo
            echo "Just run any executable to start your app!"
            echo
            
            read -p "Open dist folder? (y/n): " opendir
            if [[ $opendir == [Yy]* ]]; then
                if command -v xdg-open >/dev/null 2>&1; then
                    xdg-open "dist/brandmeister-monitor"
                elif command -v open >/dev/null 2>&1; then
                    open "dist/brandmeister-monitor"
                else
                    echo "Please manually open: $(pwd)/dist/brandmeister-monitor"
                fi
            fi
        else
            echo -e "${RED}ERROR: Build failed - no executables found in dist directory${NC}"
            return 1
        fi
    else
        echo -e "${RED}ERROR: Build command failed${NC}"
        return 1
    fi
}

# Open dist folder
open_dist() {
    echo
    if [ -d "dist" ]; then
        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open "dist"
        elif command -v open >/dev/null 2>&1; then
            open "dist"
        else
            echo "Dist folder location: $(pwd)/dist"
            ls -la dist/
        fi
    else
        echo -e "${YELLOW}No dist folder found. Build first!${NC}"
    fi
}

# Show menu
show_menu() {
    echo
    echo -e "${CYAN}==========================================${NC}"
    echo "Choose action:"
    echo -e "${CYAN}==========================================${NC}"
    echo
    echo "  [1] Development Mode"
    echo "  [2] Build Linux executable"
    echo "  [3] Build ALL platforms"
    echo "  [4] AUTO BUILD (recommended)"
    echo "  [5] Open dist folder"
    echo "  [6] Install/Update Neutralino CLI"
    echo "  [7] Update Neutralino binaries"
    echo "  [0] Exit"
    echo
    read -p "Enter choice (0-7): " choice
}

# Main execution
main() {
    # Initial checks
    detect_distro
    
    if ! check_nodejs; then
        read -p "Press Enter to exit..."
        exit 1
    fi
    
    if ! check_npm; then
        read -p "Press Enter to exit..."
        exit 1
    fi
    
    check_neutralino
    
    # Show menu and handle choice
    show_menu
    
    case $choice in
        1)
            dev_mode
            ;;
        2)
            build_linux
            ;;
        3)
            build_all
            ;;
        4)
            auto_build
            ;;
        5)
            open_dist
            ;;
        6)
            install_neutralino
            ;;
        7)
            update_binaries
            ;;
        0)
            echo
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice!${NC}"
            exit 1
            ;;
    esac
    
    echo
    echo -e "${CYAN}==========================================${NC}"
    echo "Your app is now ready for distribution!"
    echo -e "${CYAN}==========================================${NC}"
    echo
    read -p "Press Enter to exit..."
}

# Run main function
main