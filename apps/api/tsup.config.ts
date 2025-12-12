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
  // Externaliser toutes les dépendances node_modules - ne pas bundler
  external: [
    '@prisma/client',
    '@plumenote/database',
    '@plumenote/types',
    '@fastify/cookie',
    '@fastify/cors',
    '@fastify/helmet',
    '@fastify/jwt',
    '@fastify/multipart',
    '@fastify/rate-limit',
    '@fastify/sensible',
    '@fastify/swagger',
    '@fastify/swagger-ui',
    '@fastify/websocket',
    'archiver',
    'bcrypt',
    'dotenv',
    'fastify',
    'fastify-plugin',
    'ioredis',
    'ldapjs',
    'pino',
    'pino-pretty',
    'sharp',
    'unzipper',
    'zod',
  ],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
