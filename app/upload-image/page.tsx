'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Caption {
  id: string
  text: string
  image_id: string
}

export default function UploadImagePage() {
  const router = useRouter()
  const supabase = createClient()

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [captions, setCaptions] = useState<Caption[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
      if (!validTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Please upload a JPEG, PNG, WebP, GIF, or HEIC image.')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError(null)
      setCaptions([])
      setImageUrl(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setUploading(true)
    setError(null)
    setStatus('Getting authentication token...')

    try {
      // Get JWT token from Supabase
      const { data: { session }, error: authError } = await supabase.auth.getSession()

      if (authError || !session) {
        throw new Error('You must be logged in to upload images')
      }

      const token = session.access_token

      // Step 1: Generate presigned URL
      setStatus('Step 1/4: Generating upload URL...')
      const presignedResponse = await fetch('https://api.almostcrackd.ai/pipeline/generate-presigned-url', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentType: file.type
        })
      })

      if (!presignedResponse.ok) {
        const errorText = await presignedResponse.text()
        throw new Error(`Failed to generate presigned URL: ${errorText}`)
      }

      const { presignedUrl, cdnUrl } = await presignedResponse.json()
      setImageUrl(cdnUrl)

      // Step 2: Upload image bytes to presigned URL
      setStatus('Step 2/4: Uploading image...')
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to S3')
      }

      // Step 3: Register image URL in the pipeline
      setStatus('Step 3/4: Registering image...')
      const registerResponse = await fetch('https://api.almostcrackd.ai/pipeline/upload-image-from-url', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: cdnUrl,
          isCommonUse: false
        })
      })

      if (!registerResponse.ok) {
        const errorText = await registerResponse.text()
        throw new Error(`Failed to register image: ${errorText}`)
      }

      const { imageId } = await registerResponse.json()

      // Step 4: Generate captions
      setStatus('Step 4/4: Generating captions... (this may take a moment)')
      const captionsResponse = await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageId: imageId
        })
      })

      if (!captionsResponse.ok) {
        const errorText = await captionsResponse.text()
        throw new Error(`Failed to generate captions: ${errorText}`)
      }

      const generatedCaptions = await captionsResponse.json()
      setCaptions(generatedCaptions)
      setStatus('✓ Success! Captions generated.')

    } catch (err: any) {
      setError(err.message || 'An error occurred during upload')
      setStatus('')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Upload Image & Generate Captions</h1>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Home
        </button>
      </div>

      <div style={{
        border: '2px dashed #ddd',
        borderRadius: '8px',
        padding: '30px',
        marginBottom: '20px',
        backgroundColor: '#f9f9f9',
        textAlign: 'center'
      }}>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ marginBottom: '20px' }}
        />

        {file && (
          <div style={{ marginBottom: '20px' }}>
            <p><strong>Selected file:</strong> {file.name}</p>
            <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Type:</strong> {file.type}</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            padding: '12px 30px',
            backgroundColor: file && !uploading ? '#0070f7' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: file && !uploading ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {uploading ? 'Processing...' : 'Upload & Generate Captions'}
        </button>
      </div>

      {status && (
        <div style={{
          padding: '15px',
          backgroundColor: status.includes('✓') ? '#d4edda' : '#cce5ff',
          border: `1px solid ${status.includes('✓') ? '#c3e6cb' : '#b8daff'}`,
          borderRadius: '4px',
          marginBottom: '20px',
          color: status.includes('✓') ? '#155724' : '#004085'
        }}>
          {status}
        </div>
      )}

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {imageUrl && (
        <div style={{
          marginBottom: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '15px',
          backgroundColor: '#fff'
        }}>
          <h3>Uploaded Image</h3>
          <img
            src={imageUrl}
            alt="Uploaded"
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '4px',
              marginTop: '10px'
            }}
          />
        </div>
      )}

      {captions.length > 0 && (
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#fff'
        }}>
          <h2>Generated Captions ({captions.length})</h2>
          <div>
            {captions.map((caption, index) => (
              <div
                key={caption.id || index}
                style={{
                  padding: '15px',
                  marginBottom: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  borderLeft: '4px solid #0070f7'
                }}
              >
                <p style={{ margin: 0, fontSize: '16px' }}>
                  {caption.text || 'No caption text'}
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                  Caption ID: {caption.id}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#e7f3ff',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#004085'
      }}>
        <strong>How it works:</strong>
        <ol style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Select an image file (JPEG, PNG, WebP, GIF, or HEIC)</li>
          <li>Click "Upload & Generate Captions"</li>
          <li>The system will upload your image and generate AI captions</li>
          <li>View and rate the generated captions</li>
        </ol>
      </div>
    </div>
  )
}
