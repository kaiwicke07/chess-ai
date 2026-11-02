import { parseInfo, type UciInfo } from "./uci"

/**
 * Served from public/stockfish (copied there by scripts/copy-stockfish.mjs).
 * The stockfish package is pinned in package.json so this name stays valid.
 */
export const ENGINE_URL = "/stockfish/stockfish-19-lite-single.js"
export const ENGINE_NAME = "Stockfish 19 (lite)"

export class AbortError extends Error {
  constructor() {
    super("Analysis was cancelled")
    this.name = "AbortError"
  }
}

/**
 * Stockfish running in a Web Worker, so searches never block the page.
 * The engine speaks UCI, a line-based text protocol: we post commands like
 * "go depth 14" and it posts back "info ..." lines and a final "bestmove".
 * Searches are serialized: each waits for the previous one to finish.
 */
export class Engine {
  private worker: Worker
  private onLine: ((line: string) => void) | null = null
  private chain: Promise<unknown>
  private failure: Error | null = null

  constructor(url = ENGINE_URL) {
    this.worker = new Worker(url)
    this.worker.onmessage = (event) => this.onLine?.(String(event.data))
    this.worker.onerror = () => {
      this.failure = new Error("The chess engine failed to load.")
      this.onLine?.("__error__")
    }
    // Handshake: "uci" → "uciok", then "isready" → "readyok"
    this.chain = this.waitFor("uci", "uciok").then(() => this.waitFor("isready", "readyok"))
  }

  /** Runs `task` after everything queued before it, even if that failed. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.chain.then(task, task)
    this.chain = next.catch(() => {})
    return next
  }

  private waitFor(command: string, reply: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.onLine = (line) => {
        if (line === "__error__") return reject(this.failure)
        if (line === reply) {
          this.onLine = null
          resolve()
        }
      }
      this.worker.postMessage(command)
    })
  }

  /** Sets a UCI option (e.g. "UCI_Elo"), in order with the other commands. */
  setOption(name: string, value: string | number | boolean): Promise<void> {
    return this.enqueue(async () => {
      this.worker.postMessage(`setoption name ${name} value ${value}`)
      await this.waitFor("isready", "readyok")
    })
  }

  /**
   * The move the engine chooses to play, from its final "bestmove" line. With
   * limited strength this can differ from its analysis's top line, which is
   * the point: it plays like a weaker player instead of reporting the best move.
   */
  bestMove(fen: string, movetimeMs: number): Promise<string | null> {
    return this.enqueue(
      () =>
        new Promise<string | null>((resolve, reject) => {
          if (this.failure) return reject(this.failure)
          this.onLine = (line) => {
            if (line === "__error__") return reject(this.failure)
            if (!line.startsWith("bestmove")) return
            this.onLine = null
            const move = line.split(" ")[1]
            resolve(move && move !== "(none)" ? move : null)
          }
          this.worker.postMessage("setoption name MultiPV value 1")
          this.worker.postMessage(`position fen ${fen}`)
          this.worker.postMessage(`go movetime ${movetimeMs}`)
        }),
    )
  }

  /** Clears the engine's memory of earlier positions; call between unrelated games. */
  newGame(): Promise<void> {
    return this.enqueue(async () => {
      this.worker.postMessage("ucinewgame")
      await this.waitFor("isready", "readyok")
    })
  }

  /**
   * Searches `fen` to `depth`. Resolves with the deepest result for each of the
   * top `multiPv` lines, best first. Scores are from the side to move.
   */
  analyze(fen: string, options: { depth: number; multiPv?: number; signal?: AbortSignal }): Promise<UciInfo[]> {
    const { depth, multiPv = 1, signal } = options

    return this.enqueue(
      () =>
        new Promise<UciInfo[]>((resolve, reject) => {
          if (this.failure) return reject(this.failure)
          if (signal?.aborted) return reject(new AbortError())

          const lines = new Map<number, UciInfo>()
          const onAbort = () => this.worker.postMessage("stop") // engine still replies with bestmove

          this.onLine = (line) => {
            if (line === "__error__") return reject(this.failure)
            const info = parseInfo(line)
            if (info) lines.set(info.multipv, info)
            if (line.startsWith("bestmove")) {
              this.onLine = null
              signal?.removeEventListener("abort", onAbort)
              if (signal?.aborted) return reject(new AbortError())
              resolve([...lines.entries()].sort(([a], [b]) => a - b).map(([, info]) => info))
            }
          }

          signal?.addEventListener("abort", onAbort, { once: true })
          this.worker.postMessage(`setoption name MultiPV value ${multiPv}`)
          this.worker.postMessage(`position fen ${fen}`)
          this.worker.postMessage(`go depth ${depth}`)
        }),
    )
  }

  terminate() {
    this.worker.terminate()
  }
}
