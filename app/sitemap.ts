import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/site"

/** The public pages; everything else depends on data in the visitor's browser. */
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/play", "/puzzles", "/openings", "/progress", "/about", "/privacy", "/terms"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "monthly",
    priority: path ? 0.6 : 1,
  }))
}
