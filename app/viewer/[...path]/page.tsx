import { notFound } from 'next/navigation'
import ZoomImageViewer from '@/components/ZoomImageViewer'
import { genPageMetadata } from 'app/seo'
import { VIEWER_CDN_URL, viewerKey } from 'app/lib/viewer'

type Props = {
  params: Promise<{ path: string[] }>
  searchParams: Promise<{ title?: string }>
}

function titleFor(key: string, title?: string) {
  return title?.trim() || key.split('/').pop() || 'Imagem'
}

export async function generateMetadata({ params, searchParams }: Props) {
  const key = viewerKey((await params).path)
  // here too, so the response status is 404 and not a streamed 200
  if (!key) notFound()
  const { title } = await searchParams
  return genPageMetadata({
    title: titleFor(key, title),
    description: 'Visualizador interativo: arraste, dê zoom e exporte em PNG.',
  })
}

// Public page (no login): the link in a post opens it, and it can be shared on its own
export default async function ViewerPage({ params, searchParams }: Props) {
  const key = viewerKey((await params).path)
  if (!key) notFound()
  const { title } = await searchParams

  const src = `${VIEWER_CDN_URL}/${key.split('/').map(encodeURIComponent).join('/')}`
  return <ZoomImageViewer src={src} title={titleFor(key, title)} />
}
