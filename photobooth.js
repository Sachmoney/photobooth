// Photo Booth Page JavaScript

// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const singlePhotoBtn = document.getElementById('singlePhotoBtn');
const photoStripBtn = document.getElementById('photoStripBtn');
const photoControls = document.getElementById('photoControls');
const quickGallery = document.getElementById('quickGallery');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const flashEffect = document.getElementById('flashEffect');
const stripProgress = document.getElementById('stripProgress');
const currentPhotoSpan = document.getElementById('currentPhoto');
const totalPhotosSpan = document.getElementById('totalPhotos');
const cameraSelect = document.getElementById('cameraSelect');
const cameraSelection = document.getElementById('cameraSelection');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const sessionSelect = document.getElementById('sessionSelect');
const videoRecordBtn = document.getElementById('videoRecordBtn');
const collageBtn = document.getElementById('collageBtn');

// Quick Logo DOM Elements
const quickLogoSection = document.getElementById('quickLogoSection');
const quickLogoInput = document.getElementById('quickLogoInput');
const quickLogoPreview = document.getElementById('quickLogoPreview');
const logoPreviewArea = document.getElementById('logoPreviewArea');
const logoPlaceholder = document.getElementById('logoPlaceholder');
const removeQuickLogoBtn = document.getElementById('removeQuickLogoBtn');
const quickLogoPosition = document.getElementById('quickLogoPosition');

// Fullscreen Booth DOM Elements
const launchFullscreenBtn = document.getElementById('launchFullscreenBtn');
const fullscreenBooth = document.getElementById('fullscreenBooth');
const fullscreenVideo = document.getElementById('fullscreenVideo');
const fullscreenCountdown = document.getElementById('fullscreenCountdown');
const fullscreenCountdownNumber = document.getElementById('fullscreenCountdownNumber');
const fullscreenFlash = document.getElementById('fullscreenFlash');
const fullscreenProgress = document.getElementById('fullscreenProgress');
const fullscreenCurrentPhoto = document.getElementById('fullscreenCurrentPhoto');
const fullscreenTotalPhotos = document.getElementById('fullscreenTotalPhotos');
const fullscreenRecording = document.getElementById('fullscreenRecording');
const fullscreenControls = document.getElementById('fullscreenControls');
const fullscreenPhotoBtn = document.getElementById('fullscreenPhotoBtn');
const fullscreenVideoBtn = document.getElementById('fullscreenVideoBtn');
const fullscreenCollageBtn = document.getElementById('fullscreenCollageBtn');
const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
const fullscreenSessionName = document.getElementById('fullscreenSessionName');

// State
let stream = null;
let availableCameras = [];
let currentCameraId = null;
let stripDesignImage = null;
let designSettings = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let isFullscreenMode = false;

// Initialize
if (cameraSelect) cameraSelect.addEventListener('change', handleCameraChange);
if (switchCameraBtn) switchCameraBtn.addEventListener('click', switchCamera);
if (sessionSelect) sessionSelect.addEventListener('change', handleSessionChange);
if (startBtn) startBtn.addEventListener('click', startCamera);
if (stopBtn) stopBtn.addEventListener('click', stopCamera);
if (singlePhotoBtn) singlePhotoBtn.addEventListener('click', takePhoto);
if (photoStripBtn) photoStripBtn.addEventListener('click', takePhotoStrip);
if (collageBtn) collageBtn.addEventListener('click', take4x6Collage);
if (videoRecordBtn) videoRecordBtn.addEventListener('click', toggleVideoRecording);

// Fullscreen booth handlers
if (launchFullscreenBtn) launchFullscreenBtn.addEventListener('click', launchFullscreenBooth);
if (exitFullscreenBtn) exitFullscreenBtn.addEventListener('click', exitFullscreenBooth);
if (fullscreenPhotoBtn) fullscreenPhotoBtn.addEventListener('click', takeFullscreenPhotoStrip);
if (fullscreenCollageBtn) fullscreenCollageBtn.addEventListener('click', takeFullscreen4x6Collage);
if (fullscreenVideoBtn) fullscreenVideoBtn.addEventListener('click', toggleFullscreenVideoRecording);

// Quick logo handlers
if (quickLogoInput) quickLogoInput.addEventListener('change', handleQuickLogoUpload);
if (logoPreviewArea) logoPreviewArea.addEventListener('click', () => quickLogoInput && quickLogoInput.click());
if (removeQuickLogoBtn) removeQuickLogoBtn.addEventListener('click', removeQuickLogo);
if (quickLogoPosition) quickLogoPosition.addEventListener('change', updateQuickLogoPosition);

// Handle paste for logo
document.addEventListener('paste', handleLogoPaste);

// Load sessions and active session design
loadSessionsDropdown();
loadDesignFromStorage();
loadDesignSettingsFromStorage();

// Update photo strip button after settings are loaded
setTimeout(updatePhotoStripButton, 0);

// Load available cameras on page load
loadAvailableCameras();

// Load quick gallery preview
loadQuickGallery();

// Load Available Cameras
async function loadAvailableCameras() {
    if (!cameraSelect) return;
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        
        cameraSelect.innerHTML = '';
        
        if (availableCameras.length === 0) {
            cameraSelect.innerHTML = '<option value="">No cameras found</option>';
            return;
        }
        
        availableCameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });
        
        if (availableCameras.length > 0) {
            currentCameraId = availableCameras[0].deviceId;
            cameraSelect.value = currentCameraId;
        }
    } catch (error) {
        console.error('Error loading cameras:', error);
        if (cameraSelect) cameraSelect.innerHTML = '<option value="">Error loading cameras</option>';
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

// Switch Camera
async function switchCamera() {
    if (availableCameras.length < 2) {
        alert('Only one camera available');
        return;
    }
    
    const currentIndex = availableCameras.findIndex(cam => cam.deviceId === currentCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    
    currentCameraId = nextCamera.deviceId;
    if (cameraSelect) cameraSelect.value = currentCameraId;
    
    if (stream) {
        await startCameraWithDevice(currentCameraId);
    }
}

// Start Camera
async function startCamera() {
    try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        await loadAvailableCameras();
        
        const deviceId = currentCameraId || (availableCameras.length > 0 ? availableCameras[0].deviceId : null);
        await startCameraWithDevice(deviceId);
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions and try again.');
    }
}

// Start Camera with Device
async function startCameraWithDevice(deviceId) {
    try {
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
        
        if (startBtn) startBtn.style.display = 'none';
        if (photoControls) photoControls.style.display = 'flex';
        if (cameraSelection && availableCameras.length > 1) {
            cameraSelection.style.display = 'flex';
        }
        if (switchCameraBtn && availableCameras.length > 1) {
            switchCameraBtn.style.display = 'inline-flex';
        }
        
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && cameraSelect) {
            currentCameraId = videoTrack.getSettings().deviceId;
            cameraSelect.value = currentCameraId;
        }
    } catch (error) {
        console.error('Error starting camera:', error);
        alert('Unable to start camera. Please try again.');
    }
}

