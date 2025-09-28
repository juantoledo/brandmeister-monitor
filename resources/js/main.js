// Neutralino.js bootstrap - minimal setup for your web app
function onWindowClose() {
    Neutralino.app.exit();
}

// Initialize Neutralino
Neutralino.init();

// Set up window close event
Neutralino.events.on("windowClose", onWindowClose);

// Your existing web app will work as-is!
// This file just handles the native window integration