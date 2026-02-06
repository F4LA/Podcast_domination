import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/guest-profiles/[id]/activate - Set this profile as the active one
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if profile exists
    const profile = await db.guestProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Deactivate all profiles first
    await db.guestProfile.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate this profile
    const updatedProfile = await db.guestProfile.update({
      where: { id },
      data: { isActive: true },
    });

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("Error activating guest profile:", error);
    return NextResponse.json(
      { error: "Failed to activate guest profile" },
      { status: 500 }
    );
  }
}

