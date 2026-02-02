'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

async function handleLogout() {
  'use server'
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function LogoutForm() {
  return (
    <form action={handleLogout}>
      <button
        type="submit"
        style={{
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Logout
      </button>
    </form>
  )
}
