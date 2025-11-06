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
    // Optional authentication: validate if header is present; otherwise proceed as public
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const authResult = await authenticateUser(req);
        if (!authResult.success) {
          console.log('Auth provided but invalid, proceeding as public:', authResult.error);
        }
      }
    } catch (authErr) {
      console.log('Auth check error, proceeding as public:', authErr);
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
    let rawCsvContent = ''; // Store original CSV for retry
    
    // Helpers for Google Sheets/CSV
    const csvToMarkdown = (csv: string) => {
      const lines = csv.trim().split(/\r?\n/);
      if (lines.length === 0) return csv;
      
      // Parse CSV properly (handle quoted fields with commas)
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };
      
      const rows = lines.map(parseCsvLine);
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
        const idIndex = path.findIndex(p => p === 'd');
        const sheetId = idIndex !== -1 && path[idIndex + 1] ? path[idIndex + 1] : null;
        const gid = u.searchParams.get('gid') || '0';
        if (!sheetId) return null;
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      } catch { return null; }
    };

    // Direct parser for markdown tables (Google Sheets format)
    // Groups all content by weeks - each week becomes a module with all topics as sub-modules
    const parseMarkdownTable = (markdown: string): any | null => {
      try {
        console.log('Attempting direct markdown table parsing...');
        const lines = markdown.trim().split('\n').filter(l => l.trim().startsWith('|'));
        if (lines.length < 3) return null; // Need at least header, separator, one row
        
        const parseRow = (line: string): string[] => 
          line.split('|').map(c => c.trim()).filter(c => c && c !== '---');
        
        const headers = parseRow(lines[0]);
        const dataRows = lines.slice(2).map(parseRow); // Skip separator
        
        if (dataRows.length === 0) return null;
        
        // Find column indices
        const weekIdx = headers.findIndex(h => /week/i.test(h));
        const topicIdx = headers.findIndex(h => /training.*topic|topic/i.test(h));
        const modulesIdx = headers.findIndex(h => /modules?/i.test(h));
        const resourcesIdx = headers.findIndex(h => /resources?|links?/i.test(h)) || headers.length - 1;
        
        console.log(`Found columns: Week=${weekIdx}, Topic=${topicIdx}, Modules=${modulesIdx}, Resources=${resourcesIdx}`);
        
        if (weekIdx === -1 || topicIdx === -1 || modulesIdx === -1) {
          console.log('Required columns not found');
          return null;
        }
        
        const course = {
          course_name: 'Full Stack Web Development Bootcamp',
          course_description: 'Comprehensive bootcamp covering web development fundamentals and advanced topics.',
          course_type: 'Technical',
          difficulty_level: 'Intermediate',
          target_role: 'Full Stack Developer',
          learning_objectives: 'Master modern web development technologies and build production-ready applications.'
        };
        
        // Group rows by week
        const weekMap = new Map<string, any[]>();
        
        for (const row of dataRows) {
          if (row.length < 2) continue;
          
          const weekCell = row[weekIdx] || '';
          const topicCell = row[topicIdx] || '';
          const modulesCell = row[modulesIdx] || '';
          const resourcesCell = row[resourcesIdx] || '';
          
          if (!topicCell.trim()) continue;
          
          // Extract week number (e.g., "Week 1" -> "Week 1")
          const weekMatch = weekCell.match(/Week\s*\d+/i);
          const weekKey = weekMatch ? weekMatch[0] : 'Week 1';
          
          if (!weekMap.has(weekKey)) {
            weekMap.set(weekKey, []);
          }
          
          weekMap.get(weekKey)!.push({
            topic: topicCell.trim(),
            modules: modulesCell.trim(),
            resources: resourcesCell.trim()
          });
        }
        
        console.log(`Found ${weekMap.size} weeks with content`);
        
        // Build modules array - one module per week
        const modules: any[] = [];
        
        for (const [weekName, rowsInWeek] of weekMap.entries()) {
          const subModules: any[] = [];
          
          // Each row in the week becomes a sub-module
          // Keep all content from each cell together
          for (const rowData of rowsInWeek) {
            const { topic, modules: modulesText, resources: resourcesText } = rowData;
            
            // Parse resources/URLs for this specific topic
            const urlPattern = /(https?:\/\/[^\s,\)]+)/g;
            const urls = resourcesText.match(urlPattern) || [];
            
            // Keep the entire cell content together as one sub-module
            // The modulesText describes what's covered in this topic
            subModules.push({
              sub_module_name: topic,
              sub_module_description: modulesText || `Learn about ${topic}`,
              content_type: urls.length > 0 ? 'External Link' : 'Mixed',
              content_url: urls.join(', '), // Include all URLs for this topic
              resources: resourcesText,
              estimated_duration_minutes: 90
            });
          }
          
          // Create module for this week
          modules.push({
            module_name: weekName,
            module_description: `${weekName} curriculum covering ${rowsInWeek.map(r => r.topic).join(', ')}`,
            content_type: 'Mixed',
            estimated_duration_minutes: subModules.length * 90,
            sub_modules: subModules
          });
        }
        
        if (modules.length === 0) return null;
        
        console.log(`Direct parsing successful: extracted ${modules.length} modules with ${modules.reduce((sum, m) => sum + m.sub_modules.length, 0)} total sub-modules`);
        return { course, modules };
        
      } catch (e) {
        console.log('Direct parsing failed:', e);
        return null;
      }
    };

    // Robust fallback chain: CSV fetch → Direct parse → Firecrawl → AI (Lovable → Gemini) → Retry → Fail
    let extractionAttempts = 0;
    let result: any = null;
    const maxRetries = 2;

    // Step 1: Fetch CSV/content if URL
    if (content.startsWith('http://') || content.startsWith('https://')) {
      const csvUrl = getSheetCsvExportUrl(content) || (content.endsWith('.csv') ? content : null);
      if (csvUrl) {
        try {
          console.log('Attempting CSV export fetch for structured source:', csvUrl);
          const csvResp = await fetch(csvUrl);
          if (csvResp.ok) {
            rawCsvContent = await csvResp.text();
            contentToProcess = csvToMarkdown(rawCsvContent);
            console.log('Fetched CSV and converted to markdown table');
          } else {
            console.log('CSV export fetch failed with status', csvResp.status);
          }
        } catch (e) {
          console.log('CSV export fetch errored:', e);
        }
      }

      // Basic fetch fallback
      if (contentToProcess === content) {
        try {
          console.log('Fetching content via basic fetch:', content);
          const resp = await fetch(content);
          if (resp.ok) {
            const contentType = resp.headers.get('content-type') || '';
            if (contentType.includes('text/csv')) {
              rawCsvContent = await resp.text();
              contentToProcess = csvToMarkdown(rawCsvContent);
              console.log('Basic fetch got CSV, converted to markdown');
            } else {
              contentToProcess = await resp.text();
              console.log('Successfully fetched content via basic fetch');
            }
          }
        } catch (fetchError) {
          console.log('Basic fetch failed:', fetchError);
        }
      }
    }

    // Step 2: Try direct parsing (no AI needed)
    console.log('=== Step 1: Direct Markdown Parsing ===');
    result = parseMarkdownTable(contentToProcess);
    
    // Step 3: Try Firecrawl if direct parsing failed and we have a URL
    if (!result && content.startsWith('http')) {
      console.log('=== Step 2: Firecrawl Extraction ===');
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
            const crawledContent = crawlResponse.data
              .map((page: { markdown?: string; html?: string }) => page.markdown || page.html || '')
              .join('\n\n---\n\n');
            console.log(`Crawled ${crawlResponse.data.length} pages, attempting direct parse...`);
            result = parseMarkdownTable(crawledContent);
            if (result) {
              console.log('Successfully parsed Firecrawl content directly!');
            }
          }
        } catch (error) {
          console.log('Firecrawl failed:', error);
        }
      } else {
        console.log('Firecrawl API key not configured, skipping...');
      }
    }

    // Step 4: Try AI extraction if still no result
    if (!result) {
      console.log('=== Step 3: AI Extraction (Lovable AI → Gemini) ===');
      
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('AI service not configured');
      }

      const systemPrompt = `You are an expert course designer. Analyze the provided content and extract:
1. Course details (name, description, type, difficulty, target role)
2. Hierarchical course structure with modules and sub-modules

IMPORTANT PARSING RULES:
- Each row with "Week X" represents a main MODULE
- The "Training Topic" column becomes the module name
- Items in the "Modules" column become SUB-MODULES under that module
- Each bullet point or line in "Modules" column is a separate sub-module
- Resources from "Resources" column should be extracted and included

Return ONLY valid JSON with this structure:
{
  "course": {
    "course_name": "string",
    "course_description": "string (200-500 chars)",
    "course_type": "Technical|Soft Skills|Compliance|Leadership|Other",
    "difficulty_level": "Beginner|Intermediate|Advanced",
    "target_role": "string",
    "learning_objectives": "string (max 500 chars)"
  },
  "modules": [
    {
      "module_name": "string",
      "module_description": "string (100-300 chars)",
      "content_type": "Mixed",
      "estimated_duration_minutes": number,
      "sub_modules": [
        {
          "sub_module_name": "string",
          "sub_module_description": "string",
          "content_type": "External Link|Video|PDF|Text|Mixed",
          "content_url": "string (URL if available)",
          "resources": "string (all related resources)",
          "estimated_duration_minutes": number
        }
      ]
    }
  ]
}`;

      const userPrompt = `Source: ${source}\n\nContent:\n${contentToProcess.slice(0, 12000)}\n\nExtract the complete course structure.`;

      // Try Lovable AI (GPT-5-mini) with tool calling
      while (extractionAttempts < maxRetries && !result) {
        extractionAttempts++;
        const isRetry = extractionAttempts > 1;
        const useOriginalCsv = isRetry && rawCsvContent;
        
        console.log(`Attempt ${extractionAttempts}/${maxRetries} - Using ${useOriginalCsv ? 'original CSV' : 'processed markdown'}`);
        
        const contentForAI = useOriginalCsv ? rawCsvContent.slice(0, 12000) : contentToProcess.slice(0, 12000);
        const promptForAI = `Source: ${source}\n\nContent:\n${contentForAI}\n\nExtract the complete course structure.`;

        try {
          console.log('Calling Lovable AI (GPT-5-mini)...');
          let aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'openai/gpt-5-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptForAI }
              ],
              temperature: 0.3,
              max_tokens: 8000,
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'return_course_structure',
                    description: 'Return structured course with modules and sub-modules',
                    parameters: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        course: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            course_name: { type: 'string' },
                            course_description: { type: 'string' },
                            course_type: { type: 'string', enum: ['Technical', 'Soft Skills', 'Compliance', 'Leadership', 'Other'] },
                            difficulty_level: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
                            target_role: { type: 'string' },
                            learning_objectives: { type: 'string' }
                          },
                          required: ['course_name', 'course_description', 'course_type', 'difficulty_level']
                        },
                        modules: {
                          type: 'array',
                          items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                              module_name: { type: 'string' },
                              module_description: { type: 'string' },
                              content_type: { type: 'string' },
                              estimated_duration_minutes: { type: 'number' },
                              sub_modules: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  additionalProperties: false,
                                  properties: {
                                    sub_module_name: { type: 'string' },
                                    sub_module_description: { type: 'string' },
                                    content_type: { type: 'string' },
                                    content_url: { type: 'string' },
                                    resources: { type: 'string' },
                                    estimated_duration_minutes: { type: 'number' }
                                  },
                                  required: ['sub_module_name']
                                }
                              }
                            },
                            required: ['module_name']
                          }
                        }
                      },
                      required: ['course', 'modules']
                    }
                  }
                }
              ],
              tool_choice: { type: 'function', function: { name: 'return_course_structure' } }
            }),
          });

          // Try tool-call response
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const toolCalls = aiData.choices?.[0]?.message?.tool_calls;
            if (Array.isArray(toolCalls) && toolCalls.length > 0) {
              const tool = toolCalls.find((t: any) => t?.function?.name === 'return_course_structure');
              if (tool?.function?.arguments) {
                result = JSON.parse(tool.function.arguments);
                console.log(`Lovable AI succeeded with ${result.modules?.length || 0} modules`);
                break;
              }
            }
          }

          // Fallback to Gemini
          console.log('Lovable AI failed, trying Gemini...');
          aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptForAI }
              ],
              temperature: 0.4,
              max_tokens: 8000
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const contentText = aiData.choices?.[0]?.message?.content || '';
            let generatedText = contentText.trim()
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```\s*$/i, '');
            
            const jsonStart = generatedText.indexOf('{');
            const jsonEnd = generatedText.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              generatedText = generatedText.substring(jsonStart, jsonEnd + 1);
            }

            try {
              result = JSON.parse(generatedText);
              console.log(`Gemini succeeded with ${result.modules?.length || 0} modules`);
              break;
            } catch (parseError) {
              console.log('Gemini JSON parse failed:', (parseError as Error).message);
              // Try bracket balancing
              let fixedText = generatedText;
              const openBraces = (fixedText.match(/{/g) || []).length;
              const closeBraces = (fixedText.match(/}/g) || []).length;
              const openBrackets = (fixedText.match(/\[/g) || []).length;
              const closeBrackets = (fixedText.match(/]/g) || []).length;
              fixedText += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
              fixedText += '}'.repeat(Math.max(0, openBraces - closeBraces));
              
              try {
                result = JSON.parse(fixedText);
                console.log('Fixed JSON successfully!');
                break;
              } catch {
                console.log('Could not fix JSON');
              }
            }
          }

        } catch (error) {
          console.log(`Attempt ${extractionAttempts} failed:`, error);
        }
      }

      // Final fallback if all failed
      if (!result) {
        console.error('All extraction methods failed');
        throw new Error('Failed to extract course structure after all attempts');
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
