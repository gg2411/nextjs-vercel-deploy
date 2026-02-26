'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function UploadPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login')
      else setUser(session.user)
    })
  }, [router])

  function handleFileChange(selectedFile: File | null) {
    if (!selectedFile) return
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, GIF, WebP)')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB')
      return
    }
    setError('')
    setFile(selectedFile)
    const url = URL.createObjectURL(selectedFile)
    setPreview(url)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileChange(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !user) return
    setLoading(true)
    setError('')

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const imageId = crypto.randomUUID()
      const filePath = `${user.id}/${imageId}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { contentType: file.type, upsert: false })

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      // Insert into images table
      const { error: insertError } = await supabase
        .from('images')
        .insert({
          id: imageId,
          url: publicUrl,
          is_public: true,
          profile_id: user.id,
          additional_context: context.trim() || null,
        })

      if (insertError) throw new Error(`Database error: ${insertError.message}`)

      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFile(null)
    setPreview(null)
    setContext('')
    setSuccess(false)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="fade-in" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
            Image Uploaded!
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '28px' }}>
            Your image has been added to the gallery. AI captions will be generated soon.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={resetForm}
              className="btn-gradient"
              style={{ padding: '11px 24px', borderRadius: '10px', fontSize: '14px' }}
            >
              Upload Another
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text)', cursor: 'pointer',
              }}
            >
              View Gallery
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar" style={{ padding: '0 24px' }}>
        <div style={{
          maxWidth: '720px', margin: '0 auto',
          height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>🤣</div>
            <span className="gradient-text" style={{ fontSize: '18px', fontWeight: 800 }}>
              Upload Image
            </span>
          </div>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
              background: 'rgba(255,255,255,0.06)', color: 'var(--text)',
              border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600,
            }}
          >
            ← Back
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>
        <div className="fade-in">
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>Add an Image</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
            Upload an image and our AI will generate funny captions for the community to rate.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : preview ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
                borderRadius: '16px',
                padding: preview ? '0' : '60px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: dragOver ? 'rgba(139,92,246,0.07)' : preview ? 'transparent' : 'rgba(255,255,255,0.02)',
                overflow: 'hidden',
                minHeight: preview ? '280px' : 'auto',
                position: 'relative',
              }}
            >
              {preview ? (
                <>
                  <div style={{ position: 'relative', width: '100%', height: '320px' }}>
                    <Image
                      src={preview}
                      alt="Preview"
                      fill
                      style={{ objectFit: 'contain', padding: '12px' }}
                    />
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '10px 16px',
                    background: 'linear-gradient(to top, rgba(6,3,15,0.9), transparent)',
                    fontSize: '12px', color: 'var(--muted)',
                  }}>
                    {file?.name} · {file ? (file.size / 1024).toFixed(0) : 0} KB · Click to change
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '40px', marginBottom: '14px' }}>
                    {dragOver ? '📂' : '📷'}
                  </div>
                  <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '6px', fontSize: '15px' }}>
                    {dragOver ? 'Drop it here!' : 'Drop an image or click to browse'}
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                    JPEG, PNG, GIF, WebP · Max 10 MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Context */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                Context <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                className="input-field"
                placeholder="Give the AI some context about this image to generate better captions…"
                value={context}
                onChange={e => setContext(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                {context.length}/500 characters
              </p>
            </div>

            {error && (
              <div style={{
                padding: '12px 14px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5', fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className="btn-gradient"
              style={{
                padding: '14px', borderRadius: '12px', fontSize: '15px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                opacity: (!file || loading) ? 0.5 : 1,
                cursor: (!file || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Uploading…' : 'Upload Image'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
