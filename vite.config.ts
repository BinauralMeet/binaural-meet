import { defineConfig } from "vite";
import react from '@vitejs/plugin-react-swc'
import viteTsconfigPaths from 'vite-tsconfig-paths'
import * as fs from 'fs';

const path = require("path");

// These mediapipe files are Closure-Compiler UMD bundles: they assign their API
// (e.g. `Holistic`, `FaceMesh`) onto the global object instead of using real ESM
// `export` syntax, so the browser's module loader sees them as having no exports.
// We patch each by appending genuine `export const X = globalThis.X;` statements
// (globalThis, not a bare `const X = X`, to avoid self-shadowing/TDZ).
const MEDIAPIPE_EXPORT_NAMES: Record<string, string[]> = {
  "camera_utils.js": ["Camera"],
  "drawing_utils.js": ["clamp", "drawLandmarks", "drawConnectors", "drawRectangle", "lerp"],
  "face_mesh.js": ["FaceMesh"],
  "holistic.js": [
    "Holistic", "FACE_GEOMETRY", "FACEMESH_LIPS", "FACEMESH_LEFT_EYE", "FACEMESH_LEFT_EYEBROW",
    "FACEMESH_LEFT_IRIS", "FACEMESH_RIGHT_EYE", "FACEMESH_RIGHT_EYEBROW", "FACEMESH_RIGHT_IRIS",
    "FACEMESH_FACE_OVAL", "FACEMESH_CONTOURS", "FACEMESH_TESSELATION", "HAND_CONNECTIONS",
    "POSE_CONNECTIONS", "POSE_LANDMARKS", "POSE_LANDMARKS_LEFT", "POSE_LANDMARKS_RIGHT",
    "POSE_LANDMARKS_NEUTRAL", "matrixDataToMatrix", "VERSION",
  ],
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      tsDecorators: true,
    }),
    viteTsconfigPaths(),
    mediapipe_workaround(),
  ],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ["ai1.haselab.net"]
  },
  optimizeDeps: {
    // esbuild's dependency pre-bundling doesn't run these files through the
    // load() hook below (it has its own module graph), so pre-bundled copies
    // never get patched. Excluding them routes requests through the normal
    // per-file transform pipeline where mediapipe_workaround() applies.
    exclude: [
      "@mediapipe/camera_utils",
      "@mediapipe/drawing_utils",
      "@mediapipe/face_mesh",
      "@mediapipe/holistic",
    ]
  }
});

function mediapipe_workaround() {
  return {
    name: "mediapipe_workaround",
    load(id: string) {
      // Vite requests these with a `?v=<hash>` cache-busting query, so the
      // filename and the on-disk path must both have it stripped first.
      const filePath = id.split("?")[0]
      const names = MEDIAPIPE_EXPORT_NAMES[path.basename(filePath)]
      if (!names) {
        return null
      }
      let code = fs.readFileSync(filePath, "utf-8")
      for (const name of names) {
        code += `\nexport const ${name} = globalThis.${name};`
      }
      return { code }
    },
  }
}
