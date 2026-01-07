// ============================================
// INDEXEDDB STORAGE MODULE
// ============================================

import { ErrorHandler, generateThumbnail, formatFileSize, formatDate, generateVideoTitle, generateSmartFilename, generateUniqueFilename, CONFIG, StorageRetry, estimateStorageUsage } from './utils.js';
import { StorageValidator, Validator } from './validation.js';

// Database configuration - use CONFIG values
const DB_NAME = CONFIG.DB_NAME;
const DB_VERSION = CONFIG.DB_VERSION;
const STORE_NAME = CONFIG.STORE_NAME;

// Pagination configuration
const PAGINATION_PAGE_SIZE = CONFIG.PAGINATION_PAGE_SIZE || 10;

// ============================================
// DATABASE OPERATIONS
// ============================================

export function openDB() {
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

export async function addVideo(videoObj) {
    return StorageRetry.execute(async () => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.add(videoObj);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }, {
        maxRetries: 2,
        initialDelay: 500,
        onRetry: (info) => {
            console.warn(`[Storage] Retry attempt ${info.attempt}/${info.maxRetries} for addVideo`);
        }
    });
}

export async function getAllVideos() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result.reverse()); // Newest first
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get total count of videos in database
 * @returns {Promise<number>} - Total number of videos
 */
export async function getVideosCount() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.count();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get videos with pagination support
 * @param {number} offset - Number of records to skip
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Object>} - Object with videos array and pagination info
 */
export async function getVideosPaginated(offset = 0, limit = PAGINATION_PAGE_SIZE) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('date');
        
        // Get total count first
        const countRequest = store.count();
        countRequest.onsuccess = async () => {
            const totalCount = countRequest.result;
            
            // Use IDBKeyRange to get records in reverse order (newest first)
            // Since we want newest first, we need to get all and slice
            const allRequest = store.getAll();
            
            allRequest.onsuccess = () => {
                const allVideos = allRequest.result.reverse(); // Newest first
                const videos = allVideos.slice(offset, offset + limit);
                const hasMore = offset + limit < totalCount;
                
                resolve({
                    videos,
                    totalCount,
                    hasMore,
                    offset,
                    limit,
                    displayedCount: videos.length
                });
            };
            
            allRequest.onerror = () => reject(allRequest.error);
        };
        
        countRequest.onerror = () => reject(countRequest.error);
    });
}

/**
 * Get videos for infinite scroll (loads next batch)
 * @param {number} page - Page number (1-indexed)
 * @returns {Promise<Object>} - Object with videos array and pagination info
 */
export async function getVideosPage(page = 1) {
    const offset = (page - 1) * PAGINATION_PAGE_SIZE;
    return getVideosPaginated(offset, PAGINATION_PAGE_SIZE);
}

export async function getVideo(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteVideoFromDB(id) {
    return StorageRetry.execute(async () => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

export async function clearAllVideos() {
    return StorageRetry.execute(async () => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

// ============================================
// VIDEO MANAGEMENT
// ============================================

/**
 * Show filename edit modal and get user confirmation
 * @param {Object} options - Options for filename generation
 * @returns {Promise<string|null>} - User-edited filename or null if cancelled
 */
export async function showFilenameEditModal(options) {
    return new Promise((resolve) => {
        const modal = document.getElementById('filename-modal');
        const input = document.getElementById('filename-input');
        const preview = document.getElementById('filename-preview-text');
        const saveBtn = document.getElementById('filename-save');
        const cancelBtn = document.getElementById('filename-cancel');
        const closeBtn = modal?.querySelector('.modal-close');
        
        if (!modal || !input || !preview || !saveBtn || !cancelBtn || !closeBtn) {
            // Fallback if modal elements don't exist
            resolve(generateUniqueFilename(options));
            return;
        }
        
        // Generate initial filename
        const initialFilename = generateUniqueFilename(options);
        input.value = initialFilename;
        preview.textContent = `${initialFilename}.mp4`;
        
        // Update preview on input change
        const updatePreview = () => {
            const value = input.value.trim();
            preview.textContent = value ? `${value}.mp4` : `${initialFilename}.mp4`;
        };
        
        input.oninput = updatePreview;
        
        // Show modal
        modal.classList.remove('hidden');
        input.focus();
        input.select();
        
        const cleanup = () => {
            modal.classList.add('hidden');
            input.oninput = null;
            saveBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
        };
        
        const handleSave = () => {
            cleanup();
            const filename = input.value.trim() || initialFilename;
            resolve(filename);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(null);
        };
        
        saveBtn.onclick = handleSave;
        cancelBtn.onclick = handleCancel;
        closeBtn.onclick = handleCancel;
        
        // Handle Enter key
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        };
        
        // Close on backdrop click
        modal.onclick = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };
    });
}

export async function saveRecording(chunks, config, showToast = null) {
    if (!chunks || chunks.length === 0) {
        // Silent return for empty recordings - not an error, just nothing to save
        return null;
    }
    
    const videoBlob = new Blob(chunks, { type: 'video/mp4' });
    const size = videoBlob.size;
    
    // Check size limit using validation module
    const sizeValidation = StorageValidator.validateFileSize({ size }, CONFIG.MAX_FILE_SIZE);
    if (!sizeValidation.isValid) {
        ErrorHandler.handleStorageFull(showToast);
        return { blob: videoBlob, filename: 'recording.mp4', saved: false };
    }
    
    // Check storage quota before saving
    const quotaValidation = await StorageValidator.checkStorageQuota(size);
    if (!quotaValidation.isValid) {
        if (showToast) showToast(quotaValidation.firstError, 'error');
        return { blob: videoBlob, filename: 'recording.mp4', saved: false };
    }
    
    // Generate thumbnail with longer timeout
    let thumbnail = null;
    try {
        thumbnail = await generateThumbnail(videoBlob);
    } catch (err) {
        console.warn('Thumbnail generation failed:', err);
    }
    
    // Get duration
    const tempVideo = document.createElement('video');
    const { URLManager } = await import('./utils.js');
    const tempUrl = URLManager.create(URL.createObjectURL(videoBlob));
    tempVideo.src = tempUrl;
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    let duration = 0;
    
    try {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), CONFIG.VIDEO_METADATA_TIMEOUT);
            
            tempVideo.onloadedmetadata = () => {
                clearTimeout(timeout);
                duration = tempVideo.duration || 0;
                resolve();
            };
            tempVideo.onerror = (e) => {
                clearTimeout(timeout);
                console.warn('Video metadata error:', e);
                reject(new Error('Metadata load failed'));
            };
            tempVideo.load();
        });
    } catch (err) {
        console.warn('Duration fetch failed:', err);
        duration = 0;
    }
    URLManager.revoke(tempUrl);
    
    // Show filename edit modal
    const filenameOptions = {
        config,
        duration,
        counter: null
    };
    
    const editedFilename = await showFilenameEditModal(filenameOptions);
    
    if (editedFilename === null) {
        // User cancelled
        return { blob: videoBlob, filename: 'recording.mp4', saved: false, cancelled: true };
    }
    
    // Create video object - ensure thumbnail is a valid string
    const videoObj = {
        id: Date.now().toString(),
        title: editedFilename,
        date: new Date().toISOString(),
        thumbnail: typeof thumbnail === 'string' && thumbnail.length > 0 ? thumbnail : '',
        videoBlob,
        config,
        duration,
        size
    };
    
    try {
        await addVideo(videoObj);
        if (showToast) showToast('Recording saved!', 'success');
        return { ...videoObj, saved: true };
    } catch (err) {
        console.error('Failed to save recording:', err);
        ErrorHandler.handleSaveFailed(showToast);
        return { blob: videoBlob, filename: 'recording.mp4', saved: false };
    }
}

export async function downloadVideo(blob, filename, showToast = null) {
    const { URLManager } = await import('./utils.js');
    const url = URLManager.create(URL.createObjectURL(blob));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URLManager.revoke(url);
}

export async function downloadSaved(id, showToast = null) {
    try {
        const video = await getVideo(id);
        if (video && video.videoBlob) {
            const { generateSafeFilename } = await import('./utils.js');
            const safeTitle = generateSafeFilename(video.title);
            await downloadVideo(video.videoBlob, `${safeTitle}.mp4`, showToast);
        }
    } catch (err) {
        ErrorHandler.handle(err, 'Failed to download video.', showToast);
    }
}

