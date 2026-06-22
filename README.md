# Angular 3D Floor Dashboard POC

This is a small proof-of-concept for an Angular dashboard with an interactive 3D floor using Three.js.

## Features

- 3D floor and simple walls
- Orbit camera controls
- Click device to select
- Drag selected device on the floor
- Add new device marker
- Fake live status updates: online / offline / alarm
- Status color changes in the 3D scene and side panel

## Run

```bash
npm install
npm start
```

Then open:

```text
http://localhost:4200
```

## Where to customize

Main file:

```text
src/app/components/floor-3d/floor-3d.component.ts
```

You can later replace the manual floor with a real model:

```ts
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
```

Then load a `.glb` model from:

```text
src/assets/models/building.glb
```

## Next step for real AutoCAD / BIM

Recommended production flow:

```text
AutoCAD / Revit / SketchUp
        ↓
Export GLB / GLTF
        ↓
Load inside Angular using Three.js GLTFLoader
        ↓
Add clickable device markers
        ↓
Connect MQTT live device status
```
