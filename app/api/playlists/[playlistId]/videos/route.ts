import { NextRequest } from 'next/server'
import { forwardToApi } from 'app/lib/api-proxy'

type Params = { params: Promise<{ playlistId: string }> }

// { videoId } → appended at the end of the playlist (adding twice is a no-op)
export async function POST(request: NextRequest, { params }: Params) {
  const { playlistId } = await params
  return forwardToApi(request, `/api/v1/playlists/${encodeURIComponent(playlistId)}/videos`, {
    method: 'POST',
    body: await request.text(),
  })
}