// Stop Camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (photoControls) photoControls.style.display = 'none';
        if (cameraSelection) cameraSelection.style.display = 'none';
    }
}

// Take Single Photo
function takePhoto() {
    takePhotoWithCountdown().then(async (photo) => {
        if (photo) {
            // Apply corner logo if available
            const photoWithLogo = await applyCornerLogo(photo);
            savePhoto(photoWithLogo);
            loadQuickGallery();
        }
    });
}

// Apply corner logo to a photo
async function applyCornerLogo(photoData) {
    return new Promise((resolve) => {
        if (!designSettings || !designSettings.photo4x6 || !designSettings.photo4x6.cornerLogo) {
            resolve(photoData);
            return;
        }

        const settings = designSettings.photo4x6;
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width;
            canvas.height = img.height;

            // Draw the photo
            ctx.drawImage(img, 0, 0);

            // Load and draw the logo
            const logoImg = new Image();
            logoImg.onload = () => {
                const logoSize = (settings.size / 100) * Math.min(canvas.width, canvas.height);
                const logoAspect = logoImg.width / logoImg.height;
                let logoWidth, logoHeight;

                if (logoAspect > 1) {
                    logoWidth = logoSize;
                    logoHeight = logoSize / logoAspect;
                } else {
                    logoHeight = logoSize;
                    logoWidth = logoSize * logoAspect;
                }

                const padding = settings.padding || 20;
                let logoX, logoY;

                switch (settings.position) {
                    case 'top-left':
                        logoX = padding;
                        logoY = padding;
                        break;
                    case 'top-right':
                        logoX = canvas.width - logoWidth - padding;
                        logoY = padding;
                        break;
                    case 'bottom-left':
                        logoX = padding;
                        logoY = canvas.height - logoHeight - padding;
                        break;
                    case 'bottom-right':
                    default:
                        logoX = canvas.width - logoWidth - padding;
                        logoY = canvas.height - logoHeight - padding;
                        break;
                }

                ctx.save();
                ctx.globalAlpha = (settings.opacity || 100) / 100;
                ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
                ctx.restore();

                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            logoImg.onerror = () => resolve(photoData);
            logoImg.src = settings.cornerLogo;
        };
        img.onerror = () => resolve(photoData);
        img.src = photoData;
    });
}

// Take Photo Strip
async function takePhotoStrip() {
    // Get photo count from settings
    const numPhotos = designSettings && designSettings.layout ? designSettings.layout.photoCount : 3;
    if (totalPhotosSpan) totalPhotosSpan.textContent = numPhotos;
    if (stripProgress) stripProgress.style.display = 'block';

    if (singlePhotoBtn) singlePhotoBtn.disabled = true;
    if (photoStripBtn) photoStripBtn.disabled = true;

    const stripPhotos = [];

    for (let i = 1; i <= numPhotos; i++) {
        if (currentPhotoSpan) currentPhotoSpan.textContent = i;

        if (i > 1) {
            await sleep(2000);
        }

        const photo = await takePhotoWithCountdown();
        if (photo) {
            stripPhotos.push(photo);
        }
    }

    if (stripPhotos.length === numPhotos) {
        createPhotoStrip(stripPhotos);
    }

    if (singlePhotoBtn) singlePhotoBtn.disabled = false;
    if (photoStripBtn) photoStripBtn.disabled = false;
    if (stripProgress) stripProgress.style.display = 'none';

    loadQuickGallery();
}

// Take Photo with Countdown
async function takePhotoWithCountdown() {
    return new Promise((resolve) => {
        let count = 3;
        if (countdownOverlay) countdownOverlay.classList.add('active');
        if (countdownNumber) countdownNumber.textContent = count;
        
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                if (countdownNumber) countdownNumber.textContent = count;
            } else {
                if (countdownNumber) countdownNumber.textContent = '📸';
                clearInterval(countdownInterval);
                
                setTimeout(() => {
                    const photo = capturePhoto();
                    if (countdownOverlay) countdownOverlay.classList.remove('active');
                    resolve(photo);
                }, 300);
            }
        }, 1000);
    });
}

// Capture Photo
function capturePhoto() {
    if (!video || !canvas) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    if (flashEffect) {
        flashEffect.classList.add('active');
        setTimeout(() => {
            flashEffect.classList.remove('active');
        }, 300);
    }
    
    return canvas.toDataURL('image/jpeg', 0.95);
}

// Save Photo
function savePhoto(photoData) {
    const photos = getPhotosFromStorage();
    const photoId = Date.now();
    const activeSessionId = getActiveSessionId();

    const photoObj = {
        id: photoId,
        data: photoData,
        sessionId: activeSessionId || null,
        createdAt: new Date().toISOString()
    };

    photos.push(photoObj);
    savePhotosToStorage(photos);

    console.log('Photo saved:', photoId, 'Session:', activeSessionId);

    // Auto-upload to Google Drive
    uploadPhotoToGDrive(photoData, photoId, false);

    // Auto-upload to Firebase Cloud Storage if authenticated
    uploadPhotoToFirebase(photoObj);
}

// Upload photo to Firebase Cloud Storage
async function uploadPhotoToFirebase(photo) {
    // Check if Firebase sync is available and user is authenticated
    if (typeof syncPhotoToStorage !== 'function') {
        return;
    }

    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) {
        // Queue for later sync
        if (typeof queuePhotoForSync === 'function') {
            queuePhotoForSync(photo);
        }
        return;
    }

    try {
        const result = await syncPhotoToStorage(photo);
        if (result.success) {
            console.log('Photo uploaded to Firebase:', photo.id);
            // Mark as uploaded
            const photos = getPhotosFromStorage();
            const idx = photos.findIndex(p => p.id === photo.id);
            if (idx !== -1) {
                photos[idx].uploadedToCloud = true;
                photos[idx].cloudUrl = result.url;
                savePhotosToStorage(photos, true); // Skip cloud sync to avoid loop
            }
        } else if (result.queued) {
            console.log('Photo queued for Firebase upload:', photo.id);
        }
    } catch (error) {
        console.error('Firebase upload error:', error);
    }
}

