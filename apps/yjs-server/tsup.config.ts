import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  // Externaliser toutes les dépendances node_modules
  external: [
    '@prisma/client',
    '@plumenote/database',
    '@plumenote/types',
    '@hocuspocus/server',
    '@hocuspocus/extension-database',
    '@hocuspocus/extension-logger',
    '@hocuspocus/extension-throttle',
    'dotenv',
    'jsonwebtoken',
    'yjs',
    'y-protocols',
  ],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
