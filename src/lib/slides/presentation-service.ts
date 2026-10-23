import { prisma, serializeDbData } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";

export const UpdatePresentationSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  defaultSlideSeconds: z.number().int().min(5).max(300).optional(),
  refreshIntervalSeconds: z.number().int().min(10).max(600).optional(),
  isActive: z.boolean().optional(),
  themeConfig: z.record(z.any()).optional(),
});

export const PlaylistItemUpdateSchema = z.object({
  id: z.union([z.string(), z.number(), z.bigint()]),
  displayOrder: z.number().int().min(1),
  durationSeconds: z.number().int().min(5).max(300).nullable().optional(),
  isEnabled: z.boolean().optional(),
});

/**
 * Get active presentation configuration with ordered playlist items
 */
export async function getActivePresentation(slug: string = "executive-presentation") {
  const presentation = await prisma.slidePresentation.findUnique({
    where: { slug },
    include: {
      playlistItems: {
        include: { slideDefinition: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!presentation) return null;
  return serializeDbData(presentation);
}

/**
 * Update presentation profile
 */
export async function updatePresentation(
  id: bigint | number | string,
  input: z.infer<typeof UpdatePresentationSchema>,
  actorId: bigint = BigInt(1)
) {
  const numericId = BigInt(id);
  const validated = UpdatePresentationSchema.parse(input);

  const updated = await prisma.slidePresentation.update({
    where: { id: numericId },
    data: validated,
  });

  await prisma.slideAuditLog.create({
    data: {
      actorId,
      action: "PRESENTATION_PROFILE_UPDATED",
      resourceType: "slide_presentation",
      resourceId: numericId.toString(),
      detailsJson: validated,
    },
  });

  return serializeDbData(updated);
}

/**
 * Update slide playlist ordering and display durations
 */
export async function updatePlaylist(
  items: z.infer<typeof PlaylistItemUpdateSchema>[],
  actorId: bigint = BigInt(1)
) {
  return await prisma.$transaction(async (tx) => {
    const results = [];
    for (const item of items) {
      const updated = await tx.slidePlaylistItem.update({
        where: { id: BigInt(item.id) },
        data: {
          displayOrder: item.displayOrder,
          durationSeconds: item.durationSeconds,
          isEnabled: item.isEnabled,
        },
      });
      results.push(updated);
    }

    await tx.slideAuditLog.create({
      data: {
        actorId,
        action: "PLAYLIST_REORDERED",
        resourceType: "slide_playlist",
        resourceId: "reorder",
        detailsJson: { count: items.length },
      },
    });

    return serializeDbData(results);
  });
}

/**
 * Get slide definitions
 */
export async function getSlideDefinitions() {
  const defs = await prisma.slideDefinition.findMany({
    orderBy: { id: "asc" },
  });
  return serializeDbData(defs);
}

/**
 * Get or update system settings
 */
export async function getSystemSettings(key?: string) {
  if (key) {
    const setting = await prisma.slideSystemSetting.findUnique({
      where: { settingKey: key },
    });
    return setting ? serializeDbData(setting.settingValue) : null;
  }

  const all = await prisma.slideSystemSetting.findMany();
  const map: Record<string, any> = {};
  for (const s of all) {
    map[s.settingKey] = s.settingValue;
  }
  return serializeDbData(map);
}

export async function setSystemSetting(key: string, value: any, actorId: bigint = BigInt(1)) {
  const updated = await prisma.slideSystemSetting.upsert({
    where: { settingKey: key },
    update: {
      settingValue: value,
      updatedBy: actorId,
    },
    create: {
      settingKey: key,
      settingValue: value,
      updatedBy: actorId,
    },
  });

  return serializeDbData(updated);
}

/**
 * Record display session heartbeat without saving raw token
 */
export async function recordDisplaySessionHeartbeat(
  presentationId: bigint | number | string,
  displayName: string,
  sessionToken: string
) {
  const pId = BigInt(presentationId);
  const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");

  const existing = await prisma.slideDisplaySession.findFirst({
    where: {
      presentationId: pId,
      sessionTokenHash: tokenHash,
      endedAt: null,
    },
  });

  if (existing) {
    const updated = await prisma.slideDisplaySession.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date() },
    });
    return serializeDbData(updated);
  }

  const created = await prisma.slideDisplaySession.create({
    data: {
      presentationId: pId,
      displayName,
      sessionTokenHash: tokenHash,
      startedAt: new Date(),
      lastSeenAt: new Date(),
    },
  });

  return serializeDbData(created);
}
