import { ImageResponse } from "next/og"

import { site } from "@/lib/site"

// The preview shown when a link to the site is shared, rendered once at build time
export const alt = `${site.name}: ${site.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const FEATURES = ["Stockfish analysis", "Puzzles from your mistakes", "Spaced repetition", "Opening trainer"]

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#181715",
          color: "#f1f2f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#58a2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#06101c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
              <path d="M16.5 18c1-2 2.5-5 2.5-9a7 7 0 0 0-7-7H6.635a1 1 0 0 0-.768 1.64L7 5l-2.32 5.802a2 2 0 0 0 .95 2.526l2.87 1.456" />
              <path d="m15 5 1.425-1.425" />
              <path d="m17 8 1.53-1.53" />
              <path d="M9.713 12.185 7 18" />
            </svg>
          </div>
          <span style={{ fontSize: 40, fontWeight: 700 }}>{site.name}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>{site.tagline}</span>
          <span style={{ fontSize: 30, color: "#a7a4a1", maxWidth: 960 }}>
            Your Lichess or Chess.com games, analyzed by Stockfish and turned into training. Free, private, no account.
          </span>
        </div>

        {/* Satori shrinks flex items by default, which collapses the padding */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {FEATURES.map((feature) => (
            <div
              key={feature}
              style={{
                display: "flex",
                flexShrink: 0,
                fontSize: 22,
                padding: "10px 22px",
                borderRadius: 999,
                border: "2px solid #2d2b29",
                color: "#c9ccd4",
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
