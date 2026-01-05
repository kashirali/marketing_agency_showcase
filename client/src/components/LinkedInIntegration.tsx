import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Unlink, Send, CheckCircle, AlertCircle, Linkedin } from "lucide-react";
import { toast } from "sonner";

interface LinkedInAccount {
  id: number;
  accountName: string;
  accountId: string;
  isActive: boolean;
}

interface LinkedInIntegrationProps {
  onAccountConnected?: () => void;
  postId?: number;
}

export default function LinkedInIntegration({ onAccountConnected, postId }: LinkedInIntegrationProps) {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [postToOrganization, setPostToOrganization] = useState(false);
  const [stats, setStats] = useState({ totalAttempts: 0, successful: 0, failed: 0 });

  // Load connected accounts
  useEffect(() => {
    loadAccounts();
    loadStats();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      // In production: const response = await trpc.linkedin.getAccounts.query();
      // Mock data for demonstration
      setAccounts([
        {
          id: 1,
          accountName: "John Doe",
          accountId: "123456789",
          isActive: true,
        },
      ]);
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast.error("Failed to load LinkedIn accounts");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // In production: const response = await trpc.linkedin.getStats.query();
      setStats({ totalAttempts: 5, successful: 4, failed: 1 });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      // In production: const response = await trpc.linkedin.getAuthUrl.query();
      // Redirect to LinkedIn OAuth
      const authUrl = "https://www.linkedin.com/oauth/v2/authorization?...";
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error connecting LinkedIn:", error);
      toast.error("Failed to connect LinkedIn account");
    } finally {
      setConnecting(false);
    }
  };

  const handlePostToLinkedIn = async () => {
    if (!postId || !selectedAccount) {
      toast.error("Please select an account and post");
      return;
    }

    try {
      setPosting(true);
      // In production: const response = await trpc.linkedin.postContent.mutate({
      //   accountId: selectedAccount,
      //   postId,
      //   postToOrganization,
      // });
      toast.success("Post published to LinkedIn!");
      loadStats();
    } catch (error) {
      console.error("Error posting to LinkedIn:", error);
      toast.error("Failed to post to LinkedIn");
    } finally {
      setPosting(false);
    }
  };

  const handleDisconnect = async (accountId: number) => {
    try {
      // In production: await trpc.linkedin.disconnectAccount.mutate({ accountId });
      setAccounts(accounts.filter((a) => a.id !== accountId));
      toast.success("LinkedIn account disconnected");
    } catch (error) {
      console.error("Error disconnecting account:", error);
      toast.error("Failed to disconnect account");
    }
  };

  return (
    <div className="space-y-6">
      {/* Connected Accounts */}
      <Card className="bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="headline-md text-foreground flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-[#0A66C2]" />
            Connected Accounts
          </h3>
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="bg-[#0A66C2] hover:bg-[#084399] text-white"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Linkedin className="w-4 h-4 mr-2" />
                Connect LinkedIn
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No LinkedIn accounts connected</p>
            <p className="text-sm text-muted-foreground">
              Connect a LinkedIn account to start posting your AI-generated content
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 bg-background border border-border rounded-lg hover:border-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="linkedinAccount"
                    value={account.id}
                    checked={selectedAccount === account.id}
                    onChange={() => setSelectedAccount(account.id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <p className="font-medium text-foreground">{account.accountName}</p>
                    <p className="text-xs text-muted-foreground">{account.accountId}</p>
                  </div>
                  <Badge variant="default" className="bg-green-500/20 text-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDisconnect(account.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Unlink className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Posting Options */}
      {accounts.length > 0 && postId && (
        <Card className="bg-card border border-border p-6">
          <h3 className="headline-md text-foreground mb-4">Post to LinkedIn</h3>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="postToOrg"
                checked={postToOrganization}
                onCheckedChange={(checked) => setPostToOrganization(checked as boolean)}
              />
              <Label htmlFor="postToOrg" className="text-sm font-medium text-foreground cursor-pointer">
                Post to organization/company page (instead of personal profile)
              </Label>
            </div>

            <Button
              onClick={handlePostToLinkedIn}
              disabled={posting || !selectedAccount}
              className="w-full bg-[#0A66C2] hover:bg-[#084399] text-white"
            >
              {posting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publish to LinkedIn
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Statistics */}
      <Card className="bg-card border border-border p-6">
        <h3 className="headline-md text-foreground mb-4">LinkedIn Posting Stats</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalAttempts}</p>
            <p className="text-xs text-muted-foreground">Total Attempts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{stats.successful}</p>
            <p className="text-xs text-muted-foreground">Successful</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">
              {stats.totalAttempts > 0 ? Math.round((stats.successful / stats.totalAttempts) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
        </div>
      </Card>

      {/* Info */}
      <Card className="bg-blue-500/10 border border-blue-500/20 p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-foreground">
            <p className="font-medium mb-1">LinkedIn Integration Active</p>
            <p className="text-muted-foreground">
              Your AI-generated posts can now be published directly to LinkedIn. Select an account and click "Publish to LinkedIn" to share your content.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
