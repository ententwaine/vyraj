import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        killboard: resolve(__dirname, 'killboard.html'),
        kill: resolve(__dirname, 'kill.html'),
      }
    }
  }
})
