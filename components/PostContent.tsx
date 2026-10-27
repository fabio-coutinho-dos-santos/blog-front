import { formatRichContent } from 'app/lib/rich-content'

// Post body rendered from Markdown (see app/lib/rich-content.ts)
export default function PostContent({ content }: { content?: string }) {
  return <div dangerouslySetInnerHTML={{ __html: formatRichContent(content) }} />
}
