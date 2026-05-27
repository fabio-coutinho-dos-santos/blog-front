import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'

async function parseResponseBody(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function toNextResponse(response: Response) {
  const status = response.status
  if (status === 204 || status === 205 || status === 304) {
    return new NextResponse(null, { status })
  }

  const data = await parseResponseBody(response)
  if (data === null) {
    return new NextResponse(null, { status })
  }

  return NextResponse.json(data, { status })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const authHeader = request.headers.get('authorization') || ''

    const response = await fetch(`${API_BASE_URL}/api/v1/posts`, {
      method: 'POST',
      headers: authHeader ? { Authorization: authHeader } : undefined,
      body: formData,
      cache: 'no-store',
    })

    return await toNextResponse(response)
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conectar à API de backend.' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const postId = url.searchParams.get('postId')
    const authHeader = request.headers.get('authorization') || ''
    const contentType = request.headers.get('content-type') || ''

    if (!postId) {
      return NextResponse.json({ error: 'Parâmetro postId ausente na consulta.' }, { status: 400 })
    }

    let response: Response

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}`, {
        method: 'PUT',
        headers: authHeader ? { Authorization: authHeader } : undefined,
        body: formData,
        cache: 'no-store',
      })
    } else {
      const body = await request.json()
      response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
    }

    return await toNextResponse(response)
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conectar à API de backend.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const postId = url.searchParams.get('postId')
    const authHeader = request.headers.get('authorization') || ''
    if (!postId) {
      return NextResponse.json({ error: 'Parâmetro postId ausente na consulta.' }, { status: 400 })
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: 'no-store',
    })

    return await toNextResponse(response)
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conectar à API de backend.' },
      { status: 500 }
    )
  }
}
