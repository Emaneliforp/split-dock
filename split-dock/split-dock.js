// SplitDock Framework - Window hierarchy with drag-to-split functionality
(function(window){
    // Panel class - represents a single panel with title and content
    class Panel {
        constructor(titleElement, contentElement) {
            this.id = Date.now() + Math.random();
            this.dock = null;
            
            // Use existing elements from HTML or create new ones
            if (titleElement && contentElement) {
                this.titleElement = titleElement;
                this.contentElement = contentElement;
                this.title = titleElement.textContent.trim();
                this.content = contentElement.innerHTML;
            } else {
                // Fallback for programmatic creation
                this.title = titleElement || 'New Panel';
                this.content = contentElement || '';
                this.createElements();
            }

            this.setupElements();
        }

        createElements() {
            this.titleElement = document.createElement('div');
            this.titleElement.className = 'sd-panel-title';
            this.titleElement.innerHTML = `
                <span class="sd-panel-title-text">${this.title}</span>
                <span class="sd-panel-close">×</span>
            `;

            this.contentElement = document.createElement('div');
            this.contentElement.className = 'sd-panel-content';
            this.contentElement.innerHTML = this.content;
        }

        setupElements() {
            // Make title draggable and ensure it has close button
            this.titleElement.draggable = true;
            
            if (!this.titleElement.querySelector('.sd-panel-close')) {
                const closeBtn = document.createElement('span');
                closeBtn.className = 'sd-panel-close';
                closeBtn.textContent = '×';
                this.titleElement.appendChild(closeBtn);
            }

            this.setupEventListeners();
        }

        setupEventListeners() {
            this.titleElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('sd-panel-close') && this.dock) {
                    this.dock.setActivePanel(this);
                }
            });

            this.titleElement.querySelector('.sd-panel-close').addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.dock) {
                    this.dock.removePanel(this);
                }
            });

            this.titleElement.addEventListener('dragstart', (e) => this.onDragStart(e));
            this.titleElement.addEventListener('dragend', (e) => this.onDragEnd(e));
        }

        onDragStart(e) {
            if (this.dock && this.dock.getFramework()) {
                this.dock.getFramework().startDragging(this, this.dock);
            }
            this.titleElement.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.titleElement.innerHTML);
        }

        onDragEnd(e) {
            if (this.dock && this.dock.getFramework()) {
                this.dock.getFramework().stopDragging();
            }
            this.titleElement.classList.remove('dragging');
        }

        activate() {
            this.titleElement.classList.add('active');
            this.contentElement.classList.add('active');
        }

        deactivate() {
            this.titleElement.classList.remove('active');
            this.contentElement.classList.remove('active');
        }

        remove() {
            this.titleElement.remove();
            this.contentElement.remove();
            this.dock = null;
        }
    }

    // Dock class - contains panels
    class Dock {
        constructor(element, parentWindow) {
            this.id = Date.now() + Math.random();
            this.parentWindow = parentWindow;
            this.panels = [];
            this.activePanel = null;
            
            // Use existing element from HTML or create new one
            if (element && element.classList.contains('sd-dock')) {
                this.element = element;
                this.findOrCreateSubElements();
                this.loadPanelsFromHTML();
            } else {
                this.createElements();
            }
            
            this.setupEventListeners();
        }

        findOrCreateSubElements() {
            // Find or create navbar
            this.navbar = this.element.querySelector('.sd-dock-navbar');
            if (!this.navbar) {
                this.navbar = document.createElement('div');
                this.navbar.className = 'sd-dock-navbar';
                this.element.insertBefore(this.navbar, this.element.firstChild);
            }

            // Find or create content area
            this.content = this.element.querySelector('.sd-dock-content');
            if (!this.content) {
                this.content = document.createElement('div');
                this.content.className = 'sd-dock-content';
                this.element.appendChild(this.content);
            }

            // Ensure dock class is correct
            if (!this.element.classList.contains('sd-dock')) {
                this.element.classList.add('sd-dock');
            }
        }

        loadPanelsFromHTML() {
            // Find all panel elements in the dock
            const panelElements = Array.from(this.element.querySelectorAll('.sd-panel'));
            
            panelElements.forEach(panelElement => {
                // Extract title and content
                const titleEl = panelElement.querySelector('.sd-panel-title');
                const contentEl = panelElement.querySelector('.sd-panel-content');
                
                if (titleEl && contentEl) {
                    // Remove from DOM temporarily
                    panelElement.remove();
                    
                    // Create Panel instance
                    const panel = new Panel(titleEl, contentEl);
                    this.addPanel(panel);
                }
            });
        }

        createElements() {
            // Create new dock element
            if (!this.element) {
                this.element = document.createElement('div');
            }
            this.element.className = 'sd-dock';

            this.navbar = document.createElement('div');
            this.navbar.className = 'sd-dock-navbar';

            this.content = document.createElement('div');
            this.content.className = 'sd-dock-content';

            this.element.appendChild(this.navbar);
            this.element.appendChild(this.content);
        }

        setupEventListeners() {
            this.element.addEventListener('dragover', (e) => this.onDragOver(e));
            this.element.addEventListener('drop', (e) => this.onDrop(e));
            this.element.addEventListener('dragleave', (e) => this.onDragLeave(e));
        }

        onDragOver(e) {
            const framework = this.getFramework();
            if (framework && framework.draggedPanel) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';

                // Calculate drop zone
                const rect = this.element.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const zone = this.getDropZone(x, y, rect.width, rect.height);

                // Remove all zone classes
                this.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right');
                
                // Add appropriate zone class
                if (zone) {
                    this.element.classList.add(`drop-${zone}`);
                }
            }
        }

        getDropZone(x, y, width, height) {
            // Calculate 30% regions for top, bottom, left, right
            const topThreshold = height * 0.3;
            const bottomThreshold = height * 0.7;
            const leftThreshold = width * 0.3;
            const rightThreshold = width * 0.7;

            // Top 30%
            if (y < topThreshold) return 'top';
            // Bottom 30%
            if (y > bottomThreshold) return 'bottom';
            // Left 30%
            if (x < leftThreshold) return 'left';
            // Right 30%
            if (x > rightThreshold) return 'right';
            // Center
            return 'center';
        }

        onDragLeave(e) {
            const rect = this.element.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX >= rect.right ||
                e.clientY < rect.top || e.clientY >= rect.bottom) {
                this.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right');
            }
        }

        onDrop(e) {
            e.preventDefault();
            e.stopPropagation();

            const framework = this.getFramework();
            if (!framework) return;

            const panel = framework.draggedPanel;
            const fromDock = framework.draggedFromDock;

            if (!panel || !fromDock) return;

            // Calculate drop zone
            const rect = this.element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const zone = this.getDropZone(x, y, rect.width, rect.height);

            // Clear drop indicators
            this.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right');

            if (zone === 'center') {
                // Add panel to this dock
                if (fromDock !== this) {
                    this.acceptPanel(panel, fromDock);
                }
            } else {
                // Don't allow splitting if dragging the only panel from the same dock
                if (fromDock === this && fromDock.panels.length === 1) {
                    return; // Can't split with itself when it's the only panel
                }
                // Create split
                this.createSplit(zone, panel, fromDock);
            }
        }

        createSplit(direction, panel, fromDock) {
            const framework = this.getFramework();
            if (!framework) return;

            // Don't proceed if this would leave the source dock empty and it's the same dock
            if (fromDock === this && fromDock.panels.length === 1) {
                return;
            }

            // Remove panel from source dock
            fromDock.removePanel(panel, true);

            // Create new dock
            const newDock = new Dock(null, null);
            newDock.addPanel(panel);

            // Get current parent window
            const currentParent = this.parentWindow;
            
            if (!currentParent) return;

            // Determine split direction
            let splitDir = (direction === 'left' || direction === 'right') ? 'horizontal' : 'vertical';
            
            // Check if parent window can handle this split
            if (currentParent.children.length === 1 && currentParent.children[0] === this) {
                // Parent only has this dock, we can set its split direction
                currentParent.splitDirection = splitDir;
                currentParent.children = [];
                
                // Add docks in correct order
                if (direction === 'top' || direction === 'left') {
                    currentParent.addChild(newDock);
                    currentParent.addChild(this);
                } else {
                    currentParent.addChild(this);
                    currentParent.addChild(newDock);
                }
            } else if (currentParent.splitDirection === splitDir) {
                // Parent already has same split direction, insert at correct position
                const index = currentParent.children.indexOf(this);
                currentParent.children.splice(direction === 'top' || direction === 'left' ? index : index + 1, 0, newDock);
                newDock.parentWindow = currentParent;
                currentParent.element.insertBefore(newDock.element, direction === 'top' || direction === 'left' ? this.element : this.element.nextSibling);
            } else {
                // Parent has different split direction, create new window
                const newWindow = new WindowInstance(null, framework);
                newWindow.splitDirection = splitDir;
                
                // Replace this dock with new window in parent
                const index = currentParent.children.indexOf(this);
                currentParent.children[index] = newWindow;
                
                // Move this dock's element to new window
                currentParent.element.insertBefore(newWindow.element, this.element);
                this.element.remove();
                
                // Add docks to new window
                if (direction === 'top' || direction === 'left') {
                    newWindow.addChild(newDock);
                    newWindow.addChild(this);
                } else {
                    newWindow.addChild(this);
                    newWindow.addChild(newDock);
                }
            }

            // Update styles
            framework.updateAllStyles();
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
            if (this.panels.length === 0 && this.parentWindow) {
                this.parentWindow.removeChild(this);
            }
        }

        setActivePanel(panel) {
            this.panels.forEach(p => p.deactivate());
            panel.activate();
            this.activePanel = panel;
        }

        remove() {
            this.element.remove();
            this.panels.forEach(panel => panel.dock = null);
            this.panels = [];
            this.parentWindow = null;
        }

        getFramework() {
            if (this.parentWindow) {
                return this.parentWindow.getFramework();
            }
            return null;
        }
    }

    // WindowInstance class - can contain docks or other windows
    class WindowInstance {
        constructor(element, framework) {
            this.id = Date.now() + Math.random();
            this.element = element;
            this.framework = framework;
            this.parentWindow = null;
            this.children = []; // Can contain Dock or WindowInstance
            this.splitDirection = null; // null, 'horizontal', or 'vertical'
            
            if (element) {
                this.loadChildrenFromHTML();
            } else {
                this.createElements();
            }
        }

        createElements() {
            this.element = document.createElement('div');
            this.element.className = 'sd-window';
        }

        loadChildrenFromHTML() {
            // First check for dock elements (if this is a leaf window)
            const dockElements = Array.from(this.element.querySelectorAll(':scope > .sd-dock'));
            
            if (dockElements.length > 0) {
                dockElements.forEach(dockElement => {
                    const dock = new Dock(dockElement, this);
                    this.children.push(dock);
                });

                // Detect split direction from existing docks
                if (this.children.length > 1) {
                    const firstRect = this.children[0].element.getBoundingClientRect();
                    const secondRect = this.children[1].element.getBoundingClientRect();
                    
                    if (Math.abs(firstRect.left - secondRect.left) > Math.abs(firstRect.top - secondRect.top)) {
                        this.splitDirection = 'horizontal';
                        this.element.classList.add('horizontal');
                    } else {
                        this.splitDirection = 'vertical';
                        this.element.classList.add('vertical');
                    }
                }
            } else {
                // Check for nested windows
                const windowElements = Array.from(this.element.querySelectorAll(':scope > .sd-window'));
                
                windowElements.forEach(winElement => {
                    const childWindow = new WindowInstance(winElement, this.framework);
                    childWindow.parentWindow = this;
                    this.children.push(childWindow);
                });

                // Detect split direction
                if (this.children.length > 1) {
                    const firstRect = this.children[0].element.getBoundingClientRect();
                    const secondRect = this.children[1].element.getBoundingClientRect();
                    
                    if (Math.abs(firstRect.left - secondRect.left) > Math.abs(firstRect.top - secondRect.top)) {
                        this.splitDirection = 'horizontal';
                        this.element.classList.add('horizontal');
                    } else {
                        this.splitDirection = 'vertical';
                        this.element.classList.add('vertical');
                    }
                }
            }
        }

        addChild(child) {
            if (child instanceof Dock) {
                child.parentWindow = this;
            } else if (child instanceof WindowInstance) {
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
                        } else if (remainingChild instanceof WindowInstance) {
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
                } else if (child instanceof WindowInstance) {
                    child.parentWindow = null;
                }
            });
            this.children = [];
        }

        getFramework() {
            return this.framework || (this.parentWindow ? this.parentWindow.getFramework() : null);
        }
    }

    // Main framework
    class SplitDock {
        constructor() {
            this.rootWindows = [];
            this.draggedPanel = null;
            this.draggedFromDock = null;
            this.dragGhost = null;
        }

        // Initialize framework by loading window elements from HTML
        initialize() {
            const windowElements = document.querySelectorAll('.app > .sd-window');
            
            windowElements.forEach(element => {
                const win = new WindowInstance(element, this);
                this.rootWindows.push(win);
            });

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
                    } else if (child instanceof WindowInstance) {
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
                    if (child instanceof WindowInstance) {
                        traverse(child);
                    }
                });
            };

            this.rootWindows.forEach(win => traverse(win));
        }
    }

    window.SplitDock = SplitDock;
    window.SplitDockPanel = Panel;
    window.SplitDockDock = Dock;
    window.SplitDockWindow = WindowInstance;

    // Auto-initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const framework = new SplitDock();
        framework.initialize();
        window.splitDock = framework;
    });
})(window);
