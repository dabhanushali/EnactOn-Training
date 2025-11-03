import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractModulesRequest {
  content: string;
  source: string;
  startingOrder: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, source, startingOrder = 1 }: ExtractModulesRequest = await req.json();

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
    
    // If content looks like a URL, fetch it
    if (content.startsWith('http://') || content.startsWith('https://')) {
      try {
        console.log('Fetching content from URL:', content);
        const urlResponse = await fetch(content);
        if (urlResponse.ok) {
          contentToProcess = await urlResponse.text();
          console.log('Successfully fetched content from URL');
        } else {
          console.log('Failed to fetch URL, will use URL as reference');
        }
      } catch (error) {
        console.log('Error fetching URL, will process as reference:', error);
      }
    }

    const systemPrompt = `You are an expert course designer. Your task is to analyze the provided content and extract structured course modules from it.

Extract logical modules from the content with the following structure:
- module_name: Clear, concise title (max 100 chars)
- module_description: Detailed description of what the module covers (100-300 chars)
- content_type: One of: External Link, Video, PDF, Text, Mixed - IMPORTANT: USE 'External Link' when content_url contains a URL
- content_url: Extract any relevant URLs mentioned, or leave empty
- estimated_duration_minutes: Realistic estimate based on content (15-180 minutes)

IMPORTANT: Return ONLY a valid JSON array. No additional text, explanations, or markdown.`;

    const userPrompt = `Source: ${source}

Content to analyze:
${contentToProcess.slice(0, 8000)}

Extract 3-10 course modules from this content. Return a JSON array of modules.`;

    console.log('Calling Lovable AI to extract modules...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        max_tokens: 2000
      }),
    });

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
    
    let modules;
    try {
      modules = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedText);
      // Fallback: create a basic module
      modules = [{
        module_name: `Content from ${source}`,
        module_description: 'Extracted content - please review and edit',
        content_type: content.startsWith('http') ? 'External Link' : 'Text',
        content_url: content.startsWith('http') ? content : '',
        estimated_duration_minutes: 60
      }];
    }

    if (!Array.isArray(modules)) {
      modules = [modules];
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

    // Validate and clean modules
    const cleanedModules = modules
      .filter(m => m && typeof m === 'object')
      .map((module, index) => {
        const contentUrl = module.content_url || '';
        const hasUrl = contentUrl.trim().length > 0;
        let contentType = module.content_type;

        // Normalize content type to proper case
        if (contentType) {
          const typeMap: { [key: string]: string } = {
            'link': 'External Link',
            'external link': 'External Link',
            'video': 'Video',
            'pdf': 'PDF',
            'text': 'Text',
            'mixed': 'Mixed'
          };
          contentType = typeMap[contentType.toLowerCase()] || contentType;
        }

        // Auto-set to External Link only if URL is external
        if (hasUrl && !contentType && isExternalURL(contentUrl)) {
          contentType = 'External Link';
        }

        // Validate and default content type
        const validTypes = ['External Link', 'Video', 'PDF', 'Text', 'Mixed'];
        if (!validTypes.includes(contentType)) {
          contentType = hasUrl && isExternalURL(contentUrl) ? 'External Link' : 'Text';
        }

        return {
          module_name: (module.module_name || `Module ${index + 1}`).slice(0, 200),
          module_description: (module.module_description || 'No description provided').slice(0, 500),
          content_type: contentType,
          content_url: contentUrl,
          estimated_duration_minutes: Math.min(Math.max(module.estimated_duration_minutes || 60, 15), 300),
          module_order: startingOrder + index
        };
      })
      .slice(0, 20); // Max 20 modules

    console.log(`Successfully extracted ${cleanedModules.length} modules`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        modules: cleanedModules,
        source 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-modules-from-content:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
