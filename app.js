// Shared app functionality

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('App can be installed');
});

window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
});

// Shared Storage Utilities
const StorageKeys = {
    PHOTOS: 'photobooth-photos',
    VIDEOS: 'photobooth-videos',
    DESIGN: 'photobooth-design',
    DESIGN_SETTINGS: 'photobooth-design-settings',
    SESSIONS: 'photobooth-sessions',
    ACTIVE_SESSION: 'photobooth-active-session',
    SYNC_QUEUE: 'photobooth-sync-queue',
    LAST_SYNC: 'photobooth-last-sync'
};

// Get Photos from Storage
function getPhotosFromStorage() {
    try {
        const saved = localStorage.getItem(StorageKeys.PHOTOS);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading photos:', error);
        return [];
    }
}

// Save Photos to Storage
function savePhotosToStorage(photos, skipCloudSync = false) {
    try {
        const photosJson = JSON.stringify(photos);
        localStorage.setItem(StorageKeys.PHOTOS, photosJson);
        console.log('Photos saved to storage:', photos.length, 'photos');

        // Queue new photos for cloud sync if authenticated (and not skipped)
        if (!skipCloudSync && typeof isAuthenticated === 'function' && isAuthenticated()) {
            // Find photos that haven't been synced yet
            const unsyncedPhotos = photos.filter(p => !p.uploadedToCloud && p.data);
            if (unsyncedPhotos.length > 0 && typeof queuePhotoForSync === 'function') {
                unsyncedPhotos.forEach(photo => {
                    queuePhotoForSync(photo);
                });
                // Process queue
                if (typeof processOfflineQueue === 'function') {
                    processOfflineQueue();
                }
            }
        }

        return true;
    } catch (error) {
        console.error('Error saving photos:', error);
        // If storage is full, try to clear old photos
        if (error.name === 'QuotaExceededError') {
            console.warn('Storage quota exceeded, clearing old photos');
            try {
                // Keep only last 100 photos
                const sorted = photos.sort((a, b) => (b.id || 0) - (a.id || 0));
                const trimmed = sorted.slice(0, 100);
                localStorage.setItem(StorageKeys.PHOTOS, JSON.stringify(trimmed));
                console.log('Trimmed photos to 100 most recent');
                return true;
            } catch (e2) {
                console.error('Failed to trim photos:', e2);
            }
        }
        return false;
    }
}

// Check if user is authenticated (helper that works even if firebase-auth.js isn't loaded)
function isUserAuthenticated() {
    if (typeof isAuthenticated === 'function') {
        return isAuthenticated();
    }
    return false;
}

// Get Videos from Storage
function getVideosFromStorage() {
    try {
        const saved = localStorage.getItem(StorageKeys.VIDEOS);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading videos:', error);
        return [];
    }
}

// Save Videos to Storage
function saveVideosToStorage(videos) {
    try {
        localStorage.setItem(StorageKeys.VIDEOS, JSON.stringify(videos));
    } catch (error) {
        console.error('Error saving videos:', error);
    }
}

// Get Design from Storage
function getDesignFromStorage() {
    try {
        return localStorage.getItem(StorageKeys.DESIGN);
    } catch (error) {
        console.error('Error loading design:', error);
        return null;
    }
}

// Save Design to Storage
function saveDesignToStorage(designData) {
    try {
        if (designData) {
            localStorage.setItem(StorageKeys.DESIGN, designData);
        } else {
            localStorage.removeItem(StorageKeys.DESIGN);
        }
    } catch (error) {
        console.error('Error saving design:', error);
    }
}

// Get Design Settings from Storage
function getDesignSettingsFromStorage() {
    try {
        const saved = localStorage.getItem(StorageKeys.DESIGN_SETTINGS);
        return saved ? JSON.parse(saved) : {
            position: 'center',
            size: 100,
            opacity: 100
        };
    } catch (error) {
        console.error('Error loading design settings:', error);
        return {
            position: 'center',
            size: 100,
            opacity: 100
        };
    }
}

