import { createClient } from '@/utils/supabase/server'
import LogoutForm from '@/components/LogoutForm'
import Link from 'next/link'

interface ImageRecord {
  id: number
  url?: string
  image_description?: string
}

export const revalidate = 60

export default async function Home() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Error: Supabase credentials not configured</p>
      </div>
    )
  }

  // Fetch images from Supabase using server client
  const supabase = await createClient()
  const { data: images, error } = await supabase
    .from('images')
    .select('*')
    .limit(20)

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Images from Supabase</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/upload">
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              Upload & Crack
            </button>
          </Link>
          <Link href="/rate-captions">
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#0070f7',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              Rate Captions
            </button>
          </Link>
          <LogoutForm />
        </div>
      </div>

      {error ? (
        <div style={{ padding: '20px' }}>
          <h1>Error loading images</h1>
          <p>{error.message}</p>
        </div>
      ) : (
        <div>
          <p>Showing {images?.length || 0} images</p>

          {(!images || images.length === 0) ? (
            <p>No images found</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '20px',
              }}
            >
              {images.map((image: ImageRecord) => (
                <div
                  key={image.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                  }}
                >
                  <div>
                    <strong>ID:</strong> {image.id}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    {image.url && <img src={image.url} alt={image.image_description || 'Image'} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
