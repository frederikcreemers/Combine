import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Check if user has an email (non-anonymous)
    if (user.email) {
      return { anonymous: false, email: user.email };
    }

    return { anonymous: true };
  },
});
