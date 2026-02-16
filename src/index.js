import { Panel } from './panel.js';
import { Dock } from './dock.js';
import { Frame } from './frame.js';

// Configuration constants
export const CONFIG = {
    // Layout constants
    layout: {
        minPaneSize: 100,           // Minimum size in pixels for a pane
        dropZoneRatio: 0.33,        // 33% of edge is drop zone
        dragGhostOffset: 10,        // Offset in pixels for drag ghost
        defaultFlexBasis: '1 1 0px' // Default flex basis for splits
    },
};

let idCounter = 0;
export function generateId() {
    return `sd-${Date.now()}-${++idCounter}`;
}

export class SplitDock {
    constructor() {
        this.rootFrames = [];
        this.dragDropHandler = null;
    }

    initialize() {
        const rootElements = document.querySelectorAll('.sd-frame');
        rootElements.forEach(rootElement => {
            const rootFrame = new Frame(rootElement, this);
            this.rootFrames.push(rootFrame);
        });
        return this;
    }

    destroy() {
        this.rootFrames.forEach(frame => frame.destroy());
        this.rootFrames = [];
        this.dragDropHandler = null;
    }
}

window.SplitDock = SplitDock;
window.SdPanel = Panel;
window.SdDock = Dock;
window.SdFrame = Frame;

document.addEventListener('DOMContentLoaded', () => {
    const framework = new SplitDock();
    framework.initialize();
    window.splitDock = framework;
});
