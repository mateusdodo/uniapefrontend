// Attaches the current Supabase session token to every server function call.
import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | undefined
    if (typeof window !== 'undefined') {
      const { data } = await supabase.auth.getSession()
      token = data.session?.access_token
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)
