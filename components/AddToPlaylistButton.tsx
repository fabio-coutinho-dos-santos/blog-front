'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from 'app/context/auth-context'
import type { ApiPlaylist } from 'app/lib/videos'
import {
  addVideoToPlaylist,
  createPlaylist,
  listPlaylists,
  removeVideoFromPlaylist,
} from 'app/lib/playlists-client'

type Props = {
  videoId: string
  videoTitle: string
}

const INPUT =
  'focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500'

// Logged-in only: opens a modal to add/remove the video from playlists or create a new one
export default function AddToPlaylistButton({ videoId, videoTitle }: Props) {
  const router = useRouter()
  const { accessToken, isAuthenticated } = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [playlists, setPlaylists] = useState<ApiPlaylist[] | null>(null)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [changed, setChanged] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setError('')
    try {
      setPlaylists(await listPlaylists())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as playlists.')
      setPlaylists([])
    }
  }

  // Refresh the server-rendered lists only when something changed
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onClose = () => {
      if (changed) {
        setChanged(false)
        router.refresh()
      }
    }
    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [changed, router])

  if (!isAuthenticated || !accessToken) return null

  const open = () => {
    dialogRef.current?.showModal()
    load()
  }

  const contains = (playlist: ApiPlaylist) => playlist.items.some((i) => i.videoId === videoId)

  const toggle = async (playlist: ApiPlaylist) => {
    setBusyId(playlist.id)
    setError('')
    const inPlaylist = contains(playlist)
    try {
      if (inPlaylist) {
        await removeVideoFromPlaylist(accessToken, playlist.id, videoId)
      } else {
        await addVideoToPlaylist(accessToken, playlist.id, videoId)
      }
      // Update locally instead of refetching, so the checkbox doesn't flicker
      setPlaylists((current) =>
        (current || []).map((p) =>
          p.id !== playlist.id
            ? p
            : {
                ...p,
                items: inPlaylist
                  ? p.items.filter((i) => i.videoId !== videoId)
                  : [...p.items, { videoId, position: p.items.length }],
              }
        )
      )
      setChanged(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar a playlist.')
    } finally {
      setBusyId('')
    }
  }

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    setError('')
    try {
      const playlist = await createPlaylist(accessToken, {
        title: newTitle,
        description: newDescription,
      })
      await addVideoToPlaylist(accessToken, playlist.id, videoId)
      setPlaylists((current) => [
        { ...playlist, items: [{ videoId, position: 0 }] },
        ...(current || []),
      ])
      setNewTitle('')
      setNewDescription('')
      setChanged(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a playlist.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h5a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm12-3a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z" />
        </svg>
        Adicionar à playlist
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="playlist-dialog-title"
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 dark:border-gray-800">
          <div className="min-w-0">
            <h2 id="playlist-dialog-title" className="text-lg font-bold">
              Salvar em playlist
            </h2>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{videoTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Fechar"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
            </svg>
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto p-3">
          {playlists === null ? (
            <p className="p-2 text-sm text-gray-500">Carregando…</p>
          ) : playlists.length === 0 ? (
            <p className="p-2 text-sm text-gray-500 dark:text-gray-400">
              Nenhuma playlist ainda. Crie a primeira abaixo.
            </p>
          ) : (
            <ul>
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <label
                    htmlFor={`playlist-${playlist.id}`}
                    aria-label={`${playlist.title}, ${playlist.items.length} vídeo(s)`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <input
                      id={`playlist-${playlist.id}`}
                      type="checkbox"
                      checked={contains(playlist)}
                      disabled={busyId === playlist.id}
                      onChange={() => toggle(playlist)}
                      className="text-primary-500 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{playlist.title}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {playlist.items.length} {playlist.items.length === 1 ? 'vídeo' : 'vídeos'}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={create}
          className="space-y-2 border-t border-gray-200 p-5 dark:border-gray-800"
        >
          <p className="text-sm font-semibold">Nova playlist</p>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título"
            aria-label="Título da nova playlist"
            required
            className={INPUT}
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            aria-label="Descrição da nova playlist"
            className={INPUT}
          />
          {error && (
            <p className="rounded-md bg-red-500/10 p-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="bg-primary-500 hover:bg-primary-600 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
          >
            {creating ? 'Criando…' : 'Criar e adicionar este vídeo'}
          </button>
        </form>
      </dialog>
    </>
  )
}
