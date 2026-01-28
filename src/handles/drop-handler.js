import { Frame } from '../frame.js';
import { Dock } from '../dock.js';

export class DropHandler {
    constructor(dock) {
        this.dock = dock;
    }

    onDragOver(e) {
        if (!this.dock.splitDock?.draggedPanel) return;

        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        // Clear previous dock's indicators if switching to a new dock
        if (this.dock.splitDock.currentHoverDock && this.dock.splitDock.currentHoverDock !== this.dock) {
            this.clearAllIndicators(this.dock.splitDock.currentHoverDock);
        }
        this.dock.splitDock.currentHoverDock = this.dock;

        // Clear all indicators first
        this.clearAllIndicators(this.dock);

        const zone = this.getDropZone(e);
        if (!zone) return;

        // Apply the appropriate indicator based on zone
        if (zone.type === 'navbar') {
            this.showNavbarIndicator(zone, e);
        } else {
            this.dock.element.classList.add(`drop-${zone.type}`);
        }
    }

    onDragLeave(e) {
        const rect = this.dock.element.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX >= rect.right ||
            e.clientY < rect.top || e.clientY >= rect.bottom) {
            this.clearAllIndicators(this.dock);
        }
    }

    onDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.dock.splitDock) return;

        const panel = this.dock.splitDock.draggedPanel;
        const fromDock = this.dock.splitDock.draggedFromDock;
        if (!panel || !fromDock) return;

        this.clearAllIndicators(this.dock);

        const zone = this.getDropZone(e);
        if (!zone) return;

        if (zone.type === 'navbar') {
            this.handleNavbarDrop(zone, panel, fromDock);
        } else if (zone.type === 'center') {
            if (fromDock !== this.dock) {
                this.dock.acceptPanel(panel, fromDock);
            }
        } else {
            // Don't allow splitting if dragging the only panel from the same dock
            if (fromDock === this.dock && fromDock.panels.length === 1) return;
            this.createSplit(zone.type, panel, fromDock);
        }
    }

    getDropZone(e) {
        // First check if over THIS dock's navbar
        const navbarRect = this.dock.navbar.getBoundingClientRect();
        if (e.clientX >= navbarRect.left && e.clientX <= navbarRect.right &&
            e.clientY >= navbarRect.top && e.clientY <= navbarRect.bottom) {
            return { type: 'navbar', element: this.dock.navbar };
        }

        // Check dock split zones
        const rect = this.dock.element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const edgeSize = Math.min(rect.width, rect.height) * 0.33; // 33% of the smaller dimension

        if (y < edgeSize) return { type: 'top' };
        if (y > rect.height - edgeSize) return { type: 'bottom' };
        if (x < edgeSize) return { type: 'left' };
        if (x > rect.width - edgeSize) return { type: 'right' };
        
        return { type: 'center' };
    }

    clearAllIndicators(dock) {
        // Clear dock zone indicators
        dock.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');
        
        // Clear tab indicators
        const titleElements = Array.from(dock.navbar.querySelectorAll('.sd-panel-title'));
        titleElements.forEach(el => el.classList.remove('drop-before', 'drop-after'));
    }

    showNavbarIndicator(zone, e) {
        const titleElements = Array.from(this.dock.navbar.querySelectorAll('.sd-panel-title:not(.dragging)'));
        
        if (titleElements.length === 0) return;
        
        const firstTab = titleElements[0];
        const lastTab = titleElements[titleElements.length - 1];
        const firstRect = firstTab.getBoundingClientRect();
        const lastRect = lastTab.getBoundingClientRect();
        
        if (e.clientX < firstRect.left) {
            firstTab.classList.add('drop-before');
            return;
        }
        
        if (e.clientX > lastRect.right) {
            lastTab.classList.add('drop-after');
            return;
        }
        
        const hoveredTitle = titleElements.find(el => {
            const rect = el.getBoundingClientRect();
            return e.clientX >= rect.left && e.clientX <= rect.right;
        });
        
        if (hoveredTitle) {
            const rect = hoveredTitle.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            
            if (e.clientX < midpoint) {
                hoveredTitle.classList.add('drop-before');
            } else {
                hoveredTitle.classList.add('drop-after');
            }
        }
    }

    handleNavbarDrop(zone, panel, fromDock) {
        const targetInfo = this.getTargetPanelInfo(event);
        
        if (!targetInfo) {
            // No specific target, add to end if from different dock
            if (fromDock !== this.dock) {
                this.dock.acceptPanel(panel, fromDock);
            }
            return;
        }

        if (fromDock === this.dock) {
            // Reordering within same dock
            this.reorderPanel(panel, targetInfo.panel, targetInfo.position);
        } else {
            // Moving from different dock
            this.movePanel(panel, fromDock, targetInfo.panel, targetInfo.position);
        }
    }

    getTargetPanelInfo(e) {
        const titleElements = Array.from(this.dock.navbar.querySelectorAll('.sd-panel-title:not(.dragging)'));
        if (titleElements.length === 0) return null;

        const firstTab = titleElements[0];
        const lastTab = titleElements[titleElements.length - 1];
        const firstRect = firstTab.getBoundingClientRect();
        const lastRect = lastTab.getBoundingClientRect();

        // Before first tab
        if (e.clientX < firstRect.left) {
            const targetPanel = this.dock.panels.find(p => p.titleElement === firstTab);
            return targetPanel ? { panel: targetPanel, position: 'before' } : null;
        }

        // After last tab
        if (e.clientX > lastRect.right) {
            const targetPanel = this.dock.panels.find(p => p.titleElement === lastTab);
            return targetPanel ? { panel: targetPanel, position: 'after' } : null;
        }

        // Over a specific tab
        const hoveredTitle = titleElements.find(el => {
            const rect = el.getBoundingClientRect();
            return e.clientX >= rect.left && e.clientX <= rect.right;
        });

        if (hoveredTitle) {
            const rect = hoveredTitle.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            const targetPanel = this.dock.panels.find(p => p.titleElement === hoveredTitle);
            
            if (targetPanel) {
                return {
                    panel: targetPanel,
                    position: e.clientX < midpoint ? 'before' : 'after'
                };
            }
        }

        return null;
    }

    reorderPanel(panel, targetPanel, position) {
        const panelIndex = this.dock.panels.indexOf(panel);
        const targetIndex = this.dock.panels.indexOf(targetPanel);

        if (panelIndex === -1 || targetIndex === -1) return;

        // Remove panel from current position
        this.dock.panels.splice(panelIndex, 1);

        // Calculate new index
        let newIndex = targetIndex;
        if (position === 'after') {
            newIndex++;
        }
        // Adjust if we removed panel before target
        if (panelIndex < targetIndex) {
            newIndex--;
        }

        // Insert at new position
        this.dock.panels.splice(newIndex, 0, panel);

        // Update DOM
        if (position === 'before') {
            this.dock.navbar.insertBefore(panel.titleElement, targetPanel.titleElement);
        } else {
            this.dock.navbar.insertBefore(panel.titleElement, targetPanel.titleElement.nextSibling);
        }
    }

    movePanel(panel, fromDock, targetPanel, position) {
        // Remove from source dock
        fromDock.removePanel(panel, true);

        // Add to target dock at specific position
        const targetIndex = this.dock.panels.indexOf(targetPanel);
        if (targetIndex === -1) {
            this.dock.addPanel(panel);
            return;
        }

        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        
        panel.dock = this.dock;
        this.dock.panels.splice(insertIndex, 0, panel);

        // Update DOM
        if (position === 'before') {
            this.dock.navbar.insertBefore(panel.titleElement, targetPanel.titleElement);
        } else {
            this.dock.navbar.insertBefore(panel.titleElement, targetPanel.titleElement.nextSibling);
        }
        this.dock.content.appendChild(panel.contentElement);

        this.dock.setActivePanel(panel);
    }

    createSplit(direction, panel, fromDock) {
        if (!this.dock.parentFrame) return;

        const currentIndex = this.dock.parentFrame.children.indexOf(this.dock);
        if (currentIndex === -1) return;

        const newDock = new Dock(null, this.dock.parentFrame);
        newDock.addPanel(panel);
        fromDock.removePanel(panel, true);

        this.applySplit(direction, newDock, currentIndex);
    }

    applySplit(direction, newDock, currentIndex) {
        const parentFrame = this.dock.parentFrame;
        const needsVerticalSplit = direction === 'top' || direction === 'bottom';
        const needsHorizontalSplit = direction === 'left' || direction === 'right';

        if ((needsVerticalSplit && parentFrame.splitDirection === 'vertical') ||
            (needsHorizontalSplit && parentFrame.splitDirection === 'horizontal')) {
            this.splitIntoParent(direction, newDock, currentIndex);
        } else if (parentFrame.splitDirection === null && parentFrame.children.length === 1) {
            this.insertIntoParent(direction, newDock, currentIndex);
        } else {
            this.createNestedSplit(direction, newDock);
        }
    }

    splitIntoParent(direction, newDock, currentIndex) {
        const insertBefore = direction === 'top' || direction === 'left';
        const insertIndex = insertBefore ? currentIndex : currentIndex + 1;

        this.dock.parentFrame.children.splice(insertIndex, 0, newDock);
        
        if (insertBefore) {
            this.dock.parentFrame.element.insertBefore(newDock.element, this.dock.element);
        } else {
            this.dock.parentFrame.element.insertBefore(newDock.element, this.dock.element.nextSibling);
        }

        this.dock.element.style.flex = '1 1 0px';
        newDock.element.style.flex = '1 1 0px';

        this.dock.parentFrame.updateStyles();
    }

    insertIntoParent(direction, newDock, currentIndex) {
        const needsVerticalSplit = direction === 'top' || direction === 'bottom';
        // Default to vertical split direction
        this.dock.parentFrame.splitDirection = needsVerticalSplit ? 'vertical' : 'horizontal';

        this.splitIntoParent(direction, newDock, currentIndex);
    }

    createNestedSplit(direction, newDock) {
        const parentFrame = this.dock.parentFrame;
        const currentIndex = parentFrame.children.indexOf(this.dock);

        const needsVerticalSplit = direction === 'top' || direction === 'bottom';
        const newSplitDirection = needsVerticalSplit ? 'vertical' : 'horizontal';

        const wrapperFrame = new Frame(null, this.dock.splitDock);
        wrapperFrame.splitDirection = newSplitDirection;
        wrapperFrame.parentFrame = parentFrame;

        parentFrame.children[currentIndex] = wrapperFrame;
        parentFrame.element.insertBefore(wrapperFrame.element, this.dock.element);

        this.dock.element.remove();
        this.dock.parentFrame = wrapperFrame;
        newDock.parentFrame = wrapperFrame;

        const insertBefore = direction === 'top' || direction === 'left';
        if (insertBefore) {
            wrapperFrame.children = [newDock, this.dock];
            wrapperFrame.element.appendChild(newDock.element);
            wrapperFrame.element.appendChild(this.dock.element);
        } else {
            wrapperFrame.children = [this.dock, newDock];
            wrapperFrame.element.appendChild(this.dock.element);
            wrapperFrame.element.appendChild(newDock.element);
        }

        this.dock.element.style.flex = '1 1 0px';
        newDock.element.style.flex = '1 1 0px';

        wrapperFrame.updateStyles();
    }
}
