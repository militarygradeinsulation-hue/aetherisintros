/**
 * Grid formula engine.
 *
 * A small, safe recursive-descent evaluator: arithmetic, parentheses, cell and
 * range references, and a fixed function set. No JavaScript is ever executed,
 * so a bad formula produces a visible error string instead of running code.
 */

export type CellLookup = (ref: string) => unknown

const functions = new Set(['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'ROUND', 'IF', 'CONCAT', 'TODAY', 'NOW'])

type Token = { t: 'num' | 'str' | 'ref' | 'range' | 'fn' | 'op' | 'paren' | 'comma'; v: string }

const cellRef = /^[A-Z]{1,3}[0-9]{1,5}$/

function tokenize(input: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < input.length) {
    const c = input[i] as string
    if (/\s/.test(c)) { i += 1; continue }
    if (c === '"' || c === "'") {
      let j = i + 1
      let s = ''
      while (j < input.length && input[j] !== c) { s += input[j]; j += 1 }
      if (j >= input.length) throw new Error('unterminated text')
      out.push({ t: 'str', v: s }); i = j + 1; continue
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(input[i + 1] ?? ''))) {
      let j = i
      while (j < input.length && /[0-9.]/.test(input[j] as string)) j += 1
      out.push({ t: 'num', v: input.slice(i, j) }); i = j; continue
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i
      while (j < input.length && /[A-Za-z0-9_$:.]/.test(input[j] as string)) j += 1
      const word = input.slice(i, j)
      const upper = word.toUpperCase().replace(/\$/g, '')
      if (functions.has(upper) && input[j] === '(') out.push({ t: 'fn', v: upper })
      else if (upper.includes(':')) {
        const [a, b] = upper.split(':')
        if (!a || !b || !cellRef.test(a) || !cellRef.test(b)) throw new Error(`bad range ${word}`)
        out.push({ t: 'range', v: `${a}:${b}` })
      } else if (cellRef.test(upper)) out.push({ t: 'ref', v: upper })
      else if (upper === 'TRUE' || upper === 'FALSE') out.push({ t: 'num', v: upper === 'TRUE' ? '1' : '0' })
      else throw new Error(`unknown name ${word}`)
      i = j; continue
    }
    if ('+-*/^%&'.includes(c)) { out.push({ t: 'op', v: c }); i += 1; continue }
    if (c === '<' || c === '>' || c === '=') {
      const two = input.slice(i, i + 2)
      if (two === '<=' || two === '>=' || two === '<>') { out.push({ t: 'op', v: two }); i += 2; continue }
      out.push({ t: 'op', v: c }); i += 1; continue
    }
    if (c === '(' || c === ')') { out.push({ t: 'paren', v: c }); i += 1; continue }
    if (c === ',' || c === ';') { out.push({ t: 'comma', v: ',' }); i += 1; continue }
    throw new Error(`unexpected ${c}`)
  }
  return out
}

const colIndex = (letters: string) =>
  letters.split('').reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0)

const colLetters = (index: number) => {
  let n = index
  let out = ''
  while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26) }
  return out || 'A'
}

function expandRange(range: string): string[] {
  const [a, b] = range.split(':') as [string, string]
  const pa = /^([A-Z]{1,3})([0-9]{1,5})$/.exec(a)
  const pb = /^([A-Z]{1,3})([0-9]{1,5})$/.exec(b)
  if (!pa || !pb) throw new Error('bad range')
  const c1 = colIndex(pa[1] as string); const c2 = colIndex(pb[1] as string)
  const r1 = Number(pa[2]); const r2 = Number(pb[2])
  const refs: string[] = []
  for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c += 1) {
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r += 1) refs.push(`${colLetters(c)}${r}`)
  }
  if (refs.length > 5000) throw new Error('range too large')
  return refs
}

const num = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/[$,%\s]/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value))

class Parser {
  private pos = 0
  constructor(private tokens: Token[], private lookup: CellLookup) {}

  parse(): unknown {
    const value = this.comparison()
    if (this.pos < this.tokens.length) throw new Error('unexpected trailing input')
    return value
  }

  private peek(): Token | undefined { return this.tokens[this.pos] }

  private comparison(): unknown {
    let left = this.additive()
    for (;;) {
      const t = this.peek()
      if (!t || t.t !== 'op' || !['<', '>', '=', '<=', '>=', '<>'].includes(t.v)) return left
      this.pos += 1
      const right = this.additive()
      const a = typeof left === 'string' || typeof right === 'string' ? text(left) : num(left)
      const b = typeof left === 'string' || typeof right === 'string' ? text(right) : num(right)
      switch (t.v) {
        case '<': left = a < b; break
        case '>': left = a > b; break
        case '=': left = a === b; break
        case '<=': left = a <= b; break
        case '>=': left = a >= b; break
        default: left = a !== b
      }
    }
  }

