"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/analytics/export-button";
import {
  Send,
  Mail,
  MessageSquare,
  Calendar,
  TrendingUp,
  Loader2,
  Globe,
  Rss,
  Search,
  Database,
  AlertCircle,
  Eye,
  MousePointer,
  XCircle,
  ArrowRight,
  Users,
  Target,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OutreachPodcast {
  id: string;
  showName: string;
  hostName: string | null;
  primaryEmail: string | null;
  tier: string;
  status: string;
  responseType: string | null;
  emailSequence: EmailInSequence[];
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
}

interface EmailInSequence {
  id: string;
  type: string;
  subject: string;
  body: string;
  status: "draft" | "scheduled" | "sent" | "opened" | "replied";
  sentAt: string | null;
  scheduledFor: string | null;
  openedAt: string | null;
  repliedAt: string | null;
}

interface AnalyticsStats {
  sent: number;
  opened: number;
  replied: number;
  booked: number;
  openRate: number;
  replyRate: number;
  bookingRate: number;
  weeklyData: { week: string; sent: number; replied: number; booked: number }[];
  topPerformers: { name: string; status: string }[];
  recentActivity: { podcast: string; action: string; date: string }[];
}

function calculateAnalytics(campaigns: OutreachPodcast[]): AnalyticsStats {
  let totalSent = 0;
  let totalOpened = 0;
  let totalReplied = 0;
  let totalBooked = 0;

  const recentActivity: { podcast: string; action: string; date: string; timestamp: number }[] = [];
  const performerMap = new Map<string, { name: string; status: string; priority: number }>();

  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const weeklyData: { week: string; sent: number; replied: number; booked: number; startDate: Date }[] = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(fourWeeksAgo);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    weeklyData.push({
      week: `Week ${i + 1}`,
      sent: 0,
      replied: 0,
      booked: 0,
      startDate: weekStart,
    });
  }

  campaigns.forEach((campaign) => {
    if (campaign.status === "booked" || campaign.responseType === "booked") {
      totalBooked++;
      performerMap.set(campaign.id, {
        name: campaign.showName,
        status: "booked",
        priority: 3,
      });
    }

    campaign.emailSequence?.forEach((email) => {
      if (email.status === "sent" || email.status === "opened" || email.status === "replied") {
        totalSent++;

        if (email.sentAt) {
          const sentDate = new Date(email.sentAt);
          recentActivity.push({
            podcast: campaign.showName,
            action: "Sent",
            date: email.sentAt,
            timestamp: sentDate.getTime(),
          });

          const weekIndex = weeklyData.findIndex((w, idx) => {
            const weekEnd = new Date(w.startDate);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return sentDate >= w.startDate && sentDate < weekEnd;
          });
          if (weekIndex >= 0) {
            weeklyData[weekIndex].sent++;
          }
        }
      }

      if (email.status === "opened" || email.status === "replied") {
        totalOpened++;
        if (email.openedAt) {
          recentActivity.push({
            podcast: campaign.showName,
            action: "Opened",
            date: email.openedAt,
            timestamp: new Date(email.openedAt).getTime(),
          });
        }
      }

      if (email.status === "replied") {
        totalReplied++;
        if (email.repliedAt) {
          const repliedDate = new Date(email.repliedAt);
          recentActivity.push({
            podcast: campaign.showName,
            action: "Replied",
            date: email.repliedAt,
            timestamp: repliedDate.getTime(),
          });

          const weekIndex = weeklyData.findIndex((w) => {
            const weekEnd = new Date(w.startDate);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return repliedDate >= w.startDate && repliedDate < weekEnd;
          });
          if (weekIndex >= 0) {
            weeklyData[weekIndex].replied++;
          }
        }

        if (!performerMap.has(campaign.id) || performerMap.get(campaign.id)!.priority < 2) {
          performerMap.set(campaign.id, {
            name: campaign.showName,
            status: "replied",
            priority: 2,
          });
        }
      }
    });

    if (campaign.status === "booked" && campaign.lastContactedAt) {
      const bookedDate = new Date(campaign.lastContactedAt);
      const weekIndex = weeklyData.findIndex((w) => {
        const weekEnd = new Date(w.startDate);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return bookedDate >= w.startDate && bookedDate < weekEnd;
      });
      if (weekIndex >= 0) {
        weeklyData[weekIndex].booked++;
      }
    }
  });

  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0;
  const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 1000) / 10 : 0;
  const bookingRate = totalSent > 0 ? Math.round((totalBooked / totalSent) * 1000) / 10 : 0;

  const sortedActivity = recentActivity
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
    .map((a) => ({
      podcast: a.podcast,
      action: a.action,
      date: formatRelativeTime(a.date),
    }));

  const topPerformers = Array.from(performerMap.values())
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map(({ name, status }) => ({ name, status }));

  return {
    sent: totalSent,
    opened: totalOpened,
    replied: totalReplied,
    booked: totalBooked,
    openRate,
    replyRate,
    bookingRate,
    weeklyData: weeklyData.map(({ week, sent, replied, booked }) => ({ week, sent, replied, booked })),
    topPerformers,
    recentActivity: sortedActivity,
  };
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

