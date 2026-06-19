import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { cloudflare } from '@cloudflare/vite-plugin'

const useDashboardEnv = process.env.CLOUDFLARE_USE_DASHBOARD_ENV === 'true'

export default defineConfig({
  server: { port: 3000 },
  envDir: useDashboardEnv ? './.cloudflare-env' : undefined,
  resolve: { tsconfigPaths: true },
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['cookie', 'url', 'baseLocale'],
      cookieName: 'dasty2-lang',
    }),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact(),
  ],
})
