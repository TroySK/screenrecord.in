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

// ============================================
// CENTRALIZED STATE MANAGEMENT
// ============================================

// State version for migration
const STATE_VERSION = 1;
const STORAGE_KEY = 'screenrecord_state';

// Immutable values - validation helpers
const VALID_CONFIG_KEYS = ['screen', 'camera', 'mic', 'systemAudio'];
const VALID_CONFIG_VALUES = {
    screen: 'boolean',
    camera: 'boolean',
    mic: 'boolean',
    systemAudio: 'boolean'
};

// Centralized AppState object
const AppState = {
    // Recording state (mutable)
    _mediaRecorder: null,
    _recordedChunks: [],
    _mediaStream: null,
    _animationId: null,
    _recordingCanvas: null,
    _previewCanvas: null,
    _screenVideo: null,
    _cameraVideo: null,
    _screenStream: null,
    _cameraStream: null,
    _micStream: null,
    _isRecording: false,
    _audioContext: null,
    _currentVideoId: null,
    _draftInterval: null,
    
    // Configuration (mutable, persisted)
    _config: {
        screen: false,
        camera: false,
        mic: false,
        systemAudio: false
    },
    
    // Draft state (for crash recovery)
    _currentDraft: null,
    
    // ============================================
    // CONFIG GETTERS/SETTERS WITH VALIDATION
    // ============================================
    
    get config() {
        return { ...this._config };
    },
    
    setConfig(key, value) {
        if (!VALID_CONFIG_KEYS.includes(key)) {
            console.warn(`Invalid config key: ${key}`);
            return false;
        }
        if (typeof value !== VALID_CONFIG_VALUES[key]) {
            console.warn(`Invalid config value for ${key}: expected ${VALID_CONFIG_VALUES[key]}, got ${typeof value}`);
            return false;
        }
        this._config[key] = value;
        this._persistConfig();
        return true;
    },
    
    setConfigBatch(newConfig) {
        const validated = {};
        Object.entries(newConfig).forEach(([key, value]) => {
            if (VALID_CONFIG_KEYS.includes(key) && typeof value === VALID_CONFIG_VALUES[key]) {
                validated[key] = value;
            }
        });
        this._config = { ...this._config, ...validated };
        this._persistConfig();
        return validated;
    },
    
    resetConfig() {
        this._config = {
            screen: false,
            camera: false,
            mic: false,
            systemAudio: false
        };
        this._persistConfig();
    },
    
    // ============================================
    // RECORDING STATE GETTERS/SETTERS
    // ============================================
    
    get isRecording() {
        return this._isRecording;
    },
    
    set isRecording(value) {
        this._isRecording = Boolean(value);
    },
    
    get recordedChunks() {
        return [...this._recordedChunks];
    },
    
    set recordedChunks(chunks) {
        if (Array.isArray(chunks)) {
            this._recordedChunks = chunks;
        }
    },
    
    addRecordedChunk(chunk) {
        if (chunk && chunk instanceof Blob) {
            this._recordedChunks.push(chunk);
        }
    },
    
    clearRecordedChunks() {
        this._recordedChunks = [];
    },
    
    get mediaRecorder() {
        return this._mediaRecorder;
    },
    
    set mediaRecorder(recorder) {
        this._mediaRecorder = recorder;
    },
    
    get mediaStream() {
        return this._mediaStream;
    },
    
    set mediaStream(stream) {
        this._mediaStream = stream;
    },
    
    get animationId() {
        return this._animationId;
    },
    
    set animationId(id) {
        this._animationId = id;
    },
    
    get recordingCanvas() {
        return this._recordingCanvas;
    },
    
    set recordingCanvas(canvas) {
        this._recordingCanvas = canvas;
    },
    
    get previewCanvas() {
        return this._previewCanvas;
    },
    
    set previewCanvas(canvas) {
        this._previewCanvas = canvas;
    },
    
    get screenVideo() {
        return this._screenVideo;
    },
    
    set screenVideo(video) {
        this._screenVideo = video;
    },
    
    get cameraVideo() {
        return this._cameraVideo;
    },
    
    set cameraVideo(video) {
        this._cameraVideo = video;
    },
    
    get screenStream() {
        return this._screenStream;
    },
    
    set screenStream(stream) {
        this._screenStream = stream;
    },
    
    get cameraStream() {
        return this._cameraStream;
    },
    
    set cameraStream(stream) {
        this._cameraStream = stream;
    },
    
    get micStream() {
        return this._micStream;
    },
    
    set micStream(stream) {
        this._micStream = stream;
    },
    
    get audioContext() {
        return this._audioContext;
    },
    
    set audioContext(ctx) {
        this._audioContext = ctx;
    },
    
    get currentVideoId() {
        return this._currentVideoId;
    },
    
    set currentVideoId(id) {
        this._currentVideoId = id;
    },
    
    get draftInterval() {
        return this._draftInterval;
    },
    
    set draftInterval(interval) {
        this._draftInterval = interval;
    },
    
    // ============================================
    // DRAFT MANAGEMENT
    // ============================================
    
    get currentDraft() {
        return this._currentDraft ? { ...this._currentDraft } : null;
    },
    
    saveDraft() {
        if (this._recordedChunks.length > 0) {
            this._currentDraft = {
                chunks: this._recordedChunks.slice(),
                config: { ...this._config },
                timestamp: Date.now()
            };
            this._persistDraft();
        }
    },
    
    clearDraft() {
        this._currentDraft = null;
        this._clearDraftStorage();
    },
    
    // ============================================
    // PERSISTENCE (localStorage)
    // ============================================
    
    _persistConfig() {
        try {
            const state = {
                version: STATE_VERSION,
                config: this._config,
                timestamp: Date.now()
            };
            localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to persist config:', e);
        }
    },
    
    _persistDraft() {
        try {
            sessionStorage.setItem(`${STORAGE_KEY}_draft`, JSON.stringify(this._currentDraft));
        } catch (e) {
            console.warn('Failed to persist draft:', e);
        }
    },
    
    _clearDraftStorage() {
        try {
            sessionStorage.removeItem(`${STORAGE_KEY}_draft`);
        } catch (e) {
            // Ignore
        }
    },
    
    _migrateState(oldState) {
        // Future migration logic goes here
        // For now, just return the config part
        if (oldState && oldState.config) {
            return {
                version: STATE_VERSION,
                config: oldState.config,
                timestamp: Date.now()
            };
        }
        return null;
    },
    
    restoreConfig() {
        try {
            const stored = localStorage.getItem(`${STORAGE_KEY}_config`);
            if (stored) {
                const state = JSON.parse(stored);
                
                // Check version and migrate if needed
                if (state.version && state.version < STATE_VERSION) {
                    const migrated = this._migrateState(state);
                    if (migrated) {
                        this._config = migrated.config;
                        this._persistConfig();
                        return true;
                    }
                }
                
                // Validate config
                if (state.config) {
                    const validated = {};
                    Object.entries(state.config).forEach(([key, value]) => {
                        if (VALID_CONFIG_KEYS.includes(key) && typeof value === VALID_CONFIG_VALUES[key]) {
                            validated[key] = value;
                        }
                    });
                    this._config = { ...this._config, ...validated };
                    return true;
                }
            }
        } catch (e) {
            console.warn('Failed to restore config:', e);
        }
        return false;
    },
    
    async recoverDraft() {
        try {
            const draftData = sessionStorage.getItem(`${STORAGE_KEY}_draft`);
            if (draftData) {
                const draft = JSON.parse(draftData);
                // Check if draft is less than 24 hours old
                if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
                    return draft;
                } else {
                    this.clearDraft(); // Draft too old
                }
            }
        } catch (err) {
            console.warn('Failed to recover draft:', err);
            this.clearDraft();
        }
        return null;
    },
    
    // ============================================
    // STATE RESET
    // ============================================
    
    resetRecordingState() {
        this._recordedChunks = [];
        this._mediaRecorder = null;
        this._mediaStream = null;
        this._animationId = null;
        this._recordingCanvas = null;
        this._previewCanvas = null;
        this._screenVideo = null;
        this._cameraVideo = null;
        this._screenStream = null;
        this._cameraStream = null;
        this._micStream = null;
        this._isRecording = false;
        this._audioContext = null;
        this._currentVideoId = null;
        
        if (this._draftInterval) {
            clearInterval(this._draftInterval);
            this._draftInterval = null;
        }
    }
};

