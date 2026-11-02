"use client"

import { useSyncExternalStore } from "react"

import { analysisQueue, IDLE_SNAPSHOT, type QueueSnapshot } from "./queue"

const noopSubscribe = () => () => {}
const idle = () => IDLE_SNAPSHOT

/** Live state of the background analysis queue; idle during server rendering. */
export function useAnalysisQueue(): QueueSnapshot {
  return useSyncExternalStore(
    analysisQueue?.subscribe ?? noopSubscribe,
    analysisQueue?.getSnapshot ?? idle,
    idle,
  )
}
