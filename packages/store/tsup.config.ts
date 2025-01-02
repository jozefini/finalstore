import { config } from '@finalstore/tsup-config';
import { defineConfig } from 'tsup';

export default defineConfig((opts) => ({
  ...config,
  entry: ['./src/index.tsx'],
  clean: !opts.watch,
  splitting: false,
  sourcemap: true,
  minify: true,
  dts: true,
  external: ['react']
}));
