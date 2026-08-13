export type SiteAttribution = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

export function getSiteAttribution(): SiteAttribution {
  if (typeof window === "undefined") return { utmSource: "", utmMedium: "", utmCampaign: "" };
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: (params.get("utm_source") || "").slice(0, 100),
    utmMedium: (params.get("utm_medium") || "").slice(0, 100),
    utmCampaign: (params.get("utm_campaign") || "").slice(0, 100),
  };
}
