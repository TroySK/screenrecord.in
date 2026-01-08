// ============================================
// PRO Modal Module - Email Signup for PRO Features
// ============================================

export class PROModal {
    constructor() {
        this.modal = document.getElementById('pro-modal');
        this.signupBtn = document.getElementById('pro-signup-btn');
        this.closeBtn = document.getElementById('pro-modal-close');
        this.cancelBtn = document.getElementById('pro-modal-cancel');
        this.form = document.getElementById('pro-email-form');
        this.emailInput = document.getElementById('pro-email-input');
        this.hasShown = false;
        
        this.init();
    }
    
    init() {
        // Check if user has already signed up or dismissed
        if (this.shouldShowModal()) {
            // Show modal when user scrolls 50% of the page
            this.setupScrollTrigger();
        }
        
        // Event listeners
        this.signupBtn?.addEventListener('click', () => this.show());
        this.closeBtn?.addEventListener('click', () => this.dismiss());
        this.cancelBtn?.addEventListener('click', () => this.dismiss());
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Close on backdrop click
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal || e.target.classList.contains('modal-backdrop')) {
                this.dismiss();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
                this.dismiss();
            }
        });
    }
    
    setupScrollTrigger() {
        const checkScroll = () => {
            if (this.hasShown) return;
            
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollPercent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
            
            // Show modal when user has scrolled 50% of the page
            if (scrollPercent >= 0.5) {
                this.hasShown = true;
                this.show();
                // Remove scroll listener after showing
                window.removeEventListener('scroll', checkScroll);
            }
        };
        
        // Check scroll position and add listener
        window.addEventListener('scroll', checkScroll);
        // Also check immediately in case user is already scrolled
        checkScroll();
    }
    
    shouldShowModal() {
        const signedUp = localStorage.getItem('pro_signed_up');
        const dismissCount = parseInt(localStorage.getItem('pro_dismiss_count') || '0');
        
        // Show if not signed up and either never dismissed or dismissed less than 3 times
        return !signedUp && (dismissCount < 3);
    }
    
    show() {
        this.modal?.classList.remove('hidden');
        this.emailInput?.focus();
    }
    
    hide() {
        this.modal?.classList.add('hidden');
    }
    
    dismiss() {
        this.hide();
        
        // Track dismiss count
        const dismissCount = parseInt(localStorage.getItem('pro_dismiss_count') || '0');
        localStorage.setItem('pro_dismiss_count', dismissCount + 1);
        localStorage.setItem('pro_dismissed', 'true');
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const email = this.emailInput?.value.trim();
        if (!email) return;
        
        // Store email locally (in production, send to your backend)
        localStorage.setItem('pro_signed_up', email);
        localStorage.setItem('pro_signup_date', new Date().toISOString());
        
        // Show success message
        this.showSuccess();
        
        // In production, send to your API:
        // try {
        //     await fetch('/api/pro-signup', {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({ email })
        //     });
        // } catch (err) {
        //     console.error('Failed to submit email:', err);
        // }
    }
    
    showSuccess() {
        const content = this.modal?.querySelector('.modal-content');
        if (content) {
            content.innerHTML = `
                <div class="pro-success">
                    <div class="pro-success-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M8 12l2 2 4-4"/>
                        </svg>
                    </div>
                    <h2>You're on the list!</h2>
                    <p>We'll notify you when PRO launches.</p>
                    <p class="pro-modal-note">Check your inbox for a confirmation email.</p>
                    <button class="btn-primary" onclick="document.getElementById('pro-modal').classList.add('hidden')">Close</button>
                </div>
            `;
        }
    }
}

// Export for global access if needed
window.PROModal = PROModal;