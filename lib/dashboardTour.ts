/** Dispatched from the header Tutorial control; listened to by `ProductTour` on the dashboard. */
export const DASHBOARD_TOUR_START_EVENT = "sparkai:start-dashboard-tour";

export const dispatchStartDashboardTour = (): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DASHBOARD_TOUR_START_EVENT));
};
