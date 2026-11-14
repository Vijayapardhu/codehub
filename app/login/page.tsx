"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/firebase/auth";
import { toast } from "sonner";

function GoogleLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.72 3.28-8.09m-2.0 2.44c-.84 1.18-2.11 1.85-3.57 1.85-2.26 0-4.05-1.81-4.25-4.13H12.7V7.05h2.93c1.54-.52 2.54-1.57 2.91-2.76h2.78v2.46c0 1.18-.12 2.26-.67 3.18zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.91 1.1-2.21 1.77-3.71 1.77-2.86 0-5.17-2.3-5.17-5.07s2.3-5.07 5.17-5.07c1.77 0 3.27.86 4.11 2.04l3.27-2.35c-1.39-1.8-3.48-2.94-5.81-2.94-4.28 0-7.81 3.44-7.81 7.88s3.53 7.88 7.81 7.88c2.34 0 4.4-.94 5.9-2.57l3.55 2.68c-.95 1.18-2.6 1.84-4.25 1.84zM7.05 13.02c0-.91.13-1.75.36-2.51l2.46.1c-.04.57-.14 1.11-.14 1.68s.1 1.11.14 1.68l-2.46.1c-.23-.77-.36-1.6-.36-2.45zm4.83-3.94c0-.84.07-1.66.21-2.44H12v-2.46h-2.83c.57-1.11 1.4-2.11 2.45-2.75v-2.46H7.05C3.59 5.28.76 8.17.76 12s2.83 6.72 6.29 6.72c1.33 0 2.51-.39 3.53-1.04l2.75 2.6c-1.68.87-3.65 1.4-5.84 1.4-4.01 0-7.28-3.27-7.28-7.29s3.27-7.29 7.28-7.29c1.93 0 3.66.78 4.84 1.97l2.58-2.01C11.4 5.37 10.22 5 8.88 5c-2.34 0-4.24 1.9-4.24 4.25s1.9 4.25 4.24 4.25c.86 0 1.63-.28 2.26-.74l-2.58-2.01c-.46.23-.98.38-1.53.38z" />
    </svg>
  );
}

function GithubLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C-4.42 15.86-2.18 16-2.18 16c-2.75.83-1.1 1.64-1.1 1.64-1.2-.84 0-.84 0-.84 1.07 0 1.87 1.44 1.87 1.64.21 1.24 1.78 2.25 3.27 2.59 0-.14.5-.7 0-1.43-.06-.27-.24-1.38-.48-2.66-1.21-.42-2.41-1.33-3.01-1.33-.4-.62-.72-1.31-.72-1.31-.22-.43 0-.66 0-.66.17-.01 1.1.58 1.21.82.78 1.23 1.83 1.72 2.92 1.31.07-.64.35-1.08.64-1.33-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-2.03 1.02-2.75-.11-.28-.52-1.39.03-2.91 0 0 .84-.27 2.75 1.02a9.56 9.56 0 012.5-.34c2.12.02 4.24.32 6 .74 1.36-.23 2.69-.45 4.04-.55 1.25-.1 2.5-.15 3.73-.15 1.25-.01 2.5.05 3.73.15 1.35.1 2.68.32 4.04.55 1.76-.42 3.88-.72 6-.74a9.55 9.55 0 012.5.34c1.9-1.29 2.74-2.22 2.74-4.04 0-1.53-.14-2.63-.03-2.91.63.72 1.02 1.66 1.02 2.75 0 3.84-2.34 4.7-4.55 4.95.36.31.69.92.69 2.01 0 1.45-.01 2.64-.01 3 0 .32.21.69.83.57C20.565 21.795 24 17.295 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const { login, signup, loginWithGoogle, loginWithGitHub, user } = useAuth();
  const router = useRouter();

  // Redirect to dashboard after successful login
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(email, password, displayName);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Google login failed");
    } finally {
      setSocialLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setSocialLoading(true);
    try {
      await loginWithGitHub();
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "GitHub login failed");
    } finally {
      setSocialLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-background">
      <div className="relative w-full max-w-md">
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-secondary/20 blur-[100px]" />

        <Card className="relative z-10 w-full border border-border bg-card shadow-2xl">
          <CardHeader className="text-center pt-6 pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600">
              <span className="text-3xl font-bold text-white">p</span>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to track your coding interview prep
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 border-b border-border pb-2">
                <TabsTrigger value="login" className="px-4 py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="px-4 py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  Create Account
                </TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="space-y-4 pt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium text-foreground">Email Address</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 text-base"
                    />
                  </div>
                  <Button type="submit" className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium" disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup" className="space-y-4 pt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium text-foreground">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="h-10 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-10 text-base"
                    />
                  </div>
                  <Button type="submit" className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium" disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={socialLoading}
                className="h-10 border-border hover:bg-accent flex items-center justify-center gap-2"
              >
                <GoogleLogo className="h-4 w-4" />
                <span>Google</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleGitHubLogin}
                disabled={socialLoading}
                className="h-10 border-border flex items-center justify-center gap-2"
              >
                <GithubLogo className="h-4 w-4" />
                <span>GitHub</span>
              </Button>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border bg-background/50 pt-6">
            <p className="text-xs text-muted-foreground text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}