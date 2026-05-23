'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type AuthContextValue = {
  accessToken: string | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'blog_access_token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY)
    if (storedToken) {
      setAccessToken(storedToken)
    }
    setIsHydrated(true)
  }, [])

  const login = (token: string) => {
    setAccessToken(token)
    localStorage.setItem(STORAGE_KEY, token)
  }

  const logout = () => {
    setAccessToken(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const value = useMemo(
    () => ({
      accessToken,
      isAuthenticated: Boolean(accessToken),
      login,
      logout,
    }),
    [accessToken]
  )

  if (!isHydrated) return null

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
