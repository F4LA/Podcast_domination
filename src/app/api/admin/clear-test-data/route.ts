import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Clear old test data from the Touch table
 * This resets the analytics to start fresh
 */
export async function POST(request: NextRequest) {
  try {
    // Delete all Touch records (sent email tracking)
    const deletedTouches = await prisma.touch.deleteMany({});
    
    console.log(`[Admin] Cleared ${deletedTouches.count} Touch records`);

    return NextResponse.json({
      success: true,
      message: "Test data cleared successfully",
      deleted: {
        touches: deletedTouches.count,
      },
    });
  } catch (error) {
    console.error("[Admin] Error clearing test data:", error);
    return NextResponse.json(
      { error: "Failed to clear test data" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Just count what would be deleted
    const touchCount = await prisma.touch.count();
    
    return NextResponse.json({
      touches: touchCount,
      message: `${touchCount} Touch records would be deleted`,
    });
  } catch (error) {
    console.error("[Admin] Error counting data:", error);
    return NextResponse.json(
      { error: "Failed to count data" },
      { status: 500 }
    );
  }
}





