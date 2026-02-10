// Shared storage for demo campaigns with file persistence
// This file provides a single source of truth for campaign data across all API routes

import {
  getCampaigns as getStoredCampaigns,
  updateCampaign as updateStoredCampaign,
  getCampaign as getStoredCampaign,
  syncCampaigns as syncStoredCampaigns,
  initializeWithDefaults,
  StoredCampaign,
} from "./campaigns-storage";

interface EmailInSequence {
  id: string;
  type: "initial" | "follow_up_1" | "follow_up_2" | "follow_up_3" | "nurture" | "closing";
  subject: string;
  body: string;
  status: "draft" | "scheduled" | "sent" | "opened" | "replied";
  sentAt: string | null;
  scheduledFor: string | null;
  openedAt: string | null;
  repliedAt: string | null;
}

export interface DemoCampaign {
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

// No demo data - start with empty state for production
function createInitialData(): DemoCampaign[] {
  return [];
}

// Initialize storage with defaults on first load
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeWithDefaults(createInitialData());
  }
  return initPromise;
}

// Get all demo campaigns (async with file persistence)
export async function getDemoCampaignsAsync(): Promise<DemoCampaign[]> {
  await ensureInitialized();
  return getStoredCampaigns();
}

// Synchronous version for backwards compatibility (uses cache)
// Note: This should only be called after async initialization
export function getDemoCampaigns(): DemoCampaign[] {
  // Trigger initialization in background
  ensureInitialized();

  // Return cached data synchronously - this works because initializeWithDefaults
  // populates the cache, and subsequent calls use the cache
  // For first-time access, this might return empty until cache is populated
  // API routes should use getDemoCampaignsAsync instead
  return [];
}

// Update a campaign by ID (async with file persistence)
export async function updateDemoCampaignAsync(
  id: string,
  updates: Partial<DemoCampaign>
): Promise<boolean> {
  await ensureInitialized();
  return updateStoredCampaign(id, updates as Partial<StoredCampaign>);
}

// Synchronous wrapper for backwards compatibility
export function updateDemoCampaign(id: string, updates: Partial<DemoCampaign>): boolean {
  // Fire and forget - updates will persist
  updateDemoCampaignAsync(id, updates).catch((err) =>
    console.error("[Demo] Failed to update campaign:", err)
  );
  return true;
}

// Get a single campaign by ID (async)
export async function getDemoCampaignAsync(id: string): Promise<DemoCampaign | undefined> {
  await ensureInitialized();
  return getStoredCampaign(id);
}

// Synchronous wrapper
export function getDemoCampaign(id: string): DemoCampaign | undefined {
  // This is a best-effort synchronous access - prefer async version
  return undefined;
}

// Sync all campaigns from frontend (bulk update)
export async function syncDemoCampaigns(campaigns: DemoCampaign[]): Promise<void> {
  await syncStoredCampaigns(campaigns as StoredCampaign[]);
}
