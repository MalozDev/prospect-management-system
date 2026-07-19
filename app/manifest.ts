import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prospect Manager",
    short_name: "ProspectMgr",
    description: "Airtel Zambia DSE Prospect Management System",
    start_url: "/login",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#f8f8f8",
    theme_color: "#E60012",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop-screenshot.svg",
        sizes: "1280x800",
        type: "image/svg+xml",
        form_factor: "wide",
        label: "Prospect Manager Dashboard",
      },
    ],
  };
}