// =============================================
// 4x6 COLLAGE FUNCTIONS
// =============================================

// Take 4x6 Collage (3 photos + logo corner)
async function take4x6Collage() {
    if (stripProgress) stripProgress.style.display = 'block';
    if (totalPhotosSpan) totalPhotosSpan.textContent = '3';

    if (singlePhotoBtn) singlePhotoBtn.disabled = true;
    if (photoStripBtn) photoStripBtn.disabled = true;
    if (collageBtn) collageBtn.disabled = true;

    const collagePhotos = [];

    for (let i = 1; i <= 3; i++) {
        if (currentPhotoSpan) currentPhotoSpan.textContent = i;

        if (i > 1) {
            await sleep(2000);
        }

        const photo = await takePhotoWithCountdown();
        if (photo) {
            collagePhotos.push(photo);
        }
    }

    if (collagePhotos.length === 3) {
        const collage = await create4x6Collage(collagePhotos);
        saveCollagePhoto(collage);
    }

    if (singlePhotoBtn) singlePhotoBtn.disabled = false;
    if (photoStripBtn) photoStripBtn.disabled = false;
    if (collageBtn) collageBtn.disabled = false;
    if (stripProgress) stripProgress.style.display = 'none';

    loadQuickGallery();
}

// Create 4x6 Collage with 3 photos and logo corner
async function create4x6Collage(photos) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 4x6 at 300 DPI = 1200x1800 pixels (portrait) or 1800x1200 (landscape)
        // Using landscape for 2x2 grid
        const canvasWidth = 1800;
        const canvasHeight = 1200;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Get settings
        const settings = designSettings || {};
        const collageSettings = settings.collage || {
            logoCorner: 'bottom-right',
            gap: 10,
            padding: 20
        };
        const photo4x6Settings = settings.photo4x6 || {};

        const padding = collageSettings.padding || 20;
        const gap = collageSettings.gap || 10;
        const logoCorner = collageSettings.logoCorner || 'bottom-right';

        // Draw background
        if (settings.background && settings.background.type === 'gradient') {
            let gradient;
            const dir = settings.background.gradientDirection || 'to bottom';
            switch (dir) {
                case 'to right':
                    gradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
                    break;
                case 'to bottom right':
                    gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
                    break;
                case 'to bottom left':
                    gradient = ctx.createLinearGradient(canvasWidth, 0, 0, canvasHeight);
                    break;
                default:
                    gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
            }
            gradient.addColorStop(0, settings.background.gradientStart || '#ffffff');
            gradient.addColorStop(1, settings.background.gradientEnd || '#f0f0f0');
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = settings.background ? settings.background.color : '#ffffff';
        }
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Calculate cell dimensions
        const cellWidth = (canvasWidth - padding * 2 - gap) / 2;
        const cellHeight = (canvasHeight - padding * 2 - gap) / 2;

        // Determine cell positions based on logo corner
        const positions = [];
        const logoPos = { x: 0, y: 0 };

        switch (logoCorner) {
            case 'top-left':
                logoPos.x = padding;
                logoPos.y = padding;
                positions.push({ x: padding + cellWidth + gap, y: padding }); // top-right
                positions.push({ x: padding, y: padding + cellHeight + gap }); // bottom-left
                positions.push({ x: padding + cellWidth + gap, y: padding + cellHeight + gap }); // bottom-right
                break;
            case 'top-right':
                logoPos.x = padding + cellWidth + gap;
                logoPos.y = padding;
                positions.push({ x: padding, y: padding }); // top-left
                positions.push({ x: padding, y: padding + cellHeight + gap }); // bottom-left
                positions.push({ x: padding + cellWidth + gap, y: padding + cellHeight + gap }); // bottom-right
                break;
            case 'bottom-left':
                logoPos.x = padding;
                logoPos.y = padding + cellHeight + gap;
                positions.push({ x: padding, y: padding }); // top-left
                positions.push({ x: padding + cellWidth + gap, y: padding }); // top-right
                positions.push({ x: padding + cellWidth + gap, y: padding + cellHeight + gap }); // bottom-right
                break;
            case 'bottom-right':
            default:
                logoPos.x = padding + cellWidth + gap;
                logoPos.y = padding + cellHeight + gap;
                positions.push({ x: padding, y: padding }); // top-left
                positions.push({ x: padding + cellWidth + gap, y: padding }); // top-right
                positions.push({ x: padding, y: padding + cellHeight + gap }); // bottom-left
                break;
        }

        // Load and draw photos
        let loadedCount = 0;

        photos.forEach((photoData, index) => {
            const img = new Image();
            img.onload = () => {
                const pos = positions[index];

                // Calculate crop to fill cell
                const imgAspect = img.width / img.height;
                const cellAspect = cellWidth / cellHeight;

                let sx, sy, sw, sh;
                if (imgAspect > cellAspect) {
                    sh = img.height;
                    sw = sh * cellAspect;
                    sx = (img.width - sw) / 2;
                    sy = 0;
                } else {
                    sw = img.width;
                    sh = sw / cellAspect;
                    sx = 0;
                    sy = (img.height - sh) / 2;
                }

                ctx.drawImage(img, sx, sy, sw, sh, pos.x, pos.y, cellWidth, cellHeight);

                loadedCount++;
                if (loadedCount === photos.length) {
                    drawLogo();
                }
            };
            img.onerror = () => {
                loadedCount++;
                if (loadedCount === photos.length) {
                    drawLogo();
                }
            };
            img.src = photoData;
        });

        function drawLogo() {
            // Draw logo in the corner cell
            if (photo4x6Settings.cornerLogo) {
                const logoImg = new Image();
                logoImg.onload = () => {
                    // Fill logo cell with background first
                    ctx.fillStyle = settings.background ? settings.background.color : '#ffffff';
                    ctx.fillRect(logoPos.x, logoPos.y, cellWidth, cellHeight);

                    // Calculate logo size to fit in cell
                    const logoScale = (photo4x6Settings.size || 80) / 100;
                    const maxLogoWidth = cellWidth * logoScale;
                    const maxLogoHeight = cellHeight * logoScale;

                    const logoAspect = logoImg.width / logoImg.height;
                    let logoWidth, logoHeight;

                    if (logoAspect > 1) {
                        logoWidth = Math.min(maxLogoWidth, logoImg.width);
                        logoHeight = logoWidth / logoAspect;
                        if (logoHeight > maxLogoHeight) {
                            logoHeight = maxLogoHeight;
                            logoWidth = logoHeight * logoAspect;
                        }
                    } else {
                        logoHeight = Math.min(maxLogoHeight, logoImg.height);
                        logoWidth = logoHeight * logoAspect;
                        if (logoWidth > maxLogoWidth) {
                            logoWidth = maxLogoWidth;
                            logoHeight = logoWidth / logoAspect;
                        }
                    }

                    // Center logo in cell
                    const logoX = logoPos.x + (cellWidth - logoWidth) / 2;
                    const logoY = logoPos.y + (cellHeight - logoHeight) / 2;

                    ctx.save();
                    ctx.globalAlpha = (photo4x6Settings.opacity || 100) / 100;
                    ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
                    ctx.restore();

                    resolve(canvas.toDataURL('image/jpeg', 0.95));
                };
                logoImg.onerror = () => {
                    resolve(canvas.toDataURL('image/jpeg', 0.95));
                };
                logoImg.src = photo4x6Settings.cornerLogo;
            } else {
                // No logo - just leave the corner cell with background
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            }
        }
    });
}

