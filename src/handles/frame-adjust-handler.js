export class FrameAdjustHandler {
    constructor(frame) {
        this.frame = frame;
        this.handles = [];
        this.handleListeners = [];
    }

    destroy() {
        // Remove all resize handles from DOM
        this.handles.forEach(handle => {
            if (handle && handle.parentNode) {
                handle.remove();
            }
        });
        
        // Clear arrays
        this.handles = [];
        this.handleListeners = [];
        
        // Clear frame reference
        this.frame = null;
    }

    setupResizeHandles() {
        // Clear existing handles
        this.handles.forEach(handle => handle.remove());
        this.handles = [];

        // Only add resize handles if we have a split direction and multiple children
        if (!this.frame.splitDirection || this.frame.children.length < 2) {
            return;
        }

        // Insert resize handles between children
        for (let i = 0; i < this.frame.children.length - 1; i++) {
            const handle = document.createElement('div');
            handle.className = `sd-resize-handle ${this.frame.splitDirection}`;
            
            // Store indices for resize
            handle.dataset.leftIndex = i;
            handle.dataset.rightIndex = i + 1;
            
            // Insert handle after the current child
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

        const minSize = 100; // Minimum size in pixels

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
            
            // Add visual feedback
            handle.style.background = '#1e88e5';
            document.body.style.cursor = this.frame.splitDirection === 'horizontal' ? 'col-resize' : 'row-resize';
        };

        const onMouseMove = (e) => {
            if (!leftChild || !rightChild) return;

            const currentPos = this.frame.splitDirection === 'horizontal' ? e.clientX : e.clientY;
            const delta = currentPos - startPos;

            const newLeftSize = leftStartSize + delta;
            const newRightSize = rightStartSize - delta;

            // Enforce minimum sizes
            if (newLeftSize >= minSize && newRightSize >= minSize) {
                // Calculate flex values relative to the entire container
                const leftFlex = newLeftSize / containerSize;
                const rightFlex = newRightSize / containerSize;

                leftChild.element.style.flex = `${leftFlex} 1 0px`;
                rightChild.element.style.flex = `${rightFlex} 1 0px`;
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // Remove visual feedback
            handle.style.background = '';
            document.body.style.cursor = '';
        };

        handle.addEventListener('mousedown', onMouseDown);
    }
}
