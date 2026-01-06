
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [location, setLocation] = useLocation();
    const { refresh } = useAuth();

    const loginMutation = trpc.auth.login.useMutation({
        onSuccess: async () => {
            await refresh();
            toast.success("Welcome back!");
            setLocation("/agent-dashboard");
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loginMutation.mutate({ email, password });
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="headline-xl text-foreground">Welcome Back</h1>
                    <p className="body-text text-muted-foreground mt-2">
                        Sign in to manage your AI Social Agent
                    </p>
                </div>

                <Card className="p-6 bg-card border-border">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-[#0066ff] hover:bg-[#0052cc]"
                            disabled={loginMutation.isPending}
                        >
                            {loginMutation.isPending ? "Signing in..." : "Sign In"}
                        </Button>

                        <div className="text-center text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Link href="/register" className="text-[#0066ff] hover:underline">
                                Create one
                            </Link>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
