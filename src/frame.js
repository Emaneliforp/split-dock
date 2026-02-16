import { Dock } from './dock.js';
import { FrameAdjustHandler } from './handles/frame-adjust-handler.js';
import { generateId, CONFIG } from './index.js';

// Frame class - can contain docks or other frames
export class Frame {
    constructor(element, splitDock) {
        this.id = generateId();
        this.splitDock = splitDock;
        this.adjustHandler = new FrameAdjustHandler(this);
        this.parentFrame = null;
        this.children = [];
        this.splitDirection = null;
        
        if (element) {
            this.element = element;
            this.loadChildrenFromHTML();
        } else {
            this.element = document.createElement('div');
            this.element.className = 'sd-frame';
        }
        
        this.adjustHandler.setupResizeHandles();
    }

    loadChildrenFromHTML() {
        this.detectSplitDirection();
        
        this.element.querySelectorAll(':scope > .sd-dock').forEach(el => {
            this.children.push(new Dock(el, this));
        });
        
        this.element.querySelectorAll(':scope > .sd-frame').forEach(el => {
            const frame = new Frame(el, this.splitDock);
            frame.parentFrame = this;
            this.children.push(frame);
        });
    }

    detectSplitDirection() {
        if (this.element.classList.contains('horizontal')) this.splitDirection = 'horizontal';
        else if (this.element.classList.contains('vertical')) this.splitDirection = 'vertical';
    }

    addChild(child) {
        child.parentFrame = this;
        if (child instanceof Dock) child.splitDock = this.splitDock;
        
        this.children.push(child);
        this.element.appendChild(child.element);
        this.updateStyles();
        return child;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index === -1) return;

        this.children.splice(index, 1);
        child.element?.remove();

        if (this.children.length === 1) this.promoteChild();
        else if (this.isEmpty()) this.handleEmptyFrame();
        else {
            this.adjustHandler.redistributeOnRemove(index);
            this.updateStyles();
        }
    }

    promoteChild() {
        this.splitDirection = null;
        this.element.classList.remove('horizontal', 'vertical');
        
        const child = this.children[0];
        child.element.style.flex = '';
        
        if (this.parentFrame) {
            const parentIdx = this.parentFrame.children.indexOf(this);
            if (parentIdx !== -1) {
                this.parentFrame.children[parentIdx] = child;
                child.parentFrame = this.parentFrame;
                if (child instanceof Dock) child.splitDock = this.parentFrame.splitDock;
                
                this.parentFrame.element.insertBefore(child.element, this.element);
                this.element.remove();
                this.children = [];
                this.parentFrame.updateStyles();
            }
        }
    }

    handleEmptyFrame() {
        if (this.parentFrame) this.parentFrame.removeChild(this);
        else this.element.remove();
    }

    isEmpty() { return this.children.length === 0; }

    hasMultipleChildren() { return this.children.length > 1; }

    destroy() {
        this.children.forEach(child => child.destroy());
        this.children = [];
        this.adjustHandler?.destroy();
        this.adjustHandler = null;
        this.parentFrame = null;
        this.splitDock = null;
    }

    updateStyles() {
        this.element.classList.remove('horizontal', 'vertical');
        if (this.splitDirection) this.element.classList.add(this.splitDirection);
        this.adjustHandler.setupResizeHandles();
    }

    splitWithPanel(dock, direction, panel, fromDock) {
        const currentIndex = this.children.indexOf(dock);
        if (currentIndex === -1) return;

        const newDock = new Dock(null, this);
        this.applySplit(dock, direction, newDock, currentIndex);
        fromDock.removePanel(panel, true);
        newDock.addPanel(panel);
    }

    applySplit(dock, direction, newDock, currentIndex) {
        const needsVerticalSplit = direction === 'top' || direction === 'bottom';
        const needsHorizontalSplit = direction === 'left' || direction === 'right';

        if ((needsVerticalSplit && this.splitDirection === 'vertical') ||
            (needsHorizontalSplit && this.splitDirection === 'horizontal')) {
            this.splitIntoExisting(dock, direction, newDock, currentIndex);
        } else if (this.splitDirection === null && this.children.length === 1) {
            this.initializeSplit(direction, newDock, currentIndex);
        } else {
            this.createNestedSplit(dock, direction, newDock);
        }
    }

    splitIntoExisting(dock, direction, newDock, currentIndex) {
        const insertBefore = direction === 'top' || direction === 'left';
        const insertIdx = insertBefore ? currentIndex : currentIndex + 1;

        this.children.splice(insertIdx, 0, newDock);
        const refNode = insertBefore ? dock.element : dock.element.nextSibling;
        this.element.insertBefore(newDock.element, refNode);

        this.updateStyles();
        this.adjustHandler.redistributeOnAdd();
    }

    initializeSplit(direction, newDock, currentIndex) {
        this.splitDirection = (direction === 'top' || direction === 'bottom') ? 'vertical' : 'horizontal';
        this.splitIntoExisting(this.children[0], direction, newDock, currentIndex);
    }

    createNestedSplit(dock, direction, newDock) {
        const currentIndex = this.children.indexOf(dock);
        const splitDirection = (direction === 'top' || direction === 'bottom') ? 'vertical' : 'horizontal';

        const wrapper = new Frame(null, this.splitDock);
        wrapper.splitDirection = splitDirection;
        wrapper.parentFrame = this;

        this.element.insertBefore(wrapper.element, dock.element);
        dock.element.remove();
        this.children[currentIndex] = wrapper;
        dock.parentFrame = wrapper;
        newDock.parentFrame = wrapper;

        const insertBefore = direction === 'top' || direction === 'left';
        wrapper.children = insertBefore ? [newDock, dock] : [dock, newDock];
        wrapper.children.forEach(child => wrapper.element.appendChild(child.element));

        wrapper.updateStyles();
        wrapper.adjustHandler.redistributeOnAdd();
    }
}
