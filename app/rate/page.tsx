'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'

interface CaptionRow {
  id: string
  content: string
  image_id: string
  like_count: number | null
  images: { id: string; url: string } | null
}

interface VoteRow {
  id: number
  caption_id: string
  vote_value: number
}

export default function RatePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [captions, setCaptions] = useState<CaptionRow[]>([])
  const [votes, setVotes] = useState<Record<string, VoteRow>>({}) // captionId -> vote
  const [scores, setScores] = useState<Record<string, number>>({})
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unvoted'>('all')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) {
        router.replace('/login')
      } else {
        setUser(u)
        fetchData(u.id)
      }
    })
  }, [router])

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true)

    const { data: captionsData, error: captionsError } = await supabase
      .from('captions')
      .select('id, content, image_id, like_count, images!inner(id, url)')
      .eq('is_public', true)
      .not('content', 'is', null)
      .order('created_datetime_utc', { ascending: false })
      .limit(30)

    if (captionsError || !captionsData) {
      setLoading(false)
      return
    }

    // Type assertion for the join result
    const typedCaptions = captionsData as unknown as CaptionRow[]
    setCaptions(typedCaptions)

    // Initialize scores from like_count
    const initialScores: Record<string, number> = {}
    typedCaptions.forEach(c => {
      initialScores[c.id] = c.like_count ?? 0
    })
    setScores(initialScores)

    // Fetch user's existing votes for these captions
    if (typedCaptions.length > 0) {
      const captionIds = typedCaptions.map(c => c.id)
      const { data: votesData } = await supabase
        .from('caption_votes')
        .select('id, caption_id, vote_value')
        .eq('profile_id', userId)
        .in('caption_id', captionIds)

      if (votesData) {
        const votesMap: Record<string, VoteRow> = {}
        votesData.forEach((v: VoteRow) => {
          votesMap[v.caption_id] = v
        })
        setVotes(votesMap)
      }
    }

    setLoading(false)
  }, [])

  async function handleVote(captionId: string, value: 1 | -1) {
    if (!user || votingId) return
    setVotingId(captionId)

    const existingVote = votes[captionId]
    const currentScore = scores[captionId] ?? 0
    const now = new Date().toISOString()

    try {
      if (existingVote) {
        if (existingVote.vote_value === value) {
          // Toggle off — delete the vote
          const { error } = await supabase
            .from('caption_votes')
            .delete()
            .eq('id', existingVote.id)

          if (!error) {
            setVotes(prev => {
              const next = { ...prev }
              delete next[captionId]
              return next
            })
            setScores(prev => ({ ...prev, [captionId]: currentScore - value }))
          }
        } else {
          // Change vote
          const { error } = await supabase
            .from('caption_votes')
            .update({ vote_value: value, modified_datetime_utc: now })
            .eq('id', existingVote.id)

          if (!error) {
            setVotes(prev => ({ ...prev, [captionId]: { ...existingVote, vote_value: value } }))
            setScores(prev => ({ ...prev, [captionId]: currentScore + value * 2 }))
          }
        }
      } else {
        // New vote — must include created_datetime_utc (NOT NULL, no default)
        const { data, error } = await supabase
          .from('caption_votes')
          .insert({
            caption_id: captionId,
            profile_id: user.id,
            vote_value: value,
            created_datetime_utc: now,
            modified_datetime_utc: now,
          })
          .select('id, caption_id, vote_value')
          .single()

        if (!error && data) {
          setVotes(prev => ({ ...prev, [captionId]: data as VoteRow }))
          setScores(prev => ({ ...prev, [captionId]: currentScore + value }))
        }
      }
    } finally {
      setVotingId(null)
    }
  }

  function handleSkip(captionId: string) {
    setSkipped(prev => new Set([...prev, captionId]))
  }

  const visibleCaptions = captions.filter(c => {
    if (skipped.has(c.id)) return false
    if (filter === 'unvoted') return !votes[c.id]
    return true
  })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'pulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading captions…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar" style={{ padding: '0 24px' }}>
        <div style={{
          maxWidth: '860px',
          margin: '0 auto',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>🤣</div>
            <span className="gradient-text" style={{ fontSize: '18px', fontWeight: 800 }}>
              Rate Captions
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Filter toggle */}
            <div style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid var(--border)',
            }}>
              {(['all', 'unvoted'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '5px 12px', borderRadius: '6px', border: 'none',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    transition: 'all 0.2s ease',
                    background: filter === f ? 'rgba(139,92,246,0.25)' : 'transparent',
                    color: filter === f ? '#a78bfa' : 'var(--muted)',
                  }}
                >
                  {f === 'all' ? 'All' : 'Unvoted'}
                </button>
              ))}
            </div>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                background: 'rgba(255,255,255,0.06)', color: 'var(--text)',
                border: '1px solid var(--border)', cursor: 'pointer',
                transition: 'all 0.2s ease', fontWeight: 600,
              }}
            >
              ← Back
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats bar */}
        <div className="fade-in" style={{
          display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap',
        }}>
          <StatChip label="Total" value={captions.length} color="#a78bfa" />
          <StatChip label="Voted" value={Object.keys(votes).length} color="#10b981" />
          <StatChip label="Skipped" value={skipped.size} color="#94a3b8" />
          <StatChip label="Remaining" value={visibleCaptions.filter(c => !votes[c.id]).length} color="#06b6d4" />
        </div>

        {visibleCaptions.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '1px dashed var(--border)', borderRadius: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {filter === 'unvoted' ? '🎉' : '😶'}
            </div>
            <p style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              {filter === 'unvoted' ? 'You voted on everything!' : 'No captions to show'}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
              {filter === 'unvoted' ? 'Switch to "All" to review your votes' : 'Upload an image to generate captions'}
            </p>
            {filter === 'unvoted' && (
              <button
                onClick={() => setFilter('all')}
                className="btn-gradient"
                style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '14px' }}
              >
                Show All
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {visibleCaptions.map((caption, i) => (
              <CaptionCard
                key={caption.id}
                caption={caption}
                userVote={votes[caption.id]?.vote_value ?? null}
                score={scores[caption.id] ?? 0}
                isVoting={votingId === caption.id}
                onVote={handleVote}
                onSkip={handleSkip}
                index={i}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: '8px 16px', borderRadius: '10px',
      background: 'var(--surface)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      <span style={{ fontSize: '18px', fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

function CaptionCard({
  caption, userVote, score, isVoting, onVote, onSkip, index,
}: {
  caption: CaptionRow
  userVote: number | null
  score: number
  isVoting: boolean
  onVote: (id: string, v: 1 | -1) => void
  onSkip: (id: string) => void
  index: number
}) {
  const [imgError, setImgError] = useState(false)

  const scoreColor = score > 0 ? '#10b981' : score < 0 ? '#ef4444' : '#94a3b8'
  const scorePrefix = score > 0 ? '+' : ''

  return (
    <div
      className="caption-card fade-in"
      style={{ animationDelay: `${index * 0.06}s`, opacity: 0 }}
    >
      <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap' }}>
        {/* Image */}
        {caption.images && (
          <div style={{
            width: '260px',
            minWidth: '200px',
            flexShrink: 0,
            position: 'relative',
            borderRight: '1px solid var(--border)',
          }}>
            <div style={{ position: 'relative', paddingBottom: '75%', overflow: 'hidden' }}>
              {imgError ? (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(139,92,246,0.05)', color: 'var(--muted)', fontSize: '12px',
                  flexDirection: 'column', gap: '8px',
                }}>
                  <span style={{ fontSize: '32px' }}>🖼️</span>
                  <span>Image unavailable</span>
                </div>
              ) : (
                <Image
                  src={caption.images.url}
                  alt="Caption image"
                  fill
                  style={{ objectFit: 'cover' }}
                  onError={() => setImgError(true)}
                  unoptimized
                  sizes="260px"
                />
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: '240px' }}>
          <div>
            {/* Caption ID chip */}
            <span className="chip" style={{ marginBottom: '16px', display: 'inline-flex' }}>
              #{caption.id.slice(0, 8)}
            </span>

            {/* Caption text — the KEY fix: uses content field */}
            <p style={{
              fontSize: '20px',
              lineHeight: '1.5',
              fontWeight: 500,
              color: 'var(--text)',
              marginBottom: '20px',
              fontStyle: caption.content ? 'normal' : 'italic',
            }}>
              {caption.content || (
                <span style={{ color: 'var(--muted)' }}>No caption text</span>
              )}
            </p>

            {/* Image ID */}
            <p style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-geist-mono)', marginBottom: '20px' }}>
              Image: {caption.image_id.slice(0, 16)}…
            </p>
          </div>

          {/* Score + Vote buttons */}
          <div>
            {/* Score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{
                fontSize: '22px', fontWeight: 800, color: scoreColor,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {scorePrefix}{score}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>points</span>
              {userVote !== null && (
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                  background: userVote === 1 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: userVote === 1 ? '#10b981' : '#ef4444',
                  fontWeight: 600,
                }}>
                  {userVote === 1 ? 'You upvoted' : 'You downvoted'}
                </span>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className={`btn-vote btn-upvote${userVote === 1 ? ' voted' : ''}`}
                onClick={() => onVote(caption.id, 1)}
                disabled={isVoting}
                style={{ opacity: isVoting ? 0.6 : 1 }}
              >
                👍 Upvote
              </button>
              <button
                className={`btn-vote btn-downvote${userVote === -1 ? ' voted' : ''}`}
                onClick={() => onVote(caption.id, -1)}
                disabled={isVoting}
                style={{ opacity: isVoting ? 0.6 : 1 }}
              >
                👎 Downvote
              </button>
              <button
                className="btn-vote btn-skip"
                onClick={() => onSkip(caption.id)}
                disabled={isVoting}
              >
                Skip
              </button>
              {isVoting && <span className="spinner" style={{ alignSelf: 'center' }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