// Save Collage Photo
function saveCollagePhoto(photoData) {
    const photos = getPhotosFromStorage();
    const photoId = Date.now();
    const activeSessionId = getActiveSessionId();

    const photoObj = {
        id: photoId,
        data: photoData,
        isCollage: true,
        sessionId: activeSessionId || null,
        createdAt: new Date().toISOString()
    };

    photos.push(photoObj);
    savePhotosToStorage(photos);

    console.log('Collage saved:', photoId, 'Session:', activeSessionId);

    // Auto-upload to Google Drive
    uploadPhotoToGDrive(photoData, photoId, false);

    // Auto-upload to Firebase Cloud Storage if authenticated
    uploadPhotoToFirebase(photoObj);
}

// Upload photo to Google Drive
async function uploadPhotoToGDrive(photoData, photoId, isStrip) {
    // Check if gdrive module is available
    if (typeof uploadToGDrive !== 'function') {
        console.log('Google Drive module not loaded');
        return;
    }

    // Check if configured
    if (!isGDriveConfigured()) {
        console.log('Google Drive not configured');
        return;
    }

    // Get session name for folder
    const activeSession = getActiveSession();
    const sessionName = activeSession ? activeSession.name : 'Default Session';

    // Generate filename
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
    const prefix = isStrip ? 'strip' : 'photo';
    const fileName = `${prefix}-${dateStr}-${timeStr}.jpg`;

    // Show uploading status
    showUploadStatus('uploading');

    try {
        const result = await uploadToGDrive(photoData, fileName, sessionName);

        if (result.success) {
            showUploadStatus('success');
            console.log('Photo uploaded to Google Drive');
        } else if (result.queued) {
            showUploadStatus('queued');
            console.log('Photo queued for upload');
        } else {
            showUploadStatus('error', result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus('error', 'Upload failed');
    }
}

// Create Photo Strip
async function createPhotoStrip(stripPhotos) {
    const combinedStrip = await createCombinedStrip(stripPhotos);
    const photoId = Date.now();
    const activeSessionId = getActiveSessionId();

    const photoObj = {
        id: photoId,
        data: combinedStrip,
        isStrip: true,
        stripPhotos: stripPhotos,
        sessionId: activeSessionId || null,
        createdAt: new Date().toISOString()
    };

    const photos = getPhotosFromStorage();
    photos.push(photoObj);
    savePhotosToStorage(photos);

    console.log('Photo strip saved:', photoId, 'Session:', activeSessionId);

    // Auto-download strip to computer
    autoDownloadPhoto(combinedStrip, `photostrip-${photoId}.jpg`);

    // Auto-upload strip to Google Drive
    uploadPhotoToGDrive(combinedStrip, photoId, true);

    // Auto-upload to Firebase Cloud Storage if authenticated
    uploadPhotoToFirebase(photoObj);
}

// Create Combined Strip Image
function createCombinedStrip(stripPhotos) {
    return new Promise((resolve) => {
        const stripCanvas = document.createElement('canvas');
        const stripCtx = stripCanvas.getContext('2d');

        // Get settings with defaults
        const settings = designSettings || {
            layout: { orientation: 'horizontal', photoCount: 3, spacing: 10 },
            background: { type: 'solid', color: '#ffffff' },
            text: { enabled: false },
            border: { enabled: false }
        };

        const photoWidth = 400;
        const photoHeight = 533;
        const padding = 20;
        const spacing = settings.layout ? settings.layout.spacing : 10;
        const photoCount = stripPhotos.length;
        const isVertical = settings.layout && settings.layout.orientation === 'vertical';

        // Calculate text area
        let textAreaHeight = 0;
        if (settings.text && settings.text.enabled && (settings.text.content || settings.text.showDate)) {
            textAreaHeight = (settings.text.fontSize || 24) + 30;
        }

        // Calculate canvas dimensions based on orientation
        let canvasWidth, canvasHeight;
        if (isVertical) {
            canvasWidth = photoWidth + (padding * 2);
            canvasHeight = (photoHeight * photoCount) + (padding * 2) + (spacing * (photoCount - 1)) + textAreaHeight;
        } else {
            canvasWidth = (photoWidth * photoCount) + (padding * 2) + (spacing * (photoCount - 1));
            canvasHeight = photoHeight + (padding * 2) + textAreaHeight;
        }

        stripCanvas.width = canvasWidth;
        stripCanvas.height = canvasHeight;

        // Draw background
        if (settings.background && settings.background.type === 'gradient') {
            let gradient;
            const dir = settings.background.gradientDirection || 'to bottom';
            switch (dir) {
                case 'to right':
                    gradient = stripCtx.createLinearGradient(0, 0, canvasWidth, 0);
                    break;
                case 'to bottom right':
                    gradient = stripCtx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
                    break;
                case 'to bottom left':
                    gradient = stripCtx.createLinearGradient(canvasWidth, 0, 0, canvasHeight);
                    break;
                default:
                    gradient = stripCtx.createLinearGradient(0, 0, 0, canvasHeight);
            }
            gradient.addColorStop(0, settings.background.gradientStart || '#ffffff');
            gradient.addColorStop(1, settings.background.gradientEnd || '#f0f0f0');
            stripCtx.fillStyle = gradient;
        } else {
            stripCtx.fillStyle = settings.background ? settings.background.color : '#ffffff';
        }

        // Draw background with rounded corners if needed
        const borderRadius = settings.border && settings.border.enabled ? (settings.border.radius || 0) : 0;
        if (borderRadius > 0) {
            roundRectPath(stripCtx, 0, 0, canvasWidth, canvasHeight, borderRadius);
            stripCtx.fill();
        } else {
            stripCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // Calculate text position offset
        let textYOffset = settings.text && settings.text.position === 'top' && textAreaHeight > 0 ? textAreaHeight : 0;

        let loadedCount = 0;

        stripPhotos.forEach((photoData, index) => {
            const img = new Image();
            img.onload = () => {
                let x, y;
                if (isVertical) {
                    x = padding;
                    y = padding + textYOffset + (index * (photoHeight + spacing));
                } else {
                    x = padding + (index * (photoWidth + spacing));
                    y = padding + textYOffset;
                }
                stripCtx.drawImage(img, x, y, photoWidth, photoHeight);

                loadedCount++;
                if (loadedCount === stripPhotos.length) {
                    finishStrip();
                }
            };
            img.onerror = () => {
                loadedCount++;
                if (loadedCount === stripPhotos.length) {
                    finishStrip();
                }
            };
            img.src = photoData;
        });

        function finishStrip() {
            // Draw text overlay
            if (settings.text && settings.text.enabled && (settings.text.content || settings.text.showDate)) {
                stripCtx.fillStyle = settings.text.color || '#000000';
                stripCtx.font = `${settings.text.fontSize || 24}px ${settings.text.fontFamily || 'Arial'}`;
                stripCtx.textAlign = 'center';
                stripCtx.textBaseline = 'middle';

                let textContent = settings.text.content || '';
                if (settings.text.showDate) {
                    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    textContent = textContent ? `${textContent} • ${dateStr}` : dateStr;
                }

                let textY;
                if (settings.text.position === 'top') {
                    textY = padding + textAreaHeight / 2;
                } else {
                    textY = canvasHeight - padding - textAreaHeight / 2 + 15;
                }

                stripCtx.fillText(textContent, canvasWidth / 2, textY);
            }

            // Draw design overlay
            if (stripDesignImage) {
                applyStripDesignOverlay(stripCtx, canvasWidth, canvasHeight);
            }

            // Draw border
            if (settings.border && settings.border.enabled && settings.border.width > 0) {
                stripCtx.strokeStyle = settings.border.color || '#000000';
                stripCtx.lineWidth = settings.border.width;

                if (settings.border.style === 'dashed') {
                    stripCtx.setLineDash([10, 5]);
                } else if (settings.border.style === 'double') {
                    stripCtx.setLineDash([]);
                    const offset = settings.border.width / 2;
                    if (borderRadius > 0) {
                        roundRectPath(stripCtx, offset, offset, canvasWidth - settings.border.width, canvasHeight - settings.border.width, borderRadius);
                        stripCtx.stroke();
                    } else {
                        stripCtx.strokeRect(offset, offset, canvasWidth - settings.border.width, canvasHeight - settings.border.width);
                    }
                    const innerOffset = settings.border.width * 1.5;
                    const innerRadius = Math.max(0, borderRadius - settings.border.width);
                    if (borderRadius > 0) {
                        roundRectPath(stripCtx, innerOffset, innerOffset, canvasWidth - innerOffset * 2, canvasHeight - innerOffset * 2, innerRadius);
                        stripCtx.stroke();
                    } else {
                        stripCtx.strokeRect(innerOffset, innerOffset, canvasWidth - innerOffset * 2, canvasHeight - innerOffset * 2);
                    }
                } else {
                    stripCtx.setLineDash([]);
                    const offset = settings.border.width / 2;
                    if (borderRadius > 0) {
                        roundRectPath(stripCtx, offset, offset, canvasWidth - settings.border.width, canvasHeight - settings.border.width, borderRadius);
                        stripCtx.stroke();
                    } else {
                        stripCtx.strokeRect(offset, offset, canvasWidth - settings.border.width, canvasHeight - settings.border.width);
                    }
                }
            }

            resolve(stripCanvas.toDataURL('image/jpeg', 0.95));
        }
    });
}

// Helper function to draw rounded rectangle path
function roundRectPath(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Apply Strip Design Overlay
function applyStripDesignOverlay(ctx, canvasWidth, canvasHeight) {
    if (!stripDesignImage || !designSettings) return;
    
    const settings = designSettings;
    const opacity = settings.opacity / 100;
    
    let overlayWidth, overlayHeight;
    
    if (settings.position === 'full-cover') {
        overlayWidth = canvasWidth;
        overlayHeight = canvasHeight;
    } else {
        const designAspectRatio = stripDesignImage.width / stripDesignImage.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;
        
        if (designAspectRatio > canvasAspectRatio) {
            overlayWidth = canvasWidth * (settings.size / 100);
            overlayHeight = overlayWidth / designAspectRatio;
        } else {
            overlayHeight = canvasHeight * (settings.size / 100);
            overlayWidth = overlayHeight * designAspectRatio;
        }
    }
    
    let x, y;
    switch (settings.position) {
        case 'top-left': x = 0; y = 0; break;
        case 'top-center': x = (canvasWidth - overlayWidth) / 2; y = 0; break;
        case 'top-right': x = canvasWidth - overlayWidth; y = 0; break;
        case 'center-left': x = 0; y = (canvasHeight - overlayHeight) / 2; break;
        case 'center': x = (canvasWidth - overlayWidth) / 2; y = (canvasHeight - overlayHeight) / 2; break;
        case 'center-right': x = canvasWidth - overlayWidth; y = (canvasHeight - overlayHeight) / 2; break;
        case 'bottom-left': x = 0; y = canvasHeight - overlayHeight; break;
        case 'bottom-center': x = (canvasWidth - overlayWidth) / 2; y = canvasHeight - overlayHeight; break;
        case 'bottom-right': x = canvasWidth - overlayWidth; y = canvasHeight - overlayHeight; break;
        case 'full-cover': x = 0; y = 0; break;
        default: x = (canvasWidth - overlayWidth) / 2; y = (canvasHeight - overlayHeight) / 2;
    }
    
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(stripDesignImage, x, y, overlayWidth, overlayHeight);
    ctx.restore();
}

// Load Sessions Dropdown
function loadSessionsDropdown() {
    if (!sessionSelect) return;
    
    const sessions = getSessions();
    const activeSessionId = getActiveSessionId();
    
    sessionSelect.innerHTML = '';
    
    if (sessions.length === 0) {
        sessionSelect.innerHTML = '<option value="">No sessions available</option>';
        return;
    }
    
    sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        option.textContent = session.name;
        if (session.id === activeSessionId) {
            option.selected = true;
        }
        sessionSelect.appendChild(option);
    });
    
    // Reload design when dropdown changes
    loadDesignFromStorage();
    loadDesignSettingsFromStorage();
}

// Handle Session Change
function handleSessionChange() {
    if (!sessionSelect) return;

    const selectedSessionId = sessionSelect.value;
    if (selectedSessionId) {
        setActiveSessionId(selectedSessionId);
        loadDesignFromStorage();
        loadDesignSettingsFromStorage();
        updatePhotoStripButton();
    }
}

// Update photo strip button text with current photo count
function updatePhotoStripButton() {
    if (photoStripBtn && designSettings && designSettings.layout) {
        const count = designSettings.layout.photoCount || 3;
        photoStripBtn.innerHTML = `<span class="btn-icon">📸</span> Photo Strip (${count})`;
    }
}

// Load Design from Storage
function loadDesignFromStorage() {
    const activeSession = getActiveSession();
    const designData = activeSession ? activeSession.design : null;
    
    if (designData) {
        stripDesignImage = new Image();
        stripDesignImage.src = designData;
    } else {
        stripDesignImage = null;
    }
}

// Load Design Settings from Storage
function loadDesignSettingsFromStorage() {
    const activeSession = getActiveSession();
    const defaultSettings = {
        position: 'center',
        size: 100,
        opacity: 100,
        layout: { orientation: 'horizontal', photoCount: 3, spacing: 10 },
        background: { type: 'solid', color: '#ffffff', gradientStart: '#ffffff', gradientEnd: '#f0f0f0', gradientDirection: 'to bottom' },
        text: { enabled: false, content: '', position: 'bottom', fontSize: 24, fontFamily: 'Arial', color: '#000000', showDate: false },
        border: { enabled: false, width: 2, color: '#000000', style: 'solid', radius: 0 },
        collage: { logoCorner: 'bottom-right', gap: 10, padding: 20 },
        photo4x6: { cornerLogo: null, position: 'bottom-right', size: 80, opacity: 100, padding: 20 }
    };

    if (activeSession && activeSession.settings) {
        designSettings = { ...defaultSettings, ...activeSession.settings };
        // Ensure nested objects exist
        designSettings.layout = { ...defaultSettings.layout, ...(activeSession.settings.layout || {}) };
        designSettings.background = { ...defaultSettings.background, ...(activeSession.settings.background || {}) };
        designSettings.text = { ...defaultSettings.text, ...(activeSession.settings.text || {}) };
        designSettings.border = { ...defaultSettings.border, ...(activeSession.settings.border || {}) };
        designSettings.collage = { ...defaultSettings.collage, ...(activeSession.settings.collage || {}) };
        designSettings.photo4x6 = { ...defaultSettings.photo4x6, ...(activeSession.settings.photo4x6 || {}) };
    } else {
        designSettings = defaultSettings;
    }
}

// Load Quick Gallery Preview
function loadQuickGallery() {
    if (!quickGallery) return;
    
    const photos = getPhotosFromStorage();
    quickGallery.innerHTML = '';
    
    if (photos.length === 0) {
        quickGallery.innerHTML = '<p class="empty-gallery">No photos yet. Take some pictures!</p>';
        return;
    }
    
    // Show last 3 photos
    const recentPhotos = photos.slice(-3).reverse();
    recentPhotos.forEach(photo => {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'photo-item';
        const img = document.createElement('img');
        img.src = photo.data;
        img.alt = 'Photo';
        photoDiv.appendChild(img);
        quickGallery.appendChild(photoDiv);
    });
}

// Video Recording
async function toggleVideoRecording() {
    if (!stream) {
        alert('Please start the camera first');
        return;
    }
    
    if (isRecording) {
        stopVideoRecording();
    } else {
        startVideoRecording();
    }
}

function startVideoRecording() {
    if (!stream) return;
    
    recordedChunks = [];
    const options = { mimeType: 'video/webm;codecs=vp9' };
    
    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
        try {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        } catch (e2) {
            mediaRecorder = new MediaRecorder(stream);
        }
    }
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        saveVideo(url);
    };
    
    mediaRecorder.start();
    isRecording = true;
    
    if (videoRecordBtn) {
        videoRecordBtn.textContent = '⏹ Stop Recording';
        videoRecordBtn.classList.add('recording');
    }
    
    if (singlePhotoBtn) singlePhotoBtn.disabled = true;
    if (photoStripBtn) photoStripBtn.disabled = true;
    
    // Auto-stop after 1 minute (60 seconds)
    setTimeout(() => {
        if (isRecording) {
            stopVideoRecording();
        }
    }, 60000);
}

function stopVideoRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        if (videoRecordBtn) {
            videoRecordBtn.textContent = '🎬 Record Video (1 min)';
            videoRecordBtn.classList.remove('recording');
        }
        
        if (singlePhotoBtn) singlePhotoBtn.disabled = false;
        if (photoStripBtn) photoStripBtn.disabled = false;
    }
}

function saveVideo(videoUrl) {
    const videoId = Date.now();
    const videos = getVideosFromStorage();
    
    videos.push({
        id: videoId,
        url: videoUrl,
        createdAt: new Date().toISOString()
    });
    
    saveVideosToStorage(videos);
    alert('Video recorded and saved!');
    
    // Navigate to print page to view videos
    window.location.href = 'print.html';
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// Google Drive UI handlers for photobooth page
document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('driveConnectBtn');
    const disconnectBtn = document.getElementById('driveDisconnectBtn');

    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            if (typeof signInGDrive === 'function') {
                signInGDrive();
            }
        });
    }

    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            if (typeof signOutGDrive === 'function') {
                signOutGDrive();
            }
        });
    }
});

// =============================================
// FULLSCREEN BOOTH MODE
// =============================================

// Launch fullscreen booth
function launchFullscreenBooth() {
    if (!stream) {
        alert('Please start the camera first');
        return;
    }

    const activeSession = getActiveSession();
    if (!activeSession) {
        alert('Please select a session first');
        return;
    }

    isFullscreenMode = true;

    // Connect stream to fullscreen video
    if (fullscreenVideo) {
        fullscreenVideo.srcObject = stream;
    }

    // Update session name display
    if (fullscreenSessionName) {
        fullscreenSessionName.textContent = activeSession.name;
    }

    // Show fullscreen booth
    if (fullscreenBooth) {
        fullscreenBooth.classList.add('active');
    }

    // Request fullscreen
    const elem = fullscreenBooth || document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
            console.log('Fullscreen request failed:', err);
        });
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }

    // Listen for fullscreen exit
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
}

