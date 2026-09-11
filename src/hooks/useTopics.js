import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useTopics(chapterId, topicSlug = null) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ topics: [], topic: null, loading: true, error: null })
  useEffect(() => {
    let active = true
    setState({ topics: [], topic: null, loading: Boolean(chapterId), error: null })
    if (!chapterId) return () => { active = false }
    const list = supabase.from('chapter_topics').select('id,chapter_id,title,slug,sort_order,word_count')
      .eq('chapter_id', chapterId).eq('status', 'published').order('sort_order').order('id')
    const detail = topicSlug
      ? supabase.from('chapter_topics').select('id,title,slug,summary_html,word_count,source_book,source_section,source_page_start,source_page_end')
        .eq('chapter_id', chapterId).eq('slug', topicSlug).eq('status', 'published').maybeSingle()
      : Promise.resolve({ data: null, error: null })
    Promise.all([list, detail]).then(([topics, topic]) => {
      if (topics.error || topic.error) throw topics.error || topic.error
      if (active) setState({ topics: topics.data || [], topic: topic.data, loading: false, error: null })
    }).catch(error => { if (active) setState({ topics: [], topic: null, loading: false, error }) })
    return () => { active = false }
  }, [chapterId, topicSlug, revision])
  return { ...state, reload: () => setRevision(value => value + 1) }
}
