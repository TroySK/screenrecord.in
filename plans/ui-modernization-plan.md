# ScreenRecord.in UI Modernization Plan
## Linear-Style Aesthetic - Complete Design System

## Executive Summary

This plan outlines comprehensive UI/UX improvements to transform the current screen recording app into a modern, professional application inspired by **Linear's design language**. Based on research from Linear's official brand resources and community design systems, this plan implements authentic Linear design patterns.

**Linear's Core Design Principles (from official sources):**
1. **Dark mode first** - Design for dark interfaces primarily
2. **Subtle 1px borders** - Low contrast, precise borders
3. **Inter typography** - Specific weights (400/500/600), tight tracking
4. **Monospace for data** - JetBrains Mono for technical content
5. **Spring animations** - Physics-based micro-interactions
6. **Glassmorphism** - Subtle backdrop blur effects
7. **Focus rings** - Visible focus states with colored rings
8. **Skeleton loading** - Shimmer effects for loading states
9. **Toast design** - Minimal notifications with subtle styling
10. **Icon consistency** - 16px icons, 1.5px stroke width

---

## Current State Analysis

### Strengths
- Functional layout with clear information hierarchy
- Good use of color for status indicators (green for start, red for stop)
- Responsive design with mobile support
- Custom PiP element with controls
- Keyboard shortcuts support

### Areas for Improvement (Linear Comparison)
| Current | Linear Standard |
|---------|----------------|
| Basic gradient backgrounds | Solid, subtle colors (dark-first) |
| Thick borders (2px+) | Subtle 1px borders |
| Prominent shadows | Minimal or no shadows |
| Large border radius | Moderate 6-8px radius |
| Emoji icons | Consistent SVG icon system (16px, 1.5px stroke) |
| Basic hover effects | Subtle opacity/background shifts + focus rings |
| Inconsistent spacing | Consistent 4px grid |
| No backdrop blur | Extensive backdrop blur |
| Basic loading states | Skeleton shimmer animations |
| Simple toasts | Minimal toast notifications |

---

## Design System - Complete Linear Style

### Color Palette (Authentic Linear)

