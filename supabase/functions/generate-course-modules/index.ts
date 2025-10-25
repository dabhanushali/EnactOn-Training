import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateModulesRequest {
  prompt: string;
  courseType?: string;
  targetRole?: string;
  difficultyLevel?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const { prompt, courseType, targetRole, difficultyLevel }: GenerateModulesRequest = await req.json();

    if (!prompt || prompt.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          error: 'Please provide a more specific and detailed description for the course modules. For example: "Create modules for an introductory Python programming course covering variables, functions, and basic data structures"' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build enhanced prompt with context
    const enhancedPrompt = `
You are an expert instructional designer and curriculum developer creating comprehensive course modules for a professional learning management system.

CONTEXT:
- Course Type: ${courseType || 'General Professional Development'}
- Target Role: ${targetRole || 'General Professional'}
- Difficulty Level: ${difficultyLevel || 'Beginner'}
- Industry Focus: Corporate Training & Development

USER REQUEST: ${prompt}

TASK: Generate a well-structured curriculum of 4-8 progressive course modules that will effectively teach the requested subject matter.

FOR EACH MODULE, PROVIDE:

1. MODULE NAME: Create a clear, professional title that indicates the specific learning focus
2. MODULE DESCRIPTION: Write 3-4 detailed sentences that explain:
   - What specific concepts/skills will be covered
   - How this module builds on previous learning
   - What practical applications students will gain
   - The real-world relevance and value
3. CONTENT TYPE: Choose the most appropriate delivery method:
   - "video" for demonstrations, explanations, or visual learning
   - "text" for detailed guides, documentation, or reference material
   - "pdf" for downloadable resources, worksheets, or comprehensive guides
   - "external_link" for industry tools, websites, or third-party resources
   - "mixed_content" for modules requiring multiple content types
4. ESTIMATED DURATION: Provide realistic time estimates (15-180 minutes) based on:
   - Content complexity and depth
   - Target audience experience level
   - Practical exercises and application time
5. LEARNING OBJECTIVES: Create 3-4 specific, measurable outcomes using action verbs:
   - Use Bloom's taxonomy (analyze, evaluate, create, apply, etc.)
   - Focus on practical, job-relevant skills
   - Ensure objectives build progressively in complexity
6. SUGGESTED ACTIVITIES: Include 2-3 practical activities such as:
   - Hands-on exercises or simulations
   - Case studies or real-world scenarios
   - Assessment methods or knowledge checks
   - Collaborative or individual projects

STRUCTURE YOUR RESPONSE AS A JSON ARRAY:
[
  {
    "module_name": "Comprehensive Module Title",
    "module_description": "Detailed 3-4 sentence description covering concepts, applications, progression, and value proposition for learners in their professional development journey.",
    "content_type": "video",
    "estimated_duration_minutes": 90,
    "learning_objectives": [
      "Apply specific methodology to solve real-world problems",
      "Analyze complex scenarios using industry best practices", 
      "Create actionable plans based on learned frameworks",
      "Evaluate solutions using established criteria"
    ],
    "suggested_activities": [
      "Interactive case study analysis with peer discussion",
      "Hands-on project applying module concepts to workplace scenario",
      "Knowledge assessment quiz with immediate feedback"
    ]
  }
]

QUALITY STANDARDS:
- Ensure logical pedagogical progression from foundational to advanced concepts
- Include practical application opportunities in every module
- Make content descriptions specific and professionally relevant
- Align content types with learning objectives for optimal engagement
- Consider cognitive load and provide appropriate pacing
- Include assessment and reinforcement opportunities
- Focus on transferable skills that add immediate workplace value
`;

    console.log('Generating modules with Gemini API...');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: enhancedPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API response received');

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No content generated by AI');
    }

    const candidate = data.candidates[0];
    if (!candidate?.content?.parts?.[0]?.text) {
      console.error('Invalid response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response structure from AI');
    }

    const generatedText = candidate.content.parts[0].text;
    console.log('Generated text:', generatedText);

    // Try to extract JSON from the response
    let modules;
    try {
      // Find JSON array in the response
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        modules = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      // Fallback: create a simple module structure from the text
      modules = [{
        module_name: "AI Generated Content",
        module_description: "The AI generated content that needs to be structured into proper modules.",
        content_type: "text",
        estimated_duration_minutes: 60,
        learning_objectives: ["Review AI-generated content", "Structure into proper modules"],
        suggested_activities: ["Manual review and editing"],
        ai_raw_content: generatedText
      }];
    }

    // Validate and clean the modules
    const cleanedModules = modules.map((module: any, index: number) => ({
      module_name: module.module_name || `Module ${index + 1}`,
      module_description: module.module_description || 'AI-generated module description',
      content_type: ['text', 'video', 'pdf', 'external_link', 'mixed_content'].includes(module.content_type) 
        ? module.content_type 
        : 'text',
      estimated_duration_minutes: Math.max(15, Math.min(300, module.estimated_duration_minutes || 60)),
      learning_objectives: Array.isArray(module.learning_objectives) ? module.learning_objectives : [],
      suggested_activities: Array.isArray(module.suggested_activities) ? module.suggested_activities : [],
      module_order: index + 1
    }));

    console.log('Successfully generated', cleanedModules.length, 'modules');

    return new Response(
      JSON.stringify({ 
        success: true,
        modules: cleanedModules,
        originalPrompt: prompt,
        contextUsed: { courseType, targetRole, difficultyLevel }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-course-modules function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});