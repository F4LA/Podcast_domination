"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Mail,
  Key,
  Link2,
  Save,
  Check,
  Target,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Database,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";

interface Criterion {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isEnabled: boolean;
  isRequired: boolean;
  isCustom: boolean;
  weight: number;
  promptHint: string | null;
  sortOrder: number;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "criteria" | "email" | "apikeys" | "integrations">("profile");

  const [emailSettings, setEmailSettings] = useState({
    senderName: "",
    signature: "",
    followUpEnabled: true,
    followUp1Days: 5,
    followUp2Days: 7,
    followUp3Days: 14,
  });

  // Load email settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedEmailSettings = localStorage.getItem("email-settings");
      if (storedEmailSettings) {
        try {
          setEmailSettings(JSON.parse(storedEmailSettings));
        } catch {}
      }
    }
  }, []);

  const handleSaveEmail = () => {
    // Save to localStorage for email generation
    if (typeof window !== "undefined") {
      localStorage.setItem("email-settings", JSON.stringify(emailSettings));
    }
    alert("Email settings saved!");
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2D3142]">Settings</h1>
        <p className="text-sm text-[#5d637e]">
          Configure your profile, targeting criteria, and integrations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#c5c8d4] mb-6">
        <div className="flex gap-6">
          <TabButton
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            icon={User}
          >
            Guest Profile
          </TabButton>
          <TabButton
            active={activeTab === "criteria"}
            onClick={() => setActiveTab("criteria")}
            icon={Target}
          >
            Perfect Podcast
          </TabButton>
          <TabButton
            active={activeTab === "email"}
            onClick={() => setActiveTab("email")}
            icon={Mail}
          >
            Email Settings
          </TabButton>
          <TabButton
            active={activeTab === "apikeys"}
            onClick={() => setActiveTab("apikeys")}
            icon={Database}
          >
            API Keys
          </TabButton>
          <TabButton
            active={activeTab === "integrations"}
            onClick={() => setActiveTab("integrations")}
            icon={Key}
          >
            Integrations
          </TabButton>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && <GuestProfileTab />}
      {activeTab === "criteria" && <PerfectPodcastTab />}
      {activeTab === "email" && (
        <EmailSettingsTab
          settings={emailSettings}
          onChange={setEmailSettings}
          onSave={handleSaveEmail}
        />
      )}
      {activeTab === "apikeys" && <ApiKeysManager />}
      {activeTab === "integrations" && <IntegrationsTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 pb-3 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-[#EF8354] text-[#EF8354]"
          : "border-transparent text-[#5d637e] hover:text-[#2D3142]"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

// ================== Perfect Podcast Tab ==================

function PerfectPodcastTab() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCriterion, setNewCriterion] = useState({
    name: "",
    description: "",
    category: "general",
    isRequired: false,
    weight: 3,
    promptHint: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["criteria"],
    queryFn: async () => {
      const res = await fetch("/api/settings/criteria");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Criterion>) => {
      const res = await fetch(`/api/settings/criteria/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["criteria"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCriterion) => {
      const res = await fetch("/api/settings/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["criteria"] });
      setShowAddForm(false);
      setNewCriterion({
        name: "",
        description: "",
        category: "general",
        isRequired: false,
        weight: 3,
        promptHint: "",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/criteria/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["criteria"] });
    },
  });

  const criteria: Criterion[] = data?.criteria || [];

  // Group by category
  const categories = [
    { id: "content", label: "Content & Topics" },
    { id: "audience", label: "Audience & Reach" },
    { id: "technical", label: "Technical Quality" },
    { id: "general", label: "General Requirements" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF8354]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-[#d4f0e7] border border-[#c5c8d4] rounded-lg p-4">
        <div className="flex gap-3">
          <Target className="h-5 w-5 text-[#EF8354] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-[#2D3142]">Define Your Perfect Podcast</h3>
            <p className="text-sm text-[#5d637e] mt-1">
              These criteria help the AI determine which podcasts are worth pursuing.
              Required criteria must be met, while others influence the overall fit score.
            </p>
          </div>
        </div>
      </div>

      {/* Criteria by Category */}
      {categories.map((category) => {
        const categoryCriteria = criteria.filter((c) => c.category === category.id);
        if (categoryCriteria.length === 0) return null;

        return (
          <div key={category.id} className="bg-white border border-[#c5c8d4] rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-[#f8f9fa] border-b border-[#c5c8d4]">
              <h3 className="font-medium text-[#2D3142]">{category.label}</h3>
            </div>
            <div className="divide-y divide-[#c5c8d4]">
              {categoryCriteria.map((criterion) => (
                <CriterionRow
                  key={criterion.id}
                  criterion={criterion}
                  onUpdate={(data) => updateMutation.mutate({ id: criterion.id, ...data })}
                  onDelete={() => {
                    if (confirm("Delete this criterion?")) {
                      deleteMutation.mutate(criterion.id);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Add Custom Criterion */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-[#c5c8d4] rounded-lg text-[#5d637e] hover:border-[#EF8354] hover:text-[#EF8354] transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Custom Criterion
        </button>
      ) : (
        <div className="bg-white border border-[#c5c8d4] rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-[#2D3142]">New Custom Criterion</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#5d637e]">Name *</label>
              <input
                type="text"
                value={newCriterion.name}
                onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
                placeholder="e.g., Has social media presence"
                className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#5d637e]">Category</label>
              <select
                value={newCriterion.category}
                onChange={(e) => setNewCriterion({ ...newCriterion, category: e.target.value })}
                className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#5d637e]">Description</label>
            <input
              type="text"
              value={newCriterion.description}
              onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })}
              placeholder="Brief explanation of what this criterion checks"
              className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#5d637e]">AI Evaluation Hint</label>
            <textarea
              value={newCriterion.promptHint}
              onChange={(e) => setNewCriterion({ ...newCriterion, promptHint: e.target.value })}
              placeholder="Instructions for how the AI should evaluate this criterion..."
              rows={2}
              className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newCriterion.isRequired}
                onChange={(e) => setNewCriterion({ ...newCriterion, isRequired: e.target.checked })}
                className="rounded border-[#c5c8d4]"
              />
              <span className="text-sm text-[#5d637e]">Required (instant skip if not met)</span>
            </label>

            <div className="flex items-center gap-2">
              <label className="text-sm text-[#5d637e]">Importance:</label>
              <select
                value={newCriterion.weight}
                onChange={(e) => setNewCriterion({ ...newCriterion, weight: parseInt(e.target.value) })}
                className="border border-[#c5c8d4] rounded px-2 py-1 text-sm text-[#2D3142]"
              >
                <option value={1}>Low (1)</option>
                <option value={2}>Medium-Low (2)</option>
                <option value={3}>Medium (3)</option>
                <option value={4}>Medium-High (4)</option>
                <option value={5}>High (5)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => createMutation.mutate(newCriterion)}
              disabled={!newCriterion.name || createMutation.isPending}
              className="px-4 py-2 bg-[#EF8354] text-white rounded-lg hover:bg-[#5d637e] disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Criterion
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CriterionRow({
  criterion,
  onUpdate,
  onDelete,
}: {
  criterion: Criterion;
  onUpdate: (data: Partial<Criterion>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="px-4 py-3 flex items-start gap-4">
      {/* Enable/Disable Toggle */}
      <button
        onClick={() => onUpdate({ isEnabled: !criterion.isEnabled })}
        className={cn(
          "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
          criterion.isEnabled
            ? "bg-[#EF8354] border-[#EF8354] text-white"
            : "border-[#c5c8d4] text-transparent hover:border-[#5d637e]"
        )}
      >
        <Check className="h-3 w-3" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium",
            criterion.isEnabled ? "text-[#2D3142]" : "text-[#5d637e]"
          )}>
            {criterion.name}
          </span>
          {criterion.isRequired && (
            <span className="px-1.5 py-0.5 bg-[#fce8e9] text-[#9d2227] text-xs font-medium rounded">
              Required
            </span>
          )}
          {criterion.isCustom && (
            <span className="px-1.5 py-0.5 bg-[#c5c8d4] text-[#5d637e] text-xs font-medium rounded">
              Custom
            </span>
          )}
        </div>
        {criterion.description && (
          <p className={cn(
            "text-sm mt-0.5",
            criterion.isEnabled ? "text-[#5d637e]" : "text-[#5d637e]"
          )}>
            {criterion.description}
          </p>
        )}
      </div>

      {/* Weight */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {[1, 2, 3, 4, 5].map((w) => (
          <button
            key={w}
            onClick={() => onUpdate({ weight: w })}
            className={cn(
              "w-2 h-4 rounded-sm transition-colors",
              w <= criterion.weight
                ? criterion.isEnabled ? "bg-[#d4f0e7]0" : "bg-[#c5c8d4]"
                : "bg-[#ecedf1]"
            )}
            title={`Weight: ${w}`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {criterion.isCustom && (
          <button
            onClick={onDelete}
            className="p-1 text-[#5d637e] hover:text-[#9d2227] rounded"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ================== Guest Profile Tab ==================

interface GuestProfileData {
  id: string;
  name: string;
  isActive: boolean;
  fullName: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  topics: string[];
  credentials: string | null;
  uniqueAngle: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
}

function GuestProfileTab() {
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState<GuestProfileData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    fullName: "",
    title: "",
    company: "",
    bio: "",
    topics: "",
    credentials: "",
    uniqueAngle: "",
    websiteUrl: "",
    linkedinUrl: "",
    twitterUrl: "",
  });

  // Fetch all profiles
  const { data, isLoading } = useQuery({
    queryKey: ["guest-profiles"],
    queryFn: async () => {
      const res = await fetch("/api/guest-profiles");
      if (!res.ok) throw new Error("Failed to fetch profiles");
      return res.json();
    },
  });

  const profiles: GuestProfileData[] = data?.profiles || [];
  const activeProfile = profiles.find((p) => p.isActive);

  // Create profile mutation
  const createMutation = useMutation({
    mutationFn: async (profileData: typeof formData & { setAsActive?: boolean }) => {
      const res = await fetch("/api/guest-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      if (!res.ok) throw new Error("Failed to create profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-profiles"] });
      setIsCreating(false);
      resetForm();
    },
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<typeof formData>) => {
      const res = await fetch(`/api/guest-profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-profiles"] });
      setEditingProfile(null);
      resetForm();
    },
  });

  // Activate profile mutation
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/guest-profiles/${id}/activate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to activate profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-profiles"] });
    },
  });

  // Delete profile mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/guest-profiles/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-profiles"] });
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      fullName: "",
      title: "",
      company: "",
      bio: "",
      topics: "",
      credentials: "",
      uniqueAngle: "",
      websiteUrl: "",
      linkedinUrl: "",
      twitterUrl: "",
    });
  };

  const startEditing = (profile: GuestProfileData) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      fullName: profile.fullName,
      title: profile.title || "",
      company: profile.company || "",
      bio: profile.bio || "",
      topics: profile.topics.join(", "),
      credentials: profile.credentials || "",
      uniqueAngle: profile.uniqueAngle || "",
      websiteUrl: profile.websiteUrl || "",
      linkedinUrl: profile.linkedinUrl || "",
      twitterUrl: profile.twitterUrl || "",
    });
    setIsCreating(false);
  };

  const startCreating = () => {
    setIsCreating(true);
    setEditingProfile(null);
    resetForm();
  };

  const cancelEdit = () => {
    setEditingProfile(null);
    setIsCreating(false);
    resetForm();
  };

  const handleSave = () => {
    if (editingProfile) {
      updateMutation.mutate({ id: editingProfile.id, ...formData });
    } else {
      createMutation.mutate({ ...formData, setAsActive: profiles.length === 0 });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF8354]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Profile Banner */}
      {activeProfile && !isCreating && !editingProfile && (
        <div className="bg-[#d4f0e7] border border-[#c5c8d4] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#EF8354] rounded-full flex items-center justify-center text-white font-bold">
                {activeProfile.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[#2D3142]">{activeProfile.fullName}</h3>
                  <span className="px-2 py-0.5 bg-[#EF8354] text-white text-xs rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-sm text-[#5d637e]">
                  {activeProfile.title}{activeProfile.company && ` at ${activeProfile.company}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => startEditing(activeProfile)}
              className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-white"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Profile List */}
      {!isCreating && !editingProfile && (
        <div className="bg-white border border-[#c5c8d4] rounded-lg">
          <div className="px-6 py-4 border-b border-[#c5c8d4] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#2D3142]">Guest Profiles</h2>
              <p className="text-sm text-[#5d637e]">
                Manage multiple profiles for different outreach scenarios
              </p>
            </div>
            <button
              onClick={startCreating}
              className="px-4 py-2 bg-[#EF8354] text-white rounded-lg hover:bg-[#5d637e] flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Profile
            </button>
          </div>

          {profiles.length === 0 ? (
            <div className="p-8 text-center">
              <User className="h-12 w-12 text-[#c5c8d4] mx-auto mb-3" />
              <h3 className="font-medium text-[#2D3142] mb-1">No profiles yet</h3>
              <p className="text-sm text-[#5d637e] mb-4">
                Create your first guest profile to start sending personalized pitches
              </p>
              <button
                onClick={startCreating}
                className="px-4 py-2 bg-[#EF8354] text-white rounded-lg hover:bg-[#5d637e]"
              >
                Create Profile
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#c5c8d4]">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={cn(
                    "px-6 py-4 flex items-center justify-between",
                    profile.isActive && "bg-[#f0fdf9]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                      profile.isActive
                        ? "bg-[#EF8354] text-white"
                        : "bg-[#ecedf1] text-[#2D3142]"
                    )}>
                      {profile.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-[#2D3142]">{profile.name}</h4>
                        {profile.isActive && (
                          <span className="px-2 py-0.5 bg-[#EF8354] text-white text-xs rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#5d637e]">
                        {profile.fullName}
                        {profile.title && ` • ${profile.title}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!profile.isActive && (
                      <button
                        onClick={() => activateMutation.mutate(profile.id)}
                        disabled={activateMutation.isPending}
                        className="px-3 py-1.5 text-sm border border-[#EF8354] text-[#EF8354] rounded-lg hover:bg-[#d4f0e7] disabled:opacity-50"
                      >
                        {activateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Set Active"
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => startEditing(profile)}
                      className="p-2 text-[#5d637e] hover:text-[#2D3142] rounded"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    {!profile.isActive && (
                      <button
                        onClick={() => {
                          if (confirm("Delete this profile?")) {
                            deleteMutation.mutate(profile.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-[#5d637e] hover:text-[#9d2227] rounded disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile Form (Create/Edit) */}
      {(isCreating || editingProfile) && (
        <div className="bg-white border border-[#c5c8d4] rounded-lg">
          <div className="px-6 py-4 border-b border-[#c5c8d4] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#2D3142]">
                {editingProfile ? "Edit Profile" : "Create New Profile"}
              </h2>
              <p className="text-sm text-[#5d637e]">
                This information is used to generate personalized pitch emails
              </p>
            </div>
            <button
              onClick={cancelEdit}
              className="p-2 text-[#5d637e] hover:text-[#2D3142] rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {/* Profile Name */}
            <div className="bg-[#f8f9fa] border border-[#ecedf1] rounded-lg p-4">
              <label className="text-sm font-medium text-[#5d637e]">
                Profile Name <span className="text-[#9d2227]">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Business Expert, Health Coach, Tech Founder"
                className="mt-1 w-full border border-[#ecedf1] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e] bg-white"
              />
              <p className="text-xs text-[#5d637e] mt-1">
                A label to identify this profile (not shown in emails)
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-[#5d637e]">
                  Full Name <span className="text-[#9d2227]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Smith"
                  className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#5d637e]">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="CEO & Founder"
                  className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#5d637e]">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Acme Inc."
                className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#5d637e]">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="A brief bio about yourself..."
                rows={3}
                className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#5d637e]">Topics You Speak About</label>
              <input
                type="text"
                value={formData.topics}
                onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                placeholder="Leadership, AI, Startups (comma separated)"
                className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#5d637e]">Credentials & Social Proof</label>
              <textarea
                value={formData.credentials}
                onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                placeholder="Notable achievements, previous podcast appearances, publications..."
                rows={2}
                className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#5d637e]">Your Unique Angle</label>
              <textarea
                value={formData.uniqueAngle}
                onChange={(e) => setFormData({ ...formData, uniqueAngle: e.target.value })}
                placeholder="What makes you different from other guests?"
                rows={2}
                className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-[#5d637e]">Website</label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#5d637e]">LinkedIn</label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#5d637e]">Twitter/X</label>
                <input
                  type="url"
                  value={formData.twitterUrl}
                  onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                  placeholder="https://twitter.com/..."
                  className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.fullName || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-[#EF8354] text-white rounded-lg hover:bg-[#5d637e] flex items-center gap-2 disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Save className="h-4 w-4" />
                {editingProfile ? "Save Changes" : "Create Profile"}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================== Email Settings Tab ==================

function EmailSettingsTab({
  settings,
  onChange,
  onSave,
}: {
  settings: any;
  onChange: (settings: any) => void;
  onSave: () => void;
}) {
  return (
    <div className="bg-white border border-[#c5c8d4] rounded-lg">
      <div className="px-6 py-4 border-b border-[#c5c8d4]">
        <h2 className="font-semibold text-[#2D3142]">Email Configuration</h2>
        <p className="text-sm text-[#5d637e]">
          Configure how your outreach emails are sent
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-[#5d637e]">Sender Name</label>
          <input
            type="text"
            value={settings.senderName}
            onChange={(e) => onChange({ ...settings, senderName: e.target.value })}
            placeholder="John from Acme"
            className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#5d637e]">Email Signature</label>
          <textarea
            value={settings.signature}
            onChange={(e) => onChange({ ...settings, signature: e.target.value })}
            placeholder="Best regards,&#10;John Smith&#10;CEO, Acme Inc."
            rows={4}
            className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
          />
        </div>

        <div className="pt-4 border-t border-[#c5c8d4]">
          <h4 className="font-medium text-[#2D3142] mb-4">Follow-up Schedule</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-[#5d637e]">First Follow-up (days)</label>
              <input
                type="number"
                value={settings.followUp1Days}
                onChange={(e) => onChange({ ...settings, followUp1Days: parseInt(e.target.value) })}
                className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#5d637e]">Second Follow-up (days)</label>
              <input
                type="number"
                value={settings.followUp2Days}
                onChange={(e) => onChange({ ...settings, followUp2Days: parseInt(e.target.value) })}
                className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#5d637e]">Final Follow-up (days)</label>
              <input
                type="number"
                value={settings.followUp3Days}
                onChange={(e) => onChange({ ...settings, followUp3Days: parseInt(e.target.value) })}
                className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>
          </div>
        </div>

        <button
          onClick={onSave}
          className="px-4 py-2 bg-[#EF8354] text-white rounded-lg hover:bg-[#5d637e] flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Email Settings
        </button>
      </div>
    </div>
  );
}

// ================== Integrations Tab ==================

interface IntegrationStatus {
  connected: boolean;
  configured: boolean;
  masked?: string | null;
  hasOAuthToken?: boolean;
}

interface IntegrationsData {
  gmail: IntegrationStatus;
  anthropic: IntegrationStatus;
  openai: IntegrationStatus;
  spotify: IntegrationStatus;
  podcastindex: IntegrationStatus;
  listennotes: IntegrationStatus;
  apple: IntegrationStatus;
  resend: IntegrationStatus;
  zerobounce: IntegrationStatus;
}

function IntegrationsTab() {
  const queryClient = useQueryClient();
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);

  // Fetch integration status
  const { data: integrations, isLoading } = useQuery<IntegrationsData>({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await fetch("/api/integrations");
      if (!res.ok) throw new Error("Failed to fetch integrations");
      const data = await res.json();
      return data.integrations;
    },
  });

  // Check Gmail status
  useQuery({
    queryKey: ["gmail-status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/gmail?action=status");
      const data = await res.json();
      if (data.connected) {
        setGmailEmail(data.email);
      }
      return data;
    },
  });

  // Test integration connection
  const testConnection = async (integration: string) => {
    setTestingIntegration(integration);
    try {
      // Gmail uses a special endpoint that sends an actual test email
      if (integration === "gmail") {
        const res = await fetch("/api/integrations/test-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const result = await res.json();
        setTestResults((prev) => ({ ...prev, [integration]: result }));
      } else {
        const res = await fetch("/api/integrations/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration, apiKey: apiKeys[integration] }),
        });
        const result = await res.json();
        setTestResults((prev) => ({ ...prev, [integration]: result }));
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [integration]: { success: false, message: "Test failed" },
      }));
    }
    setTestingIntegration(null);
  };

  // Connect Gmail via OAuth
  const connectGmail = async () => {
    try {
      const res = await fetch("/api/auth/gmail?action=connect");
      const data = await res.json();

      // Check for redirect URI mismatch before opening popup
      if (data.debug?.potentialMismatch) {
        const confirmConnect = window.confirm(
          `WARNING: Redirect URI mismatch detected!\n\n` +
          `Your app is running at: ${window.location.origin}\n` +
          `But redirect URI is set to: ${data.debug.redirectUri}\n\n` +
          `This will cause "Error 400: invalid_request" from Google.\n\n` +
          `To fix:\n` +
          `1. Go to Railway dashboard → Variables\n` +
          `2. Set GOOGLE_REDIRECT_URI to: ${window.location.origin}/api/auth/gmail/callback\n` +
          `3. Set NEXT_PUBLIC_APP_URL to: ${window.location.origin}\n` +
          `4. Redeploy the app\n` +
          `5. Also update the redirect URI in Google Cloud Console\n\n` +
          `Click OK to try anyway, or Cancel to fix first.`
        );
        if (!confirmConnect) return;
      }

      if (data.authUrl) {
        // Open OAuth popup
        const popup = window.open(data.authUrl, "gmail_auth", "width=500,height=600");

        // Listen for callback
        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === "gmail_oauth_callback" && event.data.code) {
            // Exchange code for tokens
            const tokenRes = await fetch("/api/auth/gmail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: event.data.code }),
            });
            const tokenData = await tokenRes.json();

            if (tokenData.success) {
              setGmailEmail(tokenData.email);
              setTestResults((prev) => ({
                ...prev,
                gmail: { success: true, message: `Connected as ${tokenData.email}` },
              }));
              queryClient.invalidateQueries({ queryKey: ["integrations"] });
            } else {
              setTestResults((prev) => ({
                ...prev,
                gmail: { success: false, message: tokenData.error || "Failed to connect" },
              }));
            }
          }
          window.removeEventListener("message", handleMessage);
        };

        window.addEventListener("message", handleMessage);
      } else if (data.error) {
        setTestResults((prev) => ({
          ...prev,
          gmail: { success: false, message: data.error },
        }));
      }
    } catch (error) {
      console.error("Gmail connect error:", error);
      setTestResults((prev) => ({
        ...prev,
        gmail: { success: false, message: "Failed to initiate connection" },
      }));
    }
  };

  // Disconnect Gmail
  const disconnectGmail = async () => {
    await fetch("/api/auth/gmail?action=disconnect");
    setGmailEmail(null);
    setTestResults((prev) => ({ ...prev, gmail: { success: false, message: "Disconnected" } }));
    queryClient.invalidateQueries({ queryKey: ["integrations"] });
  };

  // Save API key
  const saveApiKey = async (integration: string) => {
    setTestingIntegration(integration);

    try {
      // Build config based on integration type
      let config: Record<string, string> = {};
      
      if (integration === "spotify") {
        if (!apiKeys.spotify_id || !apiKeys.spotify_secret) return;
        config = { clientId: apiKeys.spotify_id, clientSecret: apiKeys.spotify_secret };
      } else if (integration === "podcastindex") {
        if (!apiKeys.podcastindex_key || !apiKeys.podcastindex_secret) return;
        config = { apiKey: apiKeys.podcastindex_key, apiSecret: apiKeys.podcastindex_secret };
      } else if (integration === "listennotes") {
        if (!apiKeys.listennotes) return;
        config = { apiKey: apiKeys.listennotes };
      } else {
        // Default single key (anthropic, openai)
        const key = apiKeys[integration];
        if (!key) return;
        config = { apiKey: key };
      }

      // First test the key
      const testRes = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration, ...config }),
      });
      const testResult = await testRes.json();

      if (testResult.success) {
        // Save the key to the backend
        const saveRes = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            integration,
            action: "save_key",
            config,
          }),
        });

        if (saveRes.ok) {
          setTestResults((prev) => ({
            ...prev,
            [integration]: { success: true, message: "API key saved and verified!" },
          }));
          // Clear the inputs after successful save
          if (integration === "spotify") {
            setApiKeys((prev) => ({ ...prev, spotify_id: "", spotify_secret: "" }));
          } else if (integration === "podcastindex") {
            setApiKeys((prev) => ({ ...prev, podcastindex_key: "", podcastindex_secret: "" }));
          } else {
            setApiKeys((prev) => ({ ...prev, [integration]: "" }));
          }
          // Refresh integration status
          queryClient.invalidateQueries({ queryKey: ["integrations"] });
        } else {
          setTestResults((prev) => ({
            ...prev,
            [integration]: { success: false, message: "Failed to save API key" },
          }));
        }
      } else {
        setTestResults((prev) => ({
          ...prev,
          [integration]: { success: false, message: testResult.message || "Invalid API key" },
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [integration]: { success: false, message: "Error saving API key" },
      }));
    }

    setTestingIntegration(null);
  };

  // Save Spotify credentials
  const saveSpotifyKeys = async () => {
    const clientId = apiKeys.spotify_client_id;
    const clientSecret = apiKeys.spotify_client_secret;
    if (!clientId || !clientSecret) return;

    setTestingIntegration("spotify");
    try {
      // Test first
      const testRes = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: "spotify", clientId, clientSecret }),
      });
      const testResult = await testRes.json();

      if (testResult.success) {
        const saveRes = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            integration: "spotify",
            action: "save_key",
            config: { clientId, clientSecret },
          }),
        });

        if (saveRes.ok) {
          setTestResults((prev) => ({ ...prev, spotify: { success: true, message: "Spotify connected!" } }));
          setApiKeys((prev) => ({ ...prev, spotify_client_id: "", spotify_client_secret: "" }));
          queryClient.invalidateQueries({ queryKey: ["integrations"] });
        }
      } else {
        setTestResults((prev) => ({ ...prev, spotify: { success: false, message: testResult.message } }));
      }
    } catch {
      setTestResults((prev) => ({ ...prev, spotify: { success: false, message: "Error saving" } }));
    }
    setTestingIntegration(null);
  };

  // Save PodcastIndex credentials
  const savePodcastIndexKeys = async () => {
    const apiKey = apiKeys.podcastindex_api_key;
    const apiSecret = apiKeys.podcastindex_api_secret;
    if (!apiKey || !apiSecret) return;

    setTestingIntegration("podcastindex");
    try {
      const testRes = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: "podcastindex", apiKey, apiSecret }),
      });
      const testResult = await testRes.json();

      if (testResult.success) {
        const saveRes = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            integration: "podcastindex",
            action: "save_key",
            config: { apiKey, apiSecret },
          }),
        });

        if (saveRes.ok) {
          setTestResults((prev) => ({ ...prev, podcastindex: { success: true, message: "PodcastIndex connected!" } }));
          setApiKeys((prev) => ({ ...prev, podcastindex_api_key: "", podcastindex_api_secret: "" }));
          queryClient.invalidateQueries({ queryKey: ["integrations"] });
        }
      } else {
        setTestResults((prev) => ({ ...prev, podcastindex: { success: false, message: testResult.message } }));
      }
    } catch {
      setTestResults((prev) => ({ ...prev, podcastindex: { success: false, message: "Error saving" } }));
    }
    setTestingIntegration(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF8354]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Services */}
      <div className="bg-white border border-[#c5c8d4] rounded-lg">
        <div className="px-6 py-4 border-b border-[#c5c8d4]">
          <h2 className="font-semibold text-[#2D3142]">AI Services</h2>
          <p className="text-sm text-[#5d637e]">
            Configure AI providers for podcast analysis and email generation
          </p>
        </div>
        <div className="p-6 space-y-4">
          {/* Anthropic Claude */}
          <IntegrationCard
            name="Anthropic (Claude)"
            description="AI-powered podcast analysis and email drafting"
            icon={
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                AI
              </div>
            }
            status={integrations?.anthropic}
            testResult={testResults.anthropic}
            testing={testingIntegration === "anthropic"}
            onTest={() => testConnection("anthropic")}
            apiKeyInput={
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder={integrations?.anthropic?.masked || "sk-ant-..."}
                  value={apiKeys.anthropic || ""}
                  onChange={(e) => setApiKeys((prev) => ({ ...prev, anthropic: e.target.value }))}
                  className="w-48 border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
                />
                <button
                  onClick={() => saveApiKey("anthropic")}
                  disabled={!apiKeys.anthropic}
                  className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            }
          />

          {/* OpenAI (Optional) */}
          <IntegrationCard
            name="OpenAI (Optional)"
            description="Alternative AI provider for analysis"
            icon={
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xs">
                GPT
              </div>
            }
            status={integrations?.openai}
            testResult={testResults.openai}
            testing={testingIntegration === "openai"}
            onTest={() => testConnection("openai")}
            apiKeyInput={
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder={integrations?.openai?.masked || "sk-..."}
                  value={apiKeys.openai || ""}
                  onChange={(e) => setApiKeys((prev) => ({ ...prev, openai: e.target.value }))}
                  className="w-48 border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
                />
                <button
                  onClick={() => saveApiKey("openai")}
                  disabled={!apiKeys.openai}
                  className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            }
          />

          {/* Add More AI Service */}
          <AddAIServiceForm onSave={(name, key) => {
            setApiKeys((prev) => ({ ...prev, [name.toLowerCase()]: key }));
            setTestResults((prev) => ({
              ...prev,
              [name.toLowerCase()]: { success: true, message: `${name} added successfully` },
            }));
          }} />
        </div>
      </div>

      {/* Email Services */}
      <div className="bg-white border border-[#c5c8d4] rounded-lg">
        <div className="px-6 py-4 border-b border-[#c5c8d4]">
          <h2 className="font-semibold text-[#2D3142]">Email Services</h2>
          <p className="text-sm text-[#5d637e]">
            Connect your email account to send outreach emails
          </p>
        </div>
        <div className="p-6 space-y-4">
          {/* Gmail */}
          <div className="flex items-center justify-between p-4 border border-[#c5c8d4] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#fce8e9] rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-[#9d2227]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-[#2D3142]">Gmail</h4>
                  {gmailEmail && (
                    <span className="flex items-center gap-1 text-xs text-[#EF8354] bg-[#d4f0e7] px-2 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#5d637e]">
                  {gmailEmail || "Send emails and track replies via Gmail"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {gmailEmail ? (
                <>
                  <button
                    onClick={() => testConnection("gmail")}
                    disabled={testingIntegration === "gmail"}
                    className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50"
                  >
                    {testingIntegration === "gmail" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send Test"
                    )}
                  </button>
                  <button
                    onClick={disconnectGmail}
                    className="px-3 py-2 border border-[#9d2227] text-[#9d2227] rounded-lg hover:bg-[#fce8e9]"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={connectGmail}
                  disabled={!integrations?.gmail?.configured}
                  className="px-4 py-2 bg-[#EF8354] text-white rounded-lg hover:bg-[#5d637e] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Link2 className="h-4 w-4" />
                  {integrations?.gmail?.configured ? "Connect" : "Not Configured"}
                </button>
              )}
            </div>
          </div>
          {!integrations?.gmail?.configured && (
            <div className="text-sm bg-[#f8f9fa] border border-[#ecedf1] p-4 rounded-lg space-y-2">
              <p className="text-[#b02013] flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                Gmail OAuth Setup Required
              </p>
              <ol className="list-decimal list-inside text-[#bb3f03] space-y-1 ml-6">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" className="underline hover:text-[#9d2227]">Google Cloud Console</a></li>
                <li>Create OAuth 2.0 credentials (Web application)</li>
                <li>Add your email to &quot;Test users&quot; in OAuth consent screen</li>
                <li>Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment</li>
              </ol>
            </div>
          )}
          {integrations?.gmail?.configured && !gmailEmail && (
            <GmailSetupGuide />
          )}
          {testResults.gmail && (
            <TestResultBadge result={testResults.gmail} />
          )}

          {/* Resend */}
          <div className="flex items-center justify-between p-4 border border-[#c5c8d4] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-[#2D3142]">Resend</h4>
                  {integrations?.resend?.configured && (
                    <span className="flex items-center gap-1 text-xs text-[#EF8354] bg-[#d4f0e7] px-2 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Configured
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#5d637e]">Modern email API - reliable delivery with analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder={integrations?.resend?.masked || "re_..."}
                value={apiKeys.resend || ""}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, resend: e.target.value }))}
                className="w-48 border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
              />
              <button
                onClick={() => saveApiKey("resend")}
                disabled={!apiKeys.resend}
                className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => testConnection("resend")}
                disabled={testingIntegration === "resend" || !integrations?.resend?.configured}
                className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50"
              >
                {testingIntegration === "resend" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
              </button>
            </div>
          </div>
          {!integrations?.resend?.configured && (
            <p className="text-sm text-[#5d637e] ml-4">
              Get your API key at{" "}
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener" className="underline hover:text-[#EF8354]">
                resend.com/api-keys
              </a>
            </p>
          )}
          {testResults.resend && <TestResultBadge result={testResults.resend} />}

          {/* ZeroBounce */}
          <div className="flex items-center justify-between p-4 border border-[#c5c8d4] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-[#2D3142]">ZeroBounce</h4>
                  {integrations?.zerobounce?.configured && (
                    <span className="flex items-center gap-1 text-xs text-[#EF8354] bg-[#d4f0e7] px-2 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Configured
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#5d637e]">Email verification to protect sender reputation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder={integrations?.zerobounce?.masked || "Enter API key"}
                value={apiKeys.zerobounce || ""}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, zerobounce: e.target.value }))}
                className="w-48 border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
              />
              <button
                onClick={() => saveApiKey("zerobounce")}
                disabled={!apiKeys.zerobounce}
                className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => testConnection("zerobounce")}
                disabled={testingIntegration === "zerobounce" || !integrations?.zerobounce?.configured}
                className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50"
              >
                {testingIntegration === "zerobounce" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
              </button>
            </div>
          </div>
          {!integrations?.zerobounce?.configured && (
            <p className="text-sm text-[#5d637e] ml-4">
              Get your API key at{" "}
              <a href="https://www.zerobounce.net/members/apikey/" target="_blank" rel="noopener" className="underline hover:text-[#EF8354]">
                zerobounce.net/members/apikey
              </a>
            </p>
          )}
          {testResults.zerobounce && <TestResultBadge result={testResults.zerobounce} />}
        </div>
      </div>

      {/* Podcast Discovery Platforms */}
      <div className="bg-white border border-[#c5c8d4] rounded-lg">
        <div className="px-6 py-4 border-b border-[#c5c8d4]">
          <h2 className="font-semibold text-[#2D3142]">Podcast Discovery Platforms</h2>
          <p className="text-sm text-[#5d637e]">
            Connect podcast directories to discover and research shows
          </p>
        </div>
        <div className="p-6 space-y-4">
          {/* Apple Podcasts */}
          <IntegrationCard
            name="Apple Podcasts"
            description="Search the iTunes podcast directory (no API key required)"
            icon={
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a7 7 0 11-7 7 7 7 0 017-7zm0 2.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z"/>
                </svg>
              </div>
            }
            status={integrations?.apple}
            testResult={testResults.apple}
            testing={testingIntegration === "apple"}
            onTest={() => testConnection("apple")}
            alwaysConnected
          />

          {/* Spotify */}
          <div className="p-4 border border-[#c5c8d4] rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1DB954] rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-[#2D3142]">Spotify</h4>
                  {integrations?.spotify?.configured && (
                    <span className="flex items-center gap-1 text-xs text-[#EF8354] bg-[#d4f0e7] px-2 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Configured
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#5d637e]">Access Spotify&apos;s podcast catalog with trending data</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Client ID"
                value={apiKeys.spotify_client_id || ""}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, spotify_client_id: e.target.value }))}
                className="border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
              />
              <input
                type="password"
                placeholder="Client Secret"
                value={apiKeys.spotify_client_secret || ""}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, spotify_client_secret: e.target.value }))}
                className="border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveSpotifyKeys()}
                disabled={!apiKeys.spotify_client_id || !apiKeys.spotify_client_secret}
                className="px-3 py-2 bg-[#EF8354] text-white rounded-lg hover:bg-[#5d637e] disabled:opacity-50 text-sm"
              >
                Save
              </button>
              <button
                onClick={() => testConnection("spotify")}
                disabled={testingIntegration === "spotify" || !integrations?.spotify?.configured}
                className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50 text-sm"
              >
                {testingIntegration === "spotify" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Connection"}
              </button>
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener" className="text-xs text-[#5d637e] underline hover:text-[#EF8354] ml-auto">
                Get credentials →
              </a>
            </div>
            {testResults.spotify && <TestResultBadge result={testResults.spotify} />}
          </div>

          {/* PodcastIndex */}
          <div className="p-4 border border-[#c5c8d4] rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F90] rounded-lg flex items-center justify-center text-white font-bold text-xs">
                PI
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-[#2D3142]">PodcastIndex</h4>
                  {integrations?.podcastindex?.configured && (
                    <span className="flex items-center gap-1 text-xs text-[#EF8354] bg-[#d4f0e7] px-2 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Configured
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#5d637e]">Open podcast database with contact emails and trending data</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="API Key"
                value={apiKeys.podcastindex_api_key || ""}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, podcastindex_api_key: e.target.value }))}
                className="border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
              />
              <input
                type="password"
                placeholder="API Secret"
                value={apiKeys.podcastindex_api_secret || ""}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, podcastindex_api_secret: e.target.value }))}
                className="border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => savePodcastIndexKeys()}
                disabled={!apiKeys.podcastindex_api_key || !apiKeys.podcastindex_api_secret}
                className="px-3 py-2 bg-[#EF8354] text-white rounded-lg hover:bg-[#5d637e] disabled:opacity-50 text-sm"
              >
                Save
              </button>
              <button
                onClick={() => testConnection("podcastindex")}
                disabled={testingIntegration === "podcastindex" || !integrations?.podcastindex?.configured}
                className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50 text-sm"
              >
                {testingIntegration === "podcastindex" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Connection"}
              </button>
              <a href="https://api.podcastindex.org/" target="_blank" rel="noopener" className="text-xs text-[#5d637e] underline hover:text-[#EF8354] ml-auto">
                Get free API keys →
              </a>
            </div>
            {testResults.podcastindex && <TestResultBadge result={testResults.podcastindex} />}
          </div>

          {/* ListenNotes */}
          <div className="p-4 border border-[#c5c8d4] rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#7C3AED] rounded-lg flex items-center justify-center text-white font-bold text-xs">
                LN
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-[#2D3142]">ListenNotes</h4>
                  {integrations?.listennotes?.configured && (
                    <span className="flex items-center gap-1 text-xs text-[#EF8354] bg-[#d4f0e7] px-2 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Configured
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#5d637e]">Comprehensive podcast search and metadata API</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="API Key"
                value={apiKeys.listennotes || ""}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, listennotes: e.target.value }))}
                className="flex-1 border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
              />
              <button
                onClick={() => saveApiKey("listennotes")}
                disabled={!apiKeys.listennotes}
                className="px-3 py-2 bg-[#EF8354] text-white rounded-lg hover:bg-[#5d637e] disabled:opacity-50 text-sm"
              >
                Save
              </button>
              <button
                onClick={() => testConnection("listennotes")}
                disabled={testingIntegration === "listennotes" || !integrations?.listennotes?.configured}
                className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50 text-sm"
              >
                {testingIntegration === "listennotes" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
              </button>
            </div>
            <a href="https://www.listennotes.com/api/" target="_blank" rel="noopener" className="text-xs text-[#5d637e] underline hover:text-[#EF8354]">
              Get API key →
            </a>
            {testResults.listennotes && <TestResultBadge result={testResults.listennotes} />}
          </div>
        </div>
      </div>

      {/* Environment Variables Reference */}
      <EnvironmentVariablesSection />
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  icon,
  status,
  testResult,
  testing,
  onTest,
  apiKeyInput,
  alwaysConnected,
  requiresEnvVar,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  status?: IntegrationStatus;
  testResult?: { success: boolean; message: string };
  testing: boolean;
  onTest: () => void;
  apiKeyInput?: React.ReactNode;
  alwaysConnected?: boolean;
  requiresEnvVar?: string;
}) {
  const isConnected = alwaysConnected || status?.connected;

  return (
    <div className="p-4 border border-[#c5c8d4] rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-[#2D3142]">{name}</h4>
              {isConnected && (
                <span className="flex items-center gap-1 text-xs text-[#EF8354] bg-[#d4f0e7] px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  {alwaysConnected ? "Available" : "Connected"}
                </span>
              )}
              {!isConnected && status?.configured && (
                <span className="flex items-center gap-1 text-xs text-[#d96a3f] bg-[#f8f9fa] px-2 py-0.5 rounded-full">
                  <AlertCircle className="h-3 w-3" />
                  Configured
                </span>
              )}
            </div>
            <p className="text-sm text-[#5d637e]">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {apiKeyInput || (
            <button
              onClick={onTest}
              disabled={testing || (!isConnected && !status?.configured)}
              className="px-3 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa] disabled:opacity-50 flex items-center gap-2"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing
                </>
              ) : (
                "Test Connection"
              )}
            </button>
          )}
        </div>
      </div>
      {requiresEnvVar && !status?.configured && (
        <p className="mt-3 text-sm text-[#d96a3f] bg-[#f8f9fa] p-2 rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Requires {requiresEnvVar} environment variable(s)
        </p>
      )}
      {testResult && <TestResultBadge result={testResult} />}
    </div>
  );
}

