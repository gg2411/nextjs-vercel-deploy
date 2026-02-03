'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Caption {
  id: number
  text: string
  image_id?: number
}

export default function RateCaptionsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [captions, setCaptions] = useState<Caption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [votingStatus, setVotingStatus] = useState<{ [key: number]: string }>({})

  useEffect(() => {
    async function loadData() {
      try {
        // Check if user is authenticated
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !currentUser) {
          router.push('/login')
          return
        }

        setUser(currentUser)

        // Fetch captions to rate
        const { data: captionsData, error: captionsError } = await supabase
          .from('captions')
          .select('*')
          .limit(10)

        if (captionsError) {
          setError(captionsError.message)
        } else {
          setCaptions(captionsData || [])
        }

        setLoading(false)
      } catch (err: any) {
        setError(err.message)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleVote = async (captionId: number, voteValue: number) => {
    if (!user) {
      setError('You must be logged in to vote')
      return
    }

    setVotingStatus({ ...votingStatus, [captionId]: 'voting...' })

    try {
      // Insert vote into caption_votes table
      const { error: voteError } = await supabase
        .from('caption_votes')
        .insert({
          caption_id: captionId,
          profile_id: user.id,
          vote_value: voteValue
        })

      if (voteError) {
        setVotingStatus({ ...votingStatus, [captionId]: `Error: ${voteError.message}` })
      } else {
        setVotingStatus({ ...votingStatus, [captionId]: '✓ Voted!' })

        // Clear status after 2 seconds
        setTimeout(() => {
          setVotingStatus(prev => {
            const newStatus = { ...prev }
            delete newStatus[captionId]
            return newStatus
          })
        }, 2000)
      }
    } catch (err: any) {
      setVotingStatus({ ...votingStatus, [captionId]: `Error: ${err.message}` })
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Rate Captions</h1>
        <p>Loading captions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Rate Captions</h1>
        <div style={{ color: 'red', padding: '10px', backgroundColor: '#fee', borderRadius: '4px' }}>
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Rate Captions</h1>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0070f7',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Home
        </button>
      </div>

      {user && (
        <div style={{
          padding: '10px',
          backgroundColor: '#e8f4f8',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          Logged in as: {user.email}
        </div>
      )}

      {captions.length === 0 ? (
        <p>No captions found to rate.</p>
      ) : (
        <div>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Vote on captions below. Each vote is recorded in the caption_votes table.
          </p>

          {captions.map((caption) => (
            <div
              key={caption.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: '#fff'
              }}
            >
              <div style={{ marginBottom: '15px' }}>
                <strong>Caption #{caption.id}:</strong>
                <p style={{ fontSize: '18px', margin: '10px 0' }}>{caption.text || 'No caption text'}</p>
                {caption.image_id && (
                  <p style={{ fontSize: '12px', color: '#666' }}>Image ID: {caption.image_id}</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => handleVote(caption.id, 1)}
                  disabled={!!votingStatus[caption.id]}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: votingStatus[caption.id] ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: votingStatus[caption.id] ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  👍 Upvote
                </button>

                <button
                  onClick={() => handleVote(caption.id, -1)}
                  disabled={!!votingStatus[caption.id]}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: votingStatus[caption.id] ? '#ccc' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: votingStatus[caption.id] ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  👎 Downvote
                </button>

                <button
                  onClick={() => handleVote(caption.id, 0)}
                  disabled={!!votingStatus[caption.id]}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: votingStatus[caption.id] ? '#ccc' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: votingStatus[caption.id] ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Skip
                </button>

                {votingStatus[caption.id] && (
                  <span style={{
                    marginLeft: '10px',
                    color: votingStatus[caption.id].includes('Error') ? 'red' : 'green',
                    fontWeight: 'bold'
                  }}>
                    {votingStatus[caption.id]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
