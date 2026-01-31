// API Client for Neon Database via Netlify Functions
// Replaces Firebase functionality

const API_BASE = '/api';

// Storage key for auth token
const AUTH_TOKEN_KEY = 'photobooth-auth-token';
const AUTH_USER_KEY = 'photobooth-auth-user';

// =============================================
// AUTH FUNCTIONS
// =============================================

// Get stored auth token
function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Get stored user
function getStoredUser() {
    try {
        const user = localStorage.getItem(AUTH_USER_KEY);
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

// Save auth data
function saveAuthData(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

// Clear auth data
function clearAuthData() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

// Sign up
async function signUp(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth?action=signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            saveAuthData(data.token, data.user);
            window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: data.user } }));
            window.dispatchEvent(new CustomEvent('userSignedUp', { detail: { user: data.user } }));
        }

        return data;
    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
    }
}

// Sign in
async function signIn(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            saveAuthData(data.token, data.user);
            window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: data.user } }));
            window.dispatchEvent(new CustomEvent('userSignedIn', { detail: { user: data.user } }));
        }

        return data;
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// Sign out
async function signOut() {
    try {
        const token = getAuthToken();
        if (token) {
            await fetch(`${API_BASE}/auth?action=logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        }

        clearAuthData();
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: null } }));
        window.dispatchEvent(new CustomEvent('userSignedOut'));

        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        clearAuthData();
        return { success: true };
    }
}

// Get current user
function getCurrentUser() {
    return getStoredUser();
}

// Check if authenticated
function isAuthenticated() {
    return !!getAuthToken() && !!getStoredUser();
}

// Get user ID
function getUserId() {
    const user = getStoredUser();
    return user ? user.id : null;
}

// Get user email
function getUserEmail() {
    const user = getStoredUser();
    return user ? user.email : null;
}

// Verify token with server
async function verifyAuth() {
    const token = getAuthToken();
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE}/auth?action=me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
            return data.user;
        } else {
            clearAuthData();
            return null;
        }
    } catch (error) {
        console.error('Auth verify error:', error);
        return getStoredUser(); // Return cached user if offline
    }
}

// =============================================
// SESSIONS SYNC
// =============================================

// Sync sessions to cloud
async function syncSessionsToCloud(sessions) {
    const token = getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
        // Upload each session
        for (const session of sessions) {
            await fetch(`${API_BASE}/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: session.id,
                    name: session.name,
                    designUrl: session.design, // Will need to upload to blob separately
                    settings: session.settings
                })
            });
        }

        return { success: true, count: sessions.length };
    } catch (error) {
        console.error('Sync sessions error:', error);
        return { success: false, error: error.message };
    }
}

