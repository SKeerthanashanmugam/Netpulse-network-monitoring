import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  plugins:[react()],
  resolve:{alias:{'@':root}},
  server:{host:'127.0.0.1',port:5173,proxy:{'/api':{target:'http://127.0.0.1:'+ (process.env.NETPULSE_API_PORT || 3001),changeOrigin:false}}},
});
