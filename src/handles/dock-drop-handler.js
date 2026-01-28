import { Frame } from '../frame.js';
import { Dock } from '../dock.js';

export class DockDropHandler {
    constructor(dock) {
        this.dock = dock;
    }

    onDragOver(e) {
        if (!this.dock.splitDock?.draggedPanel) return;

        // If over navbar, let the tab handler deal with it exclusively
        if (this.isOverNavbar(e)) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        // Clear previous dock's indicators if switching to a new dock
        if (this.dock.splitDock.currentHoverDock && this.dock.splitDock.currentHoverDock !== this.dock) {
            this.dock.splitDock.currentHoverDock.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');
        }
        this.dock.splitDock.currentHoverDock = this.dock;

        // Remove all zone classes
        this.dock.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');

        const zone = this.getDropZoneFromEvent(e);
        if (zone) {
            this.dock.element.classList.add(`drop-${zone}`);
        }
    }

    onDragLeave(e) {
        const rect = this.dock.element.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX >= rect.right ||
            e.clientY < rect.top || e.clientY >= rect.bottom) {
            this.dock.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');
        }
    }

    onDrop(e) {
        // If over navbar, let the tab handler deal with it
        if (this.isOverNavbar(e)) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (!this.dock.splitDock) return;

        const panel = this.dock.splitDock.draggedPanel;
        const fromDock = this.dock.splitDock.draggedFromDock;

        if (!panel || !fromDock) return;

        this.dock.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');

        const zone = this.getDropZoneFromEvent(e);
        
        if (zone === 'center') {
            if (fromDock !== this.dock) {
                this.dock.acceptPanel(panel, fromDock);
            }
            return;
        }

        // Don't allow splitting if dragging the only panel from the same dock
        if (fromDock === this.dock && fromDock.panels.length === 1) return;
        
        this.createSplit(zone, panel, fromDock);
    }

    isOverNavbar(e) {
        // Check if mouse is over ANY navbar, not just this dock's navbar
        const allNavbars = document.querySelectorAll('.sd-dock-navbar');
        for (const navbar of allNavbars) {
            const rect = navbar.getBoundingClientRect();
            if (e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom) {
                return true;
            }
        }
        return false;
    }

    getDropZoneFromEvent(e) {
        const rect = this.dock.element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return this.getDropZone(x, y, rect.width, rect.height);
    }

    getDropZone(x, y, width, height) {
        const topThreshold = height * 0.3;
        const bottomThreshold = height * 0.7;
        const leftThreshold = width * 0.3;
        const rightThreshold = width * 0.7;

        if (y < topThreshold) return 'top';
        if (y > bottomThreshold) return 'bottom';
        if (x < leftThreshold) return 'left';
        if (x > rightThreshold) return 'right';
        return 'center';
    }

    createSplit(direction, panel, fromDock) {
        if (!this.dock.splitDock) return;
        if (fromDock === this.dock && fromDock.panels.length === 1) return;
        if (!this.dock.parentFrame) return;

        fromDock.removePanel(panel, true);

        const newDock = new Dock(null, null);
        newDock.addPanel(panel);

        const splitDir = (direction === 'left' || direction === 'right') ? 'horizontal' : 'vertical';
        const insertBefore = (direction === 'top' || direction === 'left');
        
        this.applySplit(newDock, splitDir, insertBefore);
    }

    applySplit(newDock, splitDir, insertBefore) {
        const parent = this.dock.parentFrame;
        const isOnlyChild = parent.children.length === 1 && parent.children[0] === this.dock;
        const hasSameSplitDir = parent.splitDirection === splitDir;

        if (isOnlyChild) {
            this.splitIntoParent(parent, newDock, splitDir, insertBefore);
        } else if (hasSameSplitDir) {
            this.insertIntoParent(parent, newDock, insertBefore);
        } else {
            this.createNestedSplit(parent, newDock, splitDir, insertBefore);
        }
    }

    splitIntoParent(parent, newDock, splitDir, insertBefore) {
        parent.splitDirection = splitDir;
        parent.children = [];
        
        if (insertBefore) {
            parent.addChild(newDock);
            parent.addChild(this.dock);
        } else {
            parent.addChild(this.dock);
            parent.addChild(newDock);
        }
    }

    insertIntoParent(parent, newDock, insertBefore) {
        const index = parent.children.indexOf(this.dock);
        const insertIndex = insertBefore ? index : index + 1;
        
        parent.children.splice(insertIndex, 0, newDock);
        newDock.parentFrame = parent;
        
        const refElement = insertBefore ? this.dock.element : this.dock.element.nextSibling;
        parent.element.insertBefore(newDock.element, refElement);
        parent.updateStyles();
    }

    createNestedSplit(parent, newDock, splitDir, insertBefore) {
        const newFrame = new Frame(null, this.dock.splitDock);
        newFrame.splitDirection = splitDir;
        
        const index = parent.children.indexOf(this.dock);
        parent.children[index] = newFrame;
        
        parent.element.insertBefore(newFrame.element, this.dock.element);
        this.dock.element.remove();
        
        if (insertBefore) {
            newFrame.addChild(newDock);
            newFrame.addChild(this.dock);
        } else {
            newFrame.addChild(this.dock);
            newFrame.addChild(newDock);
        }
        
        parent.updateStyles();
    }
}
