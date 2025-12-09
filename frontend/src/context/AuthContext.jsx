import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext()

const AUTH_STORAGE_KEY = 'studypal_auth_user'
const TOKEN_KEY = 'token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      if (typeof window === 'undefined') return null

      const stored =
        window.sessionStorage.getItem(AUTH_STORAGE_KEY) ??
        window.localStorage.getItem(AUTH_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (user) {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      // Ensure any legacy localStorage copy is cleared
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    } else {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [user])

  const login = useCallback(
    (nextUser) => setUser(nextUser ?? { id: 'demo', name: 'Demo User' }),
    []
  )

  const updateUser = useCallback((partialUser) => {
    setUser((prev) => ({ ...(prev ?? {}), ...(partialUser ?? {}) }))
  }, [])

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Clear stored auth data and token for this tab
      window.sessionStorage.removeItem(TOKEN_KEY)
      window.localStorage.removeItem(TOKEN_KEY)
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      updateUser,
      logout
    }),
    [user, login, updateUser, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return ctx
}
