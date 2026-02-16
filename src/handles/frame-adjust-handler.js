import { CONFIG } from '../index.js';

export class FrameAdjustHandler {
    constructor(frame) {
        this.frame = frame;
        this.handles = [];
        this.handleListeners = [];
        this.dockSizes = []; // Stores relative sizes for each child dock/frame
    }

    destroy() {
        this.handles.forEach(handle => {
            if (handle && handle.parentNode) handle.remove();
            
        });
        
        this.handles = [];
        this.handleListeners = [];
        this.dockSizes = [];
        this.frame = null;
    }

    setupResizeHandles() {
        this.handles.forEach(handle => handle.remove());
        this.handles = [];

        if (!this.frame.splitDirection || this.frame.children.length < 2) {
            this.dockSizes = [];
            return;
        }

        // Initialize dock sizes from current flex values
        this.updateDockSizesFromDOM();

        for (let i = 0; i < this.frame.children.length - 1; i++) {
            const handle = document.createElement('div');
            handle.className = `sd-resize-handle ${this.frame.splitDirection}`;
            
            handle.dataset.leftIndex = i;
            handle.dataset.rightIndex = i + 1;
            
            const currentChild = this.frame.children[i].element;
            currentChild.parentNode.insertBefore(handle, currentChild.nextSibling);
            
            this.handles.push(handle);
            this.setupResizeListener(handle, i, i + 1);
        }
    }

    setupResizeListener(handle, leftIndex, rightIndex) {
        let startPos = 0;
        let leftStartSize = 0;
        let rightStartSize = 0;
        let leftChild = null;
        let rightChild = null;
        let containerSize = 0;

        const minSize = CONFIG.layout.minPaneSize;

        const onMouseDown = (e) => {
            e.preventDefault();
            
            leftChild = this.frame.children[leftIndex];
            rightChild = this.frame.children[rightIndex];
            
            if (!leftChild || !rightChild) return;

            startPos = this.frame.splitDirection === 'horizontal' ? e.clientX : e.clientY;
            
            const leftRect = leftChild.element.getBoundingClientRect();
            const rightRect = rightChild.element.getBoundingClientRect();
            const containerRect = this.frame.element.getBoundingClientRect();
            
            leftStartSize = this.frame.splitDirection === 'horizontal' ? leftRect.width : leftRect.height;
            rightStartSize = this.frame.splitDirection === 'horizontal' ? rightRect.width : rightRect.height;
            containerSize = this.frame.splitDirection === 'horizontal' ? containerRect.width : containerRect.height;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            handle.style.background = '#1e88e5';
            document.body.style.cursor = this.frame.splitDirection === 'horizontal' ? 'col-resize' : 'row-resize';
        };

        const onMouseMove = (e) => {
            if (!leftChild || !rightChild) return;

            const currentPos = this.frame.splitDirection === 'horizontal' ? e.clientX : e.clientY;
            const delta = currentPos - startPos;

            const newLeftSize = leftStartSize + delta;
            const newRightSize = rightStartSize - delta;

            if (newLeftSize >= minSize && newRightSize >= minSize) {
                const leftFlex = newLeftSize / containerSize;
                const rightFlex = newRightSize / containerSize;

                leftChild.element.style.flex = `${leftFlex} 1 0px`;
                rightChild.element.style.flex = `${rightFlex} 1 0px`;
                
                // Update stored dock sizes
                this.dockSizes[leftIndex] = leftFlex;
                this.dockSizes[rightIndex] = rightFlex;
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            handle.style.background = '';
            document.body.style.cursor = '';
            
            // Normalize dock sizes after resize to ensure they sum to 1
            this.normalizeDockSizes();
        };

        handle.addEventListener('mousedown', onMouseDown);
    }

    // Get current dock sizes from DOM flex values
    updateDockSizesFromDOM() {
        if (this.frame.children.length === 0) {
            this.dockSizes = [];
            return;
        }

        const sizes = this.frame.children.map(child => {
            const flex = child.element.style.flex;
            if (flex) {
                const flexGrow = parseFloat(flex.split(' ')[0]);
                return isNaN(flexGrow) ? 1 : flexGrow;
            }
            return 1;
        });

        const total = sizes.reduce((sum, size) => sum + size, 0);
        this.dockSizes = sizes.map(size => size / total);
    }

    // Apply stored dock sizes to DOM elements
    applyDockSizes() {
        if (this.dockSizes.length !== this.frame.children.length) {
            return;
        }

        this.frame.children.forEach((child, i) => {
            child.element.style.flex = `${this.dockSizes[i]} 1 0px`;
        });
    }

    // Normalize dock sizes to sum to 1.0
    normalizeDockSizes() {
        if (this.dockSizes.length === 0) return;

        const total = this.dockSizes.reduce((sum, size) => sum + size, 0);
        if (total > 0) {
            this.dockSizes = this.dockSizes.map(size => size / total);
            this.applyDockSizes();
        }
    }

    // Redistribute space evenly among all docks
    redistributeEvenly() {
        const count = this.frame.children.length;
        if (count === 0) {
            this.dockSizes = [];
            return;
        }

        const evenSize = 1 / count;
        this.dockSizes = new Array(count).fill(evenSize);
        this.applyDockSizes();
    }

    // Redistribute space when a dock is removed (evenly)
    redistributeOnRemove(removedIndex) {
        if (this.dockSizes.length === 0 || removedIndex >= this.dockSizes.length) {
            return;
        }

        this.dockSizes.splice(removedIndex, 1);

        if (this.dockSizes.length === 0) {
            return;
        }

        // Redistribute evenly among remaining docks
        this.redistributeEvenly();
    }

    // Redistribute space when a dock is added (evenly)
    redistributeOnAdd() {
        this.redistributeEvenly();
    }
}
