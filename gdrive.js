// Google Drive Integration Module

// State
let tokenClient = null;
let accessToken = null;
let userEmail = null;
let folderCache = {}; // Cache folder IDs to avoid repeated lookups

// Storage keys
const GDRIVE_STORAGE_KEYS = {
    CLIENT_ID: 'photobooth-gdrive-client-id',
    UPLOAD_QUEUE: 'photobooth-upload-queue'
};

// Get stored client ID
function getGDriveClientId() {
    return localStorage.getItem(GDRIVE_STORAGE_KEYS.CLIENT_ID) || '';
}

// Save client ID
function saveGDriveClientId(clientId) {
    localStorage.setItem(GDRIVE_STORAGE_KEYS.CLIENT_ID, clientId);
}

// Check if Google Drive is configured
function isGDriveConfigured() {
    return !!getGDriveClientId();
}

// Check if signed in
function isGDriveSignedIn() {
    return !!accessToken;
}

// Get user email
function getGDriveUserEmail() {
    return userEmail;
}

// Initialize Google Identity Services
function initGoogleDrive(clientId) {
    return new Promise((resolve, reject) => {
        if (!clientId) {
            reject(new Error('Client ID is required'));
            return;
        }

        // Check if GIS is loaded
        if (typeof google === 'undefined' || !google.accounts) {
            reject(new Error('Google Identity Services not loaded'));
            return;
        }

        try {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
                callback: (response) => {
                    if (response.error) {
                        console.error('Token error:', response.error);
                        return;
                    }
                    accessToken = response.access_token;
                    // Fetch user email
                    fetchUserEmail().then(() => {
                        updateDriveStatusUI();
                        // Process any queued uploads
                        processUploadQueue();
                    });
                }
            });
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

// Sign in to Google Drive
function signInGDrive() {
    if (!tokenClient) {
        const clientId = getGDriveClientId();
        if (!clientId) {
            alert('Please enter your Google Client ID first');
            return;
        }
        initGoogleDrive(clientId).then(() => {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        }).catch(err => {
            console.error('Failed to init Google Drive:', err);
            alert('Failed to initialize Google Drive. Check your Client ID.');
        });
    } else {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
}

// Sign out from Google Drive
function signOutGDrive() {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {
            accessToken = null;
            userEmail = null;
            folderCache = {};
            updateDriveStatusUI();
        });
    }
}

// Fetch user email
async function fetchUserEmail() {
    if (!accessToken) return;

    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();
        userEmail = data.email;
    } catch (error) {
        console.error('Failed to fetch user email:', error);
    }
}

// Get or create a folder in Google Drive
async function getOrCreateFolder(folderName, parentId = null) {
    if (!accessToken) return null;

    // Check cache first
    const cacheKey = `${parentId || 'root'}_${folderName}`;
    if (folderCache[cacheKey]) {
        return folderCache[cacheKey];
    }

    try {
        // Search for existing folder
        let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        if (parentId) {
            query += ` and '${parentId}' in parents`;
        } else {
            query += ` and 'root' in parents`;
        }

        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        const searchData = await searchResponse.json();

        if (searchData.files && searchData.files.length > 0) {
            folderCache[cacheKey] = searchData.files[0].id;
            return searchData.files[0].id;
        }

        // Create folder if it doesn't exist
        const metadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };
        if (parentId) {
            metadata.parents = [parentId];
        }

        const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });
        const createData = await createResponse.json();

        folderCache[cacheKey] = createData.id;
        return createData.id;
    } catch (error) {
        console.error('Failed to get/create folder:', error);
        return null;
    }
}

// Upload a photo to Google Drive
async function uploadToGDrive(photoData, fileName, sessionName) {
    if (!accessToken) {
        // Queue for later if not signed in
        queueUpload({ photoData, fileName, sessionName, timestamp: Date.now() });
        return { success: false, queued: true };
    }

    try {
        // Get or create PhotoBooth root folder
        const rootFolderId = await getOrCreateFolder('PhotoBooth');
        if (!rootFolderId) {
            throw new Error('Failed to create root folder');
        }

        // Get or create session folder
        const folderName = sessionName || 'Default Session';
        const sessionFolderId = await getOrCreateFolder(folderName, rootFolderId);
        if (!sessionFolderId) {
            throw new Error('Failed to create session folder');
        }

        // Convert data URL to blob
        const response = await fetch(photoData);
        const blob = await response.blob();

        // Create multipart request
        const metadata = {
            name: fileName,
            parents: [sessionFolderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const uploadResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: form
            }
        );

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const uploadData = await uploadResponse.json();
        console.log('Photo uploaded to Google Drive:', uploadData.name);

        return { success: true, fileId: uploadData.id, link: uploadData.webViewLink };
    } catch (error) {
        console.error('Failed to upload to Google Drive:', error);
        // Queue for retry
        queueUpload({ photoData, fileName, sessionName, timestamp: Date.now() });
        return { success: false, error: error.message, queued: true };
    }
}

