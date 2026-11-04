"use client"

import { useSyncExternalStore } from "react"

/**
 * Board sounds, synthesized with the Web Audio API: no audio files to
 * download or license. Each sound is a short burst of filtered noise (the
 * "tock" of a piece landing) plus, for feedback sounds, a soft tone.
 */
export type Sound = "move" | "capture" | "check" | "correct" | "wrong" | "end"

const STORAGE_KEY = "chess.ai:sound"
const listeners = new Set<() => void>()
let context: AudioContext | null = null
// Used only when localStorage is blocked
let memoryOverride: boolean | null = null

/** Sound is on unless the user turned it off (stored per browser). */
function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off"
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off")
  } catch {
    // Private modes can block storage; the toggle then lasts until reload
    memoryOverride = enabled
  }
  for (const listener of listeners) listener()
}

const isEnabled = () => memoryOverride ?? readEnabled()

/** Whether sound is on, kept in sync across every component that asks. */
export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    isEnabled,
    // On the server, render the "on" state; the browser corrects it after hydration
    () => true,
  )
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) return null
  context ??= new AudioContext()
  // Browsers start the context suspended until a user gesture; every sound here follows one
  if (context.state === "suspended") void context.resume()
  return context
}

/** A piece landing: a very short band-passed noise burst with a low thump under it. */
function tock(ctx: AudioContext, at: number, { pitch = 1, volume = 0.5 } = {}) {
  const length = Math.floor(ctx.sampleRate * 0.05)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3

  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.value = 1500 * pitch
  filter.Q.value = 1.2
  const noiseGain = ctx.createGain()
  noiseGain.gain.value = volume
  noise.connect(filter).connect(noiseGain).connect(ctx.destination)
  noise.start(at)

  const body = ctx.createOscillator()
  body.frequency.setValueAtTime(190 * pitch, at)
  body.frequency.exponentialRampToValueAtTime(90 * pitch, at + 0.07)
  const bodyGain = ctx.createGain()
  bodyGain.gain.setValueAtTime(volume * 0.6, at)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, at + 0.08)
  body.connect(bodyGain).connect(ctx.destination)
  body.start(at)
  body.stop(at + 0.09)
}

/** A soft sine note with a quick attack and a gentle fade. */
function tone(ctx: AudioContext, at: number, frequency: number, { duration = 0.16, volume = 0.12, type = "sine" as OscillatorType } = {}) {
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.value = frequency
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + duration + 0.02)
}

/** Plays a sound if the user hasn't muted them. Safe to call from anywhere. */
export function playSound(sound: Sound) {
  if (!isEnabled()) return
  const ctx = audio()
  if (!ctx) return
  const t = ctx.currentTime + 0.005
  switch (sound) {
    case "move":
      tock(ctx, t)
      break
    case "capture":
      // Two pieces knocking: the taken piece, then the capturer landing
      tock(ctx, t, { pitch: 0.8, volume: 0.6 })
      tock(ctx, t + 0.045, { pitch: 1.1, volume: 0.45 })
      break
    case "check":
      tock(ctx, t)
      tone(ctx, t + 0.02, 880, { duration: 0.14, volume: 0.07, type: "triangle" })
      break
    case "correct":
      tone(ctx, t, 660)
      tone(ctx, t + 0.09, 990, { duration: 0.22 })
      break
    case "wrong":
      tone(ctx, t, 220, { duration: 0.18, volume: 0.08, type: "triangle" })
      tone(ctx, t + 0.08, 185, { duration: 0.2, volume: 0.08, type: "triangle" })
      break
    case "end":
      tock(ctx, t)
      tone(ctx, t + 0.03, 523, { duration: 0.2 })
      tone(ctx, t + 0.13, 659, { duration: 0.2 })
      tone(ctx, t + 0.23, 784, { duration: 0.35 })
      break
  }
}

/** Which sound a move makes, from its SAN ("Nxe5+", "Qh7#", "O-O"). */
export function soundForSan(san: string): Sound {
  if (san.includes("#")) return "end"
  if (san.includes("+")) return "check"
  if (san.includes("x")) return "capture"
  return "move"
}

/** Pieces on the board part of a FEN, to spot a capture between two positions. */
function pieceCount(fen: string): number {
  return (fen.split(" ")[0].match(/[a-z]/gi) ?? []).length
}

/**
 * The sound for going from one position to the next, when only the FENs are
 * known (the shared interactive board). `inCheck` and `checkmate` describe `next`.
 */
export function soundForPositions(previous: string, next: string, inCheck: boolean, checkmate: boolean): Sound {
  if (checkmate) return "end"
  if (inCheck) return "check"
  return pieceCount(next) < pieceCount(previous) ? "capture" : "move"
}
