import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import Firecrawl from "npm:@mendable/firecrawl-js@4.4.1";
import { authenticateUser } from "../_shared/auth.ts";

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
    // Authenticate user using shared utility
    const authResult = await authenticateUser(req);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: authResult.status }
      );
    }

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
    
    // Helpers for Google Sheets/CSV
    const csvToMarkdown = (csv: string) => {
      const rows = csv.trim().split(/\r?\n/).map(r => r.split(','));
      if (rows.length === 0) return csv;
      const header = `| ${rows[0].join(' | ')} |`;
      const sep = `| ${rows[0].map(() => '---').join(' | ')} |`;
      const body = rows.slice(1).map(r => `| ${r.join(' | ')} |`).join('\n');
      return [header, sep, body].join('\n');
    };

    const getSheetCsvExportUrl = (url: string) => {
      try {
        const u = new URL(url);
        if (!u.hostname.includes('docs.google.com')) return null;
        const path = u.pathname.split('/');
        // /spreadsheets/d/{id}/...
        const idIndex = path.findIndex(p => p === 'd');
        const sheetId = idIndex !== -1 && path[idIndex + 1] ? path[idIndex + 1] : null;
        const gid = u.searchParams.get('gid') || '0';
        if (!sheetId) return null;
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      } catch { return null; }
    };

    // If content looks like a URL, try specific handlers first (Sheets/CSV), then Firecrawl, then basic fetch
    if (content.startsWith('http://') || content.startsWith('https://')) {
      // Try Google Sheets CSV export
      const csvUrl = getSheetCsvExportUrl(content) || (content.endsWith('.csv') ? content : null);
      if (csvUrl) {
        try {
          console.log('Attempting CSV export fetch for structured source:', csvUrl);
          const csvResp = await fetch(csvUrl);
          if (csvResp.ok) {
            const csvText = await csvResp.text();
            contentToProcess = csvToMarkdown(csvText);
            console.log('Fetched CSV and converted to markdown table');
          } else {
            console.log('CSV export fetch failed with status', csvResp.status);
          }
        } catch (e) {
          console.log('CSV export fetch errored, will fallback:', e);
        }
      }

      // If still not processed, use Firecrawl (if configured)
      if (contentToProcess === content) {
        const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
        if (FIRECRAWL_API_KEY) {
          try {
            console.log('Crawling content with Firecrawl SDK from URL:', content);
            const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
            const crawlResponse = await firecrawl.crawl(content, { 
              limit: 10,
              scrapeOptions: { formats: ['markdown', 'html'] }
            });
            if (crawlResponse && Array.isArray(crawlResponse.data) && crawlResponse.data.length > 0) {
              contentToProcess = crawlResponse.data
                .map((page: { markdown?: string; html?: string }) => page.markdown || page.html || '')
                .join('\n\n---\n\n');
              console.log(`Successfully crawled ${crawlResponse.data.length} pages with Firecrawl SDK (status: ${crawlResponse.status})`);
            } else {
              console.log('Firecrawl returned no data');
            }
          } catch (error) {
            console.log('Firecrawl SDK failed:', error);
          }
        }
      }

      // Final fallback to basic fetch
      if (contentToProcess === content) {
        try {
          console.log('Fetching content via basic fetch:', content);
          const resp = await fetch(content);
          if (resp.ok) {
            const contentType = resp.headers.get('content-type') || '';
            if (contentType.includes('text/csv')) {
              const csvText = await resp.text();
              contentToProcess = csvToMarkdown(csvText);
              console.log('Basic fetch got CSV, converted to markdown');
            } else {
              contentToProcess = await resp.text();
              console.log('Successfully fetched content via basic fetch');
            }
          } else {
            console.log('Basic fetch failed with status', resp.status);
          }
        } catch (fetchError) {
          console.log('Basic fetch failed, proceeding with URL reference only:', fetchError);
        }
      }
    }

    const systemPrompt = `You are an expert course designer. Analyze the provided Google Sheets content and extract:
1. Course details (name, description, type, difficulty, target role)
2. Hierarchical course structure with modules and sub-modules

IMPORTANT PARSING RULES:
- Each row with "Week X" represents a main MODULE
- The "Training Topic" column becomes the module name
- Items in the "Modules" column become SUB-MODULES under that module
- Each bullet point or line in "Modules" column is a separate sub-module
- Resources from "Resources" or "Column 4" should be extracted and included

Return ONLY valid JSON with this structure:
{
  "course": {
    "course_name": "string (derive from sheet content or first Training Topic)",
    "course_description": "string (200-500 chars, summarize the overall course)",
    "course_type": "one of: Technical, Soft Skills, Compliance, Leadership, Other",
    "difficulty_level": "one of: Beginner, Intermediate, Advanced",
    "target_role": "string (job role this course is for)",
    "learning_objectives": "string (key outcomes, max 500 chars)"
  },
  "modules": [
    {
      "module_name": "string (from Training Topic column)",
      "module_description": "string (100-300 chars)",
      "content_type": "Mixed",
      "estimated_duration_minutes": number (60-240 for main modules),
      "sub_modules": [
        {
          "sub_module_name": "string (from Modules column content)",
          "sub_module_description": "string (brief description)",
          "content_type": "one of: External Link, Video, PDF, Text, Mixed",
          "content_url": "string (URL from Resources if available)",
          "resources": "string (all related resources/links)",
          "estimated_duration_minutes": number (15-120)
        }
      ]
    }
  ]
}`;

    const userPrompt = `Source: ${source}

Content to analyze (Google Sheets data):
${contentToProcess.slice(0, 12000)}

INSTRUCTIONS:
1. Identify the overall course name from the sheet content
2. Each "Week X" row becomes a MODULE with name from "Training Topic" column
3. Parse "Modules" column content - each bullet/item becomes a SUB-MODULE
4. Extract URLs and resources from the "Resources" or rightmost column
5. Match resources to their corresponding sub-modules
6. Create hierarchical structure: Course → Modules → Sub-Modules

Extract the complete course structure with all modules and sub-modules.`;

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
        temperature: 0.5,
        max_tokens: 8000
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
          temperature: 0.5,
          max_tokens: 8000
        }),
      });
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response received, length:', aiData.choices?.[0]?.message?.content?.length || 0);
    
    let generatedText = aiData.choices?.[0]?.message?.content || '';
    
    // Robust JSON extraction
    generatedText = generatedText.trim();
    
    // Remove markdown code blocks
    generatedText = generatedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    
    // Try to find JSON object boundaries if there's extra text
    const jsonStart = generatedText.indexOf('{');
    const jsonEnd = generatedText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      generatedText = generatedText.substring(jsonStart, jsonEnd + 1);
    }
    
    console.log('Attempting to parse JSON, length:', generatedText.length);
    
    let result;
    try {
      result = JSON.parse(generatedText);
      console.log('Successfully parsed JSON with', result.modules?.length || 0, 'modules');
    } catch (parseError) {
      console.error('JSON parse failed:', parseError.message);
      console.error('First 500 chars:', generatedText.substring(0, 500));
      console.error('Last 500 chars:', generatedText.substring(Math.max(0, generatedText.length - 500)));
      
      // Try to salvage partial JSON by finding complete objects
      try {
        // Attempt to close incomplete JSON by adding missing closing braces
        let fixedText = generatedText;
        const openBraces = (fixedText.match(/{/g) || []).length;
        const closeBraces = (fixedText.match(/}/g) || []).length;
        const openBrackets = (fixedText.match(/\[/g) || []).length;
        const closeBrackets = (fixedText.match(/]/g) || []).length;
        
        // Add missing closing brackets/braces
        fixedText += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
        fixedText += '}'.repeat(Math.max(0, openBraces - closeBraces));
        
        console.log('Attempting to fix incomplete JSON...');
        result = JSON.parse(fixedText);
        console.log('Successfully fixed and parsed JSON!');
      } catch (fixError) {
        console.error('Could not fix JSON, using fallback');
        result = {
          course: {
            course_name: `Course from ${source}`,
            course_description: 'AI extraction incomplete - please review and edit. Try with a smaller sheet or fewer modules.',
            course_type: 'Technical',
            difficulty_level: 'Intermediate',
            target_role: '',
            learning_objectives: ''
          },
          modules: [{
            module_name: `Content from ${source}`,
            module_description: 'AI extraction incomplete - please review and edit',
            content_type: 'Mixed',
            estimated_duration_minutes: 60,
            sub_modules: [{
              sub_module_name: 'Module Content',
              sub_module_description: 'Please review and edit',
              content_type: content.startsWith('http') ? 'External Link' : 'Text',
              content_url: content.startsWith('http') ? content : '',
              resources: '',
              estimated_duration_minutes: 30
            }]
          }]
        };
      }
    }

    // Helper function to validate external URLs
    const isExternalURL = (url: string): boolean => {
      if (!url) return false;
      try {
        const urlObj = new URL(url.trim());
        const externalDomains = [
          'youtube.com', 'youtu.be', 'vimeo.com', 'loom.com',
          'figma.com', 'drive.google.com', 'docs.google.com',
          'notion.so', 'notion.site', 'clickup.com', 'trello.com',
          'miro.com', 'dropbox.com', 'github.com'
        ];
        return urlObj.protocol.startsWith('http') &&
               externalDomains.some(domain => urlObj.hostname.includes(domain));
      } catch {
        return false;
      }
    };

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
        .map((module, index) => {
          const contentUrl = module.content_url || '';
          const hasUrl = contentUrl.trim().length > 0;
          let contentType = module.content_type || 'Mixed';

          // Normalize content type to proper case
          const typeMap: { [key: string]: string } = {
            'link': 'External Link',
            'external link': 'External Link',
            'video': 'Video',
            'pdf': 'PDF',
            'text': 'Text',
            'mixed': 'Mixed'
          };
          contentType = typeMap[contentType.toLowerCase()] || contentType;

          // Validate and default content type
          const validTypes = ['External Link', 'Video', 'PDF', 'Text', 'Mixed'];
          if (!validTypes.includes(contentType)) {
            contentType = 'Mixed';
          }

          // Process sub-modules if they exist
          const subModules = (module.sub_modules || [])
            .filter(sm => sm && typeof sm === 'object')
            .map((subModule, subIndex) => {
              const subContentUrl = subModule.content_url || '';
              const subHasUrl = subContentUrl.trim().length > 0;
              let subContentType = subModule.content_type;

              // Normalize sub-module content type
              if (subContentType) {
                subContentType = typeMap[subContentType.toLowerCase()] || subContentType;
              }

              // Auto-set to External Link if URL is external
              if (subHasUrl && (!subContentType || subContentType === 'Mixed') && isExternalURL(subContentUrl)) {
                subContentType = 'External Link';
              }

              // Validate sub-module content type
              if (!validTypes.includes(subContentType)) {
                subContentType = subHasUrl && isExternalURL(subContentUrl) ? 'External Link' : 'Text';
              }

              return {
                sub_module_name: (subModule.sub_module_name || `Sub-module ${subIndex + 1}`).slice(0, 200),
                sub_module_description: (subModule.sub_module_description || 'No description').slice(0, 500),
                content_type: subContentType,
                content_url: subContentUrl,
                resources: (subModule.resources || '').slice(0, 1000),
                estimated_duration_minutes: Math.min(Math.max(subModule.estimated_duration_minutes || 30, 10), 180)
              };
            });

          return {
            module_name: (module.module_name || `Module ${index + 1}`).slice(0, 200),
            module_description: (module.module_description || 'No description').slice(0, 500),
            content_type: contentType,
            content_url: contentUrl,
            estimated_duration_minutes: Math.min(Math.max(module.estimated_duration_minutes || 120, 30), 480),
            module_order: index + 1,
            sub_modules: subModules
          };
        })
        .slice(0, 20),
      source
    };

    const totalSubModules = cleanedResult.modules.reduce((sum, m) => sum + (m.sub_modules?.length || 0), 0);
    console.log(`Successfully extracted course with ${cleanedResult.modules.length} modules and ${totalSubModules} sub-modules`);

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
