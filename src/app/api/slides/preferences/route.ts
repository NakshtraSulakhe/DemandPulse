import { NextRequest, NextResponse } from "next/server";
import {
  getUserPreferences,
  saveUserPreferences,
  getDisplayPreferences,
  saveDisplayPreferences,
} from "@/lib/db/preferences-repository";
import { verifyAdminSession } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PreferencesPayloadSchema = z.object({
  theme: z.enum(["dark", "light"]).optional(),
  headerDrawerOpen: z.boolean().optional(),
  tvModeEnabled: z.boolean().optional(),
  displayScaling: z.string().optional(),
  heatmapIntervalMinutes: z.number().int().min(1).max(120).optional(),
  slideIntervalSeconds: z.number().int().min(5).max(600).optional(),
  displayIdentifier: z.string().optional(),
});

/**
 * GET /api/slides/preferences
 * Retrieve user/device display preferences directly from MySQL
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const displayId = searchParams.get("displayId") || "default";
  const userId = searchParams.get("userId") ? parseInt(searchParams.get("userId")!, 10) : 1;

  try {
    const [userPrefs, displayPrefs] = await Promise.all([
      getUserPreferences(userId),
      getDisplayPreferences(displayId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        theme: userPrefs.theme,
        headerDrawerOpen: userPrefs.headerDrawerOpen,
        tvModeEnabled: displayPrefs.tvModeEnabled ?? userPrefs.tvModeEnabled,
        displayScaling: displayPrefs.displayScaling ?? userPrefs.displayScaling,
        heatmapIntervalMinutes: displayPrefs.heatmapIntervalMinutes ?? userPrefs.heatmapIntervalMinutes,
        slideIntervalSeconds: displayPrefs.slideIntervalSeconds,
        displayIdentifier: displayPrefs.displayIdentifier,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load preferences from MySQL" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/slides/preferences
 * Persist preferences to MySQL (no localStorage)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = PreferencesPayloadSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "Invalid preferences payload", details: validated.error.format() },
        { status: 400 }
      );
    }

    const data = validated.data;
    const auth = await verifyAdminSession(req);
    const actorId = BigInt(auth.user?.id === "admin-api" ? 1 : 1);

    // Save user preferences
    const updatedUser = await saveUserPreferences(1, {
      theme: data.theme,
      headerDrawerOpen: data.headerDrawerOpen,
      tvModeEnabled: data.tvModeEnabled,
      displayScaling: data.displayScaling,
      heatmapIntervalMinutes: data.heatmapIntervalMinutes,
    });

    // If displayIdentifier is provided or scaling/interval changed, save display prefs
    let updatedDisplay = null;
    if (data.displayIdentifier || data.slideIntervalSeconds || data.heatmapIntervalMinutes || data.tvModeEnabled !== undefined) {
      updatedDisplay = await saveDisplayPreferences(
        data.displayIdentifier || "default",
        {
          tvModeEnabled: data.tvModeEnabled,
          displayScaling: data.displayScaling,
          heatmapIntervalMinutes: data.heatmapIntervalMinutes,
          slideIntervalSeconds: data.slideIntervalSeconds,
        },
        actorId
      );
    }

    return NextResponse.json({
      success: true,
      message: "Preferences persisted successfully to MySQL database (zero localStorage)",
      data: {
        theme: updatedUser.theme,
        headerDrawerOpen: updatedUser.headerDrawerOpen,
        tvModeEnabled: updatedDisplay?.tvModeEnabled ?? updatedUser.tvModeEnabled,
        displayScaling: updatedDisplay?.displayScaling ?? updatedUser.displayScaling,
        heatmapIntervalMinutes: updatedDisplay?.heatmapIntervalMinutes ?? updatedUser.heatmapIntervalMinutes,
        slideIntervalSeconds: updatedDisplay?.slideIntervalSeconds ?? 30,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save preferences to database" },
      { status: 500 }
    );
  }
}
