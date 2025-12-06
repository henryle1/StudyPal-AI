import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = useCallback(
    (nextUser) => setUser(nextUser ?? { id: 'demo', name: 'Demo User' }),
    []
  )

  const updateUser = useCallback((partialUser) => {
    setUser((prev) => ({ ...(prev ?? {}), ...(partialUser ?? {}) }))
  }, [])

  const logout = useCallback(() => setUser(null), [])

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
