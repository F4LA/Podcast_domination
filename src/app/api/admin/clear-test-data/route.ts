import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncCampaigns } from "@/lib/campaigns-storage";

/**
 * Clear all test/demo data
 * This resets the app to a clean state
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clearCampaigns = searchParams.get("campaigns") !== "false";
    const clearTouches = searchParams.get("touches") !== "false";

    let deletedTouches = 0;
    let deletedCampaigns = false;

    // Delete all Touch records (sent email tracking)
    if (clearTouches) {
      const result = await db.touch.deleteMany({});
      deletedTouches = result.count;
      console.log(`[Admin] Cleared ${deletedTouches} Touch records`);
    }

    // Clear campaigns from KeyValueStore
    if (clearCampaigns) {
      await syncCampaigns([]);
      deletedCampaigns = true;
      console.log(`[Admin] Cleared all campaigns`);
    }

    return NextResponse.json({
      success: true,
      message: "Data cleared successfully",
      deleted: {
        touches: deletedTouches,
        campaigns: deletedCampaigns,
      },
    });
  } catch (error) {
    console.error("[Admin] Error clearing data:", error);
    return NextResponse.json(
      { error: "Failed to clear data" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Just count what would be deleted
    const touchCount = await db.touch.count();
    
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





