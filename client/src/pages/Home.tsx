import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Share2, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/**
 * Design Philosophy: Modern Minimalist with Data Emphasis
 * - Clean asymmetric layout with 60/40 split (content/metrics)
 * - Typography-driven hierarchy using Poppins (headlines) and JetBrains Mono (metrics)
 * - Data visualization as primary design element
 * - Subtle micro-interactions revealing engagement metrics
 */

interface SocialPost {
  id: string;
  platform: "LinkedIn" | "Facebook" | "Twitter";
  title: string;
  content: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: string;
  trend: number;
}

interface MetricData {
  date: string;
  engagement: number;
  reach: number;
}

const mockPosts: SocialPost[] = [
  {
    id: "1",
    platform: "LinkedIn",
    title: "Stop Guessing. Start Growing.",
    content: "In today's crowded digital landscape, simply being online isn't enough. You need a strategy that cuts through the noise and converts attention into revenue. At our agency, we specialize in crafting data-driven digital narratives. We move beyond vanity metrics to focus on what truly matters: measurable ROI.",
    engagement: {
      likes: 2847,
      comments: 342,
      shares: 156,
    },
    timestamp: "2 days ago",
    trend: 12,
  },
  {
    id: "2",
    platform: "Facebook",
    title: "Transform Your Digital Presence",
    content: "Is your brand whispering when it should be shouting? We don't just manage social media—we engineer digital conversations that drive real-world results. Stop settling for low engagement. Start dominating your niche.",
    engagement: {
      likes: 1923,
      comments: 287,
      shares: 94,
    },
    timestamp: "5 days ago",
    trend: 8,
  },
  {
    id: "3",
    platform: "Twitter",
    title: "Data-Driven Marketing Works",
    content: "Your competitors are already using advanced analytics to outpace you. We combine cutting-edge tools with creative excellence to deliver campaigns that don't just reach people—they move them to action.",
    engagement: {
      likes: 3156,
      comments: 421,
      shares: 203,
    },
    timestamp: "1 week ago",
    trend: 15,
  },
];

const engagementData: MetricData[] = [
  { date: "Mon", engagement: 2400, reach: 9600 },
  { date: "Tue", engagement: 2210, reach: 9800 },
  { date: "Wed", engagement: 2290, reach: 10200 },
  { date: "Thu", engagement: 2000, reach: 9800 },
  { date: "Fri", engagement: 2181, reach: 10500 },
  { date: "Sat", engagement: 2500, reach: 11200 },
  { date: "Sun", engagement: 2100, reach: 10800 },
];

const platformData = [
  { platform: "LinkedIn", posts: 24, engagement: 8200 },
  { platform: "Facebook", posts: 18, engagement: 5600 },
  { platform: "Twitter", posts: 42, engagement: 12400 },
];