// ============================================
// MEMORY MANAGEMENT & PERFORMANCE MODULE
// ============================================

// Object URL Manager - tracks and auto-revokes URLs
const URLManager = {
    urls: new Set(),
    maxURLs: 100,
    
    create(url) {
        if (this.urls.size >= this.maxURLs) {
            console.warn('URLManager: Max URL limit reached, revoking oldest');
            this.revokeOldest();
        }
        this.urls.add(url);
        return url;
    },
    
    revoke(url) {
        if (this.urls.has(url)) {
            URL.revokeObjectURL(url);
            this.urls.delete(url);
        }
    },
    
    revokeAll() {
        this.urls.forEach(url => {
            try {
                URL.revokeObjectURL(url);
            } catch (e) {
                // Ignore errors during cleanup
            }
        });
        this.urls.clear();
    },
    
    revokeOldest() {
        const oldest = this.urls.values().next().value;
        if (oldest) {
            this.revoke(oldest);
        }
    },
    
    size() {
        return this.urls.size;
    }
};

// Audio Context Manager - ensures proper cleanup
const AudioContextManager = {
    contexts: new Set(),
    
    create() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.contexts.add(ctx);
            return ctx;
        } catch (e) {
            console.warn('AudioContext creation failed:', e);
            return null;
        }
    },
    
    close(ctx) {
        if (this.contexts.has(ctx)) {
            try {
                ctx.close().then(() => {
                    this.contexts.delete(ctx);
                }).catch(e => {
                    // Context might already be closed
                    this.contexts.delete(ctx);
                });
            } catch (e) {
                this.contexts.delete(ctx);
            }
        }
    },
    
    closeAll() {
        this.contexts.forEach(ctx => {
            try {
                if (ctx.state !== 'closed') {
                    ctx.close().catch(() => {});
                }
            } catch (e) {
                // Ignore
            }
        });
        this.contexts.clear();
    },
    
    size() {
        return this.contexts.size;
    }
};

