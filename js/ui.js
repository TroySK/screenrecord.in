// ============================================
// UI MODULE - DOM Manipulation
// ============================================

import { createElement, sanitizeTitle, formatDuration, formatFileSize, formatDate, STATE_VERSION, STORAGE_KEY, VALID_CONFIG_KEYS, VALID_CONFIG_VALUES, CONFIG, Capabilities, initCapabilitiesUI } from './utils.js';
import { getAllVideos, getVideo, downloadSaved, deleteVideo, secureDeleteAll, getStorageInfo, getVideosPaginated, getVideosCount, getCleanupSuggestions } from './storage.js';
import { startRecording, stopRecording, RecordingState } from './recording.js';
import { Validator, RecordingConfigValidator, StorageValidator, ValidationMessages } from './validation.js';

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
    recordingTimer: null
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
 * Create a video card element for a single recording
 * @param {Object} video - Video object from database
 * @returns {HTMLElement} - The card element
 */
function createVideoCard(video) {
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
            elements.startBtn.disabled = true;
            updateToggles(true);
            
            // Show preview canvas if exists
            if (RecordingState.previewCanvas && elements.previewArea) {
                elements.previewArea.insertBefore(RecordingState.previewCanvas, elements.previewVideo);
                elements.previewVideo.style.display = 'none';
                elements.previewArea.classList.remove('hidden');
            }
            
            // Show recording timer
            if (elements.recordingTimer) {
                elements.recordingTimer.style.display = 'block';
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
            elements.systemAudioToggle.title = 'System audio requires Chrome with flag or extension';
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
        elements.cameraToggle.title = 'Camera not supported on this browser';
    }
    
    // Disable microphone toggle if not supported
    if (!Capabilities.microphone && elements.micToggle) {
        elements.micToggle.disabled = true;
        elements.micToggle.title = 'Microphone not supported on this browser';
    }
    
    // Disable screen toggle if not supported
    if (!Capabilities.screenSharing && elements.screenToggle) {
        elements.screenToggle.disabled = true;
        elements.screenToggle.title = 'Screen sharing not supported on this browser';
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