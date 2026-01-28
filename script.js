// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const singlePhotoBtn = document.getElementById('singlePhotoBtn');
const photoStripBtn = document.getElementById('photoStripBtn');
const photoControls = document.getElementById('photoControls');
const gallery = document.getElementById('gallery');
const clearGalleryBtn = document.getElementById('clearGalleryBtn');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const flashEffect = document.getElementById('flashEffect');
const stripProgress = document.getElementById('stripProgress');
const currentPhotoSpan = document.getElementById('currentPhoto');
const totalPhotosSpan = document.getElementById('totalPhotos');
const stripDesignInput = document.getElementById('stripDesignInput');
const designPreview = document.getElementById('designPreview');
const designPreviewContainer = document.getElementById('designPreviewContainer');
const removeDesignBtn = document.getElementById('removeDesignBtn');
const designPosition = document.getElementById('designPosition');
const designSize = document.getElementById('designSize');
const designSizeValue = document.getElementById('designSizeValue');
const designOpacity = document.getElementById('designOpacity');
const designOpacityValue = document.getElementById('designOpacityValue');
const galleryActions = document.getElementById('galleryActions');
const printAllBtn = document.getElementById('printAllBtn');
const cameraSelect = document.getElementById('cameraSelect');
const cameraSelection = document.getElementById('cameraSelection');
const switchCameraBtn = document.getElementById('switchCameraBtn');

// State
let stream = null;
let photos = [];
let stripDesignImage = null; // Design specifically for photo strips
let designSettings = {
    position: 'center',
    size: 100,
    opacity: 100
};
let availableCameras = [];
let currentCameraId = null;

// Initialize
clearGalleryBtn.addEventListener('click', clearGallery);
printAllBtn.addEventListener('click', printAllPhotos);
cameraSelect.addEventListener('change', handleCameraChange);
switchCameraBtn.addEventListener('click', switchCamera);

// Load available cameras on page load
loadAvailableCameras();

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Optionally show install button
    showInstallPrompt();
});

function showInstallPrompt() {
    // You can add an install button here if desired
    console.log('App can be installed');
}

window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
});

// Load Available Cameras
async function loadAvailableCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        
        // Clear existing options
        cameraSelect.innerHTML = '';
        
        if (availableCameras.length === 0) {
            cameraSelect.innerHTML = '<option value="">No cameras found</option>';
            return;
        }
        
        // Add camera options
        availableCameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });
        
        // Set default to first camera
        if (availableCameras.length > 0) {
            currentCameraId = availableCameras[0].deviceId;
            cameraSelect.value = currentCameraId;
        }
    } catch (error) {
        console.error('Error loading cameras:', error);
        cameraSelect.innerHTML = '<option value="">Error loading cameras</option>';
    }
}

// Handle Camera Change
async function handleCameraChange() {
    const selectedCameraId = cameraSelect.value;
    if (selectedCameraId && stream) {
        currentCameraId = selectedCameraId;
        await startCameraWithDevice(selectedCameraId);
    }
}

// Switch Camera (toggle between front/back)
async function switchCamera() {
    if (availableCameras.length < 2) {
        alert('Only one camera available');
        return;
    }
    
    // Find current camera index
    const currentIndex = availableCameras.findIndex(cam => cam.deviceId === currentCameraId);
    // Switch to next camera (or wrap around)
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    
    currentCameraId = nextCamera.deviceId;
    cameraSelect.value = currentCameraId;
    
    if (stream) {
        await startCameraWithDevice(currentCameraId);
    }
}

// Design Import Handlers
stripDesignInput.addEventListener('change', handleStripDesignImport);
removeDesignBtn.addEventListener('click', removeDesign);
designPosition.addEventListener('change', updateDesignSettings);
designSize.addEventListener('input', updateDesignSettings);
designOpacity.addEventListener('input', updateDesignSettings);

function handleStripDesignImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        stripDesignImage = new Image();
        stripDesignImage.onload = () => {
            designPreview.src = e.target.result;
            designPreviewContainer.style.display = 'block';
            removeDesignBtn.style.display = 'inline-flex';
            updateDesignPreview();
        };
        stripDesignImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeDesign() {
    stripDesignImage = null;
    stripDesignInput.value = '';
    designPreviewContainer.style.display = 'none';
    removeDesignBtn.style.display = 'none';
}

function updateDesignSettings() {
    designSettings.position = designPosition.value;
    designSettings.size = parseInt(designSize.value);
    designSettings.opacity = parseInt(designOpacity.value);
    
    designSizeValue.textContent = designSettings.size + '%';
    designOpacityValue.textContent = designSettings.opacity + '%';
    
    updateDesignPreview();
}

function updateDesignPreview() {
    if (!stripDesignImage) return;
    
    const wrapper = designPreview.parentElement;
    const maxSize = (designSettings.size / 100) * 600;
    designPreview.style.maxWidth = maxSize + 'px';
    designPreview.style.opacity = designSettings.opacity / 100;
}

// Start Camera
startBtn.addEventListener('click', async () => {
    await startCamera();
});

// Start Camera Function
async function startCamera() {
    try {
        // Request permission first to get camera labels
        await navigator.mediaDevices.getUserMedia({ video: true });
        await loadAvailableCameras();
        
        // Use selected camera or default
        const deviceId = currentCameraId || (availableCameras.length > 0 ? availableCameras[0].deviceId : null);
        await startCameraWithDevice(deviceId);
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions and try again.');
    }
}

// Start Camera with Specific Device
async function startCameraWithDevice(deviceId) {
    try {
        // Stop existing stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        const constraints = {
            video: deviceId ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } : {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        startBtn.style.display = 'none';
        photoControls.style.display = 'flex';
        cameraSelection.style.display = availableCameras.length > 1 ? 'flex' : 'none';
        switchCameraBtn.style.display = availableCameras.length > 1 ? 'inline-flex' : 'none';
        
        // Update current camera ID from active stream
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            currentCameraId = videoTrack.getSettings().deviceId;
            if (cameraSelect.value !== currentCameraId) {
                cameraSelect.value = currentCameraId;
            }
        }
        
        // Load saved photos from localStorage
        loadPhotosFromStorage();
    } catch (error) {
        console.error('Error starting camera:', error);
        alert('Unable to start camera. Please try again.');
    }
}

// Stop Camera
stopBtn.addEventListener('click', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
        startBtn.style.display = 'inline-flex';
        photoControls.style.display = 'none';
        cameraSelection.style.display = 'none';
    }
});

// Take Single Photo
singlePhotoBtn.addEventListener('click', () => {
    takePhoto();
});

// Take Photo Strip (3 photos)
photoStripBtn.addEventListener('click', async () => {
    const numPhotos = 3;
    totalPhotosSpan.textContent = numPhotos;
    stripProgress.style.display = 'block';
    
    // Disable buttons during strip capture
    singlePhotoBtn.disabled = true;
    photoStripBtn.disabled = true;
    
    const stripPhotos = [];
    
    for (let i = 1; i <= numPhotos; i++) {
        currentPhotoSpan.textContent = i;
        
        // Wait 2 seconds between photos (except before first)
        if (i > 1) {
            await sleep(2000);
        }
        
        const photo = await takePhotoWithCountdown();
        if (photo) {
            stripPhotos.push(photo);
        }
    }
    
    // Create photo strip
    if (stripPhotos.length === numPhotos) {
        createPhotoStrip(stripPhotos);
    }
    
    // Re-enable buttons
    singlePhotoBtn.disabled = false;
    photoStripBtn.disabled = false;
    stripProgress.style.display = 'none';
});

