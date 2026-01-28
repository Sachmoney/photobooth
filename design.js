// Design Page JavaScript

// DOM Elements
const sessionsList = document.getElementById('sessionsList');
const createSessionBtn = document.getElementById('createSessionBtn');
const activeSessionContent = document.getElementById('activeSessionContent');
const noActiveSession = document.getElementById('noActiveSession');
const sessionNameDisplay = document.getElementById('sessionNameDisplay');
const saveSessionBtn = document.getElementById('saveSessionBtn');
const stripDesignInput = document.getElementById('stripDesignInput');
const designPreview = document.getElementById('designPreview');
const designPreviewContainer = document.getElementById('designPreviewContainer');
const removeDesignBtn = document.getElementById('removeDesignBtn');
const designPosition = document.getElementById('designPosition');
const designSize = document.getElementById('designSize');
const designSizeValue = document.getElementById('designSizeValue');
const designOpacity = document.getElementById('designOpacity');
const designOpacityValue = document.getElementById('designOpacityValue');

// State
let currentSessionId = null;
let designSettings = {
    position: 'center',
    size: 100,
    opacity: 100
};

// Initialize
if (createSessionBtn) createSessionBtn.addEventListener('click', handleCreateSession);
if (saveSessionBtn) saveSessionBtn.addEventListener('click', handleSaveSession);
if (stripDesignInput) stripDesignInput.addEventListener('change', handleStripDesignImport);
if (removeDesignBtn) removeDesignBtn.addEventListener('click', removeDesign);
if (designPosition) designPosition.addEventListener('change', updateDesignSettings);
if (designSize) designSize.addEventListener('input', updateDesignSettings);
if (designOpacity) designOpacity.addEventListener('input', updateDesignSettings);

// Load sessions on page load
loadSessions();
loadActiveSession();

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
    
    const newSession = createSession(name.trim(), null, {
        position: 'center',
        size: 100,
        opacity: 100
    });
    
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
    
    const designData = designPreview ? designPreview.src : null;
    
    updateSession(currentSessionId, {
        design: designData && designData.startsWith('data:') ? designData : null,
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
        return;
    }
    
    if (activeSessionContent) activeSessionContent.style.display = 'block';
    if (noActiveSession) noActiveSession.style.display = 'none';
    if (sessionNameDisplay) sessionNameDisplay.textContent = activeSession.name;
    
    // Load design
    if (activeSession.design && designPreview) {
        designPreview.src = activeSession.design;
        if (designPreviewContainer) designPreviewContainer.style.display = 'block';
        if (removeDesignBtn) removeDesignBtn.style.display = 'inline-flex';
    } else {
        if (designPreviewContainer) designPreviewContainer.style.display = 'none';
        if (removeDesignBtn) removeDesignBtn.style.display = 'none';
    }
    
    // Load settings
    if (activeSession.settings) {
        designSettings = { ...activeSession.settings };
        
        if (designPosition) designPosition.value = designSettings.position || 'center';
        if (designSize) designSize.value = designSettings.size || 100;
        if (designOpacity) designOpacity.value = designSettings.opacity || 100;
        
        if (designSizeValue) designSizeValue.textContent = (designSettings.size || 100) + '%';
        if (designOpacityValue) designOpacityValue.textContent = (designSettings.opacity || 100) + '%';
    }
    
    updateDesignPreview();
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
        
        updateDesignPreview();
        loadSessions();
    };
    reader.readAsDataURL(file);
}

// Remove Design
function removeDesign() {
    if (!currentSessionId) return;
    
    if (designPreview) designPreview.src = '';
    if (stripDesignInput) stripDesignInput.value = '';
    if (designPreviewContainer) designPreviewContainer.style.display = 'none';
    if (removeDesignBtn) removeDesignBtn.style.display = 'none';
    
    updateSession(currentSessionId, {
        design: null,
        settings: designSettings
    });
    
    loadSessions();
}

// Update Design Settings
function updateDesignSettings() {
    if (!designSettings) {
        designSettings = {
            position: 'center',
            size: 100,
            opacity: 100
        };
    }
    
    if (designPosition) {
        designSettings.position = designPosition.value;
    }
    if (designSize) {
        designSettings.size = parseInt(designSize.value);
    }
    if (designOpacity) {
        designSettings.opacity = parseInt(designOpacity.value);
    }
    
    if (designSizeValue) {
        designSizeValue.textContent = designSettings.size + '%';
    }
    if (designOpacityValue) {
        designOpacityValue.textContent = designSettings.opacity + '%';
    }
    
    // Auto-save if session is active
    if (currentSessionId) {
        const activeSession = getActiveSession();
        if (activeSession && designPreview && designPreview.src) {
            updateSession(currentSessionId, {
                design: designPreview.src,
                settings: designSettings
            });
        }
    }
    
    updateDesignPreview();
}

// Update Design Preview
function updateDesignPreview() {
    if (!designPreview) return;
    
    if (!designPreview.src || designPreview.src === window.location.href) {
        return;
    }
    
    const maxSize = (designSettings.size / 100) * 600;
    designPreview.style.maxWidth = maxSize + 'px';
    designPreview.style.opacity = designSettings.opacity / 100;
}
