export function spawnEditorPage(): string {
  return `
    <section class="spawn-editor" data-spawn-editor data-map-id="220010000">
      <header class="spawn-editor-toolbar">
        <div class="spawn-editor-title">
          <a class="spawn-back" href="/admin" aria-label="Back to Admin" title="Back to Admin">&#8592;</a>
          <div>
            <h1>Spawn Editor</h1>
            <div class="spawn-source" data-source-status>Loading repository data...</div>
          </div>
        </div>
        <label class="spawn-control spawn-category-control">
          <span>Map set</span>
          <select data-map-category aria-label="Map set" disabled>
            <option value="world">World Maps</option>
            <option value="instance">Instance Maps</option>
            <option value="other">Others</option>
          </select>
        </label>
        <label class="spawn-control spawn-map-control">
          <span>Map</span>
          <select data-map-select aria-label="Map" disabled>
            <option>Loading maps...</option>
          </select>
        </label>
        <label class="spawn-control spawn-layer-control" data-layer-control hidden>
          <span>Layer</span>
          <select data-layer-select aria-label="Map layer"></select>
        </label>
        <label class="spawn-control spawn-faction-control" data-siege-faction-control hidden>
          <span>Fortress owner</span>
          <select data-siege-faction aria-label="Fortress owner"></select>
        </label>
        <label class="spawn-control spawn-search-control">
          <span>Find on map</span>
          <input type="search" data-map-search placeholder="NPC name or ID" autocomplete="off">
        </label>
        <label class="spawn-control spawn-type-control">
          <span>Type</span>
          <select data-type-filter aria-label="NPC type">
            <option value="">All types</option>
          </select>
        </label>
        <label class="spawn-toggle">
          <input type="checkbox" data-editable-filter>
          <span>Editable</span>
        </label>
        <div class="spawn-toolbar-actions">
          <button class="secondary" type="button" data-walker-audit-open>Ground review <span class="spawn-change-count" data-walker-audit-count hidden></span></button>
          <button class="secondary" type="button" data-place-toggle>Place NPC</button>
          <button class="secondary" type="button" data-discard-all disabled>Discard</button>
          <button type="button" data-review disabled>Review <span class="spawn-change-count" data-change-count>0</span></button>
        </div>
      </header>

      <div class="spawn-editor-status" data-status hidden></div>

      <div class="spawn-editor-workspace">
        <div class="spawn-map-shell">
          <div class="spawn-map" data-map aria-label="Spawn map"></div>
          <div class="spawn-map-loading" data-map-loading>
            <span class="spawn-loader"></span>
            <span data-map-loading-label>Loading map</span>
          </div>
          <div class="spawn-artwork-status" data-artwork-status hidden></div>
          <div class="spawn-map-stats" data-map-stats></div>
          <div class="spawn-map-legend" aria-label="Spawn marker legend">
            <span><i class="legend-dot monster"></i>Monster</span>
            <span><i class="legend-dot npc"></i>NPC</span>
            <span><i class="legend-dot guard"></i>Guard</span>
            <span><i class="legend-dot changed"></i>Draft</span>
          </div>
        </div>

        <aside class="spawn-inspector" data-inspector>
          <section class="spawn-empty-state" data-empty-state>
            <strong>No spawn selected</strong>
            <span data-empty-detail>Choose a marker to inspect it.</span>
          </section>

          <section class="spawn-detail" data-detail hidden>
            <div class="spawn-detail-heading">
              <div>
                <span class="spawn-eyebrow" data-detail-type></span>
                <h2 data-detail-name></h2>
              </div>
              <div class="spawn-detail-heading-actions">
                <span class="spawn-draft-state" data-detail-draft hidden>Draft</span>
                <button class="spawn-icon-button" type="button" data-detail-close aria-label="Clear spawn selection" title="Clear selection">&#215;</button>
              </div>
            </div>
            <dl class="spawn-facts" data-detail-facts></dl>
            <div class="spawn-warning-list" data-detail-warnings hidden></div>
            <div class="spawn-no-walker" data-no-walker hidden>
              <button type="button" data-walker-create>Draw patrol path</button>
            </div>
            <section class="spawn-walker-panel" data-walker-panel hidden>
              <div class="spawn-walker-heading">
                <div>
                  <span class="spawn-eyebrow">Patrol path</span>
                  <strong data-walker-id></strong>
                </div>
                <div class="spawn-walker-heading-actions">
                  <button class="secondary" type="button" data-walker-fit title="Fit patrol path on map">Fit path</button>
                  <button type="button" data-walker-edit>Edit path</button>
                </div>
              </div>
              <div class="spawn-walker-status" data-walker-status></div>
              <dl class="spawn-facts spawn-walker-facts" data-walker-facts hidden></dl>
              <div class="spawn-warning-list spawn-walker-warnings" data-walker-warnings hidden></div>
              <section class="spawn-walker-editor" data-walker-editor hidden>
                <div class="spawn-walker-editor-toolbar">
                  <label class="spawn-field">
                    <span>Route behavior</span>
                    <select data-walker-loop>
                      <option value="NORMAL">Continuous loop</option>
                      <option value="WALK_BACK">Walk back</option>
                      <option value="NONE">One way</option>
                    </select>
                  </label>
                  <div class="spawn-walker-editor-actions">
                    <button class="secondary" type="button" data-walker-draw>Add points</button>
                    <button class="secondary" type="button" data-walker-redraw>Redraw</button>
                    <button class="secondary" type="button" data-walker-snap-all>Snap all</button>
                  </div>
                </div>
                <div class="spawn-walker-drawing-status" data-walker-drawing-status hidden></div>
                <div class="spawn-walker-point-list" data-walker-point-list></div>
                <form class="spawn-walker-point-form" data-walker-point-form hidden>
                  <div class="spawn-coordinate-grid">
                    <label><span>X</span><input name="x" type="number" step="0.001" required></label>
                    <label><span>Y</span><input name="y" type="number" step="0.001" required></label>
                    <label><span>Z</span><input name="z" type="number" step="0.001" required></label>
                    <label><span>Pause ms</span><input name="restTime" type="number" min="0" max="86400000" step="1" required></label>
                  </div>
                  <div class="spawn-ground-status" data-walker-point-ground-status hidden></div>
                  <div class="spawn-position-actions">
                    <button type="submit">Update point</button>
                    <button class="secondary" type="button" data-walker-move>Move on map</button>
                    <button class="secondary" type="button" data-walker-point-snap>Snap point</button>
                    <button class="danger" type="button" data-walker-point-delete>Delete point</button>
                  </div>
                </form>
                <div class="spawn-walker-save-actions">
                  <button class="secondary" type="button" data-walker-discard>Discard path edits</button>
                  <button type="button" data-walker-review disabled>Review path</button>
                </div>
              </section>
            </section>
            <form data-position-form>
              <div class="spawn-coordinate-grid">
                <label><span>X</span><input name="x" type="number" step="0.001" required></label>
                <label><span>Y</span><input name="y" type="number" step="0.001" required></label>
                <label><span>Z</span><input name="z" type="number" step="0.001" required></label>
                <label><span>Heading</span><input name="heading" type="number" min="0" max="120" step="1" required></label>
              </div>
              <div class="spawn-ground-status" data-ground-status aria-live="polite" hidden></div>
              <div class="spawn-position-actions">
                <button type="submit" data-stage-update>Stage update</button>
                <button class="secondary" type="button" data-pick-position>Pick on map</button>
                <button class="secondary" type="button" data-snap-ground>Snap to ground</button>
                <button class="secondary" type="button" data-undo-selected hidden>Undo</button>
                <button class="danger" type="button" data-delete-selected>Delete</button>
              </div>
            </form>
          </section>

          <section class="spawn-place-panel" data-place-panel hidden>
            <div class="spawn-detail-heading">
              <div>
                <span class="spawn-eyebrow">New placement</span>
                <h2 data-place-title>Select NPC</h2>
              </div>
              <button class="spawn-icon-button" type="button" data-place-close aria-label="Close placement" title="Close">&#215;</button>
            </div>
            <label class="spawn-field">
              <span>NPC template</span>
              <input type="search" data-npc-search placeholder="Name or template ID" autocomplete="off">
            </label>
            <div class="spawn-npc-results" data-npc-results></div>
            <div data-place-fields hidden>
              <div class="spawn-selected-npc" data-selected-npc></div>
              <label class="spawn-field" data-siege-context-field hidden>
                <span>Siege context</span>
                <select data-siege-context aria-label="Siege context"></select>
              </label>
              <div class="spawn-coordinate-grid">
                <label><span>X</span><input data-place-x type="number" step="0.001" required></label>
                <label><span>Y</span><input data-place-y type="number" step="0.001" required></label>
                <label><span>Z</span><input data-place-z type="number" step="0.001" required></label>
                <label><span>Heading</span><input data-place-heading type="number" min="0" max="120" step="1" value="0" required></label>
              </div>
              <div class="spawn-ground-status" data-place-ground-status aria-live="polite" hidden></div>
              <label class="spawn-field" data-respawn-field>
                <span>Respawn seconds</span>
                <input data-place-respawn type="number" min="1" max="604800" step="1" value="295">
              </label>
              <div class="spawn-position-actions">
                <button type="button" data-stage-create disabled>Stage placement</button>
                <button class="secondary" type="button" data-place-pick>Pick on map</button>
                <button class="secondary" type="button" data-place-snap-ground>Snap to ground</button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <dialog class="spawn-review-dialog spawn-audit-dialog" data-walker-audit-dialog>
        <form method="dialog" class="spawn-review-card">
          <div class="spawn-review-header">
            <div>
              <span class="spawn-eyebrow">Terrain comparison</span>
              <h2>Patrol ground review</h2>
            </div>
            <button class="spawn-icon-button" value="cancel" aria-label="Close patrol ground review" title="Close">&#215;</button>
          </div>
          <div class="spawn-audit-status" data-walker-audit-status aria-live="polite">Loading patrol audit...</div>
          <div class="spawn-review-summary" data-walker-audit-summary hidden></div>
          <div class="spawn-audit-filters" data-walker-audit-filters hidden>
            <label class="spawn-field">
              <span>Find path</span>
              <input type="search" data-walker-audit-search placeholder="Route, map, or NPC" autocomplete="off">
            </label>
            <label class="spawn-field">
              <span>Map</span>
              <select data-walker-audit-map aria-label="Patrol audit map">
                <option value="">All maps</option>
              </select>
            </label>
          </div>
          <div class="spawn-audit-list" data-walker-audit-list hidden></div>
          <div class="spawn-review-actions">
            <button class="secondary" type="button" data-walker-audit-refresh>Rescan</button>
            <button value="cancel">Close</button>
          </div>
        </form>
      </dialog>

      <dialog class="spawn-review-dialog" data-review-dialog>
        <form method="dialog" class="spawn-review-card">
          <div class="spawn-review-header">
            <div>
              <span class="spawn-eyebrow">Repository change</span>
              <h2>Review spawn changes</h2>
            </div>
            <button class="spawn-icon-button" value="cancel" aria-label="Close review" title="Close">&#215;</button>
          </div>
          <div class="spawn-review-summary" data-review-summary></div>
          <div class="spawn-review-list" data-review-list></div>
          <label class="spawn-field">
            <span>Reason</span>
            <input data-change-reason maxlength="240" value="Spawn placement update" required>
          </label>
          <div class="spawn-review-actions">
            <button class="secondary" value="cancel">Cancel</button>
            <button type="button" data-apply-changes>Apply to repository</button>
          </div>
        </form>
      </dialog>

      <dialog class="spawn-review-dialog" data-walker-review-dialog>
        <form method="dialog" class="spawn-review-card">
          <div class="spawn-review-header">
            <div>
              <span class="spawn-eyebrow">Repository change</span>
              <h2>Review patrol path</h2>
            </div>
            <button class="spawn-icon-button" value="cancel" aria-label="Close walker review" title="Close">&#215;</button>
          </div>
          <div class="spawn-review-summary" data-walker-review-summary></div>
          <div class="spawn-review-list" data-walker-review-details></div>
          <label class="spawn-field">
            <span>Reason</span>
            <input data-walker-change-reason maxlength="240" value="Patrol path update" required>
          </label>
          <div class="spawn-review-actions">
            <button class="secondary" value="cancel">Cancel</button>
            <button type="button" data-walker-apply>Apply path to repository</button>
          </div>
        </form>
      </dialog>
    </section>`;
}
