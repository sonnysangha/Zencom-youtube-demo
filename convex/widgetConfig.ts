import { v } from "convex/values";
import { adminMutation, adminQuery, orgQuery } from "./lib/customFunctions";
import {
  DEFAULT_WIDGET_CONFIG,
  faqEntryValidator,
  launcherPositionValidator,
  resolveWidgetConfig,
  widgetConfigValidator,
} from "./lib/widgetConfig";

/**
 * Phase 4 — AUTHED widget customizer API.
 *
 * Reads are available to any org member (so the dashboard preview works), but
 * writes are admin-gated via `adminMutation`. The PUBLIC widget read path lives
 * in convex/widget.ts (`getWidgetConfig`, resolved by publicKey).
 */

/** Current effective widget config for the caller's org (defaults if unset). */
export const get = orgQuery({
  args: {},
  returns: widgetConfigValidator,
  handler: async (ctx) => {
    return await resolveWidgetConfig(ctx, ctx.orgId);
  },
});

/** Admin-only read variant used by the customizer page server gate, if needed. */
export const getForAdmin = adminQuery({
  args: {},
  returns: widgetConfigValidator,
  handler: async (ctx) => {
    return await resolveWidgetConfig(ctx, ctx.orgId);
  },
});

/**
 * Upsert the widget config for the caller's org. Admin-gated. Accepts the full
 * config shape; unspecified pieces fall back to the current row or defaults.
 */
export const update = adminMutation({
  args: {
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("widgetConfigs")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .unique();

    const row = {
      orgId: ctx.orgId,
      primaryColor: args.primaryColor,
      radius: args.radius,
      marginX: args.marginX,
      marginY: args.marginY,
      title: args.title,
      logoUrl: args.logoUrl?.trim() || undefined,
      launcherPosition: args.launcherPosition,
      soundEnabled: args.soundEnabled,
      proactiveEnabled: args.proactiveEnabled,
      proactiveDelaySeconds: args.proactiveDelaySeconds,
      proactiveMessage: args.proactiveMessage,
      leadCaptureEnabled: args.leadCaptureEnabled,
      leadRequireName: args.leadRequireName,
      leadRequireEmail: args.leadRequireEmail,
      leadRequirePhone: args.leadRequirePhone,
      faq: args.faq,
    };

    if (existing === null) {
      await ctx.db.insert("widgetConfigs", row);
    } else {
      await ctx.db.replace(existing._id, row);
    }
    return null;
  },
});

/** Reset the org's widget config back to defaults. Admin-gated. */
export const reset = adminMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("widgetConfigs")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .unique();
    if (existing !== null) {
      await ctx.db.replace(existing._id, {
        orgId: ctx.orgId,
        ...DEFAULT_WIDGET_CONFIG,
      });
    }
    return null;
  },
});
