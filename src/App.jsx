import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('landing')
  const [authMode, setAuthMode] = useState('signup')

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'))
    if (hashParams.get('type') === 'recovery') {
      setPage('reset')
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-zinc-500">Loading...</div>
    </div>
  )

  if (page === 'reset') return <ResetPasswordPage onDone={() => { setPage('landing') }} />
  if (user) return <Dashboard user={user} />
  if (page === 'auth') return <AuthPage mode={authMode} setMode={setAuthMode} onBack={() => setPage('landing')} />

  return <LandingPage onSignup={() => { setAuthMode('signup'); setPage('auth') }} onLogin={() => { setAuthMode('login'); setPage('auth') }} />
}

function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMessage(error.message)
    else { setMessage('Password updated! Signing you in...'); setTimeout(onDone, 2000) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-sm text-white">P</div>
          <span className="font-semibold text-white text-lg">PropJournals</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h2 className="text-white font-semibold text-xl mb-2">Set new password</h2>
          <p className="text-zinc-400 text-sm mb-6">Choose a strong password for your account.</p>
          <form onSubmit={handleReset}>
            <div className="mb-4">
              <label className="text-zinc-400 text-sm block mb-2">New password</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                placeholder="Min 6 characters" />
            </div>
            {message && (
              <div className="mb-4 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
                {message}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-lg font-medium">
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function AuthPage({ mode, setMode, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setIsError(true); setMessage(error.message) }
      else { setIsError(false); setMessage('Check your email to confirm your account.') }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setIsError(true); setMessage(error.message) }
    }
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!email) { setIsError(true); setMessage('Enter your email first then click forgot password.'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://propjournals.vercel.app'
    })
    if (error) { setIsError(true); setMessage(error.message) }
    else { setIsError(false); setMessage('Password reset email sent. Check your inbox.') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-sm text-white">P</div>
          <span className="font-semibold text-white text-lg">PropJournals</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h2 className="text-white font-semibold text-xl mb-6">
            {mode === 'signup' ? 'Create your free account' : 'Welcome back'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="text-zinc-400 text-sm block mb-2">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                placeholder="you@email.com" />
            </div>
            <div className="mb-2">
              <label className="text-zinc-400 text-sm block mb-2">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                placeholder="••••••••" />
            </div>
            {mode === 'login' && (
              <div className="mb-4 text-right">
                <button type="button" onClick={handleForgotPassword} className="text-zinc-500 hover:text-red-400 text-xs">
                  Forgot password?
                </button>
              </div>
            )}
            {message && (
              <div className={`mb-4 text-sm px-4 py-3 rounded-lg border ${isError ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-green-400 bg-green-400/10 border-green-400/20'}`}>
                {message}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors mb-4">
              {loading ? 'Loading...' : mode === 'signup' ? 'Create free account' : 'Sign in'}
            </button>
          </form>
          <p className="text-zinc-500 text-sm text-center">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="text-red-400 hover:text-red-300">
              {mode === 'signup' ? 'Sign in' : 'Sign up free'}
            </button>
          </p>
        </div>
        <div className="text-center mt-4">
          <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400 text-sm">← Back to home</button>
        </div>
      </div>
    </div>
  )
}

function LandingPage({ onSignup, onLogin }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-sm">P</div>
          <span className="font-semibold">PropJournals</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onLogin} className="text-zinc-400 hover:text-white text-sm">Sign in</button>
          <button onClick={onSignup} className="bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
            Start free
          </button>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-red-600/10 border border-red-600/20 text-red-400 text-xs px-3 py-1 rounded-full mb-6">
          Free · No credit card needed
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          The trading journal built for<br />
          <span className="text-red-500">prop firm traders</span>
        </h1>
        <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto">
          Track trades, monitor your daily loss limit, manage challenge phases, and fix the psychology mistakes killing your funded accounts.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={onSignup}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
            Start journaling free
          </button>
          <button onClick={onLogin} className="text-zinc-400 hover:text-white text-sm">
            Already have an account →
          </button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-center text-2xl font-semibold mb-12 text-zinc-300">Everything a prop trader actually needs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Prop firm challenge tracker', desc: 'Track Step 1, Step 2, and Funded phases. See your progress toward profit targets in real time.' },
            { title: 'Daily loss limit monitor', desc: 'Set your firm\'s daily limit. Get warned before you breach it and blow your account.' },
            { title: 'Drawdown gauge', desc: 'Live visual showing how much of your max drawdown allowance is used. Stop the blowups.' },
            { title: 'R:R calculator', desc: 'Live risk/reward ratio on every trade. Green for 2R+, yellow for acceptable, red for skip.' },
            { title: 'Psychology tracker', desc: 'Tag emotions on every trade — FOMO, revenge, patient, confident. Find your patterns.' },
            { title: 'Calendar view', desc: 'See every trading day on a calendar. Green days, red days, your P&L at a glance.' },
          ].map((f, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-600 transition-colors">
              <div className="w-2 h-2 rounded-full mb-4 bg-red-500"></div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10">
          <p className="text-zinc-300 text-lg leading-relaxed mb-6">
            "I blew 3 funded accounts before I started tracking my psychology. The issue was never my setup — it was revenge trading after a loss. I built PropJournals to solve exactly this."
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center font-bold text-sm">R</div>
            <div className="text-left">
              <div className="font-medium text-sm">Raj</div>
              <div className="text-zinc-500 text-xs">Funded trader · Propjournals</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to fix your trading?</h2>
        <p className="text-zinc-400 mb-8">Join prop firm traders already using PropJournals. Free forever.</p>
        <button onClick={onSignup}
          className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors w-full max-w-sm">
          Start journaling free
        </button>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-zinc-600 text-sm">
        PropJournals · Built for prop firm traders · Free
      </footer>
    </div>
  )
}