import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import heroImage from "@/assets/hero-lms.jpg";

const setMeta = (title: string, description: string, canonical?: string) => {
  document.title = title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", description);
  else {
    const m = document.createElement("meta");
    m.name = "description";
    m.content = description;
    document.head.appendChild(m);
  }
  if (canonical) {
    let link = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
  }
};

const AuthPage = () => {
  useEffect(() => {
    setMeta(
      "Access Your Account - EnactOn LMS",
      "Access EnactOn LMS: sign in to your account or create a new one in seconds.",
      window.location.href
    );
  }, []);

  return (
    <div className="w-full min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div
        className="relative hidden md:flex flex-col justify-center items-center bg-cover bg-center p-12 text-white"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-primary opacity-70"></div>
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Unlock Your Team's Potential
          </h1>
          <p className="text-lg text-primary-foreground/90">
            Join EnactOn LMS - Where reliability matters in professional growth
            and learning management.
          </p>
        </div>
      </div>
      <div className="bg-gradient-to-br from-background to-muted flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-foreground">Get Started</h2>
            <p className="text-muted-foreground">
              Access your account or create a new one.
            </p>
          </div>
          <div
            className="bg-card p-8 rounded-lg shadow-lg"
            aria-label="Authentication"
          >
            {/*  <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-6">
                <LoginForm />
                </TabsContent>
                <TabsContent value="signup" className="mt-6">
                <SignupForm />
              </TabsContent>
            </Tabs>
            */}
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
