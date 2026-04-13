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
  sections: { heading: string; bullets: string[] }[];
  footnote?: string;
};

/** Setup first, then the four purchasable tiers, then enterprise custom (layout only). */
export const pricingPlansByLayout = (): {
  setup: SalesCopilotPricingPlan;
  tiers: SalesCopilotPricingPlan[];
  custom: SalesCopilotPricingPlan;
} => {
  const map = Object.fromEntries(SALES_COPILOT_PRICING_PLANS.map((p) => [p.id, p])) as Record<
    string,
    SalesCopilotPricingPlan
  >;
  return {
    setup: map.setup,
    tiers: [map.basic, map.pro, map.premium, map.calling_addon],
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
          "Communication channel enablement: Email, LinkedIn, WhatsApp",
          "User onboarding and initial setup support",
        ],
      },
    ],
    footnote: "Standard onboarding before monthly plans begin.",
  },
  {
    id: "basic",
    kind: "subscription",
    name: "Basic",
    headline: "Solid foundation for outbound and lead ops.",
    priceDisplay: "1,000 AED",
    priceSub: "/ month",
    leadQuota: 300,
    sections: [
      {
        heading: "Included leads",
        bullets: [
          "300 fully enriched leads per month",
          "Verified email, phone number, and complete lead profile",
        ],
      },
      {
        heading: "Access",
        bullets: [
          "Lead management dashboard",
          "Email outreach campaigns",
          "LinkedIn outreach campaigns",
          "WhatsApp outreach campaigns",
        ],
      },
    ],
  },
  {
    id: "pro",
    kind: "subscription",
    name: "Pro",
    headline: "Higher volume for teams scaling pipeline.",
    priceDisplay: "1,500 AED",
    priceSub: "/ month",
    badge: "Popular",
    featured: true,
    leadQuota: 500,
    sections: [
      {
        heading: "Included leads",
        bullets: [
          "500 fully enriched leads per month",
          "Verified email, phone number, and complete lead profile",
        ],
      },
      {
        heading: "Access",
        bullets: [
          "Lead management dashboard",
          "Email outreach campaigns",
          "LinkedIn outreach campaigns",
          "WhatsApp outreach campaigns",
        ],
      },
    ],
  },
  {
    id: "premium",
    kind: "subscription",
    name: "Premium",
    headline: "Maximum included enrichment for heavy outbound.",
    priceDisplay: "2,500 AED",
    priceSub: "/ month",
    leadQuota: 1000,
    sections: [
      {
        heading: "Included leads",
        bullets: [
          "1,000 fully enriched leads per month",
          "Verified email, phone number, and complete lead profile",
        ],
      },
      {
        heading: "Access",
        bullets: [
          "Lead management dashboard",
          "Email outreach campaigns",
          "LinkedIn outreach campaigns",
          "WhatsApp outreach campaigns",
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
          "Custom integrations and procurement-friendly terms",
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
