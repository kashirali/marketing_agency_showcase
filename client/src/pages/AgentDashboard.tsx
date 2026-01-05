import { useAuth } from "@/_core/hooks/useAuth";
import { useRouter } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Zap, Calendar, Trash2, Copy, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface GeneratedPost {
  id: number;
  platform: string;
  title: string;
  content: string;
  hashtags: string[];
  status: "draft" | "scheduled" | "published" | "failed";
  createdAt: Date;
  scheduledAt?: Date;
}

interface AgentConfig {
  id: number;
  agentName: string;
  isActive: boolean;
  platforms: string[];
  contentStyle?: string;
  agencyInfo: {
    name: string;
    services: string[];
    description?: string;
    achievements?: string[];
  };
}

export default function AgentDashboard() {
  const { user, isAuthenticated } = useAuth();

  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("linkedin");
  const [tone, setTone] = useState("professional");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  // Load agent configuration and posts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // In production, fetch from API using trpc
        // const config = await trpc.aiAgent.getConfig.query();
        // const posts = await trpc.aiAgent.getPosts.query({ limit: 20 });

        // Mock data for demonstration
        setConfig({
          id: 1,
          agentName: "BinaryKode Daily Poster",
          isActive: true,
          platforms: ["linkedin", "facebook", "twitter", "instagram"],
          contentStyle: "Professional yet approachable, data-driven insights",
          agencyInfo: {
            name: "BinaryKode",
            services: [
              "Web Design & Development",
              "Mobile App Development",
              "AI Automation",
              "Chat Bots",
              "Graphic Design",
              "Digital Marketing",
            ],
            description: "Transform Your Business with Technology Solutions",
            achievements: ["500+ Happy Clients", "1000+ Projects Completed", "250% Average ROI"],
          },
        });

        setPosts([
          {
            id: 1,
            platform: "linkedin",
            title: "Stop Guessing. Start Growing.",
            content:
              "In today's crowded digital landscape, simply being online isn't enough. You need a strategy that cuts through the noise and converts attention into revenue.",
            hashtags: ["#DigitalMarketing", "#Strategy", "#Growth"],
            status: "published",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            id: 2,
            platform: "facebook",
            title: "Transform Your Digital Presence",
            content:
              "Is your brand whispering when it should be shouting? We don't just manage social media—we engineer digital conversations that drive real-world results.",
            hashtags: ["#SocialMedia", "#Marketing", "#Business"],
            status: "scheduled",
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          },
          {
            id: 3,
            platform: "twitter",
            title: "Data-Driven Marketing Works",
            content:
              "Your competitors are already using advanced analytics to outpace you. We combine cutting-edge tools with creative excellence.",
            hashtags: ["#Analytics", "#Marketing", "#DataDriven"],
            status: "draft",
            createdAt: new Date(),
          },
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load agent configuration");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleGenerateContent = async () => {
    try {
      setGenerating(true);
      // In production: const post = await trpc.aiAgent.generateContent.mutate({ platform: selectedPlatform, tone });
      toast.success(`Generated content for ${selectedPlatform}`);
      // Add new post to list
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Failed to generate content");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      // In production: await trpc.aiAgent.deletePost.mutate({ postId });
      setPosts(posts.filter((p) => p.id !== postId));
      toast.success("Post deleted");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const handleSchedulePost = async (postId: number) => {
    try {
      const scheduledTime = new Date();
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      // In production: await trpc.aiAgent.schedulePost.mutate({ postId, scheduledAt: scheduledTime });
      toast.success("Post scheduled for tomorrow");
    } catch (error) {
      console.error("Error scheduling post:", error);
      toast.error("Failed to schedule post");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "scheduled":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "draft":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <h1 className="headline-lg text-foreground mb-2">AI Social Media Agent</h1>
          <p className="body-text text-muted-foreground">
            Manage your automated social media posting and content generation
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Agent Status */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="headline-md text-foreground">Agent Status</h3>
                <Badge variant={config?.isActive ? "default" : "secondary"}>
                  {config?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Agent Name</p>
                  <p className="text-foreground font-medium">{config?.agentName}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Platforms</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config?.platforms.map((platform) => (
                      <Badge key={platform} variant="outline">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground">Agency</p>
                  <p className="text-foreground font-medium">{config?.agencyInfo.name}</p>
                </div>
              </div>

              <Button className="w-full mt-6 bg-accent hover:bg-accent/90">
                <Zap className="w-4 h-4 mr-2" />
                Configure Agent
              </Button>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-card border border-border p-6">
              <h3 className="headline-md text-sm text-foreground mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Posts</span>
                  <span className="metric-text text-lg">{posts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Published</span>
                  <span className="metric-text text-lg text-green-500">
                    {posts.filter((p) => p.status === "published").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Scheduled</span>
                  <span className="metric-text text-lg text-blue-500">
                    {posts.filter((p) => p.status === "scheduled").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Drafts</span>
                  <span className="metric-text text-lg text-yellow-500">
                    {posts.filter((p) => p.status === "draft").length}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="generate" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
                <TabsTrigger value="generate">Generate Content</TabsTrigger>
                <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
              </TabsList>

              {/* Generate Tab */}
              <TabsContent value="generate" className="space-y-4">
                <Card className="bg-card border border-border p-6">
                  <h3 className="headline-md text-foreground mb-4">Generate New Post</h3>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">
                        Platform
                      </Label>
                      <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="energetic">Energetic</SelectItem>
                          <SelectItem value="educational">Educational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleGenerateContent}
                      disabled={generating}
                      className="w-full bg-accent hover:bg-accent/90"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Generate Content
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                {/* Content Preview */}
                <Card className="bg-card border border-border p-6">
                  <h4 className="headline-md text-sm text-foreground mb-3">Preview</h4>
                  <Textarea
                    placeholder="Generated content will appear here..."
                    className="min-h-[200px] bg-background border-border text-foreground"
                    readOnly
                  />
                </Card>
              </TabsContent>

              {/* Posts Tab */}
              <TabsContent value="posts" className="space-y-4">
                {posts.length === 0 ? (
                  <Card className="bg-card border border-border p-8 text-center">
                    <p className="text-muted-foreground">No posts generated yet</p>
                  </Card>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="bg-card border border-border p-4 hover:border-accent transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(post.status)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{post.platform}</Badge>
                              <Badge
                                variant={
                                  post.status === "published"
                                    ? "default"
                                    : post.status === "scheduled"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {post.status}
                              </Badge>
                            </div>
                            <h4 className="headline-md text-sm text-foreground">{post.title}</h4>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <p className="body-text text-foreground/80 mb-3 text-sm line-clamp-2">
                        {post.content}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="flex flex-wrap gap-1">
                          {post.hashtags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-xs text-accent">
                              {tag}
                            </span>
                          ))}
                          {post.hashtags.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{post.hashtags.length - 3}</span>
                          )}
                        </div>

                        {post.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => handleSchedulePost(post.id)}
                            className="bg-accent hover:bg-accent/90"
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            Schedule
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
