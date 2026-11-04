import type { Bot } from "@/lib/bots/bots"

/** A bot's face: its initial on a tinted disc, each bot in its own hue. */
export function BotAvatar({ bot, size = "md" }: { bot: Bot; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "size-7 text-sm", md: "size-10 text-lg", lg: "size-14 text-2xl" }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]}`}
      style={{
        backgroundColor: `oklch(0.42 0.1 ${bot.hue})`,
        color: `oklch(0.94 0.04 ${bot.hue})`,
      }}
      aria-hidden
    >
      {bot.name[0]}
    </span>
  )
}
