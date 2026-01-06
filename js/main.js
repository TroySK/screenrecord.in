// ============================================
// MAIN ENTRY POINT - Module Loader with Dynamic Imports
// ============================================

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
// UI FEATURE ADAPTATION
// ============================================

export function adaptUIForCapabilities() {
    // Hide screen sharing on mobile/unsupported
    if (!Capabilities.screenSharing) {
        const screenToggle = document.getElementById('screen-toggle');
        const screenInfo = document.getElementById('screen-info');
        if (screenToggle) screenToggle.style.display = 'none';
        if (screenInfo) screenInfo.textContent = 'Screen sharing not supported on this device';
    }
    
    // Hide PiP if not supported
    if (!Capabilities.pictureInPicture) {
        const pipInfo = document.getElementById('pip-info');
        const enablePipBtn = document.getElementById('enable-pip');
        if (pipInfo) pipInfo.style.display = 'none';
        if (enablePipBtn) enablePipBtn.style.display = 'none';
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
            <h2>Browser Not Fully Supported</h2>
            <p>Some features may not work. Please use a modern browser like Chrome, Firefox, or Edge.</p>
            <p>Issues: ${compatibility.issues.join(', ')}</p>
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
            <h2>Failed to Initialize</h2>
            <p>Please refresh the page. If the problem persists, try a different browser.</p>
            <p>Error: ${err.message}</p>
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
    
    // Handle visibility change
    document.addEventListener('visibilitychange', async () => {
        if (document.hidden) {
            // Save draft when tab becomes hidden
            try {
                const recording = await ModuleRegistry.loadRecording();
                if (recording.RecordingState.isRecording) {
                    recording.saveDraft();
                }
            } catch (err) {
                // Ignore
            }
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