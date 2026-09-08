import type { MetadataRoute } from "next";
import { abs } from "@/lib/site";

/**
 * Nothing here is private: the whole point is that the figures are public and
 * findable. The only paths worth keeping out of an index are the two redirects,
 * which carry no content and would otherwise compete with the console they
 * redirect to.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: abs("/sitemap.xml"),
  };
}
