// ============================================
// RECORDING MODULE - MediaRecorder Logic
// ============================================

import {
    CONFIG, ErrorHandler, URLManager, AudioContextManager, PerformanceMonitor,
    waitForVideoDimensions, STATE_VERSION, STORAGE_KEY, PermissionManager, RetryManager
} from './utils.js';
import { saveRecording, downloadVideo } from './storage.js';

// ============================================
// APP STATE (Recording-specific)
// ============================================

export const RecordingState = {
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
    _isPaused: false,
    _audioContext: null,
    _currentVideoId: null,
    _draftInterval: null,
    _recordingStartTime: null,
    _pausedStartTime: null,
    _totalPausedDuration: 0,
    _timerAnimationId: null,
    _originalTitle: document.title,
    
    // Getters/Setters
    get isRecording() { return this._isRecording; },
    set isRecording(value) { this._isRecording = Boolean(value); },
    
    get isPaused() { return this._isPaused; },
    set isPaused(value) { this._isPaused = Boolean(value); },
    
    get recordedChunks() { return [...this._recordedChunks]; },
    set recordedChunks(chunks) { 
        if (Array.isArray(chunks)) this._recordedChunks = chunks; 
    },
    
    addRecordedChunk(chunk) {
        if (chunk && chunk instanceof Blob) this._recordedChunks.push(chunk);
    },
    
    clearRecordedChunks() { this._recordedChunks = []; },
    
    get mediaRecorder() { return this._mediaRecorder; },
    set mediaRecorder(recorder) { this._mediaRecorder = recorder; },
    
    get mediaStream() { return this._mediaStream; },
    set mediaStream(stream) { this._mediaStream = stream; },
    
    get animationId() { return this._animationId; },
    set animationId(id) { this._animationId = id; },
    
    get recordingCanvas() { return this._recordingCanvas; },
    set recordingCanvas(canvas) { this._recordingCanvas = canvas; },
    
    get previewCanvas() { return this._previewCanvas; },
    set previewCanvas(canvas) { this._previewCanvas = canvas; },
    
    get screenVideo() { return this._screenVideo; },
    set screenVideo(video) { this._screenVideo = video; },
    
    get cameraVideo() { return this._cameraVideo; },
    set cameraVideo(video) { this._cameraVideo = video; },
    
    get screenStream() { return this._screenStream; },
    set screenStream(stream) { this._screenStream = stream; },
    
    get cameraStream() { return this._cameraStream; },
    set cameraStream(stream) { this._cameraStream = stream; },
    
    get micStream() { return this._micStream; },
    set micStream(stream) { this._micStream = stream; },
    
    get audioContext() { return this._audioContext; },
    set audioContext(ctx) { this._audioContext = ctx; },
    
    get currentVideoId() { return this._currentVideoId; },
    set currentVideoId(id) { this._currentVideoId = id; },
    
    get draftInterval() { return this._draftInterval; },
    set draftInterval(interval) { this._draftInterval = interval; },
    
    get recordingStartTime() { return this._recordingStartTime; },
    set recordingStartTime(time) { this._recordingStartTime = time; },
    
    get pausedStartTime() { return this._pausedStartTime; },
    set pausedStartTime(time) { this._pausedStartTime = time; },
    
    get totalPausedDuration() { return this._totalPausedDuration; },
    set totalPausedDuration(duration) { this._totalPausedDuration = duration; },
    
    get timerAnimationId() { return this._timerAnimationId; },
    set timerAnimationId(id) { this._timerAnimationId = id; },
    
    reset() {
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
        this._isPaused = false;
        this._audioContext = null;
        this._currentVideoId = null;
        this._recordingStartTime = null;
        this._pausedStartTime = null;
        this._totalPausedDuration = 0;
        
        // Stop timer animation
        if (this._timerAnimationId) {
            cancelAnimationFrame(this._timerAnimationId);
            this._timerAnimationId = null;
        }
        
        // Restore original title
        document.title = this._originalTitle;
        
        if (this._draftInterval) {
            clearInterval(this._draftInterval);
            this._draftInterval = null;
        }
    }
};

// ============================================
// RECORDING TIMER
// ============================================