interface TrackingStats {
  summary: {
    totalSent: number;
    totalOpened: number;
    totalReplied: number;
    totalBounced: number;
    openRate: number;
    replyRate: number;
    bounceRate: number;
  };
  weeklyData: Array<{
    week: string;
    sent: number;
    opened: number;
    replied: number;
    bounced: number;
    openRate: number;
    replyRate: number;
  }>;
  sourceAnalysis: {
    bySource: Array<{ source: string; count: number; percentage: number }>;
    totalWithEmail: number;
    totalWithoutEmail: number;
  };
  recentEvents: Array<{
    podcastId: string;
    podcastName: string;
    type: "sent" | "opened" | "replied" | "bounced";
    eventAt: string;
  }>;
}

function getSourceIcon(source: string) {
  switch (source) {
    case "Website Contact Page":
    case "Website Scrape":
      return { icon: Globe, color: "text-blue-600", bgColor: "bg-blue-100" };
    case "RSS Feed":
      return { icon: Rss, color: "text-orange-600", bgColor: "bg-orange-100" };
    case "Hunter.io":
      return { icon: Search, color: "text-purple-600", bgColor: "bg-purple-100" };
    case "Apple Podcasts":
      return { icon: Database, color: "text-pink-600", bgColor: "bg-pink-100" };
    case "Personal Email":
      return { icon: Mail, color: "text-green-600", bgColor: "bg-green-100" };
    default:
      return { icon: Mail, color: "text-slate-600", bgColor: "bg-slate-100" };
  }
}

