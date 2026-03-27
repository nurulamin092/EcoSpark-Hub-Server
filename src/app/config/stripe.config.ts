import Stripe from "stripe";
import { envVars } from "./env";
if (!envVars.STRIPE?.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
}
export const stripe = new Stripe(envVars.STRIPE.STRIPE_SECRET_KEY, {
  timeout: 30000,
  maxNetworkRetries: 2,
});
console.log(`Stripe library version: ${Stripe.API_VERSION}`);