// Public, shareable full-page viewer for big images on the R2 CDN:
//   /viewer/images/aws-mental-map.png?title=Mapa%20mental%20da%20AWS
// The URL path IS the CDN key, so the viewer only ever shows images from this CDN.
export const VIEWER_CDN_URL = 'https://r2-cdn.procode-tech.com'

const VIEWABLE = /\.(png|jpe?g|webp|dzi)$/i

// CDN key from the route segments, or null when it is not a viewable CDN image
export function viewerKey(segments: string[]): string | null {
  const key = segments.map((s) => decodeURIComponent(s)).join('/')
  if (!VIEWABLE.test(key) || key.split('/').some((part) => part === '..' || part === '')) {
    return null
  }
  return key
}

// Link to the viewer page for an image URL; images outside the CDN just link to themselves
export function viewerHref(src: string, title: string): string {
  if (!src.startsWith(`${VIEWER_CDN_URL}/`)) return src
  const key = src.slice(VIEWER_CDN_URL.length + 1).split('?')[0]
  const path = key.split('/').map(encodeURIComponent).join('/')
  return `/viewer/${path}?title=${encodeURIComponent(title)}`
}