export default function DashboardPage() {
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["outreach-campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/outreach/campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
  });

  const { data: trackingData, isLoading: isLoadingTracking } = useQuery<TrackingStats>({
    queryKey: ["tracking-stats"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/tracking?days=90");
      if (!res.ok) throw new Error("Failed to fetch tracking stats");
      return res.json();
    },
  });

  const { data: pipelineData } = useQuery({
    queryKey: ["podcasts-count"],
    queryFn: async () => {
      const res = await fetch("/api/podcasts?limit=1");
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      return res.json();
    },
  });

  const stats = campaignsData?.campaigns
    ? calculateAnalytics(campaignsData.campaigns)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF8354]" />
      </div>
    );
  }

  const totalCampaigns = campaignsData?.campaigns?.length || 0;
  const activeCampaigns = campaignsData?.campaigns?.filter((c: OutreachPodcast) => 
    c.status === "active" || c.status === "ready_to_send"
  ).length || 0;
  const pipelineCount = pipelineData?.total || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#5d637e] to-[#EF8354] rounded-2xl p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Welcome to Podcast Domination</h1>
            <p className="text-[#c5c8d4] text-base md:text-lg">
              Your command center for podcast guest booking success
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/discovery">
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 px-4 py-2 h-10"
              >
                <Search className="h-4 w-4 mr-2" />
                Find Podcasts
              </Button>
            </Link>
            <Link href="/outreach">
              <Button className="bg-white text-[#5d637e] hover:bg-[#c5c8d4] hover:text-[#2D3142] px-4 py-2 h-10 font-semibold shadow-lg">
                <Mail className="h-4 w-4 mr-2" />
                Start Outreach
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card hoverable>
          <Link href="/pipeline">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#5d637e]">
                Pipeline
              </CardTitle>
              <Users className="h-4 w-4 text-[#EF8354]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#2D3142]">{pipelineCount}</div>
              <p className="text-xs text-[#5d637e] flex items-center gap-1">
                Total podcasts <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card hoverable>
          <Link href="/outreach">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#5d637e]">
                Active Campaigns
              </CardTitle>
              <Target className="h-4 w-4 text-[#EF8354]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#2D3142]">{totalCampaigns}</div>
              <p className="text-xs text-[#5d637e] flex items-center gap-1">
                {activeCampaigns} in progress <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5d637e]">
              Emails Sent
            </CardTitle>
            <Send className="h-4 w-4 text-[#EF8354]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2D3142]">
              {trackingData?.summary?.totalSent ?? stats?.sent ?? 0}
            </div>
            <p className="text-xs text-[#5d637e]">Total sent emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5d637e]">
              Reply Rate
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-[#EF8354]" />
          </CardHeader>
          <CardContent>
            {(() => {
              const replyRate = trackingData?.summary?.replyRate ?? stats?.replyRate ?? 0;
              const totalReplied = trackingData?.summary?.totalReplied ?? stats?.replied ?? 0;
              return (
                <>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-[#2D3142]">{replyRate}%</div>
                    {replyRate > 20 && <TrendingUp className="h-4 w-4 text-[#EF8354]" />}
                  </div>
                  <p className="text-xs text-[#5d637e]">
                    {totalReplied} replies received
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card hoverable className="group">
          <Link href="/discovery">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#c5c8d4]/30 rounded-xl group-hover:bg-[#EF8354] group-hover:text-white transition-colors">
                  <Search className="h-6 w-6 text-[#EF8354] group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2D3142]">Discover Podcasts</h3>
                  <p className="text-sm text-[#5d637e]">Find new shows to pitch</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card hoverable className="group">
          <Link href="/outreach">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#ecedf1]/50 rounded-xl group-hover:bg-[#d96a3f] transition-colors">
                  <Mail className="h-6 w-6 text-[#d96a3f] group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2D3142]">Manage Campaigns</h3>
                  <p className="text-sm text-[#5d637e]">Send and track emails</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card hoverable className="group">
          <Link href="/settings">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#EF8354]/10 rounded-xl group-hover:bg-[#5d637e] transition-colors">
                  <Sparkles className="h-6 w-6 text-[#5d637e] group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2D3142]">Setup Profile</h3>
                  <p className="text-sm text-[#5d637e]">Configure your guest profile</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[#2D3142] text-lg">Weekly Performance</CardTitle>
            <div className="flex-shrink-0">
              <ExportButton />
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const weeklyData = trackingData?.weeklyData || stats?.weeklyData || [];
              const hasActivity = weeklyData.some(w => w.sent > 0);
              const maxWeeklyValue = Math.max(...weeklyData.map(w => w.sent), 1);
              
              if (!hasActivity) {
                return (
                  <div className="text-center py-8 text-[#5d637e]">
                    <Send className="h-10 w-10 mx-auto mb-3 text-[#c5c8d4]" />
                    <p className="font-medium">No email activity yet</p>
                    <p className="text-sm mt-1">Start sending emails to see weekly performance</p>
                    <Link href="/outreach">
                      <Button className="mt-4" variant="outline">
                        Go to Outreach <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                );
              }
              
              return (
                <>
                  <div className="space-y-4">
                    {weeklyData.map((week) => (
                      <div key={week.week} className="flex items-center gap-4">
                        <div className="w-20 text-sm text-[#5d637e]">{week.week}</div>
                        <div className="flex-1">
                          <div className="flex gap-1 h-6">
                            <div
                              className="bg-[#ecedf1] rounded transition-all duration-300"
                              style={{ width: `${(week.sent / maxWeeklyValue) * 100}%` }}
                              title={`${week.sent} sent`}
                            />
                            <div
                              className="bg-[#EF8354] rounded transition-all duration-300"
                              style={{ width: `${(week.replied / maxWeeklyValue) * 100}%` }}
                              title={`${week.replied} replied`}
                            />
                          </div>
                        </div>
                        <div className="text-sm text-[#5d637e] w-24 text-right">
                          {week.sent} sent
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-4 text-xs text-[#5d637e]">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-[#ecedf1] rounded" />
                      <span>Sent</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-[#EF8354] rounded" />
                      <span>Replied</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[#2D3142] text-lg">Recent Activity</CardTitle>
            <Link href="/outreach" className="text-xs text-[#EF8354] hover:text-[#5d637e] font-medium flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {(() => {
              const dbEvents = trackingData?.recentEvents || [];
              const campaignActivity = stats?.recentActivity || [];
              
              if (dbEvents.length > 0) {
                return (
                  <div className="space-y-2">
                    {dbEvents.slice(0, 6).map((event, i) => (
                      <Link
                        key={i}
                        href="/outreach"
                        className="flex items-center justify-between text-sm p-2.5 rounded-lg hover:bg-[#ecedf1]/30 transition-all duration-200 cursor-pointer group border border-transparent hover:border-[#c5c8d4]"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-1.5 rounded-full transition-colors",
                            event.type === "sent" && "bg-[#ecedf1] group-hover:bg-[#d96a3f]/20",
                            event.type === "opened" && "bg-[#EF8354]/20 group-hover:bg-[#EF8354]/30",
                            event.type === "replied" && "bg-[#5d637e]/20 group-hover:bg-[#5d637e]/30",
                            event.type === "bounced" && "bg-[#dc3545]/20 group-hover:bg-[#dc3545]/30"
                          )}>
                            {event.type === "sent" && <Send className="h-3 w-3 text-[#d96a3f]" />}
                            {event.type === "opened" && <Eye className="h-3 w-3 text-[#EF8354]" />}
                            {event.type === "replied" && <MessageSquare className="h-3 w-3 text-[#5d637e]" />}
                            {event.type === "bounced" && <XCircle className="h-3 w-3 text-[#dc3545]" />}
                          </div>
                          <span className="font-medium text-[#2D3142] truncate max-w-[180px] group-hover:text-[#5d637e]">
                            {event.podcastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium capitalize",
                            event.type === "sent" && "bg-[#ecedf1] text-[#d96a3f]",
                            event.type === "opened" && "bg-[#EF8354]/10 text-[#EF8354]",
                            event.type === "replied" && "bg-[#5d637e]/10 text-[#5d637e]",
                            event.type === "bounced" && "bg-[#dc3545]/10 text-[#dc3545]"
                          )}>
                            {event.type}
                          </span>
                          <ArrowRight className="h-3 w-3 text-[#c5c8d4] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              }
              
              if (campaignActivity.length > 0) {
                return (
                  <div className="space-y-2">
                    {campaignActivity.map((activity, i) => (
                      <Link
                        key={i}
                        href="/outreach"
                        className="flex items-center justify-between text-sm p-2.5 rounded-lg hover:bg-[#ecedf1]/30 transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="font-medium text-[#2D3142]">{activity.podcast}</span>
                          <span className="text-[#5d637e]"> - {activity.action}</span>
                        </div>
                        <span className="text-[#5d637e]">{activity.date}</span>
                      </Link>
                    ))}
                  </div>
                );
              }
              
              return (
                <div className="text-center py-8 text-[#5d637e]">
                  <Calendar className="h-10 w-10 mx-auto mb-3 text-[#c5c8d4]" />
                  <p className="font-medium">No recent activity</p>
                  <p className="text-sm mt-1">Activity will appear as you send emails</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {stats?.topPerformers && stats.topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2D3142] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#EF8354]" />
              Top Performing Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {stats.topPerformers.map((podcast, i) => (
                <div
                  key={podcast.name}
                  className="flex items-center gap-3 p-3 bg-[#f8f9fa]/50 rounded-lg"
                >
                  <span className="text-lg font-bold text-[#EF8354]">
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D3142] truncate">{podcast.name}</p>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        podcast.status === "booked"
                          ? "text-[#EF8354]"
                          : "text-[#5d637e]"
                      )}
                    >
                      {podcast.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
