import { defineConfig } from 'tsup';

import { config } from '@store/tsup-config';

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
