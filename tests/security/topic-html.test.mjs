import assert from 'node:assert/strict'
import test from 'node:test'
import { parseTopicHtml, topicWordCount, validateTopicSummary } from '../../src/utils/topicHtml.js'

test('topic HTML preserves scientific notation and entities as text nodes', () => {
  assert.deepEqual(parseTopicHtml('<p>H<sub>2</sub>O &amp; x<sup>2</sup> &lt; 4<br>Continue.</p>'), [{ tag: 'p', children: ['H', { tag: 'sub', children: ['2'] }, 'O & x', { tag: 'sup', children: ['2'] }, ' < 4', { tag: 'br', children: [] }, 'Continue.'] }])
})

test('topic HTML rejects scripts, event handlers, embeds and malformed nesting', () => {
  for (const html of ['<script>alert(1)</script>', '<p onclick="alert(1)">Hello</p>', '<img src=x onerror=alert(1)>', '<iframe src="https://example.com"></iframe>', '<svg><script>bad</script></svg>', '<p><strong>bad</p></strong>', '<p>unclosed', '<a href="javascript:alert(1)">bad</a>']) {
    assert.throws(() => parseTopicHtml(html), undefined, html)
  }
  assert.deepEqual(parseTopicHtml('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')[0].children, ['<script>alert(1)</script>'])
})

test('published topic summaries enforce the complete 200–500 word range', () => {
  const summary = count => `<p>${Array.from({ length: count }, () => 'word').join(' ')}</p>`
  assert.throws(() => validateTopicSummary(summary(199)))
  assert.equal(validateTopicSummary(summary(200)), 200)
  assert.equal(validateTopicSummary(summary(500)), 500)
  assert.throws(() => validateTopicSummary(summary(501)))
  assert.equal(validateTopicSummary('<p>Draft text</p>', false), 2)
  assert.equal(topicWordCount('<h2>Some heading</h2><p>Two &amp; words.</p>'), 4)
})

test('published formulas must render without a LaTeX engine', () => {
  const padding = ' word'.repeat(300)
  for (const formula of [String.raw`\frac{1}{2}`, String.raw`\sqrt{4}`, 'x^{2}', 'S_{n}']) {
    assert.throws(() => validateTopicSummary(`<p>${formula}${padding}</p>`), /LaTeX/)
  }
  assert.equal(validateTopicSummary(`<p>x<sup>2</sup> + √4${padding}</p>`), 304)
})
