import { Polar } from "@convex-dev/polar";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const polarProductIdPremium = process.env.POLAR_PRODUCT_ID_PREMIUM ?? "";
const organizationToken = process.env.POLAR_ORGANIZATION_TOKEN ?? "";
const webhookSecret = process.env.POLAR_WEBHOOK_SECRET ?? "";
const polarServer =
  (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox";

export const polar: Polar<DataModel, { premium: string }> = new Polar(
  components.polar,
  {
    getUserInfo: async (ctx) => {
      return await ctx.runQuery(internal.profiles.getMyInternalProfile);
    },
    products: {
      premium: polarProductIdPremium,
    },
    organizationToken,
    webhookSecret,
    server: polarServer,
  },
);

export const {
  generateCheckoutLink,
  generateCustomerPortalUrl,
  getConfiguredProducts,
  listAllProducts,
  cancelCurrentSubscription,
  changeCurrentSubscription,
  listAllSubscriptions,
} = polar.api();
