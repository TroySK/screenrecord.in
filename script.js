// Global variables
let mediaRecorder;
let recordedChunks = [];
let mediaStream;
let animationId;
let recordingCanvas;
let previewCanvas;
let screenVideo;
let cameraVideo;
let screenStream;
let cameraStream;
let micStream;
let config = { screen: false, camera: false, mic: false, systemAudio: false };
let isRecording = false;
let audioContext = null;
let currentVideoId = null;

// DOM elements
const screenToggle = document.getElementById('screen-toggle');
const cameraToggle = document.getElementById('camera-toggle');
const micToggle = document.getElementById('mic-toggle');
const systemAudioToggle = document.getElementById('system-audio-toggle');
const startBtn = document.getElementById('start-recording');
const stopBtn = document.getElementById('stop-recording');
const previewArea = document.getElementById('preview-area');
const previewVideo = document.getElementById('preview-video');
const pipInfo = document.getElementById('pip-info');
const enablePipBtn = document.getElementById('enable-pip');
const configSummary = document.getElementById('config-summary');
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggle-sidebar');
const savedList = document.getElementById('saved-list');
const clearAll = document.getElementById('clear-all');
const newRecording = document.getElementById('new-recording');
const modal = document.getElementById('modal-player');
const modalVideo = document.getElementById('modal-video');
const closeModal = document.querySelector('.close');
const closeSidebar = document.getElementById('close-sidebar');
const storageInfo = document.getElementById('storage-info');
const errorNotifications = document.getElementById('error-notifications');
const downloadLast = document.getElementById('download-last');

// Utility functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    errorNotifications.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Input sanitization
function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function sanitizeTitle(title) {
    // Remove any HTML tags and limit length
    const sanitized = sanitizeHTML(title);
    return sanitized.length > 100 ? sanitized.substring(0, 100) + '...' : sanitized;
}

// DOM element factory to prevent HTML injection
function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.substring(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key === 'textContent') {
            element.textContent = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });
    
    return element;
}

// Centralized error handler
const ErrorHandler = {
    log: (error, context = 'Unknown') => {
        // Client-side only logging, privacy-respecting
        console.error(`[Error] ${context}:`, error.message || error);
        // Could add to a local error log array for debugging
    },
    
    handle: (error, userMessage = 'An error occurred') => {
        ErrorHandler.log(error, 'User Action');
        showToast(userMessage, 'error');
    },
    
    handlePermissionDenied: (feature) => {
        const messages = {
            'screen': 'Screen sharing was denied. Please allow access and try again.',
            'camera': 'Camera access was denied. Please allow access in browser settings.',
            'microphone': 'Microphone access was denied. Please allow access in browser settings.'
        };
        showToast(messages[feature] || `${feature} access denied`, 'error');
    },
    
    handleStorageFull: () => {
        showToast('Storage is full. Please delete some recordings or download and clear.', 'error');
    },
    
    handleSaveFailed: () => {
        showToast('Save failed. Downloading recording instead.', 'error');
    }
};

// IndexedDB setup
const DB_NAME = 'ScreenRecordDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('date', 'date', { unique: false });
            }
        };
    });
}

async function addVideo(videoObj) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.add(videoObj);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getAllVideos() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.reverse()); // Newest first
        request.onerror = () => reject(request.error);
    });
}

async function getVideo(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteVideoFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function clearAllVideos() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function estimateStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage ? estimate.usage : 0;
    }
    return 0;
}

function updateConfigSummary() {
    const active = Object.entries(config).filter(([k, v]) => v).map(([k]) => k.replace(/([A-Z])/g, ' $1').trim()).join(', ');
    configSummary.textContent = active ? `Selected: ${active}` : 'Select inputs to start';
    startBtn.disabled = !Object.values(config).some(v => v);
}

async function checkQuota() {
    try {
        const used = await estimateStorageUsage();
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const quota = estimate.quota || 0;
            storageInfo.textContent = `${(used / 1024 / 1024).toFixed(2)} MB / ${(quota / 1024 / 1024).toFixed(0)} MB`;
            if (used > quota * 0.8) {
                showToast('Storage nearing limit. Consider deleting old recordings.', 'warning');
            }
        } else {
            storageInfo.textContent = `${(used / 1024 / 1024).toFixed(2)} MB`;
        }
    } catch (err) {
        storageInfo.textContent = 'Storage info unavailable';
    }
}

