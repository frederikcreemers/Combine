import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import Resend from "@auth/core/providers/resend";

import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Anonymous, Resend],
});
