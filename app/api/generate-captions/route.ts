import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

interface CaptionRequest {
  imageUrl: string
  context?: string
}

interface GeneratedCaption {
  id: number
  text: string
}

// Mock captions for when no external API is configured
function generateMockCaptions(context?: string): GeneratedCaption[] {
  const mockCaptions = [
    "When you realize it's only Tuesday",
    "Me pretending to understand the assignment",
    "POV: You just checked your bank account",
    "When someone says 'we need to talk'",
    "My last brain cell during finals week",
    "When the WiFi disconnects mid-submit",
    "Trying to adult but failing spectacularly",
    "When you see your professor outside of class",
    "My motivation at 2am vs 2pm",
    "When the group project partner finally responds",
  ]

  // Add context-aware variations if context is provided
  if (context) {
    mockCaptions[0] = `${context}: expectations vs reality`
    mockCaptions[1] = `When ${context.toLowerCase()} hits different`
  }

  return mockCaptions.map((text, index) => ({
    id: index + 1,
    text,
  }))
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: CaptionRequest = await request.json()

    if (!body.imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    // Check if external caption API is configured
    const captionApiUrl = process.env.CAPTION_API_URL
    const captionApiKey = process.env.CAPTION_API_KEY

    let captions: GeneratedCaption[]

    if (captionApiUrl && captionApiKey) {
      // Call external caption generation API (e.g., Crackd API or custom service)
      const response = await fetch(captionApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${captionApiKey}`,
        },
        body: JSON.stringify({
          image_url: body.imageUrl,
          context: body.context,
          num_captions: 10,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Caption API error:', errorText)
        throw new Error('Failed to generate captions from external API')
      }

      const result = await response.json()

      // Map the response to our caption format
      // Adjust this mapping based on the actual API response structure
      captions = (result.captions || result.data || []).map((caption: string | { text: string }, index: number) => ({
        id: index + 1,
        text: typeof caption === 'string' ? caption : caption.text,
      }))
    } else {
      // Use mock captions when no external API is configured
      console.log('No CAPTION_API_URL configured, using mock captions')
      captions = generateMockCaptions(body.context)
    }

    // Optionally store the image and captions in the database
    // This would insert into the images and captions tables

    return NextResponse.json({
      success: true,
      imageUrl: body.imageUrl,
      context: body.context,
      captions,
    })

  } catch (error) {
    console.error('Error generating captions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate captions' },
      { status: 500 }
    )
  }
}
