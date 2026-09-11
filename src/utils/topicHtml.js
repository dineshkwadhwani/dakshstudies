const allowedTags = new Set(['p', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'sub', 'sup', 'blockquote', 'br'])
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decodeEntities(text) {
  return text.replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] || match
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\uFFFD'
  })
}

// Parse a small, attribute-free HTML vocabulary into text and element nodes.
// React creates the elements itself; stored markup is never injected into the DOM.
export function parseTopicHtml(html = '') {
  if (html.length > 30000) throw new Error('The summary is too long.')
  const root = { children: [] }
  const stack = [root]
  for (const token of html.split(/(<[^>]*>)/g).filter(Boolean)) {
    if (!token.startsWith('<')) {
      if (/[<>]/.test(token)) throw new Error('Use &lt; and &gt; for comparison signs.')
      stack.at(-1).children.push(decodeEntities(token))
      continue
    }
    const match = token.match(/^<(\/?)([a-z0-9]+)(\s*\/?)>$/)
    if (!match || !allowedTags.has(match[2]) || (match[3] && match[2] !== 'br')) {
      throw new Error('Use only paragraphs, headings, lists, bold, italic, subscript and superscript, without HTML attributes.')
    }
    const [, closing, tag] = match
    if (closing) {
      if (stack.length === 1 || stack.at(-1).tag !== tag) throw new Error(`Mismatched closing tag: ${tag}.`)
      stack.pop()
    } else {
      const node = { tag, children: [] }
      stack.at(-1).children.push(node)
      if (tag !== 'br') stack.push(node)
    }
  }
  if (stack.length !== 1) throw new Error(`Close the ${stack.at(-1).tag} tag.`)
  return root.children
}

export function topicWordCount(html = '') {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, ' ').trim()
  return text ? text.split(/\s+/).length : 0
}

export function validateTopicSummary(html, published = true) {
  parseTopicHtml(html)
  if (published && /\\(?:[a-zA-Z]+|[()[\]])|[\^_]\{/.test(html)) {
    throw new Error('Use readable mathematical symbols and HTML sub/sup tags instead of LaTeX notation.')
  }
  const count = topicWordCount(html)
  if (published && (count < 200 || count > 500)) throw new Error(`A published summary must contain 200–500 words (currently ${count}).`)
  return count
}
