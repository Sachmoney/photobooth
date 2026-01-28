# 📸 PhotoBooth App

A modern, browser-based photobooth application that lets you capture fun photos and create photo strips directly from your web browser!

## Features

- 🎥 **Live Camera Preview** - See yourself in real-time with a mirrored view
- 📷 **Single Photo Capture** - Take individual photos with a countdown timer
- 📸 **3-Photo Strips** - Capture 3-photo strips automatically (classic photobooth style)
- 🎨 **Canva Strip Design Import** - Import custom strip templates from Canva to overlay on your photo strips
- ⏱️ **Countdown Timer** - 3-second countdown before each photo
- ✨ **Flash Effect** - Visual feedback when photos are captured
- 🖼️ **Photo Gallery** - View all your captured photos in a beautiful gallery
- 💾 **Auto-Save** - Photos are automatically saved to your browser's local storage
- ⬇️ **Download Photos** - Download individual photos or complete strips
- 🗑️ **Manage Photos** - Delete individual photos or clear the entire gallery
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A webcam or built-in camera
- HTTPS connection (required for camera access in most browsers)

### Installation

1. Clone or download this repository
2. No build process required! This is a pure HTML/CSS/JavaScript application

### Running the App

#### Option 1: Direct File Opening
Simply open `index.html` in your web browser. Note that camera access requires HTTPS in most browsers, so this may not work for camera access.

#### Option 2: Local Server (Recommended)
For full functionality including camera access, run a local server:

**Using Python:**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Using Node.js (http-server):**
```bash
npx http-server -p 8000
```

**Using PHP:**
```bash
php -S localhost:8000
```

Then open your browser and navigate to `http://localhost:8000`

#### Option 3: Deploy to Web Hosting
Upload the files to any web hosting service (GitHub Pages, Netlify, Vercel, etc.) to access via HTTPS.

## How to Use

1. **Import Strip Design** (Optional): Click "Import Strip Design from Canva" to upload a custom 3-photo strip template
2. **Adjust Design Settings**: Customize position, size, and opacity of your imported design
3. **Start Camera**: Click the "Start Camera" button to access your webcam
4. **Take Single Photo**: Click "Take Photo" for a single photo with countdown
5. **Photo Strip**: Click "Photo Strip (3)" to automatically capture 3 photos in sequence with your Canva design overlay
6. **View Gallery**: All photos appear in the gallery below
7. **Download**: Hover over a photo and click "Download" to save it
8. **Print**: Click "Print" to print any photo instantly
9. **Delete**: Hover over a photo and click "Delete" to remove it
10. **Clear Gallery**: Click "Clear Gallery" to remove all photos
11. **Stop Camera**: Click "Stop Camera" when you're done

## Technical Details

- **Pure JavaScript** - No frameworks or dependencies required
- **MediaDevices API** - Uses modern browser APIs for camera access
- **Canvas API** - Captures and processes images, composites strip designs
- **LocalStorage** - Saves photos to browser storage (persists between sessions)
- **CSS Grid & Flexbox** - Modern responsive layout
- **CSS Animations** - Smooth countdown and flash effects
- **Canva Integration** - Import and overlay custom strip designs from Canva

## Canva Strip Design Setup

To use Canva designs with this photobooth:

1. Create a 3-photo strip template in Canva
2. Export your design as a PNG or JPG
3. Import it using the "Import Strip Design from Canva" button
4. Adjust settings (recommended: Full Cover position, 100% size)
5. Take your photo strip - the design will be automatically overlaid!

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ⚠️ Camera access requires HTTPS (except localhost)

## Privacy & Security

- All photos are stored locally in your browser
- No data is sent to any server
- Camera access requires your explicit permission
- Photos persist in browser's local storage until cleared

## License

This project is open source and available for personal and commercial use.

## Credits

Made with ❤️ for capturing memories

