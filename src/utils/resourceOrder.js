function chapterResourceRank(resource) {
  if (resource.resource_type === 'summary') return 0
  if (['worksheet', 'worksheet_answer_key'].includes(resource.resource_type)) {
    const variant = resource.title?.match(/(?:\s|_)([AB])(?:\.pdf)?$/i)?.[1].toUpperCase()
    const pair = variant === 'A' ? 1 : variant === 'B' ? 2 : 0
    return 10 + pair * 2 + Number(resource.resource_type === 'worksheet_answer_key')
  }
  return 20
}

export function compareChapterResources(a, b) {
  return chapterResourceRank(a) - chapterResourceRank(b)
    || (a.title || '').localeCompare(b.title || '')
}

export function compareAssessmentResources(a, b) {
  const rank = { question_paper: 0, answer_key: 1 }
  return (rank[a.purpose] ?? 2) - (rank[b.purpose] ?? 2)
}
