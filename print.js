// Print Page JavaScript

// DOM Elements
const gallery = document.getElementById('gallery');
const clearGalleryBtn = document.getElementById('clearGalleryBtn');
const printAllBtn = document.getElementById('printAllBtn');
const galleryActions = document.getElementById('galleryActions');
const galleryStats = document.getElementById('galleryStats');
const photoCount = document.getElementById('photoCount');

// Initialize
if (clearGalleryBtn) clearGalleryBtn.addEventListener('click', clearGallery);
if (printAllBtn) printAllBtn.addEventListener('click', printAllPhotos);

// Load gallery on page load
loadGallery();

// Refresh gallery when sessions sync from cloud (to get session names)
window.addEventListener('sessionsLoaded', () => {
    console.log('Sessions synced, refreshing gallery');
    loadGallery();
});

// Refresh gallery when user signs in
window.addEventListener('userSignedIn', () => {
    console.log('User signed in, refreshing gallery');
    loadGallery();
});

// Load Gallery (supports both local and cloud photos, grouped by session)
async function loadGallery() {
    const localPhotos = getPhotosFromStorage();

    if (!gallery) return;

    gallery.innerHTML = '<p class="empty-gallery">Loading photos...</p>';

    // Get cloud photos if authenticated
    let allPhotos = [...localPhotos];

    if (typeof isAuthenticated === 'function' && isAuthenticated() && typeof syncPhotosFromCloud === 'function') {
        try {
            const cloudResult = await syncPhotosFromCloud();
            if (cloudResult.success && cloudResult.photos) {
                // Merge cloud photos with local photos (avoid duplicates by ID)
                const localIds = new Set(localPhotos.map(p => String(p.id)));
                const cloudOnlyPhotos = cloudResult.photos.filter(p => !localIds.has(String(p.id)));
                allPhotos = [...localPhotos, ...cloudOnlyPhotos];
            }
        } catch (error) {
            console.error('Error loading cloud photos:', error);
        }
    }

    gallery.innerHTML = '';

    if (allPhotos.length === 0) {
        gallery.innerHTML = '<p class="empty-gallery">No photos yet. Take some pictures!</p>';
        if (galleryActions) galleryActions.style.display = 'none';
        if (galleryStats) galleryStats.style.display = 'none';
        return;
    }

    if (galleryStats) {
        galleryStats.style.display = 'block';
        if (photoCount) {
            photoCount.textContent = allPhotos.length;
        }
    }

    if (galleryActions) {
        galleryActions.style.display = 'flex';
    }

    // Get sessions for names
    const sessions = typeof getSessions === 'function' ? getSessions() : [];
    const sessionMap = {};
    sessions.forEach(s => {
        sessionMap[s.id] = s.name;
    });

    // Group photos by session
    const photosBySession = {};
    allPhotos.forEach(photo => {
        const sessionId = photo.sessionId || 'unsorted';
        if (!photosBySession[sessionId]) {
            photosBySession[sessionId] = [];
        }
        photosBySession[sessionId].push(photo);
    });

    // Sort session IDs: put unsorted last, others by most recent photo
    const sessionIds = Object.keys(photosBySession).sort((a, b) => {
        if (a === 'unsorted') return 1;
        if (b === 'unsorted') return -1;
        // Sort by most recent photo in session
        const aLatest = Math.max(...photosBySession[a].map(p => p.id || 0));
        const bLatest = Math.max(...photosBySession[b].map(p => p.id || 0));
        return bLatest - aLatest;
    });

    // Render each session group
    sessionIds.forEach(sessionId => {
        const photos = photosBySession[sessionId];
        const sessionName = sessionId === 'unsorted' ? 'Unsorted Photos' : (sessionMap[sessionId] || `Session ${sessionId}`);

        // Create session group container
        const sessionGroup = document.createElement('div');
        sessionGroup.className = 'session-group';
        sessionGroup.dataset.sessionId = sessionId;

        // Create session header
        const sessionHeader = document.createElement('div');
        sessionHeader.className = 'session-group-header';
        sessionHeader.innerHTML = `
            <div class="session-group-info">
                <span class="session-group-toggle">▼</span>
                <h3 class="session-group-name">${sessionName}</h3>
                <span class="session-group-count">${photos.length} photo${photos.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="session-group-actions">
                <button class="print-session-btn" title="Print all photos in this session">Print Session</button>
            </div>
        `;

        // Toggle collapse on header click
        sessionHeader.querySelector('.session-group-info').addEventListener('click', () => {
            sessionGroup.classList.toggle('collapsed');
            const toggle = sessionHeader.querySelector('.session-group-toggle');
            toggle.textContent = sessionGroup.classList.contains('collapsed') ? '▶' : '▼';
        });

        // Print session button
        sessionHeader.querySelector('.print-session-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            printSessionPhotos(photos);
        });

        sessionGroup.appendChild(sessionHeader);

        // Create photos container
        const photosContainer = document.createElement('div');
        photosContainer.className = 'session-photos-container';

        // Sort photos: strips first, then by date
        const strips = photos.filter(p => p.isStrip);
        const singles = photos.filter(p => !p.isStrip);
        const sortedPhotos = [...strips, ...singles];

        sortedPhotos.forEach(photo => {
            if (photo.isStrip && photo.stripPhotos) {
                createStripGalleryItem(photo, photosContainer);
            } else if (photo.isCloud && photo.storageUrl) {
                createCloudPhotoGalleryItem(photo, photosContainer);
            } else {
                createPhotoGalleryItem(photo, photosContainer);
            }
        });

        sessionGroup.appendChild(photosContainer);
        gallery.appendChild(sessionGroup);
    });
}

