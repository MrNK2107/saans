import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saans",
    short_name: "Saans",
    description: "Breathe easier through Delhi's winter smog.",
    start_url: "/plan",
    display: "standalone",
    background_color: "#f7ecd6",
    theme_color: "#b3411a",
  };
}