// Handle fullscreen change events
function handleFullscreenChange() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        // Exited fullscreen
        if (isFullscreenMode) {
            exitFullscreenBooth();
        }
    }
}

// Exit fullscreen booth
function exitFullscreenBooth() {
    isFullscreenMode = false;

    // Hide fullscreen booth
    if (fullscreenBooth) {
        fullscreenBooth.classList.remove('active');
    }

    // Stop any recording in progress
    if (isRecording) {
        stopFullscreenVideoRecording();
    }

    // Exit browser fullscreen if still active
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    // Reset UI states
    if (fullscreenProgress) fullscreenProgress.classList.remove('active');
    if (fullscreenRecording) fullscreenRecording.classList.remove('active');
    if (fullscreenControls) fullscreenControls.classList.remove('hidden');
    if (fullscreenPhotoBtn) fullscreenPhotoBtn.disabled = false;
    if (fullscreenVideoBtn) fullscreenVideoBtn.disabled = false;

    // Refresh gallery
    loadQuickGallery();
}

// Take 4x6 collage in fullscreen mode
async function takeFullscreen4x6Collage() {
    if (!stream || !isFullscreenMode) return;

    // Update UI
    if (fullscreenTotalPhotos) fullscreenTotalPhotos.textContent = '3';
    if (fullscreenProgress) fullscreenProgress.classList.add('active');
    if (fullscreenControls) fullscreenControls.classList.add('hidden');

    const collagePhotos = [];

    for (let i = 1; i <= 3; i++) {
        if (fullscreenCurrentPhoto) fullscreenCurrentPhoto.textContent = i;

        if (i > 1) {
            await sleep(2000);
        }

        const photo = await takeFullscreenPhotoWithCountdown();
        if (photo) {
            collagePhotos.push(photo);
        }
    }

    // Hide progress
    if (fullscreenProgress) fullscreenProgress.classList.remove('active');

    if (collagePhotos.length === 3) {
        const collage = await create4x6Collage(collagePhotos);
        saveCollagePhoto(collage);
    }

    // Show controls again
    if (fullscreenControls) fullscreenControls.classList.remove('hidden');
}

