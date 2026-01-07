
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface AgentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: any;
  onConfigSaved: () => void;
}

export default function AgentConfigDialog({ open, onOpenChange, initialConfig, onConfigSaved }: AgentConfigDialogProps) {
  // Form state
  const [agentName, setAgentName] = useState("BinaryKode Daily Poster");
  const [platforms, setPlatforms] = useState<string[]>(["linkedin", "facebook"]);
  const [postingTime, setPostingTime] = useState("09:00");
  const [timezone, setTimezone] = useState("UTC");
  const [contentStyle, setContentStyle] = useState("Professional yet approachable");
  const [agencyName, setAgencyName] = useState("");
  const [services, setServices] = useState("");
  const [description, setDescription] = useState("");
  const [achievements, setAchievements] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, number>>({});

  const utils = trpc.useUtils();
  const initMutation = trpc.aiAgent.initializeAgent.useMutation();
  const updateMutation = trpc.aiAgent.updateConfig.useMutation();
  const { data: connectedAccounts } = trpc.aiAgent.getConnectedAccounts.useQuery(undefined, { enabled: open });

  const isEditing = !!initialConfig;
  const loading = initMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (initialConfig) {
      setAgentName(initialConfig.agentName || "");
      setPlatforms(initialConfig.platforms || []);
      setPostingTime(initialConfig.postingSchedule?.time || "09:00");
      setTimezone(initialConfig.postingSchedule?.timezone || "UTC");
      setContentStyle(initialConfig.contentStyle || "");
      setAgencyName(initialConfig.agencyInfo?.name || "");
      setServices(initialConfig.agencyInfo?.services?.join(", ") || "");
      setDescription(initialConfig.agencyInfo?.description || "");
      setAchievements(initialConfig.agencyInfo?.achievements?.join(", ") || "");
      setSelectedAccounts(initialConfig.selectedAccounts || {});
    } else {
      // Reset form for new agent
      setAgentName("New Agent");
      setPlatforms(["linkedin"]);
      setSelectedAccounts({});
    }
  }, [initialConfig, open]);

  const handlePlatformToggle = (platform: string) => {
    setPlatforms(current =>
      current.includes(platform)
        ? current.filter(p => p !== platform)
        : [...current, platform]
    );
  };

  const handleSave = async () => {
    try {
      const servicesArray = services.split(",").map(s => s.trim()).filter(Boolean);
      const achievementsArray = achievements.split(",").map(a => a.trim()).filter(Boolean);

      if (isEditing) {
        // Update existing config
        await updateMutation.mutateAsync({
          agentId: initialConfig.id,
          agentName,
          platforms: platforms as any,
          postingTime,
          timezone,
          contentStyle,
          agencyInfo: {
            name: agencyName,
            services: servicesArray,
            description: description,
            achievements: achievementsArray
          },
          selectedAccounts
        });
        toast.success("Configuration updated");
      } else {
        // Initialize new agent
        await initMutation.mutateAsync({
          agentName,
          platforms: platforms as any,
          postingTime,
          timezone,
          contentStyle,
          agencyInfo: {
            name: agencyName,
            services: servicesArray,
            description: description,
            achievements: achievementsArray
          },
          selectedAccounts
        });
        toast.success("Agent initialized successfully");
      }

      utils.aiAgent.getConfigs.invalidate();
      utils.aiAgent.getConfig.invalidate();
      onConfigSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save configuration");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Configure Agent" : "Initialize AI Agent"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label>Agent Name</Label>
            <Input value={agentName} onChange={e => setAgentName(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-4">
              {["linkedin", "facebook", "twitter", "instagram"].map(platform => (
                <div key={platform} className="flex items-center space-x-2">
                  <Checkbox
                    id={platform}
                    checked={platforms.includes(platform)}
                    onCheckedChange={() => handlePlatformToggle(platform)}
                  />
                  <Label htmlFor={platform} className="capitalize cursor-pointer">{platform}</Label>
                </div>
              ))}
            </div>
          </div>

          {platforms.length > 0 && connectedAccounts && connectedAccounts.length > 0 && (
            <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
              <Label className="font-semibold">Platform Accounts</Label>
              <div className="grid gap-4">
                {platforms.map((platform: string) => {
                  const platformAccounts = connectedAccounts.filter((a: any) => a.platform === platform);
                  if (platformAccounts.length === 0) return null;

                  return (
                    <div key={platform} className="grid grid-cols-2 items-center gap-4">
                      <Label className="capitalize">{platform} Account</Label>
                      <Select
                        value={selectedAccounts[platform]?.toString() || ""}
                        onValueChange={(val) => setSelectedAccounts(prev => ({ ...prev, [platform]: Number(val) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {platformAccounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Posting Time (UTC)</Label>
              <Input type="time" value={postingTime} onChange={e => setPostingTime(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Content Style / Voice</Label>
            <Textarea
              value={contentStyle}
              onChange={e => setContentStyle(e.target.value)}
              placeholder="e.g. Professional yet approachable, data-driven insights..."
            />
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <h4 className="font-semibold">Agency Information</h4>

            <div className="grid gap-2">
              <Label>Agency Name</Label>
              <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Services (comma separated)</Label>
              <Textarea
                value={services}
                onChange={e => setServices(e.target.value)}
                placeholder="Web Design, SEO, Content Marketing..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Achievements (comma separated)</Label>
              <Textarea
                value={achievements}
                onChange={e => setAchievements(e.target.value)}
                placeholder="500+ Clients, Award Winning..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Initialize Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
