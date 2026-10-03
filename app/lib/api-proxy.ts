import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'

// Forwards small JSON requests (and the Authorization header) to the Go API.
// Video bytes never go through here: the browser PUTs them straight to R2.
export async function forwardToApi(
  request: NextRequest,
  path: string,
  init: { method: string; body?: string }
) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: init.body,
      cache: 'no-store',
    })

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    const text = await response.text()
    const data = text ? JSON.parse(text) : null
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conectar à API de backend.' },
      { status: 500 }
    )
  }
}
