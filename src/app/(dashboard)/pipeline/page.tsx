"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Send,
  Clock,
  CheckCircle,
  ChevronDown,
  Filter,
  MoreHorizontal,
  Sparkles,
  X,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PipelinePage() {
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["podcasts", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      // Show suppressed podcasts when filtering by SKIPPED (since skipped = suppressed)
      // Otherwise hide suppressed podcasts
      if (statusFilter !== "SKIPPED") {
        params.set("suppressed", "false");
      }
      const res = await fetch(`/api/podcasts?${params}`);
      return res.json();
    },
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#c5c8d4] px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3142]">Pipeline</h1>
          <p className="text-sm text-[#5d637e]">
            {data?.total || 0} podcasts
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <FilterDropdown value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EF8354]" />
          </div>
        ) : (
          <PipelineTable podcasts={data?.podcasts || []} />
        )}
      </div>
    </div>
  );
}

function PipelineTable({ podcasts }: { podcasts: any[] }) {
  if (podcasts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#5d637e]">No podcasts in pipeline</p>
        <p className="text-sm text-[#EF8354] mt-1">
          Add podcasts from the Discovery tab
        </p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-[#ecedf1] sticky top-0">
        <tr>
          <th className="text-left px-4 py-3 text-sm font-medium text-[#2D3142]">
            Podcast
          </th>
          <th className="text-left px-4 py-3 text-sm font-medium text-[#2D3142]">
            Status
          </th>
          <th className="text-left px-4 py-3 text-sm font-medium text-[#2D3142]">
            Contact
          </th>
          <th className="w-12"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#c5c8d4]">
        {podcasts.map((podcast) => (
          <PodcastRow key={podcast.id} podcast={podcast} />
        ))}
      </tbody>
    </table>
  );
}

function PodcastRow({ podcast }: { podcast: any }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleRowClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest(".action-menu")
    ) {
      return;
    }
    router.push(`/podcast/${podcast.id}`);
  };

  const handleMenuOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 160,
      });
    }
    setMenuOpen(!menuOpen);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/podcasts/${podcast.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podcasts"] });
    },
  });

  return (
    <tr
      className="hover:bg-[#ecedf1] cursor-pointer"
      onClick={handleRowClick}
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-[#2D3142]">{podcast.showName}</p>
          <p className="text-sm text-[#5d637e]">
            {podcast.hostName || "Unknown host"}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={podcast.status} />
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-[#5d637e] truncate max-w-[200px]">
          {podcast.primaryEmail || "No email"}
        </p>
      </td>
      <td className="px-4 py-3">
        <button
          ref={buttonRef}
          onClick={handleMenuOpen}
          className="p-1 hover:bg-[#ecedf1] rounded"
        >
          <MoreHorizontal className="h-4 w-4 text-[#5d637e]" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div
              className="fixed w-40 bg-white border border-[#c5c8d4] rounded-lg shadow-lg z-50 py-1"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <a
                href={podcast.primaryPlatformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 text-sm text-[#2D3142] hover:bg-[#ecedf1]"
                onClick={() => setMenuOpen(false)}
              >
                View Podcast
              </a>
              <hr className="my-1 border-[#c5c8d4]" />
              <button
                onClick={() => {
                  if (confirm("Remove this podcast from your pipeline?")) {
                    deleteMutation.mutate();
                  }
                  setMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-[#9d2227] hover:bg-[#ecedf1]"
              >
                Remove
              </button>
            </div>
          </>
        )}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: any }> = {
    NOT_CONTACTED: {
      label: "New",
      color: "bg-[#ecedf1] text-[#2D3142]",
      icon: Sparkles,
    },
    READY: {
      label: "Ready",
      color: "bg-[#c5c8d4] text-[#2D3142]",
      icon: CheckCircle,
    },
    READY_TO_DRAFT: {
      label: "Ready",
      color: "bg-[#c5c8d4] text-[#2D3142]",
      icon: CheckCircle,
    },
    DRAFTED: {
      label: "Ready",
      color: "bg-[#c5c8d4] text-[#2D3142]",
      icon: CheckCircle,
    },
    QA_APPROVED: {
      label: "Ready",
      color: "bg-[#c5c8d4] text-[#2D3142]",
      icon: CheckCircle,
    },
    SKIPPED: {
      label: "Skipped",
      color: "bg-[#b02013] text-white",
      icon: X,
    },
    SENT: {
      label: "Sent",
      color: "bg-[#EF8354] text-white",
      icon: Send,
    },
    FOLLOW_UP_DUE: {
      label: "Follow-up Due",
      color: "bg-[#ed9b05] text-[#2D3142]",
      icon: Clock,
    },
    REPLIED: {
      label: "Replied",
      color: "bg-[#c5c8d4] text-[#2D3142]",
      icon: MessageSquare,
    },
    CLOSED: {
      label: "Closed",
      color: "bg-[#5d637e] text-white",
      icon: CheckCircle,
    },
  };

  const { label, color, icon: Icon } = config[status] || config.NOT_CONTACTED;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        color
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function FilterDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const options = [
    { value: "", label: "All" },
    { value: "NOT_CONTACTED", label: "New" },
    { value: "READY", label: "Ready to Send" },
    { value: "SENT", label: "Sent" },
    { value: "REPLIED", label: "Replied" },
    { value: "SKIPPED", label: "Skipped" },
  ];

  const selectedLabel = options.find((o) => o.value === value)?.label || "All";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 border border-[#c5c8d4] rounded-lg hover:bg-[#ecedf1] text-[#2D3142] transition-all duration-200 hover:shadow-md"
      >
        <Filter className="h-4 w-4" />
        <span className="text-sm">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#c5c8d4] rounded-lg shadow-lg py-1 z-20">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full text-left px-4 py-2 text-sm hover:bg-[#ecedf1] transition-colors",
                  value === option.value
                    ? "text-[#EF8354] font-medium"
                    : "text-[#2D3142]"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