// Timer configuration
const TIMER_WARNING_THRESHOLD = 3600; // 60 minutes - start flashing warning
const TIMER_FLASH_INTERVAL = 500; // Flash every 500ms when approaching max duration

/**
 * Format duration in MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatTimerDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// WATERMARK DRAWING
// ============================================

/**
 * Draw watermark logo on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function drawWatermark(ctx, width, height) {
    const watermarkScale = 0.08; // Scale relative to canvas size
    const padding = 30;
    
    // Calculate dimensions based on canvas size
    const logoSize = Math.min(width, height) * watermarkScale;
    const textSize = logoSize * 0.5;
    
    // Position: top-left corner
    const x = padding + logoSize / 2;
    const y = padding + textSize / 2 + textSize * 0.3;
    
    // Draw outer circle (ring)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = Math.max(1, logoSize * 0.04);
    ctx.beginPath();
    ctx.arc(x, y - textSize * 0.3, logoSize * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw inner circle (filled)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y - textSize * 0.3, logoSize * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw text
    ctx.font = `500 ${textSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('ScreenRecord.in', x + logoSize * 0.6, y - 10);
    
    ctx.restore();
}

/**
 * Update the recording timer display and document title
 * @param {Function} showToast - Optional toast notification function
 */
function updateRecordingTimer(showToast = null) {
    if (!RecordingState.isRecording || !RecordingState.recordingStartTime) return;
    
    // Calculate elapsed time, excluding paused duration
    const currentTime = Date.now();
    const elapsed = (currentTime - RecordingState.recordingStartTime - RecordingState.totalPausedDuration) / 1000;
    const formattedTime = formatTimerDuration(elapsed);
    
    // Update document title with timer
    const prefix = RecordingState.isPaused ? '⏸ ' : '● ';
    document.title = `${prefix}${formattedTime} - ScreenRecord.in`;
    
    // Update timer display in preview area if it exists
    const timerElement = document.getElementById('recording-timer');
    if (timerElement) {
        timerElement.textContent = formattedTime;
        
        // Flash warning when approaching max duration (5 minutes)
        if (elapsed >= TIMER_WARNING_THRESHOLD) {
            const shouldShowWarning = Math.floor(Date.now() / TIMER_FLASH_INTERVAL) % 2 === 0;
            timerElement.classList.toggle('timer-warning-flash', shouldShowWarning);
        } else {
            timerElement.classList.remove('timer-warning-flash');
        }
    }
    
    // Continue the animation loop
    RecordingState.timerAnimationId = requestAnimationFrame(() => updateRecordingTimer(showToast));
}

/**
 * Start the recording timer
 * @param {Function} showToast - Optional toast notification function
 */
export function startRecordingTimer(showToast = null) {
    RecordingState.recordingStartTime = Date.now();
    RecordingState.timerAnimationId = requestAnimationFrame(() => updateRecordingTimer(showToast));
}

/**
 * Stop the recording timer and restore document title
 */
export function stopRecordingTimer() {
    if (RecordingState.timerAnimationId) {
        cancelAnimationFrame(RecordingState.timerAnimationId);
        RecordingState.timerAnimationId = null;
    }
    
    // Restore original title
    document.title = RecordingState._originalTitle;
    
    // Remove warning class from timer element
    const timerElement = document.getElementById('recording-timer');
    if (timerElement) {
        timerElement.classList.remove('timer-warning-flash');
    }
}

// ============================================
// CLEANUP
// ============================================

