const PAGE_META = {
  map: {
    pillar: "Overview",
    workspaceEyebrow: "Facility Overview",
    workspaceTitle: "Spatial Twin Command Surface",
    workspaceCopy: "Scan the whole greenhouse, compare managed scope, and move into a zone with one click.",
    scopeEyebrow: "Scope Rail",
    scopeTitle: "Managed Facility",
    scopeCopy: "Choose the zones driving KPIs, map severity, and downstream evidence.",
    contextEyebrow: "Evidence Rail",
    contextTitle: "Zone Evidence",
    modeLabel: "Overview"
  },
  twin: {
    pillar: "Overview",
    workspaceEyebrow: "Zone Twin",
    workspaceTitle: "Focused Zone Diagnostics",
    workspaceCopy: "Follow one zone from actuator load to gateway topology and sensor path health.",
    scopeEyebrow: "Scope Rail",
    scopeTitle: "Zone Inventory",
    scopeCopy: "Stay anchored to the selected zone while switching gateways and subsystem focus.",
    contextEyebrow: "Evidence Rail",
    contextTitle: "Asset Evidence",
    contextCopy: "Review the active asset, supporting telemetry, and incident evidence without losing topology context.",
    modeLabel: "Zone Twin"
  },
  operations: {
    pillar: "Operations",
    workspaceEyebrow: "Incident Command",
    workspaceTitle: "Operational Triage Workspace",
    workspaceCopy: "Rank the riskiest zones, understand why they drifted, and pivot directly into the subsystem that needs action.",
    scopeEyebrow: "Scope Rail",
    scopeTitle: "Managed Command Scope",
    scopeCopy: "Define which zones contribute to the command picture, comparisons, and response queue.",
    contextEyebrow: "Evidence Rail",
    contextTitle: "Response Evidence",
    contextCopy: "Use the evidence rail for incidents, selected assets, and the operational narrative behind each alarm.",
    modeLabel: "Operations"
  },
  graphs: {
    pillar: "Operations",
    workspaceEyebrow: "Trend Analysis",
    workspaceTitle: "Comparison And Drift Analysis",
    workspaceCopy: "Compare focused-zone behavior against the managed envelope without leaving the operator workflow.",
    scopeEyebrow: "Control Rail",
    scopeTitle: "Trend Controls",
    scopeCopy: "Adjust comparison range, metric family, and scope before reading the charts.",
    contextEyebrow: "Evidence Rail",
    contextTitle: "Analysis Context",
    contextCopy: "Keep the selected zone, asset context, and supporting incidents beside the charts.",
    modeLabel: "Analysis"
  },
  "edge-devices": {
    pillar: "Fleet",
    workspaceEyebrow: "Gateway Fleet",
    workspaceTitle: "Gateway Operations Workspace",
    workspaceCopy: "Track gateway posture, upstream quality, and downstream batches from one persistent fleet view.",
    scopeEyebrow: "Fleet Rail",
    scopeTitle: "Gateway Inventory",
    scopeCopy: "Move across gateways without losing the selected path or zone context.",
    contextEyebrow: "Evidence Rail",
    contextTitle: "Gateway Evidence",
    contextCopy: "Inspect sensor batches, incident evidence, and connectivity context beside the active gateway.",
    modeLabel: "Fleet"
  },
  sensors: {
    pillar: "Fleet",
    workspaceEyebrow: "Sensor Fleet",
    workspaceTitle: "Sensor Reliability Workspace",
    workspaceCopy: "Monitor freshness, battery, readings, and upstream gateway health from a single fleet surface.",
    scopeEyebrow: "Fleet Rail",
    scopeTitle: "Sensor Inventory",
    scopeCopy: "Move across sensors while preserving the selected reading, path, and related incident evidence.",
    contextEyebrow: "Evidence Rail",
    contextTitle: "Sensor Evidence",
    contextCopy: "Use the rail for selected sensor detail, related incidents, and upstream path quality.",
    modeLabel: "Fleet"
  }
};

export function resolveCurrentPage(pathname) {
  if (pathname === "/" || pathname === "/map") return "map";
  if (pathname === "/twin") return "twin";
  if (pathname === "/operations") return "operations";
  if (pathname === "/graphs") return "graphs";
  if (pathname === "/edge-devices") return "edge-devices";
  if (pathname === "/sensors") return "sensors";
  return "map";
}

export function activateNavigation(currentPage) {
  document.body.dataset.page = currentPage;
  const meta = PAGE_META[currentPage] || PAGE_META.map;
  document.body.dataset.pillar = (meta.pillar || "Overview").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const isActive = link.dataset.nav === currentPage;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

export function applyWorkspaceChrome({ currentPage, elements, selectedZoneName, selectedEdgeDeviceName, selectedSensorName, focusPath }) {
  const meta = PAGE_META[currentPage] || PAGE_META.map;
  const focusLabel = currentPage === "edge-devices"
    ? selectedEdgeDeviceName
    : currentPage === "sensors"
      ? selectedSensorName
      : selectedZoneName;

  if (elements.workspaceEyebrowEl) elements.workspaceEyebrowEl.textContent = meta.workspaceEyebrow;
  if (elements.workspaceTitleEl) elements.workspaceTitleEl.textContent = meta.workspaceTitle;
  if (elements.workspaceCopyEl) elements.workspaceCopyEl.textContent = meta.workspaceCopy;
  if (elements.workspaceModeLabelEl) elements.workspaceModeLabelEl.textContent = meta.modeLabel;
  if (elements.workspacePillarLabelEl) elements.workspacePillarLabelEl.textContent = meta.pillar;
  if (elements.workspaceFocusLabelEl) elements.workspaceFocusLabelEl.textContent = focusLabel || "--";
  if (elements.scopeEyebrowEl) elements.scopeEyebrowEl.textContent = meta.scopeEyebrow;
  if (elements.scopeTitleEl) elements.scopeTitleEl.textContent = meta.scopeTitle;
  if (elements.scopeCopyEl) elements.scopeCopyEl.textContent = meta.scopeCopy;
  if (elements.contextEyebrowEl) elements.contextEyebrowEl.textContent = meta.contextEyebrow;
  if (elements.contextTitleEl) elements.contextTitleEl.textContent = meta.contextTitle;
  if (elements.contextCopyEl) elements.contextCopyEl.textContent = meta.contextCopy;
  if (elements.workspaceFocusPathEl) elements.workspaceFocusPathEl.textContent = focusPath || `${meta.pillar} / ${focusLabel || "--"}`;
}
