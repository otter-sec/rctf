import type { SvgComponent } from "astro/types"
import GitHub from "@/assets/icons/github.svg"
import Twitter from "@/assets/icons/twitter.svg"

export const SITE = {
  title: "rCTF Docs",
  description:
    "rCTF is redpwn's CTF platform. It is now developed and maintained by the OtterSec team.",
  locale: "en-US",
  dir: "ltr",
  defaultPageImage: "/static/opengraph-image.png",
  defaultPostImage: "/static/1200x630.png",
} as const

export const NAVIGATION = [
  { href: "/docs", label: "Docs" },
]

export const DOCS = {
  editUrlBase: "https://github.com/otter-sec/rctf-new/edit/main/apps/docs/",
  lastUpdated: true,
} as const

export const SOCIALS: { href: string; label: string; icon: SvgComponent }[] = [
  { href: "https://github.com/otter-sec", label: "GitHub", icon: GitHub },
  { href: "https://twitter.com/osec_io", label: "Twitter", icon: Twitter },
]
