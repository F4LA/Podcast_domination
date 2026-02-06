"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportButton } from "@/components/analytics/export-button";
import {
  Send,
  Mail,
  MessageSquare,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Globe,
  Rss,
  Search,
  Database,
  AlertCircle,
  Eye,
  MousePointer,
  XCircle,
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
  // Calculate email stats from all campaigns
  let totalSent = 0;
  let totalOpened = 0;
  let totalReplied = 0;
  let totalBooked = 0;

  const recentActivity: { podcast: string; action: string; date: string; timestamp: number }[] = [];
  const performerMap = new Map<string, { name: string; status: string; priority: number }>();

  // Get current date for weekly calculations
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  // Initialize weekly data
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
    // Check if campaign is booked
    if (campaign.status === "booked" || campaign.responseType === "booked") {
      totalBooked++;
      performerMap.set(campaign.id, {
        name: campaign.showName,
        status: "booked",
        priority: 3,
      });
    }

    // Process email sequence
    campaign.emailSequence?.forEach((email) => {
      if (email.status === "sent" || email.status === "opened" || email.status === "replied") {
        totalSent++;

        // Add to recent activity
        if (email.sentAt) {
          const sentDate = new Date(email.sentAt);
          recentActivity.push({
            podcast: campaign.showName,
            action: "Sent",
            date: email.sentAt,
            timestamp: sentDate.getTime(),
          });

          // Add to weekly data
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

          // Add to weekly data
          const weekIndex = weeklyData.findIndex((w) => {
            const weekEnd = new Date(w.startDate);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return repliedDate >= w.startDate && repliedDate < weekEnd;
          });
          if (weekIndex >= 0) {
            weeklyData[weekIndex].replied++;
          }
        }

        // Track replied campaigns as performers if not already booked
        if (!performerMap.has(campaign.id) || performerMap.get(campaign.id)!.priority < 2) {
          performerMap.set(campaign.id, {
            name: campaign.showName,
            status: "replied",
            priority: 2,
          });
        }
      }
    });

    // Track booked in weekly data based on status change
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

  // Calculate rates
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0;
  const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 1000) / 10 : 0;
  const bookingRate = totalSent > 0 ? Math.round((totalBooked / totalSent) * 1000) / 10 : 0;

  // Sort and format recent activity
  const sortedActivity = recentActivity
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
    .map((a) => ({
      podcast: a.podcast,
      action: a.action,
      date: formatRelativeTime(a.date),
    }));

  // Get top performers
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

// Interface for tracking stats from database
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

// Get icon and color for email source
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

