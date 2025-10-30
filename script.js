// Global variables
let mediaRecorder;
let recordedChunks = [];
let mediaStream;
let animationId;
let recordingCanvas;
let previewCanvas;
let screenVideo;
let cameraVideo;
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
        showToast('Video too large (>500MB). Download without saving.', 'error');
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
        console.warn('Duration fetch failed:', err);
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
        populateSavedList();
        await checkQuota();
        showToast('Recording saved!');
    } catch (err) {
        console.error('IndexedDB save failed:', err);
        showToast('Save failed. Downloading instead.', 'error');
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
            screenVideo.srcObject = null;
            screenVideo = null;
        }
        if (cameraVideo) {
            cameraVideo.pause();
            cameraVideo.srcObject = null;
            cameraVideo = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    }
    stopBtn.style.display = 'none';
    previewVideo.srcObject = null;
    if (previewCanvas) {
        previewCanvas.remove();
        previewCanvas = null;
    }
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
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: config.systemAudio ? { echoCancellation: false, noiseSuppression: false, sampleRate: 48000 } : false
            });
            streams.push(screenStream);
        } catch (err) {
            showToast(`Screen share denied: ${err.message}`, 'error');
            return null;
        }
    }

    if (config.camera) {
        try {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
            streams.push(cameraStream);
        } catch (err) {
            showToast(`Camera access denied: ${err.message}`, 'error');
            return null;
        }
    }

    if (config.mic) {
        try {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
            if (streams.length === 0) streams.push(new MediaStream()); // Empty video if only audio
        } catch (err) {
            showToast(`Microphone access denied: ${err.message}`, 'error');
            return null;
        }
    }

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
            showToast('No valid inputs selected or permissions granted.', 'error');
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
                showToast('Canvas not supported', 'error');
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
                    showToast(`Recording error: ${e.error}`, 'error');
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
            showToast(`Recording error: ${e.error}`, 'error');
            stopRecording();
        };

        mediaRecorder.start();
        isRecording = true;
        showToast('Recording started...');
    } catch (err) {
        showToast(`Failed to start: ${err.message}`, 'error');
    }
}

// Handle tab visibility changes for background pause/resume
document.addEventListener('visibilitychange', () => {
    if (isRecording && config.screen && config.camera) {
        if (document.hidden) {
            showToast('Tab inactive. Camera may pause. Keep this tab active for continuous recording.', 'warning');
        } else {
            // Resume videos on tab focus
            if (screenVideo && screenVideo.paused) {
                screenVideo.play().catch(console.error);
            }
            if (cameraVideo && cameraVideo.paused) {
                cameraVideo.play().catch(console.error);
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

clearAll.addEventListener('click', async () => {
    if (confirm('Delete all recordings?')) {
        try {
            await clearAllVideos();
            populateSavedList();
            await checkQuota();
            showToast('All recordings cleared.');
        } catch (err) {
            console.error('Failed to clear videos:', err);
            showToast('Failed to clear recordings.', 'error');
        }
    }
});

closeModal.addEventListener('click', () => modal.classList.add('hidden'));

downloadLast.addEventListener('click', async () => {
    try {
        const videos = await getAllVideos();
        if (videos.length) {
            const last = videos[0];
            if (last.videoBlob) {
                downloadVideo(last.videoBlob, `${last.title}.webm`);
            }
        }
    } catch (err) {
        console.error('Failed to download last video:', err);
        showToast('No recordings available.', 'error');
    }
});

function updateToggles(disabled = true) {
    [screenToggle, cameraToggle, micToggle, systemAudioToggle].forEach(t => t.disabled = disabled);
}

// Saved list functions
function populateSavedList() {
    getAllVideos().then(videos => {
        savedList.innerHTML = videos.length ? '' : '<p class="empty-state">No recordings yet. Start your first one!</p>';
        videos.forEach(video => {
            const card = document.createElement('div');
            card.className = 'saved-card';
            card.innerHTML = `
                <img src="${video.thumbnail}" alt="Thumbnail">
                <div class="saved-card-info">
                    <h3>${video.title}</h3>
                    <p>${new Date(video.date).toLocaleString()} | ${(video.duration || 0).toFixed(1)}s</p>
                    <p>Config: ${Object.keys(video.config).filter(k => video.config[k]).map(k => k.replace(/([A-Z])/g, ' $1').trim()).join(', ')}</p>
                    <p>Size: ${((video.size || 0) / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <div class="saved-card-actions">
                    <button class="play-btn" onclick="playVideo('${video.id}')">Play</button>
                    <button class="download-btn" onclick="downloadSaved('${video.id}')">Download</button>
                    <button class="delete-btn" onclick="deleteVideo('${video.id}')">Delete</button>
                </div>
            `;
            savedList.appendChild(card);
        });
    }).catch(err => {
        console.error('Failed to load videos:', err);
        savedList.innerHTML = '<p class="empty-state">Error loading recordings.</p>';
    });
}

async function playVideo(id) {
    try {
        const video = await getVideo(id);
        if (video && video.videoBlob) {
            modalVideo.src = URL.createObjectURL(video.videoBlob);
            modal.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Failed to play video:', err);
        showToast('Failed to play video.', 'error');
    }
}

async function downloadSaved(id) {
    try {
        const video = await getVideo(id);
        if (video && video.videoBlob) {
            downloadVideo(video.videoBlob, `${video.title}.webm`);
        }
    } catch (err) {
        console.error('Failed to download video:', err);
        showToast('Failed to download video.', 'error');
    }
}

async function deleteVideo(id) {
    if (confirm('Delete this recording?')) {
        try {
            await deleteVideoFromDB(id);
            populateSavedList();
            checkQuota();
            showToast('Recording deleted.');
        } catch (err) {
            console.error('Failed to delete video:', err);
            showToast('Failed to delete recording.', 'error');
        }
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
});

// Error handling for unsupported features
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Media devices not supported in this browser.', 'error');
    startBtn.disabled = true;
}

// Note: For full screen+camera composite, a requestAnimationFrame loop is needed for canvas capture.
// This implementation records multi-track stream directly; browsers may mix video tracks automatically.
// For precise overlay, extend with canvas loop in startRecording.