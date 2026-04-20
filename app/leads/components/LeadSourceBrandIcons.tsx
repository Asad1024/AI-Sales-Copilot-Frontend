"use client";

import type { ReactNode } from "react";
import { Icons } from "@/components/ui/Icons";

/** Google Sheets product mark (green sheet, folded corner, row lines). */
export function GoogleSheetsBrandIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#0F9D58"
        d="M12 10c-1.66 0-3 1.34-3 3v22c0 1.66 1.34 3 3 3h20c1.66 0 3-1.34 3-3V19L28 10H12z"
      />
      <path fill="#87CEAC" d="M28 10v9h9L28 10z" />
      <path fill="#fff" d="M16 22h16v2.25H16zm0 5.5h16v2.25H16zm0 5.5h12v2.25H16z" />
    </svg>
  );
}

/**
 * Airtable mark — geometry from Simple Icons (CC0), colors per Airtable brand palette.
 * @see https://github.com/simple-icons/simple-icons
 */
export function AirtableBrandIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#FCB400"
        d="M11.992 1.966c-.434 0-.87.086-1.28.257L1.779 5.917c-.503.208-.49.908.012 1.116l8.982 3.558a3.266 3.266 0 0 0 2.454 0l8.982-3.558c.503-.196.503-.908.012-1.116l-8.957-3.694a3.255 3.255 0 0 0-1.272-.257z"
      />
      <path
        fill="#F82B60"
        d="M23.4 8.056a.589.589 0 0 0-.222.045l-10.012 3.877a.612.612 0 0 0-.38.564v8.896a.6.6 0 0 0 .821.552L23.62 18.1a.583.583 0 0 0 .38-.551V8.653a.6.6 0 0 0-.6-.596z"
      />
      <path
        fill="#18BFFF"
        d="M.676 8.095a.644.644 0 0 0-.48.19C.086 8.396 0 8.53 0 8.69v8.355c0 .442.515.737.908.54l6.27-3.006.307-.147 2.969-1.436c.466-.22.43-.908-.061-1.092L.883 8.138a.57.57 0 0 0-.207-.044z"
      />
    </svg>
  );
}

/** Microsoft Excel mark (commonly used for CSV / spreadsheet files). Path from Simple Icons (CC0). */
export function MicrosoftExcelBrandIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#217346"
        d="M23 1.5q.41 0 .7.3.3.29.3.7v19q0 .41-.3.7-.29.3-.7.3H7q-.41 0-.7-.3-.3-.29-.3-.7V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h5V2.5q0-.41.3-.7.29-.3.7-.3zM6 13.28l1.42 2.66h2.14l-2.38-3.87 2.34-3.8H7.46l-1.3 2.4-.05.08-.04.09-.64-1.28-.66-1.29H2.59l2.27 3.82-2.48 3.85h2.16zM14.25 21v-3H7.5v3zm0-4.5v-3.75H12v3.75zm0-5.25V7.5H12v3.75zm0-5.25V3H7.5v3zm8.25 15v-3h-6.75v3zm0-4.5v-3.75h-6.75v3.75zm0-5.25V7.5h-6.75v3.75zm0-5.25V3h-6.75v3Z"
      />
    </svg>
  );
}

/** AI mark: plain purple sparkles icon (no background tile). */
export function GenerateLeadAIIcon({ size = 22, sparklesSize }: { size?: number; sparklesSize?: number }) {
  const sp = sparklesSize ?? size;
  return (
    <Icons.Sparkles
      size={sp}
      strokeWidth={1.8}
      style={{ color: "var(--color-primary)", display: "inline-block", flexShrink: 0 }}
      aria-hidden
    />
  );
}

/** Consistent leading slot for toolbar dropdown rows. */
export function MenuBrandIconSlot({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}
