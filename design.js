// Design Page JavaScript

// DOM Elements - Sessions
const sessionsList = document.getElementById('sessionsList');
const createSessionBtn = document.getElementById('createSessionBtn');
const activeSessionContent = document.getElementById('activeSessionContent');
const noActiveSession = document.getElementById('noActiveSession');
const sessionNameDisplay = document.getElementById('sessionNameDisplay');
const saveSessionBtn = document.getElementById('saveSessionBtn');

// DOM Elements - Overlay
const stripDesignInput = document.getElementById('stripDesignInput');
const designPreview = document.getElementById('designPreview');
const designPreviewContainer = document.getElementById('designPreviewContainer');
const removeDesignBtn = document.getElementById('removeDesignBtn');
const designPosition = document.getElementById('designPosition');
const designSize = document.getElementById('designSize');
const designSizeValue = document.getElementById('designSizeValue');
const designOpacity = document.getElementById('designOpacity');
const designOpacityValue = document.getElementById('designOpacityValue');

// DOM Elements - Layout
const layoutOrientation = document.getElementById('layoutOrientation');
const layoutPhotoCount = document.getElementById('layoutPhotoCount');
const layoutSpacing = document.getElementById('layoutSpacing');
const layoutSpacingValue = document.getElementById('layoutSpacingValue');

// DOM Elements - Background
const bgType = document.getElementById('bgType');
const bgColor = document.getElementById('bgColor');
const bgColorValue = document.getElementById('bgColorValue');
const bgSolidGroup = document.getElementById('bgSolidGroup');
const bgGradientGroup = document.getElementById('bgGradientGroup');
const bgGradientStart = document.getElementById('bgGradientStart');
const bgGradientStartValue = document.getElementById('bgGradientStartValue');
const bgGradientEnd = document.getElementById('bgGradientEnd');
const bgGradientEndValue = document.getElementById('bgGradientEndValue');
const bgGradientDirection = document.getElementById('bgGradientDirection');

// DOM Elements - Text
const textEnabled = document.getElementById('textEnabled');
const textOptions = document.getElementById('textOptions');
const textContentInput = document.getElementById('textContentInput');
const textPosition = document.getElementById('textPosition');
const textFontSize = document.getElementById('textFontSize');
const textFontSizeValue = document.getElementById('textFontSizeValue');
const textFontFamily = document.getElementById('textFontFamily');
const textColor = document.getElementById('textColor');
const textColorValue = document.getElementById('textColorValue');
const textShowDate = document.getElementById('textShowDate');

// DOM Elements - Border
const borderEnabled = document.getElementById('borderEnabled');
const borderOptions = document.getElementById('borderOptions');
const borderWidth = document.getElementById('borderWidth');
const borderWidthValue = document.getElementById('borderWidthValue');
const borderColor = document.getElementById('borderColor');
const borderColorValue = document.getElementById('borderColorValue');
const borderStyle = document.getElementById('borderStyle');
const borderRadius = document.getElementById('borderRadius');
const borderRadiusValue = document.getElementById('borderRadiusValue');

// DOM Elements - 4x6 Photo Settings
const cornerLogoInput = document.getElementById('cornerLogoInput');
const cornerLogoPreview = document.getElementById('cornerLogoPreview');
const cornerLogoImg = document.getElementById('cornerLogoImg');
const removeCornerLogoBtn = document.getElementById('removeCornerLogoBtn');
const cornerLogoPosition = document.getElementById('cornerLogoPosition');
const cornerLogoSize = document.getElementById('cornerLogoSize');
const cornerLogoSizeValue = document.getElementById('cornerLogoSizeValue');
const cornerLogoOpacity = document.getElementById('cornerLogoOpacity');
const cornerLogoOpacityValue = document.getElementById('cornerLogoOpacityValue');
const cornerLogoPadding = document.getElementById('cornerLogoPadding');
const cornerLogoPaddingValue = document.getElementById('cornerLogoPaddingValue');

// DOM Elements - Preview
const stripPreviewSection = document.getElementById('stripPreviewSection');
const stripPreviewCanvas = document.getElementById('stripPreviewCanvas');

