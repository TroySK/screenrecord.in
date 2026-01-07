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
    VIDEO_MIME_TYPE: 'video/mp4',
    
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
    
    // Pagination
    PAGINATION_PAGE_SIZE: 10,
    
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

// ============================================
// CAPABILITIES DETECTION
// ============================================

/**
 * Browser capabilities detection object
 * Detects support for various browser features and APIs
 */
export const Capabilities = {
    // Screen sharing via getDisplayMedia
    screenSharing: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
    
    // Camera access via getUserMedia
    camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    
    // Microphone access via getUserMedia
    microphone: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    
    // Picture-in-Picture support
    pictureInPicture: !!document.pictureInPictureEnabled,
    
    // MediaRecorder API support
    mediaRecorder: !!window.MediaRecorder,
    
    // IndexedDB support
    indexedDB: !!window.indexedDB,
    
    // MediaDevices API support
    mediaDevices: !!(navigator.mediaDevices),
    
    // Secure context (required for some APIs)
    secureContext: window.isSecureContext,
    
    // Mobile device detection
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    
    // Get all unsupported features
    getUnsupported() {
        const unsupported = [];
        if (!this.screenSharing) unsupported.push('screenSharing');
        if (!this.camera) unsupported.push('camera');
        if (!this.microphone) unsupported.push('microphone');
        if (!this.pictureInPicture) unsupported.push('pictureInPicture');
        if (!this.mediaRecorder) unsupported.push('mediaRecorder');
        if (!this.indexedDB) unsupported.push('indexedDB');
        if (!this.mediaDevices) unsupported.push('mediaDevices');
        if (!this.secureContext) unsupported.push('secureContext');
        return unsupported;
    },
    
    // Check if minimum requirements are met
    isUsable() {
        return this.mediaDevices && this.mediaRecorder && this.indexedDB;
    },
    
    // Get user-friendly message for unsupported features
    getMessage(feature) {
        const messages = {
            screenSharing: 'Screen sharing is not supported on this device or browser.',
            camera: 'Camera access is not supported on this browser.',
            microphone: 'Microphone access is not supported on this browser.',
            pictureInPicture: 'Picture-in-Picture is not supported on this browser.',
            mediaRecorder: 'Media recording is not supported on this browser.',
            indexedDB: 'Local storage is not available on this browser.',
            mediaDevices: 'Media devices are not supported on this browser.',
            secureContext: 'This page must be served over HTTPS or localhost.'
        };
        return messages[feature] || `${feature} is not supported on this browser.`;
    }
};

// ============================================
// UI HELPERS FOR CAPABILITIES
// ============================================

/**
 * Hide UI elements for unsupported features
 * @param {Object} elementIds - Object mapping feature names to element IDs
 */
export function hideUnsupportedFeatures(elementIds = {}) {
    Object.entries(elementIds).forEach(([feature, elementId]) => {
        const element = document.getElementById(elementId);
        if (element && !Capabilities[feature]) {
            element.style.display = 'none';
        }
    });
}

/**
 * Show graceful degradation message for unsupported features
 * @param {string} feature - Feature name
 * @param {string} containerId - ID of container to show message in
 * @param {string} message - Optional custom message
 */
export function showCapabilityWarning(feature, containerId, message = null) {
    if (Capabilities[feature]) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const warning = document.createElement('div');
    warning.className = 'capability-warning';
    warning.dataset.feature = feature;
    warning.textContent = message || Capabilities.getMessage(feature);
    
    container.appendChild(warning);
}

/**
 * Initialize capability-based UI adjustments
 */
export function initCapabilitiesUI() {
    // Hide screen sharing on mobile (not supported)
    if (Capabilities.isMobile) {
        const screenToggle = document.getElementById('screen-toggle');
        const screenLabel = screenToggle?.closest('label');
        if (screenLabel) {
            screenLabel.style.display = 'none';
        }
        
        const systemAudioToggle = document.getElementById('system-audio-toggle');
        const systemAudioLabel = systemAudioToggle?.closest('label');
        if (systemAudioLabel) {
            systemAudioLabel.style.display = 'none';
        }
    }
    
    // Hide PiP button if not supported
    if (!Capabilities.pictureInPicture) {
        const pipInfo = document.getElementById('pip-info');
        if (pipInfo) {
            pipInfo.style.display = 'none';
        }
    }
    
    // Show warnings for critical unsupported features
    if (!Capabilities.isUsable()) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            const warning = document.createElement('div');
            warning.className = 'browser-warning';
            warning.innerHTML = `
                <h3>${CONFIG.BROWSER_NOT_SUPPORTED_TITLE}</h3>
                <p>${CONFIG.BROWSER_NOT_SUPPORTED_MESSAGE}</p>
                <p>Unsupported features: ${Capabilities.getUnsupported().join(', ')}</p>
            `;
            mainContent.prepend(warning);
        }
    }
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

