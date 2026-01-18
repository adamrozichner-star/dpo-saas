import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

export async function POST(request: NextRequest) {
    try {
          const body = await request.json()

      const {
              name,
              businessId,
              tier,
              answers,
              userId
      } = body

      if (!name || !businessId) {
              return NextResponse.json(
                { error: 'Missing required fields: name, businessId' },
                { status: 400 }
                      )
      }

      const { data, error } = await supabase
            .from('organizations')
            .insert([
              {
                          name,
                          business_id: businessId,
                          tier: tier || 'basic',
                          status: 'active',
                          risk_level: 'standard',
                          dpo_id: 'dpo-1',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
              }
                    ])
            .select()
            .single()

      if (error) {
              console.error('Supabase error:', error)
              return NextResponse.json(
                { error: 'Failed to create organization', details: error.message },
                { status: 500 }
                      )
      }

      return NextResponse.json({
              id: data.id,
              name: data.name,
              businessId: data.business_id,
              tier: data.tier,
              status: data.status,
              riskLevel: data.risk_level,
              dpoId: data.dpo_id,
              createdAt: data.created_at,
              updatedAt: data.updated_at
      })
    } catch (error: any) {
          console.error('API error:', error)
          return NextResponse.json(
            { error: 'Failed to process request', details: error.message },
            { status: 500 }
                )
    }
}
