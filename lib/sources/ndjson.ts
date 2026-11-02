/**
 * Yields one parsed object per line of a streamed NDJSON body as it arrives,
 * so a long export can show progress instead of waiting for the whole response.
 */
export async function* readNdjson(response: Response): AsyncGenerator<unknown> {
  if (!response.body) return
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line)
    }
  }

  if (buffer.trim()) yield JSON.parse(buffer)
}
