'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

type HlsVideoPlayerProps = {
  src: string
}

export default function HlsVideoPlayer({ src }: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const plyrRef = useRef<Plyr | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setError(null)
    let hls: Hls | null = null
    let plyr: Plyr | null = null

    if (Hls.isSupported()) {
      hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const heights = [
          ...new Set(hls.levels.map((level) => level.height).filter((h) => h > 0)),
        ].sort((a, b) => b - a)

        const defaultQuality = heights[0] || 0
        plyr = new Plyr(video, {
          settings: ['quality', 'speed'],
          quality: {
            default: defaultQuality,
            options: heights,
            forced: true,
            onChange: (newQuality: number) => {
              hls!.levels.forEach((level, levelIndex) => {
                if (level.height === newQuality) {
                  hls!.currentLevel = levelIndex
                }
              })
            },
          },
        })
        plyrRef.current = plyr
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError('Could not load this video stream.')
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      plyr = new Plyr(video, {
        settings: ['speed'],
      })
      plyrRef.current = plyr
    } else {
      setError('Your browser does not support HLS playback.')
    }

    return () => {
      if (plyrRef.current) {
        plyrRef.current.destroy()
        plyrRef.current = null
      }
      if (hls) {
        hls.destroy()
        hlsRef.current = null
      }
    }
  }, [src])

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className="w-full rounded-xl bg-black"
        controls
        playsInline
        preload="metadata"
      />
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}