export function cleanupRecording() {
    // Stop draft interval
    if (RecordingState.draftInterval) {
        clearInterval(RecordingState.draftInterval);
        RecordingState.draftInterval = null;
    }
    
    // Cancel animation frames
    if (RecordingState.animationId) {
        cancelAnimationFrame(RecordingState.animationId);
        RecordingState.animationId = null;
    }
    
    // Stop media recorder
    if (RecordingState.mediaRecorder && RecordingState.mediaRecorder.state !== 'inactive') {
        try {
            RecordingState.mediaRecorder.stop();
        } catch (e) {
            // Ignore
        }
    }
    
    // Stop all media streams
    [RecordingState.mediaStream, RecordingState.screenStream, RecordingState.cameraStream, RecordingState.micStream].forEach(stream => {
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
    RecordingState.audioContext = null;
    
    // Revoke all object URLs
    URLManager.revokeAll();
    
    // Clean up video elements
    [RecordingState.screenVideo, RecordingState.cameraVideo].forEach(video => {
        if (video) {
            video.pause();
            video.srcObject = null;
        }
    });
    
    // Remove preview canvas
    if (RecordingState.previewCanvas) {
        RecordingState.previewCanvas.remove();
        RecordingState.previewCanvas = null;
    }
    
    // Stop performance monitoring
    PerformanceMonitor.stop();
    
    // Reset state
    RecordingState.reset();
}

// ============================================
// STREAM SETUP
// ============================================

export async function getMediaStream(config, showToast = null) {
    const streams = [];
    let audioStream = null;
    let mixedAudioTrack = null;
    
    if (config.screen) {
        try {
            RecordingState.screenStream = await PermissionManager.requestScreenShare({
                audio: config.systemAudio
            }, showToast);
            
            const videoTrack = RecordingState.screenStream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            
            if (settings.displaySurface === 'browser' || settings.displaySurface === 'window') {
                const controller = new CaptureController();
                controller.setFocusBehavior('no-focus-change');
            }
            
            streams.push(RecordingState.screenStream);
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                ErrorHandler.handlePermissionDenied('screen', showToast);
            } else {
                ErrorHandler.handle(err, `Screen share failed: ${err.message}`, showToast);
            }
            return null;
        }
    }
    
    if (config.camera) {
        try {
            RecordingState.cameraStream = await PermissionManager.requestCamera({}, showToast);
            streams.push(RecordingState.cameraStream);
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                ErrorHandler.handlePermissionDenied('camera', showToast);
            } else {
                ErrorHandler.handle(err, `Camera access failed: ${err.message}`, showToast);
            }
            return null;
        }
    }
    
    if (config.mic) {
        try {
            RecordingState.micStream = await PermissionManager.requestMicrophone({}, showToast);
            if (streams.length === 0) streams.push(new MediaStream());
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                ErrorHandler.handlePermissionDenied('microphone', showToast);
            } else {
                ErrorHandler.handle(err, `Microphone access failed: ${err.message}`, showToast);
            }
            return null;
        }
    }
    
    audioStream = RecordingState.micStream;
    
    if (streams.length === 0) return null;
    
    // Mix audio if both mic and system audio are enabled
    if (config.mic && config.systemAudio && audioStream && streams[0] && streams[0].getAudioTracks().length > 0) {
        try {
            RecordingState.audioContext = AudioContextManager.create();
            if (RecordingState.audioContext) {
                const micSource = RecordingState.audioContext.createMediaStreamSource(audioStream);
                const systemSource = RecordingState.audioContext.createMediaStreamSource(new MediaStream(streams[0].getAudioTracks()));
                const destination = RecordingState.audioContext.createMediaStreamDestination();
                micSource.connect(destination);
                systemSource.connect(destination);
                mixedAudioTrack = destination.stream.getAudioTracks()[0];
            }
        } catch (err) {
            console.warn('Audio mixing failed:', err);
            mixedAudioTrack = null;
        }
    }
    
    // Combine streams
    const combined = new MediaStream();
    streams.forEach(s => {
        s.getVideoTracks().forEach(track => combined.addTrack(track));
        if (!config.systemAudio || !config.mic || !mixedAudioTrack) {
            s.getAudioTracks().forEach(track => combined.addTrack(track));
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

// ============================================
// RECORDING CONTROL
// ============================================

export async function startRecording(config, showToast = null) {
    try {
        PerformanceMonitor.start();
        
        RecordingState.mediaStream = await getMediaStream(config, showToast);
        if (!RecordingState.mediaStream) {
            PerformanceMonitor.stop();
            ErrorHandler.handle(null, 'No valid inputs selected or permissions granted.', showToast);
            return false;
        }
        
        let recordingStream = RecordingState.mediaStream;
        
        if (config.screen && config.camera) {
            // Screen + Camera overlay mode
            const originalScreenTrack = RecordingState.mediaStream.getVideoTracks()[0];
            const originalCameraTrack = RecordingState.mediaStream.getVideoTracks()[1];
            
            const screenTrack = originalScreenTrack.clone();
            const cameraTrack = originalCameraTrack.clone();
            
            const screenSettings = originalScreenTrack.getSettings();
            const cameraSettings = originalCameraTrack.getSettings();
            const canvasWidth = screenSettings.width || CONFIG.DEFAULT_VIDEO_WIDTH;
            const canvasHeight = screenSettings.height || CONFIG.DEFAULT_VIDEO_HEIGHT;
            
            RecordingState.screenVideo = document.createElement('video');
            RecordingState.cameraVideo = document.createElement('video');
            RecordingState.screenVideo.muted = true;
            RecordingState.cameraVideo.muted = true;
            
            const screenPromise = new Promise((resolve) => {
                RecordingState.screenVideo.onloadeddata = () => {
                    RecordingState.screenVideo.play().then(() => resolve()).catch(console.error);
                };
            });
            const cameraPromise = new Promise((resolve) => {
                RecordingState.cameraVideo.onloadeddata = () => {
                    RecordingState.cameraVideo.play().then(() => resolve()).catch(console.error);
                };
            });
            
            RecordingState.screenVideo.srcObject = new MediaStream([screenTrack]);
            RecordingState.cameraVideo.srcObject = new MediaStream([cameraTrack]);
            
            await Promise.all([screenPromise, cameraPromise]);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                ErrorHandler.handle(null, 'Canvas not supported', showToast);
                return startSimpleRecording(config, showToast);
            }
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            RecordingState.recordingCanvas = canvas;
            
            const draw = () => {
                PerformanceMonitor.frame();
                
                if (RecordingState.screenVideo.paused && RecordingState.screenVideo.srcObject) {
                    RecordingState.screenVideo.play().catch(console.error);
                }
                if (RecordingState.cameraVideo.paused && RecordingState.cameraVideo.srcObject) {
                    RecordingState.cameraVideo.play().catch(console.error);
                }
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (RecordingState.screenVideo.readyState >= 2) {
                    ctx.drawImage(RecordingState.screenVideo, 0, 0, canvas.width, canvas.height);
                }
                
                if (RecordingState.cameraVideo.readyState >= 2) {
                    // Draw camera overlay
                    const overlayWidth = canvas.width * CONFIG.OVERLAY_SCALE;
                    const camAspect = cameraSettings.width / cameraSettings.height;
                    const overlayHeight = overlayWidth / camAspect;
                    const x = canvas.width - overlayWidth - CONFIG.OVERLAY_MARGIN;
                    const y = canvas.height - overlayHeight - CONFIG.OVERLAY_MARGIN;
                    
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x + CONFIG.OVERLAY_CORNER_RADIUS, y);
                    ctx.lineTo(x + overlayWidth - CONFIG.OVERLAY_CORNER_RADIUS, y);
                    ctx.quadraticCurveTo(x + overlayWidth, y, x + overlayWidth, y + CONFIG.OVERLAY_CORNER_RADIUS);
                    ctx.lineTo(x + overlayWidth, y + overlayHeight - CONFIG.OVERLAY_CORNER_RADIUS);
                    ctx.quadraticCurveTo(x + overlayWidth, y + overlayHeight, x + overlayWidth - CONFIG.OVERLAY_CORNER_RADIUS, y + overlayHeight);
                    ctx.lineTo(x + CONFIG.OVERLAY_CORNER_RADIUS, y + overlayHeight);
                    ctx.quadraticCurveTo(x, y + overlayHeight, x, y + overlayHeight - CONFIG.OVERLAY_CORNER_RADIUS);
                    ctx.lineTo(x, y + CONFIG.OVERLAY_CORNER_RADIUS);
                    ctx.quadraticCurveTo(x, y, x + CONFIG.OVERLAY_CORNER_RADIUS, y);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(RecordingState.cameraVideo, x, y, overlayWidth, overlayHeight);
                    ctx.restore();
                }
                
                // Draw watermark
                drawWatermark(ctx, canvas.width, canvas.height);
                
                RecordingState.animationId = requestAnimationFrame(draw);
            };
            
            draw();
            recordingStream = canvas.captureStream(CONFIG.RECORDING_FPS);
            
            const audioTracks = RecordingState.mediaStream.getAudioTracks();
            audioTracks.forEach(track => recordingStream.addTrack(track));
            
            RecordingState.previewCanvas = canvas;
            RecordingState.previewCanvas.style.display = 'block';
            RecordingState.previewCanvas.style.width = '100%';
            RecordingState.previewCanvas.style.maxWidth = '800px';
            RecordingState.previewCanvas.style.height = 'auto';
            RecordingState.previewCanvas.style.borderRadius = '10px';
            RecordingState.previewCanvas.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        } else if (config.camera && !config.screen) {
            // Camera only mode - set up preview video element
            const cameraTrack = RecordingState.mediaStream.getVideoTracks()[0];
            const cameraSettings = cameraTrack.getSettings();
            
            RecordingState.cameraVideo = document.createElement('video');
            RecordingState.cameraVideo.muted = true;
            
            const cameraPromise = new Promise((resolve) => {
                RecordingState.cameraVideo.onloadeddata = () => {
                    RecordingState.cameraVideo.play().then(() => resolve()).catch(console.error);
                };
            });
            
            RecordingState.cameraVideo.srcObject = new MediaStream([cameraTrack]);
            
            await cameraPromise;
            
            // Create a canvas for the preview to match screen+camera behavior
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                canvas.width = cameraSettings.width || CONFIG.DEFAULT_VIDEO_WIDTH;
                canvas.height = cameraSettings.height || CONFIG.DEFAULT_VIDEO_HEIGHT;
                RecordingState.recordingCanvas = canvas;
                
                const draw = () => {
                    PerformanceMonitor.frame();
                    
                    if (RecordingState.cameraVideo.paused && RecordingState.cameraVideo.srcObject) {
                        RecordingState.cameraVideo.play().catch(console.error);
                    }
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    if (RecordingState.cameraVideo.readyState >= 2) {
                        ctx.drawImage(RecordingState.cameraVideo, 0, 0, canvas.width, canvas.height);
                    }
                    
                    // Draw watermark
                    drawWatermark(ctx, canvas.width, canvas.height);
                    
                    RecordingState.animationId = requestAnimationFrame(draw);
                };
                
                draw();
                recordingStream = canvas.captureStream(CONFIG.RECORDING_FPS);
                
                const audioTracks = RecordingState.mediaStream.getAudioTracks();
                audioTracks.forEach(track => recordingStream.addTrack(track));
                
                RecordingState.previewCanvas = canvas;
                RecordingState.previewCanvas.style.display = 'block';
                RecordingState.previewCanvas.style.width = '100%';
                RecordingState.previewCanvas.style.maxWidth = '800px';
                RecordingState.previewCanvas.style.height = 'auto';
                RecordingState.previewCanvas.style.borderRadius = '10px';
                RecordingState.previewCanvas.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            } else {
                // Fallback to simple video element preview
                return startSimpleRecording(config, showToast);
            }
        }
        
        return startMediaRecorder(recordingStream, config, showToast);
    } catch (err) {
        PerformanceMonitor.stop();
        ErrorHandler.handle(err, `Failed to start: ${err.message}`, showToast);
        return false;
    }
}

