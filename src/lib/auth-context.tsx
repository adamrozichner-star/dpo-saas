'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'

// CRITICAL: No Supabase initialization at module level or in useMemo
// Everything must happen inside useEffect to avoid build-time errors

interface AuthContextType {
  user: User | null
  session: Session | null
  supabase: SupabaseClient | null
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null)

  // Initialize Supabase client only on client-side, inside useEffect
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables')
      setLoading(false)
      return
    }

    const client = createClient(supabaseUrl, supabaseAnonKey)
    setSupabaseClient(client)

    // Get initial session
    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    if (!supabaseClient) return { error: new Error('Supabase not initialized') }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })

    if (!error && data.user) {
      // Create user profile in our users table
      await supabaseClient.from('users').insert({
        auth_user_id: data.user.id,
        email: email,
        name: name,
        role: 'admin'
      })

      // Send welcome email
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'welcome',
            to: email,
            data: {
              name: name,
              orgName: 'הארגון שלך' // Will be updated after onboarding
            }
          })
        })
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
        // Don't fail registration if email fails
      }
    }

    return { error: error as Error | null }
  }

  const signIn = async (email: string, password: string) => {
    if (!supabaseClient) return { error: new Error('Supabase not initialized') }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut()
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      supabase: supabaseClient,
      signUp,
      signIn,
      signOut,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