// Take Photo Function
async function takePhotoWithCountdown() {
    return new Promise((resolve) => {
        let count = 3;
        countdownOverlay.classList.add('active');
        countdownNumber.textContent = count;
        
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.textContent = count;
            } else {
                countdownNumber.textContent = '📸';
                clearInterval(countdownInterval);
                
                setTimeout(() => {
                    const photo = capturePhoto();
                    countdownOverlay.classList.remove('active');
                    resolve(photo);
                }, 300);
            }
        }, 1000);
    });
}

function takePhoto() {
    takePhotoWithCountdown().then(photo => {
        if (photo) {
            addPhotoToGallery(photo);
        }
    });
}

// Capture Photo from Video
function capturePhoto() {
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Get 2D context
    const ctx = canvas.getContext('2d');
    
    // Draw video (flipped horizontally for natural selfie view)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Reset transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Note: Design overlay is only applied to photo strips, not single photos
    
    // Flash effect
    flashEffect.classList.add('active');
    setTimeout(() => {
        flashEffect.classList.remove('active');
    }, 300);
    
    // Convert to data URL
    return canvas.toDataURL('image/jpeg', 0.95);
}


// Add Photo to Gallery
function addPhotoToGallery(photoData) {
    const photoId = Date.now();
    photos.push({ id: photoId, data: photoData });
    
    const photoDiv = document.createElement('div');
    photoDiv.className = 'photo-item';
    photoDiv.dataset.photoId = photoId;
    
    const img = document.createElement('img');
    img.src = photoData;
    img.alt = 'Photo';
    
    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇️ Download';
    downloadBtn.onclick = () => downloadPhoto(photoData, `photobooth-${photoId}.jpg`);
    
    const printBtn = document.createElement('button');
    printBtn.textContent = '🖨️ Print';
    printBtn.className = 'print-btn';
    printBtn.onclick = () => printPhoto(photoData);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Delete';
    deleteBtn.onclick = () => deletePhoto(photoId);
    
    actions.appendChild(downloadBtn);
    actions.appendChild(printBtn);
    actions.appendChild(deleteBtn);
    
    photoDiv.appendChild(img);
    photoDiv.appendChild(actions);
    
    // Remove empty message if exists
    const emptyMsg = gallery.querySelector('.empty-gallery');
    if (emptyMsg) {
        emptyMsg.remove();
    }
    
    gallery.appendChild(photoDiv);
    clearGalleryBtn.style.display = 'inline-flex';
    galleryActions.style.display = 'flex';
    
    // Save to localStorage
    savePhotosToStorage();
}

