// Firebase Configuration
// Initialize Firebase with your project configuration

// Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyDR77TM4FOuPDzgBB8HOaLzIhgzF5BJ-XY",
    authDomain: "photobooth-b716d.firebaseapp.com",
    projectId: "photobooth-b716d",
    storageBucket: "photobooth-b716d.firebasestorage.app",
    messagingSenderId: "795308725912",
    appId: "1:795308725912:web:ac106035fcdc69ac8ae2ed",
    measurementId: "G-VRF4NELF3D"
};

// Storage keys for Firebase config
const FirebaseStorageKeys = {
    CONFIG: 'photobooth-firebase-config',
    SYNC_QUEUE: 'photobooth-sync-queue',
    LAST_SYNC: 'photobooth-last-sync',
    SYNC_ENABLED: 'photobooth-sync-enabled'
};

// Firebase instances (initialized after config is loaded)
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;
let firebaseInitialized = false;

// Get saved Firebase config from localStorage
function getFirebaseConfig() {
    try {
        const saved = localStorage.getItem(FirebaseStorageKeys.CONFIG);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading Firebase config:', error);
    }
    return null;
}

// Save Firebase config to localStorage
function saveFirebaseConfig(config) {
    try {
        localStorage.setItem(FirebaseStorageKeys.CONFIG, JSON.stringify(config));
        return true;
    } catch (error) {
        console.error('Error saving Firebase config:', error);
        return false;
    }
}

// Check if Firebase is configured
function isFirebaseConfigured() {
    const config = getFirebaseConfig();
    return config && config.apiKey && config.projectId;
}

// Initialize Firebase
async function initializeFirebase(config = null) {
    // Use provided config or get from storage
    const firebaseConf = config || getFirebaseConfig();

    if (!firebaseConf || !firebaseConf.apiKey || !firebaseConf.projectId) {
        console.log('Firebase not configured');
        return false;
    }

    // Check if Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        return false;
    }

    try {
        // Check if already initialized
        if (firebaseInitialized && firebaseApp) {
            console.log('Firebase already initialized');
            return true;
        }

        // Initialize Firebase app
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(firebaseConf);
        } else {
            firebaseApp = firebase.apps[0];
        }

        // Initialize Auth
        firebaseAuth = firebase.auth();

        // Enable persistence for auth
        await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        // Initialize Firestore
        firebaseDb = firebase.firestore();

        // Enable offline persistence for Firestore
        try {
            await firebaseDb.enablePersistence({ synchronizeTabs: true });
            console.log('Firestore offline persistence enabled');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a time
                console.log('Firestore persistence unavailable: multiple tabs open');
            } else if (err.code === 'unimplemented') {
                // The current browser does not support persistence
                console.log('Firestore persistence not supported in this browser');
            }
        }

        // Initialize Storage
        firebaseStorage = firebase.storage();

        firebaseInitialized = true;
        console.log('Firebase initialized successfully');

        // Save config if provided
        if (config) {
            saveFirebaseConfig(config);
        }

        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('firebaseInitialized', { detail: { success: true } }));

        return true;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        window.dispatchEvent(new CustomEvent('firebaseInitialized', { detail: { success: false, error } }));
        return false;
    }
}

// Get Firebase Auth instance
function getFirebaseAuth() {
    return firebaseAuth;
}

// Get Firestore instance
function getFirebaseDb() {
    return firebaseDb;
}

// Get Firebase Storage instance
function getFirebaseStorage() {
    return firebaseStorage;
}

// Check if Firebase is initialized
function isFirebaseInitialized() {
    return firebaseInitialized;
}

// Clear Firebase config
function clearFirebaseConfig() {
    try {
        localStorage.removeItem(FirebaseStorageKeys.CONFIG);
        return true;
    } catch (error) {
        console.error('Error clearing Firebase config:', error);
        return false;
    }
}

// Auto-initialize Firebase when SDK is ready
function autoInitFirebase() {
    if (isFirebaseConfigured()) {
        initializeFirebase();
    }
}

// Wait for Firebase SDK to load and auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Give Firebase SDK time to load
        setTimeout(autoInitFirebase, 500);
    });
} else {
    setTimeout(autoInitFirebase, 500);
}
