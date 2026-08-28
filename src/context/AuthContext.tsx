import React, { createContext, useContext, useState } from 'react'
import { DEMO_USERS, type DemoUser } from '../lib/demo-users'

interface AuthContextType {
  currentUser: DemoUser | null
  isAuthenticated: boolean
  login: (username: string, password?: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Session persistence using localStorage
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(() => {
    try {
      const saved = localStorage.getItem('dc_v2_user')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return null
  })

  // Sync to localStorage on change
  React.useEffect(() => {
    if (currentUser) {
      localStorage.setItem('dc_v2_user', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('dc_v2_user')
    }
  }, [currentUser])

  const login = (username: string, _password?: string) => {
    // For demo purposes, we will support both ID-based login and username-based login
    const user = DEMO_USERS.find(u => 
      u.username === username || u.id === username
    )
    
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
