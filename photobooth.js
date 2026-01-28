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

// State
let stream = null;
let availableCameras = [];
let currentCameraId = null;
let stripDesignImage = null;
let designSettings = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

// Initialize
if (cameraSelect) cameraSelect.addEventListener('change', handleCameraChange);
if (switchCameraBtn) switchCameraBtn.addEventListener('click', switchCamera);
if (sessionSelect) sessionSelect.addEventListener('change', handleSessionChange);
if (startBtn) startBtn.addEventListener('click', startCamera);
if (stopBtn) stopBtn.addEventListener('click', stopCamera);
if (singlePhotoBtn) singlePhotoBtn.addEventListener('click', takePhoto);
if (photoStripBtn) photoStripBtn.addEventListener('click', takePhotoStrip);
if (videoRecordBtn) videoRecordBtn.addEventListener('click', toggleVideoRecording);

// Load sessions and active session design
loadSessionsDropdown();
loadDesignFromStorage();
loadDesignSettingsFromStorage();

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
    takePhotoWithCountdown().then(photo => {
        if (photo) {
            savePhoto(photo);
            loadQuickGallery();
        }
    });
}

// Take Photo Strip
async function takePhotoStrip() {
    const numPhotos = 3;
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

    console.log('Photo strip saved:', photoId, 'Session:', activeSessionId);

    // Auto-upload strip to Google Drive
    uploadPhotoToGDrive(combinedStrip, photoId, true);
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
        
        stripCanvas.width = (photoWidth * 3) + (padding * 2) + (gap * 2);
        stripCanvas.height = photoHeight + (padding * 2);
        
        stripCtx.fillStyle = 'white';
        stripCtx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);
        
        let loadedCount = 0;
        
        stripPhotos.forEach((photoData, index) => {
            const img = new Image();
            img.onload = () => {
                const x = padding + (index * (photoWidth + gap));
                stripCtx.drawImage(img, x, padding, photoWidth, photoHeight);
                
                loadedCount++;
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
    if (activeSession && activeSession.settings) {
        designSettings = activeSession.settings;
    } else {
        designSettings = {
            position: 'center',
            size: 100,
            opacity: 100
        };
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

