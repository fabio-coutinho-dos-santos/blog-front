import { buildR2ImageUrl } from './posts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
const CDN_URL = 'https://r2-cdn.procode-tech.com'

export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'failed'

export type ApiVideo = {
  id: string
  title: string
  description: string
  postId?: string
  // Uploaded cover, or the post image as fallback (resolved by the API)
  coverPath?: string
  status: VideoStatus
  hlsPath?: string
  durationSec?: number
  createdAt: string
}

export type ApiPlaylist = {
  id: string
  title: string
  description: string
  postId?: string
  items: { videoId: string; position: number }[]
  createdAt: string
}

export type ApiPlaylistView = ApiPlaylist & { videos: ApiVideo[] }

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function getVideos(): Promise<ApiVideo[]> {
  return (await getJson<ApiVideo[]>('/api/v1/videos')) || []
}

export async function getVideo(id: string): Promise<ApiVideo | null> {
  return getJson<ApiVideo>(`/api/v1/videos/${encodeURIComponent(id)}`)
}

export async function getPlaylists(): Promise<ApiPlaylist[]> {
  return (await getJson<ApiPlaylist[]>('/api/v1/playlists')) || []
}

export async function getPlaylist(id: string): Promise<ApiPlaylistView | null> {
  return getJson<ApiPlaylistView>(`/api/v1/playlists/${encodeURIComponent(id)}`)
}

export function isPlayable(video: ApiVideo) {
  return video.status === 'ready'
}

// The consumer writes every video to videos/converted/<id>/master.m3u8
export function videoStreamUrl(video: Pick<ApiVideo, 'id' | 'hlsPath'>) {
  return `${CDN_URL}/${video.hlsPath || `videos/converted/${video.id}/master.m3u8`}`
}

export function videoCoverUrl(video: Pick<ApiVideo, 'coverPath'>) {
  return buildR2ImageUrl(video.coverPath)
}

export function formatDuration(seconds?: number) {
  if (!seconds) return ''
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
