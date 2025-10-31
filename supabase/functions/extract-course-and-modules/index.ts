import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Firecrawl from "npm:@mendable/firecrawl-js@1.10.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  content: string;
  source: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, source }: ExtractRequest = await req.json();

    if (!content || content.trim().length < 20) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Content is too short. Please provide more detailed content.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let contentToProcess = content;
    
    // If content looks like a URL, try Firecrawl first, then fallback to basic fetch
    if (content.startsWith('http://') || content.startsWith('https://')) {
      const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
      
      if (FIRECRAWL_API_KEY) {
        try {
          console.log('Crawling content with Firecrawl SDK from URL:', content);
          
          const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
          const crawlData = await firecrawl.crawl(content, { 
            limit: 10,
            scrapeOptions: {
              formats: ['markdown', 'html']
            }
          });
          
          if (crawlData && Array.isArray(crawlData) && crawlData.length > 0) {
            contentToProcess = crawlData
              .map((page: any) => page.markdown || page.html || '')
              .join('\n\n---\n\n');
            console.log(`Successfully crawled ${crawlData.length} pages with Firecrawl SDK`);
          } else {
            console.log('Firecrawl returned no data, falling back to basic fetch');
            throw new Error('No data from Firecrawl');
          }
        } catch (error) {
          console.log('Firecrawl SDK failed, attempting basic fetch:', error);
          try {
            const urlResponse = await fetch(content);
            if (urlResponse.ok) {
              contentToProcess = await urlResponse.text();
              console.log('Successfully fetched content with basic fetch');
            }
          } catch (fetchError) {
            console.log('Basic fetch also failed, will process URL as reference:', fetchError);
          }
        }
      } else {
        // No Firecrawl key, use basic fetch
        try {
          console.log('Fetching content from URL (no Firecrawl key):', content);
          const urlResponse = await fetch(content);
          if (urlResponse.ok) {
            contentToProcess = await urlResponse.text();
            console.log('Successfully fetched content from URL');
          }
        } catch (error) {
          console.log('Error fetching URL, will process as reference:', error);
        }
      }
    }

    const systemPrompt = `You are an expert course designer. Analyze the provided content and extract:
1. Course details (name, description, type, difficulty, target role)
2. Structured course modules

Return ONLY valid JSON with this structure:
{
  "course": {
    "course_name": "string (max 200 chars)",
    "course_description": "string (200-500 chars)",
    "course_type": "one of: Technical, Soft Skills, Compliance, Leadership, Other",
    "difficulty_level": "one of: Beginner, Intermediate, Advanced",
    "target_role": "string (job role this course is for)",
    "learning_objectives": "string (key outcomes, max 500 chars)"
  },
  "modules": [
    {
      "module_name": "string (max 100 chars)",
      "module_description": "string (100-300 chars)",
      "content_type": "one of: mixed, link, video, pdf, text",
      "content_url": "string (URL if available)",
      "estimated_duration_minutes": number (15-180)
    }
  ]
}`;

    const userPrompt = `Source: ${source}

Content to analyze:
${contentToProcess.slice(0, 8000)}

Extract course details and 3-10 modules from this content.`;

    console.log('Calling Lovable AI (Gemini) to extract course and modules...');
    
    let aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      }),
    });

    // If Gemini fails, try GPT-4 as fallback
    if (!aiResponse.ok) {
      console.log('Gemini failed, trying GPT-4 as fallback...');
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 3000
        }),
      });
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response received');
    
    let generatedText = aiData.choices?.[0]?.message?.content || '';
    
    // Clean up the response
    generatedText = generatedText.trim();
    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    let result;
    try {
      result = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedText);
      // Fallback
      result = {
        course: {
          course_name: `Course from ${source}`,
          course_description: 'Extracted content - please review and edit',
          course_type: 'Technical',
          difficulty_level: 'Intermediate',
          target_role: '',
          learning_objectives: ''
        },
        modules: [{
          module_name: `Content from ${source}`,
          module_description: 'Extracted content - please review and edit',
          content_type: 'mixed',
          content_url: content.startsWith('http') ? content : '',
          estimated_duration_minutes: 60
        }]
      };
    }

    // Validate and clean data
    const cleanedResult = {
      course: {
        course_name: (result.course?.course_name || 'Untitled Course').slice(0, 200),
        course_description: (result.course?.course_description || 'No description').slice(0, 500),
        course_type: ['Technical', 'Soft Skills', 'Compliance', 'Leadership', 'Other'].includes(result.course?.course_type) 
          ? result.course.course_type 
          : 'Technical',
        difficulty_level: ['Beginner', 'Intermediate', 'Advanced'].includes(result.course?.difficulty_level)
          ? result.course.difficulty_level
          : 'Intermediate',
        target_role: (result.course?.target_role || '').slice(0, 200),
        learning_objectives: (result.course?.learning_objectives || '').slice(0, 500)
      },
      modules: (result.modules || [])
        .filter(m => m && typeof m === 'object')
        .map((module, index) => ({
          module_name: (module.module_name || `Module ${index + 1}`).slice(0, 200),
          module_description: (module.module_description || 'No description').slice(0, 500),
          content_type: ['mixed', 'link', 'video', 'pdf', 'text'].includes(module.content_type) 
            ? module.content_type 
            : 'mixed',
          content_url: module.content_url || '',
          estimated_duration_minutes: Math.min(Math.max(module.estimated_duration_minutes || 60, 15), 300),
          module_order: index + 1
        }))
        .slice(0, 20),
      source
    };

    console.log(`Successfully extracted course with ${cleanedResult.modules.length} modules`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...cleanedResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-course-and-modules:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
