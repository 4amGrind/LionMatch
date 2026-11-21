// Lets phones "Add to Home Screen" with the crown icon and open the app full-screen, like a native app.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Columbia Tinder",
    short_name: "Columbia Tinder",
    description: "Swipe on internships, clubs, research, and fellowships at Columbia.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#b9d9eb",
    theme_color: "#b9d9eb",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