// Create Photo Strip
function createPhotoStrip(stripPhotos) {
    const photoId = Date.now();
    
    const stripDiv = document.createElement('div');
    stripDiv.className = 'photo-item photo-strip';
    stripDiv.dataset.photoId = photoId;
    
    // Create images for strip
    stripPhotos.forEach((photoData, index) => {
        const img = document.createElement('img');
        img.src = photoData;
        img.alt = `Photo ${index + 1}`;
        stripDiv.appendChild(img);
    });
    
    // Actions overlay
    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇️ Download Strip';
    downloadBtn.onclick = () => {
        // Create a combined strip image
        createCombinedStrip(stripPhotos).then(combinedData => {
            downloadPhoto(combinedData, `photobooth-strip-${photoId}.jpg`);
        });
    };
    
    const printBtn = document.createElement('button');
    printBtn.textContent = '🖨️ Print Strip';
    printBtn.className = 'print-btn';
    printBtn.onclick = () => {
        createCombinedStrip(stripPhotos).then(combinedData => {
            printPhoto(combinedData);
        });
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Delete';
    deleteBtn.onclick = () => deletePhoto(photoId);
    
    actions.appendChild(downloadBtn);
    actions.appendChild(printBtn);
    actions.appendChild(deleteBtn);
    stripDiv.appendChild(actions);
    
    // Remove empty message if exists
    const emptyMsg = gallery.querySelector('.empty-gallery');
    if (emptyMsg) {
        emptyMsg.remove();
    }
    
    gallery.insertBefore(stripDiv, gallery.firstChild);
    clearGalleryBtn.style.display = 'inline-flex';
    galleryActions.style.display = 'flex';
    
    // Save strip photos individually for storage
    stripPhotos.forEach(photoData => {
        photos.push({ id: photoId + Math.random(), data: photoData, isStrip: true, stripId: photoId });
    });
    savePhotosToStorage();
}

// Create Combined Strip Image
function createCombinedStrip(stripPhotos) {
    return new Promise((resolve) => {
        const stripCanvas = document.createElement('canvas');
        const stripCtx = stripCanvas.getContext('2d');
        
        const photoWidth = 400;
        const photoHeight = 533;
        const padding = 20;
        const gap = 10;
        
        // 3 photos instead of 4
        stripCanvas.width = (photoWidth * 3) + (padding * 2) + (gap * 2);
        stripCanvas.height = photoHeight + (padding * 2);
        
        // White background
        stripCtx.fillStyle = 'white';
        stripCtx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);
        
        let loadedCount = 0;
        
        // Draw each photo
        stripPhotos.forEach((photoData, index) => {
            const img = new Image();
            img.onload = () => {
                const x = padding + (index * (photoWidth + gap));
                stripCtx.drawImage(img, x, padding, photoWidth, photoHeight);
                
                loadedCount++;
                // When all photos are drawn, apply strip design overlay if present
                if (loadedCount === stripPhotos.length) {
                    if (stripDesignImage) {
                        applyStripDesignOverlay(stripCtx, stripCanvas.width, stripCanvas.height);
                    }
                    resolve(stripCanvas.toDataURL('image/jpeg', 0.95));
                }
            };
            img.onerror = () => {
                loadedCount++;
                if (loadedCount === stripPhotos.length) {
                    if (stripDesignImage) {
                        applyStripDesignOverlay(stripCtx, stripCanvas.width, stripCanvas.height);
                    }
                    resolve(stripCanvas.toDataURL('image/jpeg', 0.95));
                }
            };
            img.src = photoData;
        });
    });
}

// Apply Strip Design Overlay to Combined Strip Canvas
function applyStripDesignOverlay(ctx, canvasWidth, canvasHeight) {
    if (!stripDesignImage) return;
    
    const settings = designSettings;
    const opacity = settings.opacity / 100;
    
    // Calculate design size - for strip designs, typically full cover or scaled
    let overlayWidth, overlayHeight;
    
    if (settings.position === 'full-cover') {
        // Full cover mode - stretch to fit entire strip
        overlayWidth = canvasWidth;
        overlayHeight = canvasHeight;
    } else {
        // Scale based on size setting, maintaining aspect ratio
        const designAspectRatio = stripDesignImage.width / stripDesignImage.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;
        
        if (designAspectRatio > canvasAspectRatio) {
            // Design is wider - fit to width
            overlayWidth = canvasWidth * (settings.size / 100);
            overlayHeight = overlayWidth / designAspectRatio;
        } else {
            // Design is taller - fit to height
            overlayHeight = canvasHeight * (settings.size / 100);
            overlayWidth = overlayHeight * designAspectRatio;
        }
    }
    
    // Calculate position
    let x, y;
    switch (settings.position) {
        case 'top-left':
            x = 0;
            y = 0;
            break;
        case 'top-center':
            x = (canvasWidth - overlayWidth) / 2;
            y = 0;
            break;
        case 'top-right':
            x = canvasWidth - overlayWidth;
            y = 0;
            break;
        case 'center-left':
            x = 0;
            y = (canvasHeight - overlayHeight) / 2;
            break;
        case 'center':
            x = (canvasWidth - overlayWidth) / 2;
            y = (canvasHeight - overlayHeight) / 2;
            break;
        case 'center-right':
            x = canvasWidth - overlayWidth;
            y = (canvasHeight - overlayHeight) / 2;
            break;
        case 'bottom-left':
            x = 0;
            y = canvasHeight - overlayHeight;
            break;
        case 'bottom-center':
            x = (canvasWidth - overlayWidth) / 2;
            y = canvasHeight - overlayHeight;
            break;
        case 'bottom-right':
            x = canvasWidth - overlayWidth;
            y = canvasHeight - overlayHeight;
            break;
        case 'full-cover':
            x = 0;
            y = 0;
            break;
        default:
            x = (canvasWidth - overlayWidth) / 2;
            y = (canvasHeight - overlayHeight) / 2;
    }
    
    // Save context state
    ctx.save();
    
    // Set opacity
    ctx.globalAlpha = opacity;
    
    // Draw strip design overlay
    ctx.drawImage(stripDesignImage, x, y, overlayWidth, overlayHeight);
    
    // Restore context state
    ctx.restore();
}

