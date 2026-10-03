// Browser-side calls for playlists (through the Next /api/playlists proxy routes)
import type { ApiPlaylist } from './videos'

async function request<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(data?.error || `Erro ${response.status} na API.`)
  }
  return data as T
}

export function listPlaylists() {
  return request<ApiPlaylist[]>('/api/playlists')
}

export function createPlaylist(
  accessToken: string,
  input: { title: string; description?: string; postId?: string }
) {
  return request<ApiPlaylist>(
    '/api/playlists',
    { method: 'POST', body: JSON.stringify(input) },
    accessToken
  )
}

export function addVideoToPlaylist(accessToken: string, playlistId: string, videoId: string) {
  return request<null>(
    `/api/playlists/${encodeURIComponent(playlistId)}/videos`,
    { method: 'POST', body: JSON.stringify({ videoId }) },
    accessToken
  )
}

export function removeVideoFromPlaylist(accessToken: string, playlistId: string, videoId: string) {
  return request<null>(
    `/api/playlists/${encodeURIComponent(playlistId)}/videos/${encodeURIComponent(videoId)}`,
    { method: 'DELETE' },
    accessToken
  )
}
