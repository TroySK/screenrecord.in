// ============================================
// RECORDING MODULE - MediaRecorder Logic
// ============================================

import {
    CONFIG, ErrorHandler, URLManager, AudioContextManager, PerformanceMonitor,
    waitForVideoDimensions, STATE_VERSION, STORAGE_KEY
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
    _audioContext: null,
    _currentVideoId: null,
    _draftInterval: null,
    
    // Getters/Setters
    get isRecording() { return this._isRecording; },
    set isRecording(value) { this._isRecording = Boolean(value); },
    
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
        this._audioContext = null;
        this._currentVideoId = null;
        
        if (this._draftInterval) {
            clearInterval(this._draftInterval);
            this._draftInterval = null;
        }
    }
};

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
        const controller = new CaptureController();
        try {
            RecordingState.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: config.systemAudio ? { echoCancellation: false, noiseSuppression: false, sampleRate: 48000 } : false,
                controller: controller
            });
            
            const videoTrack = RecordingState.screenStream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            
            if (settings.displaySurface === 'browser' || settings.displaySurface === 'window') {
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
            RecordingState.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: CONFIG.CAMERA_WIDTH }, height: { ideal: CONFIG.CAMERA_HEIGHT } }
            });
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
            RecordingState.micStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true }
            });
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
    if (elements.stopBtn) elements.stopBtn.style.display = 'block';
    if (elements.startBtn) elements.startBtn.disabled = true;
    
    return startMediaRecorder(RecordingState.mediaStream, config, showToast);
}

async function startMediaRecorder(stream, config, showToast = null) {
    RecordingState.clearRecordedChunks();
    RecordingState.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    
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
    
    RecordingState.isRecording = false;
    
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
    
    // Exit PiP
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
    
    // Update UI
    if (elements.stopBtn) elements.stopBtn.style.display = 'none';
    if (elements.previewVideo) elements.previewVideo.srcObject = null;
    
    if (RecordingState.previewCanvas) {
        RecordingState.previewCanvas.remove();
        RecordingState.previewCanvas = null;
    }
    
    if (elements.pipInfo) elements.pipInfo.classList.add('hidden');
    if (elements.previewVideo) elements.previewVideo.style.display = 'block';
    if (elements.previewArea) elements.previewArea.classList.add('hidden');
    
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
// DRAFT MANAGEMENT
// ============================================

export function saveDraft() {
    if (RecordingState.recordedChunks.length > 0) {
        const draft = {
            chunks: RecordingState.recordedChunks.slice(),
            timestamp: Date.now()
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
                return draft;
            }
        }
    } catch (err) {
        console.warn('Failed to recover draft:', err);
    }
    return null;
}