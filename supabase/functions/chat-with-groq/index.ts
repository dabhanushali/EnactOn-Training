import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      console.error('GROQ_API_KEY environment variable not found')
      return new Response(
        JSON.stringify({ error: 'Groq API key not configured in Supabase secrets' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Groq API key found, length:', groqApiKey.length)
    console.log('API key starts with:', groqApiKey.substring(0, 10) + '...')

    const systemPrompt = `You are GrowPro Training Assistant, an AI chatbot inside the company's Learning Management System (EnactOn LMS).
Your main job is to help new joiners understand and complete their training roadmap.

You are designed to:
  1. Explain what each module or training in the roadmap is about.
  2. Suggest what to do next after completing a module.
  3. Help the user understand what to do when they encounter a particular onboarding scenario (e.g., technical issues, confusion about steps, blocked progress, or assignment doubts).
  4. Provide clear, actionable next steps for each situation.
Example types of questions you can handle:
    "I've completed the Induction module. What should I do next?"
    "I'm not able to access the Team Tools training."
    "My assignment link isn't working, what should I do?"
    "Can you explain what the 'Company Tools Overview' session is about?"
When replying:
  Use a friendly, encouraging, and clear tone.
  Give short, step-by-step guidance (prefer bullet points when possible).
  If the problem seems technical or requires manual help, suggest contacting the LMS support team or mentor politely.

Your goal: Make every new joiner feel guided, supported, and confident about completing their training roadmap — like a helpful mentor who's always available.`

    console.log('Making request to Groq API...')
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_completion_tokens: 500,
        temperature: 0.7,
      }),
    })

    console.log('Groq API response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API error response:', errorText)
      throw new Error(`Groq API request failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const botMessage = data.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response right now.'

    return new Response(
      JSON.stringify({ message: botMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in chat-with-groq function:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'I\'m having trouble responding right now. Please try again later, or contact your manager for immediate assistance.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