// Performance Monitor - tracks memory and frame drops
const PerformanceMonitor = {
    frames: 0,
    droppedFrames: 0,
    lastFrameTime: 0,
    recordingStartTime: 0,
    memorySamples: [],
    isMonitoring: false,
    
    start() {
        this.frames = 0;
        this.droppedFrames = 0;
        this.lastFrameTime = performance.now();
        this.recordingStartTime = Date.now();
        this.memorySamples = [];
        this.isMonitoring = true;
        
        // Sample memory every 5 seconds
        this.memoryInterval = setInterval(() => {
            this.sampleMemory();
        }, 5000);
    },
    
    stop() {
        this.isMonitoring = false;
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
            this.memoryInterval = null;
        }
    },
    
    frame() {
        if (!this.isMonitoring) return;
        
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        // Expected frame time at 30fps is ~33ms
        if (delta > 50) {
            this.droppedFrames++;
        }
        this.frames++;
    },
    
    sampleMemory() {
        if (!this.isMonitoring) return;
        
        // Use performance.memory if available (Chrome only)
        if (performance.memory) {
            this.memorySamples.push({
                timestamp: Date.now(),
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize
            });
            
            // Keep only last 100 samples
            if (this.memorySamples.length > 100) {
                this.memorySamples.shift();
            }
        }
    },
    
    getStats() {
        const duration = (Date.now() - this.recordingStartTime) / 1000;
        const fps = duration > 0 ? (this.frames / duration).toFixed(1) : 0;
        const dropRate = this.frames > 0 ? ((this.droppedFrames / (this.frames + this.droppedFrames)) * 100).toFixed(1) : 0;
        
        let memoryMB = null;
        if (this.memorySamples.length > 0) {
            const last = this.memorySamples[this.memorySamples.length - 1];
            memoryMB = (last.usedJSHeapSize / 1024 / 1024).toFixed(1);
        }
        
        return {
            fps,
            dropRate,
            frames: this.frames,
            droppedFrames: this.droppedFrames,
            duration: duration.toFixed(1),
            memoryMB
        };
    },
    
    getWarning() {
        const stats = this.getStats();
        const warnings = [];
        
        if (parseFloat(stats.dropRate) > 5) {
            warnings.push(`High frame drop rate: ${stats.dropRate}%`);
        }
        
        if (parseFloat(stats.fps) < 20 && stats.fps !== '0.0') {
            warnings.push(`Low FPS: ${stats.fps}`);
        }
        
        if (stats.memoryMB && parseFloat(stats.memoryMB) > 500) {
            warnings.push(`High memory usage: ${stats.memoryMB} MB`);
        }
        
        return warnings.length > 0 ? warnings.join('; ') : null;
    }
};