function generateThumbnail(videoBlob) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        video.src = URL.createObjectURL(videoBlob);
        video.onloadeddata = () => {
            canvas.width = video.videoWidth / 4; // Small thumb
            canvas.height = video.videoHeight / 4;
            video.currentTime = 1;
            video.onseeked = () => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
                URL.revokeObjectURL(video.src);
            };
        };
    });
}

async function waitForVideoDimensions(video) {
    return new Promise((resolve) => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            resolve();
            return;
        }
        const check = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                resolve();
            } else {
                requestAnimationFrame(check);
            }
        };
        check();
    });
}

async function saveVideo() {
    if (!recordedChunks.length) return;

    const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
    const size = videoBlob.size;
    const maxSize = 500 * 1024 * 1024; // 500MB limit

    if (size > maxSize) {
        ErrorHandler.handleStorageFull();
        downloadVideo(videoBlob, 'recording.webm');
        return;
    }

    const thumbnail = await generateThumbnail(videoBlob);

    // Get duration
    const tempVideo = document.createElement('video');
    tempVideo.src = URL.createObjectURL(videoBlob);
    let duration = 0;
    try {
        await new Promise((resolve, reject) => {
            tempVideo.onloadedmetadata = () => {
                duration = tempVideo.duration || 0;
                resolve();
            };
            tempVideo.onerror = reject;
            tempVideo.load();
            setTimeout(reject, 5000); // Timeout for safety
        });
    } catch (err) {
        ErrorHandler.log(err, 'Duration fetch');
        duration = 0;
    }
    URL.revokeObjectURL(tempVideo.src);

    const videoObj = {
        id: Date.now().toString(),
        title: `Recording ${new Date().toLocaleString()}`,
        date: new Date().toISOString(),
        thumbnail,
        videoBlob, // Store as Blob
        config,
        duration,
        size
    };

    try {
        await addVideo(videoObj);
        clearDraft(); // Clear draft after successful save
        populateSavedList();
        await checkQuota();
        showToast('Recording saved!', 'success');
    } catch (err) {
        ErrorHandler.handleSaveFailed();
        downloadVideo(videoBlob, 'recording.webm');
    }
}

function downloadVideo(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function stopRecording() {
    isRecording = false;
    // Close any recording popup
    if (window.recordingPopup && !window.recordingPopup.closed) {
        window.recordingPopup.close();
    }
    // Exit Picture-in-Picture if active
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(console.error);
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        // Cleanup animation if overlay
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (screenVideo) {
            screenVideo.pause();
            if (screenVideo.srcObject) {
                screenVideo.srcObject.getTracks().forEach(track => track.stop());
            }
            screenVideo.srcObject = null;
            screenVideo = null;
        }
        if (cameraVideo) {
            cameraVideo.pause();
            if (cameraVideo.srcObject) {
                cameraVideo.srcObject.getTracks().forEach(track => track.stop());
            }
            cameraVideo.srcObject = null;
            cameraVideo = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    }
    // Stop individual streams to revoke permissions
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
    }
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }
    stopBtn.style.display = 'none';
    previewVideo.srcObject = null;
    if (previewCanvas) {
        previewCanvas.remove();
        previewCanvas = null;
    }
    pipInfo.classList.add('hidden');
    previewVideo.style.display = 'block'; // Ensure video is visible for next time
    previewArea.classList.add('hidden');
    saveVideo();
    recordedChunks = [];
    mediaRecorder = null;
    mediaStream = null;
    startBtn.disabled = false;
    updateToggles(false);
}

