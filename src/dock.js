import { Panel } from './panel.js';
import { DragDropHandler } from './handles/drag-drop-handler.js';
import { generateId, CONFIG } from './index.js';

// Dock class - contains panels
export class Dock {
    constructor(element, parentFrame) {
        this.id = generateId();
        this.parentFrame = parentFrame;
        this.splitDock = parentFrame?.splitDock || null;
        this.panels = [];
        this.activePanel = null;
        this.abortController = new AbortController();
        
        this.element = element || document.createElement('div');
        this.initializeElements();
        
        this.dragDropHandler = new DragDropHandler(this);
        
        this.setupEventListeners();
    }

    initializeElements() {
        const hasExistingDock = this.element.classList.contains('sd-dock');
        if (!hasExistingDock) this.element.className = 'sd-dock';
        
        this.navbar = this.element.querySelector('.sd-dock-navbar');
        if (!this.navbar) {
            this.navbar = document.createElement('div');
            this.navbar.className = 'sd-dock-navbar';
            this.element.insertBefore(this.navbar, this.element.firstChild);
        }
        
        this.content = this.element.querySelector('.sd-dock-content');
        if (!this.content) {
            this.content = document.createElement('div');
            this.content.className = 'sd-dock-content';
            this.element.appendChild(this.content);
        }
        
        if (hasExistingDock) this.loadPanelsFromHTML();
    }

    loadPanelsFromHTML() {
        // Collect all panel elements first
        const panelElements = Array.from(this.element.querySelectorAll('.sd-panel'));
        
        panelElements.forEach(panelEl => {
            const titleEl = panelEl.querySelector('.sd-panel-title');
            const contentEl = panelEl.querySelector('.sd-panel-content');
            if (titleEl && contentEl) {
                // Remove from DOM
                panelEl.remove();
                // Create and add panel
                this.addPanel(new Panel(titleEl, contentEl));
            }
        });
    }

    setupEventListeners() {
        const signal = this.abortController.signal;
        
        this.element.addEventListener('dragover', (e) => this.dragDropHandler.onDragOver(e, this), { signal });
        this.element.addEventListener('drop', (e) => this.dragDropHandler.onDrop(e, this), { signal });
        this.element.addEventListener('dragleave', (e) => this.dragDropHandler.onDragLeave(e, this), { signal });
    }

    addPanel(panel) {
        panel.dock = this;
        this.panels.push(panel);
        this.navbar.appendChild(panel.titleElement);
        this.content.appendChild(panel.contentElement);
        if (this.panels.length === 1) this.setActivePanel(panel);
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
        if (!skipCheck) panel.remove();

        if (this.activePanel === panel) {
            this.activePanel = null;
            if (this.panels.length > 0) {
                this.setActivePanel(this.panels[Math.min(index, this.panels.length - 1)]);
            }
        }

        if (this.panels.length === 0 && this.parentFrame) {
            this.parentFrame.removeChild(this);
        }
    }

    setActivePanel(panel) {
        this.panels.forEach(p => p.deactivate());
        panel.activate();
        this.activePanel = panel;
    }

    clearDropIndicators() {
        this.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');
        this.navbar.querySelectorAll('.sd-panel-title').forEach(el => 
            el.classList.remove('drop-before', 'drop-after')
        );
    }

    showNavbarDropIndicator(e) {
        const titles = Array.from(this.navbar.querySelectorAll('.sd-panel-title:not(.dragging)'));
        if (titles.length === 0) return;
        
        const firstRect = titles[0].getBoundingClientRect();
        const lastRect = titles[titles.length - 1].getBoundingClientRect();
        
        if (e.clientX < firstRect.left) {
            titles[0].classList.add('drop-before');
        } else if (e.clientX > lastRect.right) {
            titles[titles.length - 1].classList.add('drop-after');
        } else {
            const hovered = titles.find(el => {
                const rect = el.getBoundingClientRect();
                return e.clientX >= rect.left && e.clientX <= rect.right;
            });
            if (hovered) {
                const rect = hovered.getBoundingClientRect();
                hovered.classList.add(e.clientX < rect.left + rect.width / 2 ? 'drop-before' : 'drop-after');
            }
        }
    }

    getDropTargetPanelInfo(e) {
        const titles = Array.from(this.navbar.querySelectorAll('.sd-panel-title:not(.dragging)'));
        if (titles.length === 0) return null;

        const firstRect = titles[0].getBoundingClientRect();
        const lastRect = titles[titles.length - 1].getBoundingClientRect();

        let targetTitle, position;
        if (e.clientX < firstRect.left) {
            targetTitle = titles[0];
            position = 'before';
        } else if (e.clientX > lastRect.right) {
            targetTitle = titles[titles.length - 1];
            position = 'after';
        } else {
            targetTitle = titles.find(el => {
                const rect = el.getBoundingClientRect();
                return e.clientX >= rect.left && e.clientX <= rect.right;
            });
            if (targetTitle) {
                const rect = targetTitle.getBoundingClientRect();
                position = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
            }
        }

        const panel = this.panels.find(p => p.titleElement === targetTitle);
        return panel ? { panel, position } : null;
    }

    reorderPanel(panel, targetPanel, position) {
        const panelIdx = this.panels.indexOf(panel);
        const targetIdx = this.panels.indexOf(targetPanel);
        if (panelIdx === -1 || targetIdx === -1) return;

        this.panels.splice(panelIdx, 1);
        let newIdx = targetIdx + (position === 'after' ? 1 : 0);
        if (panelIdx < targetIdx) newIdx--;
        this.panels.splice(newIdx, 0, panel);

        const refNode = position === 'before' ? targetPanel.titleElement : targetPanel.titleElement.nextSibling;
        this.navbar.insertBefore(panel.titleElement, refNode);
    }

    acceptPanelAt(panel, fromDock, targetPanel, position) {
        fromDock.removePanel(panel, true);

        const targetIdx = this.panels.indexOf(targetPanel);
        if (targetIdx === -1) {
            this.addPanel(panel);
            return;
        }

        panel.dock = this;
        this.panels.splice(position === 'before' ? targetIdx : targetIdx + 1, 0, panel);
        
        const refNode = position === 'before' ? targetPanel.titleElement : targetPanel.titleElement.nextSibling;
        this.navbar.insertBefore(panel.titleElement, refNode);
        this.content.appendChild(panel.contentElement);
        this.setActivePanel(panel);
    }

    destroy() {
        this.abortController.abort();
        this.panels.forEach(panel => panel.destroy());
        this.panels = [];
        this.activePanel = null;
        this.parentFrame = null;
        this.splitDock = null;
        this.dragDropHandler?.destroy();
        this.dragDropHandler = null;
        this.element.remove();
    }
}
