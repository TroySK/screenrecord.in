// ============================================
// MAIN ENTRY POINT - Module Loader with Dynamic Imports
// ============================================

import { CONFIG } from './utils.js';

// Module registry for dynamic loading
const ModuleRegistry = {
    utils: null,
    storage: null,
    recording: null,
    ui: null,
    
    async loadUtils() {
        if (!this.utils) {
            this.utils = await import('./utils.js');
        }
        return this.utils;
    },
    
    async loadStorage() {
        if (!this.storage) {
            const utils = await this.loadUtils();
            this.storage = await import('./storage.js');
        }
        return this.storage;
    },
    
    async loadRecording() {
        if (!this.recording) {
            const utils = await this.loadUtils();
            this.recording = await import('./recording.js');
        }
        return this.recording;
    },
    
    async loadUI() {
        if (!this.ui) {
            const utils = await this.loadUtils();
            const storage = await this.loadStorage();
            const recording = await this.loadRecording();
            this.ui = await import('./ui.js');
        }
        return this.ui;
    },
    
    async loadAll() {
        await Promise.all([
            this.loadUtils(),
            this.loadStorage(),
            this.loadRecording(),
            this.loadUI()
        ]);
    }
};

// ============================================
// BROWSER COMPATIBILITY CHECK
// ============================================

export function checkBrowserCompatibility() {
    const issues = [];
    
    // Check ES6 modules
    if (!('noModule' in document.createElement('script'))) {
        issues.push('ES6 modules not supported');
    }
    
    // Check required APIs
    if (!navigator.mediaDevices) {
        issues.push('MediaDevices API not available');
    }
    
    if (!window.indexedDB) {
        issues.push('IndexedDB not available');
    }
    
    if (!window.MediaRecorder) {
        issues.push('MediaRecorder not available');
    }
    
    return {
        compatible: issues.length === 0,
        issues
    };
}

// ============================================
// FEATURE DETECTION
// ============================================

export const Capabilities = {
    get screenSharing() {
        return !!navigator.mediaDevices?.getDisplayMedia;
    },
    
    get camera() {
        return !!navigator.mediaDevices?.getUserMedia;
    },
    
    get pictureInPicture() {
        return !!document.pictureInPictureEnabled;
    },
    
    get popupWindow() {
        return !!window.open;
    },
    
    get mediaRecorder() {
        return !!window.MediaRecorder;
    },
    
    get indexedDB() {
        return !!window.indexedDB;
    },
    
    get systemAudio() {
        return !!navigator.mediaDevices?.getDisplayMedia;
    },
    
    get audioContext() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }
};

// ============================================
// POPUP FALLBACK FOR UNSUPPORTED BROWSERS
// ============================================

export function openRecordingPopup() {
    const width = 400;
    const height = 300;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`;
    
    const popup = window.open('', 'RecordingKeepAlive', features);
    
    if (!popup) {
        return null;
    }
    
    // Write content to the popup
    popup.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recording Active</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    text-align: center;
                }
                .recording-indicator {
                    width: 20px;
                    height: 20px;
                    background: #ff4444;
                    border-radius: 50%;
                    animation: pulse 1.5s infinite;
                    margin-bottom: 20px;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
                h1 { margin: 0 0 10px 0; font-size: 24px; }
                p { margin: 0 0 20px 0; opacity: 0.9; }
                .timer { font-size: 32px; font-weight: bold; font-family: monospace; }
            </style>
        </head>
        <body>
            <div class="recording-indicator"></div>
            <h1>Recording Active</h1>
            <p>Keep this window open to maintain continuous recording.</p>
            <div class="timer" id="timer">00:00</div>
            <script>
                let seconds = 0;
                setInterval(() => {
                    seconds++;
                    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
                    const secs = (seconds % 60).toString().padStart(2, '0');
                    document.getElementById('timer').textContent = mins + ':' + secs;
                }, 1000);
                
                // Notify parent window this popup is ready
                window.opener.postMessage({ type: 'popup-ready' }, '*');
            </script>
        </body>
        </html>
    `);
    
    popup.document.close();
    
    // Store popup reference
    window.recordingPopup = popup;
    
    return popup;
}

// ============================================
// UI FEATURE ADAPTATION
// ============================================

