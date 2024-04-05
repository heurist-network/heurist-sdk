import { defineConfig } from 'tsup'

export default defineConfig((options) => ({
  treeshake: true,
  splitting: true,
  entry: ['packages'],
  format: ['esm'],
  clean: true,
  dts: true,
  minify: true,
  ...options,
}))
