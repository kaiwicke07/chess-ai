import { z } from "zod"

// Zod normally probes for `eval` (new Function) to compile faster validators.
// The site's Content Security Policy forbids eval, so the probe fails: harmless,
// but browsers still report it as a CSP violation. Jitless mode skips the
// probe and uses the interpreter, which is plenty fast for API responses.
z.config({ jitless: true })

export { z }
