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
import { Loader2, Plus, Zap, Calendar, Trash2, Copy, CheckCircle, Clock, AlertCircle, Linkedin, Facebook, Instagram, ChevronDown, ChevronUp, Send } from "lucide-react";
import { toast } from "sonner";
import CalendarView from "@/components/CalendarView";
import LinkedInIntegration from "@/components/LinkedInIntegration";
import MetaPlatformsIntegration from "@/components/MetaPlatformsIntegration";
import { trpc } from "@/lib/trpc";
import AgentConfigDialog from "@/components/AgentConfigDialog";

interface GeneratedPost {
  id: number;
  platform: string;
  title: string;
  content: string;
  hashtags: string[];
  status: "draft" | "scheduled" | "published" | "failed";
  createdAt: Date;
  scheduledAt?: Date;
  mediaUrl?: string;
}

interface AgentConfig {
  id: number;
  agentName: string;
  isActive: boolean;
  platforms: ("linkedin" | "facebook" | "twitter" | "instagram")[];
  contentStyle?: string;
  agencyInfo: {
    name: string;
    services: string[];
    description?: string;
    achievements?: string[];
  };
  postingSchedule?: {
    time: string;
    timezone: string;
    daysOfWeek: number[];
  };
  nextRunAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function AgentDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  /* TRPC Hooks */
  const utils = trpc.useUtils();
  const { data: configs, isLoading: configLoading } = trpc.aiAgent.getConfigs.useQuery() as { data: AgentConfig[] | undefined; isLoading: boolean };
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(null);

  // Auto-select first agent if none selected
  useEffect(() => {
    if (configs && configs.length > 0 && currentAgentId === null) {
      setCurrentAgentId(configs[0].id);
    }
  }, [configs, currentAgentId]);

  const config = configs?.find(c => c.id === currentAgentId);

  const { data: postsData, isLoading: postsLoading } = trpc.aiAgent.getPosts.useQuery({
    limit: 50,
    agentId: currentAgentId || undefined
  });
  const loading = configLoading || postsLoading;

  const generateMutation = trpc.aiAgent.generateContent.useMutation();
  const deleteMutation = trpc.aiAgent.deletePost.useMutation();
  const scheduleMutation = trpc.aiAgent.schedulePost.useMutation();

  const [generating, setGenerating] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("linkedin");
  const [tone, setTone] = useState("professional");
  const [configOpen, setConfigOpen] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<number[]>([]);
  const [scheduleDates, setScheduleDates] = useState<Record<number, string>>({});
  const publishNowMutation = trpc.aiAgent.publishPostNow.useMutation();

