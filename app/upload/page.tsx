'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface GeneratedCaption {
  id: number
  text: string
}

export default function UploadPage() {
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [context, setContext] = useState('')
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url')

  // Processing state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Results state
  const [captions, setCaptions] = useState<GeneratedCaption[]>([])
  const [selectedCaption, setSelectedCaption] = useState<number | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
      setImageUrl('')
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setImageUrl(url)
    setImagePreview(url || null)
    setImageFile(null)
  }

  const handleGenerateCaptions = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setCaptions([])
    setSelectedCaption(null)

    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      let finalImageUrl = imageUrl

      // If file was uploaded, we need to upload it first
      if (uploadMode === 'file' && imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)

        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json()
          throw new Error(uploadError.error || 'Failed to upload image')
        }

        const uploadResult = await uploadResponse.json()
        finalImageUrl = uploadResult.url
      }

      if (!finalImageUrl) {
        throw new Error('Please provide an image URL or upload a file')
      }

      // Call the caption generation API
      const response = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: finalImageUrl,
          context: context || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate captions')
      }

      const result = await response.json()
      setCaptions(result.captions || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCaption = (captionId: number) => {
    setSelectedCaption(captionId)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Upload Image & Generate Captions</h1>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to Home
        </button>
      </div>

      <form onSubmit={handleGenerateCaptions}>
        {/* Upload Mode Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Image Source:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setUploadMode('url')}
              style={{
                padding: '10px 20px',
                backgroundColor: uploadMode === 'url' ? '#0070f3' : '#e0e0e0',
                color: uploadMode === 'url' ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Paste URL
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              style={{
                padding: '10px 20px',
                backgroundColor: uploadMode === 'file' ? '#0070f3' : '#e0e0e0',
                color: uploadMode === 'file' ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Upload File
            </button>
          </div>
        </div>

        {/* URL Input */}
        {uploadMode === 'url' && (
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="imageUrl" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Image URL:
            </label>
            <input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={handleUrlChange}
              placeholder="https://example.com/image.jpg"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* File Upload */}
        {uploadMode === 'file' && (
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="imageFile" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Upload Image:
            </label>
            <input
              id="imageFile"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Preview:
            </label>
            <img
              src={imagePreview}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                borderRadius: '8px',
                border: '1px solid #ddd',
              }}
              onError={() => setImagePreview(null)}
            />
          </div>
        )}

        {/* Context Input */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="context" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Additional Context (optional):
          </label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Add any context that might help generate funnier captions..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: '#fee',
            color: 'red',
            borderRadius: '4px',
          }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || (!imageUrl && !imageFile)}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: loading || (!imageUrl && !imageFile) ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || (!imageUrl && !imageFile) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Generating Captions...' : 'Generate Captions'}
        </button>
      </form>

      {/* Generated Captions */}
      {captions.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2>Generated Captions ({captions.length})</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Click on a caption to select it for posting.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {captions.map((caption) => (
              <div
                key={caption.id}
                onClick={() => handleSelectCaption(caption.id)}
                style={{
                  padding: '15px',
                  borderRadius: '8px',
                  border: selectedCaption === caption.id ? '2px solid #0070f3' : '1px solid #ddd',
                  backgroundColor: selectedCaption === caption.id ? '#e6f0ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <p style={{ margin: 0, fontSize: '16px' }}>{caption.text}</p>
              </div>
            ))}
          </div>

          {selectedCaption && (
            <button
              onClick={() => {
                const caption = captions.find(c => c.id === selectedCaption)
                if (caption) {
                  alert(`Caption selected: "${caption.text}"\n\nIn a full implementation, this would post the caption.`)
                }
              }}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '15px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              Post Selected Caption
            </button>
          )}
        </div>
      )}
    </div>
  )
}
