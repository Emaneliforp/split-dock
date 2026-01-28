export class TabBarDropHandler {
    constructor(dock) {
        this.dock = dock;
    }

    onDragOver(e) {
        if (!this.dock.splitDock?.draggedPanel) return;
        
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        // Clear tab indicators from previous dock if switching
        if (this.dock.splitDock.currentHoverDock && this.dock.splitDock.currentHoverDock !== this.dock) {
            const prevTitleElements = Array.from(this.dock.splitDock.currentHoverDock.navbar.querySelectorAll('.sd-panel-title'));
            prevTitleElements.forEach(el => el.classList.remove('drop-before', 'drop-after'));
            this.dock.splitDock.currentHoverDock.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');
        }
        this.dock.splitDock.currentHoverDock = this.dock;

        // Clear any dock zone indicators since we're over the navbar
        this.dock.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');
        
        const titleElements = Array.from(this.dock.navbar.querySelectorAll('.sd-panel-title:not(.dragging)'));
        
        // Remove all drop markers
        titleElements.forEach(el => el.classList.remove('drop-before', 'drop-after'));
        
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

    onDragLeave(e) {
        const navbarRect = this.dock.navbar.getBoundingClientRect();
        if (e.clientX < navbarRect.left || e.clientX >= navbarRect.right ||
            e.clientY < navbarRect.top || e.clientY >= navbarRect.bottom) {
            const titleElements = Array.from(this.dock.navbar.querySelectorAll('.sd-panel-title'));
            titleElements.forEach(el => el.classList.remove('drop-before', 'drop-after'));
        }
    }

    onDrop(e) {
        if (!this.dock.splitDock?.draggedPanel) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const panel = this.dock.splitDock.draggedPanel;
        const fromDock = this.dock.splitDock.draggedFromDock;
        const titleElements = Array.from(this.dock.navbar.querySelectorAll('.sd-panel-title:not(.dragging)'));
        
        titleElements.forEach(el => el.classList.remove('drop-before', 'drop-after'));
        
        if (titleElements.length === 0) {
            if (fromDock !== this.dock) {
                this.dock.acceptPanel(panel, fromDock);
            }
            return;
        }
        
        const { targetPanel, insertBefore } = this.getTargetPanelInfo(e, titleElements);
        
        if (!targetPanel) {
            if (fromDock !== this.dock) {
                this.dock.acceptPanel(panel, fromDock);
            }
            return;
        }
        
        if (fromDock === this.dock) {
            this.reorderPanel(panel, targetPanel, insertBefore);
        } else {
            this.movePanel(panel, fromDock, targetPanel, insertBefore);
        }
    }

    getTargetPanelInfo(e, titleElements) {
        const firstTab = titleElements[0];
        const lastTab = titleElements[titleElements.length - 1];
        const firstRect = firstTab.getBoundingClientRect();
        const lastRect = lastTab.getBoundingClientRect();
        
        if (e.clientX < firstRect.left) {
            return {
                targetPanel: this.dock.panels.find(p => p.titleElement === firstTab),
                insertBefore: true
            };
        }
        
        if (e.clientX > lastRect.right) {
            return {
                targetPanel: this.dock.panels.find(p => p.titleElement === lastTab),
                insertBefore: false
            };
        }
        
        const hoveredTitle = titleElements.find(el => {
            const rect = el.getBoundingClientRect();
            return e.clientX >= rect.left && e.clientX <= rect.right;
        });
        
        if (!hoveredTitle) {
            return { targetPanel: null, insertBefore: true };
        }
        
        const targetPanel = this.dock.panels.find(p => p.titleElement === hoveredTitle);
        const rect = hoveredTitle.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        
        return { targetPanel, insertBefore: e.clientX < midpoint };
    }

    reorderPanel(panel, targetPanel, insertBefore) {
        const oldIndex = this.dock.panels.indexOf(panel);
        const newIndex = this.dock.panels.indexOf(targetPanel);
        
        if (oldIndex === newIndex) return;
        
        this.dock.panels.splice(oldIndex, 1);
        
        const adjustedIndex = oldIndex < newIndex ? newIndex : newIndex + (insertBefore ? 0 : 1);
        this.dock.panels.splice(insertBefore ? newIndex : adjustedIndex, 0, panel);
        
        const refElement = insertBefore ? targetPanel.titleElement : targetPanel.titleElement.nextSibling;
        this.dock.navbar.insertBefore(panel.titleElement, refElement);
    }

    movePanel(panel, fromDock, targetPanel, insertBefore) {
        fromDock.removePanel(panel, true);
        
        const targetIndex = this.dock.panels.indexOf(targetPanel);
        const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
        
        panel.dock = this.dock;
        this.dock.panels.splice(insertIndex, 0, panel);
        this.dock.content.appendChild(panel.contentElement);
        
        const refElement = insertBefore ? targetPanel.titleElement : targetPanel.titleElement.nextSibling;
        this.dock.navbar.insertBefore(panel.titleElement, refElement);
        
        this.dock.setActivePanel(panel);
    }
}