// State
let currentSessionId = null;
let designSettings = null;
let stripDesignImage = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Session handlers
    if (createSessionBtn) createSessionBtn.addEventListener('click', handleCreateSession);
    if (saveSessionBtn) saveSessionBtn.addEventListener('click', handleSaveSession);

    // Overlay handlers
    if (stripDesignInput) stripDesignInput.addEventListener('change', handleStripDesignImport);
    if (removeDesignBtn) removeDesignBtn.addEventListener('click', removeDesign);
    if (designPosition) designPosition.addEventListener('change', updateAndSaveSettings);
    if (designSize) designSize.addEventListener('input', updateAndSaveSettings);
    if (designOpacity) designOpacity.addEventListener('input', updateAndSaveSettings);

    // Layout handlers
    if (layoutOrientation) layoutOrientation.addEventListener('change', updateAndSaveSettings);
    if (layoutPhotoCount) layoutPhotoCount.addEventListener('change', updateAndSaveSettings);
    if (layoutSpacing) layoutSpacing.addEventListener('input', updateAndSaveSettings);

    // Background handlers
    if (bgType) bgType.addEventListener('change', handleBgTypeChange);
    if (bgColor) bgColor.addEventListener('input', updateAndSaveSettings);
    if (bgGradientStart) bgGradientStart.addEventListener('input', updateAndSaveSettings);
    if (bgGradientEnd) bgGradientEnd.addEventListener('input', updateAndSaveSettings);
    if (bgGradientDirection) bgGradientDirection.addEventListener('change', updateAndSaveSettings);

    // Text handlers
    if (textEnabled) textEnabled.addEventListener('change', handleTextEnabledChange);
    if (textContentInput) textContentInput.addEventListener('input', updateAndSaveSettings);
    if (textPosition) textPosition.addEventListener('change', updateAndSaveSettings);
    if (textFontSize) textFontSize.addEventListener('input', updateAndSaveSettings);
    if (textFontFamily) textFontFamily.addEventListener('change', updateAndSaveSettings);
    if (textColor) textColor.addEventListener('input', updateAndSaveSettings);
    if (textShowDate) textShowDate.addEventListener('change', updateAndSaveSettings);

    // Border handlers
    if (borderEnabled) borderEnabled.addEventListener('change', handleBorderEnabledChange);
    if (borderWidth) borderWidth.addEventListener('input', updateAndSaveSettings);
    if (borderColor) borderColor.addEventListener('input', updateAndSaveSettings);
    if (borderStyle) borderStyle.addEventListener('change', updateAndSaveSettings);
    if (borderRadius) borderRadius.addEventListener('input', updateAndSaveSettings);

    // 4x6 Photo / Corner Logo handlers
    if (cornerLogoInput) cornerLogoInput.addEventListener('change', handleCornerLogoImport);
    if (removeCornerLogoBtn) removeCornerLogoBtn.addEventListener('click', removeCornerLogo);
    if (cornerLogoPosition) cornerLogoPosition.addEventListener('change', updateAndSaveSettings);
    if (cornerLogoSize) cornerLogoSize.addEventListener('input', updateAndSaveSettings);
    if (cornerLogoOpacity) cornerLogoOpacity.addEventListener('input', updateAndSaveSettings);
    if (cornerLogoPadding) cornerLogoPadding.addEventListener('input', updateAndSaveSettings);

    // Load initial data
    loadSessions();
    loadActiveSession();
});

// Toggle section visibility
function toggleSection(contentId) {
    const content = document.getElementById(contentId);
    if (content) {
        content.classList.toggle('collapsed');
        const header = content.previousElementSibling;
        if (header) {
            const icon = header.querySelector('.toggle-icon');
            if (icon) {
                icon.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
            }
        }
    }
}

// Handle background type change
function handleBgTypeChange() {
    const isGradient = bgType.value === 'gradient';
    if (bgSolidGroup) bgSolidGroup.style.display = isGradient ? 'none' : 'flex';
    if (bgGradientGroup) bgGradientGroup.style.display = isGradient ? 'block' : 'none';
    updateAndSaveSettings();
}

