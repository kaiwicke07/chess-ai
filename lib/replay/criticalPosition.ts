import type { MoveAssessment } from "@/lib/analysis/classify"
import type { Color } from "@/lib/types"

/**
 * Where a game turned: the position before the user's single most costly
 * move, by drop in their win chance. Returns its index into the positions,
 * or null if the user never lost real ground (under 10 points: no
 * mistake-sized swing to replay).
 */
export function criticalPly(assessments: (MoveAssessment | null)[], userColor: Color): number | null {
  let worst: MoveAssessment | null = null
  for (const a of assessments) {
    if (!a || a.color !== userColor) continue
    if (!worst || a.winBefore - a.winAfter > worst.winBefore - worst.winAfter) worst = a
  }
  if (!worst || worst.winBefore - worst.winAfter < 10) return null
  return worst.ply - 1
}
