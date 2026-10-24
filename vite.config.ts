import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve, relative } from 'path'
import { readFileSync, existsSync } from 'fs'

const { version } = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf-8')) as { version: string }

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-samples',
      configureServer(server) {
        const samplesDir = resolve(import.meta.dirname, 'samples')
        server.middlewares.use((req, res, next) => {
          const name = (req.url ?? '/').split('?')[0].slice(1)
          if (!name.endsWith('.csv')) return next()
          const filePath = resolve(samplesDir, name)
          if (relative(samplesDir, filePath).startsWith('..')) return next()
          if (!existsSync(filePath)) return next()
          res.setHeader('Content-Type', 'text/csv; charset=utf-8')
          res.end(readFileSync(filePath))
        })
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    open: process.env.PLAYWRIGHT_TEST ? false : '/popup.html',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/popup.tsx',
        'src/chrome-mock.ts',
        'src/background.ts',
        'src/locales/**',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, 'popup.html'),
        background: resolve(import.meta.dirname, 'src/background.ts'),
        importer: resolve(import.meta.dirname, 'importer.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
})
