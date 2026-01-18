import { Dock } from './dock.js';

// Frame class - can contain docks or other frames
export class Frame {
    constructor(element, framework) {
        this.id = Date.now() + Math.random();
        this.element = element;
        this.framework = framework;
        this.parentWindow = null;
        this.children = []; // Can contain Dock or Frame
        this.splitDirection = null; // null, 'horizontal', or 'vertical'
        
        if (element) {
            this.loadChildrenFromHTML();
        } else {
            this.createElements();
        }
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
                    const childFrame = new Frame(frameWrapper, this.framework);
                    childFrame.parentWindow = this;
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
                const childWindow = new Frame(winElement, this.framework);
                childWindow.parentWindow = this;
                this.children.push(childWindow);
            });
        }
    }

    addChild(child) {
        if (child instanceof Dock) {
            child.parentWindow = this;
        } else if (child instanceof Frame) {
            child.parentWindow = this;
        }
        
        this.children.push(child);
        this.element.appendChild(child.element);
        
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
            
            // If this window has a parent, we should promote the remaining child
            if (this.parentWindow) {
                const remainingChild = this.children[0];
                const parentIndex = this.parentWindow.children.indexOf(this);
                
                if (parentIndex !== -1) {
                    // Replace this window with the remaining child in parent
                    this.parentWindow.children[parentIndex] = remainingChild;
                    
                    // Update parent reference
                    if (remainingChild instanceof Dock) {
                        remainingChild.parentWindow = this.parentWindow;
                    } else if (remainingChild instanceof Frame) {
                        remainingChild.parentWindow = this.parentWindow;
                    }
                    
                    // Move the child element to parent and remove this window
                    this.parentWindow.element.insertBefore(remainingChild.element, this.element);
                    this.element.remove();
                    this.children = [];
                }
            }
        }

        // If no children and has parent, remove self
        if (this.children.length === 0) {
            if (this.parentWindow) {
                this.parentWindow.removeChild(this);
            } else {
                // Root window with no children, just remove the element
                this.element.remove();
            }
        }
    }

    remove() {
        this.element.remove();
        this.children.forEach(child => {
            if (child instanceof Dock) {
                child.parentWindow = null;
            } else if (child instanceof Frame) {
                child.parentWindow = null;
            }
        });
        this.children = [];
    }

    getFramework() {
        return this.framework || (this.parentWindow ? this.parentWindow.getFramework() : null);
    }
}
