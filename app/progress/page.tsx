import type { Metadata } from "next"

import { ProgressDashboard } from "@/components/progress/ProgressDashboard"

export const metadata: Metadata = { title: "Progress" }

export default function ProgressPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <ProgressDashboard />
    </div>
  )
}
