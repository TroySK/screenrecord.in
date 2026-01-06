// ============================================
// VALIDATION MODULE - Comprehensive Input Validation
// ============================================

import { CONFIG, Capabilities } from './utils.js';

// ============================================
// VALIDATION RESULT CLASS
// ============================================

export class ValidationResult {
    constructor(isValid = true, errors = [], warnings = []) {
        this.isValid = isValid;
        this.errors = errors;
        this.warnings = warnings;
    }

    addError(message) {
        this.errors.push(message);
        this.isValid = false;
    }

    addWarning(message) {
        this.warnings.push(message);
    }

    get firstError() {
        return this.errors[0] || null;
    }

    get allMessages() {
        return [...this.errors, ...this.warnings];
    }

    toString() {
        if (this.isValid) return 'Valid';
        return this.errors.join('; ') + (this.warnings.length > 0 ? '; Warnings: ' + this.warnings.join('; ') : '');
    }
}

// ============================================
// RECORDING CONFIGURATION VALIDATION
// ============================================

export const RecordingConfigValidator = {
    /**
     * Validate recording configuration before starting
     * @param {Object} config - Recording configuration
     * @returns {ValidationResult} - Validation result with errors/warnings
     */
    validate(config) {
        const result = new ValidationResult();

        // Check if at least one input is selected
        if (!config.screen && !config.camera && !config.mic) {
            result.addError('Please select at least one input: screen, camera, or microphone.');
        }

        // Validate screen recording configuration
        if (config.screen) {
            if (!Capabilities.screenSharing) {
                result.addError('Screen sharing is not supported on this browser or device.');
            }
        }

        // Validate camera configuration
        if (config.camera) {
            if (!Capabilities.camera) {
                result.addError('Camera access is not supported on this browser.');
            }
        }

        // Validate microphone configuration
        if (config.mic) {
            if (!Capabilities.microphone) {
                result.addError('Microphone access is not supported on this browser.');
            }
        }

        // Validate system audio configuration
        if (config.systemAudio) {
            if (!Capabilities.screenSharing) {
                result.addError('System audio requires screen sharing support.');
            }
            if (!config.screen) {
                result.addWarning('System audio is typically used with screen recording. Consider enabling screen sharing.');
            }
        }

        // Check for mobile-specific issues
        if (Capabilities.isMobile) {
            if (config.screen) {
                result.addWarning('Screen sharing may have limited functionality on mobile devices.');
            }
        }

        return result;
    },

    /**
     * Get user-friendly message for configuration validation
     * @param {ValidationResult} result - Validation result
     * @returns {string} - User-friendly message
     */
    getUserMessage(result) {
        if (result.isValid) {
            return 'Configuration is valid. Ready to start recording.';
        }
        return result.errors[0] || 'Invalid configuration. Please check your settings.';
    }
};

// ============================================
// STORAGE VALIDATION
// ============================================

