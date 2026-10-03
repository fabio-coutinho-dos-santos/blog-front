import HlsVideoPlayer from '@/components/HlsVideoPlayer'
import UploadVideoCta from '@/components/UploadVideoCta'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: 'Video' })

const CDN_URL = 'https://r2-cdn.procode-tech.com'

// The consumer writes each video to videos/converted/<id>/master.m3u8.
// Without ?id= it falls back to the video encoded before that layout.
const LEGACY_VIDEO_URL = `${CDN_URL}/videos/converted/master.m3u8`
const VIDEO_ID = /^[A-Za-z0-9_-]+$/

export default async function VideoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  const videoUrl =
    id && VIDEO_ID.test(id) ? `${CDN_URL}/videos/converted/${id}/master.m3u8` : LEGACY_VIDEO_URL

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="flex flex-col gap-4 pt-6 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 md:space-y-5">
          <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-5xl md:leading-12 dark:text-gray-100">
            Video Player
          </h1>
          <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
            HLS stream from your public R2 CDN path.
          </p>
        </div>
        <UploadVideoCta />
      </div>
      <div className="py-8">
        <HlsVideoPlayer src={videoUrl} />
      </div>
    </div>
  )
}
