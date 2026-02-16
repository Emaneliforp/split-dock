# split-dock

A lightweight docking framework for split-view layouts with drag-and-drop panel management.

## Installation

```bash
npm install split-dock
```

Or use via CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/split-dock/src/style.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/split-dock/src/index.js"></script>
```

## Usage

Create an HTML structure with the following classes:

```html
<div id="app" class="sd-frame horizontal">
    <div class="sd-dock">
        <div class="sd-panel">
            <div class="sd-panel-title">Panel 1</div>
            <div class="sd-panel-content">
                <p>Your content here</p>
            </div>
        </div>
    </div>
</div>
```

The framework auto-initializes on page load.

### Classes

- **`sd-frame`**: Container for docks or nested frames. Add `horizontal` or `vertical` for split direction.
- **`sd-dock`**: Panel container with tab navigation.
- **`sd-panel`**: Individual panel with title and content.
- **`sd-panel-title`**: Panel tab title.
- **`sd-panel-content`**: Panel content area.

### Features

- Drag panels to dock edges to create splits
- Drag tabs to reorder within or between docks
- Resize panes with handles
- Empty docks auto-removed

## Configuration

Modify constants in `CONFIG` object:

```javascript
import { CONFIG } from 'split-dock';

CONFIG.layout.minPaneSize = 150;        // Minimum pane size (px)
CONFIG.layout.dropZoneRatio = 0.25;     // Drop zone edge ratio
CONFIG.layout.dragGhostOffset = 15;     // Drag ghost offset (px)
CONFIG.layout.defaultFlexBasis = '1 1 0px';
```

## License

MIT