export function adaptUIForCapabilities() {
    // Hide screen sharing on mobile/unsupported
    if (!Capabilities.screenSharing) {
        const screenToggle = document.getElementById('screen-toggle');
        const screenInfo = document.getElementById('screen-info');
        if (screenToggle) screenToggle.style.display = 'none';
        if (screenInfo) screenInfo.textContent = CONFIG.SCREEN_SHARING_UNSUPPORTED_MESSAGE || 'Screen sharing not supported on this device';
    }
    
    // Show/hide PiP and popup fallback buttons based on capabilities
    const pipInfo = document.getElementById('pip-info');
    const enablePipBtn = document.getElementById('enable-pip');
    const enablePopupBtn = document.getElementById('enable-popup');
    
    if (!Capabilities.pictureInPicture) {
        // PiP not supported - hide PiP button, show popup fallback
        if (enablePipBtn) enablePipBtn.style.display = 'none';
        if (pipInfo) pipInfo.classList.remove('hidden');
        if (enablePopupBtn) enablePopupBtn.style.display = 'inline-block';
    } else {
        // PiP supported - show both options
        if (enablePopupBtn) enablePopupBtn.style.display = 'inline-block';
    }
    
    // Hide popup button if popups are blocked
    if (!Capabilities.popupWindow) {
        if (enablePopupBtn) enablePopupBtn.style.display = 'none';
    }
}

// ============================================
// APPLICATION INITIALIZATION
// ============================================

export async function initApp() {
    console.log('Initializing ScreenRecord application...');
    
    // Check compatibility
    const compatibility = checkBrowserCompatibility();
    if (!compatibility.compatible) {
        console.warn('Browser compatibility issues:', compatibility.issues);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-banner';
        errorDiv.innerHTML = `
            <h2>${CONFIG.BROWSER_NOT_SUPPORTED_TITLE}</h2>
            <p>${CONFIG.BROWSER_NOT_SUPPORTED_MESSAGE}</p>
            <p>${CONFIG.ISSUES_LABEL}: ${compatibility.issues.join(', ')}</p>
        `;
        document.body.prepend(errorDiv);
    }
    
    // Adapt UI for capabilities
    adaptUIForCapabilities();
    
    // Load all modules
    try {
        const ui = await ModuleRegistry.loadUI();
        await ui.initUI();
        console.log('Application initialized successfully');
    } catch (err) {
        console.error('Failed to initialize application:', err);
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-banner';
        errorDiv.innerHTML = `
            <h2>${CONFIG.INIT_FAILED_TITLE}</h2>
            <p>${CONFIG.INIT_FAILED_MESSAGE}</p>
            <p>${CONFIG.ERROR_LABEL}: ${err.message}</p>
        `;
        document.body.prepend(errorDiv);
    }
}

// ============================================
// PAGE UNLOAD HANDLING
// ============================================

export function setupPageLifecycle() {
    // Save state before unload
    window.addEventListener('beforeunload', async () => {
        try {
            const recording = await ModuleRegistry.loadRecording();
            const ui = await ModuleRegistry.loadUI();
            
            // Save draft if recording
            if (recording.RecordingState.isRecording) {
                recording.saveDraft();
            }
            
            // Cleanup
            recording.cleanupRecording();
        } catch (err) {
            console.warn('Error during page unload:', err);
        }
    });
    
    // Handle visibility change - pause recording when tab is hidden
    document.addEventListener('visibilitychange', async () => {
        try {
            const recording = await ModuleRegistry.loadRecording();
            const ui = await ModuleRegistry.loadUI();
            
            if (document.hidden) {
                // Tab is hidden - pause recording if active
                if (recording.RecordingState.isRecording && !recording.RecordingState.isPaused) {
                    recording.togglePause();
                    // Update UI to show paused state
                    if (ui.elements.pauseBtn) {
                        ui.elements.pauseBtn.textContent = '▶ Resume';
                    }
                    if (ui.elements.pausedOverlay) {
                        ui.elements.pausedOverlay.classList.remove('hidden');
                    }
                }
            } else {
                // Tab is visible again - restore pause state timing
                if (recording.RecordingState.isRecording) {
                    recording.restorePauseState();
                    // Ensure UI reflects current pause state
                    if (recording.RecordingState.isPaused) {
                        if (ui.elements.pauseBtn) {
                            ui.elements.pauseBtn.textContent = '▶ Resume';
                        }
                        if (ui.elements.pausedOverlay) {
                            ui.elements.pausedOverlay.classList.remove('hidden');
                        }
                    }
                }
            }
        } catch (err) {
            // Ignore visibility change errors
        }
    });
}

// ============================================
// DYNAMIC MODULE LOADER (for on-demand loading)
// ============================================

export const ModuleLoader = {
    // Load a module dynamically and cache it
    async load(modulePath) {
        return await import(modulePath);
    },
    
    // Preload all modules
    async preload() {
        await ModuleRegistry.loadAll();
    },
    
    // Get loaded module
    get(moduleName) {
        return ModuleRegistry[moduleName];
    }
};

// ============================================
// START APPLICATION
// ============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        setupPageLifecycle();
        await initApp();
    });
} else {
    // DOM already loaded
    setupPageLifecycle();
    await initApp();
}

// Export for debugging
window.ScreenRecord = {
    ModuleRegistry,
    ModuleLoader,
    Capabilities,
    checkBrowserCompatibility,
    adaptUIForCapabilities,
    initApp
};