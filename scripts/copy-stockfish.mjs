// Copies the browser build of Stockfish from node_modules into public/ so it
// is served as a static file. Runs on `npm install` (postinstall), including
// on Vercel, so the engine files never need to be committed.
import { copyFileSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = dirname(require.resolve("stockfish/package.json"))
const target = join(root, "public", "stockfish")
const { version } = require("stockfish/package.json")
const major = version.split(".")[0]

// Lite, single-threaded: ~1.8 MB and needs no cross-origin isolation headers
const files = [`stockfish-${major}-lite-single.js`, `stockfish-${major}-lite-single.wasm`]

mkdirSync(target, { recursive: true })
for (const file of files) copyFileSync(join(source, "bin", file), join(target, file))
// GPLv3 requires the license to travel with the engine
copyFileSync(join(source, "Copying.txt"), join(target, "COPYING.txt"))

console.log(`Copied Stockfish.js ${version} (lite, single-threaded) to public/stockfish`)
