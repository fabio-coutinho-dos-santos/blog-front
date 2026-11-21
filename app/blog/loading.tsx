// Shown while the posts load. The API runs on Cloud Run, so the first request after a quiet
// period waits for a cold start: a plain black page with a spinner covers the whole screen
// (header included) until the posts arrive, instead of a half-empty page.
export default function BlogLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
    >
      <div
        aria-hidden="true"
        className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white motion-reduce:animate-[spin_3s_linear_infinite]"
      />
      <span className="sr-only">Carregando os posts…</span>
    </div>
  )
}
