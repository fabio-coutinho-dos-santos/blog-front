'use client'

import { ThemeProvider } from 'next-themes'
import siteMetadata from '@/data/siteMetadata'
import { AuthProvider } from './context/auth-context'

export function ThemeProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme={siteMetadata.theme} enableSystem>
        {children}
      </ThemeProvider>
    </AuthProvider>
  )
}