// Add AI Service Form
function AddAIServiceForm({ onSave }: { onSave: (name: string, apiKey: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");

  const handleSave = () => {
    if (serviceName && apiKey) {
      onSave(serviceName, apiKey);
      setServiceName("");
      setApiKey("");
      setApiEndpoint("");
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full py-3 border-2 border-dashed border-[#c5c8d4] rounded-lg text-[#5d637e] hover:border-[#EF8354] hover:text-[#EF8354] transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add More AI Service
      </button>
    );
  }

  return (
    <div className="p-4 border border-[#c5c8d4] rounded-lg bg-[#f8f9fa]/30">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-[#2D3142]">Add Custom AI Service</h4>
        <button
          onClick={() => setIsAdding(false)}
          className="p-1 text-[#5d637e] hover:text-[#2D3142] rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-[#5d637e]">Service Name *</label>
          <input
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="e.g., Groq, Mistral, Cohere, Perplexity"
            className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#5d637e]">API Key *</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API key"
            className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#5d637e]">API Endpoint (Optional)</label>
          <input
            type="url"
            value={apiEndpoint}
            onChange={(e) => setApiEndpoint(e.target.value)}
            placeholder="https://api.example.com/v1"
            className="mt-1 w-full border border-[#c5c8d4] rounded-lg px-3 py-2 text-sm text-[#2D3142] placeholder:text-[#5d637e]"
          />
          <p className="text-xs text-[#5d637e] mt-1">For self-hosted or custom API endpoints</p>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={!serviceName || !apiKey}
            className="px-4 py-2 bg-[#EF8354] text-white rounded-lg hover:bg-[#5d637e] disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Service
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="px-4 py-2 border border-[#c5c8d4] text-[#5d637e] rounded-lg hover:bg-[#f8f9fa]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TestResultBadge({ result }: { result: { success: boolean; message: string } }) {
  return (
    <div
      className={cn(
        "mt-3 p-2 rounded text-sm flex items-center gap-2",
        result.success ? "bg-[#d4f0e7] text-[#EF8354]" : "bg-[#fce8e9] text-[#9d2227]"
      )}
    >
      {result.success ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <X className="h-4 w-4" />
      )}
      {result.message}
    </div>
  );
}

// Gmail Setup Guide - handles window reference safely
function GmailSetupGuide() {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const redirectUri = origin ? `${origin}/api/auth/gmail/callback` : "YOUR_APP_URL/api/auth/gmail/callback";

  return (
    <div className="text-sm bg-[#d4f0e7] border border-[#c5c8d4] p-4 rounded-lg space-y-2">
      <p className="text-[#5d637e] flex items-center gap-2 font-medium">
        <AlertCircle className="h-4 w-4" />
        Before connecting, ensure these are configured in Google Cloud Console:
      </p>
      <ul className="list-disc list-inside text-[#5d637e] space-y-1 ml-6">
        <li>
          <strong>Authorized redirect URI:</strong>{" "}
          <code className="bg-[#c5c8d4] px-1 rounded">{redirectUri}</code>
        </li>
        <li>
          <strong>OAuth consent screen:</strong> Add your email to &quot;Test users&quot;
        </li>
        <li>
          <strong>Required scopes:</strong> gmail.send, gmail.readonly, gmail.modify
        </li>
      </ul>
      <p className="text-[#EF8354] text-xs mt-2">
        Error 400 &quot;invalid_request&quot; usually means the redirect URI does not match or your email is not a test user.
      </p>
    </div>
  );
}

// Environment Variables Section - handles window reference safely
function EnvironmentVariablesSection() {
  const [origin, setOrigin] = useState("https://your-railway-app.railway.app");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const redirectUri = `${origin}/api/auth/gmail/callback`;

  return (
    <div className="bg-white border border-[#c5c8d4] rounded-lg">
      <div className="px-6 py-4 border-b border-[#c5c8d4]">
        <h2 className="font-semibold text-[#2D3142]">Environment Variables</h2>
        <p className="text-sm text-[#5d637e]">Required for deployment - add to your .env file</p>
      </div>
      <div className="p-4">
        <pre className="bg-[#2D3142] text-[#ecedf1] rounded-lg p-4 text-sm overflow-x-auto">
{`# Database
DATABASE_URL="postgresql://..."

# AI Services
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."  # Optional

# Gmail OAuth
# IMPORTANT: GOOGLE_REDIRECT_URI must match EXACTLY what's configured in Google Cloud Console
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="${redirectUri}"

# Spotify (for podcast discovery)
SPOTIFY_CLIENT_ID="..."
SPOTIFY_CLIENT_SECRET="..."

# PodcastIndex (for trending & contact info)
PODCAST_INDEX_API_KEY="..."
PODCAST_INDEX_API_SECRET="..."

# ListenNotes (optional)
LISTEN_NOTES_API_KEY="..."

# App Config
NEXT_PUBLIC_APP_URL="${origin}"`}
        </pre>
      </div>

      {/* Gmail OAuth Setup Guide */}
      <div className="px-6 pb-6">
        <div className="bg-[#f8f9fa] border border-[#ecedf1] rounded-lg p-4">
          <h3 className="font-medium text-[#9d2227] mb-2">Gmail OAuth Troubleshooting</h3>
          <p className="text-sm text-[#b02013] mb-2">
            If you see <strong>&quot;Error 400: invalid_request&quot;</strong> or <strong>&quot;Access blocked&quot;</strong>:
          </p>
          <ol className="list-decimal list-inside text-sm text-[#bb3f03] space-y-1.5">
            <li>
              <strong>Check redirect URI:</strong> In Google Cloud Console → Credentials → OAuth 2.0 Client IDs,
              add this exact URI: <code className="bg-[#ecedf1] px-1 rounded">{redirectUri}</code>
            </li>
            <li>
              <strong>Add test user:</strong> OAuth consent screen → Test users → Add your email address
            </li>
            <li>
              <strong>Enable APIs:</strong> Make sure Gmail API is enabled in your Google Cloud project
            </li>
            <li>
              <strong>Update env vars:</strong> Set GOOGLE_REDIRECT_URI to your deployed URL (not localhost)
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
