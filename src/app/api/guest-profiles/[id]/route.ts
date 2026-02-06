import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/guest-profiles/[id] - Get a specific profile
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const profile = await db.guestProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching guest profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch guest profile" },
      { status: 500 }
    );
  }
}

// PUT /api/guest-profiles/[id] - Update a profile
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      fullName,
      title,
      company,
      bio,
      topics,
      credentials,
      uniqueAngle,
      websiteUrl,
      linkedinUrl,
      twitterUrl,
    } = body;

    const profile = await db.guestProfile.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        fullName: fullName !== undefined ? fullName : undefined,
        title: title !== undefined ? (title || null) : undefined,
        company: company !== undefined ? (company || null) : undefined,
        bio: bio !== undefined ? (bio || null) : undefined,
        topics: topics !== undefined 
          ? (Array.isArray(topics) ? topics : topics ? topics.split(",").map((t: string) => t.trim()) : [])
          : undefined,
        credentials: credentials !== undefined ? (credentials || null) : undefined,
        uniqueAngle: uniqueAngle !== undefined ? (uniqueAngle || null) : undefined,
        websiteUrl: websiteUrl !== undefined ? (websiteUrl || null) : undefined,
        linkedinUrl: linkedinUrl !== undefined ? (linkedinUrl || null) : undefined,
        twitterUrl: twitterUrl !== undefined ? (twitterUrl || null) : undefined,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error updating guest profile:", error);
    return NextResponse.json(
      { error: "Failed to update guest profile" },
      { status: 500 }
    );
  }
}

// DELETE /api/guest-profiles/[id] - Delete a profile
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if profile exists and is active
    const existing = await db.guestProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Don't allow deleting the active profile
    if (existing.isActive) {
      return NextResponse.json(
        { error: "Cannot delete the active profile. Please activate another profile first." },
        { status: 400 }
      );
    }

    await db.guestProfile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting guest profile:", error);
    return NextResponse.json(
      { error: "Failed to delete guest profile" },
      { status: 500 }
    );
  }
}

