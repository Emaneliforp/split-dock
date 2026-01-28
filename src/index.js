import { Panel } from './panel.js';
import { Dock } from './dock.js';
import { Frame } from './frame.js';

// Auto-load CSS
(function loadCSS() {
    const existingLink = document.querySelector('link[href*="style.css"]');
    if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL('./style.css', import.meta.url).href;
        document.head.appendChild(link);
    }
})();

// ID counter for generating unique IDs
let idCounter = 0;
export function generateId() {
    return `sd-${Date.now()}-${++idCounter}`;
}

// Main framework
export class SplitDock {
    constructor() {
        this.rootFrames = [];
        this.draggedPanel = null;
        this.draggedFromDock = null;
        this.dragGhost = null;
        this.currentHoverDock = null;
    }

    // Initialize framework by loading frame elements from HTML
    initialize() {
        const rootElement = document.getElementById('app');
        if (rootElement && rootElement.classList.contains('sd-frame')) {
            const rootFrame = new Frame(rootElement, this);
            this.rootFrames.push(rootFrame);
        }

        return this;
    }

    startDragging(panel, dock) {
        this.draggedPanel = panel;
        this.draggedFromDock = dock;

        this.dragGhost = document.createElement('div');
        this.dragGhost.className = 'drag-ghost';
        this.dragGhost.textContent = panel.title;
        document.body.appendChild(this.dragGhost);

        document.addEventListener('dragover', this.updateDragGhost);
    }

    stopDragging() {
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }

        document.removeEventListener('dragover', this.updateDragGhost);

        // Clear drop indicators from the currently hovered dock only
        if (this.currentHoverDock) {
            this.currentHoverDock.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');
            // Also clear tab reordering indicators
            const titleElements = Array.from(this.currentHoverDock.navbar.querySelectorAll('.sd-panel-title'));
            titleElements.forEach(el => el.classList.remove('drop-before', 'drop-after'));
        }

        this.draggedPanel = null;
        this.draggedFromDock = null;
        this.currentHoverDock = null;
    }

    updateDragGhost = (e) => {
        if (this.dragGhost) {
            this.dragGhost.style.left = (e.clientX + 10) + 'px';
            this.dragGhost.style.top = (e.clientY + 10) + 'px';
        }
    }

    destroy() {
        // Cleanup drag ghost if exists
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }

        // Remove event listeners
        document.removeEventListener('dragover', this.updateDragGhost);

        // Destroy all root frames
        this.rootFrames.forEach(frame => frame.destroy());
        this.rootFrames = [];

        // Clear references
        this.draggedPanel = null;
        this.draggedFromDock = null;
        this.currentHoverDock = null;
    }
}

// Export classes to window object for backward compatibility
window.SplitDock = SplitDock;
window.SdPanel = Panel;
window.SdDock = Dock;
window.SdFrame = Frame;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const framework = new SplitDock();
    framework.initialize();
    window.splitDock = framework;
});