// Take photo strip in fullscreen mode
async function takeFullscreenPhotoStrip() {
    if (!stream || !isFullscreenMode) return;

    const numPhotos = designSettings && designSettings.layout ? designSettings.layout.photoCount : 3;

    // Update UI
    if (fullscreenTotalPhotos) fullscreenTotalPhotos.textContent = numPhotos;
    if (fullscreenProgress) fullscreenProgress.classList.add('active');
    if (fullscreenControls) fullscreenControls.classList.add('hidden');

    const stripPhotos = [];

    for (let i = 1; i <= numPhotos; i++) {
        if (fullscreenCurrentPhoto) fullscreenCurrentPhoto.textContent = i;

        if (i > 1) {
            await sleep(2000);
        }

        const photo = await takeFullscreenPhotoWithCountdown();
        if (photo) {
            stripPhotos.push(photo);
        }
    }

    // Hide progress
    if (fullscreenProgress) fullscreenProgress.classList.remove('active');

    if (stripPhotos.length === numPhotos) {
        // Create the strip
        const combinedStrip = await createCombinedStrip(stripPhotos);
        const photoId = Date.now();
        const activeSessionId = getActiveSessionId();

        const photos = getPhotosFromStorage();
        photos.push({
            id: photoId,
            data: combinedStrip,
            isStrip: true,
            stripPhotos: stripPhotos,
            sessionId: activeSessionId || null,
            createdAt: new Date().toISOString()
        });
        savePhotosToStorage(photos);

        // Auto-upload to Google Drive
        uploadPhotoToGDrive(combinedStrip, photoId, true);
    }

    // Show controls again
    if (fullscreenControls) fullscreenControls.classList.remove('hidden');
}

// Take single photo with countdown in fullscreen mode
async function takeFullscreenPhotoWithCountdown() {
    return new Promise((resolve) => {
        let count = 3;
        if (fullscreenCountdown) fullscreenCountdown.classList.add('active');
        if (fullscreenCountdownNumber) fullscreenCountdownNumber.textContent = count;

        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                if (fullscreenCountdownNumber) fullscreenCountdownNumber.textContent = count;
            } else {
                if (fullscreenCountdownNumber) fullscreenCountdownNumber.textContent = '📸';
                clearInterval(countdownInterval);

                setTimeout(() => {
                    const photo = captureFullscreenPhoto();
                    if (fullscreenCountdown) fullscreenCountdown.classList.remove('active');
                    resolve(photo);
                }, 300);
            }
        }, 1000);
    });
}

