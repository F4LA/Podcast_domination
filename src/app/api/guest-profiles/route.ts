import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/guest-profiles - List all guest profiles
export async function GET() {
  try {
    const profiles = await db.guestProfile.findMany({
      orderBy: [
        { isActive: "desc" }, // Active profile first
        { updatedAt: "desc" },
      ],
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Error fetching guest profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch guest profiles" },
      { status: 500 }
    );
  }
}

// POST /api/guest-profiles - Create a new guest profile
export async function POST(request: NextRequest) {
  try {
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
      setAsActive,
    } = body;

    if (!name || !fullName) {
      return NextResponse.json(
        { error: "Profile name and full name are required" },
        { status: 400 }
      );
    }

    // If setting as active, deactivate all others first
    if (setAsActive) {
      await db.guestProfile.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const profile = await db.guestProfile.create({
      data: {
        name,
        fullName,
        title: title || null,
        company: company || null,
        bio: bio || null,
        topics: Array.isArray(topics) ? topics : topics ? topics.split(",").map((t: string) => t.trim()) : [],
        credentials: credentials || null,
        uniqueAngle: uniqueAngle || null,
        websiteUrl: websiteUrl || null,
        linkedinUrl: linkedinUrl || null,
        twitterUrl: twitterUrl || null,
        isActive: setAsActive || false,
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("Error creating guest profile:", error);
    return NextResponse.json(
      { error: "Failed to create guest profile" },
      { status: 500 }
    );
  }
}

