import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saans",
    short_name: "Saans",
    description: "Breathe easier through Delhi's winter smog.",
    start_url: "/plan",
    display: "standalone",
    background_color: "#f5f2ec",
    theme_color: "#0a5c63",
  };
}
