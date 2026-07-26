import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";
import { authDatabase } from "@/lib/auth-db";

const secret =
  process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length >= 32
    ? process.env.BETTER_AUTH_SECRET
    : "promptex_better_auth_secret_key_2026_default_secret_32chars";


export const auth = betterAuth({
  secret,
  database: {
    db: authDatabase,
    type: "postgres",
  },
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
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    })
  ],
  emailAndPassword: {
    enabled: true,
  },
});
