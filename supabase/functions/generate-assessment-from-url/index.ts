import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Firecrawl from "npm:@mendable/firecrawl-js@4.4.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateAssessmentRequest {
  url: string;
  assessmentType: 'quiz' | 'assignment' | 'project';
  courseId: string;
  courseName?: string;
}

interface QuizQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  points: number;
  explanation: string;
  options: Array<{
    option_text: string;
    is_correct: boolean;
  }>;
}

interface AssessmentStructure {
  title: string;
  description: string;
  instructions: string;
  passing_score: number;
  time_limit_minutes: number;
  questions?: QuizQuestion[];
  deliverables?: string[];
  milestones?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate assessment from URL called');
    
    const { url, assessmentType, courseId, courseName }: GenerateAssessmentRequest = await req.json();

    const { url, assessmentType, courseId, courseName }: GenerateAssessmentRequest = await req.json();

    if (!url || !url.startsWith('http')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please provide a valid URL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!assessmentType || !['quiz', 'assignment', 'project'].includes(assessmentType)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please select a valid assessment type' }),
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

    // Crawl the URL content
    let contentToProcess = '';
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (FIRECRAWL_API_KEY) {
      try {
        console.log('Crawling content with Firecrawl from URL:', url);
        
        const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
        const crawlResponse = await firecrawl.crawl(url, { 
          limit: 5,
          scrapeOptions: {
            formats: ['markdown']
          }
        });
        
        if (crawlResponse?.data?.length > 0) {
          contentToProcess = crawlResponse.data
            .map((page: { markdown?: string }) => page.markdown || '')
            .join('\n\n---\n\n');
          console.log(`Successfully crawled ${crawlResponse.data.length} pages`);
        } else {
          throw new Error('No data from Firecrawl');
        }
      } catch (error) {
        console.log('Firecrawl failed, attempting basic fetch:', error);
        try {
          const urlResponse = await fetch(url);
          if (urlResponse.ok) {
            contentToProcess = await urlResponse.text();
            console.log('Successfully fetched content with basic fetch');
          }
        } catch (fetchError) {
          console.log('Basic fetch also failed:', fetchError);
        }
      }
    } else {
      // No Firecrawl key, use basic fetch
      try {
        console.log('Fetching content from URL (no Firecrawl key):', url);
        const urlResponse = await fetch(url);
        if (urlResponse.ok) {
          contentToProcess = await urlResponse.text();
        }
      } catch (error) {
        console.log('Error fetching URL:', error);
      }
    }

    if (!contentToProcess || contentToProcess.length < 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not fetch enough content from the URL. Please check the URL and try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Different prompts based on assessment type
    let systemPrompt = '';
    
    if (assessmentType === 'quiz') {
      systemPrompt = `You are an expert assessment creator. Analyze the provided content and create a comprehensive quiz.

Return ONLY valid JSON with this structure:
{
  "title": "string (descriptive quiz title, max 100 chars)",
  "description": "string (brief description of what this quiz covers, max 300 chars)",
  "instructions": "string (instructions for taking the quiz)",
  "passing_score": number (70-80),
  "time_limit_minutes": number (15-60 based on question count),
  "questions": [
    {
      "question_text": "string (clear question)",
      "question_type": "multiple_choice" or "true_false",
      "points": number (1-5 based on difficulty),
      "explanation": "string (explanation of correct answer)",
      "options": [
        {
          "option_text": "string",
          "is_correct": boolean
        }
      ]
    }
  ]
}

Generate 5-15 questions covering key concepts from the content. For multiple_choice, include 4 options with exactly 1 correct. For true_false, include 2 options (True/False).`;
    } else if (assessmentType === 'assignment') {
      systemPrompt = `You are an expert assessment creator. Analyze the provided content and create a practical assignment.

Return ONLY valid JSON with this structure:
{
  "title": "string (descriptive assignment title, max 100 chars)",
  "description": "string (detailed description of the assignment, 200-500 chars)",
  "instructions": "string (step-by-step instructions for completing the assignment)",
  "passing_score": number (60-80),
  "time_limit_minutes": number (60-480 based on complexity),
  "deliverables": [
    "string (specific deliverable 1)",
    "string (specific deliverable 2)"
  ]
}

Create an assignment that tests practical application of the concepts from the content. Include 3-7 specific deliverables.`;
    } else {
      systemPrompt = `You are an expert assessment creator. Analyze the provided content and create a comprehensive project.

Return ONLY valid JSON with this structure:
{
  "title": "string (descriptive project title, max 100 chars)",
  "description": "string (detailed project description, 300-600 chars)",
  "instructions": "string (comprehensive project guidelines and requirements)",
  "passing_score": number (60-80),
  "time_limit_minutes": number (480-2880 for projects, in days equivalent)",
  "deliverables": [
    "string (major deliverable 1)",
    "string (major deliverable 2)"
  ],
  "milestones": [
    "string (milestone 1 with checkpoint)",
    "string (milestone 2 with checkpoint)"
  ]
}

Create a project that demonstrates mastery of the content. Include 3-5 major deliverables and 2-4 milestones.`;
    }

    const userPrompt = `Course: ${courseName || 'Course Assessment'}
Source URL: ${url}

Content to analyze:
${contentToProcess.slice(0, 10000)}

Create a ${assessmentType} assessment based on this content.`;

    console.log(`Calling AI to generate ${assessmentType} assessment...`);
    
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
        max_tokens: 4000
      }),
    });

    // Fallback to GPT if Gemini fails
    if (!aiResponse.ok) {
      console.log('Gemini failed, trying GPT fallback...');
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
          max_tokens: 4000
        }),
      });
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let generatedText = aiData.choices?.[0]?.message?.content || '';
    
    // Clean up the response
    generatedText = generatedText.trim();
    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    let result: AssessmentStructure;
    try {
      result = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedText);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    // Validate and clean the result
    const cleanedResult = {
      assessment_type: assessmentType,
      title: (result.title || `${assessmentType} Assessment`).slice(0, 100),
      description: (result.description || 'Generated assessment').slice(0, 500),
      instructions: result.instructions || '',
      passing_score: Math.min(Math.max(result.passing_score || 70, 50), 100),
      time_limit_minutes: Math.min(Math.max(result.time_limit_minutes || 60, 5), 2880),
      is_mandatory: true,
      questions: assessmentType === 'quiz' ? (result.questions || []).map((q, idx) => ({
        question_text: q.question_text || `Question ${idx + 1}`,
        question_type: q.question_type === 'true_false' ? 'true_false' : 'multiple_choice',
        points: Math.min(Math.max(q.points || 1, 1), 10),
        question_order: idx + 1,
        explanation: q.explanation || '',
        options: (q.options || []).map((opt, optIdx) => ({
          option_text: opt.option_text || `Option ${optIdx + 1}`,
          is_correct: !!opt.is_correct,
          option_order: optIdx + 1
        }))
      })) : undefined,
      deliverables: result.deliverables || undefined,
      milestones: result.milestones || undefined,
      source_url: url
    };

    console.log(`Successfully generated ${assessmentType} assessment with ${cleanedResult.questions?.length || 0} questions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        assessment: cleanedResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-assessment-from-url:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
