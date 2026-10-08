import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

import { parseLinkedInText, profileFieldsFrom } from '../linkedin-import'
import { readPdfText } from '../pdf-text'

// Node runs PDF.js's legacy build with its in-process worker.
vi.mock('pdfjs-dist', async () => import('pdfjs-dist/legacy/build/pdf.mjs'))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: fileURLToPath(import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')) }))

describe('reading a LinkedIn PDF export', () => {
  it('extracts lines in reading order and finds the name as the largest text', async () => {
    const bytes = readFileSync(new URL('./fixtures/linkedin-export.pdf', import.meta.url))
    const file = new File([bytes], 'Profile.pdf', { type: 'application/pdf' })
    const pdf = await readPdfText(file)
    expect(pdf.largest).toBe('Adrian North')
    const fields = profileFieldsFrom(parseLinkedInText(pdf.text, { name: pdf.largest }))
    expect(fields).toMatchObject({ name: 'Adrian North', title: 'Founder & CEO', company: 'Northline Growth', location: 'Austin, Texas, United States' })
    expect(fields.expertise).toEqual(['Brand Strategy', 'Lead Generation', 'Marketing Automation'])
    expect(fields.whatIDo).toMatch(/^I help established businesses/)
  })

  it('refuses files that are not PDFs', async () => {
    await expect(readPdfText(new File(['x'], 'a.png', { type: 'image/png' }))).rejects.toThrow('Choose a PDF file.')
  })
})