// Centralized Cleanup Function - releases all resources
function cleanupAll() {
    // Stop draft interval
    if (AppState.draftInterval) {
        clearInterval(AppState.draftInterval);
        AppState.draftInterval = null;
    }
    
    // Cancel animation frames
    if (AppState.animationId) {
        cancelAnimationFrame(AppState.animationId);
        AppState.animationId = null;
    }
    
    // Stop media recorder
    if (AppState.mediaRecorder && AppState.mediaRecorder.state !== 'inactive') {
        try {
            AppState.mediaRecorder.stop();
        } catch (e) {
            // Ignore
        }
    }
    
    // Stop all media streams
    [AppState.mediaStream, AppState.screenStream, AppState.cameraStream, AppState.micStream].forEach(stream => {
        if (stream) {
            stream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    // Ignore
                }
            });
        }
    });
    
    // Close audio contexts
    AudioContextManager.closeAll();
    AppState.audioContext = null;
    
    // Revoke all object URLs
    URLManager.revokeAll();
    
    // Clean up video elements
    [AppState.screenVideo, AppState.cameraVideo].forEach(video => {
        if (video) {
            video.pause();
            video.srcObject = null;
        }
    });
    
    // Remove preview canvas
    if (AppState.previewCanvas) {
        AppState.previewCanvas.remove();
        AppState.previewCanvas = null;
    }
    
    // Reset state
    AppState.resetRecordingState();
    
    // Stop performance monitoring
    PerformanceMonitor.stop();
}

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
    const config = AppState.config;
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
        const videoUrl = URLManager.create(URL.createObjectURL(videoBlob));
        video.src = videoUrl;
        video.onloadeddata = () => {
            canvas.width = video.videoWidth / 4; // Small thumb
            canvas.height = video.videoHeight / 4;
            video.currentTime = 1;
            video.onseeked = () => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
                URLManager.revoke(videoUrl);
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
    const chunks = AppState.recordedChunks;
    if (!chunks.length) return;

    const videoBlob = new Blob(chunks, { type: 'video/webm' });
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
    const tempUrl = URLManager.create(URL.createObjectURL(videoBlob));
    tempVideo.src = tempUrl;
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
    URLManager.revoke(tempUrl);

    const videoObj = {
        id: Date.now().toString(),
        title: `Recording ${new Date().toLocaleString()}`,
        date: new Date().toISOString(),
        thumbnail,
        videoBlob, // Store as Blob
        config: AppState.config,
        duration,
        size
    };

    try {
        await addVideo(videoObj);
        AppState.clearDraft(); // Clear draft after successful save
        populateSavedList();
        await checkQuota();
        showToast('Recording saved!', 'success');
    } catch (err) {
        ErrorHandler.handleSaveFailed();
        downloadVideo(videoBlob, 'recording.webm');
    }
}

function downloadVideo(blob, filename) {
    const url = URLManager.create(URL.createObjectURL(blob));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URLManager.revoke(url);
}

