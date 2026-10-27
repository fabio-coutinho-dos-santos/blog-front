'use client'

import { createContext, useContext } from 'react'

type EnvironmentContextValue = { isProduction: boolean }

const EnvironmentContext = createContext<EnvironmentContextValue>({ isProduction: false })

// The server (app/layout.tsx) reads ENVIRONMENT once and hands the result down here, so
// client components can hide admin controls without ever seeing the variable itself.
export function EnvironmentProvider({
  isProduction,
  children,
}: {
  isProduction: boolean
  children: React.ReactNode
}) {
  return (
    <EnvironmentContext.Provider value={{ isProduction }}>{children}</EnvironmentContext.Provider>
  )
}

export function useEnvironment() {
  return useContext(EnvironmentContext)
}
