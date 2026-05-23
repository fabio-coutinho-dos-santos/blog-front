'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from 'app/context/auth-context'
import { formatRichContent } from 'app/lib/rich-content'

export default function NewPostPage() {
  const router = useRouter()
  const { accessToken, isAuthenticated } = useAuth()

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accessToken) {
      setError('Missing access token. Please login again.')
      return
    }
    if (!image) {
      setError('Image is required.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('subtitle', subtitle)
      formData.append('content', content)
      formData.append('tags', tags)
      formData.append('image', image)

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Could not create post.')
        return
      }

      setSuccess('Post created successfully. Redirecting...')
      router.push('/')
    } catch {
      setError('Could not connect to API.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="from-primary-100 to-primary-50 dark:from-primary-500/20 dark:to-primary-600/5 mb-6 rounded-2xl border border-gray-200 bg-gradient-to-br p-6 dark:border-gray-800">
        <p className="text-primary-400 text-sm font-semibold tracking-wide uppercase">Admin Area</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
          Create New Post
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Write, upload image, and publish your article.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-900/70 dark:shadow-black/20"
      >
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="subtitle"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Subtitle
          </label>
          <input
            id="subtitle"
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            required
            className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="tags"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            required
            placeholder="go,api,gin"
            className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="content"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={14}
            className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Write your post content..."
          />
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="text-primary-400 hover:text-primary-300 mt-2 text-sm font-medium"
          >
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
        </div>

        {showPreview && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="mb-3 text-sm font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
              Preview
            </p>
            <article className="prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: formatRichContent(content) }} />
            </article>
          </div>
        )}
        <div>
          <label
            htmlFor="image"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Image (png, jpg, jpeg - max 1MB)
          </label>
          <input
            id="image"
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            required
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:file:bg-gray-800 dark:file:text-gray-200"
          />
        </div>
        {error && (
          <p className="rounded-md bg-red-500/10 p-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-md bg-green-500/10 p-2 text-sm text-green-700 dark:text-green-300">
            {success}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 hover:bg-primary-600 w-full rounded-lg px-4 py-2 font-semibold text-white transition-colors disabled:opacity-60"
        >
          {loading ? 'Publishing...' : 'Publish Post'}
        </button>
      </form>
    </div>
  )
}