function stopRecording() {
    AppState.isRecording = false;
    
    // Stop draft interval
    if (AppState.draftInterval) {
        clearInterval(AppState.draftInterval);
        AppState.draftInterval = null;
    }
    
    // Stop performance monitoring and get stats
    PerformanceMonitor.stop();
    const perfWarning = PerformanceMonitor.getWarning();
    if (perfWarning) {
        showToast(`Recording complete. Note: ${perfWarning}`, 'warning');
    }
    
    // Close any recording popup
    if (window.recordingPopup && !window.recordingPopup.closed) {
        window.recordingPopup.close();
    }
    
    // Exit Picture-in-Picture if active
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(console.error);
    }
    
    // Stop media recorder
    if (AppState.mediaRecorder && AppState.mediaRecorder.state === 'recording') {
        try {
            AppState.mediaRecorder.stop();
        } catch (e) {
            // Ignore
        }
    }
    
    // Stop all media streams
    [AppState.mediaStream, AppState.screenStream, AppState.cameraStream, AppState.micStream].forEach(stream => {
        if (stream) {
            stream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    // Ignore
                }
            });
        }
    });
    
    // Close audio context
    if (AppState.audioContext) {
        AudioContextManager.close(AppState.audioContext);
        AppState.audioContext = null;
    }
    
    // Cancel animation
    if (AppState.animationId) {
        cancelAnimationFrame(AppState.animationId);
        AppState.animationId = null;
    }
    
    // Clean up video elements
    [AppState.screenVideo, AppState.cameraVideo].forEach(video => {
        if (video) {
            video.pause();
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
            video.srcObject = null;
        }
    });
    
    stopBtn.style.display = 'none';
    previewVideo.srcObject = null;
    if (AppState.previewCanvas) {
        AppState.previewCanvas.remove();
        AppState.previewCanvas = null;
    }
    pipInfo.classList.add('hidden');
    previewVideo.style.display = 'block'; // Ensure video is visible for next time
    previewArea.classList.add('hidden');
    saveVideo();
    AppState.clearRecordedChunks();
    AppState.resetRecordingState();
    startBtn.disabled = false;
    updateToggles(false);
}

