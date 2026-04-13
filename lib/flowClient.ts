"use client";

import { apiRequest } from "./apiClient";
import { getUser } from "./apiClient";

export async function createAIPlan(goal: string) {
  const user = getUser();
  const data = await apiRequest("/ai/plan", {
    method: "POST",
    body: JSON.stringify({ goal, user_id: user?.id || 1 })
  });
  return data;
}

export async function acceptAIPlan(planId: string) {
  const data = await apiRequest("/ai/plan/accept", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId }),
  });
  return data;
}

export async function getAIProgress(runId: string) {
  const data = await apiRequest(`/ai/run/${runId}`);
  return data;
}

export async function getAIInbox() {
  const data = await apiRequest("/ai/inbox");
  return data;
}

export async function fetchPlanPreviewLeads(planId: string, limit: number = 25) {
  const data = await apiRequest(`/ai/plan/${planId}/preview-leads?limit=${limit}`);
  return data;
}


export async function updateAIPlan(payload: {
  plan_id: string;
  audience?: string[];
  lead_sources?: string[];
  sequence?: any[];
  safety?: string[];
}) {
  const data = await apiRequest("/ai/plan/update", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return data;
}
