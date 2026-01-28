import { Dock } from './dock.js';
import { FrameAdjustHandler } from './handles/frame-adjust-handler.js';
import { generateId } from './index.js';

// Frame class - can contain docks or other frames
export class Frame {
    constructor(element, splitDock) {
        this.id = generateId();
        this.element = element;
        this.splitDock = splitDock;
        this.adjustHandler = new FrameAdjustHandler(this);
        this.parentFrame = null;
        this.children = []; // Can contain Dock or Frame
        this.splitDirection = null; // null, 'horizontal', or 'vertical'
        
        if (element) {
            this.loadChildrenFromHTML();
        } else {
            this.createElements();
        }
        
        this.adjustHandler.setupResizeHandles();
    }

    createElements() {
        this.element = document.createElement('div');
        this.element.className = 'sd-frame';
    }

    loadChildrenFromHTML() {
        // Detect split direction from existing classes
        if (this.element.classList.contains('horizontal')) {
            this.splitDirection = 'horizontal';
        } else if (this.element.classList.contains('vertical')) {
            this.splitDirection = 'vertical';
        }

        // First check for dock elements (if this is a leaf window)
        const dockElements = Array.from(this.element.querySelectorAll(':scope > .sd-dock'));
        
        if (dockElements.length > 0) {
            // If there are multiple docks, wrap each in its own frame
            if (dockElements.length > 1 && this.splitDirection) {
                dockElements.forEach(dockElement => {
                    // Create a wrapper frame for each dock
                    const frameWrapper = document.createElement('div');
                    frameWrapper.className = 'sd-frame';
                    
                    // Insert wrapper before the dock
                    dockElement.parentNode.insertBefore(frameWrapper, dockElement);
                    // Move dock into wrapper
                    frameWrapper.appendChild(dockElement);
                    
                    // Create Frame instance for wrapper
                    const childFrame = new Frame(frameWrapper, this.splitDock);
                    childFrame.parentFrame = this;
                    this.children.push(childFrame);
                });
            } else {
                // Single dock, add directly
                dockElements.forEach(dockElement => {
                    const dock = new Dock(dockElement, this);
                    this.children.push(dock);
                });
            }
        } else {
            // Check for nested frames
            const windowElements = Array.from(this.element.querySelectorAll(':scope > .sd-frame'));
            
            windowElements.forEach(winElement => {
                const childWindow = new Frame(winElement, this.splitDock);
                childWindow.parentFrame = this;
                this.children.push(childWindow);
            });
        }
    }

    addChild(child) {
        if (child instanceof Dock) {
            child.parentFrame = this;
            child.splitDock = this.splitDock;
        } else if (child instanceof Frame) {
            child.parentFrame = this;
        }
        
        this.children.push(child);
        this.element.appendChild(child.element);
        
        // Update styles after adding a child
        this.updateStyles();
        
        return child;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index === -1) return;

        child.remove();
        this.children.splice(index, 1);

        // Clean up if only one child left - promote the child
        if (this.children.length === 1) {
            this.splitDirection = null;
            this.element.classList.remove('horizontal', 'vertical');
            
            const remainingChild = this.children[0];
            
            // Reset flex style to fill available space
            remainingChild.element.style.flex = '';
            
            // If this window has a parent, we should promote the remaining child
            if (this.parentFrame) {
                const parentIndex = this.parentFrame.children.indexOf(this);
                
                if (parentIndex !== -1) {
                    // Replace this window with the remaining child in parent
                    this.parentFrame.children[parentIndex] = remainingChild;
                    
                    // Update parent reference
                    if (remainingChild instanceof Dock) {
                        remainingChild.parentFrame = this.parentFrame;
                        remainingChild.splitDock = this.parentFrame.splitDock;
                    } else if (remainingChild instanceof Frame) {
                        remainingChild.parentFrame = this.parentFrame;
                    }
                    
                    // Move the child element to parent and remove this window
                    this.parentFrame.element.insertBefore(remainingChild.element, this.element);
                    this.element.remove();
                    this.children = [];
                }
            }
        }

        // If no children and has parent, remove self
        if (this.children.length === 0) {
            if (this.parentFrame) {
                this.parentFrame.removeChild(this);
            } else {
                // Root window with no children, just remove the element
                this.element.remove();
            }
        }
        
        // Update styles after removing a child
        this.updateStyles();
    }

    remove() {
        this.destroy();
        this.element.remove();
    }

    destroy() {
        // Destroy all children
        this.children.forEach(child => {
            if (child instanceof Dock || child instanceof Frame) {
                child.destroy();
            }
        });
        this.children = [];

        // Cleanup adjust handler
        if (this.adjustHandler) {
            this.adjustHandler.destroy();
            this.adjustHandler = null;
        }

        // Clear references
        this.parentFrame = null;
        this.splitDock = null;
    }

    updateStyles() {
        // Update split direction classes
        if (this.splitDirection) {
            this.element.classList.remove('horizontal', 'vertical');
            this.element.classList.add(this.splitDirection);
        } else {
            this.element.classList.remove('horizontal', 'vertical');
        }

        // Update resize handles
        this.adjustHandler.setupResizeHandles();
    }


}
