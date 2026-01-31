// Auth UI Module
// Handles login/signup modal, user status indicator, and sync status display

// =============================================
// AUTH MODAL
// =============================================

// Create auth modal HTML
function createAuthModal() {
    // Check if modal already exists
    if (document.getElementById('authModal')) {
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-modal-content">
            <button class="auth-modal-close" onclick="closeAuthModal()">&times;</button>

            <div class="auth-modal-header">
                <h2 id="authModalTitle">Sign In</h2>
                <p id="authModalSubtitle">Sign in to sync your photos across devices</p>
            </div>

            <div id="authError" class="auth-error" style="display: none;"></div>

            <form id="authForm" onsubmit="handleAuthSubmit(event)">
                <div class="auth-form-group">
                    <label for="authEmail">Email</label>
                    <input type="email" id="authEmail" required placeholder="your@email.com">
                </div>

                <div class="auth-form-group">
                    <label for="authPassword">Password</label>
                    <input type="password" id="authPassword" required placeholder="Enter password" minlength="6">
                </div>

                <div class="auth-form-group" id="confirmPasswordGroup" style="display: none;">
                    <label for="authConfirmPassword">Confirm Password</label>
                    <input type="password" id="authConfirmPassword" placeholder="Confirm password" minlength="6">
                </div>

                <button type="submit" class="btn btn-primary auth-submit-btn" id="authSubmitBtn">
                    <span class="btn-icon" id="authBtnIcon">🔐</span>
                    <span id="authBtnText">Sign In</span>
                </button>
            </form>

            <div class="auth-modal-footer">
                <button type="button" class="auth-link" id="forgotPasswordBtn" onclick="showForgotPassword()">
                    Forgot password?
                </button>
                <div class="auth-switch">
                    <span id="authSwitchText">Don't have an account?</span>
                    <button type="button" class="auth-link" id="authSwitchBtn" onclick="toggleAuthMode()">
                        Sign Up
                    </button>
                </div>
            </div>

            <!-- Forgot Password View -->
            <div id="forgotPasswordView" style="display: none;">
                <form id="forgotPasswordForm" onsubmit="handleForgotPassword(event)">
                    <div class="auth-form-group">
                        <label for="resetEmail">Email</label>
                        <input type="email" id="resetEmail" required placeholder="your@email.com">
                    </div>
                    <button type="submit" class="btn btn-primary auth-submit-btn">
                        <span class="btn-icon">📧</span>
                        Send Reset Email
                    </button>
                </form>
                <button type="button" class="auth-link" onclick="showLoginForm()" style="margin-top: 15px;">
                    Back to Sign In
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAuthModal();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeAuthModal();
        }
    });
}

// Create merge dialog HTML
function createMergeDialog() {
    if (document.getElementById('mergeDialog')) {
        return;
    }

    const dialog = document.createElement('div');
    dialog.id = 'mergeDialog';
    dialog.className = 'auth-modal';
    dialog.innerHTML = `
        <div class="auth-modal-content merge-dialog-content">
            <div class="auth-modal-header">
                <h2>Sync Your Data</h2>
                <p>You have existing data locally. How would you like to proceed?</p>
            </div>

            <div class="merge-options">
                <button class="merge-option" onclick="handleMergeChoice('merge')">
                    <span class="merge-option-icon">🔄</span>
                    <span class="merge-option-title">Merge Data</span>
                    <span class="merge-option-desc">Combine local and cloud data (recommended)</span>
                </button>

                <button class="merge-option" onclick="handleMergeChoice('replace-with-cloud')">
                    <span class="merge-option-icon">☁️</span>
                    <span class="merge-option-title">Use Cloud Data</span>
                    <span class="merge-option-desc">Replace local data with your cloud backup</span>
                </button>

                <button class="merge-option" onclick="handleMergeChoice('keep-local')">
                    <span class="merge-option-icon">📱</span>
                    <span class="merge-option-title">Keep Local</span>
                    <span class="merge-option-desc">Upload local data to cloud, ignore cloud data</span>
                </button>
            </div>

            <button type="button" class="auth-link" onclick="closeMergeDialog()" style="margin-top: 20px;">
                Skip for now
            </button>
        </div>
    `;

    document.body.appendChild(dialog);
}

// Auth modal state
let isSignUpMode = false;

