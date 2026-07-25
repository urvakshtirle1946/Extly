import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "promptex_better_auth_secret_key_2026",
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "https://promptex.tech",
  plugins: [
    dash()
  ]
});
