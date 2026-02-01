import { CONFIG } from '../index.js';

export class DragDropHandler {
    constructor(dock) {
        this.draggedPanel = null;
        this.draggedFromDock = null;
        this.currentHoverDock = null;
        this.dragGhost = null;
        
        // Reuse single handler across all docks
        if (dock?.splitDock?.dragDropHandler) {
            return dock.splitDock.dragDropHandler;
        }
        if (dock?.splitDock) {
            dock.splitDock.dragDropHandler = this;
        }
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
        this.dragGhost?.remove();
        this.dragGhost = null;
        document.removeEventListener('dragover', this.updateDragGhost);
        this.currentHoverDock?.clearDropIndicators();
        this.draggedPanel = null;
        this.draggedFromDock = null;
        this.currentHoverDock = null;
    }

    updateDragGhost = (e) => {
        if (this.dragGhost) {
            this.dragGhost.style.left = `${e.clientX + CONFIG.layout.dragGhostOffset}px`;
            this.dragGhost.style.top = `${e.clientY + CONFIG.layout.dragGhostOffset}px`;
        }
    }

    onDragOver(e, dock) {
        if (!this.draggedPanel) return;

        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        
        if (this.currentHoverDock && this.currentHoverDock !== dock) {
            this.currentHoverDock.clearDropIndicators();
        }
        this.currentHoverDock = dock;
        dock.clearDropIndicators();

        const zone = this.getDropZone(e, dock);
        if (zone?.type === 'navbar') {
            dock.showNavbarDropIndicator(e);
        } else if (zone) {
            dock.element.classList.add(`drop-${zone.type}`);
        }
    }

    onDragLeave(e, dock) {
        const rect = dock.element.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX >= rect.right ||
            e.clientY < rect.top || e.clientY >= rect.bottom) {
            dock.clearDropIndicators();
        }
    }

    onDrop(e, dock) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.draggedPanel || !this.draggedFromDock || !dock.splitDock) return;

        dock.clearDropIndicators();
        const zone = this.getDropZone(e, dock);
        if (!zone) return;

        if (zone.type === 'navbar') {
            this.handleNavbarDrop(dock, this.draggedPanel, this.draggedFromDock);
        } else if (zone.type === 'center') {
            if (this.draggedFromDock !== dock) {
                dock.acceptPanel(this.draggedPanel, this.draggedFromDock);
            }
        } else {
            // Don't allow splitting if dragging the only panel from the same dock
            if (this.draggedFromDock === dock && this.draggedFromDock.panels.length === 1) return;
            dock.parentFrame?.splitWithPanel(dock, zone.type, this.draggedPanel, this.draggedFromDock);
        }
    }

    getDropZone(e, dock) {
        const navbarRect = dock.navbar.getBoundingClientRect();
        if (e.clientX >= navbarRect.left && e.clientX <= navbarRect.right &&
            e.clientY >= navbarRect.top && e.clientY <= navbarRect.bottom) {
            return { type: 'navbar', element: dock.navbar };
        }

        const rect = dock.element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const edgeSize = Math.min(rect.width, rect.height) * CONFIG.layout.dropZoneRatio;

        if (y < edgeSize) return { type: 'top' };
        if (y > rect.height - edgeSize) return { type: 'bottom' };
        if (x < edgeSize) return { type: 'left' };
        if (x > rect.width - edgeSize) return { type: 'right' };
        
        return { type: 'center' };
    }

    handleNavbarDrop(dock, panel, fromDock) {
        const targetInfo = dock.getDropTargetPanelInfo(event);
        
        if (!targetInfo) {
            if (fromDock !== dock) {
                dock.acceptPanel(panel, fromDock);
            }
            return;
        }

        if (fromDock === dock) {
            dock.reorderPanel(panel, targetInfo.panel, targetInfo.position);
        } else {
            dock.acceptPanelAt(panel, fromDock, targetInfo.panel, targetInfo.position);
        }
    }

    destroy() {
        this.dragGhost?.remove();
        this.dragGhost = null;
        document.removeEventListener('dragover', this.updateDragGhost);
        this.draggedPanel = null;
        this.draggedFromDock = null;
        this.currentHoverDock = null;
    }
}