```css
:root {
    /* Primary Accent - Linear Purple */
    --primary: #5E6AD2;
    --primary-hover: #4F5CC4;
    --primary-active: #4048A8;
    --primary-subtle: rgba(94, 106, 210, 0.1);
    --primary-subtle-hover: rgba(94, 106, 210, 0.15);
    
    /* Semantic Colors - Muted & Accessible */
    --success: #46A758;
    --success-hover: #3D8F4A;
    --success-subtle: rgba(70, 167, 88, 0.1);
    --warning: #D69E2E;
    --warning-hover: #B58524;
    --warning-subtle: rgba(214, 158, 46, 0.1);
    --error: #E34850;
    --error-hover: #C73E47;
    --error-subtle: rgba(227, 72, 80, 0.1);
    --info: #3B82F6;
    --info-hover: #2563EB;
    --info-subtle: rgba(59, 130, 246, 0.1);

    /* Grayscale - Subtle & Layered */
    --gray-50: #FCFCFD;
    --gray-100: #F7F7F8;
    --gray-200: #EFF0F1;
    --gray-300: #E2E4E8;
    --gray-350: #D9DBE0;
    --gray-400: #C4C7CC;
    --gray-500: #9CA3AF;
    --gray-600: #6B7280;
    --gray-700: #4B5563;
    --gray-800: #374151;
    --gray-900: #1F2937;

    /* Backgrounds - Layered */
    --bg-default: #FFFFFF;
    --bg-elevated: #FFFFFF;
    --bg-subtle: #F7F7F8;
    --bg-muted: #EFF0F1;
    --bg-overlay: rgba(0, 0, 0, 0.5);
    --bg-glass: rgba(255, 255, 255, 0.8);

    /* Text - Hierarchical */
    --text-default: #1F2937;
    --text-secondary: #6B7280;
    --text-tertiary: #9CA3AF;
    --text-placeholder: #C4C7CC;
    --text-disabled: #D1D5DB;

    /* Borders - Subtle */
    --border-light: #EFF0F1;
    --border-default: #E2E4E8;
    --border-strong: #C4C7CC;
    --border-focus: var(--primary);

    /* Shadows - Minimal */
    --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.02);
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.05), 0 10px 10px rgba(0, 0, 0, 0.02);
    --shadow-focus: 0 0 0 3px var(--primary-subtle);

    /* Border Radius - Moderate */
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;
    --radius-xl: 12px;
    --radius-full: 9999px;

    /* Spacing - 4px Grid */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;
    --space-10: 40px;
    --space-12: 48px;

    /* Transitions - Spring Physics */
    --transition-fast: 100ms cubic-bezier(0.2, 0, 0, 1);
    --transition-base: 150ms cubic-bezier(0.2, 0, 0, 1);
    --transition-slow: 200ms cubic-bezier(0.2, 0, 0, 1);
    --transition-spring: 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Dark Mode Colors (Authentic Linear Dark)
```css
:root.dark {
    /* Primary in Dark */
    --primary: #8B9CF4;
    --primary-hover: #9CACF6;
    --primary-active: #7B8BD3;
    --primary-subtle: rgba(139, 156, 244, 0.15);
    --primary-subtle-hover: rgba(139, 156, 244, 0.2);

    /* Semantic in Dark */
    --success: #5DD879;
    --success-hover: #6FE389;
    --success-subtle: rgba(93, 216, 121, 0.15);
    --warning: #E5B84B;
    --warning-hover: #ECC65C;
    --warning-subtle: rgba(229, 184, 75, 0.15);
    --error: #F26B6B;
    --error-hover: #F47C7C;
    --error-subtle: rgba(242, 107, 107, 0.15);
    --info: #6EB3F7;
    --info-hover: #7EC0F8;
    --info-subtle: rgba(110, 179, 247, 0.15);

    /* Grayscale in Dark */
    --gray-50: #2D3142;
    --gray-100: #353A50;
    --gray-200: #3D4459;
    --gray-300: #4A5166;
    --gray-350: #5A6278;
    --gray-400: #6B7280;
    --gray-500: #9CA3AF;
    --gray-600: #D1D5DB;
    --gray-700: #E5E7EB;
    --gray-800: #F3F4F6;
    --gray-900: #F9FAFB;

    /* Backgrounds in Dark */
    --bg-default: #0F1117;
    --bg-elevated: #1A1D26;
    --bg-subtle: #1F2430;
    --bg-muted: #2A2F3D;
    --bg-overlay: rgba(0, 0, 0, 0.7);
    --bg-glass: rgba(15, 17, 23, 0.85);

    /* Text in Dark */
    --text-default: #F9FAFB;
    --text-secondary: #9CA3AF;
    --text-tertiary: #6B7280;
    --text-placeholder: #4B5563;
    --text-disabled: #374151;

    /* Borders in Dark */
    --border-light: #1F2430;
    --border-default: #2D3142;
    --border-strong: #3D4459;
    --border-focus: var(--primary);

    /* Shadows in Dark */
    --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.5), 0 10px 10px rgba(0, 0, 0, 0.3);
    --shadow-focus: 0 0 0 3px var(--primary-subtle);
}
```

### Typography System (Linear-Style)

```css
:root {
    /* Font - Inter with tight tracking */
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

    /* Font Sizes - Linear uses smaller sizes */
    --text-xs: 0.75rem;           /* 12px */
    --text-xs-caps: 0.6875rem;    /* 11px - for labels */
    --text-sm: 0.8125rem;         /* 13px */
    --text-sm-medium: 0.8125rem;  /* 13px medium */
    --text-base: 0.9375rem;       /* 15px */
    --text-base-medium: 0.9375rem;/* 15px medium */
    --text-lg: 1.0625rem;         /* 17px */
    --text-xl: 1.1875rem;         /* 19px */
    --text-2xl: 1.375rem;         /* 22px */

    /* Font Weights - Linear uses 400/500/600 */
    --font-normal: 400;
    --font-medium: 500;
    --font-semibold: 600;

    /* Letter Spacing - Tight for headings */
    --tracking-tight: -0.02em;
    --tracking-normal: 0;
    --tracking-wide: 0.01em;

    /* Line Heights */
    --leading-tight: 1.3;
    --leading-normal: 1.5;
    --leading-relaxed: 1.6;
}
```

### Icon System (Linear-Style)

```css
:root {
    --icon-size-sm: 14px;
    --icon-size-base: 16px;
    --icon-size-lg: 20px;
    --icon-size-xl: 24px;
    --icon-stroke: 1.5px;
    --icon-stroke-sm: 1px;
    --icon-stroke-lg: 2px;
}
```

**Icon SVG Pattern:**
```html
<!-- All icons should follow this pattern -->
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Icon paths here -->
</svg>
```

### Focus States (Linear-Style)

```css
/* Visible focus ring - critical for accessibility */
.btn:focus-visible,
.input:focus-visible,
[tabindex]:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus);
}

/* Skip link for keyboard navigation */
.skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--primary);
    color: white;
    padding: var(--space-2) var(--space-4);
    z-index: 1000;
    transition: top var(--transition-fast);
}

.skip-link:focus {
    top: 0;
}
```

### Loading States - Skeleton Screens

```css
.skeleton {
    background: linear-gradient(
        90deg,
        var(--bg-muted) 25%,
        var(--bg-subtle) 50%,
        var(--bg-muted) 75%
    );
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    border-radius: var(--radius-md);
}

@keyframes skeleton-loading {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

.skeleton-text {
    height: 1em;
    width: 100%;
}

.skeleton-title {
    height: 1.2em;
    width: 60%;
}

.skeleton-avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
}

.skeleton-button {
    width: 80px;
    height: 32px;
}
```

### Toast Notifications (Linear-Style)

```css
.toast-container {
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    min-width: 280px;
    max-width: 400px;
    animation: toast-enter var(--transition-spring);
}

.toast.exit {
    animation: toast-exit var(--transition-base) forwards;
}

.toast-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.toast.success .toast-icon {
    color: var(--success);
}

.toast.error .toast-icon {
    color: var(--error);
}

.toast.warning .toast-icon {
    color: var(--warning);
}

.toast.info .toast-icon {
    color: var(--info);
}

.toast-message {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--text-default);
}

.toast-close {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
}

.toast-close:hover {
    background: var(--bg-muted);
    color: var(--text-default);
}

