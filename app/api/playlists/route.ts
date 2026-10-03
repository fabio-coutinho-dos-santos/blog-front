import { NextRequest } from 'next/server'
import { forwardToApi } from 'app/lib/api-proxy'

export async function GET(request: NextRequest) {
  return forwardToApi(request, '/api/v1/playlists', { method: 'GET' })
}

// { title, description?, postId? } → the new playlist
export async function POST(request: NextRequest) {
  return forwardToApi(request, '/api/v1/playlists', { method: 'POST', body: await request.text() })
}
