'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 1000

type SearchResult = {
  id: string
  title: string
  path: string
  tags: string[]
  snippet: string
}

type Status = 'idle' | 'loading' | 'done' | 'error'

// Search icon in the header; opens a modal that searches the posts' text through
// /api/posts/text-search. The request only fires after the person stops typing for 1 second
// and the query has at least 3 characters.
const SearchButton = () => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [results, setResults] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = query.trim()
  const searchable = trimmed.length >= MIN_QUERY_LENGTH

  const close = () => {
    setOpen(false)
    setQuery('')
    setResults([])
    setStatus('idle')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      } else if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!searchable) {
      setResults([])
      setStatus('idle')
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setStatus('loading')
      try {
        const response = await fetch(`/api/posts/text-search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(String(response.status))
        setResults((await response.json()) as SearchResult[])
        setStatus('done')
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setStatus('error')
      }
    }, DEBOUNCE_MS)

    // typing again cancels the wait and any request still in flight
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed, searchable])

  return (
    <>
      <button type="button" aria-label="Buscar nos posts" onClick={() => setOpen(true)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="hover:text-primary-500 dark:hover:text-primary-400 h-6 w-6 text-gray-900 dark:text-gray-100"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </button>

      {open && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar nos posts"
            className="w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nos posts…"
              aria-label="Buscar nos posts"
              className="w-full border-b border-gray-200 bg-transparent px-4 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 dark:border-gray-700 dark:text-gray-100"
            />

            <div className="max-h-[60vh] overflow-y-auto" aria-live="polite">
              {!searchable && (
                <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                  {trimmed.length === 0
                    ? `Digite pelo menos ${MIN_QUERY_LENGTH} letras para buscar.`
                    : `Mais ${MIN_QUERY_LENGTH - trimmed.length} caractere(s) para buscar.`}
                </p>
              )}
              {searchable && status === 'idle' && (
                <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">Buscando…</p>
              )}
              {status === 'loading' && (
                <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">Buscando…</p>
              )}
              {status === 'error' && (
                <p className="px-4 py-6 text-sm text-red-600 dark:text-red-400">
                  Não foi possível buscar agora. Tente novamente.
                </p>
              )}
              {status === 'done' && results.length === 0 && (
                <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                  Nenhum post encontrado para “{trimmed}”.
                </p>
              )}
              {status === 'done' && results.length > 0 && (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {results.map((result) => (
                    <li key={result.id}>
                      <Link
                        href={`/${result.path}`}
                        onClick={close}
                        className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <span className="block font-semibold text-gray-900 dark:text-gray-100">
                          {result.title}
                        </span>
                        {result.snippet && (
                          <span className="mt-1 line-clamp-2 block text-sm text-gray-500 dark:text-gray-400">
                            {result.snippet}
                          </span>
                        )}
                        {result.tags.length > 0 && (
                          <span className="text-primary-500 mt-1 block text-xs font-semibold tracking-wide uppercase">
                            {result.tags.join(' · ')}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SearchButton
