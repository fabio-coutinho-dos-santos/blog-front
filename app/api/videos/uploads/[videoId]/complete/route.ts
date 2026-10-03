import { NextRequest } from 'next/server'
import { forwardToApi } from 'app/lib/api-proxy'

// Joins the parts in R2 and publishes video.uploaded for the encoder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params
  const body = await request.text()
  return forwardToApi(request, `/api/v1/videos/uploads/${encodeURIComponent(videoId)}/complete`, {
    method: 'POST',
    body,
  })
}
