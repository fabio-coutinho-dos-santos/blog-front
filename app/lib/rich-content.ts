import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypePrismPlus from 'rehype-prism-plus'
import rehypeStringify from 'rehype-stringify'
import { viewerHref } from './viewer'

// Minimal hast types for the plugin below (avoids pulling @types/hast)
type HastNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

const ZOOM_PREFIX = /^zoom:\s*/i

// `![zoom: Caption](url)` alone in a paragraph becomes a link to the public full-page
// viewer (app/viewer), instead of an <img>: a big map would cost hundreds of MB inline.
function rehypeZoomImages() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      node.children = node.children?.map((child) => {
        const meaningful = child.children?.filter((c) => !(c.type === 'text' && !c.value?.trim()))
        const img = meaningful?.length === 1 ? meaningful[0] : undefined
        const alt = String(img?.properties?.alt ?? '')
        if (child.tagName === 'p' && img?.tagName === 'img' && ZOOM_PREFIX.test(alt)) {
          const title = alt.replace(ZOOM_PREFIX, '')
          return {
            type: 'element',
            tagName: 'p',
            children: [
              {
                type: 'element',
                tagName: 'a',
                properties: {
                  href: viewerHref(String(img.properties?.src ?? ''), title),
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: ['viewer-link'],
                },
                children: [{ type: 'text', value: `${title}: abrir o visualizador interativo ↗` }],
              },
            ],
          }
        }
        walk(child)
        return child
      })
    }
    walk(tree)
  }
}

// Markdown → HTML for posts: GFM (tables, task lists, autolinks, strikethrough) and
// code blocks highlighted by Prism (colors in css/prism.css). Raw HTML inside the
// content is dropped (remark-rehype default), so the output is safe to inject.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeZoomImages)
  .use(rehypePrismPlus, { ignoreMissing: true })
  .use(rehypeStringify)

export function formatRichContent(content?: string): string {
  if (!content) return ''
  return String(processor.processSync(content))
}