  private additive(): unknown {
    let left = this.multiplicative()
    for (;;) {
      const t = this.peek()
      if (!t || t.t !== 'op' || !['+', '-', '&'].includes(t.v)) return left
      this.pos += 1
      const right = this.multiplicative()
      if (t.v === '&') left = text(left) + text(right)
      else left = t.v === '+' ? num(left) + num(right) : num(left) - num(right)
    }
  }

  private multiplicative(): unknown {
    let left = this.power()
    for (;;) {
      const t = this.peek()
      if (!t || t.t !== 'op' || !['*', '/', '%'].includes(t.v)) return left
      this.pos += 1
      const right = this.power()
      if (t.v === '*') left = num(left) * num(right)
      else if (t.v === '/') {
        const d = num(right)
        if (d === 0) throw new Error('divide by zero')
        left = num(left) / d
      } else left = num(left) % num(right)
    }
  }

  private power(): unknown {
    const base = this.unary()
    const t = this.peek()
    if (t && t.t === 'op' && t.v === '^') { this.pos += 1; return num(base) ** num(this.power()) }
    return base
  }

  private unary(): unknown {
    const t = this.peek()
    if (t && t.t === 'op' && (t.v === '-' || t.v === '+')) {
      this.pos += 1
      const value = num(this.unary())
      return t.v === '-' ? -value : value
    }
    return this.primary()
  }

  private args(): unknown[][] {
    // returns a list of argument slots; ranges expand into multiple values
    const slots: unknown[][] = []
    this.expect('(')
    if (this.peek()?.v === ')') { this.pos += 1; return slots }
    for (;;) {
      const t = this.peek()
      if (t && t.t === 'range') { this.pos += 1; slots.push(expandRange(t.v).map(r => this.lookup(r))) }
      else slots.push([this.comparison()])
      const next = this.peek()
      if (next?.t === 'comma') { this.pos += 1; continue }
      this.expect(')')
      return slots
    }
  }

  private expect(char: string) {
    const t = this.peek()
    if (!t || t.v !== char) throw new Error(`expected ${char}`)
    this.pos += 1
  }

  private primary(): unknown {
    const t = this.peek()
    if (!t) throw new Error('unexpected end of formula')
    if (t.t === 'num') { this.pos += 1; return Number(t.v) }
    if (t.t === 'str') { this.pos += 1; return t.v }
    if (t.t === 'ref') { this.pos += 1; return this.lookup(t.v) }
    if (t.t === 'range') { this.pos += 1; const vals = expandRange(t.v).map(r => this.lookup(r)); return vals[0] ?? '' }
    if (t.t === 'paren' && t.v === '(') { this.pos += 1; const v = this.comparison(); this.expect(')'); return v }
    if (t.t === 'fn') {
      this.pos += 1
      const slots = this.args()
      const flat = slots.flat()
      switch (t.v) {
        case 'SUM': return flat.reduce((a, b) => a + num(b), 0)
        case 'COUNT': return flat.filter(v => v !== '' && v !== null && v !== undefined && Number.isFinite(num(v)) && String(v).trim() !== '').length
        case 'AVERAGE': {
          const usable = flat.filter(v => v !== '' && v !== null && v !== undefined)
          if (!usable.length) throw new Error('no values')
          return usable.reduce((a, b) => a + num(b), 0) / usable.length
        }
        case 'MIN': return flat.length ? Math.min(...flat.map(num)) : 0
        case 'MAX': return flat.length ? Math.max(...flat.map(num)) : 0
        case 'ROUND': {
          const digits = slots[1] ? num(slots[1][0]) : 0
          const factor = 10 ** Math.max(0, Math.min(10, Math.trunc(digits)))
          return Math.round(num(flat[0]) * factor) / factor
        }
        case 'IF': {
          const cond = slots[0]?.[0]
          const truthy = typeof cond === 'boolean' ? cond : num(cond) !== 0 || text(cond).trim().length > 0
          const branch = truthy ? slots[1] : slots[2]
          return branch?.[0] ?? (truthy ? true : false)
        }
        case 'CONCAT': return flat.map(text).join('')
        case 'TODAY': return new Date().toISOString().slice(0, 10)
        case 'NOW': return new Date().toISOString().slice(0, 16).replace('T', ' ')
        default: throw new Error(`unsupported ${t.v}`)
      }
    }
    throw new Error(`unexpected ${t.v}`)
  }
}

/** Evaluate a formula. Returns `#ERROR` style text rather than throwing. */
export function evaluateFormula(raw: string, lookup: CellLookup): { value: unknown; error?: string } {
  const body = raw.trim().replace(/^=/, '')
  if (!body) return { value: '' }
  try {
    return { value: new Parser(tokenize(body), lookup).parse() }
  } catch (error) {
    return { value: '#ERROR', error: error instanceof Error ? error.message : 'bad formula' }
  }
}

export { colLetters }
