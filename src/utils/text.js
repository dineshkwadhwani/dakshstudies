// Convert Unicode super/subscripts into structured text segments. Rendering code
// can then create trusted React elements without injecting an HTML string.
const subMap = {}
for (let i = 0; i < 10; i++) subMap[String.fromCharCode(0x2080 + i)] = String(i)
const supMap = {
  '\u2070': '0', '\u00b9': '1', '\u00b2': '2', '\u00b3': '3', '\u2074': '4',
  '\u2075': '5', '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9',
  '\u207a': '+', '\u207b': '\u2212',
}

export function formatMathText(text) {
  const segments = []
  for (const character of String(text || '')) {
    const type = Object.hasOwn(subMap, character) ? 'sub' : Object.hasOwn(supMap, character) ? 'sup' : 'text'
    const value = type === 'sub' ? subMap[character] : type === 'sup' ? supMap[character] : character
    const previous = segments.at(-1)
    if (previous?.type === type) previous.value += value
    else segments.push({ type, value })
  }
  return segments
}
