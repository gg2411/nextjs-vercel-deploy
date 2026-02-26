'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface ImageRow {
  id: string
  url: string
  is_public: boolean
  created_datetime_utc: string
  additional_context?: string
}

const PAGE_SIZE = 20

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [images, setImages] = useState<ImageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setUser(session.user)
        fetchImages(0)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
      else setUser(session.user)
    })

    return () => subscription.unsubscribe()
  }, [router])

  const fetchImages = useCallback(async (currentOffset: number) => {
    if (currentOffset === 0) setLoading(true)
    else setLoadingMore(true)

    const { data, error } = await supabase
      .from('images')
      .select('id, url, is_public, created_datetime_utc, additional_context')
      .eq('is_public', true)
      .order('created_datetime_utc', { ascending: false })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1)

    if (!error && data) {
      setImages(prev => currentOffset === 0 ? data : [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
      setOffset(currentOffset + data.length)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'var(--accent)',
                animation: `pulse 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading gallery…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar" style={{ padding: '0 24px' }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>🤣</div>
            <span className="gradient-text" style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              AlmostCrackd
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {user && (
              <span style={{
                fontSize: '12px', color: 'var(--muted)',
                maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.email}
              </span>
            )}
            <button
              onClick={() => router.push('/upload')}
              className="btn-gradient"
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', whiteSpace: 'nowrap' }}
            >
              + Upload Image
            </button>
            <button
              onClick={() => router.push('/rate')}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                border: '1px solid rgba(139,92,246,0.35)', cursor: 'pointer',
                transition: 'all 0.2s ease', fontWeight: 600, whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.background = 'rgba(139,92,246,0.25)'
                ;(e.target as HTMLElement).style.borderColor = 'rgba(139,92,246,0.6)'
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.background = 'rgba(139,92,246,0.15)'
                ;(e.target as HTMLElement).style.borderColor = 'rgba(139,92,246,0.35)'
              }}
            >
              ⭐ Rate Captions
            </button>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                background: 'rgba(239,68,68,0.1)', color: '#f87171',
                border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
                transition: 'all 0.2s ease', fontWeight: 600, whiteSpace: 'nowrap',
                opacity: signingOut ? 0.6 : 1,
              }}
            >
              {signingOut ? 'Signing out…' : 'Logout'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div className="fade-in" style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
            Image Gallery
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Showing {images.length} public image{images.length !== 1 ? 's' : ''} · Click Rate Captions to vote
          </p>
        </div>

        {/* Grid */}
        {images.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '1px dashed var(--border)', borderRadius: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
            <p style={{ color: 'var(--muted)', fontSize: '16px', marginBottom: '8px' }}>No images yet</p>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>Be the first to upload!</p>
            <button onClick={() => router.push('/upload')} className="btn-gradient" style={{ padding: '10px 24px', borderRadius: '8px' }}>
              Upload Image
            </button>
          </div>
        ) : (
          <div className="image-grid stagger">
            {images.map((img) => (
              <ImageCard key={img.id} image={img} />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && images.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              onClick={() => fetchImages(offset)}
              disabled={loadingMore}
              style={{
                padding: '12px 32px', borderRadius: '10px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text)', cursor: loadingMore ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: 600,
                transition: 'all 0.2s ease',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                opacity: loadingMore ? 0.6 : 1,
              }}
            >
              {loadingMore && <span className="spinner" />}
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function ImageCard({ image }: { image: ImageRow }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="image-card">
      {imgError ? (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(139,92,246,0.05)',
          color: 'var(--muted)', fontSize: '12px', gap: '8px',
        }}>
          <span style={{ fontSize: '32px' }}>🖼️</span>
          <span>Image unavailable</span>
        </div>
      ) : (
        <Image
          src={image.url}
          alt={image.additional_context || 'Uploaded image'}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          style={{ objectFit: 'cover' }}
          onError={() => setImgError(true)}
          unoptimized
        />
      )}
      <div className="image-card-overlay">
        <p style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--font-geist-mono)', letterSpacing: '0.02em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {image.id.slice(0, 8)}…
        </p>
        {image.additional_context && (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
            {image.additional_context}
          </p>
        )}
      </div>
    </div>
  )
}
