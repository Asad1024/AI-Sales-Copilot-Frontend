export type SalesCopilotPlanKind = "setup" | "subscription" | "addon" | "custom";

export type SalesCopilotPricingPlan = {
  id: string;
  kind: SalesCopilotPlanKind;
  name: string;
  headline: string;
  priceDisplay: string;
  priceSub?: string;
  badge?: string;
  featured?: boolean;
  leadQuota?: number;
  /** Overrides default credits line under the price for subscription tiers. */
  quotaHighlight?: string;
  sections: { heading: string; bullets: string[] }[];
  footnote?: string;
};

/** Line under price: credits + enrich mapping (landing + portal). */
export function subscriptionQuotaLine(plan: SalesCopilotPricingPlan): string | null {
  if (typeof plan.leadQuota !== "number") return null;
  return plan.quotaHighlight ?? `${plan.leadQuota} credits / month · 1 credit = 1 enriched lead`;
}

/** Setup fee (banner), three subscription tiers, calling add-on, then enterprise custom (layout only). */
export const pricingPlansByLayout = (): {
  setup: SalesCopilotPricingPlan;
  tiers: SalesCopilotPricingPlan[];
  callingAddon: SalesCopilotPricingPlan;
  custom: SalesCopilotPricingPlan;
} => {
  const map = Object.fromEntries(SALES_COPILOT_PRICING_PLANS.map((p) => [p.id, p])) as Record<
    string,
    SalesCopilotPricingPlan
  >;
  return {
    setup: map.setup,
    tiers: [map.basic, map.pro, map.premium],
    callingAddon: map.calling_addon,
    custom: map.custom,
  };
};

export const SALES_COPILOT_PRICING_PLANS: SalesCopilotPricingPlan[] = [
  {
    id: "setup",
    kind: "setup",
    name: "One-Time Setup",
    headline: "Get your workspace live with channels and routing configured.",
    priceDisplay: "2,000 AED",
    priceSub: "one-time",
    sections: [
      {
        heading: "Includes",
        bullets: [
          "Platform setup and workspace configuration",
          "Lead enrichment and routing configuration",
          "Companies — accounts and org structure aligned with your CRM",
          "Communication channel enablement: Email, LinkedIn, WhatsApp",
          "CSV, Google Sheets, and Airtable — data & CRM onboarding",
          "User onboarding and initial setup support",
          "Extra seats 50 AED / seat / month (when you’re on a monthly plan)",
        ],
      },
    ],
    footnote: "Standard onboarding before monthly plans begin.",
  },
  {
    id: "basic",
    kind: "subscription",
    name: "Basic",
    headline: "Email-first outbound with enrichment, CRM setup, and AI leads.",
    priceDisplay: "1,000 AED",
    priceSub: "/ month",
    leadQuota: 300,
    sections: [
      {
        heading: "Each month",
        bullets: [
          "300 credits for fully enriched leads (1 credit = 1 lead)",
          "Verified email, phone, and complete lead profile",
          "Email campaigns — up to 30,000 sends",
          "AI-generated leads",
          "25,000 AI prompt tokens/month (1 token = 1 character on AI lead search; max 500 characters per prompt)",
        ],
      },
      {
        heading: "Workspace",
        bullets: [
          "Lead management dashboard",
          "Companies — view and manage accounts linked to your leads",
          "CSV, Google Sheets, and Airtable — CRM & import setup",
          "1 admin seat included; extra seats 50 AED / seat / month",
        ],
      },
    ],
  },
  {
    id: "pro",
    kind: "subscription",
    name: "Pro",
    headline: "Full multi-channel campaigns with more credits and seats.",
    priceDisplay: "1,500 AED",
    priceSub: "/ month",
    leadQuota: 500,
    featured: true,
    badge: "Most popular",
    sections: [
      {
        heading: "Each month",
        bullets: [
          "500 credits for fully enriched leads (1 credit = 1 lead)",
          "Verified email, phone, and complete lead profile",
          "Unlimited email campaigns",
          "LinkedIn outreach campaigns",
          "WhatsApp outreach campaigns",
          "AI-generated leads",
          "75,000 AI prompt tokens/month (1 token = 1 character on AI lead search; max 500 characters per prompt)",
        ],
      },
      {
        heading: "Workspace",
        bullets: [
          "Lead management dashboard",
          "Companies — account workspace with firmographics, activity, and team context",
          "CSV, Google Sheets, and Airtable — CRM & import setup",
          "3 seats total (1 admin + 2 team seats); extra seats 50 AED / seat / month",
        ],
      },
    ],
  },
  {
    id: "premium",
    kind: "subscription",
    name: "Premium",
    headline: "Highest included credits and seats for teams at full outbound volume.",
    priceDisplay: "2,500 AED",
    priceSub: "/ month",
    leadQuota: 1000,
    sections: [
      {
        heading: "Each month",
        bullets: [
          "1,000 credits for fully enriched leads (1 credit = 1 lead)",
          "Verified email, phone, and complete lead profile",
          "Unlimited email campaigns",
          "LinkedIn outreach campaigns",
          "WhatsApp outreach campaigns",
          "AI-generated leads",
          "150,000 AI prompt tokens/month (1 token = 1 character on AI lead search; max 500 characters per prompt)",
        ],
      },
      {
        heading: "Workspace",
        bullets: [
          "Lead management dashboard",
          "Companies — account workspace with firmographics, activity, and team context",
          "CSV, Google Sheets, and Airtable — CRM & import setup",
          "5 seats total (1 admin + 4 team seats); extra seats 50 AED / seat / month",
        ],
      },
    ],
  },
  {
    id: "custom",
    kind: "custom",
    name: "Custom",
    headline: "Volume, workflows, and integrations tailored to you.",
    priceDisplay: "Contact sales",
    priceSub: "",
    sections: [
      {
        heading: "For",
        bullets: [
          "Teams with higher volume requirements",
          "Advanced workflows or automation",
          "Companies — enterprise account hierarchies, rollups, and governance",
          "CSV, Google Sheets, Airtable, and custom enterprise integrations",
          "Procurement-friendly terms; extra seats 50 AED / seat / month (volume packages available)",
        ],
      },
    ],
    footnote: "We scope pricing and configuration together with your team.",
  },
  {
    id: "calling_addon",
    kind: "addon",
    name: "Calling add-on",
    headline: "AI-powered outbound calling as a core channel.",
    priceDisplay: "10,000 AED",
    priceSub: "one-time setup",
    badge: "Advanced",
    sections: [
      {
        heading: "Replaces standard setup",
        bullets: [
          "When calling is enabled, the total setup fee becomes 10,000 AED instead of the standard 2,000 AED setup.",
        ],
      },
      {
        heading: "Includes",
        bullets: [
          "AI-powered calling functionality",
          "Advanced multi-channel communication workflows",
          "Calling credits included (500+ minutes)",
          "Companies — outbound lists grounded in account context",
          "Lists from CSV, Google Sheets, and Airtable",
          "Extra seats 50 AED / seat / month",
        ],
      },
      {
        heading: "Designed for",
        bullets: [
          "Advanced sales teams and enterprise users that need outbound calling and AI calling agents at the center of the motion.",
        ],
      },
    ],
  },
];