// Queue management
function getUploadQueue() {
    try {
        const queue = localStorage.getItem(GDRIVE_STORAGE_KEYS.UPLOAD_QUEUE);
        return queue ? JSON.parse(queue) : [];
    } catch {
        return [];
    }
}

function saveUploadQueue(queue) {
    try {
        // Limit queue size to prevent storage issues (keep last 50)
        const trimmedQueue = queue.slice(-50);
        localStorage.setItem(GDRIVE_STORAGE_KEYS.UPLOAD_QUEUE, JSON.stringify(trimmedQueue));
    } catch (error) {
        console.error('Failed to save upload queue:', error);
    }
}

function queueUpload(item) {
    const queue = getUploadQueue();
    queue.push(item);
    saveUploadQueue(queue);
    console.log('Photo queued for upload:', item.fileName);
}

async function processUploadQueue() {
    if (!accessToken) return;

    const queue = getUploadQueue();
    if (queue.length === 0) return;

    console.log(`Processing ${queue.length} queued uploads...`);

    const failedItems = [];

    for (const item of queue) {
        try {
            const result = await uploadToGDrive(item.photoData, item.fileName, item.sessionName);
            if (!result.success && !result.queued) {
                failedItems.push(item);
            }
        } catch {
            failedItems.push(item);
        }
    }

    // Save only failed items back to queue
    saveUploadQueue(failedItems);

    if (failedItems.length === 0) {
        console.log('All queued uploads completed successfully');
    } else {
        console.log(`${failedItems.length} uploads still pending`);
    }
}

// UI Update function - called from other scripts
function updateDriveStatusUI() {
    const statusEl = document.getElementById('driveStatus');
    const connectBtn = document.getElementById('driveConnectBtn');
    const disconnectBtn = document.getElementById('driveDisconnectBtn');

    if (statusEl) {
        if (isGDriveSignedIn()) {
            statusEl.textContent = `Connected: ${userEmail || 'Unknown'}`;
            statusEl.className = 'drive-status connected';
        } else if (isGDriveConfigured()) {
            statusEl.textContent = 'Not connected';
            statusEl.className = 'drive-status disconnected';
        } else {
            statusEl.textContent = 'Not configured';
            statusEl.className = 'drive-status not-configured';
        }
    }

    if (connectBtn) {
        connectBtn.style.display = isGDriveSignedIn() ? 'none' : 'inline-flex';
    }

    if (disconnectBtn) {
        disconnectBtn.style.display = isGDriveSignedIn() ? 'inline-flex' : 'none';
    }
}

// Show upload status indicator
function showUploadStatus(status, message) {
    let indicator = document.getElementById('uploadIndicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'uploadIndicator';
        indicator.className = 'upload-indicator';
        document.body.appendChild(indicator);
    }

    indicator.className = `upload-indicator ${status}`;

    switch (status) {
        case 'uploading':
            indicator.innerHTML = '<span class="upload-spinner"></span> Uploading...';
            break;
        case 'success':
            indicator.innerHTML = '<span class="upload-icon">&#10003;</span> Uploaded';
            setTimeout(() => hideUploadStatus(), 2000);
            break;
        case 'queued':
            indicator.innerHTML = '<span class="upload-icon">&#8635;</span> Queued';
            setTimeout(() => hideUploadStatus(), 2000);
            break;
        case 'error':
            indicator.innerHTML = `<span class="upload-icon">&#10007;</span> ${message || 'Upload failed'}`;
            setTimeout(() => hideUploadStatus(), 3000);
            break;
    }

    indicator.style.display = 'flex';
}

function hideUploadStatus() {
    const indicator = document.getElementById('uploadIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Auto-initialize if client ID exists
document.addEventListener('DOMContentLoaded', () => {
    const clientId = getGDriveClientId();
    if (clientId) {
        // Wait for GIS to load
        const checkGIS = setInterval(() => {
            if (typeof google !== 'undefined' && google.accounts) {
                clearInterval(checkGIS);
                initGoogleDrive(clientId).then(() => {
                    updateDriveStatusUI();
                }).catch(err => {
                    console.error('Auto-init failed:', err);
                });
            }
        }, 100);

        // Give up after 5 seconds
        setTimeout(() => clearInterval(checkGIS), 5000);
    }
});
