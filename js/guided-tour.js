/**
 * Guided Tour Module
 * Provides an interactive tour of transmission card features for first-time users
 */

class GuidedTour {
    constructor() {
        this.tourActive = false;
        this.currentStep = 0;
        this.overlay = null;
        this.tooltip = null;
        this.hasSeenTour = localStorage.getItem('brandmeister_tour_completed') === 'true';
        this.tourSteps = [];
        this.pendingTourStart = false;
    }

    /**
     * Check if tour should be shown (first transmission received and tour not completed)
     */
    shouldShowTour() {
        return !this.hasSeenTour && this.pendingTourStart;
    }

    /**
     * Mark that monitoring has started and tour should begin on first transmission
     */
    markMonitoringStarted() {
        if (!this.hasSeenTour) {
            this.pendingTourStart = true;
        }
    }

    /**
     * Start the guided tour with the first transmission card
     */
    startTour(transmissionCard) {
        if (this.tourActive || !transmissionCard) return;

        this.tourActive = true;
        this.pendingTourStart = false;

        // Add tour-active class to body to disable interactions
        document.body.classList.add('tour-active');

        // Pause the app during tour
        if (window.brandmeisterMonitor) {
            window.brandmeisterMonitor.pauseForTour();
        }

        // Define tour steps - some relative to card, some to document
        this.tourSteps = [
            {
                selector: '.card-callsign a',
                titleKey: 'tour.callsign.title',
                descriptionKey: 'tour.callsign.description',
                position: 'bottom',
                relative: true  // Relative to transmission card
            },
            {
                selector: '.radio-id-link',
                titleKey: 'tour.radioid.title',
                descriptionKey: 'tour.radioid.description',
                position: 'bottom',
                relative: true
            },
            {
                selector: '.card-tg',
                titleKey: 'tour.talkgroup.title',
                descriptionKey: 'tour.talkgroup.description',
                position: 'bottom',
                relative: true
            },
            {
                selector: '.card-location-link',
                titleKey: 'tour.location.title',
                descriptionKey: 'tour.location.description',
                position: 'top',
                relative: true
            },
            {
                selector: '.location-distance',
                titleKey: 'tour.distance.title',
                descriptionKey: 'tour.distance.description',
                position: 'top',
                relative: true
            },
            {
                selector: '.card-source-name a',
                titleKey: 'tour.source.title',
                descriptionKey: 'tour.source.description',
                position: 'top',
                relative: true
            },
            {
                selector: '#themeToggle',
                titleKey: 'header.theme.tooltip',
                descriptionKey: 'header.theme.tooltip',
                position: 'bottom',
                relative: false  // Relative to document
            },
            {
                selector: '#sidebarToggle',
                titleKey: 'header.menu.tooltip',
                descriptionKey: 'header.menu.tooltip',
                position: 'bottom',
                relative: false
            },
            {
                selector: '#tgSelectedList',
                titleKey: 'sidebar.selected.tooltip',
                descriptionKey: 'sidebar.selected.tooltip',
                position: 'left',
                relative: false
            }
        ];

        this.currentStep = 0;
        this.transmissionCard = transmissionCard;
        this.createOverlay();
        this.showStep(0);
    }

    /**
     * Create the tour overlay and tooltip elements
     */
    createOverlay() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        document.body.appendChild(this.overlay);

        // Create tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        this.tooltip.innerHTML = `
            <div class="tour-tooltip-header">
                <h3 class="tour-tooltip-title"></h3>
                <button class="tour-close-btn" title="${window.t('tour.close')}">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="tour-tooltip-content">
                <p class="tour-tooltip-description"></p>
            </div>
            <div class="tour-tooltip-footer">
                <div class="tour-progress">
                    <span class="tour-progress-text"></span>
                </div>
                <div class="tour-navigation">
                    <button class="tour-prev-btn" disabled>
                        <span class="material-icons">arrow_back</span>
                        <span class="tour-btn-text">${window.t('tour.previous')}</span>
                    </button>
                    <button class="tour-next-btn">
                        <span class="tour-btn-text">${window.t('tour.next')}</span>
                        <span class="material-icons">arrow_forward</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(this.tooltip);

