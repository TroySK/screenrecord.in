// ============================================
// UI MODULE - DOM Manipulation
// ============================================

import { createElement, sanitizeTitle, formatDuration, formatFileSize, formatDate, STATE_VERSION, STORAGE_KEY, VALID_CONFIG_KEYS, VALID_CONFIG_VALUES, CONFIG, Capabilities, initCapabilitiesUI } from './utils.js';
import { getAllVideos, getVideo, downloadSaved, deleteVideo, secureDeleteAll, getStorageInfo, getVideosPaginated, getVideosCount, getCleanupSuggestions } from './storage.js';
import { startRecording, stopRecording, RecordingState, togglePause } from './recording.js';
import { Validator, RecordingConfigValidator, StorageValidator, ValidationMessages } from './validation.js';

// ============================================
// COMMAND MENU CONTROLLER
// ============================================

export class CommandMenu {
    constructor() {
        this.menu = document.getElementById('command-menu');
        this.backdrop = document.getElementById('command-backdrop');
        this.input = document.getElementById('command-input');
        this.results = document.getElementById('command-results');
        this.isOpen = false;
        this.selectedIndex = 0;
        this.items = [];
        this.actions = {
            'new-recording': () => this.handleNewRecording(),
            'saved-recordings': () => this.handleSavedRecordings(),
            'naming-pattern': () => this.handleNamingPattern(),
            'shortcuts': () => this.handleShortcuts(),
            'dark-mode': () => this.handleDarkMode()
        };
        
        this.init();
    }
    
    init() {
        // Collect all command items
        this.items = Array.from(this.results.querySelectorAll('.command-item'));
        
        // Toggle on menu button click
        const menuToggle = document.getElementById('menu-toggle');
        menuToggle?.addEventListener('click', () => this.toggle());
        
        // Close on backdrop click
        this.backdrop?.addEventListener('click', () => this.close());
        
        // Keep menu open when mouse is over menu container
        // The backdrop handles the area outside the menu, so we only close when mouse leaves the menu container
        this.menu?.addEventListener('mouseleave', () => this.close());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Click on items
        this.items.forEach((item, index) => {
            item.addEventListener('click', () => this.select(index));
            item.addEventListener('mouseenter', () => this.select(index));
        });
        
        // Search functionality
        this.input?.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }
    
    toggle() {
        this.isOpen ? this.close() : this.open();
    }
    
    open() {
        this.isOpen = true;
        this.menu.classList.remove('hidden');
        this.input.value = '';
        this.input.focus();
        this.selectedIndex = 0;
        this.showAllItems();
        this.updateSelection();
    }
    
    close() {
        this.isOpen = false;
        this.menu.classList.add('hidden');
    }
    
    handleKeydown(e) {
        // Don't handle if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Cmd+K or Ctrl+K to open
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            this.toggle();
            return;
        }
        
        if (!this.isOpen) return;
        
        switch (e.key) {
            case 'Escape':
                this.close();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
                this.updateSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
                this.updateSelection();
                break;
            case 'Enter':
                e.preventDefault();
                this.select(this.selectedIndex);
                break;
        }
    }
    
    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            this.showAllItems();
            return;
        }
        
        this.items.forEach((item, index) => {
            const text = item.querySelector('span')?.textContent.toLowerCase() || '';
            const action = item.dataset.action || '';
            const isVisible = text.includes(searchTerm) || action.includes(searchTerm);
            item.style.display = isVisible ? 'flex' : 'none';
        });
        
        // Update visible items for selection
        this.items = Array.from(this.results.querySelectorAll('.command-item')).filter(item => item.style.display !== 'none');
        this.selectedIndex = 0;
        this.updateSelection();
    }
    
    showAllItems() {
        this.items.forEach(item => item.style.display = 'flex');
        this.items = Array.from(this.results.querySelectorAll('.command-item'));
    }
    
    updateSelection() {
        this.items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
        const selected = this.items[this.selectedIndex];
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }
    
    select(index) {
        if (!this.items[index]) return;
        
        this.selectedIndex = index;
        this.updateSelection();
        
        const action = this.items[index]?.dataset.action;
        if (action && this.actions[action]) {
            this.actions[action]();
        }
    }
    
    handleNewRecording() {
        this.close();
        // Focus on first config toggle
        const screenToggle = document.getElementById('screen-toggle');
        screenToggle?.focus();
    }
    
    handleSavedRecordings() {
        this.close();
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.add('open');
    }
    
    handleNamingPattern() {
        this.close();
        openNamingPatternModal();
    }
    
    handleShortcuts() {
        this.close();
        const shortcutsModal = document.getElementById('shortcuts-modal');
        shortcutsModal?.classList.remove('hidden');
    }
    
    handleDarkMode() {
        this.close();
        toggleDarkMode();
    }
}

// ============================================
// DARK MODE TOGGLE
// ============================================

export function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    
    if (isDark) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

export function initDarkMode() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
}

// ============================================
// CUSTOM PIP ELEMENT MANAGEMENT
// ============================================

let pipWindow = null;
let pipTimerInterval = null;
let pipStartTime = null;
let pipPausedTime = 0;
let pipIsPaused = false;
let pipPausedStart = null;

/**
 * Check if Document Picture-in-Picture is supported
 * @returns {boolean}
 */
export function isDocumentPipSupported() {
    return 'documentPictureInPicture' in window;
}

/**
 * Open the custom PiP element using Document Picture-in-Picture API
 * This creates a system-wide floating window with video, timer, and controls
 * @param {MediaStream} stream - The media stream to display
 */
