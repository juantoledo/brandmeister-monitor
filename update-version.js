#!/usr/bin/env node

// Simple script to increment the service worker cache version
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, 'js', 'sw.js');

// Read the service worker file
let swContent = fs.readFileSync(swPath, 'utf8');

// Find current version
const versionMatch = swContent.match(/CACHE_NAME = 'brandmeister-monitor-v(\d+)\.(\d+)'/);

if (versionMatch) {
    const major = parseInt(versionMatch[1]);
    const minor = parseInt(versionMatch[2]);
    const newMinor = minor + 1;
    const newVersion = `brandmeister-monitor-v${major}.${newMinor}`;
    
    // Replace the version
    swContent = swContent.replace(
        /CACHE_NAME = 'brandmeister-monitor-v\d+\.\d+'/,
        `CACHE_NAME = '${newVersion}'`
    );
    
    // Also update the console.log messages
    swContent = swContent.replace(
        /Installing service worker v\d+\.\d+/,
        `Installing service worker v${major}.${newMinor}`
    );
    swContent = swContent.replace(
        /Activating service worker v\d+\.\d+/,
        `Activating service worker v${major}.${newMinor}`
    );
    
    // Write back the file
    fs.writeFileSync(swPath, swContent);
    
    console.log(`✅ Cache version updated to: ${newVersion}`);
    console.log('🚀 Commit and push your changes to deploy the update!');
} else {
    console.log('❌ Could not find cache version in service worker');
}