import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./betterAuth/auth";
import { httpAction } from "./_generated/server";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

// ─── Polar Webhooks ───────────────────────────────────────────────────────────
// Polar sends: subscription.created, subscription.updated, subscription.revoked
// The userId embedded in Polar's checkout metadata links the subscription to
// the Convex profile (passed when creating the checkout session in the client).

http.route({
  path: "/webhooks/polar",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("webhook-id");
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return new Response("Missing webhook signature", { status: 401 });
    }

    const body = await request.text();
    let event: { type: string; data: Record<string, unknown> };

    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { type, data } = event;

    if (type === "subscription.created") {
      const userId = (data.metadata as Record<string, string>)?.userId;
      const polarCustomerId = data.customer_id as string;
      const polarSubscriptionId = data.id as string;

      if (userId) {
        await ctx.runMutation(internal.subscriptions.linkPolarCustomer, {
          userId,
          polarCustomerId,
          polarSubscriptionId,
        });
      }
    } else if (type === "subscription.updated") {
      // No status change, sync is a no-op for now
    } else if (type === "subscription.revoked") {
      const polarSubscriptionId = data.id as string;
      await ctx.runMutation(internal.subscriptions.revokePremium, {
        polarSubscriptionId,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
