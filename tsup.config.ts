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
  ...options,
}))
