'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from 'app/context/auth-context'
import { buildR2ImageUrl, getPosts, type FrontPost } from 'app/lib/posts'
import Image from '@/components/Image'

type EditablePost = FrontPost & {
  subtitle?: string
  imageFile?: File | null
  tagsInput?: string
}

async function parseJsonSafe(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export default function ManagePostsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { accessToken, isAuthenticated } = useAuth()
  const selectedPostId = searchParams.get('postId')

  const [posts, setPosts] = useState<EditablePost[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    const load = async () => {
      setLoading(true)
      const data = await getPosts()
      setPosts(
        data.map((post) => ({
          ...post,
          tagsInput: post.tags.join(','),
        }))
      )
      setLoading(false)
    }

    load()
  }, [isAuthenticated, router])

  const visiblePosts = useMemo(() => {
    if (!selectedPostId) return posts
    return posts.filter((post) => post.id === selectedPostId)
  }, [posts, selectedPostId])

  const hasPosts = useMemo(() => visiblePosts.length > 0, [visiblePosts])

  const updateField = (id: string, field: keyof EditablePost, value: string) => {
    setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, [field]: value } : post)))
  }

  const handleUpdate = async (post: EditablePost) => {
    if (!accessToken) return
    setSavingId(post.id)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('title', post.title)
      formData.append('summary', post.summary || '')
      formData.append('subtitle', post.summary || '')
      formData.append('content', post.content || '')
      formData.append('tags', post.tagsInput || '')
      if (post.imageFile) {
        formData.append('image', post.imageFile)
      }

      const response = await fetch(`/api/posts?postId=${post.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const data = await parseJsonSafe(response)
      if (!response.ok) {
        setError((data as { error?: string } | null)?.error || 'Não foi possível atualizar o post.')
        return
      }

      setSuccess(`Post "${post.title}" atualizado com sucesso.`)
      router.push('/blog')
    } catch {
      setError('Não foi possível conectar à API.')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (post: EditablePost) => {
    if (!accessToken) return
    const confirmed = window.confirm(`Excluir o post "${post.title}"?`)
    if (!confirmed) return

    setDeletingId(post.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/posts?postId=${post.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await parseJsonSafe(response)
      if (!response.ok) {
        setError((data as { error?: string } | null)?.error || 'Não foi possível excluir o post.')
        return
      }

      setPosts((prev) => prev.filter((item) => item.id !== post.id))
      setSuccess(`Post "${post.title}" excluído com sucesso.`)
      router.push('/blog')
    } catch {
      setError('Não foi possível conectar à API.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="mx-auto max-w-4xl py-10">
      <div className="from-primary-100 to-primary-50 dark:from-primary-500/20 dark:to-primary-600/5 mb-6 rounded-2xl border border-gray-200 bg-gradient-to-br p-6 dark:border-gray-800">
        <p className="text-primary-400 text-sm font-semibold tracking-wide uppercase">
          Área Administrativa
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
          Gerenciar Posts
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Atualize o conteúdo ou exclua posts permanentemente.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
          {success}
        </p>
      )}

      {loading && <p className="text-gray-600 dark:text-gray-400">Carregando posts...</p>}

      {!loading && !hasPosts && (
        <p className="text-gray-600 dark:text-gray-400">Nenhum post encontrado.</p>
      )}

      <div className="space-y-6">
        {visiblePosts.map((post) => (
          <div
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900/70 dark:shadow-none"
            key={post.id}
          >
            <label
              htmlFor={`title-${post.id}`}
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Título
            </label>
            <input
              id={`title-${post.id}`}
              value={post.title}
              onChange={(e) => updateField(post.id, 'title', e.target.value)}
              className="focus:ring-primary-500 mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />

            <label
              htmlFor={`summary-${post.id}`}
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Resumo
            </label>
            <textarea
              id={`summary-${post.id}`}
              rows={4}
              value={post.summary || ''}
              onChange={(e) => updateField(post.id, 'summary', e.target.value)}
              className="focus:ring-primary-500 mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />

            <label
              htmlFor={`tags-${post.id}`}
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Tags (separadas por vírgula)
            </label>
            <input
              id={`tags-${post.id}`}
              value={post.tagsInput || ''}
              onChange={(e) =>
                setPosts((prev) =>
                  prev.map((item) =>
                    item.id === post.id
                      ? {
                          ...item,
                          tagsInput: e.target.value,
                        }
                      : item
                  )
                )
              }
              className="focus:ring-primary-500 mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />

            <label
              htmlFor={`content-${post.id}`}
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Conteúdo
            </label>
            <textarea
              id={`content-${post.id}`}
              rows={8}
              value={post.content || ''}
              onChange={(e) => updateField(post.id, 'content', e.target.value)}
              className="focus:ring-primary-500 mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-gray-900 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />

            <label
              htmlFor={`image-${post.id}`}
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Atualizar imagem (opcional)
            </label>
            {post.imagePath && (
              <div className="mb-3">
                <Image
                  src={buildR2ImageUrl(post.imagePath) || ''}
                  alt={`Imagem atual de ${post.title}`}
                  width={320}
                  height={180}
                  className="h-auto w-full max-w-xs rounded-md object-cover"
                />
              </div>
            )}
            <input
              id={`image-${post.id}`}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={(e) =>
                setPosts((prev) =>
                  prev.map((item) =>
                    item.id === post.id ? { ...item, imageFile: e.target.files?.[0] || null } : item
                  )
                )
              }
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:file:bg-gray-800 dark:file:text-gray-200"
            />

            <div className="flex gap-3">
              <button
                onClick={() => handleUpdate(post)}
                disabled={savingId === post.id || deletingId === post.id}
                className="bg-primary-500 hover:bg-primary-600 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {savingId === post.id ? 'Salvando...' : 'Atualizar'}
              </button>
              <button
                onClick={() => handleDelete(post)}
                disabled={deletingId === post.id || savingId === post.id}
                className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
              >
                {deletingId === post.id ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