// ============================================
// SMART FILE NAMING
// ============================================

// Naming pattern tokens
const NAMING_TOKENS = {
    '{date}': 'Date (YYYY-MM-DD)',
    '{time}': 'Time (HH-MM-SS)',
    '{datetime}': 'Date and Time',
    '{screen}': 'Screen',
    '{camera}': 'Camera',
    '{mic}': 'Microphone',
    '{systemAudio}': 'System Audio',
    '{duration}': 'Duration (e.g., 3m 42s)',
    '{counter}': 'Counter (1, 2, 3...)'
};

// Available naming patterns
export const NAMING_PATTERNS = {
    DETAILED: '{screen}{camera} - {duration} - {date} {time}',
    SIMPLE: '{date} - {duration}',
    MINIMAL: 'Recording {datetime}',
    CUSTOM: null
};

// Default pattern
const DEFAULT_NAMING_PATTERN = NAMING_PATTERNS.DETAILED;

// Storage key for naming pattern
const NAMING_PATTERN_KEY = 'screenrecord_naming_pattern';

/**
 * Get the current naming pattern from storage
 * @returns {string} Current naming pattern
 */
export function getNamingPattern() {
    try {
        const stored = localStorage.getItem(NAMING_PATTERN_KEY);
        if (stored) {
            return stored;
        }
    } catch (e) {
        console.warn('Failed to get naming pattern:', e);
    }
    return DEFAULT_NAMING_PATTERN;
}

/**
 * Save naming pattern to storage
 * @param {string} pattern - Naming pattern to save
 */
export function saveNamingPattern(pattern) {
    try {
        localStorage.setItem(NAMING_PATTERN_KEY, pattern);
    } catch (e) {
        console.warn('Failed to save naming pattern:', e);
    }
}

/**
 * Get available naming pattern options
 * @returns {Array} Array of pattern options
 */
export function getNamingPatternOptions() {
    return [
        { value: NAMING_PATTERNS.DETAILED, label: 'Detailed', example: 'Screen+Camera - 3m 42s - 2024-01-15 14-30-00' },
        { value: NAMING_PATTERNS.SIMPLE, label: 'Simple', example: '2024-01-15 - 3m 42s' },
        { value: NAMING_PATTERNS.MINIMAL, label: 'Minimal', example: 'Recording 2024-01-15 14:30:00' },
        { value: NAMING_PATTERNS.CUSTOM, label: 'Custom', example: '(Edit pattern below)' }
    ];
}

/**
 * Get available tokens for custom patterns
 * @returns {Array} Array of token options
 */
export function getNamingTokens() {
    return Object.entries(NAMING_TOKENS).map(([token, description]) => ({
        token,
        description
    }));
}

/**
 * Format duration in human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "3m 42s")
 */
export function formatDurationSmart(seconds) {
    if (!seconds || seconds < 0) return '0s';
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}

/**
 * Generate a smart filename based on configuration and pattern
 * @param {Object} options - Options for filename generation
 * @param {Object} options.config - Recording configuration (screen, camera, mic, systemAudio)
 * @param {number} options.duration - Recording duration in seconds
 * @param {number} options.counter - Optional counter for duplicate prevention
 * @param {string} options.pattern - Optional custom pattern (uses default if not provided)
 * @returns {string} Generated filename (without extension)
 */
