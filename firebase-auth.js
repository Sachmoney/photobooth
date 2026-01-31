// Firebase Authentication Module
// Handles user authentication for the PhotoBooth app

// Auth state
let currentUser = null;
let authStateListeners = [];

// Sign up with email and password
async function signUp(email, password) {
    const auth = getFirebaseAuth();
    if (!auth) {
        return { success: false, error: 'Firebase not initialized' };
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;

        console.log('User signed up:', currentUser.email);

        // Trigger first-time sync after signup
        window.dispatchEvent(new CustomEvent('userSignedUp', { detail: { user: currentUser } }));

        return { success: true, user: currentUser };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// Sign in with email and password
async function signIn(email, password) {
    const auth = getFirebaseAuth();
    if (!auth) {
        return { success: false, error: 'Firebase not initialized' };
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;

        console.log('User signed in:', currentUser.email);

        // Trigger sync after login
        window.dispatchEvent(new CustomEvent('userSignedIn', { detail: { user: currentUser } }));

        return { success: true, user: currentUser };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// Sign out
async function signOut() {
    const auth = getFirebaseAuth();
    if (!auth) {
        return { success: false, error: 'Firebase not initialized' };
    }

    try {
        await auth.signOut();
        currentUser = null;

        console.log('User signed out');

        // Notify listeners
        window.dispatchEvent(new CustomEvent('userSignedOut'));

        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

// Get current user
function getCurrentUser() {
    const auth = getFirebaseAuth();
    if (!auth) {
        return null;
    }
    return auth.currentUser || currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
    return getCurrentUser() !== null;
}

// Listen for auth state changes
function onAuthStateChanged(callback) {
    const auth = getFirebaseAuth();
    if (!auth) {
        console.warn('Firebase not initialized, auth state listener not added');
        // Store callback to be called later when Firebase initializes
        authStateListeners.push(callback);
        return () => {
            const index = authStateListeners.indexOf(callback);
            if (index > -1) {
                authStateListeners.splice(index, 1);
            }
        };
    }

    return auth.onAuthStateChanged((user) => {
        currentUser = user;
        callback(user);
    });
}

// Reset password
async function resetPassword(email) {
    const auth = getFirebaseAuth();
    if (!auth) {
        return { success: false, error: 'Firebase not initialized' };
    }

    try {
        await auth.sendPasswordResetEmail(email);
        console.log('Password reset email sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// Update user profile
async function updateUserProfile(displayName) {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, error: 'No user logged in' };
    }

    try {
        await user.updateProfile({ displayName });
        return { success: true };
    } catch (error) {
        console.error('Update profile error:', error);
        return { success: false, error: error.message };
    }
}

// Get user-friendly error messages
function getAuthErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
        'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/requires-recent-login': 'Please sign in again to complete this action.'
    };

    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

// Get user's display name or email
function getUserDisplayName() {
    const user = getCurrentUser();
    if (!user) return null;
    return user.displayName || user.email.split('@')[0];
}

// Get user's email
function getUserEmail() {
    const user = getCurrentUser();
    if (!user) return null;
    return user.email;
}

// Get user's ID
function getUserId() {
    const user = getCurrentUser();
    if (!user) return null;
    return user.uid;
}

// Initialize auth state listeners when Firebase is ready
window.addEventListener('firebaseInitialized', (event) => {
    if (event.detail.success) {
        const auth = getFirebaseAuth();
        if (auth) {
            // Set up auth state listener
            auth.onAuthStateChanged((user) => {
                currentUser = user;

                // Call any pending listeners
                authStateListeners.forEach(callback => callback(user));

                // Update UI
                window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
            });
        }
    }
});

// Delete user account
async function deleteAccount() {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, error: 'No user logged in' };
    }

    try {
        // First delete user data from Firestore
        if (typeof deleteUserData === 'function') {
            await deleteUserData(user.uid);
        }

        // Then delete the user account
        await user.delete();

        currentUser = null;
        console.log('User account deleted');

        window.dispatchEvent(new CustomEvent('userDeleted'));

        return { success: true };
    } catch (error) {
        console.error('Delete account error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// Re-authenticate user (required before sensitive operations)
async function reauthenticate(password) {
    const user = getCurrentUser();
    if (!user || !user.email) {
        return { success: false, error: 'No user logged in' };
    }

    try {
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
        return { success: true };
    } catch (error) {
        console.error('Reauthentication error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// Change password
async function changePassword(currentPassword, newPassword) {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, error: 'No user logged in' };
    }

    try {
        // First reauthenticate
        const reauthResult = await reauthenticate(currentPassword);
        if (!reauthResult.success) {
            return reauthResult;
        }

        // Then change password
        await user.updatePassword(newPassword);
        return { success: true };
    } catch (error) {
        console.error('Change password error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}