// Open auth modal
function openAuthModal(mode = 'signin') {
    createAuthModal();
    const modal = document.getElementById('authModal');

    isSignUpMode = mode === 'signup';
    updateAuthModalUI();

    modal.classList.add('active');

    // Focus email input
    setTimeout(() => {
        document.getElementById('authEmail')?.focus();
    }, 100);
}

// Close auth modal
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('active');
        // Reset form
        document.getElementById('authForm')?.reset();
        document.getElementById('authError').style.display = 'none';
        showLoginForm();
    }
}

// Toggle between sign in and sign up
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    updateAuthModalUI();
}

// Update modal UI based on mode
function updateAuthModalUI() {
    const title = document.getElementById('authModalTitle');
    const subtitle = document.getElementById('authModalSubtitle');
    const switchText = document.getElementById('authSwitchText');
    const switchBtn = document.getElementById('authSwitchBtn');
    const submitBtn = document.getElementById('authBtnText');
    const submitIcon = document.getElementById('authBtnIcon');
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const confirmInput = document.getElementById('authConfirmPassword');
    const forgotBtn = document.getElementById('forgotPasswordBtn');

    if (isSignUpMode) {
        title.textContent = 'Create Account';
        subtitle.textContent = 'Create an account to sync your photos';
        switchText.textContent = 'Already have an account?';
        switchBtn.textContent = 'Sign In';
        submitBtn.textContent = 'Create Account';
        submitIcon.textContent = '✨';
        confirmGroup.style.display = 'block';
        confirmInput.required = true;
        forgotBtn.style.display = 'none';
    } else {
        title.textContent = 'Sign In';
        subtitle.textContent = 'Sign in to sync your photos across devices';
        switchText.textContent = "Don't have an account?";
        switchBtn.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign In';
        submitIcon.textContent = '🔐';
        confirmGroup.style.display = 'none';
        confirmInput.required = false;
        forgotBtn.style.display = 'inline';
    }

    // Clear error
    document.getElementById('authError').style.display = 'none';
}

// Show forgot password form
function showForgotPassword() {
    document.getElementById('authForm').style.display = 'none';
    document.querySelector('.auth-modal-footer').style.display = 'none';
    document.getElementById('forgotPasswordView').style.display = 'block';
    document.getElementById('authModalTitle').textContent = 'Reset Password';
    document.getElementById('authModalSubtitle').textContent = 'Enter your email to receive a reset link';
}

// Show login form
function showLoginForm() {
    document.getElementById('authForm').style.display = 'block';
    document.querySelector('.auth-modal-footer').style.display = 'block';
    document.getElementById('forgotPasswordView').style.display = 'none';
    updateAuthModalUI();
}