async function startSimpleRecording(config, showToast = null) {
    const ui = await import('./ui.js');
    const { elements } = ui;
    
    if (elements.previewVideo) elements.previewVideo.srcObject = RecordingState.mediaStream;
    if (elements.previewArea) elements.previewArea.classList.remove('hidden');
    // Show recording action buttons (pause/stop)
    if (elements.recordingActionButtons) elements.recordingActionButtons.classList.remove('hidden');
    if (elements.startBtn) elements.startBtn.disabled = true;
    
    return startMediaRecorder(RecordingState.mediaStream, config, showToast);
}

async function startMediaRecorder(stream, config, showToast = null) {
    RecordingState.clearRecordedChunks();
    
    // Determine the best supported MIME type for recording
    let mimeType = CONFIG.VIDEO_MIME_TYPE;
    const supportedTypes = [
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
    ];
    
    // Find the first supported MIME type
    for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
        }
    }
    
    RecordingState.mediaRecorder = new MediaRecorder(stream, { mimeType });
    
    RecordingState.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) RecordingState.addRecordedChunk(e.data);
    };
    
    RecordingState.mediaRecorder.onstop = () => stopRecording(showToast);
    
    RecordingState.mediaRecorder.onerror = (e) => {
        ErrorHandler.handle(e.error, `Recording error: ${e.error}`, showToast);
        stopRecording(showToast);
    };
    
    RecordingState.mediaRecorder.start();
    RecordingState.isRecording = true;
    
    // Start recording timer
    startRecordingTimer(showToast);
    
    // Auto-save draft
    RecordingState.draftInterval = setInterval(() => {
        if (RecordingState.isRecording) {
            saveDraft();
        } else {
            clearInterval(RecordingState.draftInterval);
            RecordingState.draftInterval = null;
        }
    }, CONFIG.DRAFT_AUTO_SAVE_INTERVAL);
    
    if (showToast) showToast('Recording started... Keep this tab active for continuous recording.');
    
    return true;
}

