import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Avtorizatsiya talab qilinadi' }), {
        status: 401, headers: jsonHeaders,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || supabaseServiceKey

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // User client — calls RPCs under the caller's JWT so RLS applies
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Authenticate caller
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Avtorizatsiya xatosi' }), {
        status: 401, headers: jsonHeaders,
      })
    }

    // Permission check: ai_analysis.can_view
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_owner, role_id, is_active')
      .eq('id', user.id)
      .single()

    if (!profile?.is_active) {
      return new Response(JSON.stringify({ error: "Sizda bu amalni bajarish huquqi yo'q" }), {
        status: 403, headers: jsonHeaders,
      })
    }

    let hasPerm = false
    if (profile?.is_owner) {
      hasPerm = true
    } else if (profile?.role_id) {
      const { data: perm } = await supabaseAdmin
        .from('role_permissions')
        .select('can_view')
        .eq('role_id', profile.role_id)
        .eq('module', 'ai_analysis')
        .maybeSingle()
      hasPerm = perm?.can_view === true
    }

    if (!hasPerm) {
      return new Response(JSON.stringify({ error: "Sizda bu amalni bajarish huquqi yo'q" }), {
        status: 403, headers: jsonHeaders,
      })
    }

    // Rate limiting: 20 per user per day (Asia/Tashkent)
    const todayTashkent = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' })
    )
    const startOfDay = new Date(
      todayTashkent.getFullYear(),
      todayTashkent.getMonth(),
      todayTashkent.getDate()
    )
    // Convert back to UTC for DB query (Tashkent = UTC+5)
    const startOfDayUTC = new Date(startOfDay.getTime() - 5 * 60 * 60 * 1000).toISOString()

    const { count, error: countError } = await supabaseAdmin
      .from('ai_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .gte('created_at', startOfDayUTC)

    if (countError) throw countError
    if ((count || 0) >= 20) {
      return new Response(JSON.stringify({ error: 'Kunlik tahlil limiti tugadi (20 ta)' }), {
        status: 429, headers: jsonHeaders,
      })
    }

    // Parse request
    const { branch_id, date_from, date_to } = await req.json()
    if (!date_from || !date_to) {
      return new Response(JSON.stringify({ error: "Sana oralig'i kiritilishi shart" }), {
        status: 400, headers: jsonHeaders,
      })
    }

    // =========================================================================
    // Fetch SSP data (under caller's RLS)
    // =========================================================================
    const { data: sspData, error: sspError } = await supabaseUser.rpc('get_ssp', {
      p_branch: branch_id || null,
      p_from: date_from,
      p_to: date_to,
    })
    if (sspError) throw sspError

    // Build input with SSP + weekly metric series
    const inputData: Record<string, unknown> = {
      ssp: sspData,
      weekly_series: {} as Record<string, unknown>,
    }

    // Gather metric IDs from the SSP result
    if (sspData?.departments) {
      for (const dept of sspData.departments) {
        for (const metric of dept.metrics || []) {
          if (!metric.id) continue
          const { data: seriesData } = await supabaseUser.rpc('get_metric_series', {
            p_branch: branch_id || null,
            p_metric: metric.id,
            p_from: date_from,
            p_to: date_to,
            p_grain: 'week',
          })
          if (seriesData) {
            ;(inputData.weekly_series as Record<string, unknown>)[metric.code] = seriesData
          }
        }
      }
    }

    // =========================================================================
    // Call Gemini API
    // =========================================================================
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const systemInstruction =
      "Siz ta'lim markazi uchun operatsion maslahatchi (consultant) sifatida ishlaysiz. " +
      "Faqat taqdim etilgan raqamlarga asoslanib javob bering. " +
      "Agar ma'lumot yetarli bo'lmasa, 'ma'lumot yetarli emas' deb yozing. " +
      "Barcha javoblarni o'zbek tilida (lotin alifbosida) yozing."

    const userPrompt =
      "Quyidagi Balanced Scorecard ma'lumotlarini tahlil qiling va STRICT JSON formatida javob bering: " +
      '{summary: string, weakest: [{metric_code, pct, gap, likely_causes: []}], ' +
      'recommendations: [{action, owner_role, deadline_days, expected_effect}], strengths: []}\n\n' +
      "Ma'lumotlar:\n" +
      JSON.stringify(inputData)

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API xatosi: ${geminiRes.status}`)
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse response JSON
    let parsedResult: unknown = null
    try {
      parsedResult = JSON.parse(rawText)
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[1])
      } else {
        throw new Error("Gemini javobini JSON formatida o'qib bo'lmadi")
      }
    }

    // =========================================================================
    // Store the analysis
    // =========================================================================
    const { error: insertError } = await supabaseAdmin.from('ai_analyses').insert({
      branch_id: branch_id || null,
      date_from,
      date_to,
      created_by: user.id,
      input_snapshot: inputData,
      result: parsedResult,
      model,
    })

    if (insertError) {
      console.error('Failed to save AI analysis:', insertError)
      // Still return the result to the user
    }

    return new Response(JSON.stringify(parsedResult), { status: 200, headers: jsonHeaders })
  } catch (error: unknown) {
    console.error('AI Analyze Error:', error)
    return new Response(JSON.stringify({ error: 'Tahlil jarayonida xatolik yuz berdi' }), {
      status: 500, headers: jsonHeaders,
    })
  }
})
