import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { canAccessRoute } from '../lib/route-permissions'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = location.state?.from?.pathname || "/dashboard"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    const { success, error: authError, user } = await login(username, password)
    setIsSubmitting(false)
    if (success && user) {
      const defaultRoute = user.role === 'Receptionist' ? '/reception-desk' : '/dashboard'
      navigate(defaultRoute, { replace: true })
    } else {
      setError(authError || 'Invalid username or password')
    }
  }

  const handleDemoLogin = async (demoUsername: string) => {
    setError('')
    setIsSubmitting(true)
    
    // Map demo ID to real username
    let realUsername = demoUsername;
    if (demoUsername === 'reception') realUsername = 'receptionist';
    else if (demoUsername === 'doctor') realUsername = 'dutydoctor';
    else if (demoUsername === 'U-001') realUsername = 'headdoctor';

    const { success, error: authError, user } = await login(realUsername, 'demo123')
    setIsSubmitting(false)
    if (success && user) {
      const defaultRoute = user.role === 'Receptionist' ? '/reception-desk' : '/dashboard'
      navigate(defaultRoute, { replace: true })
    } else {
      setError(authError || 'Demo login failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* Left Side: Branding */}
      <div className="hidden md:flex flex-col justify-center items-center md:w-1/2 bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800 p-12 text-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]" />
        
        <div className="relative z-10 max-w-md text-left w-full space-y-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-teal-700 font-bold text-2xl shadow-lg">
              D
            </div>
            <h1 className="text-3xl font-bold tracking-tight">DentalCore</h1>
          </div>
          
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Better care starts with a better connected clinic.
          </h2>
          <p className="text-teal-100 text-lg leading-relaxed">
            Manage every patient journey from arrival to completed visit in one simple, unified workspace.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-white shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-10 relative">
        <div className="w-full max-w-sm space-y-8">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
              D
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DentalCore</h1>
          </div>

          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500">Sign in to continue to DentalCore.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-md text-sm font-medium border border-rose-100 text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
                <Input 
                  id="username" 
                  type="text" 
                  placeholder="Enter your username" 
                  className="h-11 bg-slate-50 border-slate-200"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="h-11 bg-slate-50 border-slate-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-base font-semibold bg-teal-600 hover:bg-teal-700 shadow-md hover:shadow-lg transition-all">
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Demo Accounts Helper */}
          <div className="pt-8 border-t border-slate-100">
            <div className="text-center mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Demo Accounts</h3>
              <p className="text-xs text-slate-500 mt-1">For development and testing purposes</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin('reception')}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 group transition-all text-left w-full disabled:opacity-50"
              >
                <span className="font-semibold text-slate-900 group-hover:text-teal-700 text-sm mb-1">Receptionist</span>
                <div className="text-[10px] text-slate-500 font-mono w-full text-center">
                  <div>user: receptionist</div>
                  <div>pass: demo123</div>
                </div>
              </button>
              
              <button 
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin('doctor')}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 group transition-all text-left w-full disabled:opacity-50"
              >
                <span className="font-semibold text-slate-900 group-hover:text-emerald-700 text-sm mb-1">Duty Doctor</span>
                <div className="text-[10px] text-slate-500 font-mono w-full text-center">
                  <div>user: dutydoctor</div>
                  <div>pass: demo123</div>
                </div>
              </button>

              <button 
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin('U-001')}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 group transition-all text-left w-full disabled:opacity-50"
              >
                <span className="font-semibold text-slate-900 group-hover:text-indigo-700 text-sm mb-1">Head Doctor</span>
                <div className="text-[10px] text-slate-500 font-mono w-full text-center">
                  <div>user: headdoctor</div>
                  <div>pass: demo123</div>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
