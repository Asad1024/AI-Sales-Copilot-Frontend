import type { CompanyPreviewRecord } from "@/lib/api";

/** Same merge as the landing company preview (`loadCompanyPreview` in `app/page.tsx`). */
export function mergeCompanyPreview(
  current: CompanyPreviewRecord,
  incoming: CompanyPreviewRecord
): CompanyPreviewRecord {
  return {
    id: incoming.id || current.id,
    name: incoming.name || current.name,
    avatar_url: incoming.avatar_url ?? current.avatar_url ?? null,
    domain: incoming.domain ?? current.domain ?? null,
    website_url: incoming.website_url ?? current.website_url ?? null,
    linkedin_url: incoming.linkedin_url ?? current.linkedin_url ?? null,
    industry: incoming.industry ?? current.industry ?? null,
    estimated_num_employees: incoming.estimated_num_employees ?? current.estimated_num_employees ?? null,
    employee_range: incoming.employee_range ?? current.employee_range ?? null,
    location: incoming.location ?? current.location ?? null,
    founded_year: incoming.founded_year ?? current.founded_year ?? null,
    annual_revenue_printed: incoming.annual_revenue_printed ?? current.annual_revenue_printed ?? null,
    phone: incoming.phone ?? current.phone ?? null,
    company_email: incoming.company_email ?? current.company_email ?? null,
  };
}
