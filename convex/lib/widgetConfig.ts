import { v } from "convex/values";
import type { QueryCtx } from "../_generated/server";

/**
 * Phase 4 shared validators + defaults for the per-workspace widget config.
 *
 * The config is stored in the `widgetConfigs` table (one row per orgId) but a
 * workspace may not have a row yet — in that case the public/authed read paths
 * fall back to `DEFAULT_WIDGET_CONFIG`. Both the authed customizer
 * (widgetConfig.ts) and the public widget read path (widget.ts) reuse these.
 */

export const launcherPositionValidator = v.union(
  v.literal("bottom-right"),
  v.literal("bottom-left"),
);

export const faqEntryValidator = v.object({
  question: v.string(),
  answer: v.string(),
});

// The resolved config shape returned to clients (no orgId / system fields).
export const widgetConfigValidator = v.object({
  primaryColor: v.string(),
  radius: v.number(),
  marginX: v.number(),
  marginY: v.number(),
  title: v.string(),
  logoUrl: v.optional(v.string()),
  launcherPosition: launcherPositionValidator,
  soundEnabled: v.boolean(),
  proactiveEnabled: v.boolean(),
  proactiveDelaySeconds: v.number(),
  proactiveMessage: v.string(),
  leadCaptureEnabled: v.boolean(),
  leadRequireName: v.boolean(),
  leadRequireEmail: v.boolean(),
  leadRequirePhone: v.boolean(),
  faq: v.array(faqEntryValidator),
});

export type WidgetConfig = {
  primaryColor: string;
  radius: number;
  marginX: number;
  marginY: number;
  title: string;
  logoUrl?: string;
  launcherPosition: "bottom-right" | "bottom-left";
  soundEnabled: boolean;
  proactiveEnabled: boolean;
  proactiveDelaySeconds: number;
  proactiveMessage: string;
  leadCaptureEnabled: boolean;
  leadRequireName: boolean;
  leadRequireEmail: boolean;
  leadRequirePhone: boolean;
  faq: { question: string; answer: string }[];
};

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  primaryColor: "#4f46e5",
  radius: 16,
  marginX: 20,
  marginY: 20,
  title: "Support",
  logoUrl: undefined,
  launcherPosition: "bottom-right",
  soundEnabled: true,
  proactiveEnabled: false,
  proactiveDelaySeconds: 8,
  proactiveMessage: "👋 Have a question? We're here to help.",
  leadCaptureEnabled: false,
  leadRequireName: true,
  leadRequireEmail: true,
  leadRequirePhone: false,
  faq: [],
};

/**
 * Strip a stored `widgetConfigs` row down to the client-facing config shape,
 * filling any conceptually-missing pieces from the defaults.
 */
export function toWidgetConfig(row: {
  primaryColor: string;
  radius: number;
  marginX: number;
  marginY: number;
  title: string;
  logoUrl?: string;
  launcherPosition: "bottom-right" | "bottom-left";
  soundEnabled: boolean;
  proactiveEnabled: boolean;
  proactiveDelaySeconds: number;
  proactiveMessage: string;
  leadCaptureEnabled: boolean;
  leadRequireName: boolean;
  leadRequireEmail: boolean;
  leadRequirePhone: boolean;
  faq: { question: string; answer: string }[];
}): WidgetConfig {
  return {
    primaryColor: row.primaryColor,
    radius: row.radius,
    marginX: row.marginX,
    marginY: row.marginY,
    title: row.title,
    logoUrl: row.logoUrl,
    launcherPosition: row.launcherPosition,
    soundEnabled: row.soundEnabled,
    proactiveEnabled: row.proactiveEnabled,
    proactiveDelaySeconds: row.proactiveDelaySeconds,
    proactiveMessage: row.proactiveMessage,
    leadCaptureEnabled: row.leadCaptureEnabled,
    leadRequireName: row.leadRequireName,
    leadRequireEmail: row.leadRequireEmail,
    leadRequirePhone: row.leadRequirePhone,
    faq: row.faq,
  };
}

/**
 * Resolve the effective widget config for an org: the stored row mapped to the
 * client shape, or the defaults when no row exists yet.
 */
export async function resolveWidgetConfig(
  ctx: QueryCtx,
  orgId: string,
): Promise<WidgetConfig> {
  const row = await ctx.db
    .query("widgetConfigs")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .unique();
  return row === null ? DEFAULT_WIDGET_CONFIG : toWidgetConfig(row);
}
