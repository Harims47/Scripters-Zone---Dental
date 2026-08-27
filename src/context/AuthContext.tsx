import React, { createContext, useContext, useState } from 'react'
import { DEMO_USERS, type DemoUser } from '../lib/demo-users'

interface AuthContextType {
  currentUser: DemoUser | null
  isAuthenticated: boolean
  login: (userId: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Simple in-memory session. Refreshes will log the user out.
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null)

  const login = (userId: string) => {
    const user = DEMO_USERS.find(u => u.id === userId)
    if (user) {
      setCurrentUser(user)
      return true
    }
    return false
  }

  const logout = () => {
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
