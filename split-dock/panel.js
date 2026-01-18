// Panel class - represents a single panel with title and content
export class Panel {
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