// Media stream setup
async function getStream() {
    const config = AppState.config;
    const streams = [];
    let audioStream = null;
    let mixedAudioTrack = null;

    if (config.screen) {
        const controller = new CaptureController();
        try {
            AppState.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: config.systemAudio ? { echoCancellation: false, noiseSuppression: false, sampleRate: 48000 } : false,
                controller: controller
            });
            // Check the display surface type
            const videoTrack = AppState.screenStream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();

            // Only set focus behavior if it's a tab or window (not entire screen)
            if (settings.displaySurface === 'browser' || settings.displaySurface === 'window') {
                controller.setFocusBehavior('no-focus-change');
            }

            streams.push(AppState.screenStream);
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
            AppState.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
            streams.push(AppState.cameraStream);
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
            AppState.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
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
    audioStream = AppState.micStream;

    if (streams.length === 0) return null;

    // Mix audio if both mic and system audio are enabled
    if (config.mic && config.systemAudio && audioStream && streams[0] && streams[0].getAudioTracks().length > 0) {
        try {
            AppState.audioContext = AudioContextManager.create();
            if (AppState.audioContext) {
                const micSource = AppState.audioContext.createMediaStreamSource(audioStream);
                const systemSource = AppState.audioContext.createMediaStreamSource(new MediaStream(streams[0].getAudioTracks()));
                const destination = AppState.audioContext.createMediaStreamDestination();
                micSource.connect(destination);
                systemSource.connect(destination);
                mixedAudioTrack = destination.stream.getAudioTracks()[0];
            }
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
    const config = AppState.config;
    
    try {
        // Start performance monitoring
        PerformanceMonitor.start();
        
        AppState.mediaStream = await getStream();
        if (!AppState.mediaStream) {
            PerformanceMonitor.stop();
            ErrorHandler.handle(null, 'No valid inputs selected or permissions granted.');
            return;
        }

        let recordingStream = AppState.mediaStream;

        if (config.screen && config.camera) {
            // Extract and clone video tracks for overlay preview
            const originalScreenTrack = AppState.mediaStream.getVideoTracks()[0];
            const originalCameraTrack = AppState.mediaStream.getVideoTracks()[1];

            const screenTrack = originalScreenTrack.clone();
            const cameraTrack = originalCameraTrack.clone();

            const screenSettings = originalScreenTrack.getSettings();
            const cameraSettings = originalCameraTrack.getSettings();
            const canvasWidth = screenSettings.width || 1920;
            const canvasHeight = screenSettings.height || 1080;

            AppState.screenVideo = document.createElement('video');
            AppState.cameraVideo = document.createElement('video');
            AppState.screenVideo.muted = true;
            AppState.cameraVideo.muted = true;

            const screenPromise = new Promise((resolve) => {
                AppState.screenVideo.onloadeddata = () => {
                    AppState.screenVideo.play().then(() => resolve()).catch(console.error);
                };
            });
            const cameraPromise = new Promise((resolve) => {
                AppState.cameraVideo.onloadeddata = () => {
                    AppState.cameraVideo.play().then(() => resolve()).catch(console.error);
                };
            });

            AppState.screenVideo.srcObject = new MediaStream([screenTrack]);
            AppState.cameraVideo.srcObject = new MediaStream([cameraTrack]);

            await Promise.all([screenPromise, cameraPromise]);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                ErrorHandler.handle(null, 'Canvas not supported');
                previewVideo.srcObject = AppState.mediaStream;
                previewArea.classList.remove('hidden');
                stopBtn.style.display = 'block';
                startBtn.disabled = true;
                AppState.clearRecordedChunks();
                AppState.mediaRecorder = new MediaRecorder(AppState.mediaStream, { mimeType: 'video/webm;codecs=vp9' });
                AppState.mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) AppState.addRecordedChunk(e.data);
                };
                AppState.mediaRecorder.onstop = stopRecording;
                AppState.mediaRecorder.onerror = (e) => {
                    ErrorHandler.handle(e.error, `Recording error: ${e.error}`);
                    stopRecording();
                };
                AppState.mediaRecorder.start();
                showToast('Recording started...');
                return;
            }

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            AppState.recordingCanvas = canvas;

            const audioTracks = AppState.mediaStream.getAudioTracks();

            const draw = () => {
                PerformanceMonitor.frame();
                
                if (AppState.screenVideo.paused && AppState.screenVideo.srcObject) AppState.screenVideo.play().catch(console.error);
                if (AppState.cameraVideo.paused && AppState.cameraVideo.srcObject) AppState.cameraVideo.play().catch(console.error);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (AppState.screenVideo.readyState >= 2) {
                    ctx.drawImage(AppState.screenVideo, 0, 0, canvas.width, canvas.height);
                }
                if (AppState.cameraVideo.readyState >= 2) {
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
                    ctx.drawImage(AppState.cameraVideo, x, y, overlayWidth, overlayHeight);
                    ctx.restore();
                }
                AppState.animationId = requestAnimationFrame(draw);
            };

            draw();

            recordingStream = canvas.captureStream(30);
            audioTracks.forEach(track => recordingStream.addTrack(track));

            // For preview, use the canvas
            AppState.previewCanvas = canvas;
            AppState.previewCanvas.style.display = 'block';
            AppState.previewCanvas.style.width = '100%';
            AppState.previewCanvas.style.maxWidth = '800px';
            AppState.previewCanvas.style.height = 'auto';
            AppState.previewCanvas.style.borderRadius = '10px';
            AppState.previewCanvas.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            previewArea.insertBefore(AppState.previewCanvas, previewVideo);
            previewVideo.style.display = 'none';
        } else {
            previewVideo.srcObject = AppState.mediaStream;
        }
        previewArea.classList.remove('hidden');
        stopBtn.style.display = 'block';
        startBtn.disabled = true;

        AppState.clearRecordedChunks();
        AppState.mediaRecorder = new MediaRecorder(recordingStream, { mimeType: 'video/webm;codecs=vp9' });

        AppState.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) AppState.addRecordedChunk(e.data);
        };

        AppState.mediaRecorder.onstop = stopRecording;

        AppState.mediaRecorder.onerror = (e) => {
            ErrorHandler.handle(e.error, `Recording error: ${e.error}`);
            stopRecording();
        };

        AppState.mediaRecorder.start();
        AppState.isRecording = true;
        
        // Auto-save draft every 30 seconds during recording
        AppState.draftInterval = setInterval(() => {
            if (AppState.isRecording) {
                AppState.saveDraft();
            } else {
                clearInterval(AppState.draftInterval);
                AppState.draftInterval = null;
            }
        }, 30000);
        
        showToast('Recording started... Keep this tab active for continuous recording.');
        
        // Show Picture-in-Picture info if camera is enabled
        if (config.camera && document.pictureInPictureEnabled) {
            pipInfo.classList.remove('hidden');
        }
    } catch (err) {
        PerformanceMonitor.stop();
        ErrorHandler.handle(err, `Failed to start: ${err.message}`);
    }
}