  // Parse posts data
  const posts = (postsData || []).map((post: any) => ({
    ...post,
    createdAt: new Date(post.createdAt),
    scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : undefined
  }));



  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated, authLoading]);

  const handleGenerateContent = async () => {
    try {
      setGenerating(true);
      await generateMutation.mutateAsync({
        platform: selectedPlatform as any,
        tone: tone as any,
        agentId: currentAgentId || undefined
      });
      utils.aiAgent.getPosts.invalidate();
      toast.success(`Generated content for ${selectedPlatform}`);
      // Switch to posts tab to see draft (optional, or just stay on generate)
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate content");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await deleteMutation.mutateAsync({ postId });
      utils.aiAgent.getPosts.invalidate();
      toast.success("Post deleted");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const handleSchedulePost = async (postId: number, date?: Date) => {
    try {
      const scheduledTime = date || new Date(Date.now() + 24 * 60 * 60 * 1000); // Default tomorrow if no date

      // Ensure we have a valid date object
      const safeDate = scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime);

      await scheduleMutation.mutateAsync({
        postId,
        scheduledAt: safeDate
      });
      utils.aiAgent.getPosts.invalidate();
      toast.success(`Post scheduled for ${safeDate.toLocaleString()}`);
    } catch (error) {
      console.error("Error scheduling post:", error);
      toast.error("Failed to schedule post");
    }
  };

  const handlePublishNow = async (postId: number) => {
    try {
      await publishNowMutation.mutateAsync({ postId });
      utils.aiAgent.getPosts.invalidate();
      toast.success("Post published successfully!");
    } catch (error) {
      console.error("Error publishing post now:", error);
      toast.error(error instanceof Error ? error.message : "Failed to publish post");
    }
  };

  const toggleExpand = (postId: number) => {
    setExpandedPosts(prev =>
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
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

      <div className="bg-card/50 border-b border-border py-4">
        <div className="container max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Select Project Agent:</Label>
            <Select
              value={currentAgentId?.toString() || ""}
              onValueChange={(val) => setCurrentAgentId(Number(val))}
            >
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Select Agent" />
              </SelectTrigger>
              <SelectContent>
                {configs?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.agentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setIsEditingConfig(true); setConfigOpen(true); }} disabled={!currentAgentId}>
                Manage Agent
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setIsEditingConfig(false); setConfigOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />
                New Agent
              </Button>
            </div>
          </div>
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

              <Button
                className="w-full mt-6 bg-accent hover:bg-accent/90"
                onClick={() => setConfigOpen(true)}
              >
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
                    {posts.filter((p: any) => p.status === "published").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Scheduled</span>
                  <span className="metric-text text-lg text-blue-500">
                    {posts.filter((p: any) => p.status === "scheduled").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Drafts</span>
                  <span className="metric-text text-lg text-yellow-500">
                    {posts.filter((p: any) => p.status === "draft").length}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="generate" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
                <TabsTrigger value="generate">Generate Content</TabsTrigger>
                <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
                <TabsTrigger value="meta">Meta</TabsTrigger>
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
                    className="min-h-[200px] bg-background border-border text-foreground mb-4"
                    readOnly
                  />
                  {generateMutation.data?.imagePrompt && (
                    <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Generated Image Preview</p>
                      <img
                        src={`https://placehold.co/1200x630/2563eb/ffffff?text=${encodeURIComponent("AI Generated Image Preview")}`}
                        alt="Image preview"
                        className="w-full h-auto rounded-md shadow-sm border border-border"
                      />
                      <p className="text-[10px] text-muted-foreground mt-2 italic">Prompt: {generateMutation.data.imagePrompt}</p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* Posts Tab */}
              <TabsContent value="posts" className="space-y-4">
                {posts.length === 0 ? (
                  <Card className="bg-card border border-border p-8 text-center">
                    <p className="text-muted-foreground">No posts generated yet</p>
                  </Card>
                ) : (
                  posts.map((post: any) => (
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

                      {post.mediaUrl && (
                        <div className="mb-3 rounded-md overflow-hidden border border-border aspect-video bg-muted flex items-center justify-center">
                          <img
                            src={post.mediaUrl}
                            alt="Post Media"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="relative group">
                        <p className={`body-text text-foreground/80 mb-3 text-sm ${expandedPosts.includes(post.id) ? '' : 'line-clamp-2'}`}>
                          {post.content}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-accent hover:text-accent/80 mb-2"
                          onClick={() => toggleExpand(post.id)}
                        >
                          {expandedPosts.includes(post.id) ? (
                            <><ChevronUp className="w-3 h-3 mr-1" /> Show Less</>
                          ) : (
                            <><ChevronDown className="w-3 h-3 mr-1" /> Read More</>
                          )}
                        </Button>
                      </div>

                      <div className="flex flex-col space-y-3 pt-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {post.hashtags.slice(0, 3).map((tag: string, idx: number) => (
                              <span key={idx} className="text-xs text-accent">
                                {tag}
                              </span>
                            ))}
                            {post.hashtags.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{post.hashtags.length - 3}</span>
                            )}
                          </div>

                          {post.status === "draft" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePublishNow(post.id)}
                                disabled={publishNowMutation.isPending}
                                className="border-accent text-accent hover:bg-accent hover:text-white"
                              >
                                {publishNowMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                Publish Now
                              </Button>
                              <div className="flex gap-1">
                                <Input
                                  type="datetime-local"
                                  className="h-8 w-[160px] text-[10px] bg-background border-border"
                                  value={scheduleDates[post.id] || ""}
                                  onChange={(e) => setScheduleDates(prev => ({ ...prev, [post.id]: e.target.value }))}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSchedulePost(post.id, scheduleDates[post.id] ? new Date(scheduleDates[post.id]) : undefined)}
                                  disabled={scheduleMutation.isPending}
                                  className="bg-accent hover:bg-accent/90"
                                >
                                  {scheduleMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Calendar className="w-3 h-3 mr-1" />
                                  )}
                                  Schedule
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="calendar" className="space-y-4">
                <CalendarView posts={posts} onSchedulePost={(date) => {
                  toast.info("Select a draft post to schedule for " + date.toLocaleDateString());
                  // In a real app, this would open a dialog to pick a draft
                }} />
              </TabsContent>

              {/* LinkedIn Tab */}
              <TabsContent value="linkedin" className="space-y-4">
                <LinkedInIntegration postId={posts.find((p: any) => p.status === 'draft' || p.status === 'published')?.id} />
              </TabsContent>

              {/* Meta Tab */}
              <TabsContent value="meta" className="space-y-4">
                <MetaPlatformsIntegration postId={posts.find((p: any) => p.status === 'draft' || p.status === 'published')?.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <AgentConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        initialConfig={isEditingConfig ? config : undefined}
        onConfigSaved={() => {
          utils.aiAgent.getConfigs.invalidate();
          utils.aiAgent.getConfig.invalidate();
        }}
      />
    </div>
  );
}
