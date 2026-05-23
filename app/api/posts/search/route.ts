import { NextRequest, NextResponse } from 'next/server'
import { mapApiPostToFrontPost, type ApiPost } from 'app/lib/posts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const tag = url.searchParams.get('tag') || ''

    if (!tag.trim()) {
      return NextResponse.json({ error: 'Missing tag query param.' }, { status: 400 })
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/posts/search?tag=${encodeURIComponent(tag.trim())}`,
      { cache: 'no-store' }
    )

    const text = await response.text()
    const data = text ? (JSON.parse(text) as ApiPost[]) : []

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data.map(mapApiPostToFrontPost), { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Could not connect to backend API.' }, { status: 500 })
  }
}