// Handle tab visibility changes for background pause/resume
document.addEventListener('visibilitychange', () => {
    if (AppState.isRecording) {
        if (document.hidden) {
            showToast('⚠️ Tab inactive - recording may pause. Keep this tab active for continuous recording.', 'warning');
            // Try to enter Picture-in-Picture for camera video to maintain focus
            if (AppState.cameraVideo && document.pictureInPictureEnabled) {
                AppState.cameraVideo.requestPictureInPicture().then(() => {
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
            if (AppState.screenVideo && AppState.screenVideo.paused) {
                AppState.screenVideo.play().catch(err => ErrorHandler.log(err, 'screenVideo resume'));
            }
            if (AppState.cameraVideo && AppState.cameraVideo.paused) {
                AppState.cameraVideo.play().catch(err => ErrorHandler.log(err, 'cameraVideo resume'));
            }
            // Exit Picture-in-Picture if active
            if (document.pictureInPictureElement) {
                document.exitPictureInPicture().catch(err => ErrorHandler.log(err, 'exitPiP'));
            }
        }
    }
});

// UI Event Listeners
screenToggle.addEventListener('change', (e) => { AppState.setConfig('screen', e.target.checked); updateConfigSummary(); });
cameraToggle.addEventListener('change', (e) => { AppState.setConfig('camera', e.target.checked); updateConfigSummary(); });
micToggle.addEventListener('change', (e) => { AppState.setConfig('mic', e.target.checked); updateConfigSummary(); });
systemAudioToggle.addEventListener('change', (e) => { AppState.setConfig('systemAudio', e.target.checked); updateConfigSummary(); });

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
    if (AppState.cameraVideo && !document.pictureInPictureElement) {
        AppState.cameraVideo.requestPictureInPicture().then(() => {
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

async function playVideo(id) {
    try {
        const video = await getVideo(id);
        if (video && video.videoBlob) {
            // Revoke previous URL if exists
            if (modalVideo.src) {
                try {
                    URLManager.revoke(modalVideo.src);
                } catch (e) {
                    // Ignore
                }
            }
            const videoUrl = URLManager.create(URL.createObjectURL(video.videoBlob));
            modalVideo.src = videoUrl;
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
    // Restore config from localStorage
    AppState.restoreConfig();
    
    // Update UI to reflect restored config
    const config = AppState.config;
    screenToggle.checked = config.screen;
    cameraToggle.checked = config.camera;
    micToggle.checked = config.mic;
    systemAudioToggle.checked = config.systemAudio;
    
    updateConfigSummary();
    populateSavedList();
    await checkQuota();
    
    // Expose functions for onclick
    window.playVideo = playVideo;
    window.downloadSaved = downloadSaved;
    window.deleteVideo = deleteVideo;
    
    // Try to recover any draft from previous session
    const draft = await AppState.recoverDraft();
    if (draft) {
        if (confirm('Found a previous recording session that wasn\'t saved. Would you like to recover it?')) {
            AppState.recordedChunks = draft.chunks;
            AppState.setConfigBatch(draft.config);
            await saveVideo();
            showToast('Draft recovered successfully!', 'success');
        } else {
            AppState.clearDraft();
        }
    }
});

// Save draft before page unload
window.addEventListener('beforeunload', () => {
    AppState.saveDraft();
    // Perform full cleanup on page unload
    cleanupAll();
});

// Handle page visibility change - save draft and cleanup if needed
document.addEventListener('visibilitychange', () => {
    if (document.hidden && AppState.isRecording) {
        // Save draft when tab becomes hidden
        AppState.saveDraft();
    }
});

// Error handling for unsupported features
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Media devices not supported in this browser.', 'error');
    startBtn.disabled = true;
}

// Note: For full screen+camera composite, a requestAnimationFrame loop is needed for canvas capture.
// This implementation records multi-track stream directly; browsers may mix video tracks automatically.
// For precise overlay, extend with canvas loop in startRecording.