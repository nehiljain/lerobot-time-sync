import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = import.meta.dirname;

// BASE_PATH is set by the GitHub Pages workflow (/lerobot-time-sync/). Local dev serves from /.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: {
        lerobot: resolve(root, 'index.html'),
        rosbag: resolve(root, 'rosbag/index.html'),
        mcap: resolve(root, 'mcap/index.html'),
        formats: resolve(root, 'formats/index.html'),
      },
    },
  },
});