        // Attach event listeners
        this.tooltip.querySelector('.tour-close-btn').addEventListener('click', () => this.endTour(true));
        this.tooltip.querySelector('.tour-prev-btn').addEventListener('click', () => this.previousStep());
        this.tooltip.querySelector('.tour-next-btn').addEventListener('click', () => this.nextStep());
    }

    /**
     * Show a specific tour step
     */
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.tourSteps.length) return;

        this.currentStep = stepIndex;
        const step = this.tourSteps[stepIndex];

        // Find the target element - either relative to card or document
        const targetElement = step.relative 
            ? this.transmissionCard.querySelector(step.selector)
            : document.querySelector(step.selector);
        
        if (!targetElement) {
            // If element not found, skip to next step
            this.nextStep();
            return;
        }

        // Update tooltip content
        this.tooltip.querySelector('.tour-tooltip-title').textContent = window.t(step.titleKey);
        this.tooltip.querySelector('.tour-tooltip-description').textContent = window.t(step.descriptionKey);

        // Update navigation buttons
        const prevBtn = this.tooltip.querySelector('.tour-prev-btn');
        const nextBtn = this.tooltip.querySelector('.tour-next-btn');
        
        prevBtn.disabled = this.currentStep === 0;
        
        if (this.currentStep === this.tourSteps.length - 1) {
            nextBtn.querySelector('.tour-btn-text').textContent = window.t('tour.finish');
        } else {
            nextBtn.querySelector('.tour-btn-text').textContent = window.t('tour.next');
        }

        // Highlight target element
        this.highlightElement(targetElement);

        // Position tooltip
        this.positionTooltip(targetElement, step.position);

        // Scroll element into view
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Highlight the target element
     */
    highlightElement(element) {
        // Remove previous highlights from individual elements
        document.querySelectorAll('.tour-highlight').forEach(el => {
            if (el !== this.transmissionCard) {
                el.classList.remove('tour-highlight');
            }
        });

        // Always keep the transmission card highlighted
        if (this.transmissionCard) {
            this.transmissionCard.classList.add('tour-highlight');
        }

        // Add highlight to current element
        element.classList.add('tour-highlight');
    }

    /**
     * Position the tooltip relative to the target element
     */
    positionTooltip(element, position = 'bottom') {
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const spacing = 16;

        let top, left;

        // Reset position classes
        this.tooltip.classList.remove('tour-tooltip-top', 'tour-tooltip-bottom', 'tour-tooltip-left', 'tour-tooltip-right');

        // Calculate position based on available space
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceLeft = rect.left;
        const spaceRight = window.innerWidth - rect.right;

        // Determine best position
        let finalPosition = position;
        
        if (position === 'bottom' && spaceBelow < tooltipRect.height + spacing && spaceAbove > spaceBelow) {
            finalPosition = 'top';
        } else if (position === 'top' && spaceAbove < tooltipRect.height + spacing && spaceBelow > spaceAbove) {
            finalPosition = 'bottom';
        } else if (position === 'left' && spaceLeft < tooltipRect.width + spacing) {
            finalPosition = 'right';
        } else if (position === 'right' && spaceRight < tooltipRect.width + spacing) {
            finalPosition = 'left';
        }

        // Calculate coordinates
        if (finalPosition === 'bottom') {
            top = rect.bottom + spacing;
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            this.tooltip.classList.add('tour-tooltip-bottom');
        } else if (finalPosition === 'top') {
            top = rect.top - tooltipRect.height - spacing;
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            this.tooltip.classList.add('tour-tooltip-top');
        } else if (finalPosition === 'left') {
            top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
            left = rect.left - tooltipRect.width - spacing;
            this.tooltip.classList.add('tour-tooltip-left');
        } else if (finalPosition === 'right') {
            top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
            left = rect.right + spacing;
            this.tooltip.classList.add('tour-tooltip-right');
        }

        // Keep tooltip within viewport bounds
        const maxLeft = window.innerWidth - tooltipRect.width - 10;
        const maxTop = window.innerHeight - tooltipRect.height - 10;
        left = Math.max(10, Math.min(left, maxLeft));
        top = Math.max(10, Math.min(top, maxTop));

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.opacity = '1';
    }

    /**
     * Move to the next step
     */
    nextStep() {
        if (this.currentStep < this.tourSteps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.endTour(true);
        }
    }

    /**
     * Move to the previous step
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * End the tour
     */
    endTour(completed = false) {
        if (!this.tourActive) return;

        // Remove tour-active class from body to re-enable interactions
        document.body.classList.remove('tour-active');

        // Remove highlights
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });

        // Remove overlay and tooltip
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }

        this.tourActive = false;
        this.transmissionCard = null;

        // Resume the app after tour
        if (window.brandmeisterMonitor) {
            window.brandmeisterMonitor.resumeFromTour();
        }

        // Mark tour as completed if user finished it
        if (completed) {
            localStorage.setItem('brandmeister_tour_completed', 'true');
            this.hasSeenTour = true;
        }
    }

    /**
     * Reset tour (for testing or user request)
     */
    resetTour() {
        localStorage.removeItem('brandmeister_tour_completed');
        this.hasSeenTour = false;
        this.pendingTourStart = false;
        this.endTour(false);
    }
}

// Export for use in app.js
if (typeof window !== 'undefined') {
    window.GuidedTour = GuidedTour;
}