export const StorageValidator = {
    // Supported video MIME types for import
    supportedVideoTypes: [
        'video/webm',
        'video/mp4',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo'
    ],

    // Supported file extensions for import
    supportedExtensions: ['.webm', '.mp4', '.ogg', '.mov', '.avi', '.mkv'],

    /**
     * Check storage quota before recording
     * @param {number} estimatedSize - Estimated recording size in bytes
     * @returns {Promise<ValidationResult>} - Validation result
     */
    async checkStorageQuota(estimatedSize = CONFIG.MAX_FILE_SIZE) {
        const result = new ValidationResult();

        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const available = estimate.quota - estimate.usage;

                if (available < estimatedSize) {
                    const availableMB = (available / 1024 / 1024).toFixed(1);
                    result.addError(`Not enough storage space. Available: ${availableMB} MB. Please free up space or delete old recordings.`);
                } else if (available < estimate.quota * 0.2) {
                    const availableMB = (available / 1024 / 1024).toFixed(1);
                    result.addWarning(`Storage is running low. Available: ${availableMB} MB. Consider deleting old recordings.`);
                }
            }
        } catch (err) {
            // If storage estimate fails, continue without blocking
            console.warn('Storage quota check failed:', err);
        }

        return result;
    },

    /**
     * Get current storage usage
     * @returns {Promise<Object>} - Storage usage info
     */
    async getStorageUsage() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage || 0,
                    quota: estimate.quota || 0,
                    usedMB: ((estimate.usage || 0) / 1024 / 1024).toFixed(2),
                    quotaMB: ((estimate.quota || 0) / 1024 / 1024).toFixed(0),
                    percentFull: estimate.quota ? (((estimate.usage || 0) / estimate.quota) * 100).toFixed(1) : 0
                };
            }
        } catch (err) {
            console.warn('Storage usage check failed:', err);
        }
        return null;
    },

    /**
     * Validate file size for import
     * @param {File} file - File to validate
     * @param {number} maxSize - Maximum file size in bytes (default: CONFIG.MAX_FILE_SIZE)
     * @returns {ValidationResult} - Validation result
     */
    validateFileSize(file, maxSize = CONFIG.MAX_FILE_SIZE) {
        const result = new ValidationResult();

        if (!file) {
            result.addError('No file selected.');
            return result;
        }

        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);

        if (file.size > maxSize) {
            result.addError(`File is too large (${fileSizeMB} MB). Maximum allowed: ${maxSizeMB} MB.`);
        } else if (file.size > maxSize * 0.8) {
            result.addWarning(`File is large (${fileSizeMB} MB). Approaching the ${maxSizeMB} MB limit.`);
        }

        return result;
    },

    /**
     * Validate file type for import
     * @param {File} file - File to validate
     * @returns {ValidationResult} - Validation result
     */
    validateFileType(file) {
        const result = new ValidationResult();

        if (!file) {
            result.addError('No file selected.');
            return result;
        }

        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();

        // Check by MIME type
        const hasValidMimeType = this.supportedVideoTypes.some(type => 
            fileType.includes(type.replace('video/', '')) || fileType === type
        );

        // Check by extension
        const hasValidExtension = this.supportedExtensions.some(ext => 
            fileName.endsWith(ext)
        );

        if (!hasValidMimeType && !hasValidExtension) {
            const supportedList = this.supportedExtensions.join(', ');
            result.addError(`Unsupported file type: ${file.type || 'unknown'}. Supported formats: ${supportedList}`);
        }

        return result;
    },

    /**
     * Validate file for import (size and type)
     * @param {File} file - File to validate
     * @param {number} maxSize - Maximum file size in bytes
     * @returns {ValidationResult} - Combined validation result
     */
    validateImportFile(file, maxSize = CONFIG.MAX_FILE_SIZE) {
        const sizeResult = this.validateFileSize(file, maxSize);
        const typeResult = this.validateFileType(file);

        const combined = new ValidationResult();
        
        // Combine errors
        sizeResult.errors.forEach(e => combined.addError(e));
        typeResult.errors.forEach(e => combined.addError(e));
        
        // Combine warnings
        sizeResult.warnings.forEach(w => combined.addWarning(w));
        typeResult.warnings.forEach(w => combined.addWarning(w));

        return combined;
    },

    /**
     * Get user-friendly message for storage validation
     * @param {ValidationResult} result - Validation result
     * @returns {string} - User-friendly message
     */
    getUserMessage(result) {
        if (result.isValid) {
            if (result.warnings.length > 0) {
                return result.warnings[0];
            }
            return 'Storage check passed.';
        }
        return result.errors[0] || 'Storage validation failed.';
    }
};

// ============================================
// TITLE VALIDATION
// ============================================

