import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseado no modo atual (development/production)
  const env = loadEnv(mode, '.', '');
  
  return {
    base: './', // Define caminhos relativos para garantir que funcione no GitHub Pages
    plugins: [react()],
    define: {
      // Garante que process.env.API_KEY funcione no navegador
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      host: true, // Expõe para rede local se necessário
      port: 3000,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  };
});