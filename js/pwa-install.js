/**
 * PWA Install Prompt Handler
 * Detects if the app can be installed as a PWA and shows an install button
 */

let deferredPrompt = null;
let installButton = null;

// Initialize PWA install detection when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    installButton = document.getElementById('installButton');
    
    // Check if already installed
    if (isAppInstalled()) {
        console.log('📱 App is already installed as PWA');
        return;
    }
    
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if app was launched as PWA
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Handle install button click
    if (installButton) {
        installButton.addEventListener('click', handleInstallClick);
    }
    
    console.log('📱 PWA install detection initialized');
});

/**
 * Handle the beforeinstallprompt event
 * This fires when the browser detects the app meets PWA installation criteria
 */
function handleBeforeInstallPrompt(event) {
    console.log('📱 PWA installation prompt available');
    
    // Prevent the default browser install prompt
    event.preventDefault();
    
    // Store the event for later use
    deferredPrompt = event;
    
    // Show our custom install button
    if (installButton) {
        installButton.style.display = 'flex';
        installButton.title = 'Install Brandmeister Monitor as an app';
    }
}

/**
 * Handle install button click
 */
async function handleInstallClick() {
    if (!deferredPrompt) {
        console.log('📱 No install prompt available');
        return;
    }
    
    try {
        // Show the browser's install prompt
        await deferredPrompt.prompt();
        
        // Wait for the user's response
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('📱 User accepted the install prompt');
        } else {
            console.log('📱 User dismissed the install prompt');
        }
        
        // Hide the install button regardless of outcome
        if (installButton) {
            installButton.style.display = 'none';
        }
        
        // Clear the deferred prompt
        deferredPrompt = null;
        
    } catch (error) {
        console.error('📱 Error during install:', error);
    }
}

/**
 * Handle successful app installation
 */
function handleAppInstalled(event) {
    console.log('📱 App was successfully installed');
    
    // Hide the install button
    if (installButton) {
        installButton.style.display = 'none';
    }
    
    // Clear the deferred prompt
    deferredPrompt = null;
    
    // Optional: Show a success message
    showInstallSuccessMessage();
}

/**
 * Check if app is already installed
 * This checks for various indicators that the app is running as a PWA
 */
function isAppInstalled() {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    
    // Check for window.navigator.standalone (iOS Safari)
    if (window.navigator.standalone === true) {
        return true;
    }
    
    // Check if launched from home screen (Android)
    if (document.referrer.includes('android-app://')) {
        return true;
    }
    
    return false;
}

/**
 * Show success message after installation
 */
function showInstallSuccessMessage() {
    // Create a temporary success notification
    const notification = document.createElement('div');
    notification.className = 'install-success-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon"><span class="material-icons">check_circle</span></span>
            <span class="notification-text">App installed successfully!</span>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'var(--success)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '6px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: '9999',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * Check PWA installation support
 */
function isPWAInstallSupported() {
    return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
}

// Export for potential use by other modules
window.PWAInstaller = {
    isAppInstalled,
    isPWAInstallSupported,
    handleInstallClick
};