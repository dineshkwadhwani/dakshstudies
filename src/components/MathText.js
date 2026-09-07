import { createElement } from 'react'
import { formatMathText } from '../utils/text.js'

export default function MathText({ text, as = 'span', ...props }) {
  const children = formatMathText(text).map((segment, index) => (
    segment.type === 'text'
      ? segment.value
      : createElement(segment.type, { key: `${segment.type}-${index}` }, segment.value)
  ))
  return createElement(as, props, ...children)
}
