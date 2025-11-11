import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Firecrawl from "npm:@mendable/firecrawl-js@4.4.1";
// Note: This is a placeholder for your actual auth implementation.
// You will need to create this file and export the function.
import { authenticateUser } from "../_shared/auth.ts";
// --- CORS Headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// --- Helper Functions ---
/**
 * Scrapes content from a URL using Firecrawl API with a fallback to basic fetch.
 */ async function scrapeContent(url) {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (FIRECRAWL_API_KEY) {
    try {
      console.log('Attempting to scrape content with Firecrawl from URL:', url);
      const firecrawl = new Firecrawl({
        apiKey: FIRECRAWL_API_KEY
      });
      const crawlResponse = await firecrawl.crawl(url, {
        limit: 10,
        scrapeOptions: {
          formats: [
            'markdown'
          ]
        }
      });
      if (crawlResponse?.data?.length > 0) {
        const content = crawlResponse.data.map((page)=>page.markdown || '').join('\n\n---\n\n');
        console.log(`Successfully scraped ${crawlResponse.data.length} pages with Firecrawl`);
        return content;
      }
      throw new Error('No data returned from Firecrawl');
    } catch (error) {
      console.log('Firecrawl scraping failed, attempting basic fetch:', error.message);
    }
  }
  // Fallback to basic fetch
  try {
    console.log('Falling back to basic fetch for URL:', url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const content = await response.text();
    console.log('Successfully fetched content with basic fetch');
    return content;
  } catch (error) {
    throw new Error(`Failed to scrape content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
/**
 * Generates a course structure from text using a primary AI model with a fallback.
 */ async function generateCourseWithAI(scrapedText, source) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('AI service not configured');
  const systemPrompt = `You are an expert course designer. Analyze the provided content to create a course structure.

REQUIRED OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "course": { "course_name": "string", "course_description": "string" },
  "modules": [
    {
      "module_name": "string",
      "module_description": "string",
      "contents": [
        {
          "content_title": "string (A concise, descriptive title for the resource)",
          "content_type": "one of: Video, External Link, PDF, Text, Project",
          "content_url": "string (direct URL or null)",
          "estimated_duration_minutes": "number"
        }
      ]
    }
  ]
}

CRITICAL INSTRUCTIONS:
- Each module MUST have a "contents" array.
- For EVERY individual resource (video, article), create a separate object in the "contents" array.
- You MUST generate a descriptive "content_title" for every single content object.
- If content mentions structures like "Month 1, Week 1", ALWAYS create modules for the weekly structure (e.g., "Module 1: Week 1"). Prioritize weeks over months.`;

  const userPrompt = `Source: ${source}\n\nPlease analyze the following content and create a structured course:\n\n${scrapedText.slice(0, 12000)}`;
  // Primary AI Call
  try {
    console.log('Attempting course generation with primary AI model...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8192
      })
    });
    if (response.ok) {
      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || '';
      if (generatedText.trim()) {
        console.log('Successfully generated course with primary model');
        return generatedText;
      }
    }
    console.log('Primary AI call failed or returned empty. Status:', response.status);
  } catch (error) {
    console.log('Primary AI call threw an error:', error.message);
  }
  // Fallback AI Call
  try {
    console.log('Attempting course generation with fallback AI model...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8192
      })
    });
    if (response.ok) {
      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || '';
      if (generatedText.trim()) {
        console.log('Successfully generated course with fallback model');
        return generatedText;
      }
    }
    throw new Error('Fallback AI call also failed');
  } catch (error) {
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
/**
 * Parses, validates, and cleans the AI-generated JSON response into a strict CourseStructure.
 * This version includes a retry mechanism for processing contentItems.
 */ function validateAndCleanData(rawResponse) {
  const cleanedText = rawResponse.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
  let parsed;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (parseError) {
    console.error('JSON parsing failed. Raw response:', rawResponse);
    throw new Error('AI returned invalid JSON response');
  }
  if (!parsed.course || !Array.isArray(parsed.modules)) {
    throw new Error('AI response missing required "course" or "modules" structure');
  }
  const course = {
    course_name: String(parsed.course.course_name || 'Generated Course').trim().slice(0, 200),
    course_description: String(parsed.course.course_description || 'Course generated from content').trim().slice(0, 500),
    course_type: [
      'Technical',
      'Soft Skills',
      'Compliance',
      'Leadership',
      'Other'
    ].includes(parsed.course.course_type) ? parsed.course.course_type : 'Technical',
    difficulty_level: [
      'Beginner',
      'Intermediate',
      'Advanced'
    ].includes(parsed.course.difficulty_level) ? parsed.course.difficulty_level : 'Intermediate',
    target_role: String(parsed.course.target_role || '').trim().slice(0, 200),
    learning_objectives: String(parsed.course.learning_objectives || '').trim().slice(0, 500)
  };
  const isValidUrl = (url)=>{
    if (!url) return false;
    try {
      new URL(url.trim());
      return true;
    } catch  {
      return false;
    }
  };
  const processContentItems = (items)=>{
    return items.filter((ci)=>ci && typeof ci === 'object').map((item)=>{
      const contentUrl = String(item.content_url || '').trim();
      let contentType = String(item.content_type || '').trim();
      const typeMap = {
        'link': 'External Link',
        'external link': 'External Link',
        'video': 'Video',
        'pdf': 'PDF',
        'text': 'Text',
        'project': 'Project'
      };
      contentType = typeMap[contentType.toLowerCase()] || contentType;
      const validTypes = [
        'External Link',
        'Video',
        'PDF',
        'Text',
        'Project'
      ];
      if (!validTypes.includes(contentType)) {
        contentType = contentUrl ? 'External Link' : 'Text';
      }
      const durationNum = parseInt(String(item.estimated_duration_minutes), 10) || 45;
      return {
        content_title: String(item.content_title || 'Untitled Content').trim(),
        content_type: contentType,
        content_url: isValidUrl(contentUrl) ? contentUrl : undefined,
        estimated_duration_minutes: Math.min(Math.max(durationNum, 5), 240)
      };
    });
  };
  const modules = parsed.modules.filter((m)=>m && typeof m === 'object' && m.module_name && Array.isArray(m.contents)).slice(0, 20).map((mod, index)=>{
    let processedContents = processContentItems(mod.contents);
    // --- START: RETRY LOGIC (CORRECTED) ---
    if (processedContents.length === 0 && mod.contents.length > 0) {
      const MAX_RETRIES = 3;
      for(let i = 0; i < MAX_RETRIES; i++){
        console.log(`--- WARNING: Module "${mod.module_name}" produced empty content. Retrying (${i + 1}/${MAX_RETRIES})...`);
        // Re-run the processing logic with the correct variables
        processedContents = processContentItems(mod.contents);
        // If successful, break out of the retry loop
        if (processedContents.length > 0) {
          console.log(`--- SUCCESS: Retry successful for module "${mod.module_name}".`);
          break;
        }
      }
    }
    // After all retries, if it's still empty, log a final error for debugging
    if (processedContents.length === 0 && mod.contents.length > 0) {
      console.error(`--- CRITICAL FAILURE: Could not process content for module "${mod.module_name}" after all retries.`);
      console.error('--- PROBLEMATIC ORIGINAL CONTENT:', JSON.stringify(mod.contents, null, 2));
    }
    // --- END: RETRY LOGIC (CORRECTED) ---
    return {
      module_name: String(mod.module_name || `Module ${index + 1}`).trim().slice(0, 100),
      module_description: String(mod.module_description || 'Module content').trim().slice(0, 300),
      contents: processedContents,
      module_order: index + 1
    };
  });
  if (modules.length === 0) {
    throw new Error('No valid modules could be generated from the AI response');
  }
  return {
    course,
    modules
  };
}
// --- Main Server Logic ---
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const authResult = await authenticateUser(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: authResult.error
      }), {
        status: authResult.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { content, source } = await req.json();
    if (!content || typeof content !== 'string' || !content.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Content (URL) is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    try {
      new URL(content.trim());
    } catch  {
      return new Response(JSON.stringify({
        success: false,
        error: 'Content must be a valid URL'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const url = content.trim();
    const sourceName = String(source || 'URL Content').trim();
    // Step 1: Scrape content
    const scrapedText = await scrapeContent(url);
    // Step 2: Generate course structure with AI
    const rawAIResponse = await generateCourseWithAI(scrapedText, sourceName);
    // Step 3: Validate and clean the AI response
    const cleanedData = validateAndCleanData(rawAIResponse);
    console.log(`Successfully generated course "${cleanedData.course.course_name}" with ${cleanedData.modules.length} modules.`);
    // Step 4: Return the successful response
    return new Response(JSON.stringify({
      success: true,
      ...cleanedData,
      source: sourceName,
      original_url: url
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('An error occurred in the main request handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
