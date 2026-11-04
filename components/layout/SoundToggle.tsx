"use client"

import { Volume2, VolumeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { playSound, setSoundEnabled, useSoundEnabled } from "@/lib/sound"

/** Mutes or unmutes board sounds; the choice is remembered in this browser. */
export function SoundToggle() {
  const enabled = useSoundEnabled()
  const label = enabled ? "Mute sounds" : "Turn sounds on"
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground"
      aria-label={label}
      aria-pressed={!enabled}
      title={label}
      onClick={() => {
        setSoundEnabled(!enabled)
        // A sample, so turning sound on is confirmed by ear
        if (!enabled) playSound("move")
      }}
    >
      {enabled ? <Volume2 /> : <VolumeOff />}
    </Button>
  )
}
