// ============================================
// UI MODULE - DOM Manipulation
// ============================================

import { createElement, sanitizeTitle, formatDuration, formatFileSize, formatDate, STATE_VERSION, STORAGE_KEY, VALID_CONFIG_KEYS, VALID_CONFIG_VALUES, CONFIG } from './utils.js';
import { getAllVideos, getVideo, downloadSaved, deleteVideo, secureDeleteAll, getStorageInfo } from './storage.js';
import { startRecording, stopRecording, RecordingState } from './recording.js';

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
    previewArea: null,
    previewVideo: null,
    pipInfo: null,
    enablePipBtn: null,
    configSummary: null,
    sidebar: null,
    toggleSidebar: null,
    savedList: null,
    clearAll: null,
    newRecording: null,
    modal: null,
    modalVideo: null,
    closeModal: null,
    closeSidebar: null,
    storageInfo: null,
    errorNotifications: null,
    downloadLast: null
};

// Initialize element references
export function initElements() {
    elements.screenToggle = document.getElementById('screen-toggle');
    elements.cameraToggle = document.getElementById('camera-toggle');
    elements.micToggle = document.getElementById('mic-toggle');
    elements.systemAudioToggle = document.getElementById('system-audio-toggle');
    elements.startBtn = document.getElementById('start-recording');
    elements.stopBtn = document.getElementById('stop-recording');
    elements.previewArea = document.getElementById('preview-area');
    elements.previewVideo = document.getElementById('preview-video');
    elements.pipInfo = document.getElementById('pip-info');
    elements.enablePipBtn = document.getElementById('enable-pip');
    elements.configSummary = document.getElementById('config-summary');
    elements.sidebar = document.getElementById('sidebar');
    elements.toggleSidebar = document.getElementById('toggle-sidebar');
    elements.savedList = document.getElementById('saved-list');
    elements.clearAll = document.getElementById('clear-all');
    elements.newRecording = document.getElementById('new-recording');
    elements.modal = document.getElementById('modal-player');
    elements.modalVideo = document.getElementById('modal-video');
    elements.closeModal = document.querySelector('.close');
    elements.closeSidebar = document.getElementById('close-sidebar');
    elements.storageInfo = document.getElementById('storage-info');
    elements.errorNotifications = document.getElementById('error-notifications');
    elements.downloadLast = document.getElementById('download-last');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

export function showToast(message, type = 'info') {
    if (!elements.errorNotifications) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.errorNotifications.appendChild(toast);
    setTimeout(() => toast.remove(), CONFIG.TOAST_DURATION);
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
    }
}

// ============================================
// SAVED RECORDINGS LIST
// ============================================