export default function Home() {
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [animatedMetrics, setAnimatedMetrics] = useState({
    totalEngagement: 0,
    totalReach: 0,
    avgEngagementRate: 0,
  });

  useEffect(() => {
    const totalEngagement = mockPosts.reduce(
      (sum, post) => sum + post.engagement.likes + post.engagement.comments + post.engagement.shares,
      0
    );
    const totalReach = engagementData.reduce((sum, data) => sum + data.reach, 0);
    const avgEngagementRate = (totalEngagement / totalReach) * 100;

    const interval = setInterval(() => {
      setAnimatedMetrics({
        totalEngagement: Math.min(animatedMetrics.totalEngagement + 50, totalEngagement),
        totalReach: Math.min(animatedMetrics.totalReach + 500, totalReach),
        avgEngagementRate: Math.min(animatedMetrics.avgEngagementRate + 0.1, avgEngagementRate),
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section
        className="relative w-full h-screen bg-cover bg-center flex items-center justify-start overflow-hidden"
        style={{
          backgroundImage: "url('/images/hero-banner.jpg')",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 container max-w-6xl mx-auto px-4 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="headline-xl text-white mb-6 leading-tight">
              Digital Marketing Excellence
            </h1>
            <p className="body-text text-white/90 mb-8 max-w-xl">
              Discover how our data-driven strategies transform social media engagement into measurable business growth. Explore real campaign results and performance metrics.
            </p>
            <Button
              size="lg"
              className="bg-[#0066ff] hover:bg-[#0052cc] text-white cta-text"
              onClick={() => document.getElementById("posts-section")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Campaign Results
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section id="posts-section" className="py-20 bg-background">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Posts Column (60%) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="mb-8">
                <h2 className="headline-lg text-foreground mb-2">Campaign Showcase</h2>
                <p className="body-text text-muted-foreground">
                  High-performing social media posts that drive engagement and results
                </p>
              </div>

              {mockPosts.map((post, index) => (
                <Card
                  key={post.id}
                  className="bg-card border border-border p-6 hover:border-accent transition-all duration-300 cursor-pointer group"
                  onClick={() => setSelectedPost(post)}
                  style={{
                    animation: `fadeIn 0.6s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-3 py-1 bg-accent/20 text-accent text-xs font-semibold rounded">
                          {post.platform}
                        </span>
                        <span className="text-xs text-muted-foreground">{post.timestamp}</span>
                      </div>
                      <h3 className="headline-md text-foreground group-hover:text-accent transition-colors">
                        {post.title}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-accent">
                        <TrendingUp size={16} />
                        <span className="metric-text text-sm">+{post.trend}%</span>
                      </div>
                    </div>
                  </div>

                  <p className="body-text text-foreground/80 mb-6 line-clamp-3">
                    {post.content}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Heart size={18} className="text-muted-foreground group-hover:text-accent transition-colors" />
                        <span className="metric-text text-sm">{post.engagement.likes.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle size={18} className="text-muted-foreground group-hover:text-accent transition-colors" />
                        <span className="metric-text text-sm">{post.engagement.comments.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Share2 size={18} className="text-muted-foreground group-hover:text-accent transition-colors" />
                        <span className="metric-text text-sm">{post.engagement.shares.toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-xs text-accent cta-text">View Details →</span>
                  </div>
                </Card>
              ))}
            </div>

            {/* Metrics Column (40%) */}
            <div className="lg:col-span-1 space-y-6">
              {/* Key Metrics Cards */}
              <div className="space-y-4">
                <h3 className="headline-md text-foreground mb-4">Performance Metrics</h3>

                <Card className="bg-card border border-border p-4 hover:border-accent transition-all duration-300">
                  <div className="text-xs text-muted-foreground mb-2">Total Engagement</div>
                  <div className="metric-text text-2xl text-accent">
                    {animatedMetrics.totalEngagement.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">Across all platforms</div>
                </Card>

                <Card className="bg-card border border-border p-4 hover:border-accent transition-all duration-300">
                  <div className="text-xs text-muted-foreground mb-2">Total Reach</div>
                  <div className="metric-text text-2xl text-accent">
                    {(animatedMetrics.totalReach / 1000).toFixed(1)}K
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">This week</div>
                </Card>

                <Card className="bg-card border border-border p-4 hover:border-accent transition-all duration-300">
                  <div className="text-xs text-muted-foreground mb-2">Engagement Rate</div>
                  <div className="metric-text text-2xl text-accent">
                    {animatedMetrics.avgEngagementRate.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">Average</div>
                </Card>
              </div>

              {/* Platform Breakdown */}
              <Card className="bg-card border border-border p-4">
                <h4 className="headline-md text-sm text-foreground mb-4">Platform Breakdown</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3142" />
                    <XAxis dataKey="platform" tick={{ fill: "#8a8f9a", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#8a8f9a", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1f2e",
                        border: "1px solid #2a3142",
                        borderRadius: "8px",
                      }}
                      cursor={{ fill: "rgba(0, 102, 255, 0.1)" }}
                    />
                    <Bar dataKey="engagement" fill="#0066ff" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Engagement Trend */}
              <Card className="bg-card border border-border p-4">
                <h4 className="headline-md text-sm text-foreground mb-4">Weekly Trend</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={engagementData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3142" />
                    <XAxis dataKey="date" tick={{ fill: "#8a8f9a", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#8a8f9a", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1f2e",
                        border: "1px solid #2a3142",
                        borderRadius: "8px",
                      }}
                      cursor={{ fill: "rgba(0, 102, 255, 0.1)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke="#00d9ff"
                      strokeWidth={2}
                      dot={{ fill: "#0066ff", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-card border-t border-border">
        <div className="container max-w-4xl mx-auto px-4 lg:px-8 text-center">
          <h2 className="headline-lg text-foreground mb-4">Ready to Elevate Your Digital Marketing?</h2>
          <p className="body-text text-foreground/80 mb-8 max-w-2xl mx-auto">
            Let's transform your social media strategy into measurable business results. Our data-driven approach ensures every campaign delivers ROI.
          </p>
          <Button
            size="lg"
            className="bg-[#0066ff] hover:bg-[#0052cc] text-white cta-text"
          >
            Schedule a Consultation
          </Button>
        </div>
      </section>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
