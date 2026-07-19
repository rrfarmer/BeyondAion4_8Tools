/* global L */
(() => {
  "use strict";

  const root = document.querySelector("[data-spawn-editor]");
  if (!root) return;

  const initialMapId = Number(root.dataset.mapId);
  const elements = {
    map: root.querySelector("[data-map]"),
    mapShell: root.querySelector(".spawn-map-shell"),
    mapLoading: root.querySelector("[data-map-loading]"),
    mapStats: root.querySelector("[data-map-stats]"),
    mapLoadingLabel: root.querySelector("[data-map-loading-label]"),
    artworkStatus: root.querySelector("[data-artwork-status]"),
    sourceStatus: root.querySelector("[data-source-status]"),
    status: root.querySelector("[data-status]"),
    mapSelect: root.querySelector("[data-map-select]"),
    layerControl: root.querySelector("[data-layer-control]"),
    layerSelect: root.querySelector("[data-layer-select]"),
    mapSearch: root.querySelector("[data-map-search]"),
    typeFilter: root.querySelector("[data-type-filter]"),
    editableFilter: root.querySelector("[data-editable-filter]"),
    placeToggle: root.querySelector("[data-place-toggle]"),
    discardAll: root.querySelector("[data-discard-all]"),
    review: root.querySelector("[data-review]"),
    changeCount: root.querySelector("[data-change-count]"),
    walkerAuditOpen: root.querySelector("[data-walker-audit-open]"),
    walkerAuditCount: root.querySelector("[data-walker-audit-count]"),
    walkerAuditDialog: root.querySelector("[data-walker-audit-dialog]"),
    walkerAuditStatus: root.querySelector("[data-walker-audit-status]"),
    walkerAuditSummary: root.querySelector("[data-walker-audit-summary]"),
    walkerAuditFilters: root.querySelector("[data-walker-audit-filters]"),
    walkerAuditSearch: root.querySelector("[data-walker-audit-search]"),
    walkerAuditMap: root.querySelector("[data-walker-audit-map]"),
    walkerAuditList: root.querySelector("[data-walker-audit-list]"),
    walkerAuditRefresh: root.querySelector("[data-walker-audit-refresh]"),
    emptyState: root.querySelector("[data-empty-state]"),
    emptyDetail: root.querySelector("[data-empty-detail]"),
    detail: root.querySelector("[data-detail]"),
    detailType: root.querySelector("[data-detail-type]"),
    detailName: root.querySelector("[data-detail-name]"),
    detailDraft: root.querySelector("[data-detail-draft]"),
    detailClose: root.querySelector("[data-detail-close]"),
    detailFacts: root.querySelector("[data-detail-facts]"),
    detailWarnings: root.querySelector("[data-detail-warnings]"),
    noWalker: root.querySelector("[data-no-walker]"),
    walkerCreate: root.querySelector("[data-walker-create]"),
    walkerPanel: root.querySelector("[data-walker-panel]"),
    walkerId: root.querySelector("[data-walker-id]"),
    walkerStatus: root.querySelector("[data-walker-status]"),
    walkerFacts: root.querySelector("[data-walker-facts]"),
    walkerWarnings: root.querySelector("[data-walker-warnings]"),
    walkerFit: root.querySelector("[data-walker-fit]"),
    walkerEdit: root.querySelector("[data-walker-edit]"),
    walkerEditor: root.querySelector("[data-walker-editor]"),
    walkerLoop: root.querySelector("[data-walker-loop]"),
    walkerDraw: root.querySelector("[data-walker-draw]"),
    walkerRedraw: root.querySelector("[data-walker-redraw]"),
    walkerSnapAll: root.querySelector("[data-walker-snap-all]"),
    walkerDrawingStatus: root.querySelector("[data-walker-drawing-status]"),
    walkerPointList: root.querySelector("[data-walker-point-list]"),
    walkerPointForm: root.querySelector("[data-walker-point-form]"),
    walkerPointGroundStatus: root.querySelector("[data-walker-point-ground-status]"),
    walkerMove: root.querySelector("[data-walker-move]"),
    walkerPointSnap: root.querySelector("[data-walker-point-snap]"),
    walkerPointDelete: root.querySelector("[data-walker-point-delete]"),
    walkerDiscard: root.querySelector("[data-walker-discard]"),
    walkerReview: root.querySelector("[data-walker-review]"),
    walkerReviewDialog: root.querySelector("[data-walker-review-dialog]"),
    walkerReviewSummary: root.querySelector("[data-walker-review-summary]"),
    walkerReviewDetails: root.querySelector("[data-walker-review-details]"),
    walkerChangeReason: root.querySelector("[data-walker-change-reason]"),
    walkerApply: root.querySelector("[data-walker-apply]"),
    positionForm: root.querySelector("[data-position-form]"),
    stageUpdate: root.querySelector("[data-stage-update]"),
    pickPosition: root.querySelector("[data-pick-position]"),
    snapGround: root.querySelector("[data-snap-ground]"),
    groundStatus: root.querySelector("[data-ground-status]"),
    undoSelected: root.querySelector("[data-undo-selected]"),
    deleteSelected: root.querySelector("[data-delete-selected]"),
    placePanel: root.querySelector("[data-place-panel]"),
    placeClose: root.querySelector("[data-place-close]"),
    placeTitle: root.querySelector("[data-place-title]"),
    npcSearch: root.querySelector("[data-npc-search]"),
    npcResults: root.querySelector("[data-npc-results]"),
    placeFields: root.querySelector("[data-place-fields]"),
    selectedNpc: root.querySelector("[data-selected-npc]"),
    placeX: root.querySelector("[data-place-x]"),
    placeY: root.querySelector("[data-place-y]"),
    placeZ: root.querySelector("[data-place-z]"),
    placeHeading: root.querySelector("[data-place-heading]"),
    respawnField: root.querySelector("[data-respawn-field]"),
    placeRespawn: root.querySelector("[data-place-respawn]"),
    placePick: root.querySelector("[data-place-pick]"),
    placeSnapGround: root.querySelector("[data-place-snap-ground]"),
    placeGroundStatus: root.querySelector("[data-place-ground-status]"),
    stageCreate: root.querySelector("[data-stage-create]"),
    reviewDialog: root.querySelector("[data-review-dialog]"),
    reviewSummary: root.querySelector("[data-review-summary]"),
    reviewList: root.querySelector("[data-review-list]"),
    changeReason: root.querySelector("[data-change-reason]"),
    applyChanges: root.querySelector("[data-apply-changes]"),
  };

  const state = {
    maps: [],
    mapId: initialMapId,
    layerId: undefined,
    snapshot: undefined,
    groups: new Map(),
    groupsByNpcId: new Map(),
    spots: new Map(),
    drafts: new Map(),
    selectedKey: undefined,
    selectedNpc: undefined,
    npcResults: [],
    nextClientKey: 1,
    pickMode: undefined,
    leafletMap: undefined,
    markerLayer: undefined,
    selectionLayer: undefined,
    walkerLayer: undefined,
    imageLayer: undefined,
    renderer: undefined,
    walkerRoute: undefined,
    walkerSpotKey: undefined,
    walkerError: undefined,
    walkerRequestId: 0,
    walkerDraft: undefined,
    walkerSelectedIndex: undefined,
    walkerDrawMode: false,
    walkerPickMode: undefined,
    walkerGroundBusy: false,
    walkerGroundRequestId: 0,
    walkerGroundAudit: undefined,
    walkerGroundAuditLoading: false,
    walkerGroundAuditRequestId: 0,
    searchTimer: undefined,
    groundTimers: { update: undefined, create: undefined },
    groundRequestIds: { update: 0, create: 0 },
    groundLoading: { update: false, create: false },
  };

  bindEvents();
  bootstrap().catch(showFatal);

  function bindEvents() {
    elements.mapSelect.addEventListener("change", changeMap);
    elements.layerSelect.addEventListener("change", changeLayer);
    elements.mapSearch.addEventListener("input", renderMarkers);
    elements.typeFilter.addEventListener("change", renderMarkers);
    elements.editableFilter.addEventListener("change", renderMarkers);
    elements.placeToggle.addEventListener("click", openPlacement);
    elements.placeClose.addEventListener("click", closePlacement);
    elements.discardAll.addEventListener("click", discardAll);
    elements.review.addEventListener("click", reviewChanges);
    elements.walkerAuditOpen.addEventListener("click", openWalkerGroundAudit);
    elements.walkerAuditRefresh.addEventListener("click", () => loadWalkerGroundAudit(true));
    elements.walkerAuditSearch.addEventListener("input", renderWalkerGroundAuditRows);
    elements.walkerAuditMap.addEventListener("change", renderWalkerGroundAuditRows);
    elements.walkerAuditList.addEventListener("click", viewWalkerGroundAuditFinding);
    elements.positionForm.addEventListener("submit", stageUpdate);
    elements.pickPosition.addEventListener("click", () => beginPick("update"));
    elements.snapGround.addEventListener("click", () => snapCurrentPosition("update"));
    elements.undoSelected.addEventListener("click", undoSelected);
    elements.deleteSelected.addEventListener("click", stageDelete);
    elements.detailClose.addEventListener("click", () => deselectSpot());
    elements.walkerFit.addEventListener("click", fitWalkerRoute);
    elements.walkerCreate.addEventListener("click", createWalkerDraft);
    elements.walkerEdit.addEventListener("click", editWalkerRoute);
    elements.walkerLoop.addEventListener("change", updateWalkerLoop);
    elements.walkerDraw.addEventListener("click", toggleWalkerDrawing);
    elements.walkerRedraw.addEventListener("click", redrawWalkerRoute);
    elements.walkerSnapAll.addEventListener("click", snapAllWalkerPoints);
    elements.walkerPointList.addEventListener("click", selectWalkerPointFromList);
    elements.walkerPointForm.addEventListener("submit", updateWalkerPointFromForm);
    elements.walkerMove.addEventListener("click", moveWalkerPointOnMap);
    elements.walkerPointSnap.addEventListener("click", snapSelectedWalkerPoint);
    elements.walkerPointDelete.addEventListener("click", deleteSelectedWalkerPoint);
    elements.walkerDiscard.addEventListener("click", discardWalkerDraft);
    elements.walkerReview.addEventListener("click", reviewWalkerRoute);
    elements.walkerApply.addEventListener("click", applyWalkerRoute);
    elements.npcSearch.addEventListener("input", queueNpcSearch);
    elements.npcResults.addEventListener("click", selectNpcResult);
    elements.placePick.addEventListener("click", () => beginPick("create"));
    elements.placeSnapGround.addEventListener("click", () => snapCurrentPosition("create"));
    elements.stageCreate.addEventListener("click", stageCreate);
    elements.positionForm.elements.x.addEventListener("input", () => queueGroundLookup("update"));
    elements.positionForm.elements.y.addEventListener("input", () => queueGroundLookup("update"));
    elements.positionForm.elements.z.addEventListener("input", () => groundValueEdited("update"));
    elements.placeX.addEventListener("input", () => {
      updateCreateButton();
      queueGroundLookup("create");
    });
    elements.placeY.addEventListener("input", () => {
      updateCreateButton();
      queueGroundLookup("create");
    });
    elements.placeZ.addEventListener("input", () => {
      groundValueEdited("create");
      updateCreateButton();
    });
    elements.placeHeading.addEventListener("input", updateCreateButton);
    elements.placeRespawn.addEventListener("input", updateCreateButton);
    elements.applyChanges.addEventListener("click", applyChanges);
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      if (state.pickMode || state.walkerDrawMode || state.walkerPickMode) {
        cancelPick();
        stopWalkerMapMode();
      } else if (
        state.selectedKey
        && !elements.reviewDialog.open
        && !elements.walkerReviewDialog.open
        && !elements.walkerAuditDialog.open
      ) {
        deselectSpot();
      }
    });
    window.addEventListener("beforeunload", event => {
      if (!state.drafts.size && !walkerDraftIsDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  async function bootstrap() {
    setLoading(true);
    const result = await fetchJson("/admin/api/spawn-editor/maps");
    state.maps = result.maps;
    if (!state.maps.length) throw new Error("No spawn maps are available.");
    elements.mapSelect.innerHTML = state.maps
      .map(map => `<option value="${map.id}">${escapeHtml(map.name)} · ${map.id}</option>`)
      .join("");
    const searchParams = new URLSearchParams(window.location.search);
    const requestedMapId = Number(searchParams.get("mapId"));
    const requestedWalkerId = searchParams.get("walkerId")?.trim();
    const selectedMap = state.maps.find(map => map.id === requestedMapId)
      || state.maps.find(map => map.id === initialMapId)
      || state.maps[0];
    state.mapId = selectedMap.id;
    elements.mapSelect.value = String(state.mapId);
    elements.mapSelect.disabled = false;
    await loadSnapshot();
    if (requestedWalkerId) selectWalkerRoute(requestedWalkerId);
  }

  async function loadSnapshot() {
    setLoading(true);
    elements.mapLoadingLabel.textContent = `Loading ${mapName(state.mapId)}`;
    const snapshot = await fetchJson(`/admin/api/spawn-editor/maps/${state.mapId}/spawns`);
    installSnapshot(snapshot);
    if (!state.leafletMap) initializeMap(snapshot.map);
    else updateMapImage(snapshot.map, true);
    populateTypeFilter();
    renderMarkers();
    elements.status.hidden = true;
    setLoading(false);
  }

  async function changeMap() {
    const nextMapId = Number(elements.mapSelect.value);
    if (nextMapId === state.mapId) return;
    if ((state.drafts.size || walkerDraftIsDirty()) && !window.confirm("Discard draft changes and switch maps?")) {
      elements.mapSelect.value = String(state.mapId);
      return;
    }
    state.mapId = nextMapId;
    state.layerId = undefined;
    cancelPick();
    if (elements.reviewDialog.open) elements.reviewDialog.close();
    const url = new URL(window.location.href);
    url.searchParams.set("mapId", String(nextMapId));
    url.searchParams.delete("walkerId");
    window.history.replaceState({}, "", url);
    await loadSnapshot().catch(showFatal);
  }

  function openWalkerGroundAudit() {
    if (!elements.walkerAuditDialog.open) elements.walkerAuditDialog.showModal();
    if (state.walkerGroundAudit) renderWalkerGroundAudit();
    else loadWalkerGroundAudit().catch(error => showWalkerGroundAuditError(error));
  }

  async function loadWalkerGroundAudit(force = false) {
    if (state.walkerGroundAuditLoading) return;
    if (state.walkerGroundAudit && !force) {
      renderWalkerGroundAudit();
      return;
    }
    const requestId = ++state.walkerGroundAuditRequestId;
    state.walkerGroundAuditLoading = true;
    elements.walkerAuditOpen.disabled = true;
    elements.walkerAuditRefresh.disabled = true;
    elements.walkerAuditStatus.hidden = false;
    elements.walkerAuditStatus.className = "spawn-audit-status";
    elements.walkerAuditStatus.textContent = "Scanning attached patrol paths against terrain...";
    elements.walkerAuditSummary.hidden = true;
    elements.walkerAuditFilters.hidden = true;
    elements.walkerAuditList.hidden = true;
    try {
      const report = await fetchJson("/admin/api/spawn-editor/walker-ground-audit");
      if (requestId !== state.walkerGroundAuditRequestId) return;
      state.walkerGroundAudit = report;
      renderWalkerGroundAudit();
    } catch (error) {
      if (requestId !== state.walkerGroundAuditRequestId) return;
      showWalkerGroundAuditError(error);
    } finally {
      if (requestId === state.walkerGroundAuditRequestId) {
        state.walkerGroundAuditLoading = false;
        elements.walkerAuditOpen.disabled = false;
        elements.walkerAuditRefresh.disabled = false;
      }
    }
  }

  function renderWalkerGroundAudit() {
    const report = state.walkerGroundAudit;
    if (!report) return;
    elements.walkerAuditCount.textContent = report.offGroundPathCount.toLocaleString();
    elements.walkerAuditCount.hidden = false;
    elements.walkerAuditSummary.innerHTML = [
      [report.auditedPathCount, "Paths checked"],
      [report.offGroundPathCount, "Paths flagged"],
      [report.offGroundPointCount, "Points flagged"],
    ].map(([value, label]) => `<div class="spawn-review-stat"><strong>${Number(value).toLocaleString()}</strong><span>${label}</span></div>`).join("");
    elements.walkerAuditSummary.hidden = false;
    const warnings = [];
    if (report.unavailablePointCount) warnings.push(`${report.unavailablePointCount.toLocaleString()} points could not be checked`);
    if (report.missingRouteCount) warnings.push(`${report.missingRouteCount.toLocaleString()} referenced paths are missing`);
    elements.walkerAuditStatus.className = `spawn-audit-status${warnings.length ? " warning" : " success"}`;
    elements.walkerAuditStatus.textContent = `Terrain tolerance ${formatNumber(report.toleranceMeters)}m · ${report.checkedPointCount.toLocaleString()} points checked${warnings.length ? ` · ${warnings.join(" · ")}` : ""}`;
    elements.walkerAuditStatus.hidden = false;

    const selectedMap = elements.walkerAuditMap.value;
    const maps = [...new Map(report.findings.map(finding => [finding.mapId, finding.mapName])).entries()]
      .sort((left, right) => left[1].localeCompare(right[1]) || left[0] - right[0]);
    elements.walkerAuditMap.innerHTML = `<option value="">All maps</option>${maps
      .map(([mapId, mapName]) => `<option value="${mapId}">${escapeHtml(mapName)} · ${mapId}</option>`)
      .join("")}`;
    if (maps.some(([mapId]) => String(mapId) === selectedMap)) elements.walkerAuditMap.value = selectedMap;
    elements.walkerAuditFilters.hidden = false;
    elements.walkerAuditList.hidden = false;
    renderWalkerGroundAuditRows();
  }

  function renderWalkerGroundAuditRows() {
    const report = state.walkerGroundAudit;
    if (!report) return;
    const query = elements.walkerAuditSearch.value.trim().toLocaleLowerCase();
    const mapId = Number(elements.walkerAuditMap.value) || undefined;
    const findings = report.findings.filter(finding => {
      if (mapId && finding.mapId !== mapId) return false;
      if (!query) return true;
      const searchable = [
        finding.mapName,
        finding.mapId,
        finding.routeId,
        finding.sourceRelativePath,
        ...finding.usages.flatMap(usage => [usage.npcName, usage.npcId]),
      ].join(" ").toLocaleLowerCase();
      return searchable.includes(query);
    });
    if (findings.length === 0) {
      elements.walkerAuditList.innerHTML = `<div class="spawn-audit-empty">No patrol paths match the current filters.</div>`;
      return;
    }
    elements.walkerAuditList.innerHTML = findings.map(finding => {
      const npcNames = [...new Set(finding.usages.map(usage => usage.npcName))];
      const npcLabel = npcNames.slice(0, 2).join(", ") + (npcNames.length > 2 ? ` +${npcNames.length - 2}` : "");
      const pointLabel = finding.points.slice(0, 5)
        .map(point => `#${point.authoredIndex} ${signedNumber(point.delta)}m`)
        .join(" · ");
      const remaining = finding.points.length - 5;
      return `<div class="spawn-audit-row">
        <div class="spawn-audit-map"><strong>${escapeHtml(finding.mapName)}</strong><span>${finding.mapId}</span></div>
        <div class="spawn-audit-route">
          <strong title="${escapeHtml(finding.routeId)}">${escapeHtml(finding.routeId)}</strong>
          <span>${escapeHtml(npcLabel)} · ${finding.usages.length.toLocaleString()} usage${finding.usages.length === 1 ? "" : "s"}</span>
          <small>${escapeHtml(pointLabel)}${remaining > 0 ? ` · +${remaining.toLocaleString()} more` : ""}</small>
        </div>
        <div class="spawn-audit-metric">
          <strong>${finding.offGroundPointCount.toLocaleString()}/${finding.authoredPointCount.toLocaleString()}</strong>
          <span>Worst ${escapeHtml(signedNumber(finding.worstDelta))}m</span>
        </div>
        <button type="button" data-walker-audit-view data-walker-audit-key="${escapeHtml(finding.key)}">View path</button>
      </div>`;
    }).join("");
  }

  async function viewWalkerGroundAuditFinding(event) {
    const button = event.target.closest("[data-walker-audit-view]");
    if (!button || !state.walkerGroundAudit) return;
    const finding = state.walkerGroundAudit.findings.find(candidate => candidate.key === button.dataset.walkerAuditKey);
    if (!finding) return;
    if ((state.drafts.size || walkerDraftIsDirty()) && !window.confirm("Discard draft changes and open this patrol path?")) return;
    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = "Opening...";
    try {
      elements.walkerAuditDialog.close();
      const changingMap = state.mapId !== finding.mapId;
      state.mapId = finding.mapId;
      if (changingMap) state.layerId = undefined;
      elements.mapSelect.value = String(finding.mapId);
      elements.mapSearch.value = "";
      elements.editableFilter.checked = false;
      const url = new URL(window.location.href);
      url.searchParams.set("mapId", String(finding.mapId));
      url.searchParams.set("walkerId", finding.routeId);
      window.history.replaceState({}, "", url);
      await loadSnapshot();
      elements.typeFilter.value = "";
      renderMarkers();
      const preferredSpotKey = finding.usages[0]?.spotKey;
      if (!selectWalkerRoute(finding.routeId, preferredSpotKey)) {
        throw new Error(`Patrol path ${finding.routeId} is no longer attached on ${finding.mapName}.`);
      }
    } catch (error) {
      showStatus(error.message || "Could not open the patrol path.", "error");
      if (!elements.walkerAuditDialog.open) elements.walkerAuditDialog.showModal();
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  function showWalkerGroundAuditError(error) {
    elements.walkerAuditStatus.hidden = false;
    elements.walkerAuditStatus.className = "spawn-audit-status error";
    elements.walkerAuditStatus.textContent = error.message || "Could not audit patrol paths.";
    elements.walkerAuditSummary.hidden = true;
    elements.walkerAuditFilters.hidden = true;
    elements.walkerAuditList.hidden = true;
  }

  function changeLayer() {
    if (!state.snapshot) return;
    state.layerId = elements.layerSelect.value;
    updateMapImage(state.snapshot.map, false);
  }

  function installSnapshot(snapshot) {
    cancelGroundLookup("update");
    cancelGroundLookup("create");
    state.snapshot = snapshot;
    state.groups = new Map(snapshot.groups.map(group => [group.key, group]));
    state.groupsByNpcId = new Map();
    for (const group of snapshot.groups) {
      const current = state.groupsByNpcId.get(group.npcId);
      if (!current || (!current.editable && group.editable)) state.groupsByNpcId.set(group.npcId, group);
    }
    state.spots = new Map(snapshot.spots.map(spot => [spot.key, spot]));
    state.drafts.clear();
    state.selectedKey = undefined;
    state.selectedNpc = undefined;
    clearWalkerRoute();
    state.nextClientKey = 1;
    const sourceCount = snapshot.map.sourceRelativePaths.length;
    elements.sourceStatus.textContent = `${sourceCount.toLocaleString()} XML source${sourceCount === 1 ? "" : "s"} · ${snapshot.revision.slice(0, 10)}`;
    elements.sourceStatus.title = snapshot.map.sourceRelativePaths.join("\n");
    elements.map.setAttribute("aria-label", `${snapshot.map.name} spawn map`);
    elements.changeReason.value = `${snapshot.map.name} spawn placement update`;
    populateLayerSelect(snapshot.map);
    updateDraftControls();
    renderInspector();
  }

  function initializeMap(mapDefinition) {
    state.leafletMap = L.map(elements.map, {
      crs: L.CRS.Simple,
      minZoom: -3,
      maxZoom: 3,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      preferCanvas: true,
      attributionControl: false,
    });
    state.renderer = L.canvas({ padding: 0.5, tolerance: 5 });
    state.walkerLayer = L.layerGroup().addTo(state.leafletMap);
    state.markerLayer = L.layerGroup().addTo(state.leafletMap);
    state.selectionLayer = L.layerGroup().addTo(state.leafletMap);
    state.leafletMap.on("click", onMapClick);
    updateMapImage(mapDefinition, true);
  }

  function populateLayerSelect(mapDefinition) {
    const preferred = mapDefinition.layers.some(layer => layer.id === state.layerId)
      ? state.layerId
      : mapDefinition.defaultLayerId;
    state.layerId = preferred;
    elements.layerSelect.innerHTML = mapDefinition.layers
      .map(layer => `<option value="${escapeHtml(layer.id)}">${escapeHtml(layer.name)}</option>`)
      .join("");
    elements.layerSelect.value = preferred;
    elements.layerControl.hidden = mapDefinition.layers.length < 2;
  }

  function updateMapImage(mapDefinition, fit) {
    const imageBounds = L.latLngBounds([0, 0], [mapDefinition.worldSize, mapDefinition.worldSize]);
    const layer = mapDefinition.layers.find(candidate => candidate.id === state.layerId) || mapDefinition.layers[0];
    if (state.imageLayer) state.imageLayer.remove();
    state.imageLayer = L.imageOverlay(layer.imageUrl, imageBounds, { interactive: false }).addTo(state.leafletMap);
    state.imageLayer.bringToBack();
    const contentBounds = imageBounds.pad(0.08);
    for (const spot of state.snapshot?.spots || []) contentBounds.extend(gameToMap(spot.x, spot.y));
    state.leafletMap.setMaxBounds(contentBounds.pad(0.05));
    if (fit) state.leafletMap.fitBounds(imageBounds, { animate: false, padding: [8, 8] });
    elements.artworkStatus.hidden = layer.assetKind === "map-window";
    elements.artworkStatus.textContent = layer.assetKind === "radar" ? "Client radar map" : "Coordinate grid";
  }

  function populateTypeFilter() {
    const current = elements.typeFilter.value;
    const types = [...new Set(state.snapshot.groups.map(group => group.npc.type || "NONE"))].sort();
    elements.typeFilter.innerHTML = `<option value="">All types</option>${types
      .map(type => `<option value="${escapeHtml(type)}">${escapeHtml(formatLabel(type))}</option>`)
      .join("")}`;
    elements.typeFilter.value = types.includes(current) ? current : "";
  }

  function effectiveEntries() {
    const entries = [];
    for (const spot of state.spots.values()) {
      const draft = state.drafts.get(spot.key);
      if (draft?.kind === "delete") continue;
      entries.push({
        ...spot,
        ...(draft?.kind === "update" ? positionFrom(draft) : {}),
        draftKind: draft?.kind,
        group: state.groups.get(spot.groupKey),
      });
    }
    for (const draft of state.drafts.values()) {
      if (draft.kind !== "create") continue;
      entries.push({
        key: draft.clientKey,
        groupKey: state.groupsByNpcId.get(draft.npcId)?.key || `new:${draft.npcId}`,
        npcId: draft.npcId,
        ...positionFrom(draft),
        randomWalk: 0,
        walkerId: "",
        staticId: 0,
        aerial: false,
        ai: "",
        anchor: "",
        state: 0,
        editable: true,
        warnings: [],
        attributes: {},
        draftKind: "create",
        group: state.groupsByNpcId.get(draft.npcId) || pseudoGroup(draft),
      });
    }
    return entries;
  }

  function renderMarkers() {
    if (!state.markerLayer || !state.snapshot) return;
    state.markerLayer.clearLayers();
    const query = elements.mapSearch.value.trim().toLocaleLowerCase();
    const type = elements.typeFilter.value;
    const editableOnly = elements.editableFilter.checked;
    const entries = effectiveEntries();
    let shown = 0;

    for (const entry of entries) {
      const group = entry.group;
      if (!group) continue;
      const searchable = `${group.npc.displayName} ${entry.npcId}`.toLocaleLowerCase();
      if (query && !searchable.includes(query)) continue;
      if (type && (group.npc.type || "NONE") !== type) continue;
      if (editableOnly && !entry.editable) continue;

      const selected = state.selectedKey === entry.key;
      const marker = L.circleMarker(gameToMap(entry.x, entry.y), markerStyle(entry, selected));
      marker.bindTooltip(tooltipHtml(entry), {
        direction: "right",
        offset: [8, 0],
        opacity: 1,
        className: "spawn-tooltip",
      });
      marker.on("click", event => {
        L.DomEvent.stopPropagation(event);
        selectSpot(entry.key);
      });
      marker.addTo(state.markerLayer);
      shown++;
    }

    const editable = entries.filter(entry => entry.editable).length;
    elements.mapStats.textContent = `${shown.toLocaleString()} shown · ${entries.length.toLocaleString()} total · ${editable.toLocaleString()} editable`;
    renderSelectionOverlay();
  }

  function markerStyle(entry, selected) {
    const draft = Boolean(entry.draftKind);
    return {
      renderer: state.renderer,
      radius: selected ? 6 : draft ? 5 : 4,
      color: selected ? "#ffffff" : draft ? "#d9fff0" : "rgba(255,255,255,.75)",
      weight: selected ? 3 : 1,
      fillColor: draft ? "#57d69b" : colorForType(entry.group?.npc.type),
      fillOpacity: entry.editable ? 0.9 : 0.48,
      opacity: 0.96,
      bubblingMouseEvents: false,
    };
  }

  function tooltipHtml(entry) {
    const group = entry.group;
    const warnings = [...(entry.warnings || [])];
    if (entry.draftKind) warnings.unshift(`${formatLabel(entry.draftKind)} draft`);
    return `
      <div class="spawn-tooltip-name">${escapeHtml(group.npc.displayName)}</div>
      <div class="spawn-tooltip-meta">ID ${entry.npcId} · Level ${group.npc.level || "?"} · ${escapeHtml(formatLabel(group.npc.type || "NONE"))}</div>
      <div class="spawn-tooltip-position">X ${formatNumber(entry.x)} · Y ${formatNumber(entry.y)} · Z ${formatNumber(entry.z)} · H ${entry.heading}</div>
      ${warnings.length ? `<div class="spawn-tooltip-warning">${escapeHtml(warnings.join(" · "))}</div>` : ""}`;
  }

  function selectSpot(key) {
    if (state.walkerSpotKey !== key && !confirmWalkerDraftDiscard("Discard draft patrol path changes?")) return;
    if (state.walkerSpotKey !== key) clearWalkerRoute();
    state.selectedKey = key;
    closePlacement();
    renderMarkers();
    renderInspector();
    const entry = selectedEntry();
    updateSelectedWalkerUrl(entry?.walkerId);
    if (entry?.walkerId) loadWalkerRoute(entry);
  }

  function selectWalkerRoute(routeId, preferredSpotKey) {
    const preferred = preferredSpotKey ? state.spots.get(preferredSpotKey) : undefined;
    const entry = preferred?.walkerId === routeId
      ? preferred
      : [...state.spots.values()].find(spot => spot.walkerId === routeId);
    if (!entry) return false;
    selectSpot(entry.key);
    return state.selectedKey === entry.key;
  }

  function deselectSpot() {
    if (!state.selectedKey) return true;
    if (!confirmWalkerDraftDiscard("Discard draft patrol path changes and clear the selection?")) return false;
    cancelGroundLookup("update");
    cancelPick();
    clearWalkerRoute();
    state.selectedKey = undefined;
    closePlacement();
    renderMarkers();
    renderInspector();
    updateSelectedWalkerUrl();
    return true;
  }

  function updateSelectedWalkerUrl(walkerId) {
    const url = new URL(window.location.href);
    url.searchParams.set("mapId", String(state.mapId));
    if (walkerId) url.searchParams.set("walkerId", walkerId);
    else url.searchParams.delete("walkerId");
    window.history.replaceState({}, "", url);
  }

  function confirmWalkerDraftDiscard(message) {
    return !walkerDraftIsDirty() || window.confirm(message);
  }

  function selectedEntry() {
    if (!state.selectedKey) return undefined;
    return effectiveEntries().find(entry => entry.key === state.selectedKey);
  }

  function renderInspector() {
    const entry = selectedEntry();
    if (!entry) {
      elements.emptyState.hidden = false;
      elements.detail.hidden = true;
      elements.noWalker.hidden = true;
      elements.walkerPanel.hidden = true;
      state.selectionLayer?.clearLayers();
      return;
    }
    const group = entry.group;
    elements.emptyState.hidden = true;
    elements.detail.hidden = false;
    elements.detailType.textContent = `${formatLabel(group.npc.type || "NONE")} · ${entry.npcId}`;
    elements.detailName.textContent = group.npc.displayName;
    elements.detailDraft.hidden = !entry.draftKind;
    elements.detailFacts.innerHTML = factsHtml([
      ["Level", group.npc.level || "-"],
      ["Rank", formatLabel(group.npc.rank || "-")],
      ["Rating", formatLabel(group.npc.rating || "-")],
      ["Respawn", group.respawnTime ? `${group.respawnTime}s` : "New group"],
      ["AI", entry.ai || group.npc.ai || "-"],
      ["Group spots", countNpcSpots(entry.npcId)],
      ["Source", sourceName(entry.sourceRelativePath || group.sourceRelativePath)],
    ]);
    const warnings = [...(entry.warnings || [])];
    elements.detailWarnings.hidden = warnings.length === 0;
    elements.detailWarnings.innerHTML = warnings.map(warning => `<span>${escapeHtml(warning)}</span>`).join("");
    elements.noWalker.hidden = Boolean(entry.walkerId) || !entry.editable || Boolean(entry.draftKind) || Boolean(state.walkerDraft);
    renderWalkerPanel(entry);
    elements.positionForm.elements.x.value = formatNumber(entry.x);
    elements.positionForm.elements.y.value = formatNumber(entry.y);
    elements.positionForm.elements.z.value = formatNumber(entry.z);
    elements.positionForm.elements.heading.value = String(entry.heading);
    clearGroundStatus("update");
    const readOnly = !entry.editable;
    for (const input of elements.positionForm.querySelectorAll("input")) input.disabled = readOnly;
    elements.stageUpdate.disabled = readOnly;
    elements.pickPosition.disabled = readOnly;
    updateGroundControl("update");
    elements.deleteSelected.disabled = readOnly;
    elements.undoSelected.hidden = !state.drafts.has(entry.key);
    renderSelectionOverlay();
  }

  function renderSelectionOverlay() {
    if (!state.selectionLayer) return;
    state.selectionLayer.clearLayers();
    const entry = selectedEntry();
    if (!entry) return;
    if (entry.randomWalk > 0) {
      L.circle(gameToMap(entry.x, entry.y), {
        renderer: state.renderer,
        radius: entry.randomWalk,
        color: "#f1c76f",
        weight: 1,
        fillColor: "#f1c76f",
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(state.selectionLayer);
    }
    const angle = entry.heading * 3 * Math.PI / 180;
    const length = 24;
    const headingEnd = gameToMap(
      entry.x + Math.cos(angle) * length,
      entry.y + Math.sin(angle) * length,
    );
    L.polyline(
      [gameToMap(entry.x, entry.y), headingEnd],
      { renderer: state.renderer, color: "#ffffff", weight: 2, opacity: 0.92, interactive: false },
    ).addTo(state.selectionLayer);
  }

  async function loadWalkerRoute(entry) {
    const requestId = ++state.walkerRequestId;
    state.walkerSpotKey = entry.key;
    state.walkerRoute = undefined;
    state.walkerError = undefined;
    renderWalkerPanel(entry);
    try {
      const result = await fetchJson(
        `/admin/api/spawn-editor/maps/${state.mapId}/walkers/${encodeURIComponent(entry.walkerId)}`,
      );
      if (requestId !== state.walkerRequestId || state.selectedKey !== entry.key) return;
      state.walkerRoute = result.route;
      renderWalkerOverlay();
      renderWalkerPanel(entry);
      fitWalkerRoute();
    } catch (error) {
      if (requestId !== state.walkerRequestId || state.selectedKey !== entry.key) return;
      state.walkerError = error.message || "Walker route could not be loaded.";
      state.walkerLayer?.clearLayers();
      renderWalkerPanel(entry);
    }
  }

  function clearWalkerRoute() {
    state.walkerRequestId++;
    state.walkerGroundRequestId++;
    state.walkerGroundBusy = false;
    state.walkerRoute = undefined;
    state.walkerSpotKey = undefined;
    state.walkerError = undefined;
    state.walkerDraft = undefined;
    state.walkerSelectedIndex = undefined;
    stopWalkerMapMode();
    state.walkerLayer?.clearLayers();
    if (elements.walkerPanel) elements.walkerPanel.hidden = true;
  }

  function renderWalkerPanel(entry) {
    const draft = state.walkerSpotKey === entry.key ? state.walkerDraft : undefined;
    const routeId = draft?.routeId || entry.walkerId;
    if (!routeId) {
      elements.walkerPanel.hidden = true;
      return;
    }
    elements.walkerPanel.hidden = false;
    elements.walkerId.textContent = routeId;
    elements.walkerId.title = routeId;
    const route = displayWalkerRoute();
    elements.walkerFit.disabled = !route;
    elements.walkerEdit.hidden = Boolean(draft) || !route || !entry.editable;
    elements.walkerEditor.hidden = !draft;
    if (!route) {
      elements.walkerStatus.hidden = false;
      elements.walkerStatus.textContent = state.walkerError || "Loading route waypoints...";
      elements.walkerStatus.className = `spawn-walker-status${state.walkerError ? " error" : ""}`;
      elements.walkerFacts.hidden = true;
      elements.walkerWarnings.hidden = true;
      elements.walkerEditor.hidden = true;
      return;
    }

    const mismatches = route.authoredSteps.filter(step => terrainMismatch(step) === "critical");
    const worst = route.authoredSteps
      .filter(step => step.terrain?.available)
      .sort((left, right) => Math.abs(right.terrain.delta) - Math.abs(left.terrain.delta))[0];
    elements.walkerStatus.hidden = true;
    elements.walkerFacts.hidden = false;
    elements.walkerFacts.innerHTML = factsHtml([
      ["Waypoints", route.effectiveStepCount === route.authoredStepCount
        ? route.authoredStepCount
        : `${route.authoredStepCount} XML / ${route.effectiveStepCount} runtime`],
      ["Loop", walkerLoopLabel(route)],
      ["Length", `${formatNumber(route.length2d)}m 2D`],
      ["Z range", `${formatNumber(route.bounds.minZ)} to ${formatNumber(route.bounds.maxZ)}`],
      ["Formation", route.pool > 1 ? `${route.formation} x${route.pool}` : "Single"],
      ["Source", sourceName(route.sourceRelativePath)],
    ]);
    const warnings = [...route.warnings];
    const mapUsage = entry.walkerId
      ? state.snapshot.spots.filter(spot => spot.walkerId === entry.walkerId).length
      : 0;
    if (mapUsage > 1) warnings.unshift(`Shared by ${mapUsage} spawns on this map; edits affect all of them`);
    if (mismatches.length > 0) {
      warnings.unshift(`${mismatches.length} waypoint${mismatches.length === 1 ? "" : "s"} more than 3m from terrain`);
    }
    if (worst && Math.abs(worst.terrain.delta) > 0.75) {
      warnings.push(`Largest terrain difference: ${signedNumber(worst.terrain.delta)}m at point ${worst.authoredIndex}`);
    }
    elements.walkerWarnings.hidden = warnings.length === 0;
    elements.walkerWarnings.innerHTML = warnings.map(warning => `<span>${escapeHtml(warning)}</span>`).join("");
    if (draft) renderWalkerEditor(entry, route);
  }

  function displayWalkerRoute() {
    return state.walkerDraft ? routeFromWalkerDraft(state.walkerDraft) : state.walkerRoute;
  }

  function renderWalkerOverlay() {
    if (!state.walkerLayer) return;
    state.walkerLayer.clearLayers();
    const route = displayWalkerRoute();
    if (!route || route.effectiveSteps.length === 0) return;

    for (let index = 0; index < route.effectiveSteps.length - 1; index++) {
      addWalkerSegment(route.effectiveSteps[index], route.effectiveSteps[index + 1], false);
    }
    if (route.closesLoop && route.effectiveSteps.length > 1) {
      addWalkerSegment(route.effectiveSteps.at(-1), route.effectiveSteps[0], true);
    }

    for (const step of route.authoredSteps) {
      const severity = terrainMismatch(step);
      const editing = Boolean(state.walkerDraft);
      const selected = editing && state.walkerSelectedIndex === step.authoredIndex - 1;
      const marker = L.marker(gameToMap(step.x, step.y), {
        icon: L.divIcon({
          className: `walker-step-icon ${editing ? "editing" : "viewer"}`,
          html: `<span class="${severity}${step.authoredIndex === 1 ? " start" : ""}${selected ? " selected" : ""}">${step.authoredIndex}</span>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
        keyboard: false,
        interactive: editing,
        riseOnHover: editing,
      });
      if (editing) {
        marker.bindTooltip(walkerStepTooltip(step), {
          direction: "right",
          offset: [11, 0],
          opacity: 1,
          className: "spawn-tooltip walker-tooltip",
        });
        marker.on("click", event => {
          L.DomEvent.stopPropagation(event);
          selectWalkerPoint(step.authoredIndex - 1);
        });
      }
      marker.addTo(state.walkerLayer);
    }
  }

  function addWalkerSegment(from, to, closing) {
    const severity = worseTerrainMismatch(from, to);
    const colors = {
      normal: "#55c9d8",
      warning: "#e4b957",
      critical: "#ff5f6d",
      unknown: "#8c9aae",
    };
    L.polyline([gameToMap(from.x, from.y), gameToMap(to.x, to.y)], {
      renderer: state.renderer,
      color: colors[severity],
      weight: severity === "critical" ? 5 : 4,
      opacity: 0.94,
      dashArray: closing ? "7 7" : undefined,
      interactive: false,
    }).addTo(state.walkerLayer);
  }

  function walkerStepTooltip(step) {
    const terrain = step.terrain?.available
      ? `Ground ${formatNumber(step.terrain.z)} · Delta ${signedNumber(step.terrain.delta)}m`
      : "Ground unavailable";
    const pause = step.restTime > 0 ? `<div class="spawn-tooltip-warning">Pause ${formatDuration(step.restTime)}</div>` : "";
    return `
      <div class="spawn-tooltip-name">Patrol point ${step.authoredIndex}</div>
      <div class="spawn-tooltip-position">X ${formatNumber(step.x)} · Y ${formatNumber(step.y)} · Z ${formatNumber(step.z)}</div>
      <div class="spawn-tooltip-meta">${escapeHtml(terrain)}</div>
      ${pause}`;
  }

  function fitWalkerRoute() {
    const steps = displayWalkerRoute()?.authoredSteps || [];
    if (!state.leafletMap || steps.length === 0) return;
    const bounds = L.latLngBounds(steps.map(step => gameToMap(step.x, step.y)));
    if (steps.length === 1) state.leafletMap.setView(bounds.getCenter(), 2, { animate: false });
    else state.leafletMap.fitBounds(bounds, { animate: false, padding: [48, 48], maxZoom: 2 });
  }

  function terrainMismatch(step) {
    if (!step?.terrain?.available) return "unknown";
    const difference = Math.abs(step.terrain.delta);
    if (difference > 3) return "critical";
    if (difference > 0.75) return "warning";
    return "normal";
  }

  function worseTerrainMismatch(left, right) {
    const severity = { unknown: 0, normal: 1, warning: 2, critical: 3 };
    const leftMismatch = terrainMismatch(left);
    const rightMismatch = terrainMismatch(right);
    if (leftMismatch === "unknown" && rightMismatch !== "unknown") return rightMismatch;
    if (rightMismatch === "unknown" && leftMismatch !== "unknown") return leftMismatch;
    return severity[leftMismatch] >= severity[rightMismatch] ? leftMismatch : rightMismatch;
  }

  function walkerLoopLabel(route) {
    if (route.loopType === "NONE") return "One way";
    if (route.loopType === "WALK_BACK") return "Walk back";
    return "Continuous";
  }

  function signedNumber(value) {
    const formatted = formatNumber(value);
    return Number(value) > 0 ? `+${formatted}` : formatted;
  }

  function formatDuration(milliseconds) {
    if (milliseconds % 1000 === 0) return `${milliseconds / 1000}s`;
    return `${formatNumber(milliseconds / 1000)}s`;
  }

  function routeFromWalkerDraft(draft) {
    const authoredSteps = draft.steps.map((step, index) => ({
      ...step,
      index: index + 1,
      authoredIndex: index + 1,
      synthesized: false,
    }));
    const effectiveSteps = authoredSteps.map(step => ({ ...step }));
    if (draft.loopType === "WALK_BACK") {
      for (let index = authoredSteps.length - 2; index > 0; index--) {
        effectiveSteps.push({ ...authoredSteps[index], index: effectiveSteps.length + 1, synthesized: true });
      }
    }
    const closesLoop = draft.loopType !== "NONE" && effectiveSteps.length > 1;
    const bounds = authoredSteps.length ? {
      minX: Math.min(...authoredSteps.map(step => step.x)),
      maxX: Math.max(...authoredSteps.map(step => step.x)),
      minY: Math.min(...authoredSteps.map(step => step.y)),
      maxY: Math.max(...authoredSteps.map(step => step.y)),
      minZ: Math.min(...authoredSteps.map(step => step.z)),
      maxZ: Math.max(...authoredSteps.map(step => step.z)),
    } : { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
    const lengths = walkerRouteLengths(effectiveSteps, closesLoop);
    return {
      id: draft.routeId,
      revision: draft.revision || "",
      sourceRelativePath: draft.sourceRelativePath,
      loopType: draft.loopType,
      pool: draft.pool,
      formation: draft.formation,
      rows: draft.rows,
      closesLoop,
      authoredStepCount: authoredSteps.length,
      effectiveStepCount: effectiveSteps.length,
      authoredSteps,
      effectiveSteps,
      bounds,
      length2d: lengths.length2d,
      length3d: lengths.length3d,
      warnings: draft.warnings || [],
    };
  }

  function walkerRouteLengths(steps, closesLoop) {
    let length2d = 0;
    let length3d = 0;
    const count = steps.length > 1 ? steps.length - 1 + (closesLoop ? 1 : 0) : 0;
    for (let index = 0; index < count; index++) {
      const from = steps[index % steps.length];
      const to = steps[(index + 1) % steps.length];
      const horizontal = Math.hypot(to.x - from.x, to.y - from.y);
      length2d += horizontal;
      length3d += Math.hypot(horizontal, to.z - from.z);
    }
    return { length2d: roundCoordinate(length2d), length3d: roundCoordinate(length3d) };
  }

  function renderWalkerEditor(entry, route) {
    const draft = state.walkerDraft;
    if (!draft) return;
    elements.walkerLoop.value = draft.loopType;
    elements.walkerDraw.textContent = state.walkerDrawMode ? "Finish drawing" : "Add points";
    elements.walkerDraw.disabled = state.walkerGroundBusy;
    elements.walkerRedraw.disabled = state.walkerGroundBusy;
    elements.walkerSnapAll.disabled = state.walkerGroundBusy || draft.steps.length === 0;
    elements.walkerDrawingStatus.hidden = !state.walkerDrawMode && !state.walkerPickMode && !state.walkerGroundBusy;
    if (state.walkerGroundBusy) elements.walkerDrawingStatus.textContent = "Resolving terrain height...";
    else if (state.walkerDrawMode) elements.walkerDrawingStatus.textContent = "Drawing: click the map to append ground-snapped waypoints. Press Escape when finished.";
    else if (state.walkerPickMode === "move") elements.walkerDrawingStatus.textContent = "Move point: click its new map position. Z will snap to terrain.";

    elements.walkerPointList.innerHTML = draft.steps.length
      ? draft.steps.map((step, index) => {
          const severity = terrainMismatch(step);
          const delta = step.terrain?.available ? `${signedNumber(step.terrain.delta)}m` : "No ground";
          return `<button class="spawn-walker-point-row ${severity}${state.walkerSelectedIndex === index ? " selected" : ""}" type="button" data-walker-point-index="${index}">
            <strong>#${index + 1}</strong>
            <span>X ${formatNumber(step.x)} · Y ${formatNumber(step.y)} · Z ${formatNumber(step.z)}</span>
            <em>${escapeHtml(delta)}</em>
          </button>`;
        }).join("")
      : `<div class="spawn-empty-state"><span>Click Add points, then draw the patrol on the map.</span></div>`;

    const selected = draft.steps[state.walkerSelectedIndex];
    elements.walkerPointForm.hidden = !selected;
    if (selected) {
      elements.walkerPointForm.elements.x.value = formatNumber(selected.x);
      elements.walkerPointForm.elements.y.value = formatNumber(selected.y);
      elements.walkerPointForm.elements.z.value = formatNumber(selected.z);
      elements.walkerPointForm.elements.restTime.value = String(selected.restTime || 0);
      const groundText = selected.terrain?.available
        ? `Ground Z ${formatNumber(selected.terrain.z)} · Difference ${signedNumber(selected.terrain.delta)}m`
        : "Terrain height is unavailable for this point.";
      elements.walkerPointGroundStatus.textContent = groundText;
      elements.walkerPointGroundStatus.className = `spawn-ground-status ${selected.terrain?.available ? (terrainMismatch(selected) === "normal" ? "success" : "warning") : "warning"}`;
      elements.walkerPointGroundStatus.hidden = false;
    }
    elements.walkerReview.disabled = state.walkerGroundBusy || draft.steps.length < 2 || !walkerDraftIsDirty();
    elements.walkerDiscard.disabled = state.walkerGroundBusy;
    elements.walkerChangeReason.value ||= `${state.snapshot.map.name} patrol path ${draft.mode === "create" ? "creation" : "update"}`;
    renderWalkerOverlay();
  }

  function editWalkerRoute() {
    const entry = selectedEntry();
    const route = state.walkerRoute;
    if (!entry || !route || !entry.editable) return;
    state.walkerDraft = {
      mode: "update",
      routeId: route.id,
      revision: route.revision,
      sourceRelativePath: route.sourceRelativePath,
      loopType: route.loopType,
      pool: route.pool,
      formation: route.formation,
      rows: [...route.rows],
      warnings: [...route.warnings],
      steps: route.authoredSteps.map(step => walkerDraftPoint(step)),
      originalSignature: walkerRouteSignature(route.loopType, route.authoredSteps),
    };
    state.walkerSelectedIndex = 0;
    elements.walkerChangeReason.value = `${state.snapshot.map.name} patrol path update`;
    refreshWalkerDraftUi();
  }

  async function createWalkerDraft() {
    const entry = selectedEntry();
    if (!entry || entry.walkerId || !entry.editable || entry.draftKind) return;
    const requestId = ++state.walkerGroundRequestId;
    state.walkerGroundBusy = true;
    state.walkerSpotKey = entry.key;
    elements.noWalker.hidden = true;
    try {
      const terrain = await lookupWalkerGround(entry.x, entry.y);
      if (requestId !== state.walkerGroundRequestId || state.selectedKey !== entry.key) return;
      const z = terrain.available ? terrain.z : entry.z;
      state.walkerDraft = {
        mode: "create",
        routeId: newWalkerRouteId(),
        revision: undefined,
        sourceRelativePath: "game-server/data/static_data/npc_walker/custom_npc_walker.xml",
        loopType: "NORMAL",
        pool: 1,
        formation: "POINT",
        rows: [],
        warnings: terrain.available ? [] : ["The starting point used the spawn Z because terrain was unavailable."],
        steps: [walkerDraftPoint({ x: entry.x, y: entry.y, z, restTime: 0, terrain })],
        originalSignature: "",
        attachSpotKey: entry.key,
        spawnRevision: state.snapshot.revision,
      };
      state.walkerSelectedIndex = 0;
      elements.walkerChangeReason.value = `${state.snapshot.map.name} patrol path creation`;
      state.walkerDrawMode = true;
    } catch (error) {
      if (requestId !== state.walkerGroundRequestId) return;
      state.walkerSpotKey = undefined;
      showStatus(error.message || "Could not start a patrol path.", "error");
    } finally {
      if (requestId === state.walkerGroundRequestId) {
        state.walkerGroundBusy = false;
        if (state.walkerDraft) {
          refreshWalkerDraftUi();
          fitWalkerRoute();
        } else {
          renderInspector();
        }
      }
    }
  }

  function updateWalkerLoop() {
    if (!state.walkerDraft) return;
    state.walkerDraft.loopType = elements.walkerLoop.value;
    refreshWalkerDraftUi();
  }

  function toggleWalkerDrawing() {
    if (!state.walkerDraft || state.walkerGroundBusy) return;
    state.walkerDrawMode = !state.walkerDrawMode;
    state.walkerPickMode = undefined;
    elements.mapShell.classList.toggle("walker-draw-mode", state.walkerDrawMode);
    refreshWalkerDraftUi();
  }

  async function redrawWalkerRoute() {
    const draft = state.walkerDraft;
    if (!draft || state.walkerGroundBusy) return;
    const anchor = draft.steps[0] || selectedEntry();
    if (!anchor) return;
    const requestId = ++state.walkerGroundRequestId;
    state.walkerGroundBusy = true;
    try {
      const terrain = await lookupWalkerGround(anchor.x, anchor.y);
      if (requestId !== state.walkerGroundRequestId || state.walkerDraft !== draft) return;
      draft.steps = [walkerDraftPoint({ ...anchor, z: terrain.available ? terrain.z : anchor.z, restTime: 0, terrain })];
      state.walkerSelectedIndex = 0;
      state.walkerDrawMode = true;
      state.walkerPickMode = undefined;
      elements.mapShell.classList.add("walker-draw-mode");
    } catch (error) {
      if (requestId !== state.walkerGroundRequestId) return;
      showStatus(error.message || "Could not reset the patrol path.", "error");
    } finally {
      finishWalkerGroundRequest(requestId);
    }
  }

  async function snapAllWalkerPoints() {
    const draft = state.walkerDraft;
    if (!draft || state.walkerGroundBusy) return;
    const requestId = ++state.walkerGroundRequestId;
    state.walkerGroundBusy = true;
    refreshWalkerDraftUi();
    try {
      const terrainValues = await Promise.all(draft.steps.map(step => lookupWalkerGround(step.x, step.y)));
      if (requestId !== state.walkerGroundRequestId || state.walkerDraft !== draft) return;
      draft.steps = draft.steps.map((step, index) => {
        const terrain = terrainValues[index];
        return walkerDraftPoint({ ...step, z: terrain.available ? terrain.z : step.z, terrain });
      });
      showStatus(`Snapped ${terrainValues.filter(value => value.available).length} patrol points to terrain.`, "success");
    } catch (error) {
      if (requestId !== state.walkerGroundRequestId) return;
      showStatus(error.message || "Could not resolve all patrol heights.", "error");
    } finally {
      finishWalkerGroundRequest(requestId);
    }
  }

  function selectWalkerPointFromList(event) {
    const button = event.target.closest("[data-walker-point-index]");
    if (!button) return;
    selectWalkerPoint(Number(button.dataset.walkerPointIndex));
  }

  function selectWalkerPoint(index) {
    if (!state.walkerDraft?.steps[index]) return;
    state.walkerSelectedIndex = index;
    refreshWalkerDraftUi();
  }

  async function updateWalkerPointFromForm(event) {
    event.preventDefault();
    const draft = state.walkerDraft;
    const index = state.walkerSelectedIndex;
    if (!draft || index === undefined || !draft.steps[index]) return;
    const fields = elements.walkerPointForm.elements;
    const point = {
      x: Number(fields.x.value),
      y: Number(fields.y.value),
      z: Number(fields.z.value),
      restTime: Number(fields.restTime.value),
    };
    if (!validateWalkerPoint(point)) return;
    const requestId = ++state.walkerGroundRequestId;
    state.walkerGroundBusy = true;
    try {
      const terrain = await lookupWalkerGround(point.x, point.y);
      if (requestId !== state.walkerGroundRequestId || state.walkerDraft !== draft) return;
      draft.steps[index] = walkerDraftPoint({ ...point, terrain });
    } catch (error) {
      if (requestId !== state.walkerGroundRequestId) return;
      showStatus(error.message || "Could not compare the waypoint with terrain.", "error");
      return;
    } finally {
      finishWalkerGroundRequest(requestId);
    }
  }

  function moveWalkerPointOnMap() {
    if (!state.walkerDraft || state.walkerSelectedIndex === undefined) return;
    state.walkerDrawMode = false;
    state.walkerPickMode = "move";
    elements.mapShell.classList.add("walker-draw-mode");
    refreshWalkerDraftUi();
  }

  async function snapSelectedWalkerPoint() {
    const draft = state.walkerDraft;
    const index = state.walkerSelectedIndex;
    const point = draft?.steps[index];
    if (!draft || index === undefined || !point || state.walkerGroundBusy) return;
    const requestId = ++state.walkerGroundRequestId;
    state.walkerGroundBusy = true;
    refreshWalkerDraftUi();
    try {
      const terrain = await lookupWalkerGround(point.x, point.y);
      if (requestId !== state.walkerGroundRequestId || state.walkerDraft !== draft) return;
      if (!terrain.available) throw new Error("No terrain surface exists at this waypoint.");
      draft.steps[index] = walkerDraftPoint({ ...point, z: terrain.z, terrain });
    } catch (error) {
      if (requestId !== state.walkerGroundRequestId) return;
      showStatus(error.message || "Could not snap the waypoint.", "error");
    } finally {
      finishWalkerGroundRequest(requestId);
    }
  }

  function deleteSelectedWalkerPoint() {
    const draft = state.walkerDraft;
    const index = state.walkerSelectedIndex;
    if (!draft || index === undefined || !draft.steps[index]) return;
    draft.steps.splice(index, 1);
    state.walkerSelectedIndex = draft.steps.length ? Math.min(index, draft.steps.length - 1) : undefined;
    refreshWalkerDraftUi();
  }

  function discardWalkerDraft() {
    if (!state.walkerDraft) return;
    const wasCreate = state.walkerDraft.mode === "create";
    state.walkerDraft = undefined;
    state.walkerSelectedIndex = undefined;
    stopWalkerMapMode();
    if (wasCreate) {
      state.walkerSpotKey = undefined;
      state.walkerLayer?.clearLayers();
    } else {
      renderWalkerOverlay();
    }
    renderInspector();
  }

  function refreshWalkerDraftUi() {
    const entry = selectedEntry();
    if (!entry || !state.walkerDraft) return;
    elements.mapShell.classList.toggle("walker-draw-mode", state.walkerDrawMode || Boolean(state.walkerPickMode));
    renderWalkerPanel(entry);
  }

  function stopWalkerMapMode() {
    state.walkerDrawMode = false;
    state.walkerPickMode = undefined;
    elements.mapShell?.classList.remove("walker-draw-mode");
  }

  function finishWalkerGroundRequest(requestId) {
    if (requestId !== state.walkerGroundRequestId) return;
    state.walkerGroundBusy = false;
    refreshWalkerDraftUi();
  }

  function walkerDraftPoint(step) {
    const terrain = step.terrain || { available: false, reason: "HEIGHTMAP_NOT_AVAILABLE" };
    return {
      x: roundWalkerCoordinate(step.x),
      y: roundWalkerCoordinate(step.y),
      z: roundWalkerCoordinate(step.z),
      restTime: Number.isInteger(step.restTime) ? step.restTime : 0,
      terrain: terrain.available
        ? { ...terrain, delta: roundWalkerCoordinate(step.z - terrain.z) }
        : { ...terrain },
    };
  }

  function walkerDraftIsDirty() {
    const draft = state.walkerDraft;
    if (!draft) return false;
    if (draft.mode === "create") return draft.steps.length > 0;
    return walkerRouteSignature(draft.loopType, draft.steps) !== draft.originalSignature;
  }

  function walkerRouteSignature(loopType, steps) {
    return JSON.stringify({
      loopType,
      steps: steps.map(step => [roundWalkerCoordinate(step.x), roundWalkerCoordinate(step.y), roundWalkerCoordinate(step.z), step.restTime || 0]),
    });
  }

  function validateWalkerPoint(point) {
    const bounds = state.snapshot.map.coordinateBounds;
    if (!Number.isFinite(point.x) || point.x < bounds.minX || point.x > bounds.maxX
      || !Number.isFinite(point.y) || point.y < bounds.minY || point.y > bounds.maxY
      || !Number.isFinite(point.z) || point.z < -10000 || point.z > 10000
      || !Number.isInteger(point.restTime) || point.restTime < 0 || point.restTime > 86400000) {
      showStatus("Waypoint coordinates or pause are outside the allowed range.", "error");
      return false;
    }
    return true;
  }

  async function lookupWalkerGround(x, y) {
    return fetchJson(
      `/admin/api/spawn-editor/maps/${state.mapId}/ground-height?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`,
    );
  }

  function newWalkerRouteId() {
    const bytes = new Uint8Array(20);
    window.crypto.getRandomValues(bytes);
    return [...bytes].map(value => value.toString(16).padStart(2, "0")).join("").toLocaleUpperCase();
  }

  function roundWalkerCoordinate(value) {
    return Math.round(Number(value) * 100000) / 100000;
  }

  async function reviewWalkerRoute() {
    const draft = state.walkerDraft;
    if (!draft || draft.steps.length < 2 || !walkerDraftIsDirty()) return;
    stopWalkerMapMode();
    refreshWalkerDraftUi();
    elements.walkerReview.disabled = true;
    try {
      const validation = await fetchJson(`/admin/api/spawn-editor/maps/${state.mapId}/walkers/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(walkerEditorChangeRequest()),
      });
      const route = displayWalkerRoute();
      const terrainFlags = route.authoredSteps.filter(step => terrainMismatch(step) === "critical").length;
      elements.walkerReviewSummary.innerHTML = [
        [validation.stepCount, "Waypoints"],
        [`${formatNumber(validation.length2d)}m`, "Route length"],
        [terrainFlags, "Terrain flags"],
      ].map(([value, label]) => `<div class="spawn-review-stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
      elements.walkerReviewDetails.innerHTML = `
        <div class="spawn-review-row">
          <span class="spawn-review-kind">${escapeHtml(validation.mode)}</span>
          <span>${escapeHtml(validation.routeId)}</span>
          <span class="spawn-review-coordinates">${escapeHtml(sourceName(validation.sourceRelativePath))}</span>
        </div>
        <div class="spawn-review-row">
          <span class="spawn-review-kind">Loop</span>
          <span>${escapeHtml(walkerLoopLabel(route))}</span>
          <span class="spawn-review-coordinates">${draft.attachSpotKey ? "Attach selected spawn" : "Existing assignment"}</span>
        </div>`;
      elements.walkerReviewDialog.showModal();
    } catch (error) {
      showStatus(error.message, "error");
      if (error.code === "STALE_WALKER_REVISION") await reloadSelectedWalkerRoute();
    } finally {
      elements.walkerReview.disabled = !walkerDraftIsDirty() || state.walkerDraft?.steps.length < 2;
    }
  }

  async function applyWalkerRoute() {
    const draft = state.walkerDraft;
    const reason = elements.walkerChangeReason.value.trim();
    if (!draft || !reason) {
      elements.walkerChangeReason.focus();
      return;
    }
    elements.walkerApply.disabled = true;
    elements.walkerApply.textContent = "Applying...";
    const selectedKey = state.selectedKey;
    try {
      const result = await fetchJson(`/admin/api/spawn-editor/maps/${state.mapId}/walkers/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...walkerEditorChangeRequest(), reason }),
      });
      elements.walkerReviewDialog.close();
      if (result.snapshot) {
        installSnapshot(result.snapshot);
        const attached = result.snapshot.spots.find(spot => spot.key === selectedKey)
          || result.snapshot.spots.find(spot => spot.walkerId === result.route.id);
        if (attached) {
          state.selectedKey = attached.key;
          state.walkerSpotKey = attached.key;
          state.walkerRoute = result.route;
        }
        renderMarkers();
        renderInspector();
      } else {
        state.walkerRoute = result.route;
        state.walkerDraft = undefined;
        state.walkerSelectedIndex = undefined;
        stopWalkerMapMode();
        renderWalkerOverlay();
        renderInspector();
      }
      fitWalkerRoute();
      showStatus(`Saved ${result.stepCount} patrol waypoints to ${sourceName(result.sourceRelativePath)}.`, "success");
    } catch (error) {
      showStatus(error.message, "error");
      if (error.code === "STALE_WALKER_REVISION") {
        elements.walkerReviewDialog.close();
        await reloadSelectedWalkerRoute();
      } else if (error.code === "WALKER_ATTACHMENT_FAILED") {
        elements.walkerReviewDialog.close();
        await loadSnapshot();
        showStatus(error.message, "error");
      }
    } finally {
      elements.walkerApply.disabled = false;
      elements.walkerApply.textContent = "Apply path to repository";
    }
  }

  function walkerEditorChangeRequest() {
    const draft = state.walkerDraft;
    return {
      mode: draft.mode,
      routeId: draft.routeId,
      revision: draft.revision,
      loopType: draft.loopType,
      steps: draft.steps.map(step => ({
        x: step.x,
        y: step.y,
        z: step.z,
        restTime: step.restTime || 0,
      })),
      attachSpotKey: draft.attachSpotKey,
      spawnRevision: draft.spawnRevision,
    };
  }

  async function reloadSelectedWalkerRoute() {
    const entry = selectedEntry();
    if (!entry?.walkerId) {
      await loadSnapshot();
      return;
    }
    state.walkerDraft = undefined;
    state.walkerSelectedIndex = undefined;
    await loadWalkerRoute(entry);
  }

  function stageUpdate(event) {
    event.preventDefault();
    const entry = selectedEntry();
    if (!entry || !entry.editable) return;
    const position = positionFromForm(elements.positionForm);
    if (!validatePosition(position)) return;
    if (entry.draftKind === "create") {
      const draft = state.drafts.get(entry.key);
      if (!draft) return;
      state.drafts.set(entry.key, { ...draft, ...position });
      updateAfterDraft("New spawn placement updated.");
      return;
    }
    const original = state.spots.get(entry.key);
    if (samePosition(original, position)) state.drafts.delete(entry.key);
    else state.drafts.set(entry.key, { kind: "update", spotKey: entry.key, ...position });
    updateAfterDraft("Spawn update staged.");
  }

  function stageDelete() {
    const entry = selectedEntry();
    if (!entry || !entry.editable) return;
    if (entry.draftKind === "create") {
      state.drafts.delete(entry.key);
      state.selectedKey = undefined;
    } else {
      state.drafts.set(entry.key, { kind: "delete", spotKey: entry.key });
      state.selectedKey = undefined;
    }
    updateAfterDraft("Spawn deletion staged.");
  }

  function undoSelected() {
    if (!state.selectedKey) return;
    const wasCreate = state.drafts.get(state.selectedKey)?.kind === "create";
    state.drafts.delete(state.selectedKey);
    if (wasCreate) state.selectedKey = undefined;
    updateAfterDraft("Draft change removed.");
  }

  function discardAll() {
    if (!state.drafts.size) return;
    state.drafts.clear();
    if (state.selectedKey?.startsWith("new:")) state.selectedKey = undefined;
    updateAfterDraft("All draft changes discarded.");
  }

  function updateAfterDraft(message) {
    updateDraftControls();
    renderMarkers();
    renderInspector();
    showStatus(message, "");
  }

  function updateDraftControls() {
    const count = state.drafts.size;
    elements.changeCount.textContent = String(count);
    elements.review.disabled = count === 0;
    elements.discardAll.disabled = count === 0;
  }

  function openPlacement() {
    if (walkerDraftIsDirty() && !window.confirm("Discard draft patrol path changes and place a new NPC?")) return;
    cancelGroundLookup("create");
    clearWalkerRoute();
    state.selectedKey = undefined;
    state.selectedNpc = undefined;
    elements.placeTitle.textContent = "Place NPC";
    elements.npcSearch.value = "";
    elements.npcResults.innerHTML = "";
    elements.selectedNpc.innerHTML = "";
    elements.placeFields.hidden = true;
    elements.placeX.value = "";
    elements.placeY.value = "";
    elements.placeZ.value = "";
    elements.placeHeading.value = "0";
    elements.placeRespawn.value = "295";
    clearGroundStatus("create");
    elements.stageCreate.disabled = true;
    elements.emptyState.hidden = true;
    elements.detail.hidden = true;
    elements.placePanel.hidden = false;
    elements.npcSearch.focus();
    renderMarkers();
  }

  function closePlacement() {
    cancelGroundLookup("create");
    cancelPick();
    elements.placePanel.hidden = true;
    if (!state.selectedKey) elements.emptyState.hidden = false;
  }

  function queueNpcSearch() {
    clearTimeout(state.searchTimer);
    const query = elements.npcSearch.value.trim();
    if (query.length < 2) {
      elements.npcResults.innerHTML = "";
      return;
    }
    state.searchTimer = setTimeout(() => searchNpcs(query), 180);
  }

  async function searchNpcs(query) {
    try {
      const result = await fetchJson(`/admin/api/spawn-editor/npcs?q=${encodeURIComponent(query)}&limit=30`);
      if (elements.npcSearch.value.trim() !== query) return;
      state.npcResults = result.npcs;
      elements.npcResults.innerHTML = result.npcs.length
        ? result.npcs.map(npc => `
            <button class="spawn-npc-result" type="button" data-npc-id="${npc.id}">
              <span><strong>${escapeHtml(npc.displayName)}</strong><br><small>${escapeHtml(formatLabel(npc.type))} · Level ${npc.level || "?"}</small></span>
              <small>${npc.id}</small>
            </button>`).join("")
        : `<div class="spawn-empty-state"><span>No matching NPC templates.</span></div>`;
    } catch (error) {
      showStatus(error.message, "error");
    }
  }

  function selectNpcResult(event) {
    const button = event.target.closest("[data-npc-id]");
    if (!button) return;
    const npcId = Number(button.dataset.npcId);
    const npc = state.npcResults.find(candidate => candidate.id === npcId);
    if (!npc) return;
    state.selectedNpc = npc;
    elements.placeTitle.textContent = npc.displayName;
    elements.selectedNpc.innerHTML = `<strong>${escapeHtml(npc.displayName)}</strong><br><span class="muted">ID ${npc.id} · ${escapeHtml(formatLabel(npc.type))} · Level ${npc.level || "?"}</span>`;
    elements.npcResults.innerHTML = "";
    elements.placeFields.hidden = false;
    const existingGroup = state.groupsByNpcId.get(npc.id);
    elements.respawnField.hidden = Boolean(existingGroup);
    if (existingGroup) {
      elements.selectedNpc.innerHTML += `<br><span class="muted">Existing group · ${existingGroup.respawnTime}s respawn${existingGroup.editable ? "" : " · Read-only"}</span>`;
    }
    updateCreateButton();
  }

  function beginPick(mode) {
    if (mode === "create" && !state.selectedNpc) return;
    const entry = mode === "update" ? selectedEntry() : undefined;
    if (mode === "update" && (!entry || !entry.editable)) return;
    state.pickMode = mode;
    elements.mapShell.classList.add("pick-mode");
    const name = state.snapshot.map.name;
    showStatus(mode === "create" ? `Select the placement position on ${name}.` : `Select the new spawn position on ${name}.`, "");
  }

  function cancelPick() {
    state.pickMode = undefined;
    elements.mapShell.classList.remove("pick-mode");
  }

  async function onMapClick(event) {
    if (!state.pickMode && !state.walkerDrawMode && !state.walkerPickMode) {
      if (!state.walkerDraft || !walkerDraftIsDirty()) deselectSpot();
      return;
    }
    const size = state.snapshot.map.worldSize;
    if (event.latlng.lat < 0 || event.latlng.lat > size || event.latlng.lng < 0 || event.latlng.lng > size) {
      showStatus("Select a position inside the mapped artwork.", "error");
      return;
    }
    const position = mapToGame(event.latlng);
    if (state.walkerDrawMode || state.walkerPickMode) {
      await captureWalkerMapPoint(roundWalkerCoordinate(position.x), roundWalkerCoordinate(position.y));
      return;
    }
    const x = roundCoordinate(position.x);
    const y = roundCoordinate(position.y);
    const mode = state.pickMode;
    if (mode === "update") {
      elements.positionForm.elements.x.value = formatNumber(x);
      elements.positionForm.elements.y.value = formatNumber(y);
    } else {
      elements.placeX.value = formatNumber(x);
      elements.placeY.value = formatNumber(y);
      updateCreateButton();
    }
    cancelPick();
    showStatus(`Map position captured at X ${formatNumber(x)}, Y ${formatNumber(y)}. Resolving ground Z.`, "");
    await resolveGroundHeight(mode, x, y, true);
  }

  async function captureWalkerMapPoint(x, y) {
    const draft = state.walkerDraft;
    if (!draft || state.walkerGroundBusy) return;
    const requestId = ++state.walkerGroundRequestId;
    const pickMode = state.walkerPickMode;
    const selectedIndex = state.walkerSelectedIndex;
    state.walkerGroundBusy = true;
    refreshWalkerDraftUi();
    try {
      const terrain = await lookupWalkerGround(x, y);
      if (requestId !== state.walkerGroundRequestId || state.walkerDraft !== draft) return;
      if (!terrain.available) {
        throw new Error("No terrain surface exists at this location. Choose another point or enter coordinates manually.");
      }
      const point = walkerDraftPoint({ x, y, z: terrain.z, restTime: 0, terrain });
      if (pickMode === "move") {
        const index = selectedIndex;
        if (index === undefined || !draft.steps[index]) return;
        point.restTime = draft.steps[index].restTime || 0;
        draft.steps[index] = point;
        state.walkerPickMode = undefined;
        elements.mapShell.classList.toggle("walker-draw-mode", state.walkerDrawMode);
      } else {
        draft.steps.push(point);
        state.walkerSelectedIndex = draft.steps.length - 1;
      }
      showStatus(`Patrol point ${state.walkerSelectedIndex + 1} snapped to ground Z ${formatNumber(terrain.z)}.`, "success");
    } catch (error) {
      if (requestId !== state.walkerGroundRequestId) return;
      showStatus(error.message || "Could not place the patrol point.", "error");
    } finally {
      finishWalkerGroundRequest(requestId);
    }
  }

  function queueGroundLookup(mode) {
    cancelGroundLookup(mode);
    clearGroundStatus(mode);
    updateGroundControl(mode);
    const position = currentGroundPosition(mode);
    if (!position) return;
    state.groundTimers[mode] = window.setTimeout(() => {
      state.groundTimers[mode] = undefined;
      resolveGroundHeight(mode, position.x, position.y, false);
    }, 260);
  }

  function groundValueEdited(mode) {
    cancelGroundLookup(mode);
    clearGroundStatus(mode);
    updateGroundControl(mode);
  }

  function snapCurrentPosition(mode) {
    const position = currentGroundPosition(mode);
    if (!position) {
      setGroundStatus(mode, "Enter valid X and Y coordinates before resolving ground Z.", "warning");
      return;
    }
    resolveGroundHeight(mode, position.x, position.y, false);
  }

  async function resolveGroundHeight(mode, x, y, announce) {
    cancelGroundLookup(mode);
    const requestId = ++state.groundRequestIds[mode];
    const mapId = state.mapId;
    state.groundLoading[mode] = true;
    setGroundStatus(mode, "Resolving terrain height...", "");
    updateGroundControl(mode);
    try {
      const result = await fetchJson(
        `/admin/api/spawn-editor/maps/${mapId}/ground-height?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`,
      );
      if (!groundRequestIsCurrent(mode, requestId, mapId, x, y)) return;

      if (result.available) {
        groundFields(mode).z.value = formatNumber(result.z);
        setGroundStatus(mode, `Ground Z ${formatNumber(result.z)} · ${result.sourceFile}`, "success");
        if (mode === "create") updateCreateButton();
        if (announce) {
          showStatus(
            `Map position captured at X ${formatNumber(x)}, Y ${formatNumber(y)}, ground Z ${formatNumber(result.z)}.`,
            "success",
          );
        }
        return;
      }

      const message = result.reason === "HEIGHTMAP_NOT_AVAILABLE"
        ? "This map has no terrain heightmap. Enter Z manually."
        : "No terrain surface exists at this position. Enter Z manually.";
      setGroundStatus(mode, message, "warning");
      if (announce) showStatus(`Map position captured at X ${formatNumber(x)}, Y ${formatNumber(y)}. ${message}`, "");
    } catch (error) {
      if (state.groundRequestIds[mode] !== requestId) return;
      setGroundStatus(mode, error.message || "Ground height lookup failed. Enter Z manually.", "error");
      if (announce) showStatus(error.message || "Ground height lookup failed.", "error");
    } finally {
      if (state.groundRequestIds[mode] === requestId) {
        state.groundLoading[mode] = false;
        updateGroundControl(mode);
        if (mode === "create") updateCreateButton();
      }
    }
  }

  function groundRequestIsCurrent(mode, requestId, mapId, x, y) {
    if (state.groundRequestIds[mode] !== requestId || state.mapId !== mapId) return false;
    const current = currentGroundPosition(mode);
    return current?.x === x && current?.y === y;
  }

  function cancelGroundLookup(mode) {
    if (state.groundTimers[mode] !== undefined) window.clearTimeout(state.groundTimers[mode]);
    state.groundTimers[mode] = undefined;
    state.groundRequestIds[mode]++;
    state.groundLoading[mode] = false;
  }

  function currentGroundPosition(mode) {
    if (!state.snapshot) return undefined;
    const fields = groundFields(mode);
    if (fields.x.value.trim() === "" || fields.y.value.trim() === "") return undefined;
    const x = Number(fields.x.value);
    const y = Number(fields.y.value);
    const bounds = state.snapshot.map.coordinateBounds;
    if (!Number.isFinite(x) || !Number.isFinite(y)
      || x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) return undefined;
    return { x, y };
  }

  function updateGroundControl(mode) {
    const fields = groundFields(mode);
    const readOnly = mode === "update" && !selectedEntry()?.editable;
    const blockedGroup = mode === "create" && state.groupsByNpcId.get(state.selectedNpc?.id)?.editable === false;
    const missingNpc = mode === "create" && !state.selectedNpc;
    fields.button.disabled = state.groundLoading[mode]
      || !currentGroundPosition(mode)
      || readOnly
      || missingNpc
      || blockedGroup;
  }

  function groundFields(mode) {
    if (mode === "create") {
      return {
        x: elements.placeX,
        y: elements.placeY,
        z: elements.placeZ,
        button: elements.placeSnapGround,
        status: elements.placeGroundStatus,
      };
    }
    return {
      x: elements.positionForm.elements.x,
      y: elements.positionForm.elements.y,
      z: elements.positionForm.elements.z,
      button: elements.snapGround,
      status: elements.groundStatus,
    };
  }

  function setGroundStatus(mode, message, kind) {
    const status = groundFields(mode).status;
    status.textContent = message;
    status.className = `spawn-ground-status${kind ? ` ${kind}` : ""}`;
    status.hidden = false;
  }

  function clearGroundStatus(mode) {
    const status = groundFields(mode).status;
    status.textContent = "";
    status.className = "spawn-ground-status";
    status.hidden = true;
  }

  function updateCreateButton() {
    const existingGroup = state.selectedNpc ? state.groupsByNpcId.get(state.selectedNpc.id) : undefined;
    const positionReady = [elements.placeX, elements.placeY, elements.placeZ, elements.placeHeading]
      .every(input => input.value !== "" && Number.isFinite(Number(input.value)));
    const respawn = Number(elements.placeRespawn.value);
    const respawnReady = Boolean(existingGroup) || (Number.isInteger(respawn) && respawn >= 1 && respawn <= 604800);
    const groupReadOnly = existingGroup?.editable === false;
    elements.placePick.disabled = !state.selectedNpc || groupReadOnly;
    elements.stageCreate.disabled = !state.selectedNpc || !positionReady || !respawnReady || groupReadOnly;
    updateGroundControl("create");
  }

  function stageCreate() {
    if (!state.selectedNpc) return;
    const position = {
      x: Number(elements.placeX.value),
      y: Number(elements.placeY.value),
      z: Number(elements.placeZ.value),
      heading: Number(elements.placeHeading.value),
    };
    if (!validatePosition(position)) return;
    const existingGroup = state.groupsByNpcId.get(state.selectedNpc.id);
    const clientKey = `new:${state.nextClientKey++}`;
    state.drafts.set(clientKey, {
      kind: "create",
      clientKey,
      npcId: state.selectedNpc.id,
      npc: state.selectedNpc,
      ...position,
      respawnTime: existingGroup ? undefined : Number(elements.placeRespawn.value),
    });
    state.selectedKey = clientKey;
    closePlacement();
    updateAfterDraft("New spawn placement staged.");
  }

  async function reviewChanges() {
    if (!state.drafts.size) return;
    elements.review.disabled = true;
    try {
      const validation = await fetchJson(`/admin/api/spawn-editor/maps/${state.mapId}/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(changeRequest()),
      });
      renderReview(validation);
      elements.reviewDialog.showModal();
    } catch (error) {
      showStatus(error.message, "error");
      if (error.code === "STALE_REVISION") await loadSnapshot();
    } finally {
      elements.review.disabled = state.drafts.size === 0;
    }
  }

  function renderReview(validation) {
    elements.reviewSummary.innerHTML = [
      [validation.created, "Created"],
      [validation.updated, "Updated"],
      [validation.deleted, "Deleted"],
    ].map(([value, label]) => `<div class="spawn-review-stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
    elements.reviewList.innerHTML = [...state.drafts.values()].map(draft => {
      const entry = draft.kind === "create" ? effectiveEntries().find(item => item.key === draft.clientKey) : state.spots.get(draft.spotKey);
      const group = draft.kind === "create" ? pseudoGroup(draft) : state.groups.get(entry.groupKey);
      const position = draft.kind === "delete" ? entry : draft;
      return `<div class="spawn-review-row">
        <span class="spawn-review-kind">${escapeHtml(draft.kind)}</span>
        <span>${escapeHtml(group.npc.displayName)}</span>
        <span class="spawn-review-coordinates">${draft.kind === "delete" ? `X ${formatNumber(position.x)} · Y ${formatNumber(position.y)}` : `X ${formatNumber(position.x)} · Y ${formatNumber(position.y)} · Z ${formatNumber(position.z)}`}</span>
      </div>`;
    }).join("");
  }

  async function applyChanges() {
    const reason = elements.changeReason.value.trim();
    if (!reason) {
      elements.changeReason.focus();
      return;
    }
    elements.applyChanges.disabled = true;
    elements.applyChanges.textContent = "Applying...";
    try {
      const result = await fetchJson(`/admin/api/spawn-editor/maps/${state.mapId}/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...changeRequest(), reason }),
      });
      elements.reviewDialog.close();
      installSnapshot(result.snapshot);
      renderMarkers();
      populateTypeFilter();
      const sourceCount = result.sourceRelativePaths.length;
      showStatus(`Saved ${result.operationCount} change${result.operationCount === 1 ? "" : "s"} to ${sourceCount} XML source${sourceCount === 1 ? "" : "s"}.`, "success");
    } catch (error) {
      showStatus(error.message, "error");
      if (error.code === "STALE_REVISION") {
        elements.reviewDialog.close();
        await loadSnapshot();
      }
    } finally {
      elements.applyChanges.disabled = false;
      elements.applyChanges.textContent = "Apply to repository";
    }
  }

  function changeRequest() {
    return {
      revision: state.snapshot.revision,
      operations: [...state.drafts.values()].map(draft => {
        if (draft.kind === "create") {
          return {
            kind: "create",
            clientKey: draft.clientKey,
            npcId: draft.npcId,
            x: draft.x,
            y: draft.y,
            z: draft.z,
            heading: draft.heading,
            respawnTime: draft.respawnTime,
          };
        }
        return draft;
      }),
    };
  }

  function pseudoGroup(draft) {
    const existing = state.groupsByNpcId.get(draft.npcId);
    if (existing) return existing;
    return {
      key: `new:${draft.npcId}`,
      npcId: draft.npcId,
      npc: draft.npc,
      respawnTime: draft.respawnTime || 0,
      pool: 0,
      handler: "",
      temporary: false,
      editable: true,
      spotCount: countNpcSpots(draft.npcId),
      attributes: {},
    };
  }

  function countNpcSpots(npcId) {
    let count = 0;
    for (const spot of state.spots.values()) {
      if (spot.npcId === npcId && state.drafts.get(spot.key)?.kind !== "delete") count++;
    }
    for (const draft of state.drafts.values()) {
      if (draft.kind === "create" && draft.npcId === npcId) count++;
    }
    return count;
  }

  function positionFrom(value) {
    return { x: value.x, y: value.y, z: value.z, heading: value.heading };
  }

  function positionFromForm(form) {
    return {
      x: Number(form.elements.x.value),
      y: Number(form.elements.y.value),
      z: Number(form.elements.z.value),
      heading: Number(form.elements.heading.value),
    };
  }

  function validatePosition(position) {
    const bounds = state.snapshot.map.coordinateBounds;
    if (!Number.isFinite(position.x) || position.x < bounds.minX || position.x > bounds.maxX
      || !Number.isFinite(position.y) || position.y < bounds.minY || position.y > bounds.maxY
      || !Number.isFinite(position.z) || position.z < -10000 || position.z > 10000
      || !Number.isInteger(position.heading) || position.heading < 0 || position.heading > 120) {
      showStatus(`X must be ${formatRange(bounds.minX, bounds.maxX)} and Y must be ${formatRange(bounds.minY, bounds.maxY)}; heading must be 0-120.`, "error");
      return false;
    }
    return true;
  }

  function samePosition(left, right) {
    return left.x === right.x && left.y === right.y && left.z === right.z && left.heading === right.heading;
  }

  function factsHtml(facts) {
    return facts.map(([label, value]) => `<div><dt>${escapeHtml(String(label))}</dt><dd title="${escapeHtml(String(value))}">${escapeHtml(String(value))}</dd></div>`).join("");
  }

  function colorForType(type) {
    if (type === "MONSTER" || type === "RAID_MONSTER") return "#f05f62";
    if (type === "GUARD" || type === "ABYSS_GUARD") return "#e0aa4e";
    if (type === "GENERAL") return "#4eb8d1";
    return "#91a1b5";
  }

  function formatLabel(value) {
    return String(value || "").replaceAll("_", " ").toLocaleLowerCase().replace(/\b\w/g, letter => letter.toLocaleUpperCase());
  }

  function formatNumber(value) {
    return String(Math.round(Number(value) * 1000) / 1000);
  }

  function roundCoordinate(value) {
    return Math.round(value * 1000) / 1000;
  }

  function gameToMap(x, y) {
    const map = state.snapshot.map;
    if (map.projection !== "calibrated-game-y-x") throw new Error(`Unsupported map projection: ${map.projection}`);
    const calibration = map.calibration;
    const imageU = (y - calibration.offsetX) * map.worldSize / calibration.mapWidth;
    const imageV = (x - calibration.offsetY) * map.worldSize / calibration.mapHeight;
    return L.latLng(map.worldSize - imageV, imageU);
  }

  function mapToGame(latlng) {
    const map = state.snapshot.map;
    if (map.projection !== "calibrated-game-y-x") throw new Error(`Unsupported map projection: ${map.projection}`);
    const calibration = map.calibration;
    return {
      x: calibration.offsetY + (map.worldSize - latlng.lat) * calibration.mapHeight / map.worldSize,
      y: calibration.offsetX + latlng.lng * calibration.mapWidth / map.worldSize,
    };
  }

  function setLoading(loading) {
    elements.mapLoading.hidden = !loading;
    elements.mapSelect.disabled = loading || state.maps.length === 0;
  }

  function mapName(mapId) {
    return state.maps.find(map => map.id === mapId)?.name || `map ${mapId}`;
  }

  function sourceName(value) {
    return String(value || "-").split("/").pop();
  }

  function formatRange(minimum, maximum) {
    return `${formatNumber(minimum)}-${formatNumber(maximum)}`;
  }

  function showStatus(message, kind) {
    elements.status.textContent = message;
    elements.status.className = `spawn-editor-status${kind ? ` ${kind}` : ""}`;
    elements.status.hidden = false;
  }

  function showFatal(error) {
    setLoading(false);
    showStatus(error.message || String(error), "error");
    elements.sourceStatus.textContent = "Repository unavailable";
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : undefined;
    if (!response.ok || !payload?.ok) {
      const error = new Error(payload?.error || `Request failed (HTTP ${response.status}).`);
      error.code = payload?.code;
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