export async function populateSavedList() {
    if (!elements.savedList) return;
    
    try {
        const videos = await getAllVideos();
        elements.savedList.innerHTML = '';
        
        if (videos.length === 0) {
            const emptyMsg = createElement('p', {
                className: 'empty-state',
                textContent: CONFIG.EMPTY_RECORDINGS_MESSAGE
            });
            elements.savedList.appendChild(emptyMsg);
            return;
        }
        
        videos.forEach(video => {
            const card = createElement('div', { className: 'saved-card' });
            
            // Thumbnail
            const thumbnail = createElement('img', {
                src: video.thumbnail,
                alt: 'Thumbnail'
            });
            
            const info = createElement('div', { className: 'saved-card-info' });
            
            // Title
            const title = createElement('h3', {
                textContent: sanitizeTitle(video.title)
            });
            
            // Date and duration
            const dateStr = formatDate(video.date);
            const durationStr = `${(video.duration || 0).toFixed(1)}s`;
            const meta1 = createElement('p', { textContent: `${dateStr} | ${durationStr}` });
            
            // Config
            const configStr = Object.keys(video.config)
                .filter(k => video.config[k])
                .map(k => k.replace(/([A-Z])/g, ' $1').trim())
                .join(', ');
            const meta2 = createElement('p', { textContent: `Config: ${configStr}` });
            
            // Size
            const sizeStr = formatFileSize(video.size || 0);
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
                onclick: () => downloadSaved(video.id, showToast)
            });
            
            const deleteBtn = createElement('button', {
                className: 'delete-btn',
                textContent: 'Delete',
                onclick: () => deleteVideo(video.id, showToast).then(() => {
                    populateSavedList();
                    updateStorageInfo();
                })
            });
            
            actions.appendChild(playBtn);
            actions.appendChild(downloadBtn);
            actions.appendChild(deleteBtn);
            
            card.appendChild(thumbnail);
            card.appendChild(info);
            card.appendChild(actions);
            
            elements.savedList.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading recordings:', err);
        elements.savedList.innerHTML = '';
        const errorMsg = createElement('p', {
            className: 'empty-state',
            textContent: CONFIG.ERROR_LOADING_MESSAGE
        });
        elements.savedList.appendChild(errorMsg);
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
        const result = await startRecording(AppConfig.config, showToast);
        if (result) {
            elements.stopBtn.style.display = 'block';
            elements.startBtn.disabled = true;
            updateToggles(true);
            
            // Show preview canvas if exists
            if (RecordingState.previewCanvas && elements.previewArea) {
                elements.previewArea.insertBefore(RecordingState.previewCanvas, elements.previewVideo);
                elements.previewVideo.style.display = 'none';
                elements.previewArea.classList.remove('hidden');
            }
            
            // Show PiP info if camera enabled
            if (AppConfig.config.camera && document.pictureInPictureEnabled) {
                elements.pipInfo?.classList.remove('hidden');
            }
        }
    });
    
    elements.stopBtn?.addEventListener('click', () => stopRecording(showToast));
    
    // Sidebar
    elements.toggleSidebar?.addEventListener('click', () => {
        elements.sidebar?.classList.toggle('open');
        elements.toggleSidebar.textContent = elements.sidebar?.classList.contains('open') ? CONFIG.SIDEBAR_OPEN_TEXT : CONFIG.SIDEBAR_CLOSED_TEXT;
    });
    
    elements.closeSidebar?.addEventListener('click', () => {
        elements.sidebar?.classList.remove('open');
        elements.toggleSidebar.textContent = CONFIG.SIDEBAR_CLOSED_TEXT;
    });
    
    // Close sidebar on outside click
    document.addEventListener('click', (e) => {
        if (elements.sidebar?.classList.contains('open') &&
            !elements.sidebar.contains(e.target) &&
            !elements.toggleSidebar.contains(e.target)) {
            elements.sidebar.classList.remove('open');
            elements.toggleSidebar.textContent = CONFIG.SIDEBAR_CLOSED_TEXT;
        }
    });
    
    // New recording
    elements.newRecording?.addEventListener('click', () => {
        stopRecording(showToast);
        updateToggles(false);
        elements.configSummary.textContent = 'Select inputs to start';
    });
    
    // PiP button
    elements.enablePipBtn?.addEventListener('click', () => {
        if (RecordingState.cameraVideo && !document.pictureInPictureElement) {
            RecordingState.cameraVideo.requestPictureInPicture()
                .then(() => {
                    showToast('Camera entered Picture-in-Picture mode!', 'success');
                    elements.pipInfo?.classList.add('hidden');
                })
                .catch(err => {
                    console.error('PiP error:', err);
                });
        }
    });
    
    // Clear all
    elements.clearAll?.addEventListener('click', async () => {
        const result = await secureDeleteAll(showToast);
        if (result) {
            populateSavedList();
            updateStorageInfo();
        }
    });
    
    // Close modal
    elements.closeModal?.addEventListener('click', () => {
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
    initElements();
    
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
    
    // Check system audio support
    if (!navigator.mediaDevices.getDisplayMedia) {
        elements.systemAudioToggle.disabled = true;
        elements.systemAudioToggle.title = 'System audio requires Chrome with flag or extension';
        showToast('System audio may need browser extension.', 'info');
    }
    
    // Check media devices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Media devices not supported in this browser.', 'error');
        elements.startBtn.disabled = true;
    }
    
    // Expose functions for onclick handlers
    window.playVideo = playVideo;
    window.downloadSaved = (id) => downloadSaved(id, showToast);
    window.deleteVideo = (id) => deleteVideo(id, showToast).then(() => {
        populateSavedList();
        updateStorageInfo();
    });
}