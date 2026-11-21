import { NextRequest, NextResponse } from 'next/server'
import { mapApiPostToFrontPost, type ApiPost } from 'app/lib/posts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'

const MIN_QUERY_LENGTH = 3
const MAX_QUERY_LENGTH = 100
const MAX_RESULTS = 8
const SNIPPET_RADIUS = 80

// lowercase + no accents, so "configuracao" finds "configuração"
function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Markdown noise out of the way: code fences, images, link urls and formatting characters
function toPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function snippetAround(plain: string, normalizedPlain: string, term: string) {
  const index = normalizedPlain.indexOf(term)
  if (index < 0) return ''
  const start = Math.max(0, index - SNIPPET_RADIUS)
  const end = Math.min(plain.length, index + term.length + SNIPPET_RADIUS)
  return `${start > 0 ? '…' : ''}${plain.slice(start, end).trim()}${end < plain.length ? '…' : ''}`
}

export async function GET(request: NextRequest) {
  const query = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH)

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Digite pelo menos ${MIN_QUERY_LENGTH} caracteres.` },
      { status: 400 }
    )
  }

  try {
    // The posts change rarely: a minute of cache keeps typing from hammering the API
    const response = await fetch(`${API_BASE_URL}/api/v1/posts`, { next: { revalidate: 60 } })
    if (!response.ok) {
      return NextResponse.json({ error: 'Não foi possível buscar os posts.' }, { status: 502 })
    }

    const apiPosts = ((await response.json()) as ApiPost[] | null) ?? []
    const terms = normalize(query).split(/\s+/).filter(Boolean)

    const results = apiPosts
      .map(mapApiPostToFrontPost)
      .filter((post) => post.status === 'completed')
      .map((post) => {
        const title = normalize(post.title)
        const tags = normalize(post.tags.join(' '))
        const summary = normalize(`${post.subtitle ?? ''} ${post.summary}`)
        const plainContent = toPlainText(post.content ?? '')
        const content = normalize(plainContent)

        // Every word has to show up somewhere in the post; title and tags weigh the most
        let score = 0
        for (const term of terms) {
          const termScore =
            (title.includes(term) ? 10 : 0) +
            (tags.includes(term) ? 6 : 0) +
            (summary.includes(term) ? 3 : 0) +
            (content.includes(term) ? 1 : 0)
          if (termScore === 0) return null
          score += termScore
        }

        const snippetTerm = terms.find((term) => content.includes(term))
        return {
          score,
          date: post.date,
          result: {
            id: post.id,
            title: post.title,
            path: post.path,
            tags: post.tags,
            snippet: snippetTerm
              ? snippetAround(plainContent, content, snippetTerm)
              : post.summary.slice(0, 160),
          },
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
      .slice(0, MAX_RESULTS)
      .map((item) => item.result)

    return NextResponse.json(results, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conectar à API de backend.' },
      { status: 500 }
    )
  }
}
