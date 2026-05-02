// src/utils/faceCropper.js
//
// Auto face-detect + portrait-crop utility for player registration images.
// Lazy-loads face-api.js so it doesn't bloat your main bundle.
//
// Usage:
//   const blob = await cropToFace(imageUrl, 500);
//   // upload blob to Firebase Storage as a JPEG

let faceapi = null;
let modelLoaded = false;
let loadingPromise = null;

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

async function ensureLoaded() {
    if (modelLoaded) return faceapi;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        if (!faceapi) {
            faceapi = await import('face-api.js');
        }
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        modelLoaded = true;
        return faceapi;
    })();

    return loadingPromise;
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error('Could not load image. Check CORS settings on Firebase Storage.'));
        img.src = url;
    });
}

/**
 * Crops an image around the detected face, sized for portrait composition
 * with proper headspace.
 *
 * @param {string} imageUrl - Source image URL (Firebase Storage download URL works)
 * @param {number} outputSize - Output dimension in pixels (default 500)
 * @returns {Promise<Blob>} - Cropped JPEG blob, ready for upload
 *
 * Composition rules:
 *   - Crop is square, output {outputSize}x{outputSize}
 *   - Crop side ≈ 3.6× face bounding box (zoomed out enough for hair + shoulders + headspace)
 *   - Face center placed at ~42% from top (headspace above hair, less below shoulders)
 *   - Clamped to image bounds (no out-of-canvas pixels)
 */
export async function cropToFace(imageUrl, outputSize = 500) {
    const api = await ensureLoaded();
    const img = await loadImage(imageUrl);

    // Run detection
    const detection = await api.detectSingleFace(
        img,
        new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
    );

    if (!detection) {
        throw new Error('No face detected. Try a clearer photo.');
    }

    const box = detection.box; // { x, y, width, height }
    const faceCx = box.x + box.width / 2;
    const faceCy = box.y + box.height / 2;

    // Crop side: 3.6× the larger face dimension, but never bigger than the image
    // (Increased from 2.8× to give clear headspace above hair and room below chin)
    const maxFaceDim = Math.max(box.width, box.height);
    let cropSize = Math.min(maxFaceDim * 3.6, img.width, img.height);

    // Position: face center at 42% from top, horizontally centered
    // (Slightly below middle so hair gets more breathing room than chin/neck)
    let cropX = faceCx - cropSize / 2;
    let cropY = faceCy - cropSize * 0.42;

    // Clamp inside image bounds
    cropX = Math.max(0, Math.min(cropX, img.width - cropSize));
    cropY = Math.max(0, Math.min(cropY, img.height - cropSize));

    // Draw to canvas at the requested output resolution
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
        img,
        cropX, cropY, cropSize, cropSize, // source rect
        0, 0, outputSize, outputSize       // dest rect
    );

    // Convert to JPEG blob
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('Canvas export failed')),
            'image/jpeg',
            0.92
        );
    });
}