import { CONFIG } from '../index.js';

export class FrameAdjustHandler {
    constructor(frame) {
        this.frame = frame;
        this.handles = [];
        this.handleListeners = [];
    }

    destroy() {
        this.handles.forEach(handle => {
            if (handle && handle.parentNode) handle.remove();
            
        });
        
        this.handles = [];
        this.handleListeners = [];
        this.frame = null;
    }

    setupResizeHandles() {
        this.handles.forEach(handle => handle.remove());
        this.handles = [];

        if (!this.frame.splitDirection || this.frame.children.length < 2) {
            return;
        }

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
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            handle.style.background = '';
            document.body.style.cursor = '';
        };

        handle.addEventListener('mousedown', onMouseDown);
    }
}