// Media stream setup
async function getStream() {
    const streams = [];
    let audioStream = null;
    let mixedAudioTrack = null;

    if (config.screen) {
        const controller = new CaptureController();
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: config.systemAudio ? { echoCancellation: false, noiseSuppression: false, sampleRate: 48000 } : false,
                controller: controller
            });
            // Check the display surface type
            const videoTrack = screenStream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();

            // Only set focus behavior if it's a tab or window (not entire screen)
            if (settings.displaySurface === 'browser' || settings.displaySurface === 'window') {
                controller.setFocusBehavior('no-focus-change');
            }

            streams.push(screenStream);
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                ErrorHandler.handlePermissionDenied('screen');
            } else {
                ErrorHandler.handle(err, `Screen share failed: ${err.message}`);
            }
            return null;
        }
    }

    if (config.camera) {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
            streams.push(cameraStream);
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                ErrorHandler.handlePermissionDenied('camera');
            } else {
                ErrorHandler.handle(err, `Camera access failed: ${err.message}`);
            }
            return null;
        }
    }

    if (config.mic) {
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
            if (streams.length === 0) streams.push(new MediaStream()); // Empty video if only audio
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                ErrorHandler.handlePermissionDenied('microphone');
            } else {
                ErrorHandler.handle(err, `Microphone access failed: ${err.message}`);
            }
            return null;
        }
    }

    // Store audioStream for later use
    audioStream = micStream;

    if (streams.length === 0) return null;

    // Mix audio if both mic and system audio are enabled
    if (config.mic && config.systemAudio && audioStream && streams[0] && streams[0].getAudioTracks().length > 0) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const micSource = audioContext.createMediaStreamSource(audioStream);
            const systemSource = audioContext.createMediaStreamSource(new MediaStream(streams[0].getAudioTracks()));
            const destination = audioContext.createMediaStreamDestination();
            micSource.connect(destination);
            systemSource.connect(destination);
            mixedAudioTrack = destination.stream.getAudioTracks()[0];
        } catch (err) {
            console.warn('Audio mixing failed, using separate tracks:', err);
            mixedAudioTrack = null;
        }
    }

    // Combine streams: Use first as base, add tracks from others
    const combined = new MediaStream();
    streams.forEach(s => {
        s.getVideoTracks().forEach(track => combined.addTrack(track)); // Only video from streams
        if (!config.systemAudio || !config.mic || !mixedAudioTrack) {
            s.getAudioTracks().forEach(track => combined.addTrack(track)); // Add audio if not mixing
        }
    });
    if (audioStream && (!config.systemAudio || !config.mic || !mixedAudioTrack)) {
        audioStream.getAudioTracks().forEach(track => combined.addTrack(track));
    }
    if (mixedAudioTrack) {
        combined.addTrack(mixedAudioTrack);
    }

    return combined;
}

