import { NextRequest } from 'next/server'
import { forwardToApi } from 'app/lib/api-proxy'

type Params = { params: Promise<{ playlistId: string; videoId: string }> }

export async function DELETE(request: NextRequest, { params }: Params) {
  const { playlistId, videoId } = await params
  return forwardToApi(
    request,
    `/api/v1/playlists/${encodeURIComponent(playlistId)}/videos/${encodeURIComponent(videoId)}`,
    { method: 'DELETE' }
  )
}
