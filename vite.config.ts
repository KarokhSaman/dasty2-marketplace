import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { cloudflare } from '@cloudflare/vite-plugin'

// Use .cloudflare-env for Cloudflare builds (indicated by CF_PAGES or explicit flag)
const isCloudflare = process.env.CF_PAGES === '1' || process.env.CLOUDFLARE_USE_DASHBOARD_ENV === 'true'

export default defineConfig({
  server: { port: 3000 },
  envDir: isCloudflare ? './.cloudflare-env' : undefined,
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
