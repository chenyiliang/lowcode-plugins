import { isAbsolute } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      insertTypesEntry: true,
      // dev-config / index.dev 是旧 build-scripts 的调试脚手架，不参与产物与类型生成
      exclude: ['src/dev-config/**', 'src/index.dev.tsx'],
    }),
  ],
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'index.mjs' : 'index.cjs'),
    },
    rollupOptions: {
      // 库模式：所有裸导入（依赖 / peer / workspace 包）都 external，交给消费方解析。
      // monaco-editor 运行时由 @monaco-editor/loader 从 CDN 拉取，不参与打包。
      // 注意：必须用 isAbsolute() 而非 id.startsWith('/')。Windows 下 rolldown 会用
      // 「解析后的绝对路径」(如 D:/...) 再次调用 external，'D:/...' 既不以 '.' 也不以
      // '/' 开头，只判断 startsWith('/') 会把本包源码也误判为 external，导致产物里残留
      // import './xxx.ts'（dist 中并不存在该文件，包直接坏掉）。isAbsolute 同时覆盖两种路径。
      external: (id) => !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('virtual:'),
      output: {
        // 同时存在 default 与具名导出，显式声明避免 CJS 端 default 互操作歧义
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});
