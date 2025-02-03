import { defineConfig } from 'tsup'

export default defineConfig((options) => ({
  treeshake: true,
  splitting: false,
  entry: ['packages'],
  format: ['esm', 'cjs'],
  clean: true,
  sourcemap: true,
  dts: true,
  minify: true,
  external: [
    'openai',
    'url',
    'querystring',
    'http',
    'https',
    'zlib',
    'stream',
    'buffer',
    'util',
    'tty',
    'os'
  ],
  noExternal: ['./packages/**'],
  platform: 'node',
  ...options,
}))