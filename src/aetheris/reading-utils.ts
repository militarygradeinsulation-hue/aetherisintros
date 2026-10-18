/** Keep native speech segments short enough for Safari / iOS voice engines.
 * Preserve every word instead of silently truncating long server passages.
 */
export function splitReadingPassages(passages: string[], maxLength = 240): string[] {
  const output: string[] = []
  for (const raw of passages) {
    let remaining = raw.replace(/\s+/g, ' ').trim()
    if (remaining.length < 2) continue
    while (remaining.length > maxLength) {
      const window = remaining.slice(0, maxLength + 1)
      const minimum = Math.floor(maxLength * 0.45)
      const sentenceBreak = Math.max(
        window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '),
        window.lastIndexOf('; '),
      )
      const lastSpace = window.lastIndexOf(' ')
      const boundary = sentenceBreak >= minimum ? sentenceBreak + 1
        : lastSpace >= minimum ? lastSpace : maxLength
      const piece = remaining.slice(0, boundary).trim()
      if (piece.length > 1) output.push(piece)
      remaining = remaining.slice(boundary).trim()
    }
    if (remaining.length > 1) output.push(remaining)
  }
  return output
}