export default function AnalyticsPage() {
  // Fetch real campaign data
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["outreach-campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/outreach/campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
  });

  // Fetch database tracking stats
  const { data: trackingData, isLoading: isLoadingTracking } = useQuery<TrackingStats>({
    queryKey: ["tracking-stats"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/tracking?days=90");
      if (!res.ok) throw new Error("Failed to fetch tracking stats");
      return res.json();
    },
  });

  // Calculate stats from real data
  const stats = campaignsData?.campaigns
    ? calculateAnalytics(campaignsData.campaigns)
    : null;

  // Find max for scaling weekly chart
  const maxWeekly = stats
    ? Math.max(...stats.weeklyData.map((w) => w.sent + w.replied + w.booked), 1)
    : 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF8354]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2D3142]">Analytics</h1>
          <p className="text-sm text-[#5d637e]">
            Track your outreach performance and conversion rates
          </p>
        </div>
        <ExportButton />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5d637e]">
              Emails Sent
            </CardTitle>
            <Send className="h-4 w-4 text-[#EF8354]" />
          </CardHeader>
          <CardContent>
            {/* Use database tracking data as source of truth, fallback to campaign stats */}
            <div className="text-2xl font-bold text-[#2D3142]">
              {trackingData?.summary?.totalSent ?? stats?.sent ?? 0}
            </div>
            <p className="text-xs text-[#5d637e]">Total sent emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5d637e]">
              Open Rate
            </CardTitle>
            <Mail className="h-4 w-4 text-[#EF8354]" />
          </CardHeader>
          <CardContent>
            {(() => {
              const openRate = trackingData?.summary?.openRate ?? stats?.openRate ?? 0;
              const totalOpened = trackingData?.summary?.totalOpened ?? stats?.opened ?? 0;
              const totalSent = trackingData?.summary?.totalSent ?? stats?.sent ?? 0;
              return (
                <>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-[#2D3142]">{openRate}%</div>
                    {openRate > 50 && <TrendingUp className="h-4 w-4 text-[#EF8354]" />}
                  </div>
                  <p className="text-xs text-[#5d637e]">
                    {totalOpened} of {totalSent} opened
                  </p>
                </>
              );
            })()}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5d637e]">
              Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-[#EF8354]" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-[#2D3142]">{stats?.booked || 0}</div>
              {stats && stats.booked > 0 && <TrendingUp className="h-4 w-4 text-[#EF8354]" />}
            </div>
            <p className="text-xs text-[#5d637e]">
              {stats?.bookingRate || 0}% conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Performance - Use database tracking data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2D3142]">Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Prefer database tracking data, fallback to campaign stats
              const weeklyData = trackingData?.weeklyData || stats?.weeklyData || [];
              const hasActivity = weeklyData.some(w => w.sent > 0);
              const maxWeeklyValue = Math.max(...weeklyData.map(w => w.sent), 1);
              
              if (!hasActivity) {
                return (
                  <div className="text-center py-8 text-[#5d637e]">
                    <p>No email activity yet</p>
                    <p className="text-sm mt-1">Start sending emails to see weekly performance</p>
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
                              className="bg-[#ecedf1] rounded"
                              style={{ width: `${(week.sent / maxWeeklyValue) * 100}%` }}
                              title={`${week.sent} sent`}
                            />
                            <div
                              className="bg-[#EF8354] rounded"
                              style={{ width: `${(week.replied / maxWeeklyValue) * 100}%` }}
                              title={`${week.replied} replied`}
                            />
                            {('opened' in week) && (
                              <div
                                className="bg-[#c5c8d4] rounded"
                                style={{ width: `${((week as { opened?: number }).opened || 0) / maxWeeklyValue * 100}%` }}
                                title={`${(week as { opened?: number }).opened || 0} opened`}
                              />
                            )}
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
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-[#c5c8d4] rounded" />
                      <span>Opened</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Top Performers & Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2D3142]">Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.topPerformers && stats.topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {stats.topPerformers.map((podcast, i) => (
                    <div
                      key={podcast.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-[#5d637e]">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-[#2D3142]">{podcast.name}</span>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          podcast.status === "booked"
                            ? "bg-[#c5c8d4] text-[#2D3142]"
                            : "bg-[#EF8354]/20 text-[#5d637e]"
                        )}
                      >
                        {podcast.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-[#5d637e]">
                  <p>No responses yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#2D3142]">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Prefer database tracking events, fallback to campaign stats
                const dbEvents = trackingData?.recentEvents || [];
                const campaignActivity = stats?.recentActivity || [];
                
                // If we have database events, use those
                if (dbEvents.length > 0) {
                  return (
                    <div className="space-y-3">
                      {dbEvents.slice(0, 5).map((event, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {event.type === "sent" && <Send className="h-3.5 w-3.5 text-[#d96a3f]" />}
                            {event.type === "opened" && <Eye className="h-3.5 w-3.5 text-[#EF8354]" />}
                            {event.type === "replied" && <MessageSquare className="h-3.5 w-3.5 text-[#5d637e]" />}
                            {event.type === "bounced" && <XCircle className="h-3.5 w-3.5 text-[#dc3545]" />}
                            <span className="font-medium text-[#2D3142] truncate max-w-[150px]">
                              {event.podcastName}
                            </span>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            event.type === "sent" && "bg-[#ecedf1] text-[#d96a3f]",
                            event.type === "opened" && "bg-[#EF8354]/10 text-[#EF8354]",
                            event.type === "replied" && "bg-[#5d637e]/10 text-[#5d637e]",
                            event.type === "bounced" && "bg-[#dc3545]/10 text-[#dc3545]"
                          )}>
                            {event.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                
                // Fallback to campaign activity
                if (campaignActivity.length > 0) {
                  return (
                    <div className="space-y-3">
                      {campaignActivity.map((activity, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-medium text-[#2D3142]">{activity.podcast}</span>
                            <span className="text-[#5d637e]"> - {activity.action}</span>
                          </div>
                          <span className="text-[#5d637e]">{activity.date}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                
                return (
                  <div className="text-center py-4 text-[#5d637e]">
                    <p>No recent activity</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Source & Tracking Section */}
      <div className="mt-8 pt-6 border-t border-[#c5c8d4]">
        <h2 className="text-xl font-bold text-[#2D3142] mb-4">Email Discovery & Tracking</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Email Source Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2D3142] flex items-center gap-2">
                <Search className="h-5 w-5 text-[#EF8354]" />
                Email Source Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTracking ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#EF8354]" />
                </div>
              ) : trackingData?.sourceAnalysis?.bySource && trackingData.sourceAnalysis.bySource.length > 0 ? (
                <div className="space-y-4">
                  {/* Stats summary */}
                  <div className="flex gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-[#2D3142]">{trackingData.sourceAnalysis.totalWithEmail}</span>
                      <span className="text-[#5d637e]">with email</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-[#dc3545]">{trackingData.sourceAnalysis.totalWithoutEmail}</span>
                      <span className="text-[#5d637e]">without email</span>
                    </div>
                  </div>

                  {/* Source bars */}
                  <div className="space-y-3">
                    {trackingData.sourceAnalysis.bySource.map((source) => {
                      const { icon: Icon, color, bgColor } = getSourceIcon(source.source);
                      return (
                        <div key={source.source} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={cn("p-1 rounded", bgColor)}>
                                <Icon className={cn("h-3 w-3", color)} />
                              </div>
                              <span className="text-[#2D3142] font-medium">{source.source}</span>
                            </div>
                            <div className="text-[#5d637e]">
                              {source.count} ({source.percentage}%)
                            </div>
                          </div>
                          <div className="h-2 bg-[#ecedf1]/50 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", bgColor)}
                              style={{ width: `${source.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-[#5d637e] mt-4">
                    Shows how emails were discovered across your podcast contacts
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-[#5d637e]">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No email source data yet</p>
                  <p className="text-sm mt-1">Start finding emails to see breakdown</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Database Tracking Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2D3142] flex items-center gap-2">
                <Eye className="h-5 w-5 text-[#EF8354]" />
                Email Tracking (Database)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTracking ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#EF8354]" />
                </div>
              ) : trackingData?.summary ? (
                <div className="space-y-4">
                  {/* Tracking stats grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-[#c5c8d4]/20 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Eye className="h-4 w-4 text-[#EF8354]" />
                      </div>
                      <div className="text-xl font-bold text-[#2D3142]">{trackingData.summary.openRate}%</div>
                      <div className="text-xs text-[#5d637e]">Open Rate</div>
                    </div>
                    <div className="text-center p-3 bg-[#EF8354]/10 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <MessageSquare className="h-4 w-4 text-[#EF8354]" />
                      </div>
                      <div className="text-xl font-bold text-[#2D3142]">{trackingData.summary.replyRate}%</div>
                      <div className="text-xs text-[#5d637e]">Reply Rate</div>
                    </div>
                    <div className="text-center p-3 bg-[#dc3545]/10 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <XCircle className="h-4 w-4 text-[#dc3545]" />
                      </div>
                      <div className="text-xl font-bold text-[#2D3142]">{trackingData.summary.bounceRate}%</div>
                      <div className="text-xs text-[#5d637e]">Bounce Rate</div>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-between text-sm border-t border-[#c5c8d4]/50 pt-3">
                    <span className="text-[#5d637e]">Total Sent</span>
                    <span className="font-medium text-[#2D3142]">{trackingData.summary.totalSent}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5d637e]">Total Opened</span>
                    <span className="font-medium text-[#EF8354]">{trackingData.summary.totalOpened}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5d637e]">Total Replied</span>
                    <span className="font-medium text-[#5d637e]">{trackingData.summary.totalReplied}</span>
                  </div>

                  {/* Recent tracking events */}
                  {trackingData.recentEvents && trackingData.recentEvents.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#c5c8d4]/50">
                      <h4 className="text-sm font-medium text-[#2D3142] mb-2">Recent Events</h4>
                      <div className="space-y-2">
                        {trackingData.recentEvents.slice(0, 5).map((event, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              {event.type === "opened" && <Eye className="h-3 w-3 text-[#EF8354]" />}
                              {event.type === "replied" && <MessageSquare className="h-3 w-3 text-[#5d637e]" />}
                              {event.type === "bounced" && <XCircle className="h-3 w-3 text-[#dc3545]" />}
                              <span className="text-[#2D3142] truncate max-w-[150px]">{event.podcastName}</span>
                            </div>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium",
                              event.type === "opened" && "bg-[#EF8354]/10 text-[#EF8354]",
                              event.type === "replied" && "bg-[#5d637e]/10 text-[#5d637e]",
                              event.type === "bounced" && "bg-[#dc3545]/10 text-[#dc3545]"
                            )}>
                              {event.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-[#5d637e]">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tracking data yet</p>
                  <p className="text-sm mt-1">Email opens and clicks will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tracking how-it-works info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-[#2D3142] flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#d96a3f]" />
              How Email Tracking Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-[#ecedf1]/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-[#EF8354]" />
                  <span className="font-medium text-[#2D3142]">Open Tracking</span>
                </div>
                <p className="text-sm text-[#5d637e]">
                  A tiny invisible pixel image is embedded in each email. When loaded, it records the open event.
                </p>
              </div>
              <div className="p-4 bg-[#EF8354]/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointer className="h-5 w-5 text-[#EF8354]" />
                  <span className="font-medium text-[#2D3142]">Click Tracking</span>
                </div>
                <p className="text-sm text-[#5d637e]">
                  Links in your emails are wrapped with tracking redirects that record clicks before sending recipients to the destination.
                </p>
              </div>
              <div className="p-4 bg-[#c5c8d4]/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-5 w-5 text-[#5d637e]" />
                  <span className="font-medium text-[#2D3142]">Reply Detection</span>
                </div>
                <p className="text-sm text-[#5d637e]">
                  Gmail webhook integration monitors your inbox for replies to outreach emails and updates status automatically.
                </p>
              </div>
            </div>
            <p className="text-xs text-[#5d637e] mt-4">
              Note: Some email clients block tracking pixels. Open rates may be underreported. Reply tracking is the most reliable metric.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
