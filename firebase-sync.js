// Firebase Sync Module
// Handles syncing sessions, photos, and settings to/from Firebase

// Sync state
let syncInProgress = false;
let realtimeSyncUnsubscribe = null;
let offlineQueueProcessing = false;

// Firestore collection paths
const COLLECTIONS = {
    SESSIONS: 'sessions',
    PHOTOS: 'photos',
    SETTINGS: 'settings'
};

// Get user's collection path
function getUserCollectionPath(collection) {
    const userId = getUserId();
    if (!userId) return null;
    return `users/${userId}/${collection}`;
}

// =============================================
// SESSION SYNC
// =============================================

// Sync sessions to Cloud Firestore
async function syncSessionsToCloud(sessions = null) {
    const db = getFirebaseDb();
    const userId = getUserId();

    if (!db || !userId) {
        console.log('Cannot sync sessions: not authenticated');
        return { success: false, error: 'Not authenticated' };
    }

    if (syncInProgress) {
        console.log('Sync already in progress');
        return { success: false, error: 'Sync in progress' };
    }

    syncInProgress = true;
    updateSyncStatus('syncing');

    try {
        const localSessions = sessions || getSessions();
        const batch = db.batch();
        const sessionsRef = db.collection(`users/${userId}/sessions`);

        for (const session of localSessions) {
            const docRef = sessionsRef.doc(session.id);

            // Prepare session data for Firestore
            const sessionData = {
                id: session.id,
                name: session.name,
                settings: session.settings || {},
                createdAt: session.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Store design as a reference to Storage if it's too large
                hasDesign: !!session.design
            };

            // Upload design to Storage if present
            if (session.design) {
                const designUrl = await uploadDesignToStorage(session.id, session.design);
                if (designUrl) {
                    sessionData.designStorageUrl = designUrl;
                }
            }

            batch.set(docRef, sessionData, { merge: true });
        }

        await batch.commit();

        // Update last sync timestamp
        localStorage.setItem(FirebaseStorageKeys.LAST_SYNC, new Date().toISOString());

        console.log('Sessions synced to cloud:', localSessions.length);
        syncInProgress = false;
        updateSyncStatus('synced');

        return { success: true, count: localSessions.length };
    } catch (error) {
        console.error('Error syncing sessions to cloud:', error);
        syncInProgress = false;
        updateSyncStatus('error');
        return { success: false, error: error.message };
    }
}

// Sync sessions from Cloud Firestore
async function syncSessionsFromCloud() {
    const db = getFirebaseDb();
    const userId = getUserId();

    if (!db || !userId) {
        console.log('Cannot sync sessions: not authenticated');
        return { success: false, error: 'Not authenticated' };
    }

    try {
        updateSyncStatus('syncing');

        const sessionsRef = db.collection(`users/${userId}/sessions`);
        const snapshot = await sessionsRef.get();

        const cloudSessions = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Download design from Storage if available
            let design = null;
            if (data.designStorageUrl) {
                design = await downloadDesignFromStorage(data.designStorageUrl);
            }

            cloudSessions.push({
                id: data.id,
                name: data.name,
                design: design,
                settings: data.settings || {},
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            });
        }

        console.log('Sessions fetched from cloud:', cloudSessions.length);
        updateSyncStatus('synced');

        return { success: true, sessions: cloudSessions };
    } catch (error) {
        console.error('Error syncing sessions from cloud:', error);
        updateSyncStatus('error');
        return { success: false, error: error.message };
    }
}

// =============================================
// PHOTO SYNC
// =============================================

// Upload photo to Firebase Storage
async function syncPhotoToStorage(photo) {
    const storage = getFirebaseStorage();
    const userId = getUserId();

    if (!storage || !userId) {
        // Queue for later if not authenticated
        queuePhotoForSync(photo);
        return { success: false, queued: true, error: 'Not authenticated' };
    }

    try {
        updateSyncStatus('syncing');

        const photoId = photo.id || Date.now();
        const isStrip = photo.isStrip || false;
        const isCollage = photo.isCollage || false;

        // Determine file path
        let filePath;
        if (isStrip) {
            filePath = `users/${userId}/strips/${photoId}.jpg`;
        } else if (isCollage) {
            filePath = `users/${userId}/collages/${photoId}.jpg`;
        } else {
            filePath = `users/${userId}/photos/${photoId}.jpg`;
        }

        // Convert base64 to blob
        const blob = await dataURLtoBlob(photo.data);

        // Upload to Storage
        const storageRef = storage.ref(filePath);
        const uploadTask = await storageRef.put(blob, {
            contentType: 'image/jpeg',
            customMetadata: {
                sessionId: photo.sessionId || '',
                isStrip: String(isStrip),
                isCollage: String(isCollage),
                createdAt: photo.createdAt || new Date().toISOString()
            }
        });

        // Get download URL
        const downloadUrl = await uploadTask.ref.getDownloadURL();

        // Save photo metadata to Firestore
        const db = getFirebaseDb();
        if (db) {
            await db.collection(`users/${userId}/photos`).doc(String(photoId)).set({
                id: photoId,
                storageUrl: downloadUrl,
                storagePath: filePath,
                sessionId: photo.sessionId || null,
                isStrip: isStrip,
                isCollage: isCollage,
                createdAt: photo.createdAt || new Date().toISOString(),
                uploadedAt: new Date().toISOString()
            });
        }

        console.log('Photo uploaded to cloud:', photoId);
        updateSyncStatus('synced');

        return { success: true, url: downloadUrl, photoId };
    } catch (error) {
        console.error('Error uploading photo to cloud:', error);
        // Queue for retry
        queuePhotoForSync(photo);
        updateSyncStatus('error');
        return { success: false, queued: true, error: error.message };
    }
}

// Download photo from Firebase Storage
async function downloadPhotoFromStorage(photoDoc) {
    try {
        const response = await fetch(photoDoc.storageUrl);
        const blob = await response.blob();
        return await blobToDataURL(blob);
    } catch (error) {
        console.error('Error downloading photo:', error);
        return null;
    }
}

// Get all photos from cloud
async function syncPhotosFromCloud() {
    const db = getFirebaseDb();
    const userId = getUserId();

    if (!db || !userId) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        updateSyncStatus('syncing');

        const photosRef = db.collection(`users/${userId}/photos`);
        const snapshot = await photosRef.orderBy('createdAt', 'desc').get();

        const photos = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            photos.push({
                id: data.id,
                storageUrl: data.storageUrl,
                storagePath: data.storagePath,
                sessionId: data.sessionId,
                isStrip: data.isStrip,
                isCollage: data.isCollage,
                createdAt: data.createdAt,
                isCloud: true // Mark as cloud photo
            });
        }

        console.log('Photos fetched from cloud:', photos.length);
        updateSyncStatus('synced');

        return { success: true, photos };
    } catch (error) {
        console.error('Error fetching photos from cloud:', error);
        updateSyncStatus('error');
        return { success: false, error: error.message };
    }
}

// =============================================
// DESIGN UPLOAD/DOWNLOAD
// =============================================

// Upload design image to Storage
async function uploadDesignToStorage(sessionId, designData) {
    const storage = getFirebaseStorage();
    const userId = getUserId();

    if (!storage || !userId || !designData) {
        return null;
    }

    try {
        const filePath = `users/${userId}/designs/${sessionId}_design.png`;
        const blob = await dataURLtoBlob(designData);

        const storageRef = storage.ref(filePath);
        const uploadTask = await storageRef.put(blob, {
            contentType: 'image/png'
        });

        const downloadUrl = await uploadTask.ref.getDownloadURL();
        return downloadUrl;
    } catch (error) {
        console.error('Error uploading design:', error);
        return null;
    }
}

// Download design image from Storage
async function downloadDesignFromStorage(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await blobToDataURL(blob);
    } catch (error) {
        console.error('Error downloading design:', error);
        return null;
    }
}

// =============================================
// MERGE LOGIC
// =============================================

// Merge local and cloud data (for first login)
async function mergeLocalAndCloudData(strategy = 'merge') {
    const userId = getUserId();
    if (!userId) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        updateSyncStatus('syncing');

        // Get local data
        const localSessions = getSessions();
        const localPhotos = getPhotosFromStorage();

        // Get cloud data
        const cloudSessionsResult = await syncSessionsFromCloud();
        const cloudPhotosResult = await syncPhotosFromCloud();

        const cloudSessions = cloudSessionsResult.success ? cloudSessionsResult.sessions : [];
        const cloudPhotos = cloudPhotosResult.success ? cloudPhotosResult.photos : [];

        let mergedSessions = [];
        let mergedPhotos = [];

        if (strategy === 'replace-with-cloud') {
            // Replace local with cloud data
            mergedSessions = cloudSessions;
            // For photos, we need to download them
            // This is handled by the gallery loading cloud photos

        } else if (strategy === 'keep-local') {
            // Keep local, upload to cloud
            mergedSessions = localSessions;
            await syncSessionsToCloud(localSessions);
            // Queue local photos for upload
            for (const photo of localPhotos) {
                if (!photo.uploadedToCloud) {
                    queuePhotoForSync(photo);
                }
            }

        } else {
            // Merge strategy (default)
            // Use updatedAt timestamp for conflict resolution (last-write-wins)
            const sessionMap = new Map();

            // Add cloud sessions first
            for (const session of cloudSessions) {
                sessionMap.set(session.id, session);
            }

            // Merge local sessions (local wins if newer)
            for (const session of localSessions) {
                const existing = sessionMap.get(session.id);
                if (!existing) {
                    sessionMap.set(session.id, session);
                } else {
                    // Compare timestamps
                    const localTime = new Date(session.updatedAt || session.createdAt || 0).getTime();
                    const cloudTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();

                    if (localTime > cloudTime) {
                        sessionMap.set(session.id, session);
                    }
                }
            }

            mergedSessions = Array.from(sessionMap.values());

            // Merge photos - keep all unique photos
            const photoMap = new Map();
            for (const photo of cloudPhotos) {
                photoMap.set(String(photo.id), photo);
            }
            for (const photo of localPhotos) {
                if (!photoMap.has(String(photo.id))) {
                    photoMap.set(String(photo.id), photo);
                    // Queue for upload
                    queuePhotoForSync(photo);
                }
            }
            mergedPhotos = Array.from(photoMap.values());
        }

        // Save merged sessions locally
        saveSessions(mergedSessions);

        // Upload merged sessions to cloud
        await syncSessionsToCloud(mergedSessions);

        // Process photo queue
        processOfflineQueue();

        console.log('Data merge completed:', {
            sessions: mergedSessions.length,
            strategy
        });

        updateSyncStatus('synced');

        return {
            success: true,
            sessions: mergedSessions.length,
            photos: mergedPhotos.length
        };
    } catch (error) {
        console.error('Error merging data:', error);
        updateSyncStatus('error');
        return { success: false, error: error.message };
    }
}

// =============================================
// REALTIME SYNC
// =============================================

// Setup realtime sync listeners
function setupRealtimeSync() {
    const db = getFirebaseDb();
    const userId = getUserId();

    if (!db || !userId) {
        console.log('Cannot setup realtime sync: not authenticated');
        return;
    }

    // Unsubscribe from previous listeners
    if (realtimeSyncUnsubscribe) {
        realtimeSyncUnsubscribe();
    }

    // Listen for session changes
    const sessionsRef = db.collection(`users/${userId}/sessions`);
    realtimeSyncUnsubscribe = sessionsRef.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                console.log('Session changed in cloud:', change.doc.id);
                // Dispatch event for UI to handle
                window.dispatchEvent(new CustomEvent('cloudSessionChanged', {
                    detail: { type: change.type, sessionId: change.doc.id, data: change.doc.data() }
                }));
            } else if (change.type === 'removed') {
                console.log('Session deleted from cloud:', change.doc.id);
                window.dispatchEvent(new CustomEvent('cloudSessionDeleted', {
                    detail: { sessionId: change.doc.id }
                }));
            }
        });
    }, (error) => {
        console.error('Realtime sync error:', error);
        updateSyncStatus('error');
    });

    console.log('Realtime sync setup complete');
}

// Stop realtime sync
function stopRealtimeSync() {
    if (realtimeSyncUnsubscribe) {
        realtimeSyncUnsubscribe();
        realtimeSyncUnsubscribe = null;
        console.log('Realtime sync stopped');
    }
}

// =============================================
// OFFLINE QUEUE
// =============================================

// Get offline queue
function getOfflineQueue() {
    try {
        const queue = localStorage.getItem(FirebaseStorageKeys.SYNC_QUEUE);
        return queue ? JSON.parse(queue) : [];
    } catch (error) {
        console.error('Error getting offline queue:', error);
        return [];
    }
}

