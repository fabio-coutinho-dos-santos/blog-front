'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from 'app/context/auth-context'
import { buildR2ImageUrl } from 'app/lib/posts'
import { addVideoToPlaylist, createPlaylist, listPlaylists } from 'app/lib/playlists-client'
import type { ApiPlaylist } from 'app/lib/videos'
import {
  UploadCancelledError,
  UploadProgress,
  uploadVideoMultipart,
} from 'app/lib/multipart-upload'

const MAX_SIZE = 5 * 1024 * 1024 * 1024 // same limit as the API (5 GiB)
const MAX_COVER_SIZE = 5 * 1024 * 1024 // same as the API image validator

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

type Status = 'idle' | 'uploading' | 'done' | 'error' | 'cancelled'

type PostOption = { id: string; title: string; imagePath?: string }

// Value of the playlist select that reveals the "new playlist" fields
const NEW_PLAYLIST = '__new__'

export default function UploadVideoPage() {
  const router = useRouter()
  const { accessToken, isAuthenticated } = useAuth()

  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [postId, setPostId] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [posts, setPosts] = useState<PostOption[]>([])
  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([])
  const [playlistChoice, setPlaylistChoice] = useState('')
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('')
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('')
  const [playlistResult, setPlaylistResult] = useState<{ ok: boolean; message: string } | null>(
    null
  )
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [partSize, setPartSize] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [videoId, setVideoId] = useState('')
  const [error, setError] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const speedRef = useRef({ time: 0, bytes: 0 })

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  // Posts the video can be attached to (optional)
  useEffect(() => {
    fetch('/api/posts')
      .then((response) => (response.ok ? response.json() : []))
      .then((data: { id: string; title: string; image_path?: string }[]) =>
        setPosts(
          Array.isArray(data)
            ? data.map(({ id, title, image_path }) => ({ id, title, imagePath: image_path }))
            : []
        )
      )
      .catch(() => setPosts([]))
  }, [])

  useEffect(() => {
    listPlaylists()
      .then(setPlaylists)
      .catch(() => setPlaylists([]))
  }, [])

  // Runs after the upload completed, so a failed/cancelled upload never leaves an
  // empty playlist or a reference to a video that doesn't exist
  const attachToPlaylist = async (token: string, uploadedVideoId: string) => {
    if (!playlistChoice) return
    try {
      let playlistId = playlistChoice
      let playlistTitle = playlists.find((p) => p.id === playlistChoice)?.title || ''
      if (playlistChoice === NEW_PLAYLIST) {
        const created = await createPlaylist(token, {
          title: newPlaylistTitle,
          description: newPlaylistDescription,
        })
        playlistId = created.id
        playlistTitle = created.title
        setPlaylists((current) => [created, ...current])
        setPlaylistChoice(created.id)
        setNewPlaylistTitle('')
        setNewPlaylistDescription('')
      }
      await addVideoToPlaylist(token, playlistId, uploadedVideoId)
      setPlaylistResult({ ok: true, message: `Adicionado à playlist "${playlistTitle}".` })
    } catch (err) {
      setPlaylistResult({
        ok: false,
        message: `O vídeo foi enviado, mas não entrou na playlist: ${
          err instanceof Error ? err.message : 'erro desconhecido'
        }. Use "Adicionar à playlist" na página do vídeo.`,
      })
    }
  }

  // Local preview of the chosen cover; the object URL is released when it changes
  useEffect(() => {
    if (!cover) {
      setCoverPreview('')
      return
    }
    const url = URL.createObjectURL(cover)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [cover])

  const selectedPost = posts.find((post) => post.id === postId)

  // Warn before closing the tab in the middle of an upload
  useEffect(() => {
    if (status !== 'uploading') return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [status])

  const handleProgress = (next: UploadProgress) => {
    setProgress(next)
    const now = performance.now()
    const last = speedRef.current
    if (now - last.time >= 1000) {
      setSpeed(((next.uploadedBytes - last.bytes) / (now - last.time)) * 1000)
      speedRef.current = { time: now, bytes: next.uploadedBytes }
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accessToken) {
      setError('Token de acesso ausente. Faça login novamente.')
      return
    }
    if (!file) {
      setError('Selecione um vídeo.')
      return
    }
    if (!title.trim()) {
      setError('Título obrigatório.')
      return
    }
    if (playlistChoice === NEW_PLAYLIST && !newPlaylistTitle.trim()) {
      setError('Dê um título para a nova playlist.')
      return
    }
    if (!postId && !cover) {
      setError('Envie uma imagem de capa (ou escolha um post para usar a imagem dele).')
      return
    }
    if (cover && cover.size > MAX_COVER_SIZE) {
      setError(`A capa tem ${formatBytes(cover.size)}. O limite é 5 MB.`)
      return
    }
    if (file.size > MAX_SIZE) {
      setError(`O vídeo tem ${formatBytes(file.size)}. O limite é ${formatBytes(MAX_SIZE)}.`)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    speedRef.current = { time: performance.now(), bytes: 0 }

    setStatus('uploading')
    setError('')
    setPlaylistResult(null)
    setVideoId('')
    setSpeed(0)
    setProgress({ uploadedBytes: 0, totalBytes: file.size, completedParts: 0, totalParts: 0 })

    try {
      const result = await uploadVideoMultipart(file, {
        accessToken,
        metadata: {
          title,
          description,
          postId: postId || undefined,
          cover: cover || undefined,
        },
        signal: controller.signal,
        onStarted: (info) => {
          setVideoId(info.videoId)
          setPartSize(info.partSize)
        },
        onProgress: handleProgress,
      })
      setVideoId(result.videoId)
      await attachToPlaylist(accessToken, result.videoId)
      setStatus('done')
      // Clear the file so the same video isn't uploaded (and encoded) twice by accident
      setFile(null)
      setCover(null)
      setFileInputKey((key) => key + 1)
    } catch (err) {
      if (err instanceof UploadCancelledError) {
        setStatus('cancelled')
      } else {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Falha no upload.')
      }
    } finally {
      abortRef.current = null
    }
  }

  if (!isAuthenticated) return null

  const percent = progress?.totalBytes
    ? Math.round((progress.uploadedBytes / progress.totalBytes) * 100)
    : 0
  const remaining =
    speed > 0 && progress ? (progress.totalBytes - progress.uploadedBytes) / speed : 0
  const uploading = status === 'uploading'

  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="from-primary-100 to-primary-50 dark:from-primary-500/20 dark:to-primary-600/5 mb-6 rounded-2xl border border-gray-200 bg-gradient-to-br p-6 dark:border-gray-800">
        <p className="text-primary-400 text-sm font-semibold tracking-wide uppercase">
          Área Administrativa
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Enviar Vídeo</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          O vídeo vai direto para o R2 em partes e depois é convertido para HLS (360p, 720p e
          1080p).
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-900/70 dark:shadow-black/20"
      >
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Título
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={uploading}
            className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={uploading}
            className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="post"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Post relacionado (opcional)
          </label>
          <select
            id="post"
            value={postId}
            onChange={(e) => setPostId(e.target.value)}
            disabled={uploading}
            className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
          >
            <option value="">Nenhum</option>
            {posts.map((post) => (
              <option key={post.id} value={post.id}>
                {post.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="playlist"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Playlist (opcional)
          </label>
          <select
            id="playlist"
            value={playlistChoice}
            onChange={(e) => setPlaylistChoice(e.target.value)}
            disabled={uploading}
            className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
          >
            <option value="">Nenhuma</option>
            {playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.title} ({playlist.items.length})
              </option>
            ))}
            <option value={NEW_PLAYLIST}>+ Nova playlist…</option>
          </select>
          {playlistChoice === NEW_PLAYLIST && (
            <div className="mt-3 space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <input
                type="text"
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                placeholder="Título da playlist"
                aria-label="Título da nova playlist"
                required
                disabled={uploading}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <input
                type="text"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Descrição (opcional)"
                aria-label="Descrição da nova playlist"
                disabled={uploading}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                A playlist é criada quando o upload terminar.
              </p>
            </div>
          )}
        </div>
        <div>
          <label
            htmlFor="cover"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Capa {selectedPost ? '(opcional)' : ''}
          </label>
          <input
            key={`cover-${fileInputKey}`}
            id="cover"
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            required={!selectedPost}
            disabled={uploading}
            onChange={(e) => setCover(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:file:bg-gray-800 dark:file:text-gray-200"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {selectedPost
              ? 'Se enviar uma capa, ela é a oficial. Sem capa, usa a imagem do post.'
              : 'Obrigatória quando o vídeo não tem post.'}{' '}
            png ou jpg, máx. 5 MB.
          </p>
          {(coverPreview || buildR2ImageUrl(selectedPost?.imagePath)) && (
            <figure className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview || buildR2ImageUrl(selectedPost?.imagePath) || ''}
                alt="Capa que o vídeo vai usar"
                className="h-32 w-56 rounded-md object-cover"
              />
              <figcaption className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {coverPreview
                  ? 'Capa enviada (oficial)'
                  : `Imagem do post "${selectedPost?.title}" (fallback)`}
              </figcaption>
            </figure>
          )}
        </div>
        <div>
          <label
            htmlFor="video"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Vídeo (mp4, mov, webm - máx. 5 GB)
          </label>
          <input
            key={fileInputKey}
            id="video"
            type="file"
            accept="video/*"
            required
            disabled={uploading}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null)
              setStatus('idle')
              setProgress(null)
              setError('')
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:file:bg-gray-800 dark:file:text-gray-200"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
        </div>

        {progress && status !== 'idle' && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{percent}%</span>
              <span className="text-gray-500 tabular-nums dark:text-gray-400">
                {formatBytes(progress.uploadedBytes)} de {formatBytes(progress.totalBytes)}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="bg-primary-500 h-full rounded-full transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-gray-500 tabular-nums dark:text-gray-400">
              <span>
                Partes: {progress.completedParts} de {progress.totalParts || '…'}
                {partSize > 0 && ` (${formatBytes(partSize)} cada)`}
              </span>
              {uploading && speed > 0 && (
                <span>
                  {formatBytes(speed)}/s · faltam ~{Math.max(1, Math.round(remaining))}s
                </span>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-md bg-red-500/10 p-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
        {status === 'cancelled' && (
          <p className="rounded-md bg-gray-500/10 p-2 text-sm text-gray-700 dark:text-gray-300">
            Upload cancelado. As partes já enviadas foram descartadas.
          </p>
        )}
        {status === 'done' && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
            <p>Vídeo enviado. A conversão para HLS começou e pode levar alguns minutos.</p>
            {playlistResult && (
              <p
                className={`mt-1 ${playlistResult.ok ? '' : 'text-amber-700 dark:text-amber-300'}`}
              >
                {playlistResult.message}
              </p>
            )}
            <p className="mt-1">
              ID: <code className="text-xs">{videoId}</code> ·{' '}
              <Link href={`/video?id=${videoId}`} className="font-semibold underline">
                Abrir no player
              </Link>
            </p>
          </div>
        )}

        {uploading ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancelar upload
          </button>
        ) : (
          <button
            type="submit"
            disabled={!file}
            className="bg-primary-500 hover:bg-primary-600 w-full rounded-lg px-4 py-2 font-semibold text-white transition-colors disabled:opacity-60"
          >
            Enviar vídeo
          </button>
        )}
      </form>
    </div>
  )
}
