import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [, setLocation] = useLocation();

    const registerMutation = trpc.auth.register.useMutation({
        onSuccess: () => {
            toast.success("Registration successful! You can now log in.");
            setLocation("/login");
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        registerMutation.mutate({ name, email, password });
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="headline-xl text-foreground">Create Account</h1>
                    <p className="body-text text-muted-foreground mt-2">
                        Sign up to start automating your social media
                    </p>
                </div>

                <Card className="p-6 bg-card border-border">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

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
                            <p className="text-[10px] text-muted-foreground">Minimal 8 characters</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-[#0066ff] hover:bg-[#0052cc]"
                            disabled={registerMutation.isPending}
                        >
                            {registerMutation.isPending ? "Creating account..." : "Sign Up"}
                        </Button>

                        <div className="text-center text-sm text-muted-foreground pt-2">
                            Already have an account?{" "}
                            <Link href="/login" className="text-[#0066ff] hover:underline">
                                Sign In
                            </Link>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