async function startRecording() {
    try {
        mediaStream = await getStream();
        if (!mediaStream) {
            ErrorHandler.handle(null, 'No valid inputs selected or permissions granted.');
            return;
        }

        let recordingStream = mediaStream;

        if (config.screen && config.camera) {
            // Extract and clone video tracks for overlay preview
            const originalScreenTrack = mediaStream.getVideoTracks()[0];
            const originalCameraTrack = mediaStream.getVideoTracks()[1];

            const screenTrack = originalScreenTrack.clone();
            const cameraTrack = originalCameraTrack.clone();

            const screenSettings = originalScreenTrack.getSettings();
            const cameraSettings = originalCameraTrack.getSettings();
            const canvasWidth = screenSettings.width || 1920;
            const canvasHeight = screenSettings.height || 1080;

            screenVideo = document.createElement('video');
            cameraVideo = document.createElement('video');
            screenVideo.muted = true;
            cameraVideo.muted = true;

            const screenPromise = new Promise((resolve) => {
                screenVideo.onloadeddata = () => {
                    screenVideo.play().then(() => resolve()).catch(console.error);
                };
            });
            const cameraPromise = new Promise((resolve) => {
                cameraVideo.onloadeddata = () => {
                    cameraVideo.play().then(() => resolve()).catch(console.error);
                };
            });

            screenVideo.srcObject = new MediaStream([screenTrack]);
            cameraVideo.srcObject = new MediaStream([cameraTrack]);

            await Promise.all([screenPromise, cameraPromise]);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                ErrorHandler.handle(null, 'Canvas not supported');
                previewVideo.srcObject = mediaStream;
                previewArea.classList.remove('hidden');
                stopBtn.style.display = 'block';
                startBtn.disabled = true;
                recordedChunks = [];
                mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp9' });
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) recordedChunks.push(e.data);
                };
                mediaRecorder.onstop = stopRecording;
                mediaRecorder.onerror = (e) => {
                    ErrorHandler.handle(e.error, `Recording error: ${e.error}`);
                    stopRecording();
                };
                mediaRecorder.start();
                showToast('Recording started...');
                return;
            }

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            recordingCanvas = canvas;

            const audioTracks = mediaStream.getAudioTracks();

            const draw = () => {
                if (screenVideo.paused && screenVideo.srcObject) screenVideo.play().catch(console.error);
                if (cameraVideo.paused && cameraVideo.srcObject) cameraVideo.play().catch(console.error);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (screenVideo.readyState >= 2) {
                    ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
                }
                if (cameraVideo.readyState >= 2) {
                    // Rounded rectangle camera overlay at bottom right, preserving aspect ratio
                    const overlayWidth = canvas.width * 0.2; // 20% of screen width
                    const camAspect = cameraSettings.width / cameraSettings.height;
                    const overlayHeight = overlayWidth / camAspect;
                    const cornerRadius = 30; // Rounded corners radius
                    const x = canvas.width - overlayWidth - 10;
                    const y = canvas.height - overlayHeight - 10;
                    ctx.save();
                    ctx.beginPath();
                    // Draw rounded rectangle path for the video
                    ctx.moveTo(x + cornerRadius, y);
                    ctx.lineTo(x + overlayWidth - cornerRadius, y);
                    ctx.quadraticCurveTo(x + overlayWidth, y, x + overlayWidth, y + cornerRadius);
                    ctx.lineTo(x + overlayWidth, y + overlayHeight - cornerRadius);
                    ctx.quadraticCurveTo(x + overlayWidth, y + overlayHeight, x + overlayWidth - cornerRadius, y + overlayHeight);
                    ctx.lineTo(x + cornerRadius, y + overlayHeight);
                    ctx.quadraticCurveTo(x, y + overlayHeight, x, y + overlayHeight - cornerRadius);
                    ctx.lineTo(x, y + cornerRadius);
                    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(cameraVideo, x, y, overlayWidth, overlayHeight);
                    ctx.restore();
                }
                animationId = requestAnimationFrame(draw);
            };

            draw();

            recordingStream = canvas.captureStream(30);
            audioTracks.forEach(track => recordingStream.addTrack(track));

            // For preview, use the canvas
            previewCanvas = canvas;
            previewCanvas.style.display = 'block';
            previewCanvas.style.width = '100%';
            previewCanvas.style.maxWidth = '800px';
            previewCanvas.style.height = 'auto';
            previewCanvas.style.borderRadius = '10px';
            previewCanvas.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            previewArea.insertBefore(previewCanvas, previewVideo);
            previewVideo.style.display = 'none';
        } else {
            previewVideo.srcObject = mediaStream;
        }
        previewArea.classList.remove('hidden');
        stopBtn.style.display = 'block';
        startBtn.disabled = true;

        recordedChunks = [];
        mediaRecorder = new MediaRecorder(recordingStream, { mimeType: 'video/webm;codecs=vp9' });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = stopRecording;

        mediaRecorder.onerror = (e) => {
            ErrorHandler.handle(e.error, `Recording error: ${e.error}`);
            stopRecording();
        };

        mediaRecorder.start();
        isRecording = true;
        // Auto-save draft every 30 seconds during recording
        const draftInterval = setInterval(() => {
            if (isRecording) {
                saveDraft();
            } else {
                clearInterval(draftInterval);
            }
        }, 30000);
        showToast('Recording started... Keep this tab active for continuous recording.');
        // Show Picture-in-Picture info if camera is enabled
        if (config.camera && document.pictureInPictureEnabled) {
            pipInfo.classList.remove('hidden');
        }
    } catch (err) {
        ErrorHandler.handle(err, `Failed to start: ${err.message}`);
    }
}

// Handle tab visibility changes for background pause/resume
document.addEventListener('visibilitychange', () => {
    if (isRecording) {
        if (document.hidden) {
            showToast('⚠️ Tab inactive - recording may pause. Keep this tab active for continuous recording.', 'warning');
            // Try to enter Picture-in-Picture for camera video to maintain focus
            if (cameraVideo && document.pictureInPictureEnabled) {
                cameraVideo.requestPictureInPicture().then(() => {
                    showToast('Camera entered Picture-in-Picture mode to maintain recording.', 'info');
                }).catch(err => {
                    ErrorHandler.log(err, 'Picture-in-Picture');
                    // Fallback to popup
                    setTimeout(() => openRecordingPopup(), 100);
                });
            } else {
                // Fallback to popup if PiP not supported
                setTimeout(() => openRecordingPopup(), 100);
            }
        } else {
            // Resume videos on tab focus
            if (screenVideo && screenVideo.paused) {
                screenVideo.play().catch(err => ErrorHandler.log(err, 'screenVideo resume'));
            }
            if (cameraVideo && cameraVideo.paused) {
                cameraVideo.play().catch(err => ErrorHandler.log(err, 'cameraVideo resume'));
            }
            // Exit Picture-in-Picture if active
            if (document.pictureInPictureElement) {
                document.exitPictureInPicture().catch(err => ErrorHandler.log(err, 'exitPiP'));
            }
        }
    }
});

