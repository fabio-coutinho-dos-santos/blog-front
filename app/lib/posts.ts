export type ApiPost = {
  id: string
  title: string
  subtitle?: string
  summary?: string
  content: string
  tags: string[]
  author?: {
    id: number
    name: string
    image_path: string
  }
  image_path: string
  created_at: string
  updated_at: string
}

export type FrontPost = {
  id: string
  title: string
  summary: string
  content?: string
  tags: string[]
  date: string
  imagePath?: string
  author?: {
    id: number
    name: string
    imagePath: string
  }
  path?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'

function mapApiPost(post: ApiPost): FrontPost {
  return {
    id: post.id,
    title: post.title,
    summary: post.summary || post.subtitle || post.content?.slice(0, 220) || '',
    content: post.content,
    tags: post.tags || [],
    date: post.created_at,
    imagePath: post.image_path,
    author: post.author
      ? {
          id: post.author.id,
          name: post.author.name,
          imagePath: post.author.image_path,
        }
      : undefined,
    path: `blog/${post.id}`,
  }
}

export function mapApiPostToFrontPost(post: ApiPost): FrontPost {
  return mapApiPost(post)
}

export async function getPosts(): Promise<FrontPost[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/posts`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as ApiPost[]
    return data.map(mapApiPost)
  } catch {
    return []
  }
}

export function buildR2ImageUrl(imagePath?: string): string | null {
  if (!imagePath) return null
  const base = 'https://r2-cdn.procode-tech.com'
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${base}${normalizedPath}`
}
