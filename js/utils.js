// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

// Default configuration values
const DEFAULT_CONFIG = {
    // Storage
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB limit
    DRAFT_AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    DRAFT_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    
    // Recording
    DEFAULT_VIDEO_WIDTH: 1920,
    DEFAULT_VIDEO_HEIGHT: 1080,
    CAMERA_WIDTH: 1280,
    CAMERA_HEIGHT: 720,
    RECORDING_FPS: 30,
    VIDEO_MIME_TYPE: 'video/webm;codecs=vp9',
    
    // Resolution options (for quality settings UI)
    RESOLUTION_OPTIONS: [
        { width: 854, height: 480, label: '480p' },
        { width: 1280, height: 720, label: '720p' },
        { width: 1920, height: 1080, label: '1080p' },
        { width: 2560, height: 1440, label: '1440p' },
        { width: 3840, height: 2160, label: '4K' }
    ],
    
    // Frame rate options
    FRAME_RATE_OPTIONS: [15, 30, 60],
    
    // Codec preferences (in order of preference)
    CODEC_PREFERENCES: ['vp9', 'vp8', 'h264'],
    
    // Canvas overlay
    OVERLAY_SCALE: 0.2, // 20% of screen width
    OVERLAY_CORNER_RADIUS: 30,
    OVERLAY_MARGIN: 10,
    
    // Performance
    MAX_URLS: 100,
    MEMORY_SAMPLE_INTERVAL: 5000,
    FRAME_DROP_THRESHOLD: 50, // ms
    
    // Timeouts
    VIDEO_METADATA_TIMEOUT: 10000, // 10 seconds
    THUMBNAIL_CAPTURE_TIMEOUT: 10000, // 10 seconds
    TOAST_DURATION: 5000, // 5 seconds
    
    // Database
    DB_NAME: 'ScreenRecordDB',
    DB_VERSION: 1,
    STORE_NAME: 'videos',
    
    // UI
    MAX_TITLE_LENGTH: 100,
    SIDEBAR_OPEN_TEXT: '📁 Close',
    SIDEBAR_CLOSED_TEXT: '📁 Saved',
    EMPTY_RECORDINGS_MESSAGE: 'No recordings yet. Start your first one!',
    ERROR_LOADING_MESSAGE: 'Error loading recordings.',
    
    // Error messages
    BROWSER_NOT_SUPPORTED_TITLE: 'Browser Not Fully Supported',
    BROWSER_NOT_SUPPORTED_MESSAGE: 'Some features may not work. Please use a modern browser like Chrome, Firefox, or Edge.',
    ISSUES_LABEL: 'Issues',
    INIT_FAILED_TITLE: 'Failed to Initialize',
    INIT_FAILED_MESSAGE: 'Please refresh the page. If the problem persists, try a different browser.',
    ERROR_LABEL: 'Error',
    SCREEN_SHARING_UNSUPPORTED_MESSAGE: 'Screen sharing not supported on this device',
    
    // Storage keys
    CONFIG_STORAGE_KEY: 'screenrecord_config',
    STATE_STORAGE_KEY: 'screenrecord_state',
    DRAFT_STORAGE_KEY: 'screenrecord_draft'
};

// Configuration storage key
const CONFIG_OVERRIDE_KEY = 'screenrecord_config_override';

// Create CONFIG object with localStorage override support
export const CONFIG = createConfigWithOverride(DEFAULT_CONFIG, CONFIG_OVERRIDE_KEY);

/**
 * Creates a configuration object that can be overridden via localStorage
 * @param {Object} defaults - Default configuration values
 * @param {string} overrideKey - localStorage key for overrides
 * @returns {Proxy} - Proxy object that merges defaults with overrides
 */
function createConfigWithOverride(defaults, overrideKey) {
    // Load overrides from localStorage
    let overrides = {};
    try {
        const stored = localStorage.getItem(overrideKey);
        if (stored) {
            overrides = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load config overrides:', e);
    }
    
    // Create merged config
    const mergedConfig = { ...defaults, ...overrides };
    
    // Return a Proxy that allows reading but requires using setConfig to modify
    return new Proxy(mergedConfig, {
        get(target, prop) {
            if (prop in target) {
                return target[prop];
            }
            return undefined;
        },
        set(target, prop, value) {
            console.warn('CONFIG values should not be modified directly. Use setConfigValue() instead.');
            return false;
        },
        has(target, prop) {
            return prop in target;
        },
        ownKeys(target) {
            return Object.keys(target);
        },
        getOwnPropertyDescriptor(target, prop) {
            if (prop in target) {
                return {
                    value: target[prop],
                    enumerable: true,
                    configurable: true,
                    writable: false
                };
            }
            return undefined;
        }
    });
}

/**
 * Set a configuration value (persists to localStorage)
 * @param {string} key - Configuration key
 * @param {*} value - Configuration value
 * @param {boolean} persist - Whether to persist to localStorage (default: true)
 * @returns {boolean} - Whether the operation succeeded
 */
export function setConfigValue(key, value, persist = true) {
    if (!(key in DEFAULT_CONFIG)) {
        console.warn(`Unknown config key: ${key}`);
        return false;
    }
    
    // Validate value type
    const expectedType = typeof DEFAULT_CONFIG[key];
    if (typeof value !== expectedType) {
        console.warn(`Config value for "${key}" must be of type ${expectedType}`);
        return false;
    }
    
    // Update in-memory config
    CONFIG[key] = value;
    
    if (persist) {
        try {
            let overrides = {};
            const stored = localStorage.getItem(CONFIG_OVERRIDE_KEY);
            if (stored) {
                overrides = JSON.parse(stored);
            }
            overrides[key] = value;
            localStorage.setItem(CONFIG_OVERRIDE_KEY, JSON.stringify(overrides));
        } catch (e) {
            console.warn('Failed to persist config override:', e);
        }
    }
    
    return true;
}

/**
 * Get a configuration value
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} - Configuration value
 */
export function getConfigValue(key, defaultValue = undefined) {
    if (key in CONFIG) {
        return CONFIG[key];
    }
    return defaultValue;
}

/**
 * Reset configuration to defaults (clears overrides)
 * @param {boolean} persist - Whether to clear localStorage (default: true)
 */
export function resetConfig(persist = true) {
    if (persist) {
        try {
            localStorage.removeItem(CONFIG_OVERRIDE_KEY);
        } catch (e) {
            console.warn('Failed to clear config overrides:', e);
        }
    }
    // Reload page to apply defaults
    window.location.reload();
}

/**
 * Get all configuration overrides
 * @returns {Object} - Current overrides
 */
export function getConfigOverrides() {
    try {
        const stored = localStorage.getItem(CONFIG_OVERRIDE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load config overrides:', e);
    }
    return {};
}

/**
 * Apply a batch of configuration values
 * @param {Object} values - Object with key-value pairs to set
 * @returns {Object} - Object with keys that were successfully set
 */
export function setConfigBatch(values) {
    const result = {};
    Object.entries(values).forEach(([key, value]) => {
        if (setConfigValue(key, value, false)) {
            result[key] = value;
        }
    });
    
    // Persist all at once
    if (Object.keys(result).length > 0) {
        try {
            let overrides = {};
            const stored = localStorage.getItem(CONFIG_OVERRIDE_KEY);
            if (stored) {
                overrides = JSON.parse(stored);
            }
            Object.assign(overrides, result);
            localStorage.setItem(CONFIG_OVERRIDE_KEY, JSON.stringify(overrides));
        } catch (e) {
            console.warn('Failed to persist config batch:', e);
        }
    }
    
    return result;
}

/**
 * Export current configuration (for debugging/settings)
 * @returns {Object} - Full configuration with defaults and overrides
 */
export function exportConfig() {
    return {
        defaults: DEFAULT_CONFIG,
        overrides: getConfigOverrides(),
        effective: CONFIG
    };
}

// State management
export const STATE_VERSION = 1;
export const STORAGE_KEY = CONFIG.STATE_STORAGE_KEY;

// Valid config keys
export const VALID_CONFIG_KEYS = ['screen', 'camera', 'mic', 'systemAudio'];
export const VALID_CONFIG_VALUES = {
    screen: 'boolean',
    camera: 'boolean',
    mic: 'boolean',
    systemAudio: 'boolean'
};

// ============================================
// DOM ELEMENT FACTORY
// ============================================

export function createElement(tag, attributes = {}, children = []) {
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

// ============================================
// INPUT SANITIZATION
// ============================================

export function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function sanitizeTitle(title) {
    const sanitized = sanitizeHTML(title);
    return sanitized.length > 100 ? sanitized.substring(0, 100) + '...' : sanitized;
}

// ============================================
// ERROR HANDLING
// ============================================

export const ErrorHandler = {
    log: (error, context = 'Unknown') => {
        console.error(`[Error] ${context}:`, error.message || error);
    },
    
    handle: (error, userMessage = 'An error occurred', showToast = null) => {
        ErrorHandler.log(error, 'User Action');
        if (showToast) showToast(userMessage, 'error');
    },
    
    handlePermissionDenied: (feature, showToast = null) => {
        const messages = {
            'screen': 'Screen sharing was denied. Please allow access and try again.',
            'camera': 'Camera access was denied. Please allow access in browser settings.',
            'microphone': 'Microphone access was denied. Please allow access in browser settings.'
        };
        if (showToast) showToast(messages[feature] || `${feature} access denied`, 'error');
    },
    
    handleStorageFull: (showToast = null) => {
        if (showToast) showToast('Storage is full. Please delete some recordings or download and clear.', 'error');
    },
    
    handleSaveFailed: (showToast = null) => {
        if (showToast) showToast('Save failed. Downloading recording instead.', 'error');
    }
};

// ============================================
// URL MANAGER
// ============================================

export const URLManager = {
    urls: new Set(),
    maxURLs: CONFIG.MAX_URLS,
    
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

// ============================================
// AUDIO CONTEXT MANAGER
// ============================================

export const AudioContextManager = {
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
                }).catch(() => {
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

// ============================================
// PERFORMANCE MONITOR
// ============================================

export const PerformanceMonitor = {
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
        
        this.memoryInterval = setInterval(() => {
            this.sampleMemory();
        }, CONFIG.MEMORY_SAMPLE_INTERVAL);
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
        
        if (delta > CONFIG.FRAME_DROP_THRESHOLD) {
            this.droppedFrames++;
        }
        this.frames++;
    },
    
    sampleMemory() {
        if (!this.isMonitoring) return;
        
        if (performance.memory) {
            this.memorySamples.push({
                timestamp: Date.now(),
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize
            });
            
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

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 MB';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
}

export function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

export function generateVideoTitle() {
    return `Recording ${new Date().toLocaleString()}`;
}

export function generateSafeFilename(title) {
    return sanitizeTitle(title).replace(/[^a-z0-9]/gi, '_');
}

// Wait for video to have dimensions
export function waitForVideoDimensions(video) {
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

// Generate thumbnail from video blob
export function generateThumbnail(videoBlob) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const videoUrl = URLManager.create(URL.createObjectURL(videoBlob));
        
        let completed = false;
        
        const cleanup = () => {
            if (!completed) {
                completed = true;
                URLManager.revoke(videoUrl);
            }
        };
        
        const doCapture = () => {
            if (completed) return;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = video.videoWidth / 4;
                canvas.height = video.videoHeight / 4;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                cleanup();
                resolve(dataUrl);
            }
        };
        
        video.src = videoUrl;
        video.muted = true;
        video.playsInline = true;
        
        // Wait for video to be ready
        video.onloadedmetadata = () => {
            if (completed) return;
            // Seek to a valid position
            if (video.duration > 0) {
                video.currentTime = Math.min(0.1, video.duration * 0.1);
            } else {
                // If duration is not available, try to capture immediately
                doCapture();
            }
        };
        
        video.onseeked = () => {
            if (completed) return;
            doCapture();
        };
        
        video.onloadeddata = () => {
            if (completed) return;
            // Sometimes onloadeddata fires before onloadedmetadata
            if (video.readyState >= 2 && video.videoWidth > 0) {
                doCapture();
            }
        };
        
        video.onerror = () => {
            cleanup();
            resolve(null);
        };
        
        // Timeout fallback - 10 seconds
        setTimeout(() => {
            if (!completed) {
                // Try one last capture
                if (video.videoWidth > 0) {
                    doCapture();
                } else {
                    cleanup();
                    resolve(null);
                }
            }
        }, 10000);
    });
}

// Estimate storage usage
export async function estimateStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
    }
    return 0;
}