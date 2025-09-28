# 🔊 Brandmeister Monitor

**Monitor DMR Radio Activity in Real-Time - Install as an App!**

[![📱 Install as App](https://img.shields.io/badge/📱%20Install%20as%20App-Click%20Here-brightgreen?style=for-the-badge)](https://juantoledo.github.io/brandmeister-monitor)

> **Transform your device into a professional DMR monitoring station**  
> Watch live radio conversations from around the world as they happen

## 🚀 Get Started in 30 Seconds

### **Step 1: Open the App**
👆 **[Click here to open Brandmeister Monitor](https://juantoledo.github.io/brandmeister-monitor)**

### **Step 2: Install as App (Recommended)**

**📱 On Your Phone:**
- **iPhone**: Tap Share → "Add to Home Screen"  
- **Android**: Tap Menu → "Add to Home screen"

**🖥️ On Your Computer:**
- **Chrome/Edge**: Look for Install button (⊕) in address bar
- **Click "Install"** → App appears in your programs

### **Step 3: Start Monitoring**
- Choose what to monitor (specific talk groups or everything)
- Hit Connect and watch live radio activity!

## 🎯 What You'll Experience

### **� Live Radio Activity**
Watch real conversations happening right now across the global DMR network. See who's talking, where they're from, and how long they spoke - all updating live as it happens.

### **🌍 Global Coverage**
Monitor radio activity from countries around the world. Each transmission shows the operator's country flag and location, giving you a window into global amateur radio activity.

### **📱 Works Everywhere**
Once installed, the app works perfectly on your phone, tablet, or computer. No app store needed - just install directly from your browser and it behaves like any other app on your device.

### **⚡ Lightning Fast**
The app loads instantly and updates in real-time. All your settings are remembered, so you can jump right back into monitoring whenever you want.

## 🎨 What Makes This Special

**✨ No App Store Required** - Install directly from your browser  
**🔄 Always Up-to-Date** - Automatically gets the latest features  
**💾 Remembers Your Settings** - Your preferences are saved  
**🌙 Dark & Light Themes** - Comfortable viewing any time of day  
**🔍 Click to Learn More** - Tap any callsign to see operator details  
**📊 Smart Activity Display** - Focus on what matters most  

## 📻 Perfect For

**🎓 Ham Radio Enthusiasts** - Monitor your favorite repeaters and talk groups  
**🌐 DX Listeners** - Discover activity from around the world  
**📡 Emergency Coordinators** - Keep track of emergency communications  
**🔍 Curious Minds** - Learn about amateur radio by listening  
**📱 Mobile Operators** - Monitor while on the go

## 🤔 Frequently Asked Questions

**Q: Do I need to create an account?**  
A: No! Just open the app and start monitoring immediately.

**Q: Does it work offline?**  
A: The app loads offline, but you need internet to receive live radio activity.

**Q: Will it drain my battery?**  
A: The app is optimized for efficiency and uses minimal battery power.

**Q: Is it really free?**  
A: Completely free! No ads, no subscriptions, no hidden costs.

**Q: How do I get updates?**  
A: Updates happen automatically - you'll always have the latest version.

## 🚀 Ready to Start?

**Don't just read about it - experience it!**

### **[👆 Open Brandmeister Monitor Now](https://juantoledo.github.io/brandmeister-monitor)**

*Install it as an app for the best experience - it takes just one click!*

---

**💡 Pro Tip**: After installing, the app appears on your home screen or in your programs just like any other app. No browser needed - it opens in its own window for a clean, distraction-free experience.

**🔊 Start monitoring global DMR activity in seconds!**



## Technical Details

### Based on Original Python Code
This web application is based on the provided Python SocketIO code that monitors Brandmeister network activity. Key features translated:

- **Connection Management**: Handles connect/disconnect events
- **MQTT Message Processing**: Filters and processes incoming transmission data
- **Activity Tracking**: Monitors transmission duration and silence periods
- **Event Filtering**: Only shows relevant activity based on configuration

### Architecture
- **Frontend**: Pure JavaScript (ES6+) with Socket.IO client
- **Styling**: Modern CSS with responsive design
- **Storage**: Browser localStorage for configuration persistence
- **Connection**: WebSocket to `wss://api.brandmeister.network`

### Files Structure
```
brandmeister-monitor/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── app.js             # Main JavaScript application
├── sw.js              # Service Worker for offline capability
└── README.md          # This file
```

## Browser Compatibility

- Modern browsers with WebSocket support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Considerations

- Uses HTTPS connection to Brandmeister API
- No sensitive data stored or transmitted
- Client-side only application

## Customization

You can customize the application by modifying:

1. **Configuration**: Edit the `config` object in `app.js`
2. **Styling**: Modify `styles.css` for appearance changes
3. **Functionality**: Add features in the `BrandmeisterMonitor` class

## Troubleshooting

### Connection Issues
- Ensure you have a stable internet connection
- Check browser console for error messages
- Verify Brandmeister API is accessible

### No Activity Showing
- Confirm your talkgroup ID is correct
- Ensure the talkgroup has active transmissions
- Check that transmission duration meets minimum requirements

### Audio Notifications Not Working
- Some browsers require user interaction before playing audio
- Check browser audio permissions
- Audio may not work in all browsers

## Development

To run locally:
1. Clone or download the files
2. Open `index.html` in a web browser
3. Or serve via a local web server for full functionality

For development with a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

## License

This project is provided as-is for educational and amateur radio purposes.

## Contributing

Feel free to submit issues and enhancement requests or contribute improvements to the codebase.