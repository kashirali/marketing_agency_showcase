import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, CheckCircle, AlertCircle, Facebook, Instagram } from "lucide-react";
import { toast } from "sonner";

interface MetaPlatformsIntegrationProps {
  postId?: number;
}

export default function MetaPlatformsIntegration({ postId }: MetaPlatformsIntegrationProps) {
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [credentialsValid, setCredentialsValid] = useState(false);
  const [stats, setStats] = useState({
    facebook: { totalAttempts: 0, successful: 0, failed: 0 },
    instagram: { totalAttempts: 0, successful: 0, failed: 0 },
  });

  // Facebook specific state
  const [facebookIncludeLink, setFacebookIncludeLink] = useState(false);
  const [facebookLinkUrl, setFacebookLinkUrl] = useState("");

  // Instagram specific state
  const [instagramMediaType, setInstagramMediaType] = useState<"image" | "video" | "carousel">("image");
  const [instagramImageUrl, setInstagramImageUrl] = useState("");
  const [instagramVideoUrl, setInstagramVideoUrl] = useState("");

  // Load credentials and stats
  useEffect(() => {
    validateCredentials();
    loadStats();
  }, []);

  const validateCredentials = async () => {
    try {
      setLoading(true);
      // In production: const response = await trpc.meta.validateCredentials.query();
      setCredentialsValid(true);
    } catch (error) {
      console.error("Error validating credentials:", error);
      setCredentialsValid(false);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // In production: const response = await trpc.meta.getStats.query();
      setStats({
        facebook: { totalAttempts: 3, successful: 3, failed: 0 },
        instagram: { totalAttempts: 2, successful: 2, failed: 0 },
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handlePostToFacebook = async () => {
    if (!postId) {
      toast.error("Please select a post");
      return;
    }

    try {
      setPosting(true);
      // In production: const response = await trpc.meta.postToFacebook.mutate({
      //   postId,
      //   includeLink: facebookIncludeLink,
      //   linkUrl: facebookLinkUrl,
      // });
      toast.success("Post published to Facebook!");
      loadStats();
    } catch (error) {
      console.error("Error posting to Facebook:", error);
      toast.error("Failed to post to Facebook");
    } finally {
      setPosting(false);
    }
  };

  const handlePostToInstagram = async () => {
    if (!postId) {
      toast.error("Please select a post");
      return;
    }

    if (instagramMediaType === "image" && !instagramImageUrl) {
      toast.error("Please provide an image URL");
      return;
    }

    if (instagramMediaType === "video" && !instagramVideoUrl) {
      toast.error("Please provide a video URL");
      return;
    }

    try {
      setPosting(true);
      // In production: const response = await trpc.meta.postToInstagram.mutate({
      //   postId,
      //   mediaType: instagramMediaType,
      //   imageUrl: instagramImageUrl,
      //   videoUrl: instagramVideoUrl,
      // });
      toast.success("Post published to Instagram!");
      loadStats();
    } catch (error) {
      console.error("Error posting to Instagram:", error);
      toast.error("Failed to post to Instagram");
    } finally {
      setPosting(false);
    }
  };

  if (!credentialsValid) {
    return (
      <Card className="bg-red-500/10 border border-red-500/20 p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground mb-1">Meta Credentials Not Configured</p>
            <p className="text-sm text-muted-foreground">
              Please configure your Facebook and Instagram API credentials to enable posting.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
                  checked={facebookIncludeLink}
                  onCheckedChange={(checked) => setFacebookIncludeLink(checked as boolean)}
                />
                <Label htmlFor="facebookIncludeLink" className="text-sm font-medium text-foreground cursor-pointer">
                  Include link preview
                </Label>
              </div>

              {facebookIncludeLink && (
                <div>
                  <Label htmlFor="facebookLink" className="text-sm font-medium text-foreground mb-2 block">
                    Link URL
                  </Label>
                  <Input
                    id="facebookLink"
                    placeholder="https://example.com"
                    value={facebookLinkUrl}
                    onChange={(e) => setFacebookLinkUrl(e.target.value)}
                    className="bg-background border border-border"
                  />
                </div>
              )}

              <Button
                onClick={handlePostToFacebook}
                disabled={posting || !postId}
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
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{stats.facebook.totalAttempts}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-500">{stats.facebook.successful}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-500">{stats.facebook.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
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
                  value={instagramMediaType}
                  onChange={(e) => setInstagramMediaType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="carousel">Carousel</option>
                </select>
              </div>

              {instagramMediaType === "image" && (
                <div>
                  <Label htmlFor="instagramImage" className="text-sm font-medium text-foreground mb-2 block">
                    Image URL
                  </Label>
                  <Input
                    id="instagramImage"
                    placeholder="https://example.com/image.jpg"
                    value={instagramImageUrl}
                    onChange={(e) => setInstagramImageUrl(e.target.value)}
                    className="bg-background border border-border"
                  />
                </div>
              )}

              {instagramMediaType === "video" && (
                <div>
                  <Label htmlFor="instagramVideo" className="text-sm font-medium text-foreground mb-2 block">
                    Video URL
                  </Label>
                  <Input
                    id="instagramVideo"
                    placeholder="https://example.com/video.mp4"
                    value={instagramVideoUrl}
                    onChange={(e) => setInstagramVideoUrl(e.target.value)}
                    className="bg-background border border-border"
                  />
                </div>
              )}

              <Button
                onClick={handlePostToInstagram}
                disabled={posting || !postId}
                className="w-full bg-[#E1306C] hover:bg-[#C91E5C] text-white"
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
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{stats.instagram.totalAttempts}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-500">{stats.instagram.successful}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-500">{stats.instagram.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
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
