// adminOnly: shown only when logged in (the Header checks that in the browser)
export type NavLink = { href: string; title: string; adminOnly?: boolean }

const headerNavLinks: NavLink[] = [
  { href: '/', title: 'Início' },
  { href: '/blog', title: 'Blog' },
  { href: '/video', title: 'Video' },
  { href: '/about', title: 'Sobre' },
  { href: '/login', title: 'Entrar' },
  { href: '/admin/new-post', title: 'Novo Post', adminOnly: true },
]

// In production only these are menu items (so no login or "Novo Post" either). The other
// pages still exist and open by URL (e.g. /login, /admin/new-post): hiding a menu entry is
// not access control.
const PRODUCTION_LINKS = ['/blog', '/about']

// Server-side only. ENVIRONMENT has no NEXT_PUBLIC_ prefix, so client components (Header,
// MobileNav) can't read it: call this from a server component (app/layout.tsx) and pass
// the result down as props. NODE_ENV is not used on purpose: `next build` / `next start`
// always set it to "production", even when running locally.
export function getHeaderNavLinks(environment = process.env.ENVIRONMENT): NavLink[] {
  if (environment?.trim().toLowerCase() !== 'production') return headerNavLinks
  return headerNavLinks.filter((link) => PRODUCTION_LINKS.includes(link.href))
}