// Delete Photo
function deletePhoto(photoId) {
    photos = photos.filter(photo => photo.id !== photoId && photo.stripId !== photoId);
    
    const photoElement = gallery.querySelector(`[data-photo-id="${photoId}"]`);
    if (photoElement) {
        photoElement.remove();
    }
    
    // Check if gallery is empty
    if (gallery.children.length === 0 || 
        (gallery.children.length === 1 && gallery.querySelector('.empty-gallery'))) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'empty-gallery';
        emptyMsg.textContent = 'No photos yet. Take some pictures!';
        gallery.appendChild(emptyMsg);
        clearGalleryBtn.style.display = 'none';
        galleryActions.style.display = 'none';
    }
    
    savePhotosToStorage();
}

// Clear Gallery
function clearGallery() {
    if (confirm('Are you sure you want to clear all photos?')) {
        photos = [];
        gallery.innerHTML = '<p class="empty-gallery">No photos yet. Take some pictures!</p>';
        clearGalleryBtn.style.display = 'none';
        galleryActions.style.display = 'none';
        localStorage.removeItem('photobooth-photos');
    }
}

// Download Photo
function downloadPhoto(photoData, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = photoData;
    link.click();
}

// Print Photo
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

// Print All Photos
function printAllPhotos() {
    const photoItems = gallery.querySelectorAll('.photo-item:not(.photo-strip)');
    if (photoItems.length === 0) {
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
                </style>
            </head>
            <body>
    `;
    
    photoItems.forEach(item => {
        const img = item.querySelector('img');
        if (img) {
            htmlContent += `<img src="${img.src}" alt="PhotoBooth Photo">`;
        }
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

// Save Photos to LocalStorage
function savePhotosToStorage() {
    try {
        localStorage.setItem('photobooth-photos', JSON.stringify(photos));
    } catch (error) {
        console.error('Error saving photos:', error);
    }
}

// Load Photos from LocalStorage
function loadPhotosFromStorage() {
    try {
        const saved = localStorage.getItem('photobooth-photos');
        if (saved) {
            photos = JSON.parse(saved);
            
            if (photos.length > 0) {
                // Rebuild gallery from saved photos
                photos.forEach(photo => {
                    if (!photo.isStrip) {
                        // Recreate single photo
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
                        downloadBtn.onclick = () => downloadPhoto(photo.data, `photobooth-${photo.id}.jpg`);
                        
                        const printBtn = document.createElement('button');
                        printBtn.textContent = '🖨️ Print';
                        printBtn.className = 'print-btn';
                        printBtn.onclick = () => printPhoto(photo.data);
                        
                        const deleteBtn = document.createElement('button');
                        deleteBtn.textContent = '🗑️ Delete';
                        deleteBtn.onclick = () => deletePhoto(photo.id);
                        
                        actions.appendChild(downloadBtn);
                        actions.appendChild(printBtn);
                        actions.appendChild(deleteBtn);
                        
                        photoDiv.appendChild(img);
                        photoDiv.appendChild(actions);
                        gallery.appendChild(photoDiv);
                    }
                });
                
                clearGalleryBtn.style.display = 'inline-flex';
                galleryActions.style.display = 'flex';
            }
        }
    } catch (error) {
        console.error('Error loading photos:', error);
    }
}

// Utility: Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

