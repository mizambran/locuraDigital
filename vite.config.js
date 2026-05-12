import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Importamos el plugin que acabás de instalar
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [
    react(), 
    cesium() // Lo agregamos a la lista de plugins
  ],
})