// Get sessions from cloud
async function syncSessionsFromCloud() {
    const token = getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
        const response = await fetch(`${API_BASE}/sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            // Convert to local format
            const sessions = data.sessions.map(s => ({
                id: s.id,
                name: s.name,
                design: s.design_url,
                settings: s.settings || {},
                createdAt: s.created_at,
                updatedAt: s.updated_at
            }));

            return { success: true, sessions };
        }

        return data;
    } catch (error) {
        console.error('Get sessions error:', error);
        return { success: false, error: error.message };
    }
}

// Get active session ID from cloud
async function getActiveSessionFromCloud() {
    const token = getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
        const response = await fetch(`${API_BASE}/sessions?action=get-active`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        console.log('Active session from cloud:', data);
        return data;
    } catch (error) {
        console.error('Get active session error:', error);
        return { success: false, error: error.message };
    }
}

// Set active session ID in cloud
async function setActiveSessionInCloud(activeSessionId) {
    const token = getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
        const response = await fetch(`${API_BASE}/sessions?action=set-active`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ activeSessionId })
        });

        const data = await response.json();
        console.log('Set active session result:', data);
        return data;
    } catch (error) {
        console.error('Set active session error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================
// PHOTOS SYNC
// =============================================

// Compress image to reduce size
async function compressImage(dataUrl, maxSizeKB = 500) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Scale down if too large
            const maxDim = 1200;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = (height / width) * maxDim;
                    width = maxDim;
                } else {
                    width = (width / height) * maxDim;
                    height = maxDim;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Try different quality levels
            let quality = 0.8;
            let result = canvas.toDataURL('image/jpeg', quality);

            while (result.length > maxSizeKB * 1024 && quality > 0.3) {
                quality -= 0.1;
                result = canvas.toDataURL('image/jpeg', quality);
            }

            console.log('Compressed image size:', Math.round(result.length / 1024), 'KB');
            resolve(result);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// Upload photo to cloud
async function syncPhotoToStorage(photo) {
    const token = getAuthToken();
    if (!token) {
        queuePhotoForSync(photo);
        return { success: false, queued: true, error: 'Not authenticated' };
    }

    try {
        // Compress image before upload
        console.log('Original photo size:', Math.round(photo.data.length / 1024), 'KB');
        const compressedData = await compressImage(photo.data, 800);

        console.log('Uploading to:', `${API_BASE}/upload`);

        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                photoData: compressedData,
                photoId: photo.id?.toString(),
                sessionId: photo.sessionId,
                isStrip: photo.isStrip,
                isCollage: photo.isCollage
            })
        });

        console.log('Upload response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload failed:', response.status, errorText);
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
        }

        const data = await response.json();
        console.log('Upload response data:', data);

        if (data.success) {
            return { success: true, url: data.photoUrl, photoId: data.photoId };
        }

        return data;
    } catch (error) {
        console.error('Upload photo error:', error);
        queuePhotoForSync(photo);
        return { success: false, queued: true, error: error.message };
    }
}

// Get photos from cloud
async function syncPhotosFromCloud() {
    const token = getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
        const response = await fetch(`${API_BASE}/photos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            const photos = data.photos.map(p => ({
                id: p.id,
                storageUrl: p.photo_url,
                sessionId: p.session_id,
                isStrip: p.is_strip,
                isCollage: p.is_collage,
                createdAt: p.created_at,
                isCloud: true
            }));

            return { success: true, photos };
        }

        return data;
    } catch (error) {
        console.error('Get photos error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================
// OFFLINE QUEUE
// =============================================

const SYNC_QUEUE_KEY = 'photobooth-sync-queue';

function getOfflineQueue() {
    try {
        const queue = localStorage.getItem(SYNC_QUEUE_KEY);
        return queue ? JSON.parse(queue) : [];
    } catch {
        return [];
    }
}

function saveOfflineQueue(queue) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

function queuePhotoForSync(photo) {
    const queue = getOfflineQueue();
    const exists = queue.find(item => item.data?.id === photo.id);
    if (!exists) {
        queue.push({ type: 'photo', data: photo, queuedAt: new Date().toISOString() });
        saveOfflineQueue(queue);
    }
}

async function processOfflineQueue() {
    if (!isAuthenticated()) return;

    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    const failedItems = [];

    for (const item of queue) {
        if (item.type === 'photo') {
            const result = await syncPhotoToStorage(item.data);
            if (!result.success && !result.queued) {
                failedItems.push(item);
            }
        }
    }

    saveOfflineQueue(failedItems);
}

// =============================================
// SYNC STATUS
// =============================================

function updateSyncStatus(status) {
    window.dispatchEvent(new CustomEvent('syncStatusChanged', { detail: { status } }));
}

function getSyncStatus() {
    const queue = getOfflineQueue();
    if (queue.length > 0) return 'pending';
    return 'synced';
}

// =============================================
// INITIALIZATION
// =============================================

// Verify auth on load
document.addEventListener('DOMContentLoaded', async () => {
    const user = await verifyAuth();
    if (user) {
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
    }
});

// Process queue when online
window.addEventListener('online', () => {
    if (isAuthenticated()) {
        processOfflineQueue();
    }
});