// Handle text enabled change
function handleTextEnabledChange() {
    if (textOptions) {
        textOptions.style.display = textEnabled.checked ? 'block' : 'none';
    }
    updateAndSaveSettings();
}

// Handle border enabled change
function handleBorderEnabledChange() {
    if (borderOptions) {
        borderOptions.style.display = borderEnabled.checked ? 'block' : 'none';
    }
    updateAndSaveSettings();
}

// Load Sessions
function loadSessions() {
    if (!sessionsList) return;

    const sessions = getSessions();
    sessionsList.innerHTML = '';

    if (sessions.length === 0) {
        sessionsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No sessions yet. Create one to get started!</p>';
        return;
    }

    const activeSessionId = getActiveSessionId();

    sessions.forEach(session => {
        const sessionItem = document.createElement('div');
        sessionItem.className = `session-item ${session.id === activeSessionId ? 'active' : ''}`;

        const info = document.createElement('div');
        info.className = 'session-info';

        const name = document.createElement('div');
        name.className = 'session-name';
        name.textContent = session.name;

        const meta = document.createElement('div');
        meta.className = 'session-meta';
        const hasDesign = session.design ? '✓ Has design' : 'No design';
        const date = new Date(session.createdAt).toLocaleDateString();
        meta.textContent = `${hasDesign} • Created ${date}`;

        info.appendChild(name);
        info.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'session-actions';

        const activateBtn = document.createElement('button');
        activateBtn.className = 'btn btn-secondary';
        activateBtn.textContent = session.id === activeSessionId ? '✓ Active' : 'Activate';
        activateBtn.onclick = () => activateSession(session.id);
        if (session.id === activeSessionId) {
            activateBtn.disabled = true;
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = '🗑️';
        deleteBtn.onclick = () => deleteSessionById(session.id);

        actions.appendChild(activateBtn);
        actions.appendChild(deleteBtn);

        sessionItem.appendChild(info);
        sessionItem.appendChild(actions);
        sessionsList.appendChild(sessionItem);
    });
}

// Create New Session
function handleCreateSession() {
    const name = prompt('Enter session name:');
    if (!name || name.trim() === '') {
        return;
    }

    const newSession = createSession(name.trim(), null, null);
    setActiveSessionId(newSession.id);
    loadSessions();
    loadActiveSession();
}

// Activate Session
function activateSession(sessionId) {
    setActiveSessionId(sessionId);
    loadSessions();
    loadActiveSession();
}

// Delete Session
function deleteSessionById(sessionId) {
    if (!confirm('Are you sure you want to delete this session?')) {
        return;
    }

    deleteSession(sessionId);
    loadSessions();

    if (currentSessionId === sessionId) {
        currentSessionId = null;
        loadActiveSession();
    }
}

// Save Current Session
function handleSaveSession() {
    if (!currentSessionId) return;

    const designData = designPreview && designPreview.src && designPreview.src.startsWith('data:') ? designPreview.src : null;

    updateSession(currentSessionId, {
        design: designData,
        settings: designSettings
    });

    alert('Session saved!');
    loadSessions();
}

// Load Active Session
function loadActiveSession() {
    const activeSession = getActiveSession();
    currentSessionId = activeSession ? activeSession.id : null;

    if (!activeSession) {
        if (activeSessionContent) activeSessionContent.style.display = 'none';
        if (noActiveSession) noActiveSession.style.display = 'block';
        if (stripPreviewSection) stripPreviewSection.style.display = 'none';
        return;
    }

    if (activeSessionContent) activeSessionContent.style.display = 'block';
    if (noActiveSession) noActiveSession.style.display = 'none';
    if (sessionNameDisplay) sessionNameDisplay.textContent = activeSession.name;
    if (stripPreviewSection) stripPreviewSection.style.display = 'block';

    // Load design overlay
    if (activeSession.design && designPreview) {
        designPreview.src = activeSession.design;
        stripDesignImage = new Image();
        stripDesignImage.src = activeSession.design;
        if (designPreviewContainer) designPreviewContainer.style.display = 'block';
        if (removeDesignBtn) removeDesignBtn.style.display = 'inline-flex';
    } else {
        stripDesignImage = null;
        if (designPreviewContainer) designPreviewContainer.style.display = 'none';
        if (removeDesignBtn) removeDesignBtn.style.display = 'none';
    }

    // Load settings with defaults
    const defaultSettings = typeof getDefaultSettings === 'function' ? getDefaultSettings() : {
        position: 'center',
        size: 100,
        opacity: 100,
        layout: { orientation: 'horizontal', photoCount: 3, spacing: 10 },
        background: { type: 'solid', color: '#ffffff', gradientStart: '#ffffff', gradientEnd: '#f0f0f0', gradientDirection: 'to bottom' },
        text: { enabled: false, content: '', position: 'bottom', fontSize: 24, fontFamily: 'Arial', color: '#000000', showDate: false },
        border: { enabled: false, width: 2, color: '#000000', style: 'solid', radius: 0 }
    };

    designSettings = activeSession.settings ? { ...defaultSettings, ...activeSession.settings } : defaultSettings;

    // Ensure nested objects exist
    designSettings.layout = { ...defaultSettings.layout, ...(designSettings.layout || {}) };
    designSettings.background = { ...defaultSettings.background, ...(designSettings.background || {}) };
    designSettings.text = { ...defaultSettings.text, ...(designSettings.text || {}) };
    designSettings.border = { ...defaultSettings.border, ...(designSettings.border || {}) };

    // Apply settings to UI
    applySettingsToUI();

    // Update preview
    updateStripPreview();
}

// Apply settings to UI elements
function applySettingsToUI() {
    if (!designSettings) return;

    // Overlay settings
    if (designPosition) designPosition.value = designSettings.position || 'center';
    if (designSize) designSize.value = designSettings.size || 100;
    if (designOpacity) designOpacity.value = designSettings.opacity || 100;
    if (designSizeValue) designSizeValue.textContent = (designSettings.size || 100) + '%';
    if (designOpacityValue) designOpacityValue.textContent = (designSettings.opacity || 100) + '%';

    // Layout settings
    if (layoutOrientation) layoutOrientation.value = designSettings.layout.orientation;
    if (layoutPhotoCount) layoutPhotoCount.value = designSettings.layout.photoCount;
    if (layoutSpacing) layoutSpacing.value = designSettings.layout.spacing;
    if (layoutSpacingValue) layoutSpacingValue.textContent = designSettings.layout.spacing + 'px';

    // Background settings
    if (bgType) bgType.value = designSettings.background.type;
    if (bgColor) bgColor.value = designSettings.background.color;
    if (bgColorValue) bgColorValue.textContent = designSettings.background.color;
    if (bgGradientStart) bgGradientStart.value = designSettings.background.gradientStart;
    if (bgGradientStartValue) bgGradientStartValue.textContent = designSettings.background.gradientStart;
    if (bgGradientEnd) bgGradientEnd.value = designSettings.background.gradientEnd;
    if (bgGradientEndValue) bgGradientEndValue.textContent = designSettings.background.gradientEnd;
    if (bgGradientDirection) bgGradientDirection.value = designSettings.background.gradientDirection;

    // Show/hide gradient options
    const isGradient = designSettings.background.type === 'gradient';
    if (bgSolidGroup) bgSolidGroup.style.display = isGradient ? 'none' : 'flex';
    if (bgGradientGroup) bgGradientGroup.style.display = isGradient ? 'block' : 'none';

    // Text settings
    if (textEnabled) textEnabled.checked = designSettings.text.enabled;
    if (textContentInput) textContentInput.value = designSettings.text.content;
    if (textPosition) textPosition.value = designSettings.text.position;
    if (textFontSize) textFontSize.value = designSettings.text.fontSize;
    if (textFontSizeValue) textFontSizeValue.textContent = designSettings.text.fontSize + 'px';
    if (textFontFamily) textFontFamily.value = designSettings.text.fontFamily;
    if (textColor) textColor.value = designSettings.text.color;
    if (textColorValue) textColorValue.textContent = designSettings.text.color;
    if (textShowDate) textShowDate.checked = designSettings.text.showDate;
    if (textOptions) textOptions.style.display = designSettings.text.enabled ? 'block' : 'none';

    // Border settings
    if (borderEnabled) borderEnabled.checked = designSettings.border.enabled;
    if (borderWidth) borderWidth.value = designSettings.border.width;
    if (borderWidthValue) borderWidthValue.textContent = designSettings.border.width + 'px';
    if (borderColor) borderColor.value = designSettings.border.color;
    if (borderColorValue) borderColorValue.textContent = designSettings.border.color;
    if (borderStyle) borderStyle.value = designSettings.border.style;
    if (borderRadius) borderRadius.value = designSettings.border.radius;
    if (borderRadiusValue) borderRadiusValue.textContent = designSettings.border.radius + 'px';
    if (borderOptions) borderOptions.style.display = designSettings.border.enabled ? 'block' : 'none';
}

// Collect settings from UI
function collectSettingsFromUI() {
    return {
        // Overlay
        position: designPosition ? designPosition.value : 'center',
        size: designSize ? parseInt(designSize.value) : 100,
        opacity: designOpacity ? parseInt(designOpacity.value) : 100,

        // Layout
        layout: {
            orientation: layoutOrientation ? layoutOrientation.value : 'horizontal',
            photoCount: layoutPhotoCount ? parseInt(layoutPhotoCount.value) : 3,
            spacing: layoutSpacing ? parseInt(layoutSpacing.value) : 10
        },

        // Background
        background: {
            type: bgType ? bgType.value : 'solid',
            color: bgColor ? bgColor.value : '#ffffff',
            gradientStart: bgGradientStart ? bgGradientStart.value : '#ffffff',
            gradientEnd: bgGradientEnd ? bgGradientEnd.value : '#f0f0f0',
            gradientDirection: bgGradientDirection ? bgGradientDirection.value : 'to bottom'
        },

        // Text
        text: {
            enabled: textEnabled ? textEnabled.checked : false,
            content: textContentInput ? textContentInput.value : '',
            position: textPosition ? textPosition.value : 'bottom',
            fontSize: textFontSize ? parseInt(textFontSize.value) : 24,
            fontFamily: textFontFamily ? textFontFamily.value : 'Arial',
            color: textColor ? textColor.value : '#000000',
            showDate: textShowDate ? textShowDate.checked : false
        },

        // Border
        border: {
            enabled: borderEnabled ? borderEnabled.checked : false,
            width: borderWidth ? parseInt(borderWidth.value) : 2,
            color: borderColor ? borderColor.value : '#000000',
            style: borderStyle ? borderStyle.value : 'solid',
            radius: borderRadius ? parseInt(borderRadius.value) : 0
        }
    };
}

// Update settings and save
function updateAndSaveSettings() {
    // Update display values
    if (designSizeValue && designSize) designSizeValue.textContent = designSize.value + '%';
    if (designOpacityValue && designOpacity) designOpacityValue.textContent = designOpacity.value + '%';
    if (layoutSpacingValue && layoutSpacing) layoutSpacingValue.textContent = layoutSpacing.value + 'px';
    if (bgColorValue && bgColor) bgColorValue.textContent = bgColor.value;
    if (bgGradientStartValue && bgGradientStart) bgGradientStartValue.textContent = bgGradientStart.value;
    if (bgGradientEndValue && bgGradientEnd) bgGradientEndValue.textContent = bgGradientEnd.value;
    if (textFontSizeValue && textFontSize) textFontSizeValue.textContent = textFontSize.value + 'px';
    if (textColorValue && textColor) textColorValue.textContent = textColor.value;
    if (borderWidthValue && borderWidth) borderWidthValue.textContent = borderWidth.value + 'px';
    if (borderColorValue && borderColor) borderColorValue.textContent = borderColor.value;
    if (borderRadiusValue && borderRadius) borderRadiusValue.textContent = borderRadius.value + 'px';

    // Collect settings
    designSettings = collectSettingsFromUI();

    // Auto-save to session
    if (currentSessionId) {
        const designData = designPreview && designPreview.src && designPreview.src.startsWith('data:') ? designPreview.src : null;
        updateSession(currentSessionId, {
            design: designData,
            settings: designSettings
        });
    }

    // Update preview
    updateStripPreview();
}

// Handle Design Import
function handleStripDesignImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    if (!currentSessionId) {
        alert('Please create or select a session first');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const designData = e.target.result;

        if (designPreview) {
            designPreview.src = designData;
        }

        stripDesignImage = new Image();
        stripDesignImage.onload = () => {
            updateStripPreview();
        };
        stripDesignImage.src = designData;

        if (designPreviewContainer) {
            designPreviewContainer.style.display = 'block';
        }
        if (removeDesignBtn) {
            removeDesignBtn.style.display = 'inline-flex';
        }

        // Auto-save to current session
        updateSession(currentSessionId, {
            design: designData,
            settings: designSettings
        });

        loadSessions();
    };
    reader.readAsDataURL(file);
}

