import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const RESOURCE_LABELS = {
  summary: ['📄', 'Chapter Summary', 'Quick revision notes'],
  notes: ['📚', 'Chapter Notes', 'Detailed study notes'],
  worksheet: ['📝', 'Worksheet', 'Print-friendly practice questions'],
  worksheet_answer_key: ['✅', 'Worksheet Answer Key', 'Answers for the worksheet'],
  source_pdf: ['📖', 'Source Material', 'Reference material'],
  test_paper: ['🧪', 'Test Paper', 'Practice test'],
  test_answer_key: ['✅', 'Test Answer Key', 'Answers for the test'],
  other: ['📎', 'Learning Resource', 'Additional study material'],
}

export function resourcePresentation(resource) {
  const [icon, fallbackTitle, subtitle] = RESOURCE_LABELS[resource.resource_type] || RESOURCE_LABELS.other
  return { icon, title: resource.title || fallbackTitle, subtitle: resource.description || subtitle }
}

export function useSubjects() {
  return useCatalogQuery(async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, parent_subject_id, name, slug, description, color, emoji, sort_order, legacy_id')
      .eq('status', 'published')
      .order('sort_order')
    if (error) throw error

    const rows = data || []
    return rows.map(subject => ({
      ...subject,
      parent: rows.find(candidate => candidate.id === subject.parent_subject_id) || null,
      children: rows.filter(candidate => candidate.parent_subject_id === subject.id),
    }))
  }, [])
}

export function useSubjectChapters(subjectSlug) {
  return useCatalogQuery(async () => {
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, parent_subject_id, name, slug, color, emoji, legacy_id')
      .or(`slug.eq.${subjectSlug},legacy_id.eq.${subjectSlug}`)
      .eq('status', 'published')
      .maybeSingle()
    if (subjectError) throw subjectError
    if (!subject) return null

    const [{ data: chapters, error: chapterError }, { data: parent, error: parentError }] = await Promise.all([
      supabase
        .from('chapters')
        .select('id, subject_id, chapter_number, title, slug, description, sort_order, legacy_id, content_resources(id, resource_type, title, description, current_version, content_resource_versions(id, version, storage_path, mime_type))')
        .eq('subject_id', subject.id)
        .eq('status', 'published')
        .order('sort_order'),
      subject.parent_subject_id
        ? supabase.from('subjects').select('id, name, slug').eq('id', subject.parent_subject_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    if (chapterError) throw chapterError
    if (parentError) throw parentError
    return { ...subject, parent, chapters: chapters || [] }
  }, [subjectSlug])
}

export function useChapter(subjectSlug, chapterKey) {
  const state = useSubjectChapters(subjectSlug)
  return {
    ...state,
    data: state.data
      ? {
          subject: state.data,
          chapter: state.data.chapters.find(chapter => chapter.legacy_id === chapterKey || chapter.slug === chapterKey || chapter.id === chapterKey) || null,
        }
      : null,
  }
}

export async function createLearningContentUrl(storagePath, expiresIn = 900) {
  const { data, error } = await supabase.storage
    .from('learning-content')
    .createSignedUrl(storagePath, expiresIn)
  if (error) throw error
  return data.signedUrl
}

function useCatalogQuery(query, dependencies) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const reload = useCallback(() => {
    let active = true
    setState(current => ({ ...current, loading: true, error: null }))
    query()
      .then(data => active && setState({ data, loading: false, error: null }))
      .catch(error => active && setState({ data: null, loading: false, error }))
    return () => { active = false }
  // query is intentionally defined by the caller; dependencies control reloads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  useEffect(() => reload(), [reload])
  return { ...state, reload }
}

