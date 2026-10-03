import HlsVideoPlayer from '@/components/HlsVideoPlayer'
import Link from '@/components/Link'
import UploadVideoCta from '@/components/UploadVideoCta'
import VideoCard from '@/components/VideoCard'
import { genPageMetadata } from 'app/seo'
import { getPosts } from 'app/lib/posts'
import {
  ApiPlaylist,
  ApiVideo,
  formatDuration,
  getPlaylist,
  getPlaylists,
  getVideo,
  getVideos,
  isPlayable,
  videoCoverUrl,
  videoStreamUrl,
} from 'app/lib/videos'

export const metadata = genPageMetadata({ title: 'Vídeos' })

const VIDEO_ID = /^[A-Za-z0-9_-]+$/

type SearchParams = Promise<{ id?: string; playlist?: string }>

export default async function VideoPage({ searchParams }: { searchParams: SearchParams }) {
  const { id, playlist: playlistId } = await searchParams
  const safeId = id && VIDEO_ID.test(id) ? id : undefined

  const [videos, playlists, posts, playlistView] = await Promise.all([
    getVideos(),
    getPlaylists(),
    getPosts(),
    playlistId && VIDEO_ID.test(playlistId) ? getPlaylist(playlistId) : null,
  ])

  // Only finished videos are listed; uploading/processing/failed ones stay hidden
  const readyVideos = videos.filter(isPlayable)
  const videosById = new Map(videos.map((video) => [video.id, video]))
  const postTitles = new Map(posts.map((post) => [post.id, post.title]))

  const playlistVideos = playlistView ? playlistView.videos.filter(isPlayable) : []

  // What to play: the chosen video, or the first ready one of the chosen playlist
  let current: ApiVideo | null = null
  if (playlistView) {
    current = playlistVideos.find((video) => video.id === safeId) || playlistVideos[0] || null
  } else if (safeId) {
    // Videos uploaded before the database existed have no record but still play from the CDN
    current = (await getVideo(safeId)) || {
      id: safeId,
      title: 'Vídeo',
      description: '',
      status: 'ready',
      createdAt: '',
    }
  }

  const currentIndex = current ? playlistVideos.findIndex((video) => video.id === current.id) : -1
  const next = currentIndex >= 0 ? playlistVideos[currentIndex + 1] : undefined
  const playlistHref = (videoId: string) => `/video?playlist=${playlistView?.id}&id=${videoId}`

  const visiblePlaylists = playlists
    .map((playlist) => ({ playlist, videos: readyItems(playlist, videosById) }))
    .filter(({ videos }) => videos.length > 0)

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="flex flex-col gap-4 pt-6 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 md:space-y-5">
          <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-5xl md:leading-12 dark:text-gray-100">
            Vídeos
          </h1>
          <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
            Vídeos e séries do blog.
          </p>
        </div>
        <UploadVideoCta />
      </div>

      {current && (
        <section className="py-8">
          <div className={playlistView ? 'grid gap-6 lg:grid-cols-[1fr_20rem]' : ''}>
            <div className="min-w-0">
              {current.status === 'ready' ? (
                <HlsVideoPlayer
                  key={current.id}
                  src={videoStreamUrl(current)}
                  poster={videoCoverUrl(current) || undefined}
                />
              ) : (
                <p className="rounded-xl bg-gray-100 p-6 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {current.status === 'failed'
                    ? 'Não foi possível converter este vídeo.'
                    : 'Este vídeo ainda está sendo processado. Volte em alguns minutos.'}
                </p>
              )}

              <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {current.title}
              </h2>
              <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-gray-500 dark:text-gray-400">
                {formatDuration(current.durationSec) && (
                  <span>{formatDuration(current.durationSec)}</span>
                )}
                {current.postId && postTitles.has(current.postId) && (
                  <Link
                    href={`/blog/${current.postId}`}
                    className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    Ler o post: {postTitles.get(current.postId)} →
                  </Link>
                )}
              </div>
              {current.description && (
                <p className="mt-3 whitespace-pre-line text-gray-700 dark:text-gray-300">
                  {current.description}
                </p>
              )}
              {next && (
                <Link
                  href={playlistHref(next.id)}
                  className="bg-primary-500 hover:bg-primary-600 mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white"
                >
                  Próximo: {next.title}
                </Link>
              )}
            </div>

            {playlistView && (
              <aside className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <p className="px-2 pt-1 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Playlist · {currentIndex + 1}/{playlistVideos.length}
                </p>
                <h3 className="px-2 pb-2 font-bold text-gray-900 dark:text-gray-100">
                  {playlistView.title}
                </h3>
                <ol className="space-y-1">
                  {playlistVideos.map((video, index) => (
                    <li key={video.id}>
                      <VideoCard
                        video={video}
                        href={playlistHref(video.id)}
                        active={video.id === current?.id}
                        index={index}
                        compact
                      />
                    </li>
                  ))}
                </ol>
              </aside>
            )}
          </div>
        </section>
      )}

      {visiblePlaylists.length > 0 && (
        <section className="py-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Playlists</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePlaylists.map(({ playlist, videos }) => (
              <li key={playlist.id}>
                <Link
                  href={`/video?playlist=${playlist.id}`}
                  className="group block rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/60"
                >
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                    {videoCoverUrl(videos[0]) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={videoCoverUrl(videos[0]) || ''}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    )}
                    <span className="absolute inset-y-0 right-0 flex w-1/3 flex-col items-center justify-center bg-black/70 text-white">
                      <span className="text-lg font-bold">{videos.length}</span>
                      <span className="text-xs">{videos.length === 1 ? 'vídeo' : 'vídeos'}</span>
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-gray-900 dark:text-gray-100">
                    {playlist.title}
                  </p>
                  {playlist.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                      {playlist.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="py-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Todos os vídeos</h2>
        {readyVideos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Nenhum vídeo publicado ainda.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {readyVideos.map((video) => (
              <li key={video.id}>
                <VideoCard video={video} href={`/video?id=${video.id}`} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// Ready videos of a playlist, in playlist order
function readyItems(playlist: ApiPlaylist, videosById: Map<string, ApiVideo>) {
  return [...playlist.items]
    .sort((a, b) => a.position - b.position)
    .map((item) => videosById.get(item.videoId))
    .filter((video): video is ApiVideo => Boolean(video && isPlayable(video)))
}
