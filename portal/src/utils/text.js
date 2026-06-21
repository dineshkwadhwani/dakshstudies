// Convert ¹²³ etc. unicode super/subscripts to <sup>/<sub> for cleaner display.
const subMap = {}
for (let i = 0; i < 10; i++) {
  subMap[String.fromCharCode(0x2080 + i)] = `<sub>${i}</sub>`
}
const supMap = {
  '\u2070': '<sup>0</sup>', '\u00b9': '<sup>1</sup>', '\u00b2': '<sup>2</sup>',
  '\u00b3': '<sup>3</sup>', '\u2074': '<sup>4</sup>', '\u2075': '<sup>5</sup>',
  '\u2076': '<sup>6</sup>', '\u2077': '<sup>7</sup>', '\u2078': '<sup>8</sup>',
  '\u2079': '<sup>9</sup>', '\u207a': '<sup>+</sup>', '\u207b': '<sup>\u2212</sup>',
}

export function toHTML(text) {
  if (!text) return ''
  let out = text
  for (const [k, v] of Object.entries(subMap)) out = out.split(k).join(v)
  for (const [k, v] of Object.entries(supMap)) out = out.split(k).join(v)
  return out
}
