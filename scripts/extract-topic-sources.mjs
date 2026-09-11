// Local extraction only. Output is kept outside public/ so source books and
// draft content never become part of the student web bundle.
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const sourceRoot = resolve(process.argv[2] || 'portal/public/pdfs/books')
const outputRoot = resolve(process.argv[3] || '/tmp/daksh-topic-sources')
await mkdir(outputRoot, { recursive: true })
const manifest = []
for (const subject of ['mathematics', 'science', 'history', 'geogrpahy', 'civics', 'economics']) {
  for (const file of (await readdir(join(sourceRoot, subject))).filter(name => /\d{2}\.pdf$/.test(name)).sort()) {
    const buffer = await readFile(join(sourceRoot, subject, file))
    const pdf = await getDocument({ data: new Uint8Array(buffer), verbosity: 0, useSystemFonts: true }).promise
    const pages = []
    for (let number = 1; number <= pdf.numPages; number++) {
      const content = await (await pdf.getPage(number)).getTextContent()
      let text = '', lastY = null
      for (const item of content.items) {
        if (!item.str) continue
        const y = Math.round(item.transform[5])
        if (lastY !== null && Math.abs(y - lastY) > 3) text += '\n'
        else if (text) text += ' '
        text += item.str
        lastY = y
      }
      pages.push({ page: number, text })
    }
    const outputFile = `${subject}-${file.replace('.pdf', '.json')}`
    await writeFile(join(outputRoot, outputFile), JSON.stringify(pages, null, 2))
    manifest.push({ subject: subject === 'geogrpahy' ? 'geography' : subject, file: `${subject}/${file}`, outputFile, pageCount: pdf.numPages, sha256: createHash('sha256').update(buffer).digest('hex') })
    await pdf.destroy()
  }
}
await writeFile(join(outputRoot, 'books.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`Extracted ${manifest.length} chapter PDFs into ${outputRoot}.`)
