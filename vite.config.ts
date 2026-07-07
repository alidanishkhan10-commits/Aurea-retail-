import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// IMPORTANT: base must match your GitHub Pages repo name, e.g. "/garment-platform/"
// If you're deploying to a custom domain or user/org page (username.github.io), set base to "/".
export default defineConfig({
  base: "/Aurea-retail-/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "Your Brand Wholesale",
        short_name: "Wholesale",
        description: "B2B wholesale garment ordering platform",
        theme_color: "#0A0A0A",
        background_color: "#FFFFFF",
        display: "standalone",
        start_url: "/garment-platform/",
        scope: "/garment-platform/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "product-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ]
});