// Handle auth form submit
async function handleAuthSubmit(event) {
    event.preventDefault();

    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const submitBtn = document.getElementById('authSubmitBtn');

    // Validate
    if (!email || !password) {
        showAuthError('Please fill in all fields');
        return;
    }

    if (isSignUpMode) {
        const confirmPassword = document.getElementById('authConfirmPassword').value;
        if (password !== confirmPassword) {
            showAuthError('Passwords do not match');
            return;
        }
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.querySelector('#authBtnText').textContent = isSignUpMode ? 'Creating...' : 'Signing in...';

    try {
        let result;
        if (isSignUpMode) {
            result = await signUp(email, password);
        } else {
            result = await signIn(email, password);
        }

        if (result.success) {
            closeAuthModal();

            // Check if there's local data to merge
            const localSessions = getSessions();
            const localPhotos = getPhotosFromStorage();

            if (localSessions.length > 0 || localPhotos.length > 0) {
                // Show merge dialog
                showMergeDialog();
            } else {
                // No local data, just sync from cloud
                syncSessionsFromCloud();
            }
        } else {
            showAuthError(result.error);
        }
    } catch (error) {
        showAuthError(error.message || 'An error occurred');
    }

    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.querySelector('#authBtnText').textContent = isSignUpMode ? 'Create Account' : 'Sign In';
}

// Handle forgot password
async function handleForgotPassword(event) {
    event.preventDefault();

    const email = document.getElementById('resetEmail').value.trim();

    if (!email) {
        showAuthError('Please enter your email');
        return;
    }

    const result = await resetPassword(email);

    if (result.success) {
        showAuthError('Reset email sent! Check your inbox.', 'success');
        setTimeout(() => {
            showLoginForm();
        }, 2000);
    } else {
        showAuthError(result.error);
    }
}

// Show auth error
function showAuthError(message, type = 'error') {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.className = `auth-error ${type}`;
    errorDiv.style.display = 'block';
}

// =============================================
// MERGE DIALOG
// =============================================

// Show merge dialog
function showMergeDialog() {
    createMergeDialog();
    const dialog = document.getElementById('mergeDialog');
    dialog.classList.add('active');
}

// Close merge dialog
function closeMergeDialog() {
    const dialog = document.getElementById('mergeDialog');
    if (dialog) {
        dialog.classList.remove('active');
    }
}

// Handle merge choice
async function handleMergeChoice(strategy) {
    closeMergeDialog();

    // Show syncing status
    updateSyncStatusUI('syncing');

    const result = await mergeLocalAndCloudData(strategy);

    if (result.success) {
        showSyncNotification('Data synced successfully!', 'success');
        // Reload page to show merged data
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } else {
        showSyncNotification('Sync failed: ' + result.error, 'error');
    }
}

// =============================================
// USER STATUS INDICATOR
// =============================================

// Create user status container
function createUserStatusContainer() {
    // Check if container already exists
    if (document.getElementById('userStatusContainer')) {
        return;
    }

    const container = document.createElement('div');
    container.id = 'userStatusContainer';
    container.className = 'user-status-container';
    container.innerHTML = `
        <div class="user-status-logged-out" id="loggedOutStatus">
            <button class="btn btn-secondary btn-small" onclick="openAuthModal('signin')">
                <span class="btn-icon">🔐</span>
                Login
            </button>
            <button class="btn btn-primary btn-small" onclick="openAuthModal('signup')">
                <span class="btn-icon">✨</span>
                Sign Up
            </button>
        </div>
        <div class="user-status-logged-in" id="loggedInStatus" style="display: none;">
            <div class="sync-status" id="syncStatusIndicator" title="Sync status">
                <span class="sync-icon">☁️</span>
            </div>
            <div class="user-info">
                <span class="user-email" id="userEmailDisplay"></span>
            </div>
            <button class="btn btn-secondary btn-small" onclick="handleLogout()">
                Logout
            </button>
        </div>
    `;

    // Insert after header h1
    const header = document.querySelector('header');
    if (header) {
        header.appendChild(container);
    }
}

// Update user status UI
function updateUserStatusUI(user) {
    createUserStatusContainer();

    const loggedOutStatus = document.getElementById('loggedOutStatus');
    const loggedInStatus = document.getElementById('loggedInStatus');
    const userEmailDisplay = document.getElementById('userEmailDisplay');

    if (user) {
        loggedOutStatus.style.display = 'none';
        loggedInStatus.style.display = 'flex';
        userEmailDisplay.textContent = user.email;
    } else {
        loggedOutStatus.style.display = 'flex';
        loggedInStatus.style.display = 'none';
    }
}

// Handle logout
async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        await signOut();
    }
}

// =============================================
// SYNC STATUS INDICATOR
// =============================================

// Update sync status UI
function updateSyncStatusUI(status) {
    const indicator = document.getElementById('syncStatusIndicator');
    if (!indicator) return;

    const statusConfig = {
        'synced': { icon: '☁️', color: 'var(--success-color)', title: 'Synced' },
        'syncing': { icon: '🔄', color: 'var(--gold)', title: 'Syncing...', animate: true },
        'pending': { icon: '⏳', color: 'var(--gold)', title: 'Pending sync' },
        'error': { icon: '⚠️', color: 'var(--danger-color)', title: 'Sync error' },
        'offline': { icon: '📴', color: 'var(--text-secondary)', title: 'Offline' },
        'partial': { icon: '⚡', color: 'var(--gold)', title: 'Partially synced' }
    };

    const config = statusConfig[status] || statusConfig['synced'];

    indicator.innerHTML = `<span class="sync-icon ${config.animate ? 'spinning' : ''}">${config.icon}</span>`;
    indicator.style.color = config.color;
    indicator.title = config.title;
}