// Save Design Settings to Storage
function saveDesignSettingsToStorage(settings) {
    try {
        localStorage.setItem(StorageKeys.DESIGN_SETTINGS, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving design settings:', error);
    }
}

// Session Management Functions
function getSessions() {
    try {
        const saved = localStorage.getItem(StorageKeys.SESSIONS);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading sessions:', error);
        return [];
    }
}

function saveSessions(sessions) {
    try {
        localStorage.setItem(StorageKeys.SESSIONS, JSON.stringify(sessions));

        // Trigger cloud sync if authenticated
        if (typeof isAuthenticated === 'function' && isAuthenticated()) {
            if (typeof syncSessionsToCloud === 'function') {
                // Debounce sync to avoid too many requests
                clearTimeout(window._sessionSyncTimeout);
                window._sessionSyncTimeout = setTimeout(() => {
                    syncSessionsToCloud(sessions);
                }, 1000);
            }
        }
    } catch (error) {
        console.error('Error saving sessions:', error);
    }
}

function getActiveSessionId() {
    try {
        return localStorage.getItem(StorageKeys.ACTIVE_SESSION) || null;
    } catch (error) {
        console.error('Error loading active session:', error);
        return null;
    }
}

function setActiveSessionId(sessionId) {
    try {
        if (sessionId) {
            localStorage.setItem(StorageKeys.ACTIVE_SESSION, sessionId);
        } else {
            localStorage.removeItem(StorageKeys.ACTIVE_SESSION);
        }

        // Sync to cloud if authenticated
        if (typeof isAuthenticated === 'function' && isAuthenticated()) {
            if (typeof setActiveSessionInCloud === 'function') {
                setActiveSessionInCloud(sessionId).then(result => {
                    console.log('Active session synced to cloud:', result);
                }).catch(err => {
                    console.error('Failed to sync active session to cloud:', err);
                });
            }
        }
    } catch (error) {
        console.error('Error saving active session:', error);
    }
}

function getActiveSession() {
    const sessionId = getActiveSessionId();
    if (!sessionId) return null;
    
    const sessions = getSessions();
    return sessions.find(s => s.id === sessionId) || null;
}

// Default settings for new sessions
function getDefaultSettings() {
    return {
        // Overlay settings
        position: 'center',
        size: 100,
        opacity: 100,

        // Layout settings
        layout: {
            orientation: 'horizontal',
            photoCount: 3,
            spacing: 10
        },

        // Background settings
        background: {
            type: 'solid',
            color: '#ffffff',
            gradientStart: '#ffffff',
            gradientEnd: '#f0f0f0',
            gradientDirection: 'to bottom'
        },

        // Text overlay settings
        text: {
            enabled: false,
            content: '',
            position: 'bottom',
            fontSize: 24,
            fontFamily: 'Arial',
            color: '#000000',
            showDate: false
        },

        // Border settings
        border: {
            enabled: false,
            width: 0,
            color: '#000000',
            style: 'solid',
            radius: 0
        },

        // Collage settings
        collage: {
            logoCorner: 'bottom-right',
            gap: 10,
            padding: 20
        },

        // 4x6 Photo settings
        photo4x6: {
            cornerLogo: null,
            position: 'bottom-right',
            size: 80,
            opacity: 100,
            padding: 20
        }
    };
}

function createSession(name, designData, settings) {
    const sessions = getSessions();
    const defaultSettings = getDefaultSettings();
    const newSession = {
        id: Date.now().toString(),
        name: name || `Session ${sessions.length + 1}`,
        design: designData,
        settings: settings ? { ...defaultSettings, ...settings } : defaultSettings,
        createdAt: new Date().toISOString()
    };
    sessions.push(newSession);
    saveSessions(sessions);
    return newSession;
}

function updateSession(sessionId, updates) {
    const sessions = getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
        sessions[index] = { ...sessions[index], ...updates };
        saveSessions(sessions);
        return sessions[index];
    }
    return null;
}

function deleteSession(sessionId) {
    const sessions = getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    saveSessions(filtered);
    
    // If deleted session was active, clear active session
    if (getActiveSessionId() === sessionId) {
        setActiveSessionId(null);
    }
}

// Legacy compatibility - get design from active session or fallback
function getDesignFromStorage() {
    const activeSession = getActiveSession();
    if (activeSession && activeSession.design) {
        return activeSession.design;
    }
    // Fallback to legacy storage
    try {
        return localStorage.getItem(StorageKeys.DESIGN);
    } catch (error) {
        console.error('Error loading design:', error);
        return null;
    }
}

// Legacy compatibility - get settings from active session or fallback
function getDesignSettingsFromStorage() {
    const activeSession = getActiveSession();
    const defaultSettings = getDefaultSettings();

    if (activeSession && activeSession.settings) {
        // Merge with defaults to ensure new settings exist
        return { ...defaultSettings, ...activeSession.settings };
    }
    // Fallback to legacy storage
    try {
        const saved = localStorage.getItem(StorageKeys.DESIGN_SETTINGS);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...defaultSettings, ...parsed };
        }
        return defaultSettings;
    } catch (error) {
        console.error('Error loading design settings:', error);
        return defaultSettings;
    }
}

// Utility: Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Download Photo utility
function downloadPhoto(photoData, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = photoData;
    link.click();
}

// Text Photo utility - works on mobile and Windows
function textPhoto(photoData) {
    // Create a blob from the data URL
    fetch(photoData)
        .then(res => res.blob())
        .then(async blob => {
            const file = new File([blob], 'fe2p-photo.jpg', { type: 'image/jpeg' });

            // Try to use share API first (works on mobile and some browsers)
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'BOOTHX Photo',
                        text: 'Check out my photo from Flawless Events 2 Perfection!'
                    });
                    return;
                } catch (err) {
                    // User cancelled or share failed, try fallbacks
                }
            }

            // Windows/Desktop fallback: Try to copy image to clipboard
            if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                try {
                    // Convert to PNG for clipboard compatibility
                    const pngBlob = await convertToPng(photoData);
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': pngBlob })
                    ]);
                    showShareNotification('Photo copied to clipboard! Paste it in your messaging app.');
                    return;
                } catch (err) {
                    console.log('Clipboard write failed:', err);
                }
            }

            // Final fallback: Download the photo
            downloadPhoto(photoData, 'fe2p-photo-' + Date.now() + '.jpg');
            showShareNotification('Photo downloaded! Attach it to your message.');
        })
        .catch(() => {
            // Error fallback: Just download
            downloadPhoto(photoData, 'fe2p-photo-' + Date.now() + '.jpg');
            showShareNotification('Photo downloaded! Attach it to your message.');
        });
}

// Convert image data URL to PNG blob for clipboard
function convertToPng(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to convert to PNG'));
            }, 'image/png');
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// Show a temporary notification for share actions
function showShareNotification(message) {
    // Remove existing notification if any
    const existing = document.getElementById('shareNotification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'shareNotification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Email Photo utility
function emailPhoto(photoData, filename) {
    // Create a data URL blob link for email
    const mailtoLink = `mailto:?subject=${encodeURIComponent('BOOTHX Photo')}&body=${encodeURIComponent('Check out my photo from Flawless Events 2 Perfection PhotoBooth!\n\n')}`;
    
    // Try to create a downloadable link first
    const link = document.createElement('a');
    link.href = photoData;
    link.download = filename;
    
    // For email, we'll open mailto and user can attach the downloaded file
    // Or use a data URI (though many email clients don't support large data URIs)
    window.location.href = mailtoLink;
    
    // Also download the file so user can attach it
    setTimeout(() => {
        link.click();
    }, 100);
}

// Print Photo utility
function printPhoto(photoData) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Print Photo</title>
                <style>
                    @media print {
                        @page {
                            margin: 0;
                            size: auto;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                        }
                    }
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 20px;
                        background: #f0f0f0;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    }
                </style>
            </head>
            <body>
                <img src="${photoData}" alt="PhotoBooth Photo">
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