// UI Event Listeners
screenToggle.addEventListener('change', (e) => { config.screen = e.target.checked; updateConfigSummary(); });
cameraToggle.addEventListener('change', (e) => { config.camera = e.target.checked; updateConfigSummary(); });
micToggle.addEventListener('change', (e) => { config.mic = e.target.checked; updateConfigSummary(); });
systemAudioToggle.addEventListener('change', (e) => { config.systemAudio = e.target.checked; updateConfigSummary(); });

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    toggleSidebar.textContent = sidebar.classList.contains('open') ? '📁 Close' : '📁 Saved';
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('open');
    toggleSidebar.textContent = '📁 Saved';
});

// Close on outside click
document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggleSidebar.contains(e.target)) {
        sidebar.classList.remove('open');
        toggleSidebar.textContent = '📁 Saved';
    }
});

newRecording.addEventListener('click', () => {
    stopRecording();
    updateToggles(false);
    configSummary.textContent = 'Select inputs to start';
});

enablePipBtn.addEventListener('click', () => {
    if (cameraVideo && !document.pictureInPictureElement) {
        cameraVideo.requestPictureInPicture().then(() => {
            showToast('Camera entered Picture-in-Picture mode!', 'success');
            pipInfo.classList.add('hidden');
        }).catch(err => {
            ErrorHandler.handle(err, 'Picture-in-Picture not supported or blocked.');
        });
    }
});

clearAll.addEventListener('click', secureDeleteAll);

closeModal.addEventListener('click', () => modal.classList.add('hidden'));

downloadLast.addEventListener('click', async () => {
    try {
        const videos = await getAllVideos();
        if (videos.length) {
            const last = videos[0];
            if (last.videoBlob) {
                const safeTitle = sanitizeTitle(last.title).replace(/[^a-z0-9]/gi, '_');
                downloadVideo(last.videoBlob, `${safeTitle}.webm`);
            }
        }
    } catch (err) {
        ErrorHandler.handle(err, 'No recordings available.');
    }
});

function updateToggles(disabled = true) {
    [screenToggle, cameraToggle, micToggle, systemAudioToggle].forEach(t => t.disabled = disabled);
}

// Saved list functions
function populateSavedList() {
    getAllVideos().then(videos => {
        savedList.innerHTML = '';
        
        if (videos.length === 0) {
            const emptyMsg = createElement('p', { className: 'empty-state', textContent: 'No recordings yet. Start your first one!' });
            savedList.appendChild(emptyMsg);
            return;
        }
        
        videos.forEach(video => {
            const card = createElement('div', { className: 'saved-card' });
            
            // Thumbnail image (safe - data URL)
            const thumbnail = createElement('img', {
                src: video.thumbnail,
                alt: 'Thumbnail'
            });
            
            const info = createElement('div', { className: 'saved-card-info' });
            
            // Title - sanitized with textContent
            const title = createElement('h3', {
                textContent: sanitizeTitle(video.title)
            });
            
            // Date and duration
            const dateStr = new Date(video.date).toLocaleString();
            const durationStr = `${(video.duration || 0).toFixed(1)}s`;
            const meta1 = createElement('p', { textContent: `${dateStr} | ${durationStr}` });
            
            // Config
            const configStr = Object.keys(video.config)
                .filter(k => video.config[k])
                .map(k => k.replace(/([A-Z])/g, ' $1').trim())
                .join(', ');
            const meta2 = createElement('p', { textContent: `Config: ${configStr}` });
            
            // Size
            const sizeStr = `${((video.size || 0) / 1024 / 1024).toFixed(1)} MB`;
            const meta3 = createElement('p', { textContent: `Size: ${sizeStr}` });
            
            info.appendChild(title);
            info.appendChild(meta1);
            info.appendChild(meta2);
            info.appendChild(meta3);
            
            const actions = createElement('div', { className: 'saved-card-actions' });
            
            const playBtn = createElement('button', {
                className: 'play-btn',
                textContent: 'Play',
                onclick: () => playVideo(video.id)
            });
            
            const downloadBtn = createElement('button', {
                className: 'download-btn',
                textContent: 'Download',
                onclick: () => downloadSaved(video.id)
            });
            
            const deleteBtn = createElement('button', {
                className: 'delete-btn',
                textContent: 'Delete',
                onclick: () => deleteVideo(video.id)
            });
            
            actions.appendChild(playBtn);
            actions.appendChild(downloadBtn);
            actions.appendChild(deleteBtn);
            
            card.appendChild(thumbnail);
            card.appendChild(info);
            card.appendChild(actions);
            
            savedList.appendChild(card);
        });
    }).catch(err => {
        ErrorHandler.log(err, 'populateSavedList');
        savedList.innerHTML = '';
        const errorMsg = createElement('p', { className: 'empty-state', textContent: 'Error loading recordings.' });
        savedList.appendChild(errorMsg);
    });
}