// Show sync notification
function showSyncNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.getElementById('syncNotification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'syncNotification';
    notification.className = `sync-notification ${type}`;
    notification.innerHTML = `
        <span class="sync-notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ️'}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// =============================================
// FIREBASE CONFIG UI
// =============================================

// Create Firebase config section for settings
function createFirebaseConfigUI() {
    const existingSection = document.getElementById('firebaseConfigSection');
    if (existingSection) return;

    const section = document.createElement('div');
    section.id = 'firebaseConfigSection';
    section.className = 'firebase-config-section';
    section.innerHTML = `
        <h2>Cloud Sync Settings</h2>
        <p class="section-description">Configure Firebase to enable cloud sync across devices.</p>

        <div class="firebase-config-form">
            <div class="setting-group">
                <label for="firebaseApiKey">API Key:</label>
                <input type="text" id="firebaseApiKey" class="setting-input" placeholder="Your Firebase API Key">
            </div>
            <div class="setting-group">
                <label for="firebaseAuthDomain">Auth Domain:</label>
                <input type="text" id="firebaseAuthDomain" class="setting-input" placeholder="your-app.firebaseapp.com">
            </div>
            <div class="setting-group">
                <label for="firebaseProjectId">Project ID:</label>
                <input type="text" id="firebaseProjectId" class="setting-input" placeholder="your-project-id">
            </div>
            <div class="setting-group">
                <label for="firebaseStorageBucket">Storage Bucket:</label>
                <input type="text" id="firebaseStorageBucket" class="setting-input" placeholder="your-app.appspot.com">
            </div>
            <div class="setting-group">
                <label for="firebaseMessagingSenderId">Messaging Sender ID:</label>
                <input type="text" id="firebaseMessagingSenderId" class="setting-input" placeholder="123456789">
            </div>
            <div class="setting-group">
                <label for="firebaseAppId">App ID:</label>
                <input type="text" id="firebaseAppId" class="setting-input" placeholder="1:123456789:web:abcdef">
            </div>

            <div class="firebase-config-actions">
                <button class="btn btn-primary" onclick="saveFirebaseConfigFromUI()">
                    <span class="btn-icon">💾</span>
                    Save Configuration
                </button>
                <button class="btn btn-danger" onclick="clearFirebaseConfigUI()">
                    <span class="btn-icon">🗑️</span>
                    Clear
                </button>
            </div>
        </div>

        <div class="firebase-help">
            <details>
                <summary>How to get Firebase configuration</summary>
                <ol>
                    <li>Go to <a href="https://console.firebase.google.com/" target="_blank">Firebase Console</a></li>
                    <li>Create a new project (or select existing)</li>
                    <li>Go to Project Settings (gear icon)</li>
                    <li>Scroll down to "Your apps" and click "Add app" (Web)</li>
                    <li>Copy the config values from the code snippet</li>
                    <li>Enable Authentication (Email/Password) in Build > Authentication</li>
                    <li>Create a Firestore database in Build > Firestore Database</li>
                    <li>Create a Storage bucket in Build > Storage</li>
                </ol>
            </details>
        </div>
    `;

    // Load existing config
    const existingConfig = getFirebaseConfig();
    if (existingConfig) {
        section.querySelector('#firebaseApiKey').value = existingConfig.apiKey || '';
        section.querySelector('#firebaseAuthDomain').value = existingConfig.authDomain || '';
        section.querySelector('#firebaseProjectId').value = existingConfig.projectId || '';
        section.querySelector('#firebaseStorageBucket').value = existingConfig.storageBucket || '';
        section.querySelector('#firebaseMessagingSenderId').value = existingConfig.messagingSenderId || '';
        section.querySelector('#firebaseAppId').value = existingConfig.appId || '';
    }

    return section;
}

// Save Firebase config from UI
async function saveFirebaseConfigFromUI() {
    const config = {
        apiKey: document.getElementById('firebaseApiKey').value.trim(),
        authDomain: document.getElementById('firebaseAuthDomain').value.trim(),
        projectId: document.getElementById('firebaseProjectId').value.trim(),
        storageBucket: document.getElementById('firebaseStorageBucket').value.trim(),
        messagingSenderId: document.getElementById('firebaseMessagingSenderId').value.trim(),
        appId: document.getElementById('firebaseAppId').value.trim()
    };

    if (!config.apiKey || !config.projectId) {
        alert('Please enter at least the API Key and Project ID');
        return;
    }

    saveFirebaseConfig(config);

    // Try to initialize
    const success = await initializeFirebase(config);

    if (success) {
        alert('Firebase configured successfully! You can now sign in.');
        updateUserStatusUI(null);
    } else {
        alert('Firebase configuration saved but initialization failed. Please check your values.');
    }
}

// Clear Firebase config UI
function clearFirebaseConfigUI() {
    if (confirm('This will clear your Firebase configuration. Are you sure?')) {
        clearFirebaseConfig();
        document.getElementById('firebaseApiKey').value = '';
        document.getElementById('firebaseAuthDomain').value = '';
        document.getElementById('firebaseProjectId').value = '';
        document.getElementById('firebaseStorageBucket').value = '';
        document.getElementById('firebaseMessagingSenderId').value = '';
        document.getElementById('firebaseAppId').value = '';
        alert('Firebase configuration cleared');
    }
}

// =============================================
// HEADER AUTH BUTTONS
// =============================================

// Create header auth buttons
function createHeaderAuthButtons() {
    const headerAuth = document.getElementById('headerAuth');
    if (!headerAuth) return;

    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

    if (user) {
        // User is logged in - show email and logout
        headerAuth.innerHTML = `
            <div class="user-info">
                <span class="user-email-display" title="${user.email}">${user.email}</span>
                <button class="auth-btn-logout" onclick="handleLogout()">Logout</button>
            </div>
        `;
    } else {
        // User is not logged in - show login/signup buttons
        headerAuth.innerHTML = `
            <button class="auth-btn-small auth-btn-login" onclick="openAuthModal('signin')">Login</button>
            <button class="auth-btn-small auth-btn-signup" onclick="openAuthModal('signup')">Sign Up</button>
        `;
    }
}

// Handle logout from header
async function handleLogout() {
    if (typeof signOut === 'function') {
        await signOut();
    }
    createHeaderAuthButtons();
    showLoginRequiredOverlay();
}

// =============================================
// LOGIN REQUIRED OVERLAY
// =============================================

// Create login required overlay
function createLoginRequiredOverlay() {
    // Check if overlay already exists
    if (document.getElementById('loginRequiredOverlay')) {
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'loginRequiredOverlay';
    overlay.className = 'login-required-overlay';
    overlay.innerHTML = `
        <div class="login-required-content">
            <h2>BOOTHX</h2>
            <p class="est-tag" style="margin-bottom: 20px;">EST 2026</p>
            <p>Sign in or create an account to continue.</p>
            <div class="login-required-buttons">
                <button class="btn btn-secondary" onclick="openAuthModal('signin'); hideLoginRequiredOverlay();">Login</button>
                <button class="btn btn-primary" onclick="openAuthModal('signup'); hideLoginRequiredOverlay();">Sign Up</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

// Show login required overlay
function showLoginRequiredOverlay() {
    // Don't show on photo.html (public photo view page)
    if (window.location.pathname.includes('photo.html')) {
        return;
    }

    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (user) {
        hideLoginRequiredOverlay();
        return;
    }

    createLoginRequiredOverlay();
    const overlay = document.getElementById('loginRequiredOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// Hide login required overlay
function hideLoginRequiredOverlay() {
    const overlay = document.getElementById('loginRequiredOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Check if user is authenticated, show overlay if not
function requireAuth() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!user) {
        showLoginRequiredOverlay();
        return false;
    }
    return true;
}

// =============================================
// INITIALIZATION
// =============================================

// Initialize auth UI on page load
function initAuthUI() {
    // Only use header auth buttons (top right corner)
    createHeaderAuthButtons();

    // Check if user is logged in
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

    if (!user) {
        // Show login required overlay
        showLoginRequiredOverlay();
        // Auto-open the auth modal for first-time visitors
        setTimeout(() => {
            openAuthModal('signup');
        }, 300);
    }

    // Listen for auth state changes
    window.addEventListener('authStateChanged', (event) => {
        createHeaderAuthButtons();

        if (event.detail.user) {
            hideLoginRequiredOverlay();
            closeAuthModal();
        } else {
            showLoginRequiredOverlay();
            openAuthModal('signup');
        }
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthUI);
} else {
    initAuthUI();
}
