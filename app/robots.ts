import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/site"

// Account, review and replay pages show data from the visitor's own browser,
// so a crawler would only ever see empty shells there
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/u/", "/review/", "/play/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
