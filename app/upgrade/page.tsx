"use client";

import SalesCopilotPricingSection from "@/components/pricing/SalesCopilotPricingSection";

export default function UpgradePage() {
  return (
    <SalesCopilotPricingSection
      variant="portal"
      pageTitle="Plans & upgrade"
      intro="Review Sales Co-Pilot plans in AED. Checkout uses Stripe on the server when Price IDs are configured; until then you will see a short status message after choosing a plan."
    />
  );
}
