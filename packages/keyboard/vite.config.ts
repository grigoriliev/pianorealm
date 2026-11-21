import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'pianorealm-keyboard.esm.js',
    },
    sourcemap: true,
  },
});
