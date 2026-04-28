"use client";
import React from "react";
import { SiSalesforce, SiZoho } from "react-icons/si";

type LogoProps = {
  size?: number;
  style?: React.CSSProperties;
};

const SALESFORCE_COLOR = "#00A1E0";
// Zoho has a multi-color wordmark; Simple Icons is single-color, so we render in Zoho red.
const ZOHO_COLOR = "#E42527";

function withDefaultColor(style: React.CSSProperties | undefined, color: string): React.CSSProperties {
  if (style && typeof style.color === "string" && style.color.trim().length > 0) return style;
  return { ...(style ?? {}), color };
}

// Airtable Logo
export const AirtableLogo = ({ size = 24, style }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M12 2L2 7v10l10 5 10-5V7L12 2z"
      fill="#18BFFF"
    />
    <path
      d="M12 2v20l10-5V7L12 2z"
      fill="#7B68EE"
      opacity="0.8"
    />
    <path
      d="M2 7l10 5 10-5"
      stroke="#fff"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.3"
    />
  </svg>
);

/** HubSpot sprocket — geometry from Simple Icons (CC0), color #FF7A59 per brand. */
const HUBSPOT_SPROCKET_PATH =
  "M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z";

// HubSpot Logo
export const HubSpotLogo = ({ size = 24, style }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} aria-hidden>
    <path d={HUBSPOT_SPROCKET_PATH} fill="#FF7A59" />
  </svg>
);

// Zoho Logo
export const ZohoLogo = ({ size = 24, style }: LogoProps) => (
  <SiZoho size={size} style={withDefaultColor(style, ZOHO_COLOR)} aria-hidden />
);

// Salesforce Logo
export const SalesforceLogo = ({ size = 24, style }: LogoProps) => (
  <SiSalesforce size={size} style={withDefaultColor(style, SALESFORCE_COLOR)} aria-hidden />
);

// Pipedrive Logo
export const PipedriveLogo = ({ size = 24, style }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"
      fill="#1F88E5"
    />
    <path
      d="M8 12l4 4 4-4"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
    />
  </svg>
);

// CRM Logos with actual brand colors and shapes
export const CRMLogos = {
  Airtable: ({ size = 32, style }: LogoProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {/* Airtable's distinctive 3D grid logo */}
      <path
        d="M12 2L2 7v10l10 5 10-5V7L12 2z"
        fill="#18BFFF"
      />
      <path
        d="M12 2v20l10-5V7L12 2z"
        fill="#7B68EE"
        opacity="0.9"
      />
      <path
        d="M2 7l10 5 10-5M12 12v10M2 17l10 5 10-5"
        stroke="#fff"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
      />
    </svg>
  ),
  HubSpot: ({ size = 32, style }: LogoProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} aria-hidden>
      <path d={HUBSPOT_SPROCKET_PATH} fill="#FF7A59" />
    </svg>
  ),
  Zoho: ({ size = 32, style }: LogoProps) => (
    <SiZoho size={size} style={withDefaultColor(style, ZOHO_COLOR)} aria-hidden />
  ),
  Salesforce: ({ size = 32, style }: LogoProps) => (
    <SiSalesforce size={size} style={withDefaultColor(style, SALESFORCE_COLOR)} aria-hidden />
  ),
  Pipedrive: ({ size = 32, style }: LogoProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {/* Pipedrive's blue circle with arrow */}
      <circle cx="12" cy="12" r="10" fill="#1F88E5" />
      <path
        d="M8 10l4 4 4-4"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M12 6v8"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