// Draft saving for crash recovery
let currentDraft = null;

function saveDraft() {
    if (recordedChunks.length > 0) {
        currentDraft = {
            chunks: recordedChunks.slice(),
            config: { ...config },
            timestamp: Date.now()
        };
        // Store in sessionStorage for crash recovery
        try {
            sessionStorage.setItem('screenrecord_draft', JSON.stringify(currentDraft));
        } catch (e) {
            ErrorHandler.log(e, 'sessionStorage');
        }
    }
}

function clearDraft() {
    currentDraft = null;
    try {
        sessionStorage.removeItem('screenrecord_draft');
    } catch (e) {
        // Ignore
    }
}

async function recoverDraft() {
    try {
        const draftData = sessionStorage.getItem('screenrecord_draft');
        if (draftData) {
            const draft = JSON.parse(draftData);
            // Check if draft is less than 24 hours old
            if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
                if (confirm('Found a previous recording session that wasn\'t saved. Would you like to recover it?')) {
                    recordedChunks = draft.chunks;
                    config = draft.config;
                    await saveVideo();
                    clearDraft();
                    showToast('Draft recovered successfully!', 'success');
                } else {
                    clearDraft();
                }
            } else {
                clearDraft(); // Draft too old
            }
        }
    } catch (err) {
        ErrorHandler.log(err, 'recoverDraft');
        clearDraft();
    }
}

async function playVideo(id) {
    try {
        const video = await getVideo(id);
        if (video && video.videoBlob) {
            modalVideo.src = URL.createObjectURL(video.videoBlob);
            modal.classList.remove('hidden');
        }
    } catch (err) {
        ErrorHandler.handle(err, 'Failed to play video.');
    }
}

async function downloadSaved(id) {
    try {
        const video = await getVideo(id);
        if (video && video.videoBlob) {
            // Sanitize filename
            const safeTitle = sanitizeTitle(video.title).replace(/[^a-z0-9]/gi, '_');
            downloadVideo(video.videoBlob, `${safeTitle}.webm`);
        }
    } catch (err) {
        ErrorHandler.handle(err, 'Failed to download video.');
    }
}

async function deleteVideo(id) {
    const video = await getVideo(id);
    const videoTitle = sanitizeTitle(video?.title || 'this recording');
    
    if (confirm(`Delete "${videoTitle}"? This cannot be undone.`)) {
        try {
            await deleteVideoFromDB(id);
            populateSavedList();
            checkQuota();
            showToast('Recording deleted.');
        } catch (err) {
            ErrorHandler.handle(err, 'Failed to delete recording.');
        }
    }
}

// Secure delete with typing confirmation
async function secureDeleteAll() {
    const confirmationInput = prompt('Type "DELETE" to confirm deletion of ALL recordings:');
    if (confirmationInput !== 'DELETE') {
        showToast('Deletion cancelled. You must type "DELETE" to confirm.', 'info');
        return;
    }
    
    try {
        await clearAllVideos();
        populateSavedList();
        await checkQuota();
        showToast('All recordings have been permanently deleted.', 'success');
    } catch (err) {
        ErrorHandler.handle(err, 'Failed to clear recordings.');
    }
}

// System audio support check
if (!navigator.mediaDevices.getDisplayMedia) {
    systemAudioToggle.disabled = true;
    systemAudioToggle.title = 'System audio requires Chrome with flag or extension';
    showToast('System audio may need browser extension.', 'info');
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    updateConfigSummary();
    populateSavedList();
    await checkQuota();
    // Expose functions for onclick
    window.playVideo = playVideo;
    window.downloadSaved = downloadSaved;
    window.deleteVideo = deleteVideo;
    // Try to recover any draft from previous session
    await recoverDraft();
});

// Save draft before page unload
window.addEventListener('beforeunload', () => {
    saveDraft();
});

// Error handling for unsupported features
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Media devices not supported in this browser.', 'error');
    startBtn.disabled = true;
}

// Note: For full screen+camera composite, a requestAnimationFrame loop is needed for canvas capture.
// This implementation records multi-track stream directly; browsers may mix video tracks automatically.
// For precise overlay, extend with canvas loop in startRecording.