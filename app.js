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
    ACTIVE_SESSION: 'photobooth-active-session'
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
function savePhotosToStorage(photos) {
    try {
        const photosJson = JSON.stringify(photos);
        localStorage.setItem(StorageKeys.PHOTOS, photosJson);
        console.log('Photos saved to storage:', photos.length, 'photos');
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

// Text Photo utility
function textPhoto(photoData) {
    // Create a blob from the data URL
    fetch(photoData)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], 'fe2p-photo.jpg', { type: 'image/jpeg' });
            const url = URL.createObjectURL(file);
            
            // Try to use share API first (works on mobile)
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'FE2P PhotoBooth Photo',
                    text: 'Check out my photo from Flawless Events 2 Perfection!'
                }).catch(err => {
                    // Fallback to SMS link
                    const smsLink = `sms:?body=${encodeURIComponent('Check out my photo from FE2P PhotoBooth!')}`;
                    window.location.href = smsLink;
                });
            } else {
                // Fallback: Open SMS with text
                const smsLink = `sms:?body=${encodeURIComponent('Check out my photo from FE2P PhotoBooth! View it here: ' + photoData.substring(0, 100) + '...')}`;
                window.location.href = smsLink;
            }
        })
        .catch(() => {
            // Final fallback
            const smsLink = `sms:?body=${encodeURIComponent('Check out my photo from FE2P PhotoBooth!')}`;
            window.location.href = smsLink;
        });
}

// Email Photo utility
function emailPhoto(photoData, filename) {
    // Create a data URL blob link for email
    const mailtoLink = `mailto:?subject=${encodeURIComponent('FE2P PhotoBooth Photo')}&body=${encodeURIComponent('Check out my photo from Flawless Events 2 Perfection PhotoBooth!\n\n')}`;
    
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

