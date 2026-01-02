"use client";
import React from "react";

type LogoProps = {
  size?: number;
  style?: React.CSSProperties;
};

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

// HubSpot Logo
export const HubSpotLogo = ({ size = 24, style }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"
      fill="#FF7A59"
    />
    <circle cx="12" cy="12" r="10" stroke="#FF7A59" strokeWidth="0.5" opacity="0.3" />
  </svg>
);

// Zoho Logo
export const ZohoLogo = ({ size = 24, style }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M12 2L2 7v10l10 5 10-5V7L12 2z"
      fill="#C8202F"
    />
    <path
      d="M12 2v20l10-5V7L12 2z"
      fill="#E53E3E"
      opacity="0.8"
    />
    <path
      d="M7 12l5-5 5 5-5 5-5-5z"
      fill="#fff"
      opacity="0.9"
    />
  </svg>
);

// Salesforce Logo
export const SalesforceLogo = ({ size = 24, style }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
      fill="#00A1E0"
    />
    <path
      d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
      fill="#00A1E0"
    />
    <circle cx="12" cy="12" r="2" fill="#00A1E0" />
  </svg>
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {/* HubSpot's orange circle with checkmark */}
      <circle cx="12" cy="12" r="10" fill="#FF7A59" />
      <path
        d="M9 12l2 2 4-4"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  Zoho: ({ size = 32, style }: LogoProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {/* Zoho's red rounded square with Z */}
      <rect width="24" height="24" rx="5" fill="#C8202F" />
      <path
        d="M7 8h10l-2 2H9l2 2h6l-2 2H7V8z"
        fill="#fff"
        fillRule="evenodd"
      />
    </svg>
  ),
  Salesforce: ({ size = 32, style }: LogoProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {/* Salesforce's cloud logo */}
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8c1.57 0 3.03.46 4.26 1.24l-1.46 2.2C14.1 8.5 13.1 8 12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4c1.1 0 2.1-.5 2.8-1.44l1.46 2.2C15.03 19.54 13.57 20 12 20z"
        fill="#00A1E0"
      />
      <path
        d="M16.26 5.24l1.46-2.2C15.03 2.46 13.57 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10c1.57 0 3.03-.46 4.26-1.24l-1.46-2.2C14.1 19.5 13.1 20 12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8c1.1 0 2.1.5 2.8 1.44l1.46-2.2z"
        fill="#1798C1"
        opacity="0.8"
      />
    </svg>
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