export const TitleValidator = {
    maxLength: CONFIG.MAX_TITLE_LENGTH || 100,
    invalidChars: /[<>:"/\\|?*\x00-\x1f]/g,

    /**
     * Validate video title
     * @param {string} title - Title to validate
     * @returns {ValidationResult} - Validation result
     */
    validate(title) {
        const result = new ValidationResult();

        if (!title || title.trim().length === 0) {
            result.addError('Title cannot be empty.');
            return result;
        }

        const trimmedTitle = title.trim();

        if (trimmedTitle.length > this.maxLength) {
            result.addError(`Title is too long. Maximum ${this.maxLength} characters allowed.`);
        }

        if (this.invalidChars.test(trimmedTitle)) {
            result.addError('Title contains invalid characters. Please remove special characters.');
        }

        return result;
    },

    /**
     * Sanitize title for safe use
     * @param {string} title - Title to sanitize
     * @returns {string} - Sanitized title
     */
    sanitize(title) {
        if (!title) return '';
        return title.trim().replace(this.invalidChars, '').substring(0, this.maxLength);
    }
};

// ============================================
// DURATION VALIDATION
// ============================================

export const DurationValidator = {
    maxDuration: 4 * 60 * 60 * 1000, // 4 hours in milliseconds

    /**
     * Validate recording duration
     * @param {number} duration - Duration in milliseconds
     * @returns {ValidationResult} - Validation result
     */
    validate(duration) {
        const result = new ValidationResult();

        if (duration < 0) {
            result.addError('Duration cannot be negative.');
        }

        if (duration > this.maxDuration) {
            const hours = Math.floor(duration / 3600000);
            result.addError(`Recording too long. Maximum duration is 4 hours. Current: ${hours} hours.`);
        }

        return result;
    }
};

// ============================================
// VALIDATION MESSAGE HELPERS
// ============================================

export const ValidationMessages = {
    // Recording configuration messages
    NO_INPUT_SELECTED: 'Please select at least one input (screen, camera, or microphone).',
    SCREEN_SHARING_UNSUPPORTED: 'Screen sharing is not supported on this device or browser.',
    CAMERA_UNSUPPORTED: 'Camera access is not supported on this browser.',
    MICROPHONE_UNSUPPORTED: 'Microphone access is not supported on this browser.',
    
    // Storage messages
    STORAGE_FULL: 'Storage is full. Please delete some recordings or download and clear.',
    STORAGE_LOW: 'Storage is running low. Consider deleting old recordings.',
    FILE_TOO_LARGE: (size, max) => `File is too large (${size} MB). Maximum allowed: ${max} MB.`,
    UNSUPPORTED_FILE_TYPE: (type) => `Unsupported file type: ${type}. Please use WebM, MP4, or other video formats.`,
    
    // Permission messages
    PERMISSION_DENIED_SCREEN: 'Screen sharing was denied. Please allow access and try again.',
    PERMISSION_DENIED_CAMERA: 'Camera access was denied. Please allow access in browser settings.',
    PERMISSION_DENIED_MIC: 'Microphone access was denied. Please allow access in browser settings.',
    
    // Success messages
    READY_TO_RECORD: 'Ready to start recording!',
    VALID_CONFIGURATION: 'Configuration is valid.',
    
    /**
     * Get validation message based on error type
     * @param {string} errorType - Error type identifier
     * @param {Object} params - Additional parameters
     * @returns {string} - User-friendly message
     */
    get(errorType, params = {}) {
        const message = this[errorType];
        if (typeof message === 'function') {
            return message(params);
        }
        return message || 'An unknown validation error occurred.';
    }
};

// ============================================
// MAIN VALIDATOR (combines all validators)
// ============================================

export const Validator = {
    /**
     * Validate all aspects before starting a recording
     * @param {Object} config - Recording configuration
     * @param {number} estimatedSize - Estimated recording size
     * @returns {Promise<ValidationResult>} - Combined validation result
     */
    async validateBeforeRecording(config, estimatedSize = CONFIG.MAX_FILE_SIZE) {
        const configResult = RecordingConfigValidator.validate(config);
        const storageResult = await StorageValidator.checkStorageQuota(estimatedSize);

        const combined = new ValidationResult();
        
        // Combine errors
        configResult.errors.forEach(e => combined.addError(e));
        storageResult.errors.forEach(e => combined.addError(e));
        
        // Combine warnings
        configResult.warnings.forEach(w => combined.addWarning(w));
        storageResult.warnings.forEach(w => combined.addWarning(w));

        return combined;
    },

    /**
     * Validate file import
     * @param {File} file - File to import
     * @returns {ValidationResult} - Validation result
     */
    validateImport(file) {
        return StorageValidator.validateImportFile(file);
    },

    /**
     * Validate video title
     * @param {string} title - Title to validate
     * @returns {ValidationResult} - Validation result
     */
    validateTitle(title) {
        return TitleValidator.validate(title);
    }
};