import { NextRequest } from 'next/server'
import { forwardToApi } from 'app/lib/api-proxy'

// Cancels the upload and discards the parts already sent to R2
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params
  const uploadId = request.nextUrl.searchParams.get('uploadId') || ''
  return forwardToApi(
    request,
    `/api/v1/videos/uploads/${encodeURIComponent(videoId)}?uploadId=${encodeURIComponent(uploadId)}`,
    { method: 'DELETE' }
  )
}
