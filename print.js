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

// Load Gallery (supports both local and cloud photos)
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

    // Display photos (strips first, then singles)
    const strips = allPhotos.filter(p => p.isStrip);
    const singles = allPhotos.filter(p => !p.isStrip);

    [...strips, ...singles].forEach(photo => {
        if (photo.isStrip && photo.stripPhotos) {
            createStripGalleryItem(photo);
        } else if (photo.isCloud && photo.storageUrl) {
            // Cloud-only photo
            createCloudPhotoGalleryItem(photo);
        } else {
            createPhotoGalleryItem(photo);
        }
    });
}

// Create Cloud Photo Gallery Item (for photos only in cloud)
function createCloudPhotoGalleryItem(photo) {
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
    downloadBtn.onclick = () => downloadCloudPhoto(photo.storageUrl, `fe2p-photobooth-${photo.id}.jpg`);

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
    gallery.appendChild(photoDiv);
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
    const db = typeof getFirebaseDb === 'function' ? getFirebaseDb() : null;
    const userId = typeof getUserId === 'function' ? getUserId() : null;

    if (!db || !userId) {
        return;
    }

    try {
        await db.collection(`users/${userId}/photos`).doc(String(photoId)).delete();
        console.log('Cloud photo deleted:', photoId);
    } catch (error) {
        console.error('Error deleting cloud photo:', error);
    }
}

// Create Photo Gallery Item
function createPhotoGalleryItem(photo) {
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
    downloadBtn.onclick = () => downloadPhoto(photo.data, `fe2p-photobooth-${photo.id}.jpg`);
    
    const textBtn = document.createElement('button');
    textBtn.textContent = '📱 Text';
    textBtn.className = 'text-btn';
    textBtn.onclick = () => textPhoto(photo.data);
    
    const emailBtn = document.createElement('button');
    emailBtn.textContent = '✉️ Email';
    emailBtn.className = 'email-btn';
    emailBtn.onclick = () => emailPhoto(photo.data, `fe2p-photobooth-${photo.id}.jpg`);
    
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
    gallery.appendChild(photoDiv);
}

// Create Strip Gallery Item
function createStripGalleryItem(photo) {
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
    downloadBtn.onclick = () => downloadPhoto(photo.data, `fe2p-photobooth-strip-${photo.id}.jpg`);
    
    const textBtn = document.createElement('button');
    textBtn.textContent = '📱 Text';
    textBtn.className = 'text-btn';
    textBtn.onclick = () => textPhoto(photo.data);
    
    const emailBtn = document.createElement('button');
    emailBtn.textContent = '✉️ Email';
    emailBtn.className = 'email-btn';
    emailBtn.onclick = () => emailPhoto(photo.data, `fe2p-photobooth-strip-${photo.id}.jpg`);
    
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
    
    gallery.insertBefore(stripDiv, gallery.firstChild);
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
    if (typeof isAuthenticated === 'function' && isAuthenticated()) {
        try {
            const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
            if (token) {
                const response = await fetch('/api/delete-photos', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const result = await response.json();
                if (result.success) {
                    console.log('Cloud photos deleted:', result.message);
                } else {
                    console.error('Failed to delete cloud photos:', result.error);
                }
            }
        } catch (error) {
            console.error('Error deleting cloud photos:', error);
        }
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