@keyframes toast-enter {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes toast-exit {
    from {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }
}
```

### Button Styles (Linear-Style)

```css
/* Primary Button */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    line-height: 1;
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-primary {
    background: var(--primary);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: var(--primary-hover);
}

.btn-primary:active:not(:disabled) {
    background: var(--primary-active);
}

.btn-secondary {
    background: var(--bg-subtle);
    color: var(--text-default);
    border: 1px solid var(--border-default);
}

.btn-secondary:hover:not(:disabled) {
    background: var(--bg-muted);
}

.btn-ghost {
    background: transparent;
    color: var(--text-secondary);
}

.btn-ghost:hover:not(:disabled) {
    background: var(--bg-subtle);
    color: var(--text-default);
}

.btn-danger {
    background: var(--error);
    color: white;
}

.btn-danger:hover:not(:disabled) {
    background: var(--error-hover);
}

.btn-sm {
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
}

.btn-lg {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-base);
}
```

### Input Styles (Linear-Style)

```css
.input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-default);
    background: var(--bg-default);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
}

.input::placeholder {
    color: var(--text-placeholder);
}

.input:hover {
    border-color: var(--border-strong);
}

.input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: var(--shadow-focus);
}

.input:disabled {
    background: var(--bg-subtle);
    color: var(--text-disabled);
    cursor: not-allowed;
}

.input-error {
    border-color: var(--error);
}

.input-error:focus {
    box-shadow: 0 0 0 3px var(--error-subtle);
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.input-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text-secondary);
}

.input-hint {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
}

.input-error-message {
    font-size: var(--text-xs);
    color: var(--error);
}
```

### Card Styles (Linear-Style)

```css
.card {
    background: var(--bg-default);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.card-hover:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-sm);
}

.card-interactive {
    cursor: pointer;
    transition: all var(--transition-fast);
}

.card-interactive:hover {
    border-color: var(--border-default);
    background: var(--bg-subtle);
}

.card-interactive:active {
    background: var(--bg-muted);
}

.card-header {
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-light);
}

.card-body {
    padding: var(--space-4);
}

.card-footer {
    padding: var(--space-4);
    border-top: 1px solid var(--border-light);
    background: var(--bg-subtle);
}
```

### Modal Styles (Linear-Style)

```css
.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
}

.modal-backdrop {
    position: absolute;
    inset: 0;
    background: var(--bg-overlay);
    backdrop-filter: blur(4px);
    animation: fadeIn var(--transition-fast);
}

.modal {
    position: relative;
    width: 100%;
    max-width: 480px;
    max-height: calc(100vh - 64px);
    background: var(--bg-default);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
    animation: modal-enter var(--transition-spring);
}

.modal-exit {
    animation: modal-exit var(--transition-base) forwards;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-light);
}

.modal-title {
    font-size: var(--text-base-medium);
    font-weight: var(--font-semibold);
    color: var(--text-default);
}

.modal-close {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.modal-close:hover {
    background: var(--bg-subtle);
    color: var(--text-default);
}

.modal-body {
    padding: var(--space-4);
    overflow-y: auto;
}

.modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: var(--space-4);
    border-top: 1px solid var(--border-light);
    background: var(--bg-subtle);
}