// Print all photos in a session
function printSessionPhotos(photos) {
    if (photos.length === 0) {
        alert('No photos to print');
        return;
    }

    const printWindow = window.open('', '_blank');
    let htmlContent = `
        <html>
            <head>
                <title>Print Session Photos</title>
                <style>
                    @media print {
                        @page { margin: 0.5cm; size: auto; }
                    }
                    body {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                        padding: 20px;
                        background: #f0f0f0;
                    }
                    img {
                        width: 100%;
                        height: auto;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                        page-break-inside: avoid;
                    }
                    .strip { grid-column: 1 / -1; }
                </style>
            </head>
            <body>
    `;

    photos.forEach(photo => {
        const src = photo.data || photo.storageUrl || '';
        if (src) {
            htmlContent += `<img src="${src}" alt="Photo" ${photo.isStrip ? 'class="strip"' : ''}>`;
        }
    });

    htmlContent += `
            </body>
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
            </script>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

// Create Cloud Photo Gallery Item (for photos only in cloud)
function createCloudPhotoGalleryItem(photo, container = gallery) {
    const photoDiv = document.createElement('div');
    photoDiv.className = 'photo-item cloud-photo';
    photoDiv.dataset.photoId = photo.id;

    const img = document.createElement('img');
    img.src = photo.storageUrl;
    img.alt = 'Cloud Photo';
    img.loading = 'lazy';

    // Cloud indicator
    const cloudBadge = document.createElement('div');
    cloudBadge.className = 'cloud-badge';
    cloudBadge.innerHTML = '☁️';
    cloudBadge.title = 'Stored in cloud';

    const actions = document.createElement('div');
    actions.className = 'photo-actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇️ Download';
    downloadBtn.onclick = () => downloadCloudPhoto(photo.storageUrl, `boothx-${photo.id}.jpg`);

    const printBtn = document.createElement('button');
    printBtn.textContent = '🖨️ Print';
    printBtn.className = 'print-btn';
    printBtn.onclick = () => printPhoto(photo.storageUrl);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Delete';
    deleteBtn.onclick = async () => {
        if (confirm('Delete this photo from cloud?')) {
            await deleteCloudPhoto(photo.id);
            loadGallery();
        }
    };

    actions.appendChild(downloadBtn);
    actions.appendChild(printBtn);
    actions.appendChild(deleteBtn);

    photoDiv.appendChild(img);
    photoDiv.appendChild(cloudBadge);
    photoDiv.appendChild(actions);
    container.appendChild(photoDiv);
}

// Download cloud photo
async function downloadCloudPhoto(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = filename;
        link.href = objectUrl;
        link.click();

        URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download photo');
    }
}

// Delete cloud photo
async function deleteCloudPhoto(photoId) {
    const token = typeof getAuthToken === 'function' ? getAuthToken() : null;

    if (!token) {
        console.log('Not authenticated, skipping cloud delete');
        return;
    }

    try {
        const response = await fetch(`/api/delete-photos?id=${photoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        if (result.success) {
            console.log('Cloud photo deleted:', photoId);
        } else {
            console.error('Failed to delete cloud photo:', result.error);
        }
    } catch (error) {
        console.error('Error deleting cloud photo:', error);
    }
}

// Create Photo Gallery Item
function createPhotoGalleryItem(photo, container = gallery) {
    const photoDiv = document.createElement('div');
    photoDiv.className = 'photo-item';
    photoDiv.dataset.photoId = photo.id;

    const img = document.createElement('img');
    img.src = photo.data;
    img.alt = 'Photo';
    
    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇️ Download';
    downloadBtn.onclick = () => downloadPhoto(photo.data, `boothx-${photo.id}.jpg`);
    
    const textBtn = document.createElement('button');
    textBtn.textContent = '📱 Text';
    textBtn.className = 'text-btn';
    textBtn.onclick = () => textPhoto(photo.data);
    
    const emailBtn = document.createElement('button');
    emailBtn.textContent = '✉️ Email';
    emailBtn.className = 'email-btn';
    emailBtn.onclick = () => emailPhoto(photo.data, `boothx-${photo.id}.jpg`);
    
    const printBtn = document.createElement('button');
    printBtn.textContent = '🖨️ Print';
    printBtn.className = 'print-btn';
    printBtn.onclick = () => printPhoto(photo.data);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Delete';
    deleteBtn.onclick = () => {
        deletePhoto(photo.id);
        loadGallery();
    };
    
    actions.appendChild(downloadBtn);
    actions.appendChild(textBtn);
    actions.appendChild(emailBtn);
    actions.appendChild(printBtn);
    actions.appendChild(deleteBtn);
    
    photoDiv.appendChild(img);
    photoDiv.appendChild(actions);
    container.appendChild(photoDiv);
}

