import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prospects",
    short_name: "Prospects",
    description: "Sales Prospect Management System",
    start_url: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#ffffff",
    theme_color: "#E60012",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
    // iOS-specific: Safari treats these as hints for the home-screen icon
    // The actual iOS metadata is set via <meta> tags in layout.tsx
    icons: [
      // SVG icons for the home screen (keep for high-res displays)
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      // PNG icons for notifications (required — SVG doesn't render in Android notifications)
      {
        src: "/icons/notif-icon-96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/notif-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/badge-96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
    ],
    // iOS screenshots for App Store / share sheet preview
    screenshots: [
      {
        src: "/screenshots/desktop-screenshot.svg",
        sizes: "1280x720",
        type: "image/svg+xml",
        form_factor: "wide",
      },
    ],
  };
}
