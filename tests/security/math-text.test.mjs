import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MathText from '../../src/components/MathText.js'

const render = text => renderToStaticMarkup(createElement(MathText, { text }))

test('renders Unicode superscripts and subscripts with trusted elements', () => {
  assert.equal(render('x² + H₂O + 10⁻²'), '<span>x<sup>2</sup> + H<sub>2</sub>O + 10<sup>−2</sup></span>')
})

test('escapes script markup rather than creating executable elements', () => {
  const output = render('<script>alert(1)</script>')
  assert.equal(output, '<span>&lt;script&gt;alert(1)&lt;/script&gt;</span>')
  assert.equal(output.includes('<script>'), false)
})

test('escapes event handlers, images, and malicious links', () => {
  const output = render('<img src=x onerror=alert(1)><a href="javascript:alert(1)">open</a>')
  assert.equal(output.includes('<img'), false)
  assert.equal(output.includes('<a '), false)
  assert.match(output, /&lt;img/)
  assert.match(output, /&lt;a href=/)
})