// Save offline queue
function saveOfflineQueue(queue) {
    try {
        localStorage.setItem(FirebaseStorageKeys.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
        console.error('Error saving offline queue:', error);
    }
}

// Queue photo for sync
function queuePhotoForSync(photo) {
    const queue = getOfflineQueue();

    // Check if already in queue
    const exists = queue.find(item => item.type === 'photo' && item.data.id === photo.id);
    if (exists) return;

    queue.push({
        type: 'photo',
        data: photo,
        queuedAt: new Date().toISOString()
    });

    saveOfflineQueue(queue);
    console.log('Photo queued for sync:', photo.id);
}

// Queue session for sync
function queueSessionForSync(session) {
    const queue = getOfflineQueue();

    // Check if already in queue (update if exists)
    const index = queue.findIndex(item => item.type === 'session' && item.data.id === session.id);
    if (index !== -1) {
        queue[index] = {
            type: 'session',
            data: session,
            queuedAt: new Date().toISOString()
        };
    } else {
        queue.push({
            type: 'session',
            data: session,
            queuedAt: new Date().toISOString()
        });
    }

    saveOfflineQueue(queue);
    console.log('Session queued for sync:', session.id);
}

// Process offline queue
async function processOfflineQueue() {
    if (!isAuthenticated() || offlineQueueProcessing) {
        return;
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) {
        return;
    }

    offlineQueueProcessing = true;
    updateSyncStatus('syncing');

    console.log('Processing offline queue:', queue.length, 'items');

    const failedItems = [];

    for (const item of queue) {
        try {
            if (item.type === 'photo') {
                const result = await syncPhotoToStorage(item.data);
                if (!result.success && !result.queued) {
                    failedItems.push(item);
                }
            } else if (item.type === 'session') {
                await syncSessionsToCloud([item.data]);
            }
        } catch (error) {
            console.error('Error processing queue item:', error);
            failedItems.push(item);
        }
    }

    // Save failed items back to queue
    saveOfflineQueue(failedItems);

    offlineQueueProcessing = false;

    if (failedItems.length === 0) {
        updateSyncStatus('synced');
        console.log('Offline queue processed successfully');
    } else {
        updateSyncStatus('partial');
        console.log('Offline queue partially processed,', failedItems.length, 'items remaining');
    }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

// Convert data URL to Blob
function dataURLtoBlob(dataURL) {
    return new Promise((resolve, reject) => {
        try {
            const arr = dataURL.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            resolve(new Blob([u8arr], { type: mime }));
        } catch (error) {
            reject(error);
        }
    });
}

// Convert Blob to data URL
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Update sync status indicator
function updateSyncStatus(status) {
    window.dispatchEvent(new CustomEvent('syncStatusChanged', { detail: { status } }));
}

// Get sync status
function getSyncStatus() {
    if (syncInProgress) return 'syncing';
    const queue = getOfflineQueue();
    if (queue.length > 0) return 'pending';
    return 'synced';
}

// Get last sync time
function getLastSyncTime() {
    return localStorage.getItem(FirebaseStorageKeys.LAST_SYNC);
}

// =============================================
// DELETE USER DATA
// =============================================

// Delete all user data from cloud
async function deleteUserData(userId) {
    const db = getFirebaseDb();
    const storage = getFirebaseStorage();

    if (!db || !userId) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        // Delete all sessions
        const sessionsRef = db.collection(`users/${userId}/sessions`);
        const sessionsSnapshot = await sessionsRef.get();
        const batch = db.batch();
        sessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // Delete all photo metadata
        const photosRef = db.collection(`users/${userId}/photos`);
        const photosSnapshot = await photosRef.get();
        photosSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        await batch.commit();

        // Delete Storage files would require listing all files
        // This is typically handled by a Cloud Function

        console.log('User data deleted');
        return { success: true };
    } catch (error) {
        console.error('Error deleting user data:', error);
        return { success: false, error: error.message };
    }
}

// =============================================
// EVENT LISTENERS
// =============================================

// Listen for online/offline events
window.addEventListener('online', () => {
    console.log('App is online');
    if (isAuthenticated()) {
        processOfflineQueue();
    }
});

window.addEventListener('offline', () => {
    console.log('App is offline');
    updateSyncStatus('offline');
});

// Listen for auth events
window.addEventListener('userSignedIn', () => {
    setupRealtimeSync();
    processOfflineQueue();
});

window.addEventListener('userSignedUp', () => {
    // On signup, sync local data to cloud
    syncSessionsToCloud();
    setupRealtimeSync();
});

window.addEventListener('userSignedOut', () => {
    stopRealtimeSync();
    // Clear sync queue
    saveOfflineQueue([]);
});
