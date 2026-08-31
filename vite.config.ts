import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules\/(react|react-dom|scheduler)\// },
            { name: 'supabase', test: /node_modules\/@supabase\// },
            { name: 'drag-and-drop', test: /node_modules\/@dnd-kit\// },
            { name: 'icons', test: /node_modules\/lucide-react\// },
          ],
        },
      },
    },
  },
})
