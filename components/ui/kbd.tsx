import { cn } from "cn"

/** A key hint inside a button ("H"). Hidden on touch-sized screens, where there's no keyboard. */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "ml-1 hidden h-5 min-w-5 items-center justify-center rounded border border-current/25 px-1 font-mono text-[0.7rem] leading-none font-medium opacity-70 sm:inline-flex",
        className,
      )}
      {...props}
    />
  )
}

export { Kbd }
