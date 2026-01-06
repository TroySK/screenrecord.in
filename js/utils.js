// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

export const CONFIG = {
    // Storage
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB limit
    DRAFT_AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    
    // Recording
    DEFAULT_VIDEO_WIDTH: 1920,
    DEFAULT_VIDEO_HEIGHT: 1080,
    CAMERA_WIDTH: 1280,
    CAMERA_HEIGHT: 720,
    RECORDING_FPS: 30,
    
    // Canvas overlay
    OVERLAY_SCALE: 0.2, // 20% of screen width
    OVERLAY_CORNER_RADIUS: 30,
    OVERLAY_MARGIN: 10,
    
    // Performance
    MAX_URLS: 100,
    MEMORY_SAMPLE_INTERVAL: 5000,
    FRAME_DROP_THRESHOLD: 50, // ms
    
    // Draft
    DRAFT_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
};

// State management
export const STATE_VERSION = 1;
export const STORAGE_KEY = 'screenrecord_state';

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