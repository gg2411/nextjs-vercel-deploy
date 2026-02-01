import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export default async function Home() {
  const { data: images, error } = await supabase
    .from('images')
    .select('*')
    .limit(20)

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Error loading images</h1>
        <p>{error.message}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Images from Supabase</h1>
      <p>Showing {images?.length || 0} images</p>
      
      {!images || images.length === 0 ? (
        <p>No images found</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {images.map((image: any) => (
            <div key={image.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
              {image.url && <img src={image.url} alt={image.image_description || 'Image'} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }} />}
              <div><strong>ID:</strong> {image.id}</div>
              {image.image_description && <div style={{ fontSize: '12px', marginTop: '8px' }}>{image.image_description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
