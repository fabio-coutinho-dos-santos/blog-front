function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function applyInlineMarkdown(text: string): string {
  return text
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function autoLinkUrls(text: string): string {
  return text.replace(
    /(^|[\s(])(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
  )
}

export function formatRichContent(content?: string): string {
  if (!content) return ''

  let formatted = content.replace(/\r\n|\r/g, '\n')

  const codeBlocks: string[] = []
  formatted = formatted.replace(
    /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g,
    (_, lang: string, code: string) => {
      const languageLabel = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : ''
      const html = `<div class="code-block">${languageLabel}<pre><code>${escapeHtml(code.trim())}</code></pre></div>`
      codeBlocks.push(html)
      return `@@CODEBLOCK${codeBlocks.length - 1}@@`
    }
  )

  formatted = formatted.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
  formatted = formatted.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
  formatted = formatted.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
  formatted = formatted.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  formatted = formatted.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  formatted = formatted.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
  formatted = formatted.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')

  formatted = formatted.replace(
    /(^|\n)((?:[-*]\s+.+(?:\n|$))+)/g,
    (_, prefix: string, listBlock: string) => {
      const items = listBlock
        .trim()
        .split('\n')
        .map((line: string) => line.replace(/^[-*]\s+/, '').trim())
        .map((item: string) => `<li>${item}</li>`)
        .join('')
      return `${prefix}<ul>${items}</ul>\n`
    }
  )

  formatted = formatted.replace(
    /(^|\n)((?:\d+\.\s+.+(?:\n|$))+)/g,
    (_, prefix: string, listBlock: string) => {
      const items = listBlock
        .trim()
        .split('\n')
        .map((line: string) => line.replace(/^\d+\.\s+/, '').trim())
        .map((item: string) => `<li>${item}</li>`)
        .join('')
      return `${prefix}<ol>${items}</ol>\n`
    }
  )

  formatted = formatted
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul>') ||
        trimmed.startsWith('<ol>') ||
        trimmed.startsWith('<pre>') ||
        trimmed.startsWith('<blockquote>') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<p') ||
        trimmed.startsWith('<img') ||
        trimmed.startsWith('<table')
      ) {
        return trimmed
      }
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`
    })
    .join('\n')

  formatted = applyInlineMarkdown(formatted)
  formatted = autoLinkUrls(formatted)

  formatted = formatted.replace(/@@CODEBLOCK(\d+)@@/g, (_, index: string) => {
    return codeBlocks[Number(index)] || ''
  })

  return formatted
}
