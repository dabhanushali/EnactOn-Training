import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Firecrawl from "npm:@mendable/firecrawl-js@4.4.1";
import { authenticateUser } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateCourseRequest {
  content: string;
  source: string;
}

interface CourseStructure {
  course: {
    course_name: string;
    course_description: string;
    course_type: string;
    difficulty_level: string;
    target_role: string;
    learning_objectives: string;
  };
  modules: Array<{
    module_name: string;
    module_description: string;
    content_type: string;
    content_url?: string;
    estimated_duration_minutes: number;
    module_order: number;
  }>;
}

/**
 * Scrapes content from a URL using Firecrawl API with fallback to basic fetch
 */
async function scrapeContent(url: string): Promise<string> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

  if (FIRECRAWL_API_KEY) {
    try {
      console.log('Attempting to scrape content with Firecrawl from URL:', url);

      const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
      const crawlResponse = await firecrawl.crawl(url, {
        limit: 10,
        scrapeOptions: {
          formats: ['markdown', 'html']
        }
      });

      if (crawlResponse && crawlResponse.data && Array.isArray(crawlResponse.data) && crawlResponse.data.length > 0) {
        const content = crawlResponse.data
          .map((page: { markdown?: string; html?: string }) => page.markdown || page.html || '')
          .join('\n\n---\n\n');
        console.log(`Successfully scraped ${crawlResponse.data.length} pages with Firecrawl`);
        return content;
      } else {
        throw new Error('No data returned from Firecrawl');
      }
    } catch (error) {
      console.log('Firecrawl scraping failed, attempting basic fetch:', error);
    }
  }

  // Fallback to basic fetch
  try {
    console.log('Falling back to basic fetch for URL:', url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const content = await response.text();
    console.log('Successfully fetched content with basic fetch');
    return content;
  } catch (error) {
    throw new Error(`Failed to scrape content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates course structure using AI with fallback system
 */
async function generateCourseWithAI(scrapedText: string, source: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('AI service not configured');
  }

  const systemPrompt = `You are an expert course designer and curriculum developer. Your task is to analyze the provided content and create a comprehensive course structure.

CONTENT ANALYSIS REQUIREMENTS:
- Extract key concepts, topics, and learning objectives from the content
- Identify the appropriate course type, difficulty level, and target audience
- Structure the content into logical, progressive modules
- Ensure modules build upon each other pedagogically

REQUIRED OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "course": {
    "course_name": "string (concise, professional title, max 200 chars)",
    "course_description": "string (detailed description of what the course covers, 200-500 chars)",
    "course_type": "one of: Technical, Soft Skills, Compliance, Leadership, Other",
    "difficulty_level": "one of: Beginner, Intermediate, Advanced",
    "target_role": "string (primary job role or audience this course serves)",
    "learning_objectives": "string (key outcomes and skills learners will gain, max 500 chars)"
  },
  "modules": [
    {
      "module_name": "string (clear, specific module title, max 100 chars)",
      "module_description": "string (detailed explanation of module content and objectives, 100-300 chars)",
      "content_type": "one of: External Link, Video, PDF, Text, Mixed",
      "content_url": "string (optional URL if applicable, leave empty if not)",
      "estimated_duration_minutes": number (realistic time estimate 15-180 minutes)
    }
  ]
}

GUIDELINES:
- Create 4-10 modules that provide comprehensive coverage
- Ensure logical progression from foundational to advanced concepts
- Include practical applications and real-world relevance
- Make content engaging and professionally valuable
- Use appropriate content types based on the material
- Provide accurate time estimates based on content complexity`;

  const userPrompt = `Source: ${source}

Please analyze the following content and create a structured course:

${scrapedText.slice(0, 10000)}

Create a complete course structure with course details and modules.`;

  // Primary AI Call: Gemini
  try {
    console.log('Attempting course generation with Gemini...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        max_tokens: 4000
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || '';
      if (generatedText.trim()) {
        console.log('Successfully generated course with Gemini');
        return generatedText;
      }
    }

    console.log('Gemini call failed or returned empty response');
  } catch (error) {
    console.log('Gemini call threw error:', error);
  }

  // Fallback AI Call: GPT-4o-mini
  try {
    console.log('Attempting course generation with GPT-4o-mini as fallback...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || '';
      if (generatedText.trim()) {
        console.log('Successfully generated course with GPT-4o-mini');
        return generatedText;
      }
    }

    throw new Error('Fallback AI call also failed');
  } catch (error) {
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses, validates, and cleans the AI response
 */
function validateAndCleanData(rawResponse: string): CourseStructure {
  // Clean the response
  let cleanedText = rawResponse.trim();
  cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

  let parsed: {
    course?: {
      course_name?: unknown;
      course_description?: unknown;
      course_type?: unknown;
      difficulty_level?: unknown;
      target_role?: unknown;
      learning_objectives?: unknown;
    };
    modules?: unknown[];
  };
  try {
    parsed = JSON.parse(cleanedText);
  } catch (parseError) {
    console.error('JSON parsing failed:', parseError);
    console.error('Raw response:', rawResponse);
    throw new Error('AI returned invalid JSON response');
  }

  // Validate top-level structure
  if (!parsed.course || !parsed.modules || !Array.isArray(parsed.modules)) {
    throw new Error('AI response missing required course or modules structure');
  }

  // Clean and validate course data
  const course = {
    course_name: (parsed.course.course_name || 'Generated Course').toString().trim().slice(0, 200),
    course_description: (parsed.course.course_description || 'Course generated from content').toString().trim().slice(0, 500),
    course_type: ['Technical', 'Soft Skills', 'Compliance', 'Leadership', 'Other'].includes(parsed.course.course_type as string)
      ? parsed.course.course_type as string
      : 'Technical',
    difficulty_level: ['Beginner', 'Intermediate', 'Advanced'].includes(parsed.course.difficulty_level as string)
      ? parsed.course.difficulty_level as string
      : 'Intermediate',
    target_role: (parsed.course.target_role || '').toString().trim().slice(0, 200),
    learning_objectives: (parsed.course.learning_objectives || '').toString().trim().slice(0, 500)
  };

  // Helper function to validate external URLs
  const isValidUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url.trim());
      return true;
    } catch {
      return false;
    }
  };

  // Clean and validate modules
  const modules = parsed.modules
    .filter((m: unknown) => m && typeof m === 'object' && m !== null)
    .slice(0, 20) // Limit to 20 modules max
    .map((module: unknown, index: number) => {
      const mod = module as Record<string, unknown>;
      const contentUrl = mod.content_url ? String(mod.content_url).trim() : '';
      let contentType = mod.content_type ? String(mod.content_type).trim() : '';

      // Normalize content type
      const typeMap: { [key: string]: string } = {
        'link': 'External Link',
        'external link': 'External Link',
        'video': 'Video',
        'pdf': 'PDF',
        'text': 'Text',
        'mixed': 'Mixed'
      };
      contentType = typeMap[contentType.toLowerCase()] || contentType;

      // Validate content type
      const validTypes = ['External Link', 'Video', 'PDF', 'Text', 'Mixed'];
      if (!validTypes.includes(contentType)) {
        contentType = contentUrl && isValidUrl(contentUrl) ? 'External Link' : 'Text';
      }

      const duration = mod.estimated_duration_minutes;
      const durationNum = typeof duration === 'number' ? duration : parseInt(String(duration)) || 60;

      return {
        module_name: (mod.module_name || `Module ${index + 1}`).toString().trim().slice(0, 100),
        module_description: (mod.module_description || 'Module content').toString().trim().slice(0, 300),
        content_type: contentType,
        content_url: contentUrl && isValidUrl(contentUrl) ? contentUrl : undefined,
        estimated_duration_minutes: Math.min(Math.max(durationNum, 15), 180),
        module_order: index + 1
      };
    });

  if (modules.length === 0) {
    throw new Error('No valid modules generated');
  }

  return { course, modules };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 1: Entry Point & Request Validation
    console.log('Starting generate-course-from-url function');

    // Authenticate user
    const authResult = await authenticateUser(req);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: authResult.status }
      );
    }

    // Parse and validate request
    const { content, source }: GenerateCourseRequest = await req.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Content (URL) is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(content.trim());
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Content must be a valid URL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const url = content.trim();
    const sourceName = (source || 'URL Content').toString().trim();

    // Step 2: Scrape Content from URL
    let scrapedText: string;
    try {
      scrapedText = await scrapeContent(url);
    } catch (error) {
      console.error('Scraping failed:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed at scraping step: ${error instanceof Error ? error.message : 'Unknown error'}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 3: Generate Course Structure with AI
    let rawAIResponse: string;
    try {
      rawAIResponse = await generateCourseWithAI(scrapedText, sourceName);
    } catch (error) {
      console.error('AI generation failed:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed at AI generation step: ${error instanceof Error ? error.message : 'Unknown error'}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 4: Parse, Validate, and Clean the AI Response
    let cleanedData: CourseStructure;
    try {
      cleanedData = validateAndCleanData(rawAIResponse);
    } catch (error) {
      console.error('Data validation failed:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed at data validation step: ${error instanceof Error ? error.message : 'Unknown error'}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 5: Send the Final Response
    console.log(`Successfully generated course "${cleanedData.course.course_name}" with ${cleanedData.modules.length} modules`);

    return new Response(
      JSON.stringify({
        success: true,
        ...cleanedData,
        source: sourceName,
        original_url: url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in generate-course-from-url:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
