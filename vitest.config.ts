import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import viteTsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react({
      tsDecorators: true,
    }),
    viteTsconfigPaths(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
