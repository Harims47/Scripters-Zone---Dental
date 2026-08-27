import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DEMO_USERS } from '../lib/demo-users'
import { Button } from '../components/ui/button'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedUserId, setSelectedUserId] = useState<string>(DEMO_USERS[0].id)

  const from = location.state?.from?.pathname || "/dashboard"

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (login(selectedUserId)) {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-10 text-center bg-gradient-to-br from-teal-500 to-emerald-600">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-teal-600 font-bold text-3xl mx-auto shadow-inner mb-4">
            D
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">DentalCore</h1>
          <p className="text-teal-50 font-medium mt-2">Clinic Management System</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900">Prototype Login</h2>
            <p className="text-sm text-slate-500 mt-1">Select a demo role to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Select Identity</label>
              <div className="grid gap-3">
                {DEMO_USERS.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedUserId === user.id 
                        ? 'border-teal-500 bg-teal-50 shadow-sm ring-1 ring-teal-500' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className={`font-semibold ${selectedUserId === user.id ? 'text-teal-900' : 'text-slate-900'}`}>{user.name}</div>
                      <div className={`text-xs ${selectedUserId === user.id ? 'text-teal-700' : 'text-slate-500'}`}>{user.role}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedUserId === user.id ? 'border-teal-600' : 'border-slate-300'
                    }`}>
                      {selectedUserId === user.id && <div className="w-2 h-2 rounded-full bg-teal-600" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700">
              Continue to Application
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
