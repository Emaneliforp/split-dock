import { Panel } from './panel.js';
import { DropHandler } from './handles/drop-handler.js';
import { generateId } from './index.js';

// Dock class - contains panels
export class Dock {
    constructor(element, parentFrame) {
        this.id = generateId();
        this.parentFrame = parentFrame;
        this.splitDock = parentFrame?.splitDock || null;
        this.panels = [];
        this.activePanel = null;
        this.eventListeners = [];
        
        this.element = element || document.createElement('div');
        this.initializeElements();
        
        this.dropHandler = new DropHandler(this);
        
        this.setupEventListeners();
    }

    initializeElements() {
        const hasExistingDock = this.element.classList.contains('sd-dock');
        
        if (!hasExistingDock) {
            this.element.className = 'sd-dock';
        }
        
        this.findOrCreateSubElements();
        
        if (hasExistingDock) {
            this.loadPanelsFromHTML();
        }
    }

    findOrCreateSubElements() {
        this.navbar = this.element.querySelector('.sd-dock-navbar') || this.createNavbar();
        this.content = this.element.querySelector('.sd-dock-content') || this.createContent();
    }

    createNavbar() {
        const navbar = document.createElement('div');
        navbar.className = 'sd-dock-navbar';
        this.element.insertBefore(navbar, this.element.firstChild);
        return navbar;
    }

    createContent() {
        const content = document.createElement('div');
        content.className = 'sd-dock-content';
        this.element.appendChild(content);
        return content;
    }

    loadPanelsFromHTML() {
        const panelElements = Array.from(this.element.querySelectorAll('.sd-panel'));
        
        panelElements.forEach(panelElement => {
            const titleEl = panelElement.querySelector('.sd-panel-title');
            const contentEl = panelElement.querySelector('.sd-panel-content');
            
            if (!titleEl || !contentEl) return;
            
            panelElement.remove();
            const panel = new Panel(titleEl, contentEl);
            this.addPanel(panel);
        });
    }

    setupEventListeners() {
        const dragOverHandler = (e) => this.dropHandler.onDragOver(e);
        this.element.addEventListener('dragover', dragOverHandler);
        this.eventListeners.push({ event: 'dragover', handler: dragOverHandler });

        const dropHandler = (e) => this.dropHandler.onDrop(e);
        this.element.addEventListener('drop', dropHandler);
        this.eventListeners.push({ event: 'drop', handler: dropHandler });

        const dragLeaveHandler = (e) => this.dropHandler.onDragLeave(e);
        this.element.addEventListener('dragleave', dragLeaveHandler);
        this.eventListeners.push({ event: 'dragleave', handler: dragLeaveHandler });
    }

    addPanel(panel) {
        panel.dock = this;
        this.panels.push(panel);
        this.navbar.appendChild(panel.titleElement);
        this.content.appendChild(panel.contentElement);

        if (this.panels.length === 1) {
            this.setActivePanel(panel);
        }

        return panel;
    }

    acceptPanel(panel, fromDock) {
        fromDock.removePanel(panel, true);
        this.addPanel(panel);
        this.setActivePanel(panel);
    }

    removePanel(panel, skipCheck = false) {
        const index = this.panels.indexOf(panel);
        if (index === -1) return;

        this.panels.splice(index, 1);

        if (!skipCheck) {
            panel.remove();
        }

        if (this.activePanel === panel) {
            this.activePanel = null;
            if (this.panels.length > 0) {
                const newIndex = Math.min(index, this.panels.length - 1);
                this.setActivePanel(this.panels[newIndex]);
            }
        }

        // If dock is empty and has parent, remove it
        if (this.panels.length === 0 && this.parentFrame) {
            this.parentFrame.removeChild(this);
        }
    }

    setActivePanel(panel) {
        this.panels.forEach(p => p.deactivate());
        panel.activate();
        this.activePanel = panel;
    }

    remove() {
        this.destroy();
        this.element.remove();
    }

    destroy() {
        // Remove all event listeners
        this.eventListeners.forEach(({ event, handler }) => {
            this.element.removeEventListener(event, handler);
        });
        this.eventListeners = [];

        // Destroy all panels
        this.panels.forEach(panel => panel.destroy());
        this.panels = [];
        
        // Clear references
        this.activePanel = null;
        this.parentFrame = null;
        this.splitDock = null;
        this.dropHandler = null;
    }
}