export function generateSmartFilename(options = {}) {
    const { config = {}, duration = 0, counter = null, pattern = null } = options;
    
    const activePattern = pattern || getNamingPattern();
    
    // Get date/time components
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Build source parts based on config
    const sources = [];
    if (config.screen) sources.push('Screen');
    if (config.camera) sources.push('Camera');
    if (config.mic) sources.push('Mic');
    if (config.systemAudio) sources.push('SystemAudio');
    
    const sourceStr = sources.join('+');
    
    // Format duration
    const durationStr = formatDurationSmart(duration);
    
    // Build replacements map
    const replacements = {
        '{date}': `${year}-${month}-${day}`,
        '{time}': `${hours}-${minutes}-${seconds}`,
        '{datetime}': `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
        '{screen}': config.screen ? 'Screen' : '',
        '{camera}': config.camera ? 'Camera' : '',
        '{mic}': config.mic ? 'Mic' : '',
        '{systemAudio}': config.systemAudio ? 'SystemAudio' : '',
        '{duration}': durationStr,
        '{counter}': counter !== null ? String(counter) : ''
    };
    
    // Generate filename
    let filename = activePattern;
    
    // Replace tokens
    Object.entries(replacements).forEach(([token, value]) => {
        filename = filename.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    // Clean up: remove consecutive spaces and trim
    filename = filename.replace(/\s+/g, ' ').trim();
    
    // Remove empty parts (e.g., " - " when no sources)
    filename = filename.replace(/\s*-\s*/g, '-').replace(/^-+|-+$/g, '');
    
    // Ensure filename is not empty
    if (!filename || filename === '-') {
        filename = `Recording ${replacements['{date}']} ${replacements['{time}']}`;
    }
    
    return filename;
}

/**
 * Generate a unique filename with timestamp suffix if needed
 * @param {Object} options - Options for filename generation
 * @returns {string} Unique filename (without extension)
 */
export function generateUniqueFilename(options = {}) {
    const filename = generateSmartFilename(options);
    
    // Add timestamp suffix to prevent duplicates
    const timestamp = Date.now().toString(36).toUpperCase();
    
    return `${filename} [${timestamp}]`;
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

// ============================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================

export const RetryManager = {
    // Default retry configuration
    defaultConfig: {
        maxRetries: 3,
        initialDelay: 1000, // 1 second
        maxDelay: 30000, // 30 seconds
        backoffMultiplier: 2,
        jitterFactor: 0.1, // 10% jitter
        retryableErrors: [
            'NotAllowedError',
            'NotFoundError',
            'AbortError',
            'SourceUnavailable',
            'QuotaExceededError',
            'InvalidStateError',
            'NotReadableError'
        ]
    },
    
    /**
     * Calculate delay with exponential backoff and jitter
     * @param {number} attempt - Current attempt number (0-indexed)
     * @param {Object} config - Retry configuration
     * @returns {number} - Delay in milliseconds
     */
    calculateDelay(attempt, config = {}) {
        const cfg = { ...this.defaultConfig, ...config };
        const delay = Math.min(
            cfg.initialDelay * Math.pow(cfg.backoffMultiplier, attempt),
            cfg.maxDelay
        );
        // Add jitter (random variation)
        const jitter = delay * cfg.jitterFactor;
        return delay + (Math.random() * 2 - 1) * jitter;
    },
    
    /**
     * Check if an error is retryable
     * @param {Error} error - The error to check
     * @param {Object} config - Retry configuration
     * @returns {boolean} - Whether the error is retryable
     */
    isRetryable(error, config = {}) {
        const cfg = { ...this.defaultConfig, ...config };
        if (!error || !error.name) return false;
        
        // Check if error name is in retryable list
        if (cfg.retryableErrors.includes(error.name)) return true;
        
        // Check for specific error messages
        const message = error.message?.toLowerCase() || '';
        const retryableMessages = [
            'permission denied',
            'not allowed',
            'not found',
            'aborted',
            'quota exceeded',
            'storage full',
            'invalid state',
            'not readable'
        ];
        
        return retryableMessages.some(msg => message.includes(msg));
    },
    
    /**
     * Execute a function with retry logic
     * @param {Function} fn - Async function to execute
     * @param {Object} options - Retry options
     * @returns {Promise<*>} - Result of the function
     */
    async execute(fn, options = {}) {
        const config = { ...this.defaultConfig, ...options };
        let lastError;
        
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            try {
                return await fn(attempt);
            } catch (error) {
                lastError = error;
                
                // Check if we should retry
                if (attempt >= config.maxRetries || !this.isRetryable(error, config)) {
                    throw error;
                }
                
                // Calculate and wait for delay
                const delay = this.calculateDelay(attempt, config);
                
                // Call onRetry callback if provided
                if (config.onRetry) {
                    config.onRetry({
                        error,
                        attempt: attempt + 1,
                        maxRetries: config.maxRetries,
                        delay
                    });
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    },
    
    /**
     * Create a retryable version of a function
     * @param {Function} fn - Async function to wrap
     * @param {Object} options - Retry options
     * @returns {Function} - Retryable function
     */
    wrap(fn, options = {}) {
        return async (...args) => {
            return this.execute(() => fn(...args), options);
        };
    }
};

// ============================================
// PERMISSION REQUEST WITH RETRY
// ============================================

export const PermissionManager = {
    // Track permission state
    permissionStates: {},
    
    // User education messages
    educationMessages: {
        'screen': {
            title: 'Screen Sharing Permission Needed',
            message: 'To record your screen, please select a window or screen to share. Make sure to check "Share audio" if you want to include system sound.',
            tip: 'Tip: If you accidentally clicked "Block", click the lock icon in your browser address bar to reset permissions.'
        },
        'camera': {
            title: 'Camera Permission Needed',
            message: 'To record with camera, please allow access when prompted. Your camera will only be used during recording.',
            tip: 'Tip: Check that your camera is not being used by another application.'
        },
        'microphone': {
            title: 'Microphone Permission Needed',
            message: 'To record audio, please allow microphone access when prompted. Your microphone will only be used during recording.',
            tip: 'Tip: If using external microphone, make sure it\'s selected as the default input device.'
        }
    },
    
    /**
     * Request permission with automatic retry on denial
     * @param {string} feature - Feature name ('screen', 'camera', 'microphone')
     * @param {Function} requestFn - Async function that requests permission
     * @param {Object} options - Options including showToast callback
     * @returns {Promise<*>} - Result of the request function
     */
    async requestWithRetry(feature, requestFn, options = {}) {
        const { showToast, maxRetries = 1 } = options;
        const education = this.educationMessages[feature];
        
        // First attempt
        try {
            return await requestFn();
        } catch (error) {
            if (error.name !== 'NotAllowedError') {
                throw error;
            }
            
            // Show user education message
            if (education && showToast) {
                showToast(education.message, 'info');
                console.info(`[Permission] User education shown for ${feature}`);
            }
            
            // Retry once after education
            if (maxRetries >= 1) {
                // Small delay to let user read the message
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                try {
                    return await requestFn();
                } catch (retryError) {
                    // If still denied, show tip
                    if (retryError.name === 'NotAllowedError' && education && showToast) {
                        showToast(education.tip, 'warning');
                    }
                    throw retryError;
                }
            }
            
            throw error;
        }
    },
    
    /**
     * Request screen share with retry
     * @param {Object} options - Options for getDisplayMedia
     * @param {Function} showToast - Toast notification function
     * @returns {Promise<MediaStream>} - Screen stream
     */
    async requestScreenShare(options = {}, showToast = null) {
        return this.requestWithRetry('screen', async () => {
            const controller = new CaptureController();
            return navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: options.audio || false,
                controller: controller
            });
        }, { showToast, maxRetries: 1 });
    },
    
    /**
     * Request camera access with retry
     * @param {Object} options - Options for getUserMedia
     * @param {Function} showToast - Toast notification function
     * @returns {Promise<MediaStream>} - Camera stream
     */
    async requestCamera(options = {}, showToast = null) {
        return this.requestWithRetry('camera', async () => {
            return navigator.mediaDevices.getUserMedia({
                video: options.video || { width: { ideal: CONFIG.CAMERA_WIDTH }, height: { ideal: CONFIG.CAMERA_HEIGHT } },
                audio: options.audio || false
            });
        }, { showToast, maxRetries: 1 });
    },
    
    /**
     * Request microphone access with retry
     * @param {Object} options - Options for getUserMedia
     * @param {Function} showToast - Toast notification function
     * @returns {Promise<MediaStream>} - Microphone stream
     */
    async requestMicrophone(options = {}, showToast = null) {
        return this.requestWithRetry('microphone', async () => {
            return navigator.mediaDevices.getUserMedia({
                audio: options.audio || { echoCancellation: true, noiseSuppression: true }
            });
        }, { showToast, maxRetries: 1 });
    },
    
    /**
     * Check current permission status
     * @param {string} feature - Feature name
     * @returns {Promise<string>} - Permission state ('granted', 'denied', 'prompt')
     */
    async checkPermission(feature) {
        const featureMap = {
            'screen': 'display-capture',
            'camera': 'camera',
            'microphone': 'microphone'
        };
        
        const permissionName = featureMap[feature];
        if (!permissionName) return 'prompt';
        
        try {
            const result = await navigator.permissions.query({ name: permissionName });
            this.permissionStates[feature] = result.state;
            return result.state;
        } catch (e) {
            return 'unknown';
        }
    }
};

// ============================================
// STORAGE OPERATIONS WITH RETRY
// ============================================

export const StorageRetry = {
    /**
     * Execute IndexedDB operation with retry
     * @param {Function} operation - Async function performing DB operation
     * @param {Object} options - Retry options
     * @returns {Promise<*>} - Result of the operation
     */
    async execute(operation, options = {}) {
        return RetryManager.execute(async (attempt) => {
            return await operation();
        }, {
            ...options,
            retryableErrors: [
                'QuotaExceededError',
                'InvalidStateError',
                'NotReadableError',
                'TransactionInactiveError'
            ],
            onRetry: options.onRetry ? options.onRetry : (info) => {
                console.warn(`[Storage] Retry attempt ${info.attempt}/${info.maxRetries} after error: ${info.error.message}`);
            }
        });
    },
    
    /**
     * Save video with retry on quota exceeded
     * @param {Function} saveFn - Async function to save video
     * @param {Object} options - Retry options
     * @returns {Promise<*>} - Result of save operation
     */
    async saveWithRetry(saveFn, options = {}) {
        return this.execute(saveFn, {
            maxRetries: 2,
            initialDelay: 500,
            ...options
        });
    }
};

// ============================================
// RECOVERABLE ERROR UI COMPONENTS
// ============================================

export const ErrorRecovery = {
    /**
     * Create a "try again" button for recoverable errors
     * @param {Object} params - Parameters
     * @param {string} params.message - Error message to display
     * @param {Function} params.onRetry - Callback when button is clicked
     * @param {string} params.containerId - ID of container to append button to
     * @param {string} params.buttonText - Custom button text
     * @returns {HTMLDivElement} - The error container element
     */
    createTryAgainButton(params) {
        const {
            message,
            onRetry,
            containerId,
            buttonText = 'Try Again',
            errorType = 'error'
        } = params;
        
        const container = document.createElement('div');
        container.className = `error-recovery ${errorType}`;
        container.innerHTML = `
            <div class="error-message">${message}</div>
            <button class="retry-btn">${buttonText}</button>
        `;
        
        const button = container.querySelector('.retry-btn');
        button.addEventListener('click', async () => {
            button.disabled = true;
            button.textContent = 'Retrying...';
            
            try {
                await onRetry();
                container.remove();
            } catch (err) {
                button.disabled = false;
                button.textContent = buttonText;
                console.error('Retry failed:', err);
            }
        });
        
        if (containerId) {
            const target = document.getElementById(containerId);
            if (target) {
                target.appendChild(container);
            }
        }
        
        return container;
    },
    
    /**
     * Show recoverable error with retry button
     * @param {Object} params - Parameters
     */
    showRecoverableError(params) {
        const { showToast, ...rest } = params;
        
        // Show toast notification
        if (showToast) {
            showToast(params.message, 'error');
        }
        
        // Create try again button if container specified
        if (params.containerId) {
            return this.createTryAgainButton(params);
        }
        
        return null;
    },
    
    /**
     * Create inline error with retry for a specific element
     * @param {string} elementId - ID of the element to show error for
     * @param {string} message - Error message
     * @param {Function} retryFn - Function to call on retry
     * @returns {HTMLDivElement} - Error container
     */
    createInlineError(elementId, message, retryFn) {
        const element = document.getElementById(elementId);
        if (!element) return null;
        
        // Create error container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'inline-error';
        errorContainer.innerHTML = `
            <span class="error-text">${message}</span>
            <button class="inline-retry-btn">Retry</button>
        `;
        
        errorContainer.querySelector('.inline-retry-btn').addEventListener('click', async () => {
            errorContainer.remove();
            element.disabled = true;
            element.classList.add('loading');
            
            try {
                await retryFn();
            } catch (err) {
                // If retry fails, show error again
                element.classList.remove('loading');
                element.disabled = false;
                element.parentNode.insertBefore(errorContainer, element.nextSibling);
            }
        });
        
        // Insert after the element
        element.parentNode.insertBefore(errorContainer, element.nextSibling);
        
        return errorContainer;
    }
};