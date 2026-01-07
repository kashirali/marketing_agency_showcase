import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
    const [, setLocation] = useLocation();

    return (
        <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation("/")}
                        className="flex items-center gap-2 hover:bg-muted"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Button>
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <Shield className="h-5 w-5" />
                        <span>Privacy Guard</span>
                    </div>
                </div>

                <section className="space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                        Privacy Policy
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Effective Date: January 7, 2026
                    </p>
                </section>

                <section className="space-y-6 text-muted-foreground leading-relaxed italic">
                    <p>
                        At Social Media Automation Platform, we take your privacy seriously. This document outlines how we collect, use, and protect your data when you use our services.
                    </p>

                    <div className="space-y-4 not-italic">
                        <h2 className="text-2xl font-bold text-foreground">1. Data Collection</h2>
                        <p>
                            When you connect your Facebook or Instagram accounts, we access only the information necessary to provide our services, such as your profile name, page list, and the ability to publish content on your behalf.
                        </p>
                    </div>

                    <div className="space-y-4 not-italic">
                        <h2 className="text-2xl font-bold text-foreground">2. Usage of Data</h2>
                        <p>
                            Your data is used solely for the purpose of scheduling and automating posts as per your configuration. We do not sell your personal information to third parties.
                        </p>
                    </div>

                    <div className="space-y-4 not-italic">
                        <h2 className="text-2xl font-bold text-foreground">3. Account Deletion</h2>
                        <p>
                            You can disconnect your social media accounts at any time through the dashboard. All associated access tokens will be immediately purged from our database.
                        </p>
                    </div>

                    <div className="space-y-4 not-italic">
                        <h2 className="text-2xl font-bold text-foreground">4. Compliance</h2>
                        <p>
                            Our platform adheres strictly to the Meta Platform Terms and Developer Policies. We ensure that all integrations are secure and respect user-granted permissions.
                        </p>
                    </div>
                </section>

                <div className="pt-8 border-t border-muted/20 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Social Media Automation Platform. All rights reserved.
                </div>
            </div>
        </div>
    );
}