export async function stopRecording(showToast = null) {
    const ui = await import('./ui.js');
    const { elements, updateToggles, AppConfig } = ui;
    const { closePipElement } = ui;
    
    RecordingState.isRecording = false;
    RecordingState.isPaused = false;
    
    // Stop recording timer
    stopRecordingTimer();
    
    // Stop draft interval
    if (RecordingState.draftInterval) {
        clearInterval(RecordingState.draftInterval);
        RecordingState.draftInterval = null;
    }
    
    // Stop performance monitoring
    PerformanceMonitor.stop();
    const perfWarning = PerformanceMonitor.getWarning();
    if (perfWarning && showToast) {
        showToast(`Recording complete. Note: ${perfWarning}`, 'warning');
    }
    
    // Close popup
    if (window.recordingPopup && !window.recordingPopup.closed) {
        window.recordingPopup.close();
    }
    
    // Close custom PiP element
    closePipElement();
    
    // Exit native PiP
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(console.error);
    }
    
    // Stop media recorder
    if (RecordingState.mediaRecorder && RecordingState.mediaRecorder.state === 'recording') {
        try {
            RecordingState.mediaRecorder.stop();
        } catch (e) {
            // Ignore
        }
    }
    
    // Stop all media streams
    [RecordingState.mediaStream, RecordingState.screenStream, RecordingState.cameraStream, RecordingState.micStream].forEach(stream => {
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
    if (RecordingState.audioContext) {
        AudioContextManager.close(RecordingState.audioContext);
        RecordingState.audioContext = null;
    }
    
    // Cancel animation
    if (RecordingState.animationId) {
        cancelAnimationFrame(RecordingState.animationId);
        RecordingState.animationId = null;
    }
    
    // Clean up video elements
    [RecordingState.screenVideo, RecordingState.cameraVideo].forEach(video => {
        if (video) {
            video.pause();
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
            video.srcObject = null;
        }
    });
    
    // Update UI - hide recording action buttons
    if (elements.recordingActionButtons) elements.recordingActionButtons.classList.add('hidden');
    if (elements.previewVideo) elements.previewVideo.srcObject = null;
    
    // Hide recording timer
    const timerElement = document.getElementById('recording-timer');
    if (timerElement) {
        timerElement.style.display = 'none';
        timerElement.textContent = '00:00';
    }
    
    if (RecordingState.previewCanvas) {
        RecordingState.previewCanvas.remove();
        RecordingState.previewCanvas = null;
    }
    
    if (elements.pipInfo) elements.pipInfo.classList.add('hidden');
    if (elements.previewVideo) elements.previewVideo.style.display = 'block';
    if (elements.previewArea) elements.previewArea.classList.add('hidden');
    
    // Hide paused overlay
    if (elements.pausedOverlay) elements.pausedOverlay.classList.add('hidden');
    
    // Save recording - get config from AppConfig
    const config = AppConfig?.config || {};
    const result = await saveRecording(RecordingState.recordedChunks, config, showToast);
    
    if (result && !result.saved && result.blob) {
        downloadVideo(result.blob, result.filename, showToast);
    }
    
    // Refresh the saved list UI
    if (result?.saved) {
        const uiModule = await import('./ui.js');
        if (uiModule.populateSavedList) {
            await uiModule.populateSavedList();
        }
        if (uiModule.updateStorageInfo) {
            await uiModule.updateStorageInfo();
        }
    }
    
    RecordingState.clearRecordedChunks();
    RecordingState.reset();
    
    if (elements.startBtn) elements.startBtn.disabled = false;
    if (updateToggles) updateToggles(false);
}

// ============================================
// PAUSE/RESUME FUNCTIONALITY
// ============================================

/**
 * Toggle pause state of the recording
 * @param {Function} showToast - Optional toast notification function
 * @returns {boolean|null} - Returns true if paused, false if resumed, null if error
 */
export function togglePause(showToast = null) {
    if (!RecordingState.isRecording || !RecordingState.mediaRecorder) {
        return null;
    }
    
    try {
        const recorderState = RecordingState.mediaRecorder.state;
        
        if (RecordingState.isPaused || recorderState === 'paused') {
            // Resume recording
            if (recorderState === 'paused') {
                RecordingState.mediaRecorder.resume();
            }
            
            // Calculate and add the paused duration
            if (RecordingState.pausedStartTime) {
                RecordingState.totalPausedDuration += Date.now() - RecordingState.pausedStartTime;
                RecordingState.pausedStartTime = null;
            }
            
            RecordingState.isPaused = false;
            
            // Resume canvas drawing if using canvas recording
            if (RecordingState.screenVideo && RecordingState.cameraVideo) {
                if (RecordingState.screenVideo.paused) {
                    RecordingState.screenVideo.play().catch(console.error);
                }
                if (RecordingState.cameraVideo.paused) {
                    RecordingState.cameraVideo.play().catch(console.error);
                }
            }
            
            if (showToast) showToast('Recording resumed', 'info');
            return false;
        } else {
            // Pause recording
            if (recorderState === 'recording') {
                RecordingState.mediaRecorder.pause();
            }
            
            RecordingState.isPaused = true;
            RecordingState.pausedStartTime = Date.now();
            
            // Pause canvas drawing if using canvas recording
            if (RecordingState.screenVideo) {
                RecordingState.screenVideo.pause();
            }
            if (RecordingState.cameraVideo) {
                RecordingState.cameraVideo.pause();
            }
            
            if (showToast) showToast('Recording paused', 'info');
            return true;
        }
    } catch (err) {
        ErrorHandler.handle(err, `Pause/resume error: ${err.message}`, showToast);
        return null;
    }
}

/**
 * Check and restore pause state from tab visibility changes
 * Called when tab becomes visible again
 */
export function restorePauseState() {
    if (RecordingState.isRecording && RecordingState.isPaused && RecordingState.pausedStartTime) {
        // Calculate total paused duration so far
        RecordingState.totalPausedDuration += Date.now() - RecordingState.pausedStartTime;
        RecordingState.pausedStartTime = Date.now();
    }
}

// ============================================
// DRAFT MANAGEMENT
// ============================================

export function saveDraft() {
    if (RecordingState.recordedChunks.length > 0) {
        const draft = {
            chunks: RecordingState.recordedChunks.slice(),
            timestamp: Date.now(),
            isPaused: RecordingState.isPaused,
            pausedStartTime: RecordingState.pausedStartTime,
            totalPausedDuration: RecordingState.totalPausedDuration
        };
        try {
            sessionStorage.setItem(`${STORAGE_KEY}_draft`, JSON.stringify(draft));
        } catch (e) {
            console.warn('Failed to save draft:', e);
        }
    }
}

export async function recoverDraft() {
    const { STATE_VERSION, STORAGE_KEY } = await import('./utils.js');
    try {
        const draftData = sessionStorage.getItem(`${STORAGE_KEY}_draft`);
        if (draftData) {
            const draft = JSON.parse(draftData);
            if (Date.now() - draft.timestamp < CONFIG.DRAFT_MAX_AGE) {
                // Restore pause state
                if (draft.isPaused) {
                    RecordingState.isPaused = true;
                    RecordingState.totalPausedDuration = draft.totalPausedDuration || 0;
                    // Calculate ongoing pause duration
                    if (draft.pausedStartTime) {
                        RecordingState.totalPausedDuration += Date.now() - draft.pausedStartTime;
                        RecordingState.pausedStartTime = Date.now();
                    }
                }
                return draft;
            }
        }
    } catch (err) {
        console.warn('Failed to recover draft:', err);
    }
    return null;
}