import { createAuthClient } from "better-auth/react";
import { dashClient, sentinelClient } from "@better-auth/infra/client";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.promptex.tech").replace(/\/$/, "");

export const authClient = createAuthClient({
  baseURL: `${appUrl}/api/auth`,
  plugins: [
    dashClient(),
    sentinelClient()
  ]
});
