import type { MetadataRoute } from "next";
import { SITE_URL } from "@/ui/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [`${SITE_URL}/`, `${SITE_URL}/plan`].map((url) => ({ url }));
}
