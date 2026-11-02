"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PLATFORM_LABELS, USERNAME_PATTERN } from "@/lib/sources/normalize"
import type { Platform } from "@/lib/types"

export function UsernameForm() {
  const router = useRouter()
  const [platform, setPlatform] = useState<Platform>("lichess")
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = username.trim()

    if (!USERNAME_PATTERN.test(name)) {
      setError("Usernames are 2–25 letters, numbers, hyphens or underscores.")
      return
    }

    setError(null)
    router.push(`/u/${platform}/${name}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3" noValidate>
      <ToggleGroup
        value={[platform]}
        // Single-select group: clicking the pressed item sends [], which we ignore
        onValueChange={(value) => {
          if (value[0]) setPlatform(value[0] as Platform)
        }}
        variant="outline"
        aria-label="Platform"
      >
        {(Object.keys(PLATFORM_LABELS) as Platform[]).map((key) => (
          <ToggleGroupItem
            key={key}
            value={key}
            className="aria-pressed:border-primary/60 aria-pressed:text-foreground"
          >
            {PLATFORM_LABELS[key]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={`Your ${PLATFORM_LABELS[platform]} username`}
          aria-label="Username"
          aria-invalid={error ? true : undefined}
          aria-describedby="username-message"
          autoComplete="off"
          spellCheck={false}
          className="h-10"
        />
        <Button type="submit" size="lg" className="h-10 px-4">
          Analyze my games
        </Button>
      </div>

      <p id="username-message" role="status" className="min-h-5 text-sm text-destructive">
        {error}
      </p>
    </form>
  )
}
