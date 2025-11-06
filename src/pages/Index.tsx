import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/auth-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen, Users, Award, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-lms.jpg";

const Index = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
      navigate("/dashboard");
    }
  }, [user, profile, navigate]);

  const features = [
    {
      icon: BookOpen,
      title: "Comprehensive Course Management",
      description: "Create, manage, and track learning paths with multimedia content, assessments, and certifications."
    },
    {
      icon: Users,
      title: "Role-Based Access Control",
      description: "Different interfaces for Management, HR, Team Leads, and Trainees with appropriate permissions."
    },
    {
      icon: Award,
      title: "Performance Tracking",
      description: "Monitor progress, evaluate skills, and track ROI with comprehensive analytics and reporting."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-secondary/80"></div>
        </div>
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center text-white">
            <div className="flex justify-center mb-8">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                <GraduationCap className="w-16 h-16 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              GrowPro
              <span className="block text-secondary-light">Learning Management System</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Empower your workforce with comprehensive training programs, 
              skill development, and performance tracking designed for modern organizations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-3 text-lg"
                onClick={() => navigate("/dashboard")}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <div className="flex items-center space-x-4 text-white/80">
                <Badge variant="outline" className="border-white/30 text-white">
                  Enterprise Ready
                </Badge>
                <Badge variant="outline" className="border-white/30 text-white">
                  Role-Based Access
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Complete Learning Management Solution
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From pre-joining orientation to advanced skill development, 
              manage your entire employee learning lifecycle.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow border-0 bg-card/50">
                  <CardHeader>
                    <div className="mx-auto bg-gradient-to-r from-primary to-secondary p-3 rounded-2xl w-fit">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Role Overview Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Designed for Every Role
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tailored interfaces and capabilities for different organizational roles.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { role: "Management", description: "System-wide analytics, ROI tracking, and strategic oversight", color: "primary" },
              { role: "HR", description: "Employee lifecycle, onboarding workflows, and compliance management", color: "secondary" },
              { role: "Team Lead", description: "Course creation, progress monitoring, and team evaluation", color: "success" },
              { role: "Trainee", description: "Learning paths, skill development, and progress tracking", color: "warning" }
            ].map((item, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <Badge variant="outline" className={`mx-auto mb-2 bg-${item.color}/10 text-${item.color} border-${item.color}/20`}>
                    {item.role}
                  </Badge>
                  <CardTitle className="text-lg">{item.role}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Training Programs?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join organizations worldwide who trust GrowPro LMS for their employee development needs.
          </p>
          <Button 
            size="lg"
            className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-3 text-lg"
            onClick={() => navigate("/dashboard")}
          >
            Start Your Journey
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
