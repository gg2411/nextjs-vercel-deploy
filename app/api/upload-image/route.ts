import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

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

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}/${timestamp}-${randomId}.${extension}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)

      // Check if it's a bucket not found error
      if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
        return NextResponse.json(
          { error: 'Storage bucket not configured. Please create an "images" bucket in Supabase Storage.' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(uploadData.path)

    const publicUrl = publicUrlData.publicUrl

    // Optionally insert into images table
    // const { data: imageRecord, error: insertError } = await supabase
    //   .from('images')
    //   .insert({
    //     url: publicUrl,
    //     uploaded_by: user.id,
    //   })
    //   .select()
    //   .single()

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: uploadData.path,
    })

  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    )
  }
}
