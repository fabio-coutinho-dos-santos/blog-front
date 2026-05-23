'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from 'app/context/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok || !data?.access_token) {
        setError(data?.error || 'Invalid credentials')
        return
      }

      login(data.access_token)
      router.push('/admin/new-post')
    } catch {
      setError('Could not connect to API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-14">
      <div className="from-primary-100 to-primary-50 dark:from-primary-500/20 dark:to-primary-600/5 mb-6 rounded-2xl border border-gray-200 bg-gradient-to-br p-6 dark:border-gray-800">
        <p className="text-primary-400 text-sm font-semibold tracking-wide uppercase">Admin Area</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Login</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Authenticate to create and publish new posts.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-900/70 dark:shadow-black/20"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Your password"
          />
        </div>
        {error && (
          <p className="rounded-md bg-red-500/10 p-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 hover:bg-primary-600 w-full rounded-lg px-4 py-2 font-semibold text-white transition-colors disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {isAuthenticated && (
          <p className="rounded-md bg-green-500/10 p-2 text-sm text-green-700 dark:text-green-300">
            You are logged in. Redirecting is available.
          </p>
        )}
      </form>
    </div>
  )
}
