import Link from './Link'
import { ApiVideo, formatDuration, videoCoverUrl } from 'app/lib/videos'

type VideoCardProps = {
  video: ApiVideo
  href: string
  // Highlights the video being played (inside a playlist)
  active?: boolean
  index?: number
  compact?: boolean
}

export default function VideoCard({ video, href, active, index, compact }: VideoCardProps) {
  const cover = videoCoverUrl(video)
  const duration = formatDuration(video.durationSec)

  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`group flex gap-3 rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/60 ${
        compact ? 'flex-row items-center' : 'flex-col'
      } ${active ? 'bg-primary-500/10 ring-primary-500 ring-1' : ''}`}
    >
      <div
        className={`relative shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 ${
          compact ? 'aspect-video w-36' : 'aspect-video w-full'
        }`}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        {duration && (
          <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
            {duration}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p
          className={`font-semibold text-gray-900 dark:text-gray-100 ${
            compact ? 'line-clamp-2 text-sm' : 'line-clamp-2'
          }`}
        >
          {index !== undefined && (
            <span className="mr-1.5 text-gray-400 tabular-nums">{index + 1}.</span>
          )}
          {video.title}
        </p>
        {!compact && video.description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
            {video.description}
          </p>
        )}
      </div>
    </Link>
  )
}
