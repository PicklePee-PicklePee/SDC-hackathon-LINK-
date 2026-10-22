import { useCallback, useEffect, useRef, useState } from 'react'

export async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export function useApi(path, interval = 0) {
  const [state, setState] = useState({ key: path, data: null, error: '', loading: Boolean(path) })
  const sequence = useRef(0)
  const currentPath = useRef(path)
  currentPath.current = path
  const reload = useCallback(async () => {
    const id = ++sequence.current
    if (!path) { setState({ key: path, data: null, error: '', loading: false }); return }
    try {
      const data = await request(path)
      if (id === sequence.current && currentPath.current === path) setState({ key: path, data, error: '', loading: false })
    } catch (error) {
      if (id === sequence.current && currentPath.current === path) setState(old => ({ key: path, data: old.key === path ? old.data : null, error: error.message, loading: false }))
    }
  }, [path])
  useEffect(() => {
    reload()
    const timer = interval ? setInterval(reload, interval) : null
    return () => { sequence.current++; if (timer) clearInterval(timer) }
  }, [reload, interval])
  return { ...(state.key === path ? state : { data: null, error: '', loading: Boolean(path) }), reload }
}
