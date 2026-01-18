import { Panel } from './panel.js';
import { Dock } from './dock.js';
import { Frame } from './frame.js';

// Main framework
export class SplitDock {
    constructor() {
        this.rootWindows = [];
        this.draggedPanel = null;
        this.draggedFromDock = null;
        this.dragGhost = null;
    }

    // Initialize framework by loading window elements from HTML
    initialize() {
        const rootElement = document.getElementById('app');
        if (rootElement && rootElement.classList.contains('sd-frame')) {
            const rootFrame = new Frame(rootElement, this);
            this.rootWindows.push(rootFrame);
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

        // Clear all drop indicators
        this.getAllDocks().forEach(dock => {
            dock.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right');
        });

        this.draggedPanel = null;
        this.draggedFromDock = null;
    }

    updateDragGhost = (e) => {
        if (this.dragGhost) {
            this.dragGhost.style.left = (e.clientX + 10) + 'px';
            this.dragGhost.style.top = (e.clientY + 10) + 'px';
        }
    }

    getAllDocks() {
        const docks = [];
        
        const traverse = (win) => {
            win.children.forEach(child => {
                if (child instanceof Dock) {
                    docks.push(child);
                } else if (child instanceof Frame) {
                    traverse(child);
                }
            });
        };

        this.rootWindows.forEach(win => traverse(win));
        return docks;
    }

    updateAllStyles() {
        // Update all window split direction classes
        const traverse = (win) => {
            if (win.splitDirection) {
                win.element.classList.remove('horizontal', 'vertical');
                win.element.classList.add(win.splitDirection);
            } else {
                win.element.classList.remove('horizontal', 'vertical');
            }

            win.children.forEach(child => {
                if (child instanceof Frame) {
                    traverse(child);
                }
            });
        };

        this.rootWindows.forEach(win => traverse(win));
    }
}

// Export classes to window object for backward compatibility
window.SplitDock = SplitDock;
window.SplitDockPanel = Panel;
window.SplitDockDock = Dock;
window.SplitDockFrame = Frame;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const framework = new SplitDock();
    framework.initialize();
    window.splitDock = framework;
});
