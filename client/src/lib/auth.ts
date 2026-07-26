import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "promptex_better_auth_secret_key_2026",
  // Keep this host identical to the URL registered with Better Auth Dash.
  // Dash does not follow redirects when checking the integration.
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.promptex.tech",
  trustedOrigins: [
    "https://promptex.tech",
    "https://www.promptex.tech",
    "http://localhost:3000",
    "http://localhost:4000"
  ],
  plugins: [
    dash()
  ]
});