export async function openPipElement(stream) {
    if (!isDocumentPipSupported()) {
        showToast('Document Picture-in-Picture not supported in this browser', 'error');
        return false;
    }

    try {
        // Open Document PiP window
        pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 400,
            height: 300
        });

        // Write the PiP content to the new window
        pipWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Recording Controls</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                        color: #fff;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    #pip-video-container {
                        position: relative;
                        width: 100%;
                        aspect-ratio: 16/9;
                        background: #000;
                        overflow: hidden;
                        flex-shrink: 0;
                    }
                    #pip-video {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    #pip-timer {
                        position: absolute;
                        top: 8px;
                        left: 8px;
                        background: rgba(0, 0, 0, 0.7);
                        color: #fff;
                        padding: 4px 10px;
                        border-radius: 4px;
                        font-size: 14px;
                        font-weight: bold;
                        font-family: 'Courier New', monospace;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .recording-dot {
                        width: 8px;
                        height: 8px;
                        background: #ff4444;
                        border-radius: 50%;
                        animation: pulse 1.5s ease-in-out infinite;
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(1.2); }
                    }
                    #pip-controls {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 12px;
                        padding: 12px;
                        background: rgba(255, 255, 255, 0.05);
                    }
                    #pip-controls button {
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        color: #fff;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    }
                    #pip-controls button:hover {
                        background: rgba(255, 255, 255, 0.2);
                        transform: scale(1.05);
                    }
                    #pip-stop-btn {
                        background: #f44336 !important;
                    }
                    #pip-stop-btn:hover {
                        background: #d32f2f !important;
                    }
                    #pip-pause-btn {
                        background: #ff9800 !important;
                    }
                    #pip-pause-btn:hover {
                        background: #e68900 !important;
                    }
                    #pip-status {
                        text-align: center;
                        padding: 8px;
                        font-size: 12px;
                        color: rgba(255, 255, 255, 0.7);
                        background: rgba(0, 0, 0, 0.2);
                    }
                    body.paused .recording-dot {
                        background: #ff9800;
                        animation: none;
                    }
                    body.paused #pip-pause-btn {
                        background: #4CAF50 !important;
                    }
                </style>
            </head>
            <body>
                <div id="pip-video-container">
                    <video id="pip-video" autoplay muted playsinline></video>
                    <div id="pip-timer">
                        <span class="recording-dot"></span>
                        <span id="pip-timer-text">00:00</span>
                    </div>
                </div>
                <div id="pip-controls">
                    <button id="pip-pause-btn" title="Pause/Resume recording">⏸ Pause</button>
                    <button id="pip-stop-btn" title="Stop recording">⏹ Stop</button>
                </div>
                <div id="pip-status">Recording active - Keep this window visible</div>
                <script>
                    // Set video source
                    const video = document.getElementById('pip-video');
                    const timerText = document.getElementById('pip-timer-text');
                    const pauseBtn = document.getElementById('pip-pause-btn');
                    const stopBtn = document.getElementById('pip-stop-btn');
                    const status = document.getElementById('pip-status');
                    
                    // Expose for communication with opener
                    window.pipVideo = video;
                    window.pipTimerText = timerText;
                    window.pipPauseBtn = pauseBtn;
                    window.pipStatus = status;
                    window.pipBody = document.body;
                    
                    // Handle pause button click
                    pauseBtn.addEventListener('click', () => {
                        window.opener.postMessage({ type: 'pip-pause' }, '*');
                    });
                    
                    // Handle stop button click
                    stopBtn.addEventListener('click', () => {
                        window.opener.postMessage({ type: 'pip-stop' }, '*');
                    });
                    
                    // Handle window close
                    window.addEventListener('beforeunload', () => {
                        window.opener.postMessage({ type: 'pip-close' }, '*');
                    });
                <\/script>
            </body>
            </html>
        `);
        
        pipWindow.document.close();

        // Set video source after a short delay to ensure window is ready
        setTimeout(() => {
            if (pipWindow && stream) {
                const video = pipWindow.document.getElementById('pip-video');
                if (video) {
                    // Clone the stream to avoid conflicts
                    const clonedStream = new MediaStream(stream.getTracks());
                    video.srcObject = clonedStream;
                }
            }
        }, 100);

        // Listen for messages from the PiP window
        const messageHandler = (event) => {
            if (event.source !== pipWindow) return;
            
            switch (event.data.type) {
                case 'pip-pause':
                    handlePipPause();
                    break;
                case 'pip-stop':
                    handlePipStop();
                    break;
                case 'pip-close':
                    handlePipClose();
                    break;
            }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Store handler reference for cleanup
        pipWindow._messageHandler = messageHandler;

        // Start timer
        startPipTimer();

        // Hide PiP info
        if (elements.pipInfo) {
            elements.pipInfo.classList.add('hidden');
        }

        showToast('Recording controls opened in floating window!', 'success');
        return true;
        
    } catch (err) {
        console.error('Document PiP error:', err);
        showToast('Failed to open floating window: ' + err.message, 'error');
        return false;
    }
}

/**
 * Handle pause button click from PiP window
 */
async function handlePipPause() {
    const isPaused = await togglePause();
    
    if (isPaused !== null && isPaused !== undefined) {
        pipIsPaused = isPaused;
        
        if (pipWindow && !pipWindow.closed) {
            const pauseBtn = pipWindow.document.getElementById('pip-pause-btn');
            const status = pipWindow.document.getElementById('pip-status');
            
            if (pauseBtn) {
                pauseBtn.innerHTML = isPaused ? '▶ Resume' : '⏸ Pause';
            }
            
            if (status) {
                status.textContent = isPaused ? 'Recording paused' : 'Recording active - Keep this window visible';
            }
            
            pipWindow.document.body.classList.toggle('paused', isPaused);
        }
        
        if (isPaused) {
            pipPausedStart = Date.now();
        } else if (pipPausedStart) {
            pipPausedTime += Date.now() - pipPausedStart;
            pipPausedStart = null;
        }
    }
}

/**
 * Handle stop button click from PiP window
 */
function handlePipStop() {
    stopRecording(showToast);
    closePipElement();
}

/**
 * Handle close event from PiP window
 */
function handlePipClose() {
    closePipElement();
}

/**
 * Close the custom PiP element
 */
export function closePipElement() {
    if (pipWindow) {
        // Remove message listener
        if (pipWindow._messageHandler) {
            window.removeEventListener('message', pipWindow._messageHandler);
        }
        
        // Close the PiP window
        try {
            pipWindow.close();
        } catch (e) {
            // Ignore close errors
        }
        pipWindow = null;
    }
    
    // Stop timer
    stopPipTimer();
    
    // Reset state
    pipStartTime = null;
    pipPausedTime = 0;
    pipIsPaused = false;
    pipPausedStart = null;
}

/**
 * Start the PiP timer
 */
function startPipTimer() {
    pipStartTime = Date.now();
    pipPausedTime = 0;
    pipIsPaused = false;
    
    if (pipTimerInterval) {
        clearInterval(pipTimerInterval);
    }
    
    pipTimerInterval = setInterval(updatePipTimer, 1000);
}

/**
 * Stop the PiP timer
 */
function stopPipTimer() {
    if (pipTimerInterval) {
        clearInterval(pipTimerInterval);
        pipTimerInterval = null;
    }
}

/**
 * Update the PiP timer display
 */
function updatePipTimer() {
    if (!pipStartTime || pipIsPaused) return;
    
    const elapsed = (Date.now() - pipStartTime - pipPausedTime) / 1000;
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Update timer in PiP window
    if (pipWindow && !pipWindow.closed) {
        const timerText = pipWindow.document.getElementById('pip-timer-text');
        if (timerText) {
            timerText.textContent = formatted;
        }
    }
    
    // Update document title
    document.title = `● ${formatted} - Recording`;
}

// ============================================
// DOM ELEMENTS CACHE
// ============================================

export const elements = {
    screenToggle: null,
    cameraToggle: null,
    micToggle: null,
    systemAudioToggle: null,
    startBtn: null,
    stopBtn: null,
    pauseBtn: null,
    previewArea: null,
    previewVideo: null,
    pipInfo: null,
    enablePipBtn: null,
    configSummary: null,
    sidebar: null,
    toggleSidebar: null,
    savedList: null,
    savedListHeader: null,
    loadMoreBtn: null,
    clearAll: null,
    newRecording: null,
    modal: null,
    modalVideo: null,
    closeModal: null,
    closeSidebar: null,
    storageInfo: null,
    storageProgressBar: null,
    storageWarning: null,
    cleanupStorage: null,
    cleanupSuggestions: null,
    errorNotifications: null,
    downloadLast: null,
    recordingTimer: null,
    pausedOverlay: null,
    shortcutsInfoBtn: null,
    shortcutsModal: null,
    shortcutsClose: null,
    shortcutsModalClose: null,
    // Filename edit modal elements
    filenameModal: null,
    filenameInput: null,
    filenamePreview: null,
    filenameCancel: null,
    filenameSave: null,
    // Naming pattern modal elements
    namingPatternModal: null,
    namingPatternSelect: null,
    namingPatternCustom: null,
    namingPatternCancel: null,
    namingPatternSave: null,
    patternPreviewText: null
};

// ============================================
// PAGINATION STATE
// ============================================

export const PaginationState = {
    currentPage: 1,
    totalCount: 0,
    hasMore: false,
    isLoading: false,
    allVideos: [], // Cache all loaded videos
    
    reset() {
        this.currentPage = 1;
        this.totalCount = 0;
        this.hasMore = false;
        this.isLoading = false;
        this.allVideos = [];
    },
    
    get isFirstLoad() {
        return this.currentPage === 1 && this.allVideos.length === 0;
    }
};

// Initialize element references
export function initElements() {
    elements.screenToggle = document.getElementById('screen-toggle');
    elements.cameraToggle = document.getElementById('camera-toggle');
    elements.micToggle = document.getElementById('mic-toggle');
    elements.systemAudioToggle = document.getElementById('system-audio-toggle');
    elements.startBtn = document.getElementById('start-recording');
    elements.stopBtn = document.getElementById('stop-recording');
    elements.pauseBtn = document.getElementById('pause-recording');
    elements.previewArea = document.getElementById('preview-area');
    elements.previewVideo = document.getElementById('preview-video');
    elements.pipInfo = document.getElementById('pip-info');
    elements.enablePipBtn = document.getElementById('enable-pip');
    elements.configSummary = document.getElementById('config-summary');
    elements.sidebar = document.getElementById('sidebar');
    elements.toggleSidebar = document.getElementById('toggle-sidebar');
    elements.savedList = document.getElementById('saved-list');
    elements.savedListHeader = document.getElementById('saved-list-header');
    elements.loadMoreBtn = document.getElementById('load-more-btn');
    elements.clearAll = document.getElementById('clear-all');
    elements.newRecording = document.getElementById('new-recording');
    elements.modal = document.getElementById('modal-player');
    elements.modalVideo = document.getElementById('modal-video');
    elements.closeModal = document.querySelector('.close');
    elements.closeSidebar = document.getElementById('close-sidebar');
    elements.storageInfo = document.getElementById('storage-info');
    elements.storageProgressBar = document.getElementById('storage-progress-bar');
    elements.storageWarning = document.getElementById('storage-warning');
    elements.cleanupStorage = document.getElementById('cleanup-storage');
    elements.cleanupSuggestions = document.getElementById('cleanup-suggestions');
    elements.errorNotifications = document.getElementById('error-notifications');
    elements.downloadLast = document.getElementById('download-last');
    elements.recordingTimer = document.getElementById('recording-timer');
    elements.pausedOverlay = document.getElementById('paused-overlay');
    elements.shortcutsInfoBtn = document.getElementById('shortcuts-info-btn');
    elements.shortcutsModal = document.getElementById('shortcuts-modal');
    elements.shortcutsClose = document.querySelector('.shortcuts-close');
    elements.shortcutsModalClose = document.querySelector('.shortcuts-modal-close');
    // Filename edit modal elements
    elements.filenameModal = document.getElementById('filename-modal');
    elements.filenameInput = document.getElementById('filename-input');
    elements.filenamePreview = document.getElementById('filename-preview-text');
    elements.filenameCancel = document.getElementById('filename-cancel');
    elements.filenameSave = document.getElementById('filename-save');
    // Naming pattern modal elements
    elements.namingPatternModal = document.getElementById('naming-pattern-modal');
    elements.namingPatternSelect = document.getElementById('naming-pattern-select');
    elements.namingPatternCustom = document.getElementById('naming-pattern-custom');
    elements.namingPatternCancel = document.getElementById('naming-pattern-cancel');
    elements.namingPatternSave = document.getElementById('naming-pattern-save');
    elements.patternPreviewText = document.getElementById('pattern-preview-text');
}

// ============================================
// TOAST NOTIFICATIONS - Linear Style
// ============================================

export function showToast(message, type = 'info') {
    if (!elements.errorNotifications) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Add icon based on type
    const iconSvg = getToastIcon(type);
    toast.innerHTML = `
        <span class="toast-icon">${iconSvg}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 4L4 12M4 4l8 8"/>
            </svg>
        </button>
    `;
    
    // Close button handler
    toast.querySelector('.toast-close')?.addEventListener('click', () => {
        toast.remove();
    });
    
    elements.errorNotifications.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'toast-exit 0.2s ease forwards';
            setTimeout(() => toast.remove(), 200);
        }
    }, CONFIG.TOAST_DURATION);
}

function getToastIcon(type) {
    const icons = {
        success: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="8" r="6"/>
            <path d="M5 8l2 2 4-4"/>
        </svg>`,
        error: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="8" r="6"/>
            <path d="M5 5l6 6M11 5l-6 6"/>
        </svg>`,
        warning: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8 3v6M8 11v2"/>
            <circle cx="8" cy="13" r="1"/>
            <path d="M2 14a6 6 0 0112 0v-1"/>
        </svg>`,
        info: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="8" r="6"/>
            <path d="M8 5v4M8 11v1"/>
        </svg>`
    };
    return icons[type] || icons.info;
}

// ============================================
// CONFIG MANAGEMENT
// ============================================

export const AppConfig = {
    _config: {
        screen: false,
        camera: false,
        mic: false,
        systemAudio: false
    },
    
    get config() { return { ...this._config }; },
    
    setConfig(key, value) {
        if (VALID_CONFIG_KEYS?.includes(key) && typeof value === VALID_CONFIG_VALUES?.[key]) {
            this._config[key] = value;
            this.persist();
            return true;
        }
        return false;
    },
    
    setConfigBatch(newConfig) {
        const validated = {};
        Object.entries(newConfig).forEach(([key, value]) => {
            if (VALID_CONFIG_KEYS?.includes(key) && typeof value === VALID_CONFIG_VALUES?.[key]) {
                validated[key] = value;
            }
        });
        this._config = { ...this._config, ...validated };
        this.persist();
        return validated;
    },
    
    reset() {
        this._config = { screen: false, camera: false, mic: false, systemAudio: false };
        this.persist();
    },
    
    persist() {
        try {
            const state = { version: STATE_VERSION, config: this._config, timestamp: Date.now() };
            localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to persist config:', e);
        }
    },
    
    restore() {
        try {
            const stored = localStorage.getItem(`${STORAGE_KEY}_config`);
            if (stored) {
                const state = JSON.parse(stored);
                if (state.config) {
                    this._config = { ...this._config, ...state.config };
                    return true;
                }
            }
        } catch (e) {
            console.warn('Failed to restore config:', e);
        }
        return false;
    }
};

// ============================================
// UI UPDATES
// ============================================

export function updateConfigSummary() {
    if (!elements.configSummary || !elements.startBtn) return;
    
    const config = AppConfig.config;
    const active = Object.entries(config)
        .filter(([k, v]) => v)
        .map(([k]) => k.replace(/([A-Z])/g, ' $1').trim())
        .join(', ');
    
    elements.configSummary.textContent = active ? `Selected: ${active}` : 'Select inputs to start';
    elements.startBtn.disabled = !Object.values(config).some(v => v);
}

export function updateToggles(disabled = true) {
    [elements.screenToggle, elements.cameraToggle, elements.micToggle, elements.systemAudioToggle]
        .forEach(t => { if (t) t.disabled = disabled; });
}

export async function updateStorageInfo() {
    const info = await getStorageInfo(showToast);
    if (elements.storageInfo && info) {
        if (info.quotaMB) {
            elements.storageInfo.textContent = `${info.usedMB} MB / ${info.quotaMB} MB`;
        } else {
            elements.storageInfo.textContent = `${info.usedMB} MB`;
        }
        
        // Update progress bar
        if (elements.storageProgressBar && info.percentFull) {
            const percent = Math.min(parseFloat(info.percentFull), 100);
            elements.storageProgressBar.style.width = `${percent}%`;
            
            // Remove existing status classes
            elements.storageProgressBar.classList.remove('warning', 'danger');
            
            // Add appropriate status class
            if (info.status === 'danger') {
                elements.storageProgressBar.classList.add('danger');
            } else if (info.status === 'warning') {
                elements.storageProgressBar.classList.add('warning');
            }
        }
        
        // Update warning message
        if (elements.storageWarning) {
            elements.storageWarning.classList.remove('hidden', 'warning', 'danger');
            
            if (info.status === 'danger') {
                elements.storageWarning.classList.remove('hidden');
                elements.storageWarning.classList.add('danger');
                elements.storageWarning.textContent = '⚠️ Storage almost full! Delete old recordings to continue recording.';
            } else if (info.status === 'warning') {
                elements.storageWarning.classList.remove('hidden');
                elements.storageWarning.classList.add('warning');
                elements.storageWarning.textContent = '⚠️ Storage getting low. Consider deleting old recordings.';
            }
        }
    }
}

/**
 * Render cleanup suggestions in the UI
 */
export async function renderCleanupSuggestions() {
    if (!elements.cleanupSuggestions) return;
    
    const suggestions = await getCleanupSuggestions();
    
    if (!suggestions.hasSuggestions) {
        // Show message in the suggestions panel instead of toast
        elements.cleanupSuggestions.classList.remove('hidden');
        elements.cleanupSuggestions.innerHTML = `
            <h4>Cleanup Suggestions</h4>
            <p>${suggestions.message || 'No cleanup suggestions available.'}</p>
        `;
        return;
    }
    
    elements.cleanupSuggestions.classList.remove('hidden');
    
    let html = `<h4>Cleanup Suggestions (${suggestions.recordings.length} recordings)</h4>`;
    html += `<p>Total: ${suggestions.totalSizeMB} MB across ${suggestions.totalRecordings} recordings</p>`;
    html += '<ul>';
    
    for (const recording of suggestions.recordings) {
        const dateStr = formatDate(recording.date);
        html += `
            <li>
                <div class="recording-info">
                    <span class="recording-title">${sanitizeTitle(recording.title)}</span>
                    <span class="recording-size">${dateStr} | ${recording.sizeMB} MB</span>
                </div>
                <button class="delete-recording-btn" data-id="${recording.id}">Delete</button>
            </li>
        `;
    }
    
    html += '</ul>';
    elements.cleanupSuggestions.innerHTML = html;
    
    // Add event listeners to delete buttons
    elements.cleanupSuggestions.querySelectorAll('.delete-recording-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const result = await deleteVideo(id, showToast);
            if (result) {
                await updateStorageInfo();
                await renderCleanupSuggestions();
                await populateSavedList();
            }
        });
    });
}

/**
 * Toggle cleanup suggestions visibility
 */
export function toggleCleanupSuggestions() {
    if (!elements.cleanupSuggestions) return;
    
    const isHidden = elements.cleanupSuggestions.classList.contains('hidden');
    
    if (isHidden) {
        elements.cleanupSuggestions.classList.remove('hidden');
        renderCleanupSuggestions();
    } else {
        elements.cleanupSuggestions.classList.add('hidden');
    }
}

// ============================================
// SAVED RECORDINGS LIST
// ============================================

/**
 * Create a video card element for a single recording - Linear Style
 * @param {Object} video - Video object from database
 * @returns {HTMLElement} - The card element
 */
function createVideoCard(video) {
    const card = createElement('div', { className: 'saved-card' });
    
    // Thumbnail
    const thumbnail = createElement('img', {
        src: video.thumbnail,
        alt: 'Thumbnail',
        className: 'saved-card-thumbnail'
    });
    
    const content = createElement('div', { className: 'saved-card-content' });
    
    // Title
    const title = createElement('span', {
        className: 'saved-card-title',
        textContent: sanitizeTitle(video.title)
    });
    
    // Meta info
    const dateStr = formatDate(video.date);
    const durationStr = formatDuration(video.duration || 0);
    const sizeStr = formatFileSize(video.size || 0);
    
    const meta = createElement('div', { className: 'saved-card-meta' });
    meta.innerHTML = `${dateStr} · ${durationStr} · ${sizeStr}`;
    
    content.appendChild(title);
    content.appendChild(meta);
    
    const actions = createElement('div', { className: 'saved-card-actions' });
    
    // Play button
    const playBtn = createElement('button', {
        className: 'btn-action btn-play',
        onclick: () => playVideo(video.id),
        innerHTML: `
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="4 3 12 8 4 13 4 3"/>
            </svg>
            Play
        `
    });
    
    // Download button
    const downloadBtn = createElement('button', {
        className: 'btn-action btn-download',
        onclick: () => downloadSaved(video.id, showToast),
        innerHTML: `
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M8 12v-4M4 8l4-4 4 4M2 14h12"/>
            </svg>
            Download
        `
    });
    
    // Delete button
    const deleteBtn = createElement('button', {
        className: 'btn-action btn-delete',
        onclick: () => deleteVideo(video.id, showToast).then(() => {
            populateSavedList();
            updateStorageInfo();
        }),
        innerHTML: `
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3 5h10M5 5v8a1 1 0 001 1h4a1 1 0 001-1V5M7 9l2 2M9 9l2 2"/>
            </svg>
            Delete
        `
    });
    
    actions.appendChild(playBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(deleteBtn);
    
    card.appendChild(thumbnail);
    card.appendChild(content);
    card.appendChild(actions);
    
    return card;
}

/**
 * Update the saved list header with total count
 */
function updateSavedListHeader() {
    if (!elements.savedListHeader) return;
    
    const { totalCount, allVideos } = PaginationState;
    
    if (totalCount === 0) {
        elements.savedListHeader.textContent = 'Saved Recordings';
    } else {
        elements.savedListHeader.textContent = `Saved Recordings (${totalCount} total)`;
    }
}

/**
 * Update the load more button visibility and state
 */
function updateLoadMoreButton() {
    if (!elements.loadMoreBtn) return;
    
    const { hasMore, isLoading, allVideos } = PaginationState;
    
    if (hasMore) {
        elements.loadMoreBtn.style.display = 'block';
        elements.loadMoreBtn.disabled = isLoading;
        elements.loadMoreBtn.textContent = isLoading ? 'Loading...' : `Load More (${allVideos.length} of ${PaginationState.totalCount})`;
    } else {
        elements.loadMoreBtn.style.display = 'none';
    }
}

/**
 * Populate saved recordings list with pagination
 * @param {boolean} append - Whether to append to existing list (for load more)
 */
export async function populateSavedList(append = false) {
    if (!elements.savedList) return;
    
    try {
        // If first load, reset state and get total count
        if (!append) {
            PaginationState.reset();
            PaginationState.totalCount = await getVideosCount();
        }
        
        // Get paginated videos
        const result = await getVideosPaginated(PaginationState.allVideos.length, CONFIG.PAGINATION_PAGE_SIZE);
        
        // Update pagination state
        PaginationState.hasMore = result.hasMore;
        PaginationState.allVideos = [...PaginationState.allVideos, ...result.videos];
        PaginationState.currentPage++;
        
        // Update UI
        if (!append) {
            elements.savedList.innerHTML = '';
        }
        
        updateSavedListHeader();
        
        if (PaginationState.allVideos.length === 0) {
            const emptyMsg = createElement('p', {
                className: 'empty-state',
                textContent: CONFIG.EMPTY_RECORDINGS_MESSAGE
            });
            elements.savedList.appendChild(emptyMsg);
            updateLoadMoreButton();
            return;
        }
        
        // Add new videos to the list
        result.videos.forEach(video => {
            const card = createVideoCard(video);
            elements.savedList.appendChild(card);
        });
        
        updateLoadMoreButton();
    } catch (err) {
        console.error('Error loading recordings:', err);
        if (!append) {
            elements.savedList.innerHTML = '';
        }
        const errorMsg = createElement('p', {
            className: 'empty-state',
            textContent: CONFIG.ERROR_LOADING_MESSAGE
        });
        elements.savedList.appendChild(errorMsg);
    }
}

/**
 * Load more recordings (for "Load More" button)
 */
export async function loadMoreRecordings() {
    if (PaginationState.isLoading || !PaginationState.hasMore) return;
    
    PaginationState.isLoading = true;
    updateLoadMoreButton();
    
    try {
        await populateSavedList(true);
    } finally {
        PaginationState.isLoading = false;
        updateLoadMoreButton();
    }
}

// ============================================
// VIDEO PLAYBACK
// ============================================

export async function playVideo(id) {
    if (!elements.modal || !elements.modalVideo) return;
    
    try {
        const video = await getVideo(id);
        if (video && video.videoBlob) {
            const { URLManager } = await import('./utils.js');
            
            if (elements.modalVideo.src) {
                try {
                    URLManager.revoke(elements.modalVideo.src);
                } catch (e) {
                    // Ignore
                }
            }
            
            const videoUrl = URLManager.create(URL.createObjectURL(video.videoBlob));
            elements.modalVideo.src = videoUrl;
            elements.modal.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Error playing video:', err);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

export function setupEventListeners() {
    // Toggle events
    elements.screenToggle?.addEventListener('change', (e) => {
        AppConfig.setConfig('screen', e.target.checked);
        updateConfigSummary();
    });
    
    elements.cameraToggle?.addEventListener('change', (e) => {
        AppConfig.setConfig('camera', e.target.checked);
        updateConfigSummary();
    });
    
    elements.micToggle?.addEventListener('change', (e) => {
        AppConfig.setConfig('mic', e.target.checked);
        updateConfigSummary();
    });
    
    elements.systemAudioToggle?.addEventListener('change', (e) => {
        AppConfig.setConfig('systemAudio', e.target.checked);
        updateConfigSummary();
    });
    
    // Recording controls
    elements.startBtn?.addEventListener('click', async () => {
        // Validate configuration before starting
        const configValidation = RecordingConfigValidator.validate(AppConfig.config);
        
        if (!configValidation.isValid) {
            showToast(configValidation.firstError, 'error');
            return;
        }
        
        // Check storage quota
        const storageValidation = await StorageValidator.checkStorageQuota();
        if (!storageValidation.isValid) {
            showToast(storageValidation.firstError, 'error');
            return;
        }
        
        // Show warnings if any
        if (storageValidation.warnings.length > 0) {
            showToast(storageValidation.warnings[0], 'warning');
        }
        
        const result = await startRecording(AppConfig.config, showToast);
        if (result) {
            elements.stopBtn.style.display = 'block';
            elements.pauseBtn.style.display = 'block';
            elements.pauseBtn.textContent = '⏸ Pause';
            elements.startBtn.disabled = true;
            updateToggles(true);
            
            // Show preview canvas if exists
            if (RecordingState.previewCanvas && elements.previewArea) {
                // Check if previewVideo is a child of previewArea
                if (elements.previewVideo && elements.previewArea.contains(elements.previewVideo)) {
                    elements.previewArea.insertBefore(RecordingState.previewCanvas, elements.previewVideo);
                } else {
                    elements.previewArea.appendChild(RecordingState.previewCanvas);
                }
                elements.previewVideo.style.display = 'none';
                elements.previewArea.classList.remove('hidden');
            }
            
            // Show recording timer
            if (elements.recordingTimer) {
                elements.recordingTimer.style.display = 'block';
            }
            
            // Hide paused overlay
            if (elements.pausedOverlay) {
                elements.pausedOverlay.classList.add('hidden');
            }
            
            // Automatically open Document Picture-in-Picture if supported
            if (isDocumentPipSupported()) {
                let stream = null;
                
                if (RecordingState.cameraVideo && RecordingState.cameraVideo.srcObject) {
                    stream = RecordingState.cameraVideo.srcObject;
                } else if (RecordingState.previewCanvas) {
                    stream = RecordingState.previewCanvas.captureStream(30);
                }
                
                if (stream) {
                    // Open PiP automatically
                    await openPipElement(stream);
                    
                    // Hide PiP info since PiP is now open
                    if (elements.pipInfo) {
                        elements.pipInfo.classList.add('hidden');
                    }
                }
            } else {
                // Show PiP info if camera enabled (fallback for native PiP)
                if (AppConfig.config.camera && document.pictureInPictureEnabled) {
                    elements.pipInfo?.classList.remove('hidden');
                }
            }
        }
    });
    
    elements.stopBtn?.addEventListener('click', () => stopRecording(showToast));
    
    elements.pauseBtn?.addEventListener('click', async () => {
        const recording = await import('./recording.js');
        const isPaused = recording.togglePause(showToast);
        if (isPaused !== undefined) {
            elements.pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
            if (elements.pausedOverlay) {
                elements.pausedOverlay.classList.toggle('hidden', !isPaused);
            }
        }
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('toggle-sidebar');
    sidebarToggle?.addEventListener('click', () => {
        elements.sidebar?.classList.toggle('open');
    });
    
    elements.closeSidebar?.addEventListener('click', () => {
        elements.sidebar?.classList.remove('open');
    });
    
    // Close sidebar on outside click
    document.addEventListener('click', (e) => {
        if (elements.sidebar?.classList.contains('open') &&
            !elements.sidebar.contains(e.target) &&
            !sidebarToggle?.contains(e.target)) {
            elements.sidebar.classList.remove('open');
        }
    });
    
    // New recording
    elements.newRecording?.addEventListener('click', () => {
        stopRecording(showToast);
        updateToggles(false);
        elements.configSummary.textContent = 'Select inputs to start';
    });
    
    // Naming pattern settings
    const namingPatternSettingsBtn = document.getElementById('naming-pattern-settings');
    namingPatternSettingsBtn?.addEventListener('click', () => {
        openNamingPatternModal();
    });
    
    // PiP button - use Document Picture-in-Picture API with custom controls
    elements.enablePipBtn?.addEventListener('click', async () => {
        if (isDocumentPipSupported()) {
            // Use Document PiP with custom controls (system-wide floating window)
            if (RecordingState.cameraVideo || RecordingState.previewCanvas) {
                let stream = null;
                
                if (RecordingState.cameraVideo && RecordingState.cameraVideo.srcObject) {
                    stream = RecordingState.cameraVideo.srcObject;
                } else if (RecordingState.previewCanvas) {
                    stream = RecordingState.previewCanvas.captureStream(30);
                }
                
                if (stream) {
                    await openPipElement(stream);
                } else {
                    showToast('No video stream available', 'error');
                }
            } else {
                showToast('No video stream available', 'error');
            }
        } else {
            // Fallback to native video-only PiP
            try {
                if (RecordingState.cameraVideo) {
                    await RecordingState.cameraVideo.requestPictureInPicture();
                    showToast('Camera entered Picture-in-Picture mode!', 'success');
                    elements.pipInfo?.classList.add('hidden');
                }
            } catch (err) {
                console.error('PiP error:', err);
                openPopupFallback();
            }
        }
    });
    
    // Popup fallback button (for browsers without PiP support)
    elements.enablePopupBtn?.addEventListener('click', () => {
        openPopupFallback();
    });
    
    /**
     * Open popup window as PiP fallback for unsupported browsers
     */
    async function openPopupFallback() {
        const { openRecordingPopup } = await import('./main.js');
        const popup = openRecordingPopup();
        
        if (popup) {
            showToast('Popup opened! Keep it visible to maintain recording.', 'success');
            elements.pipInfo?.classList.add('hidden');
        } else {
            showToast('Popup blocked! Please allow popups for this site.', 'error');
        }
    }
    
    // Clear all
    elements.clearAll?.addEventListener('click', async () => {
        const result = await secureDeleteAll(showToast);
        if (result) {
            populateSavedList();
            updateStorageInfo();
        }
    });
    
    // Load more button
    elements.loadMoreBtn?.addEventListener('click', () => {
        loadMoreRecordings();
    });
    
    // Cleanup storage button
    elements.cleanupStorage?.addEventListener('click', () => {
        toggleCleanupSuggestions();
    });
    
    // Close modal
    elements.closeModal?.addEventListener('click', () => {
        // Stop video playback when closing modal
        if (elements.modalVideo) {
            elements.modalVideo.pause();
            elements.modalVideo.currentTime = 0;
        }
        elements.modal?.classList.add('hidden');
    });
    
    // Download last
    elements.downloadLast?.addEventListener('click', async () => {
        try {
            const videos = await getAllVideos();
            if (videos.length) {
                await downloadSaved(videos[0].id, showToast);
            }
        } catch (err) {
            showToast('No recordings available.', 'error');
        }
    });
    
    // Naming pattern modal events
    setupNamingPatternModal();
    
    // Keyboard shortcuts modal
    elements.shortcutsInfoBtn?.addEventListener('click', () => {
        elements.shortcutsModal?.classList.remove('hidden');
    });
    
    elements.shortcutsModalClose?.addEventListener('click', () => {
        elements.shortcutsModal?.classList.add('hidden');
    });
    
    // Close on backdrop click
    elements.shortcutsModal?.addEventListener('click', (e) => {
        if (e.target === elements.shortcutsModal || e.target.classList.contains('modal-backdrop')) {
            elements.shortcutsModal.classList.add('hidden');
        }
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ============================================
// SIDEBAR TOGGLE
// ============================================

export function toggleSidebar(forceState) {
    if (forceState !== undefined) {
        if (forceState) {
            elements.sidebar?.classList.add('open');
            elements.toggleSidebar.textContent = CONFIG.SIDEBAR_OPEN_TEXT;
        } else {
            elements.sidebar?.classList.remove('open');
            elements.toggleSidebar.textContent = CONFIG.SIDEBAR_CLOSED_TEXT;
        }
    } else {
        elements.sidebar?.classList.toggle('open');
        elements.toggleSidebar.textContent = elements.sidebar?.classList.contains('open') ? CONFIG.SIDEBAR_OPEN_TEXT : CONFIG.SIDEBAR_CLOSED_TEXT;
    }
}

// ============================================
// INITIALIZATION
// ============================================

export async function initUI() {
    // Initialize dark mode first
    initDarkMode();
    
    // Initialize command menu
    new CommandMenu();
    
    initElements();
    
    // Initialize capabilities-based UI adjustments
    initCapabilitiesUI();
    
    // Restore config
    AppConfig.restore();
    
    // Update UI with restored config
    if (elements.screenToggle) elements.screenToggle.checked = AppConfig.config.screen;
    if (elements.cameraToggle) elements.cameraToggle.checked = AppConfig.config.camera;
    if (elements.micToggle) elements.micToggle.checked = AppConfig.config.mic;
    if (elements.systemAudioToggle) elements.systemAudioToggle.checked = AppConfig.config.systemAudio;
    
    updateConfigSummary();
    await populateSavedList();
    await updateStorageInfo();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check system audio support using Capabilities
    if (!Capabilities.screenSharing) {
        if (elements.systemAudioToggle) {
            elements.systemAudioToggle.disabled = true;
            elements.systemAudioToggle.parentElement.style.opacity = '0.5';
            elements.systemAudioToggle.parentElement.style.cursor = 'not-allowed';
        }
        showToast('System audio may need browser extension.', 'info');
    }
    
    // Check media devices support using Capabilities
    if (!Capabilities.mediaDevices || !Capabilities.camera) {
        showToast('Media devices not fully supported in this browser.', 'error');
        if (elements.startBtn) elements.startBtn.disabled = true;
    }
    
    // Disable camera toggle if not supported
    if (!Capabilities.camera && elements.cameraToggle) {
        elements.cameraToggle.disabled = true;
        elements.cameraToggle.parentElement.style.opacity = '0.5';
        elements.cameraToggle.parentElement.style.cursor = 'not-allowed';
    }
    
    // Disable microphone toggle if not supported
    if (!Capabilities.microphone && elements.micToggle) {
        elements.micToggle.disabled = true;
        elements.micToggle.parentElement.style.opacity = '0.5';
        elements.micToggle.parentElement.style.cursor = 'not-allowed';
    }
    
    // Disable screen toggle if not supported
    if (!Capabilities.screenSharing && elements.screenToggle) {
        elements.screenToggle.disabled = true;
        elements.screenToggle.parentElement.style.opacity = '0.5';
        elements.screenToggle.parentElement.style.cursor = 'not-allowed';
    }
    
    // Expose functions for onclick handlers
    window.playVideo = playVideo;
    window.downloadSaved = (id) => downloadSaved(id, showToast);
    window.deleteVideo = (id) => deleteVideo(id, showToast).then(() => {
        populateSavedList();
        updateStorageInfo();
    });
    
    // Expose loadMore for inline onclick handlers
    window.loadMoreRecordings = loadMoreRecordings;
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyboardShortcuts(e) {
    // Don't trigger shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? e.metaKey : e.ctrlKey;
    
    // Cmd/Ctrl + K: Open command menu (handled by CommandMenu class)
    if (modifierKey && e.key === 'k') {
        return; // Let CommandMenu handle this
    }
    
    // Cmd/Ctrl + /: Show shortcuts
    if (modifierKey && e.key === '/') {
        e.preventDefault();
        const shortcutsModal = document.getElementById('shortcuts-modal');
        shortcutsModal?.classList.remove('hidden');
        return;
    }
    
    // Cmd/Ctrl + N: New recording
    if (modifierKey && e.key === 'n') {
        e.preventDefault();
        const screenToggle = document.getElementById('screen-toggle');
        screenToggle?.focus();
        return;
    }
    
    // Cmd/Ctrl + D: Toggle dark mode
    if (modifierKey && e.key === 'd') {
        e.preventDefault();
        toggleDarkMode();
        return;
    }
    
    // Ctrl/Cmd + Shift + R: Start/Stop recording
    if (modifierKey && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        if (RecordingState.isRecording) {
            stopRecording(showToast);
        } else {
            elements.startBtn?.click();
        }
        return;
    }
    
    // Space: Pause/Resume (only when recording)
    if (e.key === ' ' && RecordingState.isRecording) {
        e.preventDefault();
        togglePause(showToast).then(isPaused => {
            if (isPaused !== undefined && elements.pauseBtn) {
                elements.pauseBtn.innerHTML = isPaused ?
                    `<svg viewBox="0 0 16 16" fill="currentColor"><polygon points="4 3 13 8 4 13 4 3"/></svg> Resume` :
                    `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="2" height="10" rx="1"/><rect x="10" y="3" width="2" height="10" rx="1"/></svg> Pause`;
                if (elements.pausedOverlay) {
                    elements.pausedOverlay.classList.toggle('hidden', !isPaused);
                }
            }
        });
        return;
    }
    
    // Escape: Cancel/Stop recording or close modals
    if (e.key === 'Escape') {
        // Close modals first
        const shortcutsModal = document.getElementById('shortcuts-modal');
        const filenameModal = document.getElementById('filename-modal');
        const namingModal = document.getElementById('naming-pattern-modal');
        const commandMenu = document.getElementById('command-menu');
        
        if (!shortcutsModal?.classList.contains('hidden')) {
            shortcutsModal.classList.add('hidden');
            return;
        }
        if (!filenameModal?.classList.contains('hidden')) {
            filenameModal.classList.add('hidden');
            return;
        }
        if (!namingModal?.classList.contains('hidden')) {
            namingModal.classList.add('hidden');
            return;
        }
        if (!commandMenu?.classList.contains('hidden')) {
            commandMenu.classList.add('hidden');
            return;
        }
        
        // Then handle recording
        if (RecordingState.isRecording) {
            e.preventDefault();
            stopRecording(showToast);
        }
        return;
    }
    
    // Ctrl/Cmd + S: Save current recording
    if (modifierKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (RecordingState.isRecording && RecordingState.recordedChunks.length > 0) {
            saveCurrentRecording();
        }
        return;
    }
}

/**
 * Save the current recording while keeping recording active
 */
async function saveCurrentRecording() {
    try {
        const { saveRecording } = await import('./storage.js');
        const config = AppConfig?.config || {};
        const result = await saveRecording(RecordingState.recordedChunks, config, showToast);
        
        if (result && result.saved) {
            showToast('Recording saved!', 'success');
            // Refresh the saved list UI
            await populateSavedList();
            await updateStorageInfo();
        } else if (result && result.cancelled) {
            // User cancelled the save, do nothing
        }
    } catch (err) {
        console.error('Failed to save recording:', err);
        showToast('Failed to save recording.', 'error');
    }
}

// ============================================
// NAMING PATTERN SETTINGS
// ============================================

/**
 * Setup naming pattern modal event listeners
 */
function setupNamingPatternModal() {
    const { namingPatternModal, namingPatternSelect, namingPatternCustom, namingPatternCancel, namingPatternSave, patternPreviewText } = elements;
    
    if (!namingPatternModal || !namingPatternSelect) return;
    
    // Update preview when pattern changes
    const updatePreview = async () => {
        const selected = namingPatternSelect.value;
        let pattern = '';
        
        switch (selected) {
            case 'detailed':
                pattern = '{screen}{camera} - {duration} - {date} {time}';
                namingPatternCustom?.parentElement.classList.add('hidden');
                break;
            case 'simple':
                pattern = '{date} - {duration}';
                namingPatternCustom?.parentElement.classList.add('hidden');
                break;
            case 'minimal':
                pattern = 'Recording {datetime}';
                namingPatternCustom?.parentElement.classList.add('hidden');
                break;
            case 'custom':
                pattern = namingPatternCustom?.value || '{date} - {duration}';
                namingPatternCustom?.parentElement.classList.remove('hidden');
                break;
        }
        
        if (patternPreviewText) {
            const { generateSmartFilename } = await import('./utils.js');
            const preview = generateSmartFilename({
                config: { screen: true, camera: true, mic: false, systemAudio: false },
                duration: 222, // 3m 42s
                pattern
            });
            patternPreviewText.textContent = preview;
        }
    };
    
    namingPatternSelect.addEventListener('change', updatePreview);
    namingPatternCustom?.addEventListener('input', updatePreview);
    
    // Token click to insert
    namingPatternModal.querySelectorAll('.token').forEach(token => {
        token.addEventListener('click', () => {
            if (namingPatternSelect.value === 'custom') {
                const tokenValue = token.dataset.token;
                if (namingPatternCustom) {
                    namingPatternCustom.value += tokenValue;
                    updatePreview();
                }
            }
        });
    });
    
    // Save button
    namingPatternSave?.addEventListener('click', async () => {
        const { saveNamingPattern } = await import('./utils.js');
        const selected = namingPatternSelect.value;
        let pattern = '';
        
        switch (selected) {
            case 'detailed':
                pattern = '{screen}{camera} - {duration} - {date} {time}';
                break;
            case 'simple':
                pattern = '{date} - {duration}';
                break;
            case 'minimal':
                pattern = 'Recording {datetime}';
                break;
            case 'custom':
                pattern = namingPatternCustom?.value || '{date} - {duration}';
                break;
        }
        
        saveNamingPattern(pattern);
        namingPatternModal.classList.add('hidden');
        showToast('Naming pattern saved!', 'success');
    });
    
    // Cancel button
    namingPatternCancel?.addEventListener('click', () => {
        namingPatternModal.classList.add('hidden');
    });
    
    // Close button
    const closeBtn = namingPatternModal.querySelector('.naming-pattern-modal-close');
    closeBtn?.addEventListener('click', () => {
        namingPatternModal.classList.add('hidden');
    });
    
    // Close on backdrop click
    namingPatternModal.addEventListener('click', (e) => {
        if (e.target === namingPatternModal) {
            namingPatternModal.classList.add('hidden');
        }
    });
}

/**
 * Open naming pattern settings modal
 */
export async function openNamingPatternModal() {
    const { namingPatternModal, namingPatternSelect, namingPatternCustom, patternPreviewText } = elements;
    
    if (!namingPatternModal) return;
    
    // Load current pattern
    const { getNamingPattern, generateSmartFilename } = await import('./utils.js');
    const currentPattern = getNamingPattern();
    
    // Determine which option matches the current pattern
    let selectedValue = 'custom';
    namingPatternCustom?.parentElement.classList.add('hidden');
    
    if (currentPattern === '{screen}{camera} - {duration} - {date} {time}') {
        selectedValue = 'detailed';
    } else if (currentPattern === '{date} - {duration}') {
        selectedValue = 'simple';
    } else if (currentPattern === 'Recording {datetime}') {
        selectedValue = 'minimal';
    } else {
        selectedValue = 'custom';
        namingPatternCustom?.parentElement.classList.remove('hidden');
        namingPatternCustom.value = currentPattern;
    }
    
    namingPatternSelect.value = selectedValue;
    
    // Update preview
    if (patternPreviewText) {
        const preview = generateSmartFilename({
            config: { screen: true, camera: true, mic: false, systemAudio: false },
            duration: 222,
            pattern: currentPattern
        });
        patternPreviewText.textContent = preview;
    }
    
    namingPatternModal.classList.remove('hidden');
}