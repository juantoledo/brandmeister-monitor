# Brandmeister Monitor Web App

A real-time web-based monitoring application for Brandmeister DMR network talkgroups. This app connects to the Brandmeister API via WebSocket and monitors activity on a specific talkgroup that you configure.

## Features

- 🔊 **Real-time Monitoring**: Live connection to Brandmeister network via WebSocket
- 💾 **Persistent Storage**: Talkgroup configuration saved in browser localStorage
- 📊 **Activity Logging**: Detailed logs with timestamps, callsigns, and transmission duration
- 📈 **Statistics**: Track total calls and last activity time
- 🎨 **Modern UI**: Responsive design with real-time status indicators
- 🔔 **Audio Notifications**: Optional sound alerts for new transmissions
- 📱 **Mobile Friendly**: Responsive design works on all devices

## How to Use

1. **Open the Application**: Open `index.html` in your web browser
2. **Configure Talkgroup**: Enter the talkgroup ID you want to monitor (e.g., 214 for Spain)
3. **Save Configuration**: Click "Save & Monitor" to store your talkgroup preference
4. **Connect**: Click "Connect" to establish connection to Brandmeister network
5. **Monitor**: Watch real-time activity for your configured talkgroup

## Configuration

The application includes several configurable parameters in the JavaScript code:

```javascript
this.config = {
    minDuration: 2,    // minimum duration in seconds
    minSilence: 10,    // minimum silence in seconds
    verbose: true      // enable verbose logging
};
```

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