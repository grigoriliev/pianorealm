import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const version: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

export default defineConfig(({ mode }) => {
  const minified = mode === 'standalone-min';
  const standalone = mode === 'standalone' || minified;
  return {
    define: standalone ? { __PIANOREALM_KEYBOARD_VERSION__: JSON.stringify(version) } : {},
    build: {
      target: 'es2022',
      lib: {
        entry: standalone ? 'src/standalone.ts' : 'src/index.ts',
        name: 'PianorealmKeyboard', // Vite requires a name for IIFE output; the entry has no exports.
        formats: [standalone ? 'iife' : 'es'],
        fileName: () => standalone
          ? `pianorealm-keyboard.umd${minified ? '.min' : ''}.js`
          : 'pianorealm-keyboard.esm.js',
      },
      ...(standalone ? { minify: minified } : {}),
      emptyOutDir: !standalone,
      sourcemap: true,
    },
  };
});
