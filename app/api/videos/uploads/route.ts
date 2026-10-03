import { NextRequest } from 'next/server'
import { forwardToApi } from './proxy'

// Starts the multipart upload: the API answers with one presigned R2 URL per part
export async function POST(request: NextRequest) {
  const body = await request.text()
  return forwardToApi(request, '/api/v1/videos/uploads', { method: 'POST', body })
}
