import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'

// Starts the multipart upload: forwards the metadata + cover (multipart/form-data);
// the API answers with one presigned R2 URL per part
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const authHeader = request.headers.get('authorization') || ''

    const response = await fetch(`${API_BASE_URL}/api/v1/videos/uploads`, {
      method: 'POST',
      headers: authHeader ? { Authorization: authHeader } : undefined,
      body: formData,
      cache: 'no-store',
    })

    const text = await response.text()
    return NextResponse.json(text ? JSON.parse(text) : null, { status: response.status })
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conectar à API de backend.' },
      { status: 500 }
    )
  }
}