// Capture photo from fullscreen video
function captureFullscreenPhoto() {
    if (!fullscreenVideo || !canvas) return null;

    canvas.width = fullscreenVideo.videoWidth;
    canvas.height = fullscreenVideo.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(fullscreenVideo, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Flash effect
    if (fullscreenFlash) {
        fullscreenFlash.classList.add('active');
        setTimeout(() => {
            fullscreenFlash.classList.remove('active');
        }, 300);
    }

    return canvas.toDataURL('image/jpeg', 0.95);
}

// Toggle video recording in fullscreen mode
async function toggleFullscreenVideoRecording() {
    if (!stream || !isFullscreenMode) return;

    if (isRecording) {
        stopFullscreenVideoRecording();
    } else {
        startFullscreenVideoRecording();
    }
}

// Start video recording in fullscreen
function startFullscreenVideoRecording() {
    if (!stream) return;

    recordedChunks = [];
    const options = { mimeType: 'video/webm;codecs=vp9' };

    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
        try {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        } catch (e2) {
            mediaRecorder = new MediaRecorder(stream);
        }
    }

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        saveFullscreenVideo(url);
    };

    mediaRecorder.start();
    isRecording = true;

    // Update UI
    if (fullscreenRecording) fullscreenRecording.classList.add('active');
    if (fullscreenControls) fullscreenControls.classList.add('hidden');
    if (fullscreenPhotoBtn) fullscreenPhotoBtn.disabled = true;

    // Change video button to stop
    if (fullscreenVideoBtn) {
        fullscreenVideoBtn.innerHTML = '<span class="fullscreen-btn-icon">⏹</span><span>Stop</span>';
        fullscreenVideoBtn.classList.add('recording');
        fullscreenVideoBtn.disabled = false;
    }

    // Show controls for stop button
    if (fullscreenControls) fullscreenControls.classList.remove('hidden');

    // Auto-stop after 1 minute
    setTimeout(() => {
        if (isRecording && isFullscreenMode) {
            stopFullscreenVideoRecording();
        }
    }, 60000);
}

// Stop video recording in fullscreen
function stopFullscreenVideoRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;

        // Update UI
        if (fullscreenRecording) fullscreenRecording.classList.remove('active');
        if (fullscreenPhotoBtn) fullscreenPhotoBtn.disabled = false;

        // Reset video button
        if (fullscreenVideoBtn) {
            fullscreenVideoBtn.innerHTML = '<span class="fullscreen-btn-icon">🎬</span><span>Video</span>';
            fullscreenVideoBtn.classList.remove('recording');
        }
    }
}

// Save video recorded in fullscreen
function saveFullscreenVideo(videoUrl) {
    const videoId = Date.now();
    const videos = getVideosFromStorage();

    videos.push({
        id: videoId,
        url: videoUrl,
        sessionId: getActiveSessionId() || null,
        createdAt: new Date().toISOString()
    });

    saveVideosToStorage(videos);

    // Show brief confirmation without leaving fullscreen
    if (fullscreenRecording) {
        fullscreenRecording.innerHTML = '<span class="recording-dot" style="background: #10b981;"></span><span>Video Saved!</span>';
        fullscreenRecording.classList.add('active');
        fullscreenRecording.style.background = 'rgba(16, 185, 129, 0.9)';

        setTimeout(() => {
            fullscreenRecording.classList.remove('active');
            fullscreenRecording.innerHTML = '<span class="recording-dot"></span><span>Recording...</span>';
            fullscreenRecording.style.background = '';
        }, 2000);
    }
}

// Handle escape key in fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreenMode) {
        exitFullscreenBooth();
    }
});

// =============================================
// QUICK LOGO FUNCTIONS
// =============================================

// Handle quick logo upload
function handleQuickLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        setQuickLogo(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Handle paste for logo
function handleLogoPaste(event) {
    // Only handle paste if not in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (e) => {
                setQuickLogo(e.target.result);
            };
            reader.readAsDataURL(file);
            event.preventDefault();
            break;
        }
    }
}

// Set quick logo
function setQuickLogo(logoData) {
    // Update preview
    if (quickLogoPreview) {
        quickLogoPreview.src = logoData;
        quickLogoPreview.style.display = 'block';
    }
    if (logoPlaceholder) {
        logoPlaceholder.style.display = 'none';
    }
    if (removeQuickLogoBtn) {
        removeQuickLogoBtn.style.display = 'inline-flex';
    }

    // Save to session settings
    if (designSettings) {
        if (!designSettings.photo4x6) {
            designSettings.photo4x6 = {};
        }
        designSettings.photo4x6.cornerLogo = logoData;

        // Save to current session
        const activeSessionId = getActiveSessionId();
        if (activeSessionId) {
            updateSession(activeSessionId, { settings: designSettings });
        }
    }
}

// Remove quick logo
function removeQuickLogo() {
    if (quickLogoPreview) {
        quickLogoPreview.src = '';
        quickLogoPreview.style.display = 'none';
    }
    if (logoPlaceholder) {
        logoPlaceholder.style.display = 'flex';
    }
    if (removeQuickLogoBtn) {
        removeQuickLogoBtn.style.display = 'none';
    }
    if (quickLogoInput) {
        quickLogoInput.value = '';
    }

    // Remove from session settings
    if (designSettings && designSettings.photo4x6) {
        designSettings.photo4x6.cornerLogo = null;

        const activeSessionId = getActiveSessionId();
        if (activeSessionId) {
            updateSession(activeSessionId, { settings: designSettings });
        }
    }
}

// Update quick logo position
function updateQuickLogoPosition() {
    if (!quickLogoPosition || !designSettings) return;

    if (!designSettings.photo4x6) {
        designSettings.photo4x6 = {};
    }
    designSettings.photo4x6.position = quickLogoPosition.value;

    const activeSessionId = getActiveSessionId();
    if (activeSessionId) {
        updateSession(activeSessionId, { settings: designSettings });
    }
}

// Load quick logo from session
function loadQuickLogo() {
    if (!designSettings || !designSettings.photo4x6) return;

    const logoData = designSettings.photo4x6.cornerLogo;
    const position = designSettings.photo4x6.position || 'bottom-right';

    if (quickLogoPosition) {
        quickLogoPosition.value = position;
    }

    if (logoData) {
        if (quickLogoPreview) {
            quickLogoPreview.src = logoData;
            quickLogoPreview.style.display = 'block';
        }
        if (logoPlaceholder) {
            logoPlaceholder.style.display = 'none';
        }
        if (removeQuickLogoBtn) {
            removeQuickLogoBtn.style.display = 'inline-flex';
        }
    } else {
        if (quickLogoPreview) {
            quickLogoPreview.style.display = 'none';
        }
        if (logoPlaceholder) {
            logoPlaceholder.style.display = 'flex';
        }
        if (removeQuickLogoBtn) {
            removeQuickLogoBtn.style.display = 'none';
        }
    }
}

// Load logo when session changes
const originalHandleSessionChange = handleSessionChange;
handleSessionChange = function() {
    originalHandleSessionChange();
    loadQuickLogo();
};

// Load logo on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadQuickLogo, 100);
});

