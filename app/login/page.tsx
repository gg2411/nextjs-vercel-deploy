'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace('/')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Check your email to confirm your account!')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        }} />
      </div>

      <div className="fade-in" style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
          }}>
            <span style={{ fontSize: '28px' }}>🤣</span>
          </div>
          <h1 className="gradient-text" style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            AlmostCrackd
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>
            Rate AI captions. Win the internet.
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: '32px' }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '28px',
          }}>
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  background: mode === m ? 'rgba(139,92,246,0.25)' : 'transparent',
                  color: mode === m ? '#a78bfa' : 'var(--muted)',
                  boxShadow: mode === m ? '0 2px 8px rgba(139,92,246,0.2)' : 'none',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </div>

            {error && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#6ee7b7',
                fontSize: '13px',
              }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient"
              style={{
                padding: '13px',
                borderRadius: '10px',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginTop: '20px' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }}
            style={{ color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}
