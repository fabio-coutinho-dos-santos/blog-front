'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type OpenSeadragon from 'openseadragon'

type Props = {
  // A plain image (png/jpg) or Deep Zoom tiles (.dzi) for very large images
  src: string
  title: string
}

type Status = 'loading' | 'ready' | 'error'

// The PNG offered by "Exportar PNG": the image itself, or <name>.png next to the .dzi
function exportUrl(src: string) {
  return src.replace(/\.dzi(\?.*)?$/i, '.png')
}

// Full-page pan/zoom viewer for big diagrams (mind maps, architecture maps), opened from
// a link in a post (app/viewer). Read-only: navigation + export, nothing to edit.
export default function ZoomImageViewer({ src, title }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null)

  const [status, setStatus] = useState<Status>('loading')
  const [fullscreen, setFullscreen] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let destroyed = false
    let viewer: OpenSeadragon.Viewer | null = null

    import('openseadragon').then(({ default: OSD }) => {
      if (destroyed || !canvasRef.current) return

      const isDzi = /\.dzi(\?.*)?$/i.test(src)
      viewer = OSD({
        element: canvasRef.current,
        // ImageTileSource options (type 'image') are missing from @types/openseadragon
        tileSources: isDzi
          ? src
          : ({
              type: 'image',
              url: src,
              buildPyramid: false,
            } as unknown as OpenSeadragon.TileSourceOptions),
        // canvas drawer: a single big image can't be a WebGL texture (max ~16k px per side)
        drawer: 'canvas',
        crossOriginPolicy: 'Anonymous',
        showNavigationControl: false,
        showNavigator: true,
        navigatorPosition: 'BOTTOM_RIGHT',
        navigatorAutoFade: false,
        navigatorBackground: 'transparent',
        visibilityRatio: 0.3,
        minZoomImageRatio: 0.5,
        maxZoomPixelRatio: 2,
        gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, scrollToZoom: true },
        gestureSettingsTouch: { pinchToZoom: true, flickEnabled: true },
      })

      viewer.addHandler('open', () => {
        if (!viewer) return
        // Tall maps: start fitted to the width, at the top (the whole map would be a thin strip)
        viewer.viewport.fitHorizontally(true)
        const bounds = viewer.viewport.getBounds(true)
        viewer.viewport.panTo(new OSD.Point(0.5, bounds.height / 2), true)
        setStatus('ready')
      })
      viewer.addHandler('open-failed', () => setStatus('error'))

      viewerRef.current = viewer
    })

    return () => {
      destroyed = true
      viewer?.destroy()
      viewerRef.current = null
    }
  }, [src])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapperRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const zoomBy = (factor: number) => {
    const viewport = viewerRef.current?.viewport
    viewport?.zoomBy(factor)
    viewport?.applyConstraints()
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else wrapperRef.current?.requestFullscreen()
  }

  const exportPng = useCallback(async () => {
    const url = exportUrl(src)
    const fileName = url.split('/').pop()?.split('?')[0] || 'imagem.png'
    setExporting(true)
    try {
      // fetch + blob because the download attribute is ignored for cross-origin URLs
      const response = await fetch(url)
      if (!response.ok) throw new Error(String(response.status))
      const objectUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      link.click()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setExporting(false)
    }
  }, [src])

  const button =
    'inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800'
  const panel =
    'rounded-lg border border-gray-200 bg-white/95 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-950/90'

  return (
    // Covers the whole viewport, above the site header and footer
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-gray-50 dark:bg-gray-900"
    >
      <div
        ref={canvasRef}
        className="absolute inset-0"
        role="img"
        aria-label={`${title}. Arraste para navegar, scroll ou pinça para zoom.`}
      />

      <header
        className={`absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-3 px-3 py-1.5 ${panel}`}
      >
        <Link
          href="/blog"
          className="text-primary-500 hover:text-primary-600 shrink-0 text-sm font-semibold"
        >
          ← Blog
        </Link>
        <span className="h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
        <h1 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
      </header>

      <div
        role="toolbar"
        aria-label="Controles do visualizador"
        className={`absolute top-3 right-3 z-10 flex items-center gap-0.5 p-1 ${panel}`}
      >
        <button
          type="button"
          className={button}
          onClick={() => zoomBy(1.4)}
          aria-label="Aumentar zoom"
          title="Aumentar zoom"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
          </svg>
        </button>
        <button
          type="button"
          className={button}
          onClick={() => zoomBy(1 / 1.4)}
          aria-label="Diminuir zoom"
          title="Diminuir zoom"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M4 10a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z" />
          </svg>
        </button>
        <button
          type="button"
          className={button}
          onClick={() => viewerRef.current?.viewport.goHome()}
          aria-label="Ver o mapa inteiro"
          title="Ver o mapa inteiro"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3 4a1 1 0 0 1 1-1h3a1 1 0 0 1 0 2H5v2a1 1 0 0 1-2 0V4Zm10-1h3a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0V5h-2a1 1 0 1 1 0-2ZM4 12a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Zm12 0a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 1 1 0-2h2v-2a1 1 0 0 1 1-1Z" />
          </svg>
        </button>
        <button
          type="button"
          className={button}
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            {fullscreen ? (
              <path d="M7 3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1 0-2h2V4a1 1 0 0 1 1-1Zm6 0a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM3 13a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0v-2H4a1 1 0 0 1-1-1Zm9 0a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-3Z" />
            ) : (
              <path d="M3 4a1 1 0 0 1 1-1h4a1 1 0 0 1 0 2H6.4l2.3 2.3a1 1 0 0 1-1.4 1.4L5 6.4V8a1 1 0 0 1-2 0V4Zm9-1h4a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V6.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L13.6 5H12a1 1 0 1 1 0-2ZM4 11a1 1 0 0 1 1 1v1.6l2.3-2.3a1 1 0 1 1 1.4 1.4L6.4 15H8a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Zm7.3.3a1 1 0 0 1 1.4 0l2.3 2.3V12a1 1 0 1 1 2 0v4a1 1 0 0 1-1 1h-4a1 1 0 1 1 0-2h1.6l-2.3-2.3a1 1 0 0 1 0-1.4Z" />
            )}
          </svg>
        </button>
        <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
        <button type="button" className={button} onClick={exportPng} disabled={exporting}>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10 3a1 1 0 0 1 1 1v6.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L9 10.6V4a1 1 0 0 1 1-1ZM4 14a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1Z" />
          </svg>
          {exporting ? 'Baixando…' : 'Exportar PNG'}
        </button>
      </div>

      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {status === 'loading' ? (
            'Carregando o mapa…'
          ) : (
            <span>
              Não foi possível abrir o visualizador.{' '}
              <a
                href={exportUrl(src)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 underline"
              >
                Abrir a imagem
              </a>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