// Create Strip Gallery Item
function createStripGalleryItem(photo, container = gallery) {
    const stripDiv = document.createElement('div');
    stripDiv.className = 'photo-item photo-strip';
    stripDiv.dataset.photoId = photo.id;
    
    // Create images for strip preview
    if (photo.stripPhotos) {
        photo.stripPhotos.forEach((photoData) => {
            const img = document.createElement('img');
            img.src = photoData;
            img.alt = 'Strip Photo';
            stripDiv.appendChild(img);
        });
    } else {
        // Fallback to single strip image
        const img = document.createElement('img');
        img.src = photo.data;
        img.alt = 'Photo Strip';
        stripDiv.appendChild(img);
    }
    
    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇️ Download Strip';
    downloadBtn.onclick = () => downloadPhoto(photo.data, `boothx-strip-${photo.id}.jpg`);
    
    const textBtn = document.createElement('button');
    textBtn.textContent = '📱 Text';
    textBtn.className = 'text-btn';
    textBtn.onclick = () => textPhoto(photo.data);
    
    const emailBtn = document.createElement('button');
    emailBtn.textContent = '✉️ Email';
    emailBtn.className = 'email-btn';
    emailBtn.onclick = () => emailPhoto(photo.data, `boothx-strip-${photo.id}.jpg`);
    
    const printBtn = document.createElement('button');
    printBtn.textContent = '🖨️ Print Strip';
    printBtn.className = 'print-btn';
    printBtn.onclick = () => printPhoto(photo.data);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Delete';
    deleteBtn.onclick = () => {
        deletePhoto(photo.id);
        loadGallery();
    };
    
    actions.appendChild(downloadBtn);
    actions.appendChild(textBtn);
    actions.appendChild(emailBtn);
    actions.appendChild(printBtn);
    actions.appendChild(deleteBtn);
    stripDiv.appendChild(actions);

    container.appendChild(stripDiv);
}

// Delete Photo
function deletePhoto(photoId) {
    const photos = getPhotosFromStorage();
    const filtered = photos.filter(photo => photo.id !== photoId && photo.stripId !== photoId);
    savePhotosToStorage(filtered);
}

// Clear Gallery (local and cloud)
async function clearGallery() {
    if (!confirm('Are you sure you want to clear all photos? This will delete them from the cloud too.')) {
        return;
    }

    // Clear local storage
    savePhotosToStorage([]);

    // Clear from cloud if authenticated
    console.log('Checking authentication...');
    console.log('isAuthenticated:', typeof isAuthenticated === 'function' ? isAuthenticated() : 'function not found');

    if (typeof isAuthenticated === 'function' && isAuthenticated()) {
        try {
            const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
            console.log('Token found:', token ? 'yes' : 'no');

            if (token) {
                console.log('Making DELETE request to /api/delete-photos...');
                const response = await fetch('/api/delete-photos', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log('Response status:', response.status);
                const result = await response.json();
                console.log('Response body:', result);

                if (result.success) {
                    console.log('Cloud photos deleted:', result.message);
                } else {
                    console.error('Failed to delete cloud photos:', result.error);
                }
            }
        } catch (error) {
            console.error('Error deleting cloud photos:', error);
        }
    } else {
        console.log('Not authenticated, skipping cloud delete');
    }

    loadGallery();
}

// Print All Photos
function printAllPhotos() {
    const photos = getPhotosFromStorage();
    const singlePhotos = photos.filter(p => !p.isStrip);
    
    if (singlePhotos.length === 0) {
        alert('No photos to print');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    let htmlContent = `
        <html>
            <head>
                <title>Print All Photos</title>
                <style>
                    @media print {
                        @page {
                            margin: 0.5cm;
                            size: auto;
                        }
                    }
                    body {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                        padding: 20px;
                        background: #f0f0f0;
                    }
                    img {
                        width: 100%;
                        height: auto;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                        page-break-inside: avoid;
                    }
                    .strip {
                        grid-column: 1 / -1;
                    }
                </style>
            </head>
            <body>
    `;
    
    photos.forEach(photo => {
        htmlContent += `<img src="${photo.data}" alt="PhotoBooth Photo" ${photo.isStrip ? 'class="strip"' : ''}>`;
    });
    
    htmlContent += `
            </body>
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                };
            </script>
        </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