export async function deleteVideo(id, showToast = null) {
    try {
        const video = await getVideo(id);
        const { sanitizeTitle } = await import('./utils.js');
        const videoTitle = sanitizeTitle(video?.title || 'this recording');
        
        if (confirm(`Delete "${videoTitle}"? This cannot be undone.`)) {
            await deleteVideoFromDB(id);
            if (showToast) showToast('Recording deleted.');
            return true;
        }
    } catch (err) {
        ErrorHandler.handle(err, 'Failed to delete recording.', showToast);
    }
    return false;
}

export async function secureDeleteAll(showToast = null) {
    const confirmationInput = prompt('Type "DELETE" to confirm deletion of ALL recordings:');
    if (confirmationInput !== 'DELETE') {
        if (showToast) showToast('Deletion cancelled. You must type "DELETE" to confirm.', 'info');
        return false;
    }
    
    try {
        await clearAllVideos();
        if (showToast) showToast('All recordings have been permanently deleted.', 'success');
        return true;
    } catch (err) {
        ErrorHandler.handle(err, 'Failed to clear recordings.', showToast);
    }
    return false;
}

// ============================================
// STORAGE INFO
// ============================================

export async function getStorageInfo(showToast = null) {
    try {
        const used = await estimateStorageUsage();
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const quota = estimate.quota || 0;
            
            if (used > quota * 0.8 && showToast) {
                showToast('Storage nearing limit. Consider deleting old recordings.', 'warning');
            }
            
            return {
                used,
                quota,
                usedMB: (used / 1024 / 1024).toFixed(2),
                quotaMB: (quota / 1024 / 1024).toFixed(0),
                percentFull: ((used / quota) * 100).toFixed(1),
                status: used > quota * 0.9 ? 'danger' : used > quota * 0.7 ? 'warning' : 'normal'
            };
        }
        return { usedMB: (used / 1024 / 1024).toFixed(2), status: 'normal' };
    } catch (err) {
        return { error: true, status: 'normal' };
    }
}

/**
 * Get all recordings with their sizes for cleanup suggestions
 * @returns {Promise<Array>} - Array of video objects with size info
 */
export async function getRecordingsWithSizes() {
    try {
        const videos = await getAllVideos();
        return videos.map(video => ({
            id: video.id,
            title: video.title,
            date: video.date,
            duration: video.duration,
            size: video.size,
            sizeMB: (video.size / 1024 / 1024).toFixed(2)
        })).sort((a, b) => b.size - a.size); // Sort by size descending
    } catch (err) {
        console.error('Error getting recordings with sizes:', err);
        return [];
    }
}

/**
 * Get cleanup suggestions based on storage usage
 * @returns {Promise<Object>} - Cleanup suggestions object
 */
export async function getCleanupSuggestions() {
    try {
        const storageInfo = await getStorageInfo();
        const recordings = await getRecordingsWithSizes();
        
        if (recordings.length === 0) {
            return { hasSuggestions: false, message: 'No recordings to clean up.' };
        }
        
        const suggestions = [];
        const totalSize = recordings.reduce((sum, r) => sum + r.size, 0);
        
        // Suggest deleting largest recordings if storage is full
        if (storageInfo.percentFull && parseFloat(storageInfo.percentFull) > 80) {
            const spaceNeeded = totalSize * 0.3; // Free up 30%
            let freedSpace = 0;
            
            for (const recording of recordings) {
                if (freedSpace >= spaceNeeded) break;
                suggestions.push(recording);
                freedSpace += recording.size;
            }
        }
        
        // Suggest deleting old recordings
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const oldRecordings = recordings.filter(r => new Date(r.date).getTime() < thirtyDaysAgo);
        
        // Merge old recordings with size-based suggestions
        const suggestionIds = new Set(suggestions.map(s => s.id));
        for (const recording of oldRecordings) {
            if (!suggestionIds.has(recording.id)) {
                suggestions.push(recording);
            }
        }
        
        return {
            hasSuggestions: suggestions.length > 0,
            recordings: suggestions,
            totalRecordings: recordings.length,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            storageStatus: storageInfo.status
        };
    } catch (err) {
        console.error('Error getting cleanup suggestions:', err);
        return { hasSuggestions: false, message: 'Unable to analyze storage.' };
    }
}