import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/auth-utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageCircle,
  Send,
  Minimize2,
  User,
  Lightbulb,
  MessageSquare,
  Zap,
  Heart
} from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

interface UserCourse {
  title: string;
  progress: number;
}

interface UserAssignment {
  title: string;
  due_date: string;
}

interface ProjectMilestone {
  milestone_name: string;
  due_date: string;
}

// Enhanced system prompt with course awareness and personalized support
const SYSTEM_PROMPT = (userCourses, userAssignments) => `You are EnactOn Training Assistant, an AI chatbot inside the company's Learning Management System (EnactOn LMS).
Your main job is to help new joiners understand and complete their training roadmap, navigate company systems, and connect with the right people for support.

**USER'S CURRENT COURSES AND ASSIGNMENTS:**
${userCourses?.length > 0 ? userCourses.map(course => `- ${course.title} (${course.progress}% complete)`).join('\n') : 'No courses enrolled yet'}
${userAssignments?.length > 0 ? `\n**CURRENT ASSIGNMENTS:**\n${userAssignments.map(assignment => `- ${assignment.title} (Due: ${assignment.due_date})`).join('\n')}` : ''}

You are designed to:
  1. Explain what each module or training in the roadmap is about, especially the user's enrolled courses.
  2. Suggest what to do next after completing a module, based on their current progress.
  3. Help the user understand what to do when they encounter a particular onboarding scenario (e.g., technical issues, confusion about steps, blocked progress, or assignment doubts).
  4. Provide clear, actionable next steps for each situation, tailored to their specific courses.
  5. Help users navigate to different company systems:
     - LMS (Learning Management System): https://lms.enacton.com
     - CRM (Customer Relationship Management): https://crm.enacton.com
     - HRMS (Human Resource Management System): https://hrms.enacton.com
  6. When users need advanced help or have complex issues, provide their Team Lead's contact information and encourage them to reach out.

Example types of questions you can handle:
  "I've completed the Induction module. What should I do next?"
  "I'm not able to access the Team Tools training."
  "My assignment link isn't working, what should I do?"
  "Can you explain what the 'Company Tools Overview' session is about?"
  "How do I access the CRM system?"
  "I need help with my employee benefits."
  "Who is my Team Lead?"
  "What's my next course after completing this one?"
  "Help me with my current assignment."

When replying:
  Use a friendly, encouraging, and clear tone.
  Give short, step-by-step guidance (prefer bullet points when possible).
  Reference the user's specific enrolled courses and current assignments when relevant.
  For system navigation, provide direct links when appropriate.
  If the problem seems technical or requires manual help, suggest contacting the LMS support team or mentor politely.
  For complex HR, payroll, or policy questions, always direct users to their Team Lead or HR department.
  Include Team Lead contact information when suggesting escalation.

Your goal: Make every new joiner feel guided, supported, and confident about completing their training roadmap and navigating company systems — like a helpful mentor who's always available.`;

export const GroqChatbot: React.FC = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [userAssignments, setUserAssignments] = useState<UserAssignment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userName = profile?.first_name || 'there';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user's enrolled courses
  useEffect(() => {
    const fetchUserCourses = async () => {
      if (!profile?.id) return;

      try {
        // Query the database to get user's enrolled courses
        // Based on updated schema: course_enrollments table
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('course_enrollments')
          .select(`
            status,
            enrolled_date,
            completion_date,
            courses (
              course_name
            )
          `)
          .eq('employee_id', profile.id)
          .in('status', ['enrolled', 'in_progress']);

        if (enrollmentsError) {
          console.error('Error fetching course enrollments:', enrollmentsError);
          setUserCourses([]);
          return;
        }

        // Transform the data to match our interface
        // Calculate progress based on enrollment status and dates
        const courses: UserCourse[] = enrollments?.map(enrollment => {
          let progress = 0;
          if (enrollment.status === 'completed' || enrollment.completion_date) {
            progress = 100;
          } else if (enrollment.status === 'in_progress') {
            // Estimate progress based on time elapsed since enrollment
            const enrolledDate = new Date(enrollment.enrolled_date);
            const now = new Date();
            const daysSinceEnrollment = Math.floor((now.getTime() - enrolledDate.getTime()) / (1000 * 60 * 60 * 24));
            // Assume typical course takes 30 days, cap at 90%
            progress = Math.min(Math.floor((daysSinceEnrollment / 30) * 100), 90);
          }

          return {
            title: enrollment.courses?.course_name || 'Unknown Course',
            progress: progress
          };
        }) || [];

        setUserCourses(courses);
      } catch (error) {
        console.error('Error fetching user courses:', error);
        setUserCourses([]);
      }
    };

    fetchUserCourses();
  }, [profile?.id]);

  // Fetch user's assignments (projects and milestones)
  useEffect(() => {
    const fetchUserAssignments = async () => {
      if (!profile?.id) return;

      try {
        // Query the database to get user's assigned projects
        // Join project_assignments with projects table
        const { data: assignments, error: assignmentsError } = await supabase
          .from('project_assignments')
          .select(`
            status,
            projects (
              project_name
            )
          `)
          .eq('assignee_id', profile.id)
          .eq('status', 'Not_Started');

        if (assignmentsError) {
          console.error('Error fetching user assignments:', assignmentsError);
          setUserAssignments([]);
          return;
        }

        // Transform assignments into user assignments
        const userAssignments: UserAssignment[] = assignments?.map(assignment => ({
          title: `Complete ${assignment.projects?.project_name || 'Unknown Project'}`,
          due_date: 'Ongoing'
        })) || [];

        setUserAssignments(userAssignments);
      } catch (error) {
        console.error('Error fetching user assignments:', error);
        setUserAssignments([]);
      }
    };

    fetchUserAssignments();
  }, [profile?.id]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'bot',
        content: `Hi ${userName}! 🎓 Welcome to EnactOn LMS! I'm your Training Assistant, here to guide you through your onboarding journey.\n\nI can help you with:\n• Understanding what each training module covers\n• Suggesting next steps after completing modules\n• Troubleshooting technical issues or access problems\n• Explaining assignments and learning activities\n• Providing clear guidance for any onboarding challenges\n\nWhat training question can I help you with today?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, profile, userName, messages.length]);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = { ...message, id: Date.now().toString(), timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
  };

  const callGroqAPI = async (userMessage: string): Promise<string> => {
    try {
      // Create personalized system prompt with user's courses and assignments
      const personalizedPrompt = SYSTEM_PROMPT(userCourses, userAssignments);

      const { data, error } = await supabase.functions.invoke('chat-with-groq', {
        body: {
          message: userMessage,
          systemPrompt: personalizedPrompt
        }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        return 'I\'m having trouble connecting right now. Please try again later.';
      }
      return data?.message || 'Sorry, I couldn\'t generate a response.';
    } catch (error) {
      console.error('Chat API error:', error);
      return 'I\'m having trouble connecting right now. Please try again later.';
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    addMessage({ type: 'user', content });
    setInputValue('');
    setIsTyping(true);
    try {
      const botResponse = await callGroqAPI(content);
      addMessage({ type: 'bot', content: botResponse });
    } catch (error) {
      addMessage({ type: 'bot', content: 'Sorry, an error occurred. Please try again.' });
    } finally {
      setIsTyping(false);
    }
  };

  // --- UI PART ---

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative group">
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-full w-16 h-16 shadow-2xl hover:shadow-primary/50 transition-all duration-300 bg-gradient-to-br from-primary to-primary-dark hover:scale-110"
          >
            <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" />
          </Button>
          <div className="absolute -top-2 right-16 bg-gray-800 text-white text-xs px-2 py-1 rounded-md font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            Need help? Ask me!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="bg-primary p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-white/30">
            <AvatarFallback className="bg-white/20 backdrop-blur-sm">
              <Lightbulb className="w-5 h-5 text-white" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-base">Training Assistant</h3>
            <p className="text-xs text-white/90 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-white hover:bg-white/20 rounded-full">
          <Minimize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 text-sm ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.type === 'bot' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-white">
                      <Lightbulb className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  message.type === 'user'
                    ? 'bg-primary text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                }`}>
                  <div className="prose prose-sm max-w-none prose-p:my-2">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
                {message.type === 'user' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-white">
                    <Lightbulb className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-gray-50 border-t border-gray-200 p-3">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 border-primary/30 text-primary hover:bg-primary hover:text-white transition-colors"
            onClick={() => window.open('https://lms.enacton.com', '_blank')}
          >
            📚 LMS
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 border-primary/30 text-primary hover:bg-primary hover:text-white transition-colors"
            onClick={() => window.open('https://crm.enacton.com', '_blank')}
          >
            🤝 CRM
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 border-primary/30 text-primary hover:bg-primary hover:text-white transition-colors"
            onClick={() => window.open('https://hrms.enacton.com', '_blank')}
          >
            👥 HRMS
          </Button>
        </div>

        {/* Input Area */}
        <div className="flex gap-2 items-center">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
            placeholder="Type your question here..."
            className="flex-1 rounded-full border-gray-300 focus-visible:ring-2 focus-visible:ring-primary"
            disabled={isTyping}
          />
          <Button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            className="rounded-full w-10 h-10 p-0 bg-primary hover:opacity-90 shadow-lg"
          >
            <Send className="w-5 h-5 text-white" />
          </Button>
        </div>
        <div className="flex items-center justify-center mt-2.5 gap-1 text-xs text-gray-400">
          <Zap className="w-3 h-3 text-primary" />
          Powered by EnactOn
        </div>
      </div>
    </div>
  );
};