@keyframes modal-enter {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes modal-exit {
    from {
        opacity: 1;
        transform: scale(1);
    }
    to {
        opacity: 0;
        transform: scale(0.95);
    }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

### Badge Styles (Linear-Style)

```css
.badge {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-2);
    font-size: var(--text-xs-caps);
    font-weight: var(--font-medium);
    border-radius: var(--radius-full);
    white-space: nowrap;
}

.badge-primary {
    background: var(--primary-subtle);
    color: var(--primary);
}

.badge-success {
    background: var(--success-subtle);
    color: var(--success);
}

.badge-warning {
    background: var(--warning-subtle);
    color: var(--warning);
}

.badge-error {
    background: var(--error-subtle);
    color: var(--error);
}

.badge-gray {
    background: var(--bg-muted);
    color: var(--text-secondary);
}
```

### Avatar Styles (Linear-Style)

```css
.avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background: var(--bg-muted);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    overflow: hidden;
}

.avatar-sm {
    width: 24px;
    height: 24px;
}

.avatar-base {
    width: 32px;
    height: 32px;
}

.avatar-lg {
    width: 40px;
    height: 40px;
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
```

### Divider Styles (Linear-Style)

```css
.divider {
    height: 1px;
    background: var(--border-light);
    margin: var(--space-4) 0;
}

.divider-vertical {
    width: 1px;
    height: 20px;
    background: var(--border-light);
    margin: 0 var(--space-2);
}
```

### Spinner (Linear-Style)

```css
.spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-default);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}

.spinner-sm {
    width: 12px;
    height: 12px;
    border-width: 1.5px;
}

.spinner-lg {
    width: 24px;
    height: 24px;
    border-width: 2.5px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
```

### Tooltip Styles (Linear-Style)

```css
.tooltip {
    position: relative;
    display: inline-block;
}

.tooltip-content {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    padding: var(--space-1) var(--space-2);
    background: var(--gray-800);
    color: white;
    font-size: var(--text-xs);
    border-radius: var(--radius-md);
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: all var(--transition-fast);
    z-index: 100;
}

.tooltip-content::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: var(--gray-800);
}

.tooltip:hover .tooltip-content {
    opacity: 1;
    visibility: visible;
}
```

---

## Component Redesigns

### 1. Header Redesign - Linear-Style Minimal Header

**Design Philosophy:**
- Clean, minimal header with subtle 1px border
- Logo with subtle icon
- Hamburger menu for all actions
- Backdrop blur for modern feel

```html
<header class="app-header">
    <a href="#" class="app-logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="9" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="4" fill="currentColor"/>
        </svg>
        <span class="logo-text">ScreenRecord</span>
    </a>
    
    <button class="app-menu-btn" id="menu-toggle" aria-label="Menu" title="Menu ⌘K">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 4h12M2 8h12M2 12h12" stroke-linecap="round"/>
        </svg>
    </button>
</header>

<!-- Command Menu (Linear-style) -->
<div class="command-menu hidden" id="command-menu">
    <div class="command-backdrop" id="command-backdrop"></div>
    <div class="command-container">
        <div class="command-input-wrapper">
            <svg class="command-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="7" cy="7" r="5"/>
                <path d="M10 10l4 4"/>
            </svg>
            <input type="text" class="command-input" id="command-input" placeholder="Type a command or search..." autocomplete="off">
        </div>
        
        <div class="command-results" id="command-results">
            <div class="command-group">
                <div class="command-group-label">Actions</div>
                <button class="command-item" data-action="new-recording">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="8" cy="8" r="6"/>
                        <path d="M8 5v3M5 8h3"/>
                    </svg>
                    <span>New Recording</span>
                    <span class="command-shortcut">⌘N</span>
                </button>
                <button class="command-item" data-action="saved-recordings">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v1l3 3 3-3v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7l3-3V4z"/>
                    </svg>
                    <span>Saved Recordings</span>
                    <span class="command-shortcut">⌘S</span>
                </button>
                <button class="command-item" data-action="naming-pattern">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="8" cy="8" r="5"/>
                        <path d="M8 5v1M5 8h6"/>
                    </svg>
                    <span>Naming Pattern</span>
                </button>
                <button class="command-item" data-action="shortcuts">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="2" y="3" width="12" height="10" rx="2"/>
                        <path d="M5 6h2M5 9h2M9 6h2M9 9h2"/>
                    </svg>
                    <span>Keyboard Shortcuts</span>
                    <span class="command-shortcut">⌘/</span>
                </button>
            </div>
            
            <div class="command-group">
                <div class="command-group-label">Preferences</div>
                <button class="command-item" data-action="dark-mode">
                    <svg class="icon-sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="8" cy="8" r="3"/>
                        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1"/>
                    </svg>
                    <svg class="icon-moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 7a5 5 0 01-5 5 5 5 0 01-3-9"/>
                    </svg>
                    <span>Toggle Dark Mode</span>
                    <span class="command-shortcut">⌘D</span>
                </button>
            </div>
        </div>
        
        <div class="command-footer">
            <span class="command-hint">↑↓ to navigate</span>
            <span class="command-hint">↵ to select</span>
            <span class="command-hint">esc to close</span>
        </div>
    </div>
</div>
```

**CSS Styles - Linear Aesthetic:**
```css
.app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 1rem;
    background: var(--bg-default);
    border-bottom: 1px solid var(--border-light);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    background: rgba(255, 255, 255, 0.85);
}

.app-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--text-default);
}

.logo-icon {
    width: 22px;
    height: 22px;
    color: var(--primary);
}

.logo-text {
    font-size: var(--text-base-medium);
    font-weight: var(--font-medium);
    letter-spacing: var(--tracking-tight);
}

.app-menu-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.app-menu-btn:hover {
    background: var(--bg-subtle);
    color: var(--text-default);
}

.app-menu-btn svg {
    width: 16px;
    height: 16px;
}

/* Command Menu - Linear Style */
.command-menu {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    pointer-events: none;
}

.command-menu:not(.hidden) {
    pointer-events: auto;
}

.command-backdrop {
    position: absolute;
    inset: 0;
    background: var(--bg-overlay);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: fadeIn 0.15s ease;
}

.command-container {
    position: relative;
    width: 100%;
    max-width: 480px;
    background: var(--bg-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-overlay);
    border: 1px solid var(--border-light);
    overflow: hidden;
    animation: slideDown 0.2s ease;
}

.command-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--border-light);
}

.command-search-icon {
    width: 18px;
    height: 18px;
    color: var(--text-tertiary);
    flex-shrink: 0;
}

.command-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: var(--text-base);
    color: var(--text-default);
    outline: none;
}

.command-input::placeholder {
    color: var(--text-placeholder);
}

.command-results {
    max-height: 320px;
    overflow-y: auto;
    padding: 0.5rem;
}

.command-group {
    padding: 0.25rem 0;
}

.command-group-label {
    padding: 0.5rem 0.75rem;
    font-size: var(--text-xs-caps);
    font-weight: var(--font-medium);
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.command-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-default);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
}

.command-item:hover,
.command-item.selected {
    background: var(--bg-subtle);
}

.command-item svg {
    width: 16px;
    height: 16px;
    color: var(--text-secondary);
    flex-shrink: 0;
}

.command-item span:first-of-type {
    flex: 1;
}

.command-shortcut {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-family: var(--font-mono);
}

.command-footer {
    display: flex;
    gap: 1rem;
    padding: 0.625rem 1rem;
    border-top: 1px solid var(--border-light);
    background: var(--bg-subtle);
}

.command-hint {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

**JavaScript for Command Menu:**
```javascript
// Command Menu Controller
class CommandMenu {
    constructor() {
        this.menu = document.getElementById('command-menu');
        this.input = document.getElementById('command-input');
        this.results = document.getElementById('command-results');
        this.isOpen = false;
        this.selectedIndex = 0;
        this.items = [];
        
        this.init();
    }
    
    init() {
        // Collect all command items
        this.items = Array.from(this.results.querySelectorAll('.command-item'));
        
        // Toggle on menu button click
        document.getElementById('menu-toggle')?.addEventListener('click', () => this.toggle());
        
        // Close on backdrop click
        document.getElementById('command-backdrop')?.addEventListener('click', () => this.close());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Click on items
        this.items.forEach((item, index) => {
            item.addEventListener('click', () => this.select(index));
        });
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
        this.updateSelection();
    }
    
    close() {
        this.isOpen = false;
        this.menu.classList.add('hidden');
    }
    
    handleKeydown(e) {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
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
    
    updateSelection() {
        this.items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
        this.items[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
    
    select(index) {
        this.selectedIndex = index;
        this.updateSelection();
        const action = this.items[index]?.dataset.action;
        if (action) {
            this.execute(action);
        }
    }
    
    execute(action) {
        this.close();
        // Handle actions...
        switch (action) {
            case 'new-recording':
                // Start new recording
                break;
            case 'saved-recordings':
                // Open saved recordings
                break;
            case 'dark-mode':
                // Toggle dark mode
                break;
            // ... other actions
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new CommandMenu();
});
```
```

### 2. Recording Controls Redesign

**Current Issues:**
- Basic checkbox toggles
- No visual feedback for selected options
- Large button with basic styling
- No iconography

**Proposed Design:**

```html
<section class="recording-controls panel">
    <div class="panel-header">
        <h2>Recording Configuration</h2>
        <p class="panel-subtitle">Select what you want to capture</p>
    </div>
    
    <div class="config-grid">
        <label class="config-card" data-config="screen">
            <input type="checkbox" id="screen-toggle" class="config-input">
            <div class="config-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <path d="M8 21h8M12 17v4"/>
                </svg>
            </div>
            <div class="config-content">
                <span class="config-title">Screen Share</span>
                <span class="config-desc">Record your entire screen</span>
            </div>
            <div class="config-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
        </label>

        <label class="config-card" data-config="camera">
            <input type="checkbox" id="camera-toggle" class="config-input">
            <div class="config-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 7l-7 5 7 5V7z"/>
                    <rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
            </div>
            <div class="config-content">
                <span class="config-title">Camera</span>
                <span class="config-desc">Include webcam footage</span>
            </div>
            <div class="config-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
        </label>

        <label class="config-card" data-config="mic">
            <input type="checkbox" id="mic-toggle" class="config-input">
            <div class="config-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                </svg>
            </div>
            <div class="config-content">
                <span class="config-title">Microphone</span>
                <span class="config-desc">Record audio from mic</span>
            </div>
            <div class="config-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
        </label>

        <label class="config-card" data-config="system-audio">
            <input type="checkbox" id="system-audio-toggle" class="config-input">
            <div class="config-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
            </div>
            <div class="config-content">
                <span class="config-title">System Audio</span>
                <span class="config-desc">Capture computer sound</span>
            </div>
            <div class="config-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
        </label>
    </div>

    <div class="config-summary">
        <div class="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
            </svg>
        </div>
        <span id="config-summary">Select inputs to start recording</span>
    </div>

    <button id="start-recording" class="btn-record" disabled>
        <span class="btn-record-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="8"/>
            </svg>
        </span>
        <span class="btn-record-text">Start Recording</span>
        <span class="btn-record-shortcut">⌘⇧R</span>
    </button>
</section>
```

**CSS Styles:**
```css
.recording-controls {
    background: var(--bg-primary);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-light);
}

.panel-header {
    margin-bottom: 1.5rem;
}

.panel-header h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.panel-subtitle {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
}

.config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.config-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border: 2px solid var(--border-light);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-base);
}

.config-card:hover {
    border-color: var(--primary-300);
    background: var(--bg-primary);
}

.config-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.config-input:checked + .config-icon {
    background: var(--primary-100);
    color: var(--primary-600);
}

.config-input:checked ~ .config-check {
    opacity: 1;
    transform: scale(1);
}

.config-input:checked ~ .config-content .config-title {
    color: var(--primary-700);
}

.config-card:has(.config-input:checked) {
    border-color: var(--primary-500);
    background: var(--primary-50);
}

.config-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
    flex-shrink: 0;
}

.config-icon svg {
    width: 24px;
    height: 24px;
}

.config-content {
    flex: 1;
    min-width: 0;
}

.config-title {
    display: block;
    font-weight: var(--font-medium);
    color: var(--text-primary);
    margin-bottom: 0.125rem;
}

.config-desc {
    display: block;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
}

.config-check {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-500);
    border-radius: var(--radius-full);
    color: white;
    opacity: 0;
    transform: scale(0.5);
    transition: all var(--transition-spring);
}

.config-check svg {
    width: 14px;
    height: 14px;
}

.config-summary {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    margin-bottom: 1.5rem;
}

.summary-icon {
    width: 20px;
    height: 20px;
    color: var(--text-tertiary);
}

.summary-icon svg {
    width: 100%;
    height: 100%;
}

#config-summary {
    font-size: var(--text-sm);
    color: var(--text-secondary);
}

.btn-record {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: var(--gradient-primary);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    cursor: pointer;
    transition: all var(--transition-base);
    box-shadow: var(--shadow-md), 0 0 0 0 var(--primary-400);
}

.btn-record:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg), 0 0 0 4px rgba(102, 126, 234, 0.2);
}

.btn-record:active:not(:disabled) {
    transform: translateY(0);
}

.btn-record:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.btn-record-icon {
    width: 24px;
    height: 24px;
}

.btn-record-icon svg {
    width: 100%;
    height: 100%;
}

.btn-record-shortcut {
    font-size: var(--text-xs);
    opacity: 0.7;
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
}
```

### 3. Preview Area Redesign

**Current Issues:**
- Basic video element styling
- Simple timer overlay
- Basic control buttons

**Proposed Design:**

```html
<section id="preview-area" class="preview-area hidden">
    <div class="preview-container">
        <video id="preview-video" autoplay muted playsinline class="preview-video"></video>
        <div class="preview-overlay">
            <div class="recording-timer">
                <span class="timer-dot"></span>
                <span id="recording-timer">00:00</span>
            </div>
            <div class="recording-controls-overlay">
                <button id="pause-recording" class="btn-control" title="Pause (Space)">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                </button>
                <button id="stop-recording" class="btn-control btn-stop" title="Stop (Esc)">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                    </svg>
                </button>
            </div>
        </div>
        <div id="paused-overlay" class="paused-overlay hidden">
            <div class="paused-badge">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <span>PAUSED</span>
            </div>
        </div>
    </div>
</section>
```

**CSS Styles:**
```css
.preview-area {
    margin: 1.5rem 0;
}

.preview-container {
    position: relative;
    border-radius: var(--radius-xl);
    overflow: hidden;
    background: var(--gray-900);
    box-shadow: var(--shadow-xl);
}

.preview-video {
    width: 100%;
    display: block;
}

.preview-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.recording-timer {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    border-radius: var(--radius-full);
    color: white;
    font-family: var(--font-mono);
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    width: fit-content;
}

.timer-dot {
    width: 10px;
    height: 10px;
    background: var(--error);
    border-radius: var(--radius-full);
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
}

.recording-controls-overlay {
    display: flex;
    gap: 0.75rem;
    pointer-events: auto;
    align-self: flex-end;
}

.btn-control {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    border: none;
    border-radius: var(--radius-full);
    color: white;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.btn-control:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
}

.btn-control svg {
    width: 24px;
    height: 24px;
}

.btn-stop {
    background: var(--error);
}

.btn-stop:hover {
    background: #dc2626;
}

.paused-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
}

.paused-badge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 2rem;
    background: var(--warning);
    color: white;
    border-radius: var(--radius-lg);
    font-weight: var(--font-bold);
    font-size: var(--text-lg);
    letter-spacing: 0.1em;
    animation: pulse 2s ease-in-out infinite;
}

.paused-badge svg {
    width: 24px;
    height: 24px;
}
```

### 4. Sidebar Redesign

**Current Issues:**
- Basic slide-in panel
- Simple card design
- No header styling
- Basic buttons

**Proposed Design:**

```html
<aside id="sidebar" class="sidebar">
    <div class="sidebar-header">
        <h2 id="saved-list-header">Saved Recordings</h2>
        <button id="close-sidebar" class="btn-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
        </button>
    </div>
    
    <div class="sidebar-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input type="text" placeholder="Search recordings..." id="search-recordings">
    </div>
    
    <div class="sidebar-filters">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="screen">Screen</button>
        <button class="filter-btn" data-filter="camera">Camera</button>
    </div>
    
    <div id="saved-list" class="saved-list">
        <!-- Video cards will be rendered here -->
    </div>
    
    <div class="sidebar-footer">
        <button id="load-more-btn" class="btn-load-more" style="display: none;">
            Load More
        </button>
        <button id="clear-all" class="btn-clear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Clear All
        </button>
    </div>
</aside>
```

**CSS Styles:**
```css
.sidebar {
    position: fixed;
    right: -420px;
    top: 0;
    width: 420px;
    max-width: 90vw;
    height: 100vh;
    background: var(--bg-primary);
    box-shadow: var(--shadow-2xl);
    transition: right var(--transition-slow);
    z-index: 200;
    display: flex;
    flex-direction: column;
}

.sidebar.open {
    right: 0;
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-light);
}

.sidebar-header h2 {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
}

.btn-close {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.btn-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.btn-close svg {
    width: 20px;
    height: 20px;
}

.sidebar-search {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    background: var(--bg-secondary);
}

.sidebar-search svg {
    width: 18px;
    height: 18px;
    color: var(--text-tertiary);
    flex-shrink: 0;
}

.sidebar-search input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: var(--text-sm);
    color: var(--text-primary);
    outline: none;
}

.sidebar-search input::placeholder {
    color: var(--text-tertiary);
}

.sidebar-filters {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid var(--border-light);
    overflow-x: auto;
}

.filter-btn {
    padding: 0.375rem 0.75rem;
    background: transparent;
    border: 1px solid var(--border-light);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--transition-fast);
}

.filter-btn:hover {
    border-color: var(--primary-300);
    color: var(--primary-600);
}

.filter-btn.active {
    background: var(--primary-50);
    border-color: var(--primary-500);
    color: var(--primary-700);
}

.saved-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
}

.saved-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    margin-bottom: 0.75rem;
    transition: all var(--transition-fast);
}

.saved-card:hover {
    border-color: var(--primary-300);
    box-shadow: var(--shadow-md);
}

.saved-card-thumbnail {
    width: 100px;
    height: 70px;
    border-radius: var(--radius-md);
    object-fit: cover;
    flex-shrink: 0;
    background: var(--gray-200);
}

.saved-card-content {
    flex: 1;
    min-width: 0;
}

.saved-card-title {
    font-weight: var(--font-medium);
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.saved-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    margin-bottom: 0.5rem;
}

.saved-card-actions {
    display: flex;
    gap: 0.5rem;
}

.btn-action {
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.btn-action svg {
    width: 14px;
    height: 14px;
}

.btn-play {
    background: var(--primary-100);
    color: var(--primary-700);
}

.btn-play:hover {
    background: var(--primary-200);
}

.btn-download {
    background: var(--success-light);
    color: var(--success);
}

.btn-download:hover {
    background: #a7f3d0;
}

.btn-delete {
    background: var(--error-light);
    color: var(--error);
}

.btn-delete:hover {
    background: #fecaca;
}

.sidebar-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-light);
}

.btn-load-more {
    width: 100%;
    padding: 0.75rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    margin-bottom: 0.75rem;
}

.btn-load-more:hover {
    border-color: var(--primary-300);
    color: var(--primary-600);
}

.btn-clear {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--error-light);
    border: none;
    border-radius: var(--radius-md);
    color: var(--error);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.btn-clear:hover {
    background: #fecaca;
}

.btn-clear svg {
    width: 16px;
    height: 16px;
}
```

### 5. Footer Redesign

**Current Issues:**
- Basic centered layout
- Simple progress bar
- No card design

**Proposed Design:**

```html
<footer class="app-footer">
    <div class="storage-card">
        <div class="storage-header">
            <div class="storage-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <span>Storage Usage</span>
            </div>
            <span id="storage-info" class="storage-info">0 MB / 0 MB</span>
        </div>
        
        <div class="storage-progress-container">
            <div id="storage-progress-bar" class="storage-progress-bar"></div>
        </div>
        
        <div id="storage-warning" class="storage-warning hidden"></div>
        
        <div class="storage-actions">
            <button id="download-last" class="btn-storage">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download Last
            </button>
            <button id="cleanup-storage" class="btn-storage">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Cleanup
            </button>
        </div>
        
        <div id="cleanup-suggestions" class="cleanup-suggestions hidden"></div>
    </div>
</footer>
```

**CSS Styles:**
```css
.app-footer {
    padding: 1.5rem;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-light);
}

.storage-card {
    max-width: 600px;
    margin: 0 auto;
    background: var(--bg-primary);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-light);
}

.storage-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
}

.storage-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: var(--font-semibold);
    color: var(--text-primary);
}

.storage-title svg {
    width: 20px;
    height: 20px;
    color: var(--text-secondary);
}

.storage-info {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text-secondary);
    background: var(--bg-tertiary);
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-full);
}

.storage-progress-container {
    height: 8px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-full);
    overflow: hidden;
    margin-bottom: 1rem;
}

.storage-progress-bar {
    height: 100%;
    width: 0%;
    background: var(--gradient-primary);
    border-radius: var(--radius-full);
    transition: width var(--transition-slow), background-color var(--transition-base);
}

.storage-progress-bar.warning {
    background: var(--warning);
}

.storage-progress-bar.danger {
    background: var(--error);
}

.storage-warning {
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    margin-bottom: 1rem;
    font-size: var(--text-sm);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.storage-warning.warning {
    background: var(--warning-light);
    color: #92400e;
    border: 1px solid #fcd34d;
}

.storage-warning.danger {
    background: var(--error-light);
    color: #991b1b;
    border: 1px solid #fca5a5;
}

.storage-actions {
    display: flex;
    gap: 0.75rem;
}

.btn-storage {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-weight: var(--font-medium);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.btn-storage:hover {
    border-color: var(--primary-300);
    color: var(--primary-600);
    background: var(--primary-50);
}

.btn-storage svg {
    width: 18px;
    height: 18px;
}

.cleanup-suggestions {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
}

.cleanup-suggestions h4 {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    margin-bottom: 0.75rem;
}

.cleanup-suggestions ul {
    list-style: none;
}

.cleanup-suggestions li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: var(--bg-primary);
    border-radius: var(--radius-md);
    margin-bottom: 0.5rem;
}

.cleanup-suggestions .recording-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.cleanup-suggestions .recording-title {
    font-weight: var(--font-medium);
    color: var(--text-primary);
    font-size: var(--text-sm);
}

.cleanup-suggestions .recording-size {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
}

.cleanup-suggestions .delete-recording-btn {
    padding: 0.375rem 0.75rem;
    background: var(--error-light);
    border: none;
    border-radius: var(--radius-md);
    color: var(--error);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.cleanup-suggestions .delete-recording-btn:hover {
    background: #fecaca;
}
```

### 6. Modal Redesign

**Current Issues:**
- Simple white modal
- No backdrop blur
- Basic close button

**Proposed Design:**

```html
<div id="modal-player" class="modal-overlay hidden">
    <div class="modal-backdrop"></div>
    <div class="modal-container">
        <div class="modal-content">
            <button class="modal-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
            <video id="modal-video" controls class="modal-video"></video>
        </div>
    </div>
</div>
```

**CSS Styles:**
```css
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
}

.modal-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    animation: fadeIn var(--transition-fast);
}

.modal-container {
    position: relative;
    width: 100%;
    max-width: 900px;
    animation: slideUp var(--transition-slow);
}

.modal-content {
    position: relative;
    background: var(--gray-900);
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: var(--shadow-2xl);
}

.modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    border: none;
    border-radius: var(--radius-full);
    color: white;
    cursor: pointer;
    z-index: 10;
    transition: all var(--transition-fast);
}

.modal-close:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
}

.modal-close svg {
    width: 20px;
    height: 20px;
}

.modal-video {
    width: 100%;
    display: block;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

### 7. Toast Notifications Redesign

**Current Issues:**
- Basic dark background
- Simple slide-in animation
- No iconography

**Proposed Design:**

```css
.toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: var(--bg-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    border-left: 4px solid var(--text-secondary);
    animation: slideInRight var(--transition-slow);
}

.toast.success {
    border-left-color: var(--success);
}

.toast.error {
    border-left-color: var(--error);
}

.toast.warning {
    border-left-color: var(--warning);
}

.toast.info {
    border-left-color: var(--info);
}

.toast-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
}

.toast.success .toast-icon {
    color: var(--success);
}

.toast.error .toast-icon {
    color: var(--error);
}

.toast.warning .toast-icon {
    color: var(--warning);
}

.toast.info .toast-icon {
    color: var(--info);
}

.toast-message {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--text-primary);
}

.toast-close {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
}

.toast-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(100%);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}
```

### 8. Keyboard Shortcuts Modal Redesign

**Current Issues:**
- Basic styling
- No visual hierarchy

**Proposed Design:**

```html
<div id="shortcuts-modal" class="modal-overlay hidden">
    <div class="modal-backdrop"></div>
    <div class="shortcuts-modal">
        <div class="modal-header">
            <h2>Keyboard Shortcuts</h2>
            <button class="modal-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
        <div class="shortcuts-grid">
            <div class="shortcut-group">
                <h3>Recording</h3>
                <div class="shortcut-item">
                    <div class="shortcut-keys">
                        <kbd>⌘</kbd>
                        <kbd>⇧</kbd>
                        <kbd>R</kbd>
                    </div>
                    <span class="shortcut-desc">Start/Stop Recording</span>
                </div>
                <div class="shortcut-item">
                    <div class="shortcut-keys">
                        <kbd>Space</kbd>
                    </div>
                    <span class="shortcut-desc">Pause/Resume</span>
                </div>
                <div class="shortcut-item">
                    <div class="shortcut-keys">
                        <kbd>Esc</kbd>
                    </div>
                    <span class="shortcut-desc">Cancel Recording</span>
                </div>
            </div>
            <div class="shortcut-group">
                <h3>Actions</h3>
                <div class="shortcut-item">
                    <div class="shortcut-keys">
                        <kbd>⌘</kbd>
                        <kbd>S</kbd>
                    </div>
                    <span class="shortcut-desc">Save Recording</span>
                </div>
            </div>
        </div>
    </div>
</div>
```

**CSS Styles:**
```css
.shortcuts-modal {
    position: relative;
    background: var(--bg-primary);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    max-width: 480px;
    width: 90%;
    box-shadow: var(--shadow-2xl);
    animation: slideUp var(--transition-slow);
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
}

.modal-header h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
}

.shortcuts-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.shortcut-group h3 {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
}

.shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: 0.5rem;
}

.shortcut-keys {
    display: flex;
    gap: 0.375rem;
}

.shortcut-keys kbd {
    min-width: 32px;
    padding: 0.375rem 0.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    color: var(--text-primary);
    text-align: center;
    box-shadow: 0 1px 0 var(--border-dark);
}

.shortcut-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary);
}
```

---

## Micro-interactions

### Button Hover Effects
```css
.btn-primary {
    transition: all var(--transition-base);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.btn-primary:active {
    transform: translateY(0);
}
```

### Card Hover Effects
```css
.card {
    transition: all var(--transition-base);
}

.card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
}
```

### Toggle Switch Animation
```css
.toggle-input:checked + .toggle-slider {
    background: var(--primary-500);
}

.toggle-input:checked + .toggle-slider::before {
    transform: translateX(100%);
}

.toggle-slider::before {
    transition: transform var(--transition-spring);
}
```

### Loading Spinner
```css
.spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-light);
    border-top-color: var(--primary-500);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

---

## Responsive Design Improvements

### Mobile Layout
```css
@media (max-width: 768px) {
    .app-header {
        padding: 0.75rem 1rem;
    }

    .header-nav {
        display: none;
    }

    .config-grid {
        grid-template-columns: 1fr;
    }

    .btn-record {
        padding: 1rem;
        font-size: var(--text-base);
    }

    .sidebar {
        width: 100%;
        right: -100%;
    }

    .storage-card {
        padding: 1rem;
    }

    .storage-actions {
        flex-direction: column;
    }
}

@media (max-width: 480px) {
    .logo-text {
        display: none;
    }

    .saved-card {
        flex-direction: column;
    }

    .saved-card-thumbnail {
        width: 100%;
        height: 120px;
    }
}
```

---

## Implementation Priority

### Phase 1 - Foundation (High Impact)
1. Update color palette and CSS variables
2. Redesign header with logo and navigation
3. Redesign recording controls with cards
4. Update button styles and hover effects

### Phase 2 - Core Components (Medium Impact)
5. Redesign preview area
6. Redesign sidebar
7. Redesign footer/storage card
8. Update modal designs

### Phase 3 - Polish (Low Impact, High Value)
9. Add micro-interactions and animations
10. Improve toast notifications
11. Add keyboard shortcuts modal redesign
12. Responsive design refinements

---

## Files to Modify

1. **style.css** - Complete redesign with new CSS variables and component styles
2. **index.html** - Updated HTML structure for all components
3. **js/ui.js** - May need updates for new class names and DOM structure

---

## Estimated Effort

- **Phase 1**: 2-3 hours
- **Phase 2**: 2-3 hours
- **Phase 3**: 1-2 hours

**Total**: 5-8 hours for complete implementation

---

## Success Metrics

1. **Visual Consistency**: All components use the same design language
2. **User Satisfaction**: Improved aesthetics increase user confidence
3. **Accessibility**: Better contrast ratios and focus states
4. **Performance**: No regression in load times or interactions
5. **Mobile Experience**: Fully functional on mobile devices