import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/lay-out-levels/',
  plugins: [react()],
})
