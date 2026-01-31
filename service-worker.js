const CACHE_NAME = 'photobooth-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/photobooth.html',
  '/design.html',
  '/print.html',
  '/style.css',
  '/app.js',
  '/photobooth.js',
  '/design.js',
  '/print.js',
  '/gdrive.js',
  '/firebase-config.js',
  '/firebase-auth.js',
  '/firebase-sync.js',
  '/auth-ui.js',
  '/manifest.json'
  // Note: icon files are optional, service worker will work without them
];

// URLs to never cache (Firebase and other APIs)
const noCachePatterns = [
  'firebaseio.com',
  'googleapis.com',
  'firebase.com',
  'firebasestorage.googleapis.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'accounts.google.com'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch((error) => {
          console.log('Some files failed to cache:', error);
          // Continue even if some files fail to cache
          return Promise.resolve();
        });
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          (response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

