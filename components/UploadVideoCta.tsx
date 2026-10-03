'use client'

import Link from 'next/link'
import { useAuth } from 'app/context/auth-context'

// Only shown to the logged-in admin; the login state lives in the browser (localStorage)
export default function UploadVideoCta() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return null

  return (
    <Link
      href="/admin/upload-video"
      className="bg-primary-500 hover:bg-primary-600 inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M10 3a1 1 0 0 1 .7.3l4 4a1 1 0 0 1-1.4 1.4L11 6.4V13a1 1 0 1 1-2 0V6.4L6.7 8.7a1 1 0 0 1-1.4-1.4l4-4A1 1 0 0 1 10 3Z" />
        <path d="M4 14a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1Z" />
      </svg>
      Enviar novo vídeo
    </Link>
  )
}
