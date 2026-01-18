import { Panel } from './panel.js';
import { Frame } from './frame.js';

// Dock class - contains panels
export class Dock {
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
        
        // Navbar specific drag events for tab reordering
        this.navbar.addEventListener('dragover', (e) => this.onNavbarDragOver(e));
        this.navbar.addEventListener('drop', (e) => this.onNavbarDrop(e));
        this.navbar.addEventListener('dragleave', (e) => this.onNavbarDragLeave(e));
    }

    onDragOver(e) {
        const framework = this.getFramework();
        if (framework && framework.draggedPanel) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';

            // Clear previous dock's indicators if switching to a new dock
            if (framework.currentHoverDock && framework.currentHoverDock !== this) {
                framework.currentHoverDock.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');
            }
            framework.currentHoverDock = this;

            // Check if hovering over navbar
            const navbarRect = this.navbar.getBoundingClientRect();
            const isOverNavbar = (
                e.clientX >= navbarRect.left &&
                e.clientX <= navbarRect.right &&
                e.clientY >= navbarRect.top &&
                e.clientY <= navbarRect.bottom
            );

            // Remove all zone classes
            this.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');

            if (isOverNavbar) {
                // Highlight navbar for drop
                this.element.classList.add('drop-navbar');
            } else {
                // Calculate drop zone
                const rect = this.element.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const zone = this.getDropZone(x, y, rect.width, rect.height);
                
                // Add appropriate zone class
                if (zone) {
                    this.element.classList.add(`drop-${zone}`);
                }
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
            this.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');
        }
    }

    onNavbarDragLeave(e) {
        const navbarRect = this.navbar.getBoundingClientRect();
        if (e.clientX < navbarRect.left || e.clientX >= navbarRect.right ||
            e.clientY < navbarRect.top || e.clientY >= navbarRect.bottom) {
            // Clear drop indicators from all tabs
            const titleElements = Array.from(this.navbar.querySelectorAll('.sd-panel-title'));
            titleElements.forEach(el => el.classList.remove('drop-before', 'drop-after'));
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

        // Check if dropped on navbar
        const navbarRect = this.navbar.getBoundingClientRect();
        const isOverNavbar = (
            e.clientX >= navbarRect.left &&
            e.clientX <= navbarRect.right &&
            e.clientY >= navbarRect.top &&
            e.clientY <= navbarRect.bottom
        );

        // Clear drop indicators
        this.element.classList.remove('drop-center', 'drop-top', 'drop-bottom', 'drop-left', 'drop-right', 'drop-navbar');

        if (isOverNavbar) {
            // Add panel to this dock
            if (fromDock !== this) {
                this.acceptPanel(panel, fromDock);
            }
        } else {
            // Calculate drop zone for splits
            const rect = this.element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const zone = this.getDropZone(x, y, rect.width, rect.height);

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
            const newWindow = new Frame(null, framework);
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

    onNavbarDragOver(e) {
        const framework = this.getFramework();
        if (!framework || !framework.draggedPanel) return;
        
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        // Clear tab indicators from previous dock if switching
        if (framework.currentHoverDock && framework.currentHoverDock !== this) {
            const prevTitleElements = Array.from(framework.currentHoverDock.navbar.querySelectorAll('.sd-panel-title'));
            prevTitleElements.forEach(el => el.classList.remove('drop-before', 'drop-after'));
        }
        
        // Find which panel title is being hovered over
        const titleElements = Array.from(this.navbar.querySelectorAll('.sd-panel-title:not(.dragging)'));
        
        // Remove all drop markers
        titleElements.forEach(el => el.classList.remove('drop-before', 'drop-after'));
        
        if (titleElements.length === 0) return;
        
        // Check if cursor is before first tab or after last tab
        const firstTab = titleElements[0];
        const lastTab = titleElements[titleElements.length - 1];
        const firstRect = firstTab.getBoundingClientRect();
        const lastRect = lastTab.getBoundingClientRect();
        
        // If cursor is to the left of all tabs
        if (e.clientX < firstRect.left) {
            firstTab.classList.add('drop-before');
            return;
        }
        
        // If cursor is to the right of all tabs
        if (e.clientX > lastRect.right) {
            lastTab.classList.add('drop-after');
            return;
        }
        
        // Find which panel title is being hovered over
        const hoveredTitle = titleElements.find(el => {
            const rect = el.getBoundingClientRect();
            return e.clientX >= rect.left && e.clientX <= rect.right;
        });
        
        if (hoveredTitle) {
            const rect = hoveredTitle.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            
            // Add visual indicator based on position
            if (e.clientX < midpoint) {
                hoveredTitle.classList.add('drop-before');
            } else {
                hoveredTitle.classList.add('drop-after');
            }
        }
    }

    onNavbarDrop(e) {
        const framework = this.getFramework();
        if (!framework || !framework.draggedPanel) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const panel = framework.draggedPanel;
        const fromDock = framework.draggedFromDock;
        
        // Find which panel title was dropped on
        const titleElements = Array.from(this.navbar.querySelectorAll('.sd-panel-title:not(.dragging)'));
        
        // Clear all drop markers
        titleElements.forEach(el => el.classList.remove('drop-before', 'drop-after'));
        
        if (titleElements.length === 0) {
            // No tabs, just add the panel
            if (fromDock !== this) {
                this.acceptPanel(panel, fromDock);
            }
            return;
        }
        
        // Check if cursor is before first tab or after last tab
        const firstTab = titleElements[0];
        const lastTab = titleElements[titleElements.length - 1];
        const firstRect = firstTab.getBoundingClientRect();
        const lastRect = lastTab.getBoundingClientRect();
        
        let targetPanel = null;
        let insertBefore = true;
        
        // If cursor is to the left of all tabs, insert at beginning
        if (e.clientX < firstRect.left) {
            targetPanel = this.panels.find(p => p.titleElement === firstTab);
            insertBefore = true;
        }
        // If cursor is to the right of all tabs, insert at end
        else if (e.clientX > lastRect.right) {
            targetPanel = this.panels.find(p => p.titleElement === lastTab);
            insertBefore = false;
        }
        // Find which tab is being hovered over
        else {
            const hoveredTitle = titleElements.find(el => {
                const rect = el.getBoundingClientRect();
                return e.clientX >= rect.left && e.clientX <= rect.right;
            });
            
            if (hoveredTitle) {
                targetPanel = this.panels.find(p => p.titleElement === hoveredTitle);
                const rect = hoveredTitle.getBoundingClientRect();
                const midpoint = rect.left + rect.width / 2;
                insertBefore = e.clientX < midpoint;
            }
        }
        
        if (targetPanel) { 
            // Remove panel from source dock
            if (fromDock === this) {
                // Reordering within same dock
                const oldIndex = this.panels.indexOf(panel);
                const newIndex = this.panels.indexOf(targetPanel);
                
                if (oldIndex !== newIndex) {
                    // Remove from current position
                    this.panels.splice(oldIndex, 1);
                    
                    // Calculate adjusted index
                    const adjustedIndex = oldIndex < newIndex ? newIndex : newIndex + (insertBefore ? 0 : 1);
                    
                    // Insert at new position
                    this.panels.splice(insertBefore ? newIndex : adjustedIndex, 0, panel);
                    
                    // Update DOM
                    if (insertBefore) {
                        this.navbar.insertBefore(panel.titleElement, targetPanel.titleElement);
                    } else {
                        this.navbar.insertBefore(panel.titleElement, targetPanel.titleElement.nextSibling);
                    }
                }
            } else {
                // Moving from different dock
                fromDock.removePanel(panel, true);
                
                const targetIndex = this.panels.indexOf(targetPanel);
                const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
                
                // Insert panel at specific position
                panel.dock = this;
                this.panels.splice(insertIndex, 0, panel);
                this.content.appendChild(panel.contentElement);
                
                // Insert title at correct position
                if (insertBefore) {
                    this.navbar.insertBefore(panel.titleElement, targetPanel.titleElement);
                } else {
                    this.navbar.insertBefore(panel.titleElement, targetPanel.titleElement.nextSibling);
                }
                
                this.setActivePanel(panel);
            }
        } else {
            // Dropped on empty space in navbar, add to end
            if (fromDock !== this) {
                this.acceptPanel(panel, fromDock);
            }
        }
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
