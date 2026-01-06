
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, CheckCircle, AlertCircle, Facebook, Instagram, Image as ImageIcon, Video, Layers, Unlink } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface MetaPlatformsIntegrationProps {
  postId?: number;
}

export default function MetaPlatformsIntegration({ postId }: MetaPlatformsIntegrationProps) {
  /* TRPC Hooks */
  const utils = trpc.useUtils();
  const { data: credsResponse, isLoading: checkingCredentials } = trpc.meta.validateCredentials.useQuery();
  const credentialsValid = credsResponse?.success;
  const isDemoMode = credsResponse?.isDemo;
  const { data: stats } = trpc.meta.getStats.useQuery(undefined, { enabled: !!credentialsValid });

  const getAuthUrlQuery = trpc.meta.getAuthUrl.useQuery(undefined, { enabled: false });
  const handleCallbackMutation = trpc.meta.handleCallback.useMutation();

  const postFacebookMutation = trpc.meta.postToFacebook.useMutation();
  const postInstagramMutation = trpc.meta.postToInstagram.useMutation();
  const { data: connectedAccounts } = trpc.aiAgent.getConnectedAccounts.useQuery();

  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  // Clean up URL params after handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const provider = params.get("provider");

    if (code && provider === "meta") {
      handleMetaCallback(code);
    }
  }, []);

  const handleMetaCallback = async (code: string) => {
    try {
      setLoading(true);
      await handleCallbackMutation.mutateAsync({ code });
      toast.success("Meta accounts connected successfully!");
      utils.meta.validateCredentials.invalidate();

      // Clean URL
      window.history.replaceState({}, "", "/agent-dashboard");
    } catch (error) {
      console.error("Meta callback error:", error);
      toast.error("Failed to connect Meta accounts");
    } finally {
      setLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState("facebook");
  const [fbLink, setFbLink] = useState("");
  const [selectedFbAccount, setSelectedFbAccount] = useState<number | null>(null);
  const [selectedIgAccount, setSelectedIgAccount] = useState<number | null>(null);
  const [igMediaType, setIgMediaType] = useState<"image" | "video" | "carousel">("image");
  const [igMediaUrl, setIgMediaUrl] = useState("");
  const [posting, setPosting] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const result = await getAuthUrlQuery.refetch();
      if (result.data) {
        window.location.href = result.data.url;
      }
    } catch (error) {
      console.error("Error getting auth URL:", error);
      toast.error("Failed to initiate connection");
      setLoading(false);
    }
  };

  const handlePostToFacebook = async () => {
    if (!postId) {
      toast.error("Please select a post");
      return;
    }
    try {
      setPosting(true);

      const result = await postFacebookMutation.mutateAsync({
        postId,
        includeLink: !!fbLink,
        linkUrl: fbLink || undefined
      });

      if (result.success) {
        toast.success(result.message);
        utils.meta.getStats.invalidate();
      } else {
        toast.error(result.error || "Failed to post");
      }
    } catch (error) {
      console.error("Error posting to Facebook:", error);
      toast.error(error instanceof Error ? error.message : "Failed to post to Facebook");
    } finally {
      setPosting(false);
    }
  };

  const handlePostToInstagram = async () => {
    if (!postId) {
      toast.error("Please select a post");
      return;
    }
    if (!igMediaUrl) {
      toast.error("Media URL is required for Instagram");
      return;
    }

    try {
      setPosting(true);

      const result = await postInstagramMutation.mutateAsync({
        postId,
        mediaType: igMediaType,
        imageUrl: igMediaType === 'image' ? igMediaUrl : undefined,
        videoUrl: igMediaType === 'video' ? igMediaUrl : undefined,
        carouselItems: igMediaType === 'carousel' ? [{ imageUrl: igMediaUrl }] : undefined
      });

      if (result.success) {
        toast.success(result.message);
        utils.meta.getStats.invalidate();
      } else {
        toast.error(result.error || "Failed to post");
      }
    } catch (error) {
      console.error("Error posting to Instagram:", error);
      toast.error(error instanceof Error ? error.message : "Failed to post to Instagram");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center space-x-2 mb-6">
        <Badge variant={credentialsValid ? "default" : "destructive"}>
          {checkingCredentials ? "Checking..." : credentialsValid ? (isDemoMode ? "Demo Mode" : "Connected") : "Disconnected"}
        </Badge>
        {!credentialsValid && !checkingCredentials && (
          <Button size="sm" variant="outline" onClick={handleConnect} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : "Connect Accounts"}
          </Button>
        )}
      </div>

      {!credentialsValid && !checkingCredentials && (
        <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/50">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            To integrate your <strong>real Facebook pages</strong>, you must configure your Meta App credentials in the <code>.env</code> file.
            Detailed instructions are available in the <code>.env.example</code> file.
          </AlertDescription>
        </Alert>
      )}

      {isDemoMode && (
        <Alert className="mb-6 bg-blue-500/10 border-blue-500/50">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertDescription>
            You are currently in <strong>Demo Mode</strong> using mock credentials. Real posting and page fetching are disabled.
            Configure <code>META_CLIENT_ID</code> and <code>META_CLIENT_SECRET</code> to enable production mode.
          </AlertDescription>
        </Alert>
      )}

      {credentialsValid && connectedAccounts && connectedAccounts.length > 0 && (
        <div className="mb-6 space-y-2">
          <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Connected Profiles</Label>
          <div className="flex flex-wrap gap-2">
            {connectedAccounts.filter(a => a.platform === 'facebook' || a.platform === 'instagram').map(account => (
              <Badge key={account.id} variant="secondary" className="pl-1 pr-2 py-1 flex items-center gap-2 bg-background border border-border">
                {account.platform === 'facebook' ? <Facebook className="w-3 h-3 text-[#1877F2]" /> : <Instagram className="w-3 h-3 text-[#E1306C]" />}
                <span className="text-xs font-medium">{account.accountName}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
      <Tabs defaultValue="facebook" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
          <TabsTrigger value="facebook" className="flex items-center gap-2">
            <Facebook className="w-4 h-4" />
            Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram" className="flex items-center gap-2">
            <Instagram className="w-4 h-4" />
            Instagram
          </TabsTrigger>
        </TabsList>

        {/* Facebook Tab */}
        <TabsContent value="facebook" className="space-y-4">
          <Card className="bg-card border border-border p-6">
            <h3 className="headline-md text-foreground mb-4 flex items-center gap-2">
              <Facebook className="w-5 h-5 text-[#1877F2]" />
              Post to Facebook
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="facebookIncludeLink"
                  checked={!!fbLink}
                  onCheckedChange={(checked) => setFbLink(checked ? fbLink : "")}
                />
                <Label htmlFor="facebookIncludeLink" className="text-sm font-medium text-foreground cursor-pointer">
                  Include link preview
                </Label>
              </div>

              {!!fbLink && (
                <div>
                  <Label htmlFor="facebookLink" className="text-sm font-medium text-foreground mb-2 block">
                    Link URL
                  </Label>
                  <Input
                    id="facebookLink"
                    placeholder="https://example.com"
                    value={fbLink}
                    onChange={(e) => setFbLink(e.target.value)}
                    className="bg-background border border-border"
                  />
                </div>
              )}

              {connectedAccounts && connectedAccounts.filter(a => a.platform === 'facebook').length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Posting to Page</Label>
                  <select
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    value={selectedFbAccount || ""}
                    onChange={(e) => setSelectedFbAccount(Number(e.target.value))}
                  >
                    {!selectedFbAccount && <option value="">Select a page...</option>}
                    {connectedAccounts.filter(a => a.platform === 'facebook').map(a => (
                      <option key={a.id} value={a.id}>{a.accountName}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    This selection is for immediate publishing in this tab. Per-agent defaults can be set in "Manage Agent".
                  </p>
                </div>
              )}

              <Button
                onClick={handlePostToFacebook}
                disabled={posting || !postId || !credentialsValid}
                className="w-full bg-[#1877F2] hover:bg-[#165FD7] text-white"
              >
                {posting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish to Facebook
                  </>
                )}
              </Button>
            </div>

            {/* Facebook Stats */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-3">Facebook Stats</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats?.facebook.totalAttempts || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Postings</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{stats?.facebook.successful || 0}</p>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{stats?.facebook.failed || 0}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#1877F2]">
                    {stats?.facebook.totalAttempts ? Math.round((stats.facebook.successful / stats.facebook.totalAttempts) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Instagram Tab */}
        <TabsContent value="instagram" className="space-y-4">
          <Card className="bg-card border border-border p-6">
            <h3 className="headline-md text-foreground mb-4 flex items-center gap-2">
              <Instagram className="w-5 h-5 text-[#E1306C]" />
              Post to Instagram
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="mediaType" className="text-sm font-medium text-foreground mb-2 block">
                  Media Type
                </Label>
                <select
                  id="mediaType"
                  value={igMediaType}
                  onChange={(e) => setIgMediaType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="carousel">Carousel</option>
                </select>
              </div>

              {igMediaType === "image" && (
                <div>
                  <Label htmlFor="instagramImage" className="text-sm font-medium text-foreground mb-2 block">
                    Image URL
                  </Label>
                  <Input
                    id="instagramImage"
                    placeholder="https://example.com/image.jpg"
                    value={igMediaUrl}
                    onChange={(e) => setIgMediaUrl(e.target.value)}
                    className="bg-background border border-border"
                  />
                </div>
              )}

              {igMediaType === "video" && (
                <div>
                  <Label htmlFor="instagramVideo" className="text-sm font-medium text-foreground mb-2 block">
                    Video URL
                  </Label>
                  <Input
                    id="instagramVideo"
                    placeholder="https://example.com/video.mp4"
                    value={igMediaUrl}
                    onChange={(e) => setIgMediaUrl(e.target.value)}
                    className="bg-background border border-border"
                  />
                </div>
              )}

              {igMediaType === "carousel" && (
                <div>
                  <Label htmlFor="instagramCarousel" className="text-sm font-medium text-foreground mb-2 block">
                    Carousel Item URL (e.g., image or video)
                  </Label>
                  <Input
                    id="instagramCarousel"
                    placeholder="https://example.com/item1.jpg"
                    value={igMediaUrl}
                    onChange={(e) => setIgMediaUrl(e.target.value)}
                    className="bg-background border border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    For multiple items, you'll need to provide a comma-separated list or a more advanced UI.
                  </p>
                </div>
              )}

              {connectedAccounts && connectedAccounts.filter(a => a.platform === 'instagram').length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Posting to Instagram Account</Label>
                  <select
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    value={selectedIgAccount || ""}
                    onChange={(e) => setSelectedIgAccount(Number(e.target.value))}
                  >
                    {!selectedIgAccount && <option value="">Select an account...</option>}
                    {connectedAccounts.filter(a => a.platform === 'instagram').map(a => (
                      <option key={a.id} value={a.id}>{a.accountName}</option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                onClick={handlePostToInstagram}
                disabled={posting || !postId || !credentialsValid}
                className="w-full bg-[#E4405F] hover:bg-[#d62e4c] text-white"
              >
                {posting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish to Instagram
                  </>
                )}
              </Button>
            </div>

            {/* Instagram Stats */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-3">Instagram Stats</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats?.instagram.totalAttempts || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Postings</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{stats?.instagram.successful || 0}</p>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{stats?.instagram.failed || 0}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#E4405F]">
                    {stats?.instagram.totalAttempts ? Math.round((stats.instagram.successful / stats.instagram.totalAttempts) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border border-blue-500/20 p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-foreground">
            <p className="font-medium mb-1">Multi-Platform Posting Active</p>
            <p className="text-muted-foreground">
              Your AI-generated posts can now be published to Facebook and Instagram. Select a media type and click publish to share your content.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
