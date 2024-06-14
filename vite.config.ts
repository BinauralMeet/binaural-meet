import { defineConfig } from "vite";
import react from '@vitejs/plugin-react-swc'
import viteTsconfigPaths from 'vite-tsconfig-paths'
import { mediapipe } from 'vite-plugin-mediapipe';
import * as fs from 'fs';

const path = require("path");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      tsDecorators: true,
    }),
    viteTsconfigPaths(),
    mediapipe(),
    mediapipe_workaround(),
  ],
  server: {
    port: 3000
  }
});

function mediapipe_workaround() {
  return {
    name: "mediapipe_workaround",
    load(id) {
      if (path.basename(id) === "face_mesh.js") {
        let code = fs.readFileSync(id, "utf-8")
        code += "exports.FaceMesh = FaceMesh;"
        return { code }
      } else {
        return null
      }
    },
  }
}
