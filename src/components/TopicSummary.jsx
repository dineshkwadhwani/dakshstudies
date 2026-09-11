import { createElement } from 'react'
import { parseTopicHtml } from '../utils/topicHtml.js'

function renderNodes(nodes) {
  return nodes.map((node, index) => typeof node === 'string'
    ? node
    : createElement(node.tag, { key: index }, ...(node.tag === 'br' ? [] : renderNodes(node.children))))
}

export default function TopicSummary({ html }) {
  try {
    return <div className="topic-summary">{renderNodes(parseTopicHtml(html))}</div>
  } catch {
    return <p role="alert">This summary could not be displayed. Please contact support.</p>
  }
}