// Remove Design
function removeDesign() {
    if (!currentSessionId) return;

    stripDesignImage = null;
    if (designPreview) designPreview.src = '';
    if (stripDesignInput) stripDesignInput.value = '';
    if (designPreviewContainer) designPreviewContainer.style.display = 'none';
    if (removeDesignBtn) removeDesignBtn.style.display = 'none';

    updateSession(currentSessionId, {
        design: null,
        settings: designSettings
    });

    loadSessions();
    updateStripPreview();
}

// Handle Corner Logo Import
function handleCornerLogoImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    if (!currentSessionId) {
        alert('Please create or select a session first');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const logoData = e.target.result;

        if (cornerLogoImg) {
            cornerLogoImg.src = logoData;
        }
        if (cornerLogoPreview) {
            cornerLogoPreview.style.display = 'flex';
        }

        // Update settings
        if (!designSettings.photo4x6) {
            designSettings.photo4x6 = {};
        }
        designSettings.photo4x6.cornerLogo = logoData;

        // Auto-save
        updateSession(currentSessionId, {
            settings: designSettings
        });

        loadSessions();
    };
    reader.readAsDataURL(file);
}

// Remove Corner Logo
function removeCornerLogo() {
    if (!currentSessionId) return;

    if (cornerLogoImg) cornerLogoImg.src = '';
    if (cornerLogoInput) cornerLogoInput.value = '';
    if (cornerLogoPreview) cornerLogoPreview.style.display = 'none';

    if (designSettings.photo4x6) {
        designSettings.photo4x6.cornerLogo = null;
    }

    updateSession(currentSessionId, {
        settings: designSettings
    });

    loadSessions();
}

