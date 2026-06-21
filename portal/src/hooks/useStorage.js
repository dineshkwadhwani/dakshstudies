import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'daksh_portal_v1'

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Storage write failed', e)
  }
}

export function usePersisted(key, defaultValue) {
  const [value, setValue] = useState(() => {
    const all = readAll()
    return key in all ? all[key] : defaultValue
  })
  useEffect(() => {
    const all = readAll()
    all[key] = value
    writeAll(all)
  }, [key, value])
  return [value, setValue]
}

export function getStored(key, fallback) {
  const all = readAll()
  return key in all ? all[key] : fallback
}

export function setStored(key, value) {
  const all = readAll()
  all[key] = value
  writeAll(all)
  window.dispatchEvent(new CustomEvent('daksh:storage', { detail: { key } }))
}

export function useStoredReactive(key, defaultValue) {
  const [value, setValueLocal] = useState(() => getStored(key, defaultValue))
  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.key === key || e?.detail?.key === '*') {
        setValueLocal(getStored(key, defaultValue))
      }
    }
    window.addEventListener('daksh:storage', handler)
    return () => window.removeEventListener('daksh:storage', handler)
  }, [key, defaultValue])
  const setValue = useCallback((v) => {
    const next = typeof v === 'function' ? v(getStored(key, defaultValue)) : v
    setStored(key, next)
    setValueLocal(next)
  }, [key, defaultValue])
  return [value, setValue]
}

export function clearAllStorage() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('daksh:storage', { detail: { key: '*' } }))
}