// Update Strip Preview
function updateStripPreview() {
    if (!stripPreviewCanvas || !designSettings) return;

    const ctx = stripPreviewCanvas.getContext('2d');
    const settings = designSettings;

    // Photo dimensions
    const photoWidth = 120;
    const photoHeight = 160;
    const padding = 20;
    const spacing = settings.layout.spacing;
    const photoCount = settings.layout.photoCount;
    const isVertical = settings.layout.orientation === 'vertical';

    // Calculate text area
    let textAreaHeight = 0;
    if (settings.text.enabled && (settings.text.content || settings.text.showDate)) {
        textAreaHeight = settings.text.fontSize + 20;
    }

    // Calculate canvas dimensions
    let canvasWidth, canvasHeight;
    if (isVertical) {
        canvasWidth = photoWidth + (padding * 2);
        canvasHeight = (photoHeight * photoCount) + (padding * 2) + (spacing * (photoCount - 1)) + textAreaHeight;
    } else {
        canvasWidth = (photoWidth * photoCount) + (padding * 2) + (spacing * (photoCount - 1));
        canvasHeight = photoHeight + (padding * 2) + textAreaHeight;
    }

    stripPreviewCanvas.width = canvasWidth;
    stripPreviewCanvas.height = canvasHeight;

    // Draw background
    if (settings.background.type === 'gradient') {
        let gradient;
        switch (settings.background.gradientDirection) {
            case 'to right':
                gradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
                break;
            case 'to bottom right':
                gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
                break;
            case 'to bottom left':
                gradient = ctx.createLinearGradient(canvasWidth, 0, 0, canvasHeight);
                break;
            default: // to bottom
                gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        }
        gradient.addColorStop(0, settings.background.gradientStart);
        gradient.addColorStop(1, settings.background.gradientEnd);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = settings.background.color;
    }

    // Draw background with rounded corners if needed
    if (settings.border.enabled && settings.border.radius > 0) {
        roundRect(ctx, 0, 0, canvasWidth, canvasHeight, settings.border.radius);
        ctx.fill();
    } else {
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Calculate text position offset
    let textYOffset = settings.text.position === 'top' && textAreaHeight > 0 ? textAreaHeight : 0;

    // Draw placeholder photos
    ctx.fillStyle = '#cccccc';
    for (let i = 0; i < photoCount; i++) {
        let x, y;
        if (isVertical) {
            x = padding;
            y = padding + textYOffset + (i * (photoHeight + spacing));
        } else {
            x = padding + (i * (photoWidth + spacing));
            y = padding + textYOffset;
        }
        ctx.fillRect(x, y, photoWidth, photoHeight);

        // Draw photo number
        ctx.fillStyle = '#666666';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), x + photoWidth / 2, y + photoHeight / 2);
        ctx.fillStyle = '#cccccc';
    }

    // Draw text overlay
    if (settings.text.enabled && (settings.text.content || settings.text.showDate)) {
        ctx.fillStyle = settings.text.color;
        ctx.font = `${settings.text.fontSize}px ${settings.text.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let textContent = settings.text.content || '';
        if (settings.text.showDate) {
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            textContent = textContent ? `${textContent} • ${dateStr}` : dateStr;
        }

        let textY;
        if (settings.text.position === 'top') {
            textY = padding + textAreaHeight / 2;
        } else {
            textY = canvasHeight - padding - textAreaHeight / 2 + 10;
        }

        ctx.fillText(textContent, canvasWidth / 2, textY);
    }

    // Draw design overlay
    if (stripDesignImage && stripDesignImage.complete) {
        const opacity = settings.opacity / 100;
        ctx.save();
        ctx.globalAlpha = opacity;

        let overlayWidth, overlayHeight, x, y;

        if (settings.position === 'full-cover') {
            overlayWidth = canvasWidth;
            overlayHeight = canvasHeight;
            x = 0;
            y = 0;
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
                default: x = (canvasWidth - overlayWidth) / 2; y = (canvasHeight - overlayHeight) / 2;
            }
        }

        ctx.drawImage(stripDesignImage, x, y, overlayWidth, overlayHeight);
        ctx.restore();
    }

    // Draw border
    if (settings.border.enabled && settings.border.width > 0) {
        ctx.strokeStyle = settings.border.color;
        ctx.lineWidth = settings.border.width;

        if (settings.border.style === 'dashed') {
            ctx.setLineDash([10, 5]);
        } else if (settings.border.style === 'double') {
            ctx.setLineDash([]);
            // Draw outer border
            const offset = settings.border.width / 2;
            if (settings.border.radius > 0) {
                roundRect(ctx, offset, offset, canvasWidth - settings.border.width, canvasHeight - settings.border.width, settings.border.radius);
            } else {
                ctx.strokeRect(offset, offset, canvasWidth - settings.border.width, canvasHeight - settings.border.width);
            }
            // Draw inner border
            const innerOffset = settings.border.width * 1.5;
            if (settings.border.radius > 0) {
                roundRect(ctx, innerOffset, innerOffset, canvasWidth - innerOffset * 2, canvasHeight - innerOffset * 2, Math.max(0, settings.border.radius - settings.border.width));
            } else {
                ctx.strokeRect(innerOffset, innerOffset, canvasWidth - innerOffset * 2, canvasHeight - innerOffset * 2);
            }
            return;
        } else {
            ctx.setLineDash([]);
        }

        const offset = settings.border.width / 2;
        if (settings.border.radius > 0) {
            roundRect(ctx, offset, offset, canvasWidth - settings.border.width, canvasHeight - settings.border.width, settings.border.radius);
            ctx.stroke();
        } else {
            ctx.strokeRect(offset, offset, canvasWidth - settings.border.width, canvasHeight - settings.border.width);
        }
    }
}

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
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
