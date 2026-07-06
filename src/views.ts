import type {
  AdminAccountDetailView,
  AdminAccountSearchResult,
  AdminBrokerReport,
  AdminCharacterDetailView,
  AdminDashboardView,
  AdminEconomyReport,
  AdminSearchResults,
  InventoryItem,
  WarehouseHubView,
  WarehouseSection,
} from "./aionData.js";
import { KINAH_ITEM_ID, transferStorageSections } from "./aionData.js";
import type { AdminAuditEntry } from "./adminAudit.js";
import type { AdminMailBundle, AdminMailBundleEntry } from "./adminMailBundles.js";
import type { AdminMailTemplate } from "./adminMailTemplates.js";
import type { PortalUser } from "./authStore.js";
import { ACCOUNT_WAREHOUSE_CAPACITY, characterWarehouseCapacity } from "./warehouseCapacity.js";

const WAREHOUSE_DISPLAY_COLUMNS = 8;

type LayoutUser = PortalUser & {
  aionAccessLevel?: number;
  isAdmin?: boolean;
};

export function layout(options: {
  title: string;
  user?: LayoutUser;
  body: string;
  notice?: string;
}): string {
  const adminLink = options.user?.isAdmin ? `<a class="nav-link" href="/admin">Admin</a>` : "";
  const nav = options.user
    ? `
      <nav>
        <a class="nav-link" href="/warehouses">Warehouses</a>
        ${adminLink}
        <form method="post" action="/logout"><button class="secondary" type="submit">Sign out</button></form>
      </nav>`
    : `
      <nav>
        <a class="nav-link" href="/login">Sign in</a>
      </nav>`;

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(options.title)} - Aion Portal</title>
      <style>
        :root {
          color-scheme: dark;
          --bg: #090d15;
          --panel: #111827;
          --panel-2: #151e2f;
          --border: #26334a;
          --border-soft: #1d2740;
          --text: #e8edf7;
          --muted: #97a5bd;
          --accent: #6bb6ff;
          --accent-strong: #2b8ae8;
          --danger: #ff8d8d;
          --good: #5de0a8;
          --gold: #ffd27a;
          --radius: 10px;
          --radius-sm: 6px;
          --shadow-sm: 0 2px 10px rgba(0, 0, 0, 0.22);
          --shadow: 0 18px 45px rgba(0, 0, 0, 0.28);
          --ring: 0 0 0 3px rgba(99, 179, 255, 0.2);
        }
        * { box-sizing: border-box; }
        @media (prefers-reduced-motion: no-preference) {
          a, button, .button, .panel, .stat, .tab-button, .pill { transition: background-color .16s ease, border-color .16s ease, color .16s ease, box-shadow .16s ease, transform .16s ease; }
        }
        [hidden] { display: none !important; }
        body {
          margin: 0;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background:
            radial-gradient(circle at 20% 0%, rgba(35, 131, 226, 0.18), transparent 28rem),
            linear-gradient(180deg, #0b0f17 0%, #0d1320 100%);
          color: var(--text);
          min-height: 100vh;
        }
        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 58px;
          padding: 0 24px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(20, 28, 44, 0.92), rgba(13, 19, 31, 0.9));
          backdrop-filter: blur(14px);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--text);
        }
        .brand:hover { text-decoration: none; }
        .brand-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 9px;
          color: white;
          background: linear-gradient(145deg, #3f9bff, #2b6fe0);
          box-shadow: 0 4px 14px rgba(43, 111, 224, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.28);
        }
        .brand strong {
          font-size: 17px;
          letter-spacing: 0.2px;
          background: linear-gradient(90deg, #eaf3ff, #a9cbff);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        nav { display: flex; align-items: center; gap: 8px; }
        nav form { margin: 0; }
        .nav-link {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 8px;
          color: var(--muted);
          font-weight: 600;
          font-size: 14px;
        }
        .nav-link:hover {
          text-decoration: none;
          color: var(--text);
          background: rgba(99, 179, 255, 0.1);
        }
        .nav-link.active {
          color: #dcebff;
          background: rgba(43, 138, 232, 0.22);
        }
        main { width: min(1120px, calc(100vw - 32px)); margin: 30px auto 56px; }
        a { color: var(--accent); text-decoration: none; }
        a:hover { text-decoration: underline; }
        h1 { margin: 0 0 6px; font-size: 28px; font-weight: 800; letter-spacing: -0.3px; }
        h1 + .muted { margin-top: 0; }
        h2 { margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.2px; }
        .panel {
          position: relative;
          min-width: 0;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.022), transparent 120px),
            rgba(17, 24, 39, 0.94);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px;
          box-shadow: var(--shadow);
        }
        .admin-stack > *, .section-stack > *, .warehouse-stack > * { min-width: 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; }
        .stat {
          display: grid;
          gap: 6px;
          padding: 16px 16px 15px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 60%),
            rgba(17, 24, 39, 0.9);
          box-shadow: var(--shadow-sm);
        }
        .stat::before {
          content: "";
          position: absolute;
          left: 0; right: 0; top: 0;
          height: 2px;
          border-radius: var(--radius) var(--radius) 0 0;
          background: linear-gradient(90deg, var(--accent), transparent 70%);
          opacity: 0.55;
        }
        .stat { position: relative; overflow: hidden; }
        .stat:hover { transform: translateY(-2px); border-color: #33456380; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3); }
        .stat-value { font-size: 28px; line-height: 1; font-weight: 800; font-variant-numeric: tabular-nums; }
        .stat .muted:first-of-type { text-transform: uppercase; letter-spacing: 0.6px; font-size: 11.5px; font-weight: 700; }
        .character { display: flex; flex-direction: column; gap: 8px; }
        .page-actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 14px 0 18px; }
        .muted { color: var(--muted); }
        .error { color: var(--danger); margin: 0 0 12px; }
        .notice { background: #13243d; border: 1px solid #285a92; border-left: 3px solid var(--accent); color: #d7eaff; padding: 11px 14px; border-radius: var(--radius-sm); margin-bottom: 16px; }
        label { display: grid; gap: 6px; margin-bottom: 12px; font-weight: 600; }
        input {
          width: 100%;
          max-width: 420px;
          padding: 10px 11px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font: inherit;
          background: #0d1422;
          color: var(--text);
        }
        textarea {
          width: 100%;
          min-height: 92px;
          padding: 10px 11px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font: inherit;
          resize: vertical;
          background: #0d1422;
          color: var(--text);
        }
        button, .button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 0 14px;
          border: 1px solid #2f8fe8;
          border-radius: var(--radius-sm);
          background: linear-gradient(180deg, #3a95ec, #2477d8);
          color: white;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.12) inset, var(--shadow-sm);
        }
        button:hover, .button:hover {
          background: linear-gradient(180deg, #4aa0f2, #2c81e4);
          text-decoration: none;
        }
        button:active, .button:active { transform: translateY(1px); }
        button:focus-visible, .button:focus-visible,
        a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
          outline: none;
          box-shadow: var(--ring);
        }
        button:disabled, .button:disabled { cursor: not-allowed; opacity: 0.5; box-shadow: none; }
        button.secondary, .button.secondary {
          border-color: var(--border);
          background: linear-gradient(180deg, #1a2436, #141d2d);
          color: var(--text);
          box-shadow: none;
        }
        button.secondary:hover, .button.secondary:hover {
          border-color: #35486a;
          background: linear-gradient(180deg, #202c42, #172134);
        }
        button.danger, .button.danger {
          border-color: #b84a55;
          background: linear-gradient(180deg, #a23744, #872e39);
          color: white;
        }
        button.danger:hover, .button.danger:hover {
          background: linear-gradient(180deg, #b23e4c, #8f303c);
        }
        .warehouse-stack { display: grid; gap: 18px; }
        .section-stack { display: grid; gap: 18px; }
        .transfer-board {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-items: start;
        }
        .transfer-board-title {
          margin: 0;
          padding: 0 2px;
          font-size: 18px;
          color: #dbe7f8;
        }
        .transfer-column { display: grid; gap: 14px; }
        .transfer-column-title {
          margin: 0;
          padding: 0 2px;
          font-size: 18px;
          color: #dbe7f8;
        }
        .tabs { display: grid; gap: 14px; }
        .tab-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
        }
        .tab-button {
          min-height: 34px;
          border-color: var(--border);
          background: #0d1422;
          color: var(--text);
        }
        .tab-button.active {
          border-color: #63b3ff;
          background: rgba(35, 131, 226, 0.26);
        }
        .tab-panel[hidden] { display: none; }
        .admin-stack { display: grid; gap: 18px; }
        .admin-mail-layout {
          display: grid;
          grid-template-columns: minmax(280px, 0.85fr) minmax(380px, 1.15fr);
          gap: 18px;
          align-items: start;
        }
        .admin-mail-mode-section[hidden],
        [data-admin-mail-mode-content][hidden],
        .admin-mail-mode-section[data-mail-mode-active="false"],
        [data-admin-mail-mode-content][data-mail-mode-active="false"],
        .admin-mail-form[data-mail-kind="item"] [data-mail-kind-panel="kinah"],
        .admin-mail-form[data-mail-kind="kinah"] [data-mail-kind-panel="item"],
        .admin-mail-layout[data-mail-kind="item"] [data-admin-mail-mode-content="kinah"],
        .admin-mail-layout[data-mail-kind="kinah"] [data-admin-mail-mode-content="item"],
        .admin-mail-layout[data-mail-kind="kinah"] [data-admin-item-browser],
        .admin-mail-form:has([data-admin-mail-kind][value="item"]:checked) [data-mail-kind-panel="kinah"],
        .admin-mail-form:has([data-admin-mail-kind][value="kinah"]:checked) [data-mail-kind-panel="item"],
        .admin-mail-layout:has([data-admin-mail-kind][value="item"]:checked) [data-admin-mail-mode-content="kinah"],
        .admin-mail-layout:has([data-admin-mail-kind][value="kinah"]:checked) [data-admin-mail-mode-content="item"],
        .admin-mail-layout:has([data-admin-mail-kind][value="kinah"]:checked) [data-admin-item-browser] {
          display: none !important;
        }
        .admin-mail-mode-section[data-mail-mode-active="true"] {
          display: grid;
        }
        .admin-mail-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          align-items: end;
        }
        .admin-mail-form .wide { grid-column: 1 / -1; }
        .admin-mail-mode-section {
          display: grid;
          gap: 12px;
        }
        fieldset.admin-mail-mode-section {
          min-width: 0;
          margin: 0;
          padding: 0;
          border: 0;
        }
        .admin-mail-mode-fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          align-items: end;
        }
        .admin-mail-kind {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .admin-mail-kind label {
          display: inline-flex;
          min-height: 36px;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: #0d1422;
        }
        .admin-mail-kind input { width: auto; }
        .admin-mail-form input,
        .admin-mail-form select,
        .admin-mail-form textarea {
          max-width: none;
        }
        .admin-selected-item {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          min-height: 58px;
          padding: 9px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: #0d1422;
        }
        .admin-selected-item img,
        .admin-item-row img {
          width: 42px;
          height: 42px;
          border-radius: 5px;
          border: 1px solid #35435f;
          background: #182031;
          object-fit: cover;
        }
        .admin-item-browser { display: grid; gap: 12px; }
        .admin-item-filters {
          display: grid;
          grid-template-columns: minmax(160px, 1.5fr) repeat(3, minmax(120px, 1fr));
          gap: 8px;
          align-items: end;
        }
        .admin-item-filters input,
        .admin-item-filters select {
          max-width: none;
        }
        .admin-item-results,
        .admin-favorite-items {
          display: grid;
          gap: 7px;
        }
        .admin-item-results {
          max-height: 460px;
          overflow: auto;
          padding-right: 4px;
        }
        .admin-item-row {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 8px;
          border: 1px solid #243149;
          border-radius: 6px;
          background: #0d1422;
        }
        .admin-item-row.favorite {
          border-color: rgba(255, 211, 99, 0.42);
          background:
            linear-gradient(180deg, rgba(255, 211, 99, 0.07), transparent),
            #0d1422;
        }
        .admin-item-main { min-width: 0; }
        .admin-item-main strong,
        .admin-selected-item strong {
          display: block;
          overflow-wrap: anywhere;
        }
        .admin-item-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 4px;
        }
        .admin-item-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }
        .admin-item-actions button {
          min-height: 30px;
          padding: 0 9px;
        }
        .admin-kinah-panel {
          display: grid;
          gap: 6px;
          min-height: 58px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 211, 99, 0.32);
          border-radius: 6px;
          background: linear-gradient(180deg, rgba(255, 211, 99, 0.08), rgba(13, 20, 34, 0.75));
        }
        .admin-bundle-panel {
          display: grid;
          gap: 14px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }
        .admin-bundle-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: end;
        }
        .admin-bundle-actions form {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: end;
          margin: 0;
        }
        .admin-bundle-actions select { min-width: 220px; }
        .admin-live-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .admin-live-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
          margin-bottom: 14px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border);
        }
        .admin-live-actions form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: end;
        }
        .admin-live-actions label { margin-bottom: 0; }
        .admin-live-actions textarea {
          min-height: 72px;
          grid-column: 1 / -1;
        }
        .admin-live-actions button { min-width: 98px; }
        .admin-live-inline-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .admin-live-inline-actions form { margin: 0; }
        .admin-live-action-status {
          min-height: 20px;
          margin-bottom: 10px;
        }
        .admin-live-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .admin-live-coords {
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .admin-detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
        }
        .admin-detail-list {
          display: grid;
          gap: 8px;
          margin: 0;
        }
        .admin-detail-list div {
          display: grid;
          grid-template-columns: minmax(100px, 0.42fr) minmax(0, 1fr);
          gap: 12px;
        }
        .admin-detail-list dt {
          color: var(--muted);
          font-weight: 600;
        }
        .admin-detail-list dd {
          margin: 0;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .admin-inspector-item {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 8px;
          align-items: center;
        }
        .admin-inspector-item img {
          width: 34px;
          height: 34px;
          border-radius: 4px;
          border: 1px solid #35435f;
          background: #182031;
          object-fit: cover;
        }
        .admin-issue-list {
          display: grid;
          gap: 8px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .admin-issue-list li {
          padding: 8px 10px;
          border: 1px solid rgba(255, 211, 99, 0.34);
          border-radius: 6px;
          background: rgba(255, 211, 99, 0.08);
        }
        .admin-issue-list li.error {
          border-color: rgba(255, 141, 141, 0.5);
          background: rgba(255, 141, 141, 0.1);
        }
        .warehouse-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }
        .warehouse-copy { display: grid; gap: 4px; }
        .empty {
          border: 1px dashed #33415a;
          border-radius: 8px;
          padding: 20px;
          color: var(--muted);
          background: rgba(13, 20, 34, 0.68);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        th, td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-soft);
          text-align: left;
          vertical-align: top;
          font-size: 14px;
        }
        thead th {
          position: sticky;
          top: 58px;
          z-index: 1;
          background: linear-gradient(180deg, #1e2a40, #1a2438);
          color: #c6d2e8;
          font-weight: 700;
          font-size: 12.5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
        }
        tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.018); }
        tr:last-child td { border-bottom: 0; }
        tbody tr:hover { background: rgba(99, 179, 255, 0.09); }
        .item-cell {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
        }
        .item-icon {
          width: 44px;
          height: 44px;
          border-radius: 6px;
          border: 1px solid #35435f;
          background: #182031;
          object-fit: cover;
          image-rendering: auto;
        }
        .slot-grid {
          display: grid;
          grid-template-columns: repeat(8, minmax(38px, 1fr));
          gap: 6px;
          padding: 10px;
          border: 1px solid #202c40;
          border-radius: 8px;
          overflow: visible;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 26px),
            #0a0f19;
        }
        .slot-cell {
          position: relative;
          aspect-ratio: 1 / 1;
          min-width: 0;
          border: 1px solid #29364d;
          border-radius: 5px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.055), transparent 40%),
            linear-gradient(315deg, rgba(0, 0, 0, 0.38), transparent 46%),
            #111827;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            inset 0 -10px 18px rgba(0, 0, 0, 0.18);
          overflow: visible;
        }
        .slot-cell.overflow {
          border-color: rgba(255, 141, 141, 0.42);
          background: rgba(80, 27, 34, 0.38);
        }
        .slot-cell.locked {
          border-color: #202a3d;
          background:
            repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 5px, transparent 5px 10px),
            #080d15;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.3);
          opacity: 0.74;
        }
        .slot-item {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
          padding: 0;
          background: transparent;
          cursor: pointer;
          z-index: 1;
        }
        .slot-item:hover,
        .slot-item:focus-visible { z-index: 30; }
        .slot-item.not-movable {
          cursor: not-allowed;
          opacity: 0.62;
        }
        .slot-item.selected {
          outline: 2px solid #63b3ff;
          outline-offset: -2px;
          background: rgba(99, 179, 255, 0.12);
        }
        .slot-item img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          padding: 4px;
        }
        .slot-item.quality-rare img { filter: drop-shadow(0 0 4px rgba(71, 158, 255, 0.45)); }
        .slot-item.quality-legend img,
        .slot-item.quality-unique img { filter: drop-shadow(0 0 5px rgba(255, 209, 99, 0.44)); }
        .slot-item.quality-epic img,
        .slot-item.quality-mythic img { filter: drop-shadow(0 0 5px rgba(206, 123, 255, 0.5)); }
        .slot-count,
        .slot-enchant {
          position: absolute;
          z-index: 1;
          font-size: 11px;
          line-height: 1;
          font-weight: 800;
          color: white;
          text-shadow: 0 1px 2px black, 0 0 4px black;
          pointer-events: none;
        }
        .slot-count { right: 5px; bottom: 5px; }
        .slot-enchant { left: 5px; top: 5px; color: #b9f6ff; }
        .item-tooltip {
          position: absolute;
          left: calc(100% + 10px);
          top: 0;
          width: min(300px, 82vw);
          padding: 12px;
          border: 1px solid rgba(226, 198, 132, 0.52);
          border-radius: 4px;
          background:
            linear-gradient(180deg, rgba(42, 46, 56, 0.97), rgba(15, 18, 25, 0.98)),
            #11151d;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          opacity: 0;
          visibility: hidden;
          transition: none;
          pointer-events: none;
          text-align: left;
        }
        .slot-cell:nth-child(8n) .item-tooltip {
          left: auto;
          right: calc(100% + 10px);
        }
        .slot-item:hover .item-tooltip,
        .slot-item:focus-visible .item-tooltip {
          opacity: 1;
          visibility: visible;
        }
        .tooltip-head {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          padding-bottom: 9px;
          border-bottom: 1px solid rgba(226, 198, 132, 0.24);
          margin-bottom: 8px;
        }
        .tooltip-head img {
          width: 42px;
          height: 42px;
          border-radius: 4px;
          border: 1px solid rgba(226, 198, 132, 0.4);
          background: #0c111a;
          object-fit: cover;
          padding: 0;
        }
        .tooltip-name {
          font-weight: 800;
          line-height: 1.18;
          overflow-wrap: anywhere;
        }
        .tooltip-grade {
          margin-top: 3px;
          font-size: 12px;
          color: #b9c3d4;
        }
        .tooltip-name.quality-common { color: #f1f4f8; }
        .tooltip-name.quality-rare { color: #6ee38c; }
        .tooltip-name.quality-legend { color: #75b7ff; }
        .tooltip-name.quality-unique { color: #d58bff; }
        .tooltip-name.quality-epic { color: #ffc261; }
        .tooltip-name.quality-mythic { color: #ff7f7f; }
        .tooltip-rows {
          display: grid;
          gap: 5px;
          font-size: 12px;
          color: #c9d2e3;
        }
        .tooltip-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }
        .tooltip-row span:first-child { color: #8f9db4; }
        .tooltip-flags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 9px;
        }
        .tooltip-flag {
          min-height: 20px;
          padding: 2px 6px;
          border: 1px solid rgba(143, 157, 180, 0.28);
          border-radius: 4px;
          color: #d8e0ef;
          background: rgba(255, 255, 255, 0.055);
          font-size: 11px;
        }
        .tooltip-flag.warn {
          border-color: rgba(255, 141, 141, 0.34);
          color: #ffdada;
          background: rgba(255, 141, 141, 0.08);
        }
        .move-target-form { margin: 0; }
        .move-target-form button {
          min-height: 32px;
          padding: 0 10px;
          white-space: nowrap;
        }
        .move-target-form button:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }
        .warehouse-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .kinah-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 10px;
          padding: 9px 10px;
          border: 1px solid #2f3e59;
          border-radius: 6px;
          background:
            linear-gradient(180deg, rgba(255, 211, 99, 0.08), transparent),
            #0d1422;
        }
        .kinah-balance {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .kinah-balance img {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid rgba(255, 211, 99, 0.38);
          background: #111827;
        }
        .kinah-balance strong {
          color: #ffd978;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .kinah-transfer-form {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 7px;
          margin: 0;
        }
        .kinah-transfer-form input {
          width: 130px;
          max-width: 38vw;
          min-height: 32px;
          padding: 6px 8px;
        }
        .kinah-transfer-form select {
          max-width: 180px;
        }
        .kinah-transfer-form button {
          min-height: 32px;
        }
        .item-name { overflow-wrap: anywhere; }
        .pill {
          display: inline-flex;
          align-items: center;
          min-height: 22px;
          padding: 0 7px;
          border-radius: 999px;
          border: 1px solid var(--border);
          font-size: 12px;
          color: var(--muted);
          background: #10192a;
        }
        .pill.online {
          color: #c3f7df;
          border-color: rgba(93, 224, 168, 0.45);
          background: rgba(93, 224, 168, 0.1);
        }
        .pill.warning {
          color: #ffe6a8;
          border-color: rgba(255, 211, 99, 0.45);
          background: rgba(255, 211, 99, 0.1);
        }
        .pill.danger {
          color: #ffdada;
          border-color: rgba(255, 141, 141, 0.5);
          background: rgba(255, 141, 141, 0.1);
        }
        select {
          min-height: 34px;
          max-width: 230px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: #0d1422;
          color: var(--text);
          font: inherit;
        }
        .transfer-form {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .notice.error {
          border-color: rgba(255, 141, 141, 0.5);
          background: rgba(255, 141, 141, 0.1);
          color: #ffdada;
        }
        .table-scroll { overflow-x: auto; }
        .admin-search {
          display: flex;
          gap: 10px;
          margin: 0 0 20px;
        }
        .admin-search-field {
          position: relative;
          flex: 1;
          min-width: 0;
        }
        .admin-search-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          display: inline-flex;
          color: var(--muted);
          pointer-events: none;
        }
        .admin-search input {
          width: 100%;
          max-width: none;
          min-height: 46px;
          padding: 10px 14px 10px 42px;
          border-radius: 10px;
          font-size: 15px;
        }
        .admin-search input:focus-visible {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(99, 179, 255, 0.18);
        }
        .admin-search button {
          min-height: 46px;
          padding: 0 22px;
          border-radius: 10px;
          font-weight: 600;
        }
        @media (max-width: 560px) {
          .admin-search { flex-direction: column; }
          .admin-search button { width: 100%; }
        }
        @media (max-width: 820px) {
          .transfer-board { grid-template-columns: 1fr; }
          .admin-mail-layout,
          .admin-item-filters { grid-template-columns: 1fr; }
          header { align-items: flex-start; flex-direction: column; gap: 10px; padding: 12px 16px; }
          nav { flex-wrap: wrap; }
        }
      </style>
    </head>
    <body>
      <header>
        <a class="brand" href="/">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2 4 7v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V7z"></path></svg>
          </span>
          <strong>Aion Portal</strong>
        </a>
        ${nav}
      </header>
      <main>
        ${options.notice ? `<div class="notice">${escapeHtml(options.notice)}</div>` : ""}
        ${options.body}
      </main>
      <script>
        (() => {
          const path = window.location.pathname;
          document.querySelectorAll(".nav-link").forEach(link => {
            const href = link.getAttribute("href") || "";
            if (href !== "/" && path === href) {
              link.classList.add("active");
            } else if (href !== "/" && path.startsWith(href + "/")) {
              link.classList.add("active");
            }
          });
        })();
        (() => {
          document.querySelectorAll("[data-tabs]").forEach(tabs => {
            const buttons = Array.from(tabs.querySelectorAll("[data-tab-target]"));
            const panels = Array.from(tabs.querySelectorAll("[data-tab-panel]"));
            const storageKey = tabs.dataset.tabsKey || "";
            const activateTab = target => {
              buttons.forEach(other => other.classList.toggle("active", other.dataset.tabTarget === target));
              panels.forEach(panel => {
                panel.hidden = panel.dataset.tabPanel !== target;
              });
            };
            if (storageKey) {
              try {
                const savedTarget = window.localStorage.getItem(storageKey);
                if (savedTarget && buttons.some(button => button.dataset.tabTarget === savedTarget)) {
                  activateTab(savedTarget);
                }
              } catch {
                // Ignore storage failures; tabs still work for the current page load.
              }
            }
            buttons.forEach(button => {
              button.addEventListener("click", () => {
                const target = button.dataset.tabTarget;
                activateTab(target);
                if (storageKey) {
                  try {
                    window.localStorage.setItem(storageKey, target);
                  } catch {
                    // Ignore storage failures; the visible tab was already changed.
                  }
                }
              });
            });
          });

          document.querySelectorAll("[data-transfer-scope]").forEach(scope => {
            const buttons = Array.from(scope.querySelectorAll(".move-target-form button"));
            const forms = Array.from(scope.querySelectorAll(".move-target-form"));
            const clearSelection = () => {
              scope.querySelectorAll(".slot-item.selected").forEach(item => item.classList.remove("selected"));
              forms.forEach(form => {
                const input = form.querySelector("input[name='itemUniqueId']");
                if (input) input.value = "";
              });
              buttons.forEach(button => {
                button.disabled = true;
              });
            };

            clearSelection();
            scope.addEventListener("click", event => {
              const item = event.target.closest("[data-transfer-item]");
              if (!item || !scope.contains(item)) return;
              event.preventDefault();
              const itemId = item.dataset.itemUniqueId || "";
              const sourceStorageId = item.dataset.storageId || "";
              const targetStorageIds = new Set((item.dataset.targetStorageIds || "").split(",").filter(Boolean));
              scope.querySelectorAll(".slot-item.selected").forEach(other => other.classList.remove("selected"));
              item.classList.add("selected");
              forms.forEach(form => {
                const input = form.querySelector("input[name='itemUniqueId']");
                const button = form.querySelector("button");
                if (input) input.value = itemId;
                if (button) {
                  const targetStorageId = form.dataset.targetStorageId || "";
                  button.disabled = !itemId || form.dataset.targetStorageId === sourceStorageId || !targetStorageIds.has(targetStorageId);
                }
              });
            });
          });

          const escapeClientHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\\"": "&quot;",
            "'": "&#039;"
          }[character]));
          const formatClientNumber = value => {
            const number = Number(value ?? 0);
            return Number.isFinite(number) ? new Intl.NumberFormat("en-US").format(number) : String(value ?? "");
          };
          const formatClientEnum = value => String(value ?? "")
            .split(/[\\s_/]+/)
            .filter(Boolean)
            .map(part => part.charAt(0).toLocaleUpperCase("en-US") + part.slice(1).toLocaleLowerCase("en-US"))
            .join(" ");

          document.querySelectorAll("[data-confirm-submit]").forEach(form => {
            form.addEventListener("submit", event => {
              if (form.dataset.adminRequiresLiveCharacter && form.dataset.liveEnabled !== "true") {
                event.preventDefault();
                window.alert("This character is not loaded online in the live game server.");
                return;
              }
              const message = form.dataset.confirmSubmit || "Continue?";
              if (!window.confirm(message)) {
                event.preventDefault();
              }
            });
          });

          document.querySelectorAll("[data-admin-live-online]").forEach(section => {
            const countNode = section.querySelector("[data-admin-live-count]");
            const updatedNode = section.querySelector("[data-admin-live-updated]");
            const contentNode = section.querySelector("[data-admin-live-content]");
            const refreshButton = section.querySelector("[data-admin-live-refresh]");
            const statusNode = section.querySelector("[data-admin-live-action-status]");
            const capabilitiesNode = section.querySelector("[data-admin-live-capabilities]");
            const notifyForm = section.querySelector("[data-admin-live-notify-form]");
            const kickForm = section.querySelector("[data-admin-live-kick-form]");
            const bindForm = section.querySelector("[data-admin-live-bind-form]");
            const exitForm = section.querySelector("[data-admin-live-exit-form]");
            const unstuckForm = section.querySelector("[data-admin-live-unstuck-form]");
            const mailboxForm = section.querySelector("[data-admin-live-mailbox-form]");
            const inventoryForm = section.querySelector("[data-admin-live-inventory-form]");
            const warehouseForm = section.querySelector("[data-admin-live-warehouse-form]");
            const reloadCacheForm = section.querySelector("[data-admin-live-reload-cache-form]");
            const broadcastForm = section.querySelector("[data-admin-live-broadcast-form]");
            const maintenanceForm = section.querySelector("[data-admin-live-maintenance-form]");
            const notifyRecipient = section.querySelector("[data-admin-live-notify-recipient]");
            const kickRecipient = section.querySelector("[data-admin-live-kick-recipient]");
            const bindRecipient = section.querySelector("[data-admin-live-bind-recipient]");
            const exitRecipient = section.querySelector("[data-admin-live-exit-recipient]");
            const unstuckRecipient = section.querySelector("[data-admin-live-unstuck-recipient]");
            const mailboxRecipient = section.querySelector("[data-admin-live-mailbox-recipient]");
            const inventoryRecipient = section.querySelector("[data-admin-live-inventory-recipient]");
            const warehouseRecipient = section.querySelector("[data-admin-live-warehouse-recipient]");

            const setActionStatus = (message, isError) => {
              if (!statusNode) return;
              statusNode.textContent = message || "";
              statusNode.className = "admin-live-action-status" + (isError ? " error" : " muted");
            };

            const postLiveAction = async (url, form) => {
              const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(new FormData(form))
              });
              const data = await response.json();
              if (!response.ok || data.ok === false) {
                throw new Error(data.error || "Live action failed.");
              }
              return data;
            };

            const setCapabilitiesStatus = (message, isError) => {
              if (!capabilitiesNode) return;
              capabilitiesNode.textContent = message || "";
              capabilitiesNode.className = isError ? "error" : "muted";
            };

            const renderCapabilities = data => {
              const endpoints = Array.isArray(data.endpoints) ? data.endpoints : [];
              const activeEndpoints = endpoints.filter(endpoint => endpoint && endpoint.deprecated !== true);
              const mutatingCount = activeEndpoints.filter(endpoint => endpoint && endpoint.mutates === true).length;
              const deprecatedCount = endpoints.length - activeEndpoints.length;
              const version = data.apiVersion ? " v" + formatClientNumber(data.apiVersion) : "";
              setCapabilitiesStatus(
                "Admin API" + version + ": " + formatClientNumber(endpoints.length) +
                  " endpoints, " + formatClientNumber(mutatingCount) +
                  " active mutating" + (deprecatedCount ? ", " + formatClientNumber(deprecatedCount) + " legacy alias" + (deprecatedCount === 1 ? "" : "es") : "") +
                  ", " + formatClientNumber(data.onlinePlayerCount || 0) + " live players",
                false
              );
            };

            const loadCapabilities = async () => {
              setCapabilitiesStatus("Checking admin API.", false);
              try {
                const response = await fetch("/admin/live/capabilities");
                const data = await response.json();
                if (!response.ok || data.ok === false) {
                  throw new Error(data.error || "Could not load admin API capabilities.");
                }
                renderCapabilities(data);
              } catch (error) {
                setCapabilitiesStatus(error.message || "Admin API status unavailable.", true);
              }
            };

            const movementText = data => {
              const actual = data.to;
              if (actual) {
                return "actual map " + formatClientNumber(actual.worldId) +
                  (actual.instanceId !== undefined ? " instance " + formatClientNumber(actual.instanceId) : "");
              }
              const destination = data.destination;
              if (destination) {
                return formatClientEnum(destination.source || "safe point") +
                  " map " + formatClientNumber(destination.worldId);
              }
              return "safe point";
            };

            const renderError = message => {
              if (countNode) countNode.textContent = "Unavailable";
              if (updatedNode) updatedNode.textContent = "";
              if (contentNode) contentNode.innerHTML = "<div class=\\"empty\\">" + escapeClientHtml(message) + "</div>";
            };

            const playerRowHtml = player => {
              const coords = formatClientNumber(player.x) + ", " + formatClientNumber(player.y) + ", " + formatClientNumber(player.z);
              const bind = player.bindPoint;
              const bindText = bind
                ? "Bind " + escapeClientHtml(formatClientEnum(bind.source || "bind-point")) + " map " + formatClientNumber(bind.worldId) +
                  " / " + formatClientNumber(bind.x) + ", " + formatClientNumber(bind.y) + ", " + formatClientNumber(bind.z)
                : "Bind point unavailable";
              return "<tr>" +
                "<td><strong>" + escapeClientHtml(player.name) + "</strong><div class=\\"muted\\">Character #" + formatClientNumber(player.characterId) + "</div></td>" +
                "<td>" + escapeClientHtml(player.accountName) + "<div class=\\"muted\\">Account #" + formatClientNumber(player.accountId) + " / access " + formatClientNumber(player.accessLevel) + "</div></td>" +
                "<td>Lvl " + formatClientNumber(player.level) + " " + escapeClientHtml(formatClientEnum(player.race)) + " " + escapeClientHtml(formatClientEnum(player.playerClass)) + "</td>" +
                "<td><span class=\\"pill\\">Map " + formatClientNumber(player.worldId) + "</span><div class=\\"muted\\">Instance " + formatClientNumber(player.instanceId) + "</div></td>" +
                "<td class=\\"admin-live-coords\\">" + coords + "<div class=\\"muted\\">Heading " + formatClientNumber(player.heading) + "</div><div class=\\"muted\\">" + bindText + "</div></td>" +
              "</tr>";
            };

            const renderPlayerSelect = (select, players) => {
              if (!select) return;
              const previousValue = select.value;
              select.innerHTML = players.length
                ? players.map(player => "<option value=\\"" + player.characterId + "\\">" + escapeClientHtml(player.name) + " / " + escapeClientHtml(formatClientEnum(player.playerClass)) + "</option>").join("")
                : "<option value=\\"\\">No live players</option>";
              if (previousValue && players.some(player => String(player.characterId) === previousValue)) {
                select.value = previousValue;
              }
              select.disabled = !players.length;
            };

            const renderPlayers = data => {
              const players = Array.isArray(data.players) ? data.players : [];
              if (countNode) countNode.textContent = formatClientNumber(data.count ?? players.length) + " live";
              if (updatedNode) {
                const updatedAt = data.at ? new Date(data.at) : new Date();
                updatedNode.textContent = "Updated " + updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              }
              renderPlayerSelect(notifyRecipient, players);
              renderPlayerSelect(kickRecipient, players);
              renderPlayerSelect(bindRecipient, players);
              renderPlayerSelect(exitRecipient, players);
              renderPlayerSelect(unstuckRecipient, players);
              renderPlayerSelect(mailboxRecipient, players);
              renderPlayerSelect(inventoryRecipient, players);
              renderPlayerSelect(warehouseRecipient, players);
              if (!contentNode) return;
              contentNode.innerHTML = players.length
                ? "<div class=\\"table-scroll\\"><table><thead><tr><th>Character</th><th>Account</th><th>Class</th><th>World</th><th>Position</th></tr></thead><tbody>" +
                  players.map(playerRowHtml).join("") +
                  "</tbody></table></div>"
                : "<div class=\\"empty\\">No live players are currently registered in the game-server world.</div>";
            };

            const loadLivePlayers = async () => {
              if (refreshButton) refreshButton.disabled = true;
              if (contentNode) contentNode.innerHTML = "<div class=\\"empty\\">Loading live player state.</div>";
              try {
                const response = await fetch("/admin/live/online-players");
                const data = await response.json();
                if (!response.ok || data.ok === false) {
                  throw new Error(data.error || "Could not load live online players.");
                }
                renderPlayers(data);
              } catch (error) {
                renderError(error.message || "Could not load live online players.");
              } finally {
                if (refreshButton) refreshButton.disabled = false;
              }
            };

            notifyForm?.addEventListener("submit", event => {
              event.preventDefault();
              const button = notifyForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Sending player notice.", false);
              postLiveAction("/admin/live/notify-player", notifyForm)
                .then(data => {
                  setActionStatus("Notice delivered to " + (data.recipientName || "player") + ".", false);
                  const messageInput = notifyForm.querySelector("[name=\\"message\\"]");
                  if (messageInput) messageInput.value = "";
                })
                .catch(error => setActionStatus(error.message || "Notice failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            kickForm?.addEventListener("submit", event => {
              event.preventDefault();
              const targetLabel = kickRecipient?.selectedOptions?.[0]?.textContent || "this player";
              if (!window.confirm("Disconnect " + targetLabel + "?")) {
                return;
              }
              const button = kickForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Disconnecting player.", false);
              postLiveAction("/admin/live/kick-player", kickForm)
                .then(data => {
                  setActionStatus("Disconnected " + (data.recipientName || "player") + ".", false);
                  const reasonInput = kickForm.querySelector("[name=\\"reason\\"]");
                  if (reasonInput) reasonInput.value = "";
                  window.setTimeout(loadLivePlayers, 600);
                })
                .catch(error => setActionStatus(error.message || "Disconnect failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            bindForm?.addEventListener("submit", event => {
              event.preventDefault();
              const targetLabel = bindRecipient?.selectedOptions?.[0]?.textContent || "this player";
              if (!window.confirm("Move " + targetLabel + " to their bind point?")) {
                return;
              }
              const button = bindForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Moving player to bind point.", false);
              postLiveAction("/admin/live/move-to-bind-point", bindForm)
                .then(data => {
                  setActionStatus("Moved " + (data.recipientName || "player") + " to bind point (" + movementText(data) + ").", false);
                  const reasonInput = bindForm.querySelector("[name=\\"reason\\"]");
                  if (reasonInput) reasonInput.value = "";
                  window.setTimeout(loadLivePlayers, 1000);
                })
                .catch(error => setActionStatus(error.message || "Move failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            exitForm?.addEventListener("submit", event => {
              event.preventDefault();
              const targetLabel = exitRecipient?.selectedOptions?.[0]?.textContent || "this player";
              if (!window.confirm("Move " + targetLabel + " to their instance exit or bind fallback?")) {
                return;
              }
              const button = exitForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Moving player to safe exit.", false);
              postLiveAction("/admin/live/move-to-instance-exit", exitForm)
                .then(data => {
                  setActionStatus("Moved " + (data.recipientName || "player") + " to " + movementText(data) + ".", false);
                  const reasonInput = exitForm.querySelector("[name=\\"reason\\"]");
                  if (reasonInput) reasonInput.value = "";
                  window.setTimeout(loadLivePlayers, 1000);
                })
                .catch(error => setActionStatus(error.message || "Move failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            unstuckForm?.addEventListener("submit", event => {
              event.preventDefault();
              const targetLabel = unstuckRecipient?.selectedOptions?.[0]?.textContent || "this player";
              if (!window.confirm("Unstuck " + targetLabel + " using instance exit or bind fallback?")) {
                return;
              }
              const button = unstuckForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Running live unstuck.", false);
              postLiveAction("/admin/live/unstuck-player", unstuckForm)
                .then(data => {
                  setActionStatus("Unstuck moved " + (data.recipientName || "player") + " to " + movementText(data) + ".", false);
                  const reasonInput = unstuckForm.querySelector("[name=\\"reason\\"]");
                  if (reasonInput) reasonInput.value = "";
                  window.setTimeout(loadLivePlayers, 1000);
                })
                .catch(error => setActionStatus(error.message || "Unstuck failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            mailboxForm?.addEventListener("submit", event => {
              event.preventDefault();
              const targetLabel = mailboxRecipient?.selectedOptions?.[0]?.textContent || "this player";
              if (!window.confirm("Refresh mailbox state for " + targetLabel + "?")) {
                return;
              }
              const button = mailboxForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Refreshing mailbox state.", false);
              postLiveAction("/admin/live/refresh-mailbox", mailboxForm)
                .then(data => {
                  const beforeTotal = data.before?.totalCount ?? 0;
                  const afterTotal = data.after?.totalCount ?? 0;
                  const afterUnread = data.after?.unreadCount ?? 0;
                  setActionStatus(
                    "Mailbox refreshed for " + (data.recipientName || "player") +
                    " (" + formatClientNumber(beforeTotal) + " -> " + formatClientNumber(afterTotal) +
                    " letters, " + formatClientNumber(afterUnread) + " unread).",
                    false
                  );
                  const reasonInput = mailboxForm.querySelector("[name=\\"reason\\"]");
                  if (reasonInput) reasonInput.value = "";
                })
                .catch(error => setActionStatus(error.message || "Mailbox refresh failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            inventoryForm?.addEventListener("submit", event => {
              event.preventDefault();
              const targetLabel = inventoryRecipient?.selectedOptions?.[0]?.textContent || "this player";
              if (!window.confirm("Refresh client inventory packets for " + targetLabel + "?")) {
                return;
              }
              const button = inventoryForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Refreshing inventory packets.", false);
              postLiveAction("/admin/live/refresh-inventory", inventoryForm)
                .then(data => {
                  const inventory = data.inventory || {};
                  setActionStatus(
                    "Inventory refreshed for " + (data.recipientName || "player") +
                    " (" + formatClientNumber(inventory.cubeItemCount || 0) + " cube items, " +
                    formatClientNumber(inventory.equippedItemCount || 0) + " equipped).",
                    false
                  );
                  const reasonInput = inventoryForm.querySelector("[name=\\"reason\\"]");
                  if (reasonInput) reasonInput.value = "";
                })
                .catch(error => setActionStatus(error.message || "Inventory refresh failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            warehouseForm?.addEventListener("submit", event => {
              event.preventDefault();
              const targetLabel = warehouseRecipient?.selectedOptions?.[0]?.textContent || "this player";
              if (!window.confirm("Refresh client warehouse packets for " + targetLabel + "?")) {
                return;
              }
              const button = warehouseForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Refreshing warehouse packets.", false);
              postLiveAction("/admin/live/refresh-warehouse", warehouseForm)
                .then(data => {
                  const warehouse = data.warehouse || {};
                  setActionStatus(
                    "Warehouse refreshed for " + (data.recipientName || "player") +
                    " (" + formatClientNumber(warehouse.characterWarehouseItemCount || 0) + " character, " +
                    formatClientNumber(warehouse.accountWarehouseItemCount || 0) + " account items).",
                    false
                  );
                  const reasonInput = warehouseForm.querySelector("[name=\\"reason\\"]");
                  if (reasonInput) reasonInput.value = "";
                })
                .catch(error => setActionStatus(error.message || "Warehouse refresh failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            reloadCacheForm?.addEventListener("submit", event => {
              event.preventDefault();
              const targetInput = reloadCacheForm.querySelector("[name=\\"target\\"]");
              const target = targetInput?.value || "selected cache";
              if (!window.confirm("Reload " + formatClientEnum(target) + " on the live game server?")) {
                return;
              }
              const button = reloadCacheForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Reloading server cache.", false);
              postLiveAction("/admin/live/reload-cache", reloadCacheForm)
                .then(data => {
                  setActionStatus("Reloaded " + formatClientEnum(data.target || target) + ". " + (data.detail || ""), false);
                  const reasonInput = reloadCacheForm.querySelector("[name=\\"reason\\"]");
                  if (reasonInput) reasonInput.value = "";
                })
                .catch(error => setActionStatus(error.message || "Reload failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            broadcastForm?.addEventListener("submit", event => {
              event.preventDefault();
              const button = broadcastForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Sending broadcast.", false);
              postLiveAction("/admin/live/broadcast-message", broadcastForm)
                .then(data => {
                  setActionStatus("Broadcast delivered to " + formatClientNumber(data.deliveredCount || 0) + " player" + (data.deliveredCount === 1 ? "" : "s") + ".", false);
                  const messageInput = broadcastForm.querySelector("[name=\\"message\\"]");
                  if (messageInput) messageInput.value = "";
                })
                .catch(error => setActionStatus(error.message || "Broadcast failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            maintenanceForm?.addEventListener("submit", event => {
              event.preventDefault();
              const minutesInput = maintenanceForm.querySelector("[name=\\"minutesUntilMaintenance\\"]");
              const minutes = minutesInput?.value || "0";
              if (!window.confirm("Schedule maintenance countdown warnings for " + minutes + " minutes from now?")) {
                return;
              }
              const button = maintenanceForm.querySelector("button[type=\\"submit\\"]");
              if (button) button.disabled = true;
              setActionStatus("Scheduling maintenance warnings.", false);
              postLiveAction("/admin/live/maintenance-warning", maintenanceForm)
                .then(data => {
                  setActionStatus("Scheduled " + formatClientNumber(data.warningCount || 0) + " maintenance warning" + (data.warningCount === 1 ? "" : "s") + ".", false);
                })
                .catch(error => setActionStatus(error.message || "Maintenance warning failed.", true))
                .finally(() => { if (button) button.disabled = false; });
            });

            refreshButton?.addEventListener("click", loadLivePlayers);
            refreshButton?.addEventListener("click", loadCapabilities);
            loadCapabilities();
            loadLivePlayers();
          });

          document.querySelectorAll("[data-admin-account-live]").forEach(section => {
            const accountId = section.dataset.accountId || "";
            const accountName = section.dataset.accountName || "account";
            const statusNode = section.querySelector("[data-admin-account-live-status]");
            const countNode = section.querySelector("[data-admin-account-live-count]");
            const checkButton = section.querySelector("[data-admin-account-live-check]");
            const refreshForm = section.querySelector("[data-admin-account-live-refresh]");
            const refreshButton = refreshForm?.querySelector("button[type=\\"submit\\"]");

            const setStatus = (message, isError) => {
              if (!statusNode) return;
              statusNode.textContent = message || "";
              statusNode.className = "admin-live-action-status" + (isError ? " error" : " muted");
            };
            const setRefreshEnabled = enabled => {
              if (refreshForm) refreshForm.dataset.liveEnabled = enabled ? "true" : "false";
              if (refreshButton) refreshButton.disabled = !enabled;
            };
            const warehouseSummary = warehouse => {
              if (!warehouse) return "";
              return " Account WH " +
                formatClientNumber(warehouse.accountWarehouseItemCount || 0) + "/" +
                formatClientNumber(warehouse.accountWarehouseLimit || 0) +
                ", Kinah " + formatClientNumber(warehouse.accountWarehouseKinah || 0) + ".";
            };
            const accountStateSummary = data => {
              const players = Array.isArray(data.players) ? data.players : [];
              const onlineCount = data.onlineCount ?? players.length;
              if (countNode) countNode.textContent = formatClientNumber(onlineCount) + " loaded";
              if (!data.loaded && !data.online && onlineCount <= 0) {
                return (data.accountName || accountName) + " is not loaded in the live game server.";
              }
              const names = players.map(player => player.name).filter(Boolean).slice(0, 4).join(", ");
              return (data.accountName || accountName) + " has " + formatClientNumber(onlineCount) +
                " loaded character" + (onlineCount === 1 ? "" : "s") +
                (names ? ": " + names + "." : ".") +
                warehouseSummary(data.warehouse);
            };
            const refreshSummary = data => {
              const players = Array.isArray(data.players) ? data.players : [];
              if (countNode) countNode.textContent = formatClientNumber(data.refreshedCount || players.length) + " refreshed";
              return "Refreshed account warehouse for " + (data.accountName || accountName) +
                " on " + formatClientNumber(data.refreshedCount || players.length) +
                " loaded character" + ((data.refreshedCount || players.length) === 1 ? "" : "s") + ".";
            };
            const loadAccountState = async () => {
              if (!accountId) {
                setRefreshEnabled(false);
                setStatus("Account id is missing.", true);
                return;
              }
              setRefreshEnabled(false);
              if (countNode) countNode.textContent = "Checking";
              setStatus("Checking live account state.", false);
              try {
                const response = await fetch("/admin/live/account-state?accountId=" + encodeURIComponent(accountId));
                const data = await response.json();
                if (!response.ok || data.ok === false) {
                  throw new Error(data.error || "Could not load live account state.");
                }
                const players = Array.isArray(data.players) ? data.players : [];
                const onlineCount = data.onlineCount ?? players.length;
                const loaded = Boolean(data.loaded || data.online || onlineCount > 0);
                setRefreshEnabled(loaded);
                setStatus(accountStateSummary(data), false);
              } catch (error) {
                if (countNode) countNode.textContent = "Unavailable";
                setRefreshEnabled(false);
                setStatus(error.message || "Could not load live account state.", true);
              }
            };
            checkButton?.addEventListener("click", loadAccountState);
            refreshForm?.addEventListener("submit", event => {
              event.preventDefault();
              if (refreshForm.dataset.liveEnabled !== "true") {
                setStatus(accountName + " is not loaded in the live game server.", true);
                return;
              }
              const confirmMessage = refreshForm.dataset.confirm;
              if (confirmMessage && !window.confirm(confirmMessage)) {
                return;
              }
              if (refreshButton) refreshButton.disabled = true;
              setStatus(refreshForm.dataset.pending || "Sending live request.", false);
              fetch(refreshForm.action, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(new FormData(refreshForm))
              })
                .then(async response => {
                  const data = await response.json();
                  if (!response.ok || data.ok === false) {
                    throw new Error(data.error || "Live action failed.");
                  }
                  return data;
                })
                .then(data => setStatus(refreshSummary(data), false))
                .catch(error => setStatus(error.message || "Live action failed.", true))
                .finally(() => { if (refreshButton) refreshButton.disabled = refreshForm.dataset.liveEnabled !== "true"; });
            });
            loadAccountState();
          });

          document.querySelectorAll("[data-admin-character-live]").forEach(section => {
            const statusNode = section.querySelector("[data-admin-character-live-status]");
            const actionForms = Array.from(section.querySelectorAll("[data-admin-character-live-form]"));
            const storageButton = section.querySelector("[data-admin-character-live-storage]");
            const setStatus = (message, isError) => {
              if (!statusNode) return;
              statusNode.textContent = message || "";
              statusNode.className = "admin-live-action-status" + (isError ? " error" : " muted");
            };
            const setActionsEnabled = enabled => {
              const characterId = section.dataset.characterId || "";
              section.dataset.liveEnabled = enabled ? "true" : "false";
              actionForms.forEach(form => {
                form.dataset.liveEnabled = enabled ? "true" : "false";
                const button = form.querySelector("button[type=\\"submit\\"]");
                if (button) button.disabled = !enabled;
              });
              if (characterId) {
                document.querySelectorAll("[data-admin-requires-live-character=\\"" + characterId + "\\"]").forEach(form => {
                  form.dataset.liveEnabled = enabled ? "true" : "false";
                  const button = form.querySelector("button[type=\\"submit\\"]");
                  if (button) button.disabled = !enabled;
                });
              }
              if (storageButton) storageButton.disabled = !enabled;
            };
            const postLiveAction = async form => {
              const response = await fetch(form.action, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(new FormData(form))
              });
              const data = await response.json();
              if (!response.ok || data.ok === false) {
                throw new Error(data.error || "Live action failed.");
              }
              return data;
            };
            const movementText = data => {
              const actual = data.to;
              if (actual) {
                return "actual map " + formatClientNumber(actual.worldId) +
                  (actual.instanceId !== undefined ? " instance " + formatClientNumber(actual.instanceId) : "");
              }
              const destination = data.destination;
              if (destination) {
                return formatClientEnum(destination.source || "safe point") +
                  " map " + formatClientNumber(destination.worldId);
              }
              return "safe point";
            };
            const successMessage = (form, data) => {
              const name = data.recipientName || section.dataset.characterName || "player";
              if (data.destination || data.to) {
                return "Moved " + name + " to " + movementText(data) + ".";
              }
              if (data.inventory) {
                return "Inventory refreshed for " + name + " (" +
                  formatClientNumber(data.inventory.cubeItemCount || 0) + " cube items, " +
                  formatClientNumber(data.inventory.equippedItemCount || 0) + " equipped).";
              }
              if (data.warehouse) {
                return "Warehouse refreshed for " + name + " (" +
                  formatClientNumber(data.warehouse.characterWarehouseItemCount || 0) + " character, " +
                  formatClientNumber(data.warehouse.accountWarehouseItemCount || 0) + " account items).";
              }
              if (data.after) {
                return "Mailbox refreshed for " + name + " (" +
                  formatClientNumber(data.after.totalCount || 0) + " letters, " +
                  formatClientNumber(data.after.unreadCount || 0) + " unread).";
              }
              return form.dataset.success || "Live action completed for " + name + ".";
            };
            const storageSummary = data => {
              const name = data.recipientName || section.dataset.characterName || "player";
              const inventory = data.inventory || {};
              const warehouse = data.warehouse || {};
              const mailbox = data.mailbox || {};
              const position = data.position || {};
              const mapText = position.worldId ? " map " + formatClientNumber(position.worldId) : "";
              return "Live storage for " + name + mapText + ": " +
                formatClientNumber(inventory.cubeItemCount || 0) + "/" + formatClientNumber(inventory.cubeLimit || 0) + " cube, " +
                formatClientNumber(inventory.equippedItemCount || 0) + " equipped, " +
                formatClientNumber(warehouse.characterWarehouseItemCount || 0) + "/" + formatClientNumber(warehouse.characterWarehouseLimit || 0) + " character WH, " +
                formatClientNumber(warehouse.accountWarehouseItemCount || 0) + "/" + formatClientNumber(warehouse.accountWarehouseLimit || 0) + " account WH, " +
                formatClientNumber(mailbox.totalCount || 0) + " mailbox letters.";
            };
            const livePlayerSummary = player => {
              if (!player) return "";
              const coords = formatClientNumber(player.x) + ", " + formatClientNumber(player.y) + ", " + formatClientNumber(player.z);
              const bind = player.bindPoint;
              const bindText = bind
                ? " Bind " + formatClientEnum(bind.source || "bind-point") + " map " + formatClientNumber(bind.worldId) + "."
                : "";
              return "Online on map " + formatClientNumber(player.worldId) +
                " instance " + formatClientNumber(player.instanceId) +
                " at " + coords + "." + bindText;
            };
            const loadCharacterLiveState = async () => {
              const characterId = section.dataset.characterId || "";
              if (!characterId) {
                setActionsEnabled(false);
                setStatus("Character id is missing.", true);
                return;
              }
              setActionsEnabled(false);
              setStatus("Checking live game-server state.", false);
              try {
                const response = await fetch("/admin/live/player-state?recipientCharacterId=" + encodeURIComponent(characterId));
                const data = await response.json();
                if (!response.ok || data.ok === false) {
                  throw new Error(data.error || "Could not load live character state.");
                }
                if (data.online && data.player) {
                  setActionsEnabled(true);
                  setStatus(livePlayerSummary(data.player), false);
                } else {
                  const lastKnown = data.lastKnown;
                  const lastKnownText = lastKnown
                    ? " Last known map " + formatClientNumber(lastKnown.worldId) +
                      " at " + formatClientNumber(lastKnown.x) + ", " + formatClientNumber(lastKnown.y) + ", " + formatClientNumber(lastKnown.z) + "."
                    : "";
                  setActionsEnabled(false);
                  setStatus((data.recipientName || section.dataset.characterName || "Character") + " is not loaded online in the live game server." + lastKnownText, false);
                }
              } catch (error) {
                setActionsEnabled(false);
                setStatus(error.message || "Could not load live character state.", true);
              }
            };

            actionForms.forEach(form => {
              form.addEventListener("submit", event => {
                event.preventDefault();
                if (form.dataset.liveEnabled !== "true") {
                  setStatus((section.dataset.characterName || "Character") + " is not loaded online in the live game server.", true);
                  return;
                }
                const confirmMessage = form.dataset.confirm;
                if (confirmMessage && !window.confirm(confirmMessage)) {
                  return;
                }
                const button = form.querySelector("button[type=\\"submit\\"]");
                if (button) button.disabled = true;
                setStatus(form.dataset.pending || "Sending live request.", false);
                postLiveAction(form)
                  .then(data => setStatus(successMessage(form, data), false))
                  .catch(error => setStatus(error.message || "Live action failed.", true))
                  .finally(() => { if (button) button.disabled = false; });
              });
            });
            storageButton?.addEventListener("click", () => {
              const characterId = section.dataset.characterId || "";
              if (!characterId || storageButton.disabled) {
                return;
              }
              storageButton.disabled = true;
              setStatus("Reading live inventory, warehouse, and mailbox state.", false);
              fetch("/admin/live/player-storage-state?recipientCharacterId=" + encodeURIComponent(characterId))
                .then(async response => {
                  const data = await response.json();
                  if (!response.ok || data.ok === false) {
                    throw new Error(data.error || "Live storage state failed.");
                  }
                  return data;
                })
                .then(data => setStatus(storageSummary(data), false))
                .catch(error => setStatus(error.message || "Live storage state failed.", true))
                .finally(() => { storageButton.disabled = section.dataset.liveEnabled !== "true"; });
            });
            loadCharacterLiveState();
          });

          document.querySelectorAll("[data-admin-mail-form]").forEach(form => {
            const layout = form.closest("[data-admin-mail-layout]");
            const itemBrowser = layout?.querySelector("[data-admin-item-browser]");
            const modeContent = Array.from(layout?.querySelectorAll("[data-admin-mail-mode-content]") ?? []);
            const mailModeInputs = Array.from(form.querySelectorAll("[data-admin-mail-kind]"));
            const itemPanels = Array.from(form.querySelectorAll("[data-mail-kind-panel=\\"item\\"]"));
            const kinahPanels = Array.from(form.querySelectorAll("[data-mail-kind-panel=\\"kinah\\"]"));
            const itemFields = Array.from(form.querySelectorAll("[data-admin-item-field]"));
            const kinahFields = Array.from(form.querySelectorAll("[data-admin-kinah-field]"));
            const submitButton = form.querySelector("[data-admin-mail-submit]");
            const checkButton = form.querySelector("[data-admin-mail-check]");
            const checkStatusNode = form.querySelector("[data-admin-mail-check-status]");

            const setMailCheckStatus = (message, isError) => {
              if (!checkStatusNode) return;
              checkStatusNode.textContent = message || "";
              checkStatusNode.className = "wide admin-live-action-status" + (isError ? " error" : " muted");
            };

            const setPanelActive = (panel, active) => {
              panel.hidden = !active;
              panel.style.display = active ? "" : "none";
              panel.dataset.mailModeActive = active ? "true" : "false";
              panel.setAttribute("aria-hidden", active ? "false" : "true");
              panel.toggleAttribute("inert", !active);
              if ("disabled" in panel) {
                panel.disabled = !active;
              }
              panel.querySelectorAll("input, select, textarea, button").forEach(control => {
                control.disabled = !active;
              });
            };

            const setFieldsActive = (fields, active) => {
              fields.forEach(field => {
                field.disabled = !active;
                const shouldRequire = active && field.dataset.requiredWhenActive === "true";
                field.required = shouldRequire;
                field.toggleAttribute("required", shouldRequire);
              });
            };

            const syncMailKind = () => {
              const checked = form.querySelector("[data-admin-mail-kind]:checked");
              const itemMode = (checked?.value || "item") === "item";
              const mailKind = itemMode ? "item" : "kinah";
              form.dataset.mailKind = mailKind;
              setMailCheckStatus("", false);
              if (layout) layout.dataset.mailKind = mailKind;
              modeContent.forEach(panel => setPanelActive(panel, panel.dataset.adminMailModeContent === mailKind));
              if (itemBrowser) {
                setPanelActive(itemBrowser, itemMode);
              }
              itemPanels.forEach(panel => setPanelActive(panel, itemMode));
              kinahPanels.forEach(panel => setPanelActive(panel, !itemMode));
              setFieldsActive(itemFields, itemMode);
              setFieldsActive(kinahFields, !itemMode);
              if (submitButton) submitButton.textContent = itemMode ? "Send Item Mail" : "Send Kinah Mail";
            };

            const activeMailParams = () => {
              syncMailKind();
              const params = new URLSearchParams(new FormData(form));
              if (form.dataset.mailKind === "kinah") {
                params.delete("itemId");
                params.delete("itemCount");
              } else {
                params.delete("kinahAmount");
              }
              return params;
            };

            const validationMessages = data => ({
              errors: Array.isArray(data.errors) ? data.errors.filter(Boolean) : [],
              warnings: Array.isArray(data.warnings) ? data.warnings.filter(Boolean) : []
            });

            const validationSummary = data => {
              const messages = validationMessages(data);
              if (data.valid === false) {
                return "Not deliverable: " + (messages.errors.length ? messages.errors.join(" ") : "game server rejected this mail.");
              }
              const name = data.recipientName || "recipient";
              let summary = "Looks deliverable to " + name + (data.delivered === "online" ? " with live notification." : " as offline mail.");
              if (data.mailboxLimit) {
                summary += " Mailbox " + formatClientNumber(data.mailboxLetters || 0) + "/" + formatClientNumber(data.mailboxLimit) + ".";
              }
              if (data.itemName) {
                summary += " Item: " + data.itemName + ".";
              }
              if (data.kinah) {
                summary += " Kinah: " + formatClientNumber(data.kinah) + ".";
              }
              if (data.kinahCapEnabled && data.kinahCapValue) {
                summary += " Cap: " + formatClientNumber(data.kinahCapValue) + ".";
              }
              if (messages.warnings.length) {
                summary += " Warning: " + messages.warnings.join(" ");
              }
              return summary;
            };

            const checkDelivery = async () => {
              syncMailKind();
              const response = await fetch("/admin/live/validate-express-mail", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: activeMailParams()
              });
              const data = await response.json();
              if (!response.ok || data.ok === false) {
                throw new Error(data.error || "Delivery check failed.");
              }
              return data;
            };

            checkButton?.addEventListener("click", () => {
              syncMailKind();
              if (typeof form.reportValidity === "function" && !form.reportValidity()) {
                return;
              }
              checkButton.disabled = true;
              setMailCheckStatus("Checking live game-server mail rules.", false);
              checkDelivery()
                .then(data => setMailCheckStatus(validationSummary(data), data.valid === false))
                .catch(error => setMailCheckStatus(error.message || "Delivery check failed.", true))
                .finally(() => { checkButton.disabled = false; });
            });

            form.addEventListener("input", () => setMailCheckStatus("", false));
            submitButton?.addEventListener("click", () => syncMailKind());
            form.addEventListener("submit", () => syncMailKind());
            mailModeInputs.forEach(control => control.addEventListener("change", syncMailKind));
            syncMailKind();
          });

          document.querySelectorAll("[data-admin-mail-template-apply]").forEach(button => {
            button.addEventListener("click", () => {
              const form = document.querySelector("[data-admin-mail-form]");
              if (!form) return;
              const mailKind = button.dataset.mailKind === "kinah" ? "kinah" : "item";
              const radio = form.querySelector("[data-admin-mail-kind][value=\\"" + mailKind + "\\"]");
              if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event("change", { bubbles: true }));
              }
              const sender = form.querySelector("[name=\\"senderName\\"]");
              const title = form.querySelector("[name=\\"title\\"]");
              const message = form.querySelector("[name=\\"message\\"]");
              if (sender) sender.value = button.dataset.senderName || "";
              if (title) title.value = button.dataset.title || "";
              if (message) message.value = button.dataset.message || "";
            });
          });

          document.querySelectorAll("[data-admin-storage-rule-check]").forEach(button => {
            button.addEventListener("click", async () => {
              const statusNode = button.closest("td")?.querySelector("[data-admin-storage-rule-status]");
              const setStatus = (message, isError) => {
                if (!statusNode) return;
                statusNode.textContent = message || "";
                statusNode.className = isError ? "error" : "muted";
              };
              button.disabled = true;
              setStatus("Checking game-server item rules.", false);
              try {
                const body = new URLSearchParams({
                  itemId: button.dataset.itemId || "",
                  isSoulBound: button.dataset.isSoulBound || "false",
                  itemCount: button.dataset.itemCount || "",
                  currentStorageId: button.dataset.currentStorageId || "",
                  currentSlot: button.dataset.currentSlot || "",
                  currentStorageLimit: button.dataset.currentStorageLimit || ""
                });
                const response = await fetch("/admin/live/validate-item-storage", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body
                });
                const data = await response.json();
                if (!response.ok || data.ok === false) {
                  throw new Error(data.error || "Rule check failed.");
                }
                const parts = [
                  data.itemQuality ? formatClientEnum(data.itemQuality) : "",
                  data.itemGroup ? formatClientEnum(data.itemGroup) : "",
                  data.maxStackCount ? "stack " + formatClientNumber(data.maxStackCount) : "",
                  data.storableInCharacterWarehouse ? "character warehouse" : "no character warehouse",
                  data.storableInAccountWarehouse ? "account warehouse" : "no account warehouse",
                  data.tradeable ? "tradeable" : "not tradeable",
                  data.effectiveSoulBound ? "soulbound" : "",
                  data.itemCount ? (data.countAllowed === false ? "bad count" : "count ok") : "",
                  data.currentSlot ? (data.slotAllowed === false ? "bad slot" : "slot ok") : "",
                  data.limitOne ? "limit one" : "",
                  data.canSplit ? "splittable" : "",
                  data.deletable ? "deletable" : "not deletable",
                  data.kinah ? "kinah" : ""
                ].filter(Boolean);
                const problems = Array.isArray(data.errors) ? data.errors.filter(Boolean) : [];
                setStatus((data.itemName || "Item") + ": " + parts.join(", ") + (problems.length ? ". " + problems.join(" ") : "."), problems.length > 0);
              } catch (error) {
                setStatus(error.message || "Rule check failed.", true);
              } finally {
                button.disabled = false;
              }
            });
          });

          document.querySelectorAll("[data-admin-item-browser]").forEach(browser => {
            const layout = browser.closest("[data-admin-mail-layout]");
            const form = layout?.querySelector("[data-admin-mail-form]") || document.querySelector("[data-admin-mail-form]");
            if (!form) return;

            const itemIdInput = form.querySelector("[data-admin-mail-item-id]");
            const countInput = form.querySelector("[data-admin-mail-item-count]");
            const selectedItem = form.querySelector("[data-admin-selected-item]");
            const queryInput = browser.querySelector("[data-admin-item-query]");
            const categorySelect = browser.querySelector("[data-admin-item-category]");
            const typeSelect = browser.querySelector("[data-admin-item-type]");
            const qualitySelect = browser.querySelector("[data-admin-item-quality]");
            const resultsNode = browser.querySelector("[data-admin-item-results]");
            const favoritesNode = browser.querySelector("[data-admin-item-favorites]");
            const itemById = new Map();
            let searchTimer;

            const request = async (url, options) => {
              const response = await fetch(url, options);
              if (!response.ok) {
                throw new Error(await response.text());
              }
              return response.json();
            };

            const selectItem = item => {
              if (!item || !itemIdInput || !selectedItem) return;
              itemIdInput.value = String(item.id);
              if (countInput) {
                countInput.max = String(Math.max(item.maxStackCount || 1, 1));
                if (Number(countInput.value || "1") > Number(countInput.max)) {
                  countInput.value = countInput.max;
                }
              }
              selectedItem.innerHTML =
                "<img src=\\"" + escapeClientHtml(item.iconUrl) + "\\" alt=\\"\\">" +
                "<div><strong>" + escapeClientHtml(item.name) + "</strong>" +
                "<div class=\\"muted\\">#" + item.id + " / " + escapeClientHtml(formatClientEnum(item.quality || "Common")) +
                " / max " + formatClientNumber(item.maxStackCount || 1) + "</div></div>";
            };

            const optionHtml = values => "<option value=\\"\\">All</option>" + values
              .map(value => "<option value=\\"" + escapeClientHtml(value) + "\\">" + escapeClientHtml(formatClientEnum(value)) + "</option>")
              .join("");

            const itemRowHtml = item => {
              const favoriteLabel = item.favorite ? "Remove" : "Favorite";
              const favoriteAction = item.favorite ? "remove" : "add";
              const category = item.category ? formatClientEnum(item.category) : "Uncategorized";
              const type = item.itemType ? formatClientEnum(item.itemType) : "Item";
              const quality = item.quality ? formatClientEnum(item.quality) : "Common";
              return "<div class=\\"admin-item-row" + (item.favorite ? " favorite" : "") + "\\">" +
                "<img src=\\"" + escapeClientHtml(item.iconUrl) + "\\" alt=\\"\\">" +
                "<div class=\\"admin-item-main\\">" +
                  "<strong>" + escapeClientHtml(item.name) + "</strong>" +
                  "<div class=\\"muted\\">#" + item.id + (item.cName ? " / " + escapeClientHtml(item.cName) : "") + "</div>" +
                  "<div class=\\"admin-item-meta\\">" +
                    "<span class=\\"pill\\">" + escapeClientHtml(category) + "</span>" +
                    "<span class=\\"pill\\">" + escapeClientHtml(type) + "</span>" +
                    "<span class=\\"pill\\">" + escapeClientHtml(quality) + "</span>" +
                    "<span class=\\"pill\\">Lvl " + formatClientNumber(item.level || 0) + "</span>" +
                    "<span class=\\"pill\\">Stack " + formatClientNumber(item.maxStackCount || 1) + "</span>" +
                  "</div>" +
                "</div>" +
                "<div class=\\"admin-item-actions\\">" +
                  "<button type=\\"button\\" data-admin-use-item=\\"" + item.id + "\\">Use</button>" +
                  "<button class=\\"secondary\\" type=\\"button\\" data-admin-favorite-item=\\"" + item.id + "\\" data-favorite-action=\\"" + favoriteAction + "\\">" + favoriteLabel + "</button>" +
                "</div>" +
              "</div>";
            };

            const renderItems = (node, items, emptyText) => {
              if (!node) return;
              items.forEach(item => itemById.set(String(item.id), item));
              node.innerHTML = items.length
                ? items.map(itemRowHtml).join("")
                : "<div class=\\"empty\\">" + escapeClientHtml(emptyText) + "</div>";
            };

            const loadFavorites = async () => {
              const data = await request("/admin/items/favorites");
              renderItems(favoritesNode, data.items || [], "No favorite items saved.");
            };

            const runSearch = async () => {
              const params = new URLSearchParams({
                q: queryInput?.value || "",
                category: categorySelect?.value || "",
                itemType: typeSelect?.value || "",
                quality: qualitySelect?.value || ""
              });
              const data = await request("/admin/items/search?" + params.toString());
              renderItems(resultsNode, data.items || [], "No matching items.");
            };

            const scheduleSearch = () => {
              window.clearTimeout(searchTimer);
              searchTimer = window.setTimeout(() => {
                runSearch().catch(error => {
                  if (resultsNode) resultsNode.innerHTML = "<div class=\\"empty\\">" + escapeClientHtml(error.message) + "</div>";
                });
              }, 220);
            };

            const loadMeta = async () => {
              const data = await request("/admin/items/meta");
              if (categorySelect) categorySelect.innerHTML = optionHtml(data.categories || []);
              if (typeSelect) typeSelect.innerHTML = optionHtml(data.itemTypes || []);
              if (qualitySelect) qualitySelect.innerHTML = optionHtml(data.qualities || []);
            };

            browser.addEventListener("click", event => {
              const useButton = event.target.closest("[data-admin-use-item]");
              if (useButton) {
                selectItem(itemById.get(useButton.dataset.adminUseItem || ""));
                return;
              }
              const favoriteButton = event.target.closest("[data-admin-favorite-item]");
              if (favoriteButton) {
                const body = new URLSearchParams({
                  itemId: favoriteButton.dataset.adminFavoriteItem || "",
                  action: favoriteButton.dataset.favoriteAction || "toggle"
                });
                request("/admin/items/favorites", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body
                })
                  .then(() => Promise.all([loadFavorites(), runSearch()]))
                  .catch(error => {
                    if (resultsNode) resultsNode.innerHTML = "<div class=\\"empty\\">" + escapeClientHtml(error.message) + "</div>";
                  });
              }
            });

            [queryInput, categorySelect, typeSelect, qualitySelect].forEach(control => {
              control?.addEventListener("input", scheduleSearch);
              control?.addEventListener("change", scheduleSearch);
            });
            Promise.all([loadMeta(), loadFavorites()])
              .then(runSearch)
              .catch(error => {
                if (resultsNode) resultsNode.innerHTML = "<div class=\\"empty\\">" + escapeClientHtml(error.message) + "</div>";
              });
          });
        })();
      </script>
    </body>
  </html>`;
}

export function loginPage(error?: string): string {
  return `
    <h1>Sign In</h1>
    <section class="panel">
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/login">
        <label>Aion account
          <input name="username" autocomplete="username" required>
        </label>
        <label>Aion password
          <input name="password" type="password" autocomplete="current-password" required>
        </label>
        <button type="submit">Sign in</button>
      </form>
    </section>`;
}

export function registerPage(requiresCode: boolean, error?: string): string {
  return `
    <h1>Register Portal Login</h1>
    <section class="panel">
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/register">
        <label>Aion account name
          <input name="aionAccountName" autocomplete="off" required>
        </label>
        <label>Portal username
          <input name="username" autocomplete="username" required minlength="3">
        </label>
        <label>Portal password
          <input name="password" type="password" autocomplete="new-password" required minlength="8">
        </label>
        ${
          requiresCode
            ? `<label>Registration code
                <input name="registrationCode" type="password" autocomplete="off" required>
              </label>`
            : ""
        }
        <button type="submit">Create portal login</button>
      </form>
    </section>`;
}

export function warehouseHubPage(
  view: WarehouseHubView,
  notice?: { kind: "success" | "error"; message: string },
): string {
  return `
    ${notice ? `<div class="notice ${notice.kind === "error" ? "error" : ""}">${escapeHtml(notice.message)}</div>` : ""}
    <h1>Warehouses</h1>
    <p class="muted">Linked Aion account: ${escapeHtml(view.accountName)} (#${view.accountId})</p>
    <div class="section-stack">
      ${warehouseWorkbench(view)}
    </div>`;
}

export function adminDashboardPage(
  view: AdminDashboardView,
  notice?: { kind: "success" | "error"; message: string },
  auditEntries: AdminAuditEntry[] = [],
  mailBundles: AdminMailBundle[] = [],
  mailTemplates: AdminMailTemplate[] = [],
  economyReport?: AdminEconomyReport,
  brokerReport?: AdminBrokerReport,
): string {
  return `
    <h1>Admin</h1>
    <p class="muted">Read-only snapshot from the Aion login and game databases.</p>
    ${notice ? `<div class="notice ${notice.kind === "error" ? "error" : ""}">${escapeHtml(notice.message)}</div>` : ""}
    ${adminSearchBox()}
    <div class="stat-grid">
      ${statPanel("Accounts", view.accountStats.totalAccounts, `${view.accountStats.activatedAccounts} activated`)}
      ${statPanel("Admin accounts", view.accountStats.adminAccounts, "access level 9+")}
      ${statPanel("Characters", view.characterStats.totalCharacters, `${view.characterStats.onlineCharacters} online`)}
      ${statPanel("Inventory rows", view.inventoryStats.totalRows, "all storage locations")}
      ${statPanel("Cube rows", view.inventoryStats.cubeRows, "item_location 0")}
      ${statPanel("Warehouse rows", view.inventoryStats.characterWarehouseRows + view.inventoryStats.accountWarehouseRows, "item_location 1 and 2")}
      ${statPanel("Online warehouse rows", view.inventoryStats.onlineWarehouseRows, "item_location 120 and 121")}
    </div>
    <div class="admin-stack">
      ${adminMailForm(view, mailBundles, mailTemplates)}
      ${adminLiveOnlinePlayersSection()}
      ${adminCharacterSection("Online Characters", view.characters.online, "Characters currently marked online in the game database.")}
      ${adminAccountsSection(view)}
    </div>`;
  // NOTE: The following dashboard sections are intentionally not rendered right now
  // (requested 2026-07-05): "Economy Safety" (adminEconomySection), "Broker Report"
  // (adminBrokerReportSection), "Offline Characters" (adminCharacterSection), and
  // "Recent Admin Audit" (adminAuditSection). The rendering functions and the data
  // pipeline (economyReport, brokerReport, auditEntries params) are kept intact so
  // any section can be re-enabled by restoring its `${...}` line above.
}

const ADMIN_SEARCH_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

export function adminSearchBox(query = "", options: { autofocus?: boolean } = {}): string {
  return `
    <form class="admin-search" method="get" action="/admin/search" role="search">
      <div class="admin-search-field">
        <span class="admin-search-icon">${ADMIN_SEARCH_ICON}</span>
        <input
          type="search"
          name="q"
          value="${escapeHtml(query)}"
          placeholder="Search characters or accounts — name, id, account, or IP"
          aria-label="Search characters or accounts"
          autocomplete="off"
          spellcheck="false"
          minlength="1"
          required
          ${options.autofocus ? "autofocus" : ""}
        >
      </div>
      <button type="submit">Search</button>
    </form>`;
}

export function adminSearchResultsPage(results: AdminSearchResults): string {
  const total = results.characters.length + results.accounts.length;
  return `
    <div class="warehouse-header">
      <div class="warehouse-copy">
        <h1>Search</h1>
        <p class="muted">${total} match${total === 1 ? "" : "es"} for <strong>${escapeHtml(results.query)}</strong> across characters and accounts.</p>
      </div>
      <a class="button secondary" href="/admin">Back to Admin</a>
    </div>
    ${adminSearchBox(results.query, { autofocus: true })}
    ${
      total === 0
        ? `<div class="empty">No characters or accounts matched <strong>${escapeHtml(results.query)}</strong>. Try a name, character id, account id, account name, or IP address.</div>`
        : `<div class="admin-stack">
            ${adminSearchCharacterResults(results)}
            ${adminSearchAccountResults(results)}
          </div>`
    }`;
}

function adminSearchCharacterResults(results: AdminSearchResults): string {
  const characters = results.characters;
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Characters</h2>
          <span class="muted">Matched by character name, id, account name, or account id.</span>
        </div>
        <span class="pill">${characters.length}${results.charactersTruncated ? "+" : ""} match${characters.length === 1 ? "" : "es"}</span>
      </div>
      ${
        characters.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Character</th>
                    <th>Account</th>
                    <th>Race / Class</th>
                    <th>Status</th>
                    <th>Last online</th>
                  </tr>
                </thead>
                <tbody>
                  ${characters.map(adminCharacterRow).join("")}
                </tbody>
              </table>
            </div>
            ${results.charactersTruncated ? `<p class="muted">Showing the first ${characters.length} matches. Refine the search to narrow results.</p>` : ""}`
          : `<div class="empty">No characters matched this search.</div>`
      }
    </section>`;
}

function adminSearchAccountResults(results: AdminSearchResults): string {
  const accounts = results.accounts;
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Accounts</h2>
          <span class="muted">Matched by account name, id, current IP, or login-history IP.</span>
        </div>
        <span class="pill">${accounts.length}${results.accountsTruncated ? "+" : ""} match${accounts.length === 1 ? "" : "es"}</span>
      </div>
      ${
        accounts.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Access</th>
                    <th>Status</th>
                    <th>Last IP</th>
                  </tr>
                </thead>
                <tbody>
                  ${accounts.map(adminSearchAccountRow).join("")}
                </tbody>
              </table>
            </div>
            ${results.accountsTruncated ? `<p class="muted">Showing the first ${accounts.length} matches. Refine the search to narrow results.</p>` : ""}`
          : `<div class="empty">No accounts matched this search.</div>`
      }
    </section>`;
}

function adminSearchAccountRow(account: AdminAccountSearchResult): string {
  return `
    <tr>
      <td>
        <strong><a href="/admin/accounts/${account.id}">${escapeHtml(account.name)}</a></strong>
        <div class="muted">Account #${account.id}</div>
      </td>
      <td>${account.accessLevel >= 9 ? `<span class="pill warning">Admin (${account.accessLevel})</span>` : `Level ${account.accessLevel}`}</td>
      <td>${account.activated ? `<span class="pill online">Activated</span>` : `<span class="pill">Not activated</span>`}</td>
      <td>${account.lastIp ? escapeHtml(account.lastIp) : `<span class="muted">Unknown</span>`}</td>
    </tr>`;
}

export function adminAccountDetailPage(view: AdminAccountDetailView): string {
  const account = view.account;
  const activeBans = account.bans.filter(ban => ban.active).length;
  const onlineCharacters = view.characters.filter(character => character.online).length;
  return `
    <div class="warehouse-header">
      <div class="warehouse-copy">
        <h1>${escapeHtml(account.name)}</h1>
        <p class="muted">Read-only account inspector for login state, characters, account warehouse, and recent login evidence.</p>
      </div>
      <a class="button secondary" href="/admin">Back to Admin</a>
    </div>
    <div class="stat-grid">
      ${statPanel("Account", account.id, account.activated ? "Activated" : "Deactivated")}
      ${statPanel("Access level", account.accessLevel, account.loginBlocked ? "Login blocked" : "Login allowed")}
      ${statPanel("Characters", view.characters.length, `${onlineCharacters} online`)}
      ${statPanel("Account storage", view.accountWarehouseItems.length, "game + online warehouse rows")}
      ${statPanel("Matching bans", activeBans, `${account.bans.length} total matches`)}
      ${statPanel("Membership", account.membership, `old ${account.oldMembership}`)}
    </div>
    <div class="admin-stack">
      ${adminAccountProfileSection(view)}
      ${adminAccountBanSection(view)}
      ${adminAccountLiveSection(view)}
      ${adminAccountCharactersSection(view)}
      ${adminInventoryInspectorSection("Account Warehouse Storage", view.accountWarehouseItems, "Includes game account warehouse and account online warehouse rows owned by this account.", { accountWarehouseLimit: ACCOUNT_WAREHOUSE_CAPACITY })}
      ${adminAccountLoginHistorySection(view)}
    </div>`;
}

export function adminCharacterDetailPage(
  view: AdminCharacterDetailView,
  notice?: { kind: "success" | "error"; message: string },
): string {
  const character = view.character;
  const characterWarehouseLimit = characterWarehouseCapacity({
    whNpcExpands: character.warehouseExpansions.npc,
    whBonusExpands: character.warehouseExpansions.bonus,
  });
  const inspectorOptions = {
    characterWarehouseLimit,
    accountWarehouseLimit: ACCOUNT_WAREHOUSE_CAPACITY,
    discard: {
      recipientCharacterId: character.id,
      enabled: character.online,
    },
  };
  return `
    ${notice ? `<div class="notice ${notice.kind === "error" ? "error" : ""}">${escapeHtml(notice.message)}</div>` : ""}
    <div class="warehouse-header">
      <div class="warehouse-copy">
        <h1>${escapeHtml(character.name)}</h1>
        <p class="muted">Read-only character inspector for profile, storage, mailbox, and broker state.</p>
      </div>
      <a class="button secondary" href="/admin">Back to Admin</a>
    </div>
    <div class="stat-grid">
      ${statPanel("Character", character.id, `${formatEnum(character.race)} ${formatEnum(character.playerClass)}`)}
      ${statPanel("Account", character.accountId, character.accountName)}
      ${statPanel("World", character.worldId, `Owner ${character.worldOwnerId}`)}
      ${statPanel("Mailbox letters", character.mailboxLetters, `${view.mail.length} mail rows shown`)}
      ${statPanel("Character storage", view.inventoryItems.length, "inventory, warehouse, mail, broker storage rows")}
      ${statPanel("Account storage", view.accountWarehouseItems.length, "account warehouse rows")}
    </div>
    <div class="admin-stack">
      ${adminCharacterProfileSection(view)}
      ${adminCharacterStuckHelperSection(view)}
      ${adminCharacterIssuesSection(view)}
      ${adminInventoryInspectorSection("Character Inventory And Storage", view.inventoryItems, "Includes cube, character warehouse, portal online warehouse, broker storage, and mailbox storage rows owned by this character.", inspectorOptions)}
      ${adminInventoryInspectorSection("Account Warehouse Storage", view.accountWarehouseItems, "Includes game account warehouse and account online warehouse rows owned by this account.", inspectorOptions)}
      ${adminMailInspectorSection(view)}
      ${adminBrokerInspectorSection(view)}
    </div>`;
}

export function errorPanel(title: string, message: string): string {
  return `
    <h1>${escapeHtml(title)}</h1>
    <section class="panel">
      <p class="error">${escapeHtml(message)}</p>
    </section>`;
}

function warehouseSection(section: WarehouseSection): string {
  return `
    <section class="panel">
      ${warehouseSectionContent(section)}
    </section>`;
}

function warehouseSectionContent(section: WarehouseSection): string {
  return `
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>${escapeHtml(section.title)}</h2>
          <span class="muted">${escapeHtml(section.description)}</span>
        </div>
        <span class="pill">${capacityLabel(section)}</span>
      </div>
      ${slotGrid(section)}
      ${kinahStrip(section)}`;
}

function warehouseWorkbench(view: WarehouseHubView): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Transfer Workbench</h2>
          <span class="muted">Character and account warehouse storage for this account.</span>
        </div>
      </div>
      ${
        view.characterWarehouses.length
          ? characterWarehouseTabs(view.characterWarehouses, view.accountSections)
          : `<div class="empty">No active characters were found for this account.</div>`
      }
    </section>`;
}

function characterWarehouseTabs(
  tabs: WarehouseHubView["characterWarehouses"],
  accountSections: WarehouseSection[],
  activeCharacterId?: number,
): string {
  const activeId = activeCharacterId ?? tabs[0]?.character.id;
  return `
    <div class="tabs" data-tabs data-tabs-key="warehouse-active-character">
      <div class="tab-list">
        ${tabs.map(tab => characterTabButton(tab, activeId)).join("")}
      </div>
      ${tabs.map(tab => characterTabPanel(tab, accountSections, activeId)).join("")}
    </div>`;
}

function characterTabButton(tab: WarehouseHubView["characterWarehouses"][number], activeCharacterId: number | undefined): string {
  const active = tab.character.id === activeCharacterId;
  return `
    <button class="tab-button${active ? " active" : ""}" type="button" data-tab-target="character-${tab.character.id}">
      ${escapeHtml(tab.character.name)}
    </button>`;
}

function characterTabPanel(
  tab: WarehouseHubView["characterWarehouses"][number],
  accountSections: WarehouseSection[],
  activeCharacterId: number | undefined,
): string {
  const active = tab.character.id === activeCharacterId;
  const characterGameSection = sectionByStorageId(tab.sections, 1);
  const characterOnlineSection = sectionByStorageId(tab.sections, 120);
  const accountGameSection = sectionByStorageId(accountSections, 2);
  const accountOnlineSection = sectionByStorageId(accountSections, 121);
  return `
    <div class="tab-panel" data-tab-panel="character-${tab.character.id}" ${active ? "" : "hidden"}>
      <p class="muted">${escapeHtml(tab.character.race)} ${escapeHtml(tab.character.playerClass)} / ${tab.character.online ? "Online" : "Offline"}</p>
      <div class="transfer-board" data-transfer-scope>
        <h2 class="transfer-board-title">Game Warehouse</h2>
        <h2 class="transfer-board-title">Online Warehouse</h2>
        ${characterGameSection ? transferWarehouseSection(tab.character.id, characterGameSection, "/warehouses/transfer") : ""}
        ${characterOnlineSection ? transferWarehouseSection(tab.character.id, characterOnlineSection, "/warehouses/transfer") : ""}
        ${accountGameSection ? transferWarehouseSection(tab.character.id, accountGameSection, "/warehouses/transfer") : ""}
        ${accountOnlineSection ? transferWarehouseSection(tab.character.id, accountOnlineSection, "/warehouses/transfer") : ""}
      </div>
    </div>`;
}

function sectionByStorageId(sections: WarehouseSection[], storageId: number): WarehouseSection | undefined {
  return sections.find(section => section.storageId === storageId);
}

function transferColumn(title: string, sections: WarehouseSection[], characterId: number, action: string): string {
  return `
    <div class="transfer-column">
      <h2 class="transfer-column-title">${escapeHtml(title)}</h2>
      ${sections.map(section => transferWarehouseSection(characterId, section, action)).join("")}
    </div>`;
}

function transferWarehouseSection(characterId: number, section: WarehouseSection, action: string): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>${escapeHtml(section.title)}</h2>
          <span class="muted">${escapeHtml(section.description)}</span>
        </div>
        <div class="warehouse-header-actions">
          <span class="pill">${capacityLabel(section)}</span>
          ${moveTargetForm(characterId, section, action)}
        </div>
      </div>
      ${slotGrid(section, { transfer: true })}
      ${kinahStrip(section, characterId)}
    </section>`;
}

function moveTargetForm(characterId: number, section: WarehouseSection, action: string): string {
  const label = "Move selected here";
  return `
    <form class="move-target-form" method="post" action="${escapeHtml(action)}" data-target-storage-id="${section.storageId}">
      <input type="hidden" name="characterId" value="${characterId}">
      <input type="hidden" name="itemUniqueId" value="">
      <input type="hidden" name="targetStorageId" value="${section.storageId}">
      <button class="secondary" type="submit" disabled title="Move selected to ${escapeHtml(section.title)}">${escapeHtml(label)}</button>
    </form>`;
}

function kinahStrip(section: WarehouseSection, characterId?: number): string {
  if (!isAccountStorage(section)) {
    return "";
  }
  const amount = section.kinah?.itemCount ?? "0";
  return `
    <div class="kinah-strip">
      <div class="kinah-balance">
        <img src="/icons/item/${KINAH_ITEM_ID}" alt="">
        <span class="muted">Kinah</span>
        <strong>${escapeHtml(formatIntegerString(amount))}</strong>
      </div>
      ${characterId === undefined ? "" : kinahTransferForm(section, characterId, amount)}
    </div>`;
}

function kinahTransferForm(section: WarehouseSection, characterId: number, amount: string): string {
  const targets = transferStorageSections.filter(destination => destination.owner === "account" && destination.storageId !== section.storageId);
  const hasKinah = isPositiveIntegerString(amount);
  return `
    <form class="kinah-transfer-form" method="post" action="/warehouses/kinah-transfer">
      <input type="hidden" name="characterId" value="${characterId}">
      <input type="hidden" name="sourceStorageId" value="${section.storageId}">
      <input name="amount" type="number" min="1" step="1" inputmode="numeric" placeholder="Amount" ${hasKinah ? "" : "disabled"}>
      <select name="targetStorageId" ${hasKinah ? "" : "disabled"}>
        ${targets.map(destination => `<option value="${destination.storageId}">${escapeHtml(destination.title)}</option>`).join("")}
      </select>
      <button class="secondary" type="submit" ${hasKinah ? "" : "disabled"}>Move Kinah</button>
    </form>`;
}

function isAccountStorage(section: WarehouseSection): boolean {
  return section.storageId === 2 || section.storageId === 121;
}

function slotGrid(section: WarehouseSection, options: { transfer?: boolean } = {}): string {
  const itemsBySlot = new Map<number, InventoryItem[]>();
  const unslottedItems: InventoryItem[] = [];
  for (const item of section.items) {
    const slot = parseSlot(item.slot);
    if (slot === undefined) {
      unslottedItems.push(item);
      continue;
    }
    const existing = itemsBySlot.get(slot) ?? [];
    existing.push(item);
    itemsBySlot.set(slot, existing);
  }

  const displaySlots = slotDisplayCount(section, itemsBySlot);
  const overflowItems: InventoryItem[] = [];
  if (section.capacity.limit !== null) {
    for (const [slot, items] of [...itemsBySlot.entries()]) {
      if (slot >= displaySlots) {
        overflowItems.push(...items);
        itemsBySlot.delete(slot);
      }
    }
  }

  const cells: string[] = [];
  for (let slot = 0; slot < displaySlots; slot += 1) {
    const items = itemsBySlot.get(slot) ?? [];
    const locked = section.capacity.limit !== null && slot >= section.capacity.limit;
    cells.push(slotCell(slot, items[0], locked, options.transfer === true));
    for (const extraItem of items.slice(1)) {
      cells.push(slotCell(slot, extraItem, true, options.transfer === true));
    }
  }
  for (const item of unslottedItems) {
    cells.push(slotCell(undefined, item, true, options.transfer === true));
  }

  return `
    <div class="slot-grid">${cells.join("")}</div>
    ${overflowItems.length ? overflowNotice(overflowItems) : ""}`;
}

function slotCell(
  slot: number | undefined,
  item: InventoryItem | undefined,
  locked: boolean,
  transfer: boolean,
): string {
  const slotLabel = slot === undefined ? "Unslotted" : `Slot ${slot + 1}`;
  const stateClass = locked ? (item ? " overflow" : " locked") : "";
  return `
    <div class="slot-cell${stateClass}" aria-label="${escapeHtml(slotLabel)}">
      ${item ? slotItem(item, transfer) : ""}
    </div>`;
}

function slotItem(item: InventoryItem, transfer: boolean): string {
  const destinations = transfer ? transferDestinations(item) : [];
  const movable = !transfer || destinations.length > 0;
  const flags = itemFlags(item);
  const titleParts = [
    item.itemName ?? `Item ${item.itemId}`,
    `Template ${item.itemId}`,
    `Object ${item.itemUniqueId}`,
    `Count ${item.itemCount}`,
    `Slot ${item.slot}`,
    ...flags,
  ];
  const count = item.itemCount !== "1" ? `<span class="slot-count">${escapeHtml(item.itemCount)}</span>` : "";
  const enchant = item.enchant > 0 ? `<span class="slot-enchant">+${item.enchant}</span>` : "";
  const targetStorageIds = destinations.map(destination => destination.storageId).join(",");
  const transferAttrs = transfer && movable
    ? ` data-transfer-item data-item-unique-id="${item.itemUniqueId}" data-storage-id="${item.storageId}" data-target-storage-ids="${targetStorageIds}"`
    : "";
  const disabledClass = transfer && !movable ? " not-movable" : "";
  const label = `${item.itemName ?? `Item ${item.itemId}`} template ${item.itemId}`;

  return `
    <div class="slot-item quality-${qualityClass(item.itemQuality)}${disabledClass}"${transferAttrs} tabindex="0" aria-label="${escapeHtml(label)}">
      <img src="/icons/item/${item.itemId}" alt="${escapeHtml(item.itemName ?? `Item ${item.itemId}`)}" loading="lazy">
      ${enchant}
      ${count}
      ${itemTooltip(item, titleParts)}
    </div>`;
}

function itemTooltip(item: InventoryItem, fallbackParts: string[]): string {
  const quality = item.itemQuality ?? "COMMON";
  const rows = [
    tooltipRow("Type", formatEnum([item.itemType, item.itemGroup].filter(Boolean).join(" / ") || "Item")),
    item.itemLevel > 0 ? tooltipRow("Level", String(item.itemLevel)) : "",
    tooltipRow("Count", item.itemCount),
    item.itemMaxStackCount > 1 ? tooltipRow("Max stack", String(item.itemMaxStackCount)) : "",
    item.enchant > 0 ? tooltipRow("Enchant", `+${item.enchant}`) : "",
    item.itemRace && item.itemRace !== "PC_ALL" ? tooltipRow("Race", formatEnum(item.itemRace)) : "",
    item.itemPrice > 0 ? tooltipRow("Value", formatNumber(item.itemPrice)) : "",
    Number.isFinite(item.itemDescId) ? tooltipRow("Desc", String(item.itemDescId)) : "",
    tooltipRow("Template", String(item.itemId)),
    tooltipRow("Object", String(item.itemUniqueId)),
  ].filter(Boolean);
  const flags = itemTooltipFlags(item);
  const fallback = fallbackParts.join(" / ");

  return `
    <div class="item-tooltip" role="tooltip" aria-label="${escapeHtml(fallback)}">
      <div class="tooltip-head">
        <img src="/icons/item/${item.itemId}" alt="" loading="lazy">
        <div>
          <div class="tooltip-name quality-${qualityClass(item.itemQuality)}">${escapeHtml(item.itemName ?? `Item ${item.itemId}`)}</div>
          <div class="tooltip-grade">${escapeHtml(formatEnum(quality))}</div>
        </div>
      </div>
      <div class="tooltip-rows">${rows.join("")}</div>
      ${flags.length ? `<div class="tooltip-flags">${flags.join("")}</div>` : ""}
    </div>`;
}

function tooltipRow(label: string, value: string): string {
  return `
    <div class="tooltip-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>`;
}

function itemTooltipFlags(item: InventoryItem): string[] {
  const flags = [
    item.equipped ? tooltipFlag("Equipped", true) : "",
    item.soulBound ? tooltipFlag("Soulbound", true) : "",
    item.stackable ? tooltipFlag("Stackable") : "",
    item.storableInWarehouse ? tooltipFlag("Character Warehouse") : tooltipFlag("No Character Warehouse", true),
    item.storableInAccountWarehouse ? tooltipFlag("Account Warehouse") : tooltipFlag("No Account Warehouse", true),
    item.itemCreator ? tooltipFlag(`Creator: ${item.itemCreator}`) : "",
    item.itemCName ? tooltipFlag(item.itemCName) : "",
  ];
  return flags.filter(Boolean);
}

function tooltipFlag(label: string, warning = false): string {
  return `<span class="tooltip-flag${warning ? " warn" : ""}">${escapeHtml(label)}</span>`;
}

function overflowNotice(items: InventoryItem[]): string {
  return `
    <div class="empty">
      ${items.length} item${items.length === 1 ? "" : "s"} exist outside the usable slot range and were not rendered as empty slot space.
    </div>`;
}

function slotDisplayCount(section: WarehouseSection, itemsBySlot: Map<number, InventoryItem[]>): number {
  const occupiedSlots = [...itemsBySlot.keys()];
  const highestSlot = occupiedSlots.length ? Math.max(...occupiedSlots) : -1;
  if (section.capacity.limit !== null) {
    return roundUp(section.capacity.limit, WAREHOUSE_DISPLAY_COLUMNS);
  }
  return roundUp(
    Math.max(WAREHOUSE_DISPLAY_COLUMNS * 4, highestSlot + 1, section.items.length + WAREHOUSE_DISPLAY_COLUMNS),
    WAREHOUSE_DISPLAY_COLUMNS,
  );
}

function capacityLabel(section: WarehouseSection): string {
  if (section.capacity.limit === null) {
    return `${section.capacity.used} item${section.capacity.used === 1 ? "" : "s"}`;
  }
  return `${section.capacity.used}/${section.capacity.limit}`;
}

function parseSlot(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function roundUp(value: number, unit: number): number {
  return Math.ceil(value / unit) * unit;
}

function qualityClass(value: string | undefined): string {
  return (value ?? "common").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-");
}

function formatEnum(value: string): string {
  return value
    .split(/[\s_/]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toLocaleUpperCase("en-US") + part.slice(1).toLocaleLowerCase("en-US"))
    .join(" ");
}

function formatAuditTime(value: unknown): string {
  const parsed = Date.parse(String(value ?? ""));
  if (!Number.isFinite(parsed)) {
    return "";
  }
  return new Date(parsed).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const auditSummaryOmit = new Set(["at", "action", "adminPortalUserId", "adminUsername", "source", "via"]);

function adminAuditSummary(entry: AdminAuditEntry): string {
  const details = Object.fromEntries(
    Object.entries(entry).filter(([key, value]) => !auditSummaryOmit.has(key) && value !== undefined && value !== ""),
  );
  const summary = JSON.stringify(details);
  if (!summary || summary === "{}") {
    return "";
  }
  return summary.length > 360 ? `${summary.slice(0, 357)}...` : summary;
}

function transferDestinations(item: InventoryItem): typeof transferStorageSections[number][] {
  if (item.equipped || item.itemId === KINAH_ITEM_ID) {
    return [];
  }

  return transferStorageSections.filter(destination => {
    if (destination.storageId === item.storageId) {
      return false;
    }
    if (destination.policy === "characterWarehouse") {
      return item.storableInWarehouse;
    }
    return item.storableInAccountWarehouse;
  });
}

function itemFlags(item: InventoryItem): string[] {
  return [
    item.equipped ? "Equipped" : "",
    item.soulBound ? "Soulbound" : "",
    item.stackable ? "Stackable" : "",
    item.storableInAccountWarehouse ? "" : "No account storage",
    item.itemCreator ? `Creator: ${item.itemCreator}` : "",
  ].filter(Boolean);
}

function statPanel(label: string, value: number, detail: string): string {
  return `
    <section class="panel stat">
      <span class="muted">${escapeHtml(label)}</span>
      <span class="stat-value">${formatNumber(value)}</span>
      <span class="muted">${escapeHtml(detail)}</span>
    </section>`;
}

function adminEconomySection(report: AdminEconomyReport): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Economy Safety</h2>
          <span class="muted">Read-only checks to review before large Kinah grants or high-value item actions.</span>
        </div>
        <span class="pill">Updated ${escapeHtml(formatDate(report.generatedAt))}</span>
      </div>
      ${adminTopAccountKinahTable(report)}
      ${adminTopCharacterKinahTable(report)}
      ${adminHighBrokerListingsTable(report)}
      ${adminHighKinahMailTable(report)}
      ${adminMissingInventoryTemplatesTable(report)}
      ${adminDuplicateInventoryObjectIdsTable(report)}
      ${adminInventoryAnomaliesTable(report)}
    </section>`;
}

function adminTopAccountKinahTable(report: AdminEconomyReport): string {
  return `
    <h2 class="transfer-column-title">Top Account Kinah</h2>
    ${
      report.topAccountsByKinah.length
        ? `<div class="table-scroll">
            <table>
              <thead>
                <tr><th>Account</th><th>Total</th><th>Characters</th><th>Account WH</th><th>Online WH</th></tr>
              </thead>
              <tbody>
                ${report.topAccountsByKinah.map(row => `
                  <tr>
                    <td><a href="/admin/accounts/${row.accountId}">${escapeHtml(row.accountName)}</a><div class="muted">Account #${row.accountId}</div></td>
                    <td>${escapeHtml(formatIntegerString(row.totalKinah))}</td>
                    <td>${escapeHtml(formatIntegerString(row.characterKinah))}</td>
                    <td>${escapeHtml(formatIntegerString(row.accountWarehouseKinah))}</td>
                    <td>${escapeHtml(formatIntegerString(row.accountOnlineWarehouseKinah))}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty">No Kinah rows were found.</div>`
    }`;
}

function adminTopCharacterKinahTable(report: AdminEconomyReport): string {
  return `
    <h2 class="transfer-column-title">Top Character Kinah</h2>
    ${
      report.topCharactersByKinah.length
        ? `<div class="table-scroll">
            <table>
              <thead>
                <tr><th>Character</th><th>Account</th><th>Total</th><th>Inventory</th><th>Other Character Storage</th></tr>
              </thead>
              <tbody>
                ${report.topCharactersByKinah.map(row => `
                  <tr>
                    <td><a href="/admin/characters/${row.characterId}">${escapeHtml(row.characterName)}</a><div class="muted">Character #${row.characterId}</div></td>
                    <td><a href="/admin/accounts/${row.accountId}">${escapeHtml(row.accountName)}</a></td>
                    <td>${escapeHtml(formatIntegerString(row.totalKinah))}</td>
                    <td>${escapeHtml(formatIntegerString(row.inventoryKinah))}</td>
                    <td>${escapeHtml(formatIntegerString(row.otherCharacterStorageKinah))}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty">No character-owned Kinah rows were found.</div>`
    }`;
}

function adminHighBrokerListingsTable(report: AdminEconomyReport): string {
  return `
    <h2 class="transfer-column-title">High Broker Listings</h2>
    ${
      report.highBrokerListings.length
        ? `<div class="table-scroll">
            <table>
              <thead>
                <tr><th>Item</th><th>Seller</th><th>Price</th><th>Count</th><th>Status</th><th>Expires</th></tr>
              </thead>
              <tbody>
                ${report.highBrokerListings.map(row => `
                  <tr>
                    <td>${adminInspectorItem(row.itemId, row.itemName, `Listing #${row.id}`)}</td>
                    <td><a href="/admin/characters/${row.sellerId}">${escapeHtml(row.sellerName)}</a><div class="muted"><a href="/admin/accounts/${row.accountId}">${escapeHtml(row.accountName)}</a></div></td>
                    <td>${escapeHtml(formatIntegerString(row.price))}</td>
                    <td>${escapeHtml(formatIntegerString(row.itemCount))}</td>
                    <td>${escapeHtml([row.sold ? "Sold" : "Listed", row.settled ? "Settled" : ""].filter(Boolean).join(", "))}</td>
                    <td>${escapeHtml(formatDate(row.expireTime))}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty">No broker listings were found.</div>`
    }`;
}

function adminHighKinahMailTable(report: AdminEconomyReport): string {
  return `
    <h2 class="transfer-column-title">High Kinah Mail</h2>
    ${
      report.highKinahMail.length
        ? `<div class="table-scroll">
            <table>
              <thead>
                <tr><th>Recipient</th><th>Sender</th><th>Title</th><th>Kinah</th><th>Status</th><th>Received</th></tr>
              </thead>
              <tbody>
                ${report.highKinahMail.map(row => `
                  <tr>
                    <td><a href="/admin/characters/${row.recipientCharacterId}">${escapeHtml(row.recipientName)}</a><div class="muted"><a href="/admin/accounts/${row.accountId}">${escapeHtml(row.accountName)}</a></div></td>
                    <td>${escapeHtml(row.senderName)}</td>
                    <td>${escapeHtml(row.title)}<div class="muted">Mail #${row.mailUniqueId}</div></td>
                    <td>${escapeHtml(formatIntegerString(row.attachedKinahCount))}</td>
                    <td>${row.unread ? `<span class="pill online">Unread</span>` : `<span class="pill">Read</span>`} ${row.express ? `<span class="pill">Express ${row.express}</span>` : ""}</td>
                    <td>${escapeHtml(formatDate(row.receivedTime))}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty">No Kinah mail attachments were found.</div>`
    }`;
}

function adminMissingInventoryTemplatesTable(report: AdminEconomyReport): string {
  return `
    <h2 class="transfer-column-title">Missing Inventory Templates</h2>
    ${
      report.missingInventoryTemplates.length
        ? `<div class="table-scroll">
            <table>
              <thead>
                <tr><th>Item template</th><th>Rows</th><th>Total count</th><th>Highest stack</th><th>Problem</th></tr>
              </thead>
              <tbody>
                ${report.missingInventoryTemplates.map(row => `
                  <tr>
                    <td>Template ${row.itemId}</td>
                    <td>${formatNumber(row.rowCount)}</td>
                    <td>${escapeHtml(formatIntegerString(row.totalCount))}</td>
                    <td>${escapeHtml(formatIntegerString(row.highestCount))}</td>
                    <td>${escapeHtml(row.problem)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty">No inventory rows reference missing local item templates.</div>`
    }`;
}

function adminDuplicateInventoryObjectIdsTable(report: AdminEconomyReport): string {
  return `
    <h2 class="transfer-column-title">Duplicate Inventory Object IDs</h2>
    ${
      report.duplicateInventoryObjectIds.length
        ? `<div class="table-scroll">
            <table>
              <thead>
                <tr><th>Item</th><th>Rows</th><th>Total count</th><th>Highest stack</th><th>Problem</th></tr>
              </thead>
              <tbody>
                ${report.duplicateInventoryObjectIds.map(row => `
                  <tr>
                    <td>${adminInspectorItem(row.itemId, row.itemName, `Template ${row.itemId}`)}</td>
                    <td>${formatNumber(row.rowCount)}</td>
                    <td>${escapeHtml(formatIntegerString(row.totalCount))}</td>
                    <td>${escapeHtml(formatIntegerString(row.highestCount))}</td>
                    <td>${escapeHtml(row.problem)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty">No duplicate inventory object ids were found.</div>`
    }`;
}

function adminInventoryAnomaliesTable(report: AdminEconomyReport): string {
  return `
    <h2 class="transfer-column-title">Inventory Anomalies</h2>
    ${
      report.inventoryAnomalies.length
        ? `<div class="table-scroll">
            <table>
              <thead>
                <tr><th>Item</th><th>Owner</th><th>Storage</th><th>Count</th><th>Estimated value</th><th>Problem</th></tr>
              </thead>
              <tbody>
                ${report.inventoryAnomalies.map(row => `
                  <tr>
                    <td>${adminInspectorItem(row.itemId, row.itemName, `Object #${row.itemUniqueId}`)}</td>
                    <td>${adminInventoryAnomalyOwner(row)}</td>
                    <td>${escapeHtml(row.storageName)}<div class="muted">location ${row.storageId} / slot ${escapeHtml(row.slot)}</div></td>
                    <td>${escapeHtml(formatIntegerString(row.itemCount))}</td>
                    <td>${row.estimatedValue ? escapeHtml(formatIntegerString(row.estimatedValue)) : `<span class="muted">Unknown</span>`}</td>
                    <td><span class="pill ${row.severity === "error" ? "danger" : row.severity === "warning" ? "warning" : ""}">${escapeHtml(formatEnum(row.severity))}</span><div class="muted">${escapeHtml(row.problem)}</div></td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty">No invalid, overstacked, or high-value inventory anomaly candidates were found.</div>`
    }`;
}

function adminInventoryAnomalyOwner(row: AdminEconomyReport["inventoryAnomalies"][number]): string {
  if (row.ownerName) {
    const account = row.accountId
      ? `<div class="muted"><a href="/admin/accounts/${row.accountId}">${escapeHtml(row.accountName ?? `Account ${row.accountId}`)}</a></div>`
      : "";
    return `<a href="/admin/characters/${row.ownerId}">${escapeHtml(row.ownerName)}</a>${account}`;
  }
  if (row.accountId) {
    return `<a href="/admin/accounts/${row.accountId}">${escapeHtml(row.accountName ?? `Account ${row.accountId}`)}</a><div class="muted">Account-owned row</div>`;
  }
  return `<span class="muted">Owner #${row.ownerId}</span>`;
}

function adminBrokerReportSection(report: AdminBrokerReport): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Broker Report</h2>
          <span class="muted">Read-only broker state checks for active, expired, settled, suspicious, and stale broker storage rows.</span>
        </div>
        <span class="pill">Updated ${escapeHtml(formatDate(report.generatedAt))}</span>
      </div>
      ${adminBrokerStatsTable(report)}
      ${adminBrokerListingsTable("Active Listings", report.activeListings, "Unsold, unsettled rows that have not expired.")}
      ${adminBrokerListingsTable("Expired But Not Settled", report.expiredUnsettledListings, "Rows the live broker expiry task should settle.")}
      ${adminBrokerListingsTable("Settled Rows", report.settledListings, "Sold or expired rows waiting for seller collection/cleanup.")}
      ${adminBrokerListingsTable("Suspicious Price Rows", report.suspiciousListings, "Rows outside server-side broker price/count constraints.")}
      ${adminBrokerListingsTable("Unsold Rows Missing Broker Storage", report.missingStorageListings, "Unsold rows whose item_pointer does not resolve to broker storage owned by the seller.")}
      ${adminBrokerStorageIssuesTable(report)}
    </section>`;
}

function adminBrokerStatsTable(report: AdminBrokerReport): string {
  const stats = report.stats;
  return `
    <h2 class="transfer-column-title">Broker Summary</h2>
    <div class="table-scroll">
      <table>
        <thead>
          <tr><th>Total</th><th>Active</th><th>Expired Not Settled</th><th>Expired Settled</th><th>Sold Settled</th><th>Sold Not Settled</th><th>Missing Storage</th><th>Orphan Storage</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${formatNumber(stats.totalRows)}</td>
            <td>${formatNumber(stats.activeRows)}</td>
            <td>${formatNumber(stats.expiredUnsettledRows)}</td>
            <td>${formatNumber(stats.expiredSettledRows)}</td>
            <td>${formatNumber(stats.soldSettledRows)}</td>
            <td>${formatNumber(stats.soldUnsettledRows)}</td>
            <td>${formatNumber(stats.unsoldRowsMissingStorage)}</td>
            <td>${formatNumber(stats.orphanBrokerStorageRows)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function adminBrokerListingsTable(
  title: string,
  rows: AdminBrokerReport["activeListings"],
  description: string,
): string {
  return `
    <h2 class="transfer-column-title">${escapeHtml(title)}</h2>
    <p class="muted">${escapeHtml(description)}</p>
    ${
      rows.length
        ? `<div class="table-scroll">
            <table>
              <thead>
                <tr><th>Item</th><th>Seller</th><th>Price</th><th>Count</th><th>Status</th><th>Storage</th><th>Expire / Settle</th></tr>
              </thead>
              <tbody>
                ${rows.map(adminBrokerReportRow).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty">No rows matched this broker check.</div>`
    }`;
}

function adminBrokerReportRow(row: AdminBrokerReport["activeListings"][number]): string {
  return `
    <tr>
      <td>${adminInspectorItem(row.itemId, row.itemName, `Broker row #${row.id} / pointer #${row.itemPointer}`)}</td>
      <td><a href="/admin/characters/${row.sellerId}">${escapeHtml(row.sellerName)}</a><div class="muted"><a href="/admin/accounts/${row.accountId}">${escapeHtml(row.accountName)}</a></div></td>
      <td>${escapeHtml(formatIntegerString(row.price))}</td>
      <td>${escapeHtml(formatIntegerString(row.itemCount))}</td>
      <td>${escapeHtml(brokerRowStatus(row))}</td>
      <td>${escapeHtml(brokerStorageStatus(row))}</td>
      <td>${escapeHtml(formatDate(row.expireTime))}<div class="muted">${escapeHtml(formatDate(row.settleTime))}</div></td>
    </tr>`;
}

function adminBrokerStorageIssuesTable(report: AdminBrokerReport): string {
  return `
    <h2 class="transfer-column-title">Orphan Broker Storage</h2>
    <p class="muted">Broker-storage inventory rows that are not attached to any unsold broker row.</p>
    ${
      report.storageIssues.length
        ? `<div class="table-scroll">
            <table>
              <thead>
                <tr><th>Item</th><th>Owner</th><th>Count</th><th>Problem</th></tr>
              </thead>
              <tbody>
                ${report.storageIssues.map(row => `
                  <tr>
                    <td>${adminInspectorItem(row.itemId, row.itemName, `Object #${row.itemUniqueId}`)}</td>
                    <td>${
                      row.ownerName && row.accountId
                        ? `<a href="/admin/characters/${row.ownerId}">${escapeHtml(row.ownerName)}</a><div class="muted"><a href="/admin/accounts/${row.accountId}">${escapeHtml(row.accountName ?? `Account ${row.accountId}`)}</a></div>`
                        : `Owner #${row.ownerId}`
                    }</td>
                    <td>${escapeHtml(formatIntegerString(row.itemCount))}</td>
                    <td>${escapeHtml(row.problem)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty">No orphan broker-storage inventory rows were found.</div>`
    }`;
}

function brokerRowStatus(row: AdminBrokerReport["activeListings"][number]): string {
  return [
    row.sold ? "Sold" : "Unsold",
    row.settled ? "Settled" : "Unsettled",
    row.splittingAvailable ? "Splittable" : "",
  ].filter(Boolean).join(", ");
}

function brokerStorageStatus(row: AdminBrokerReport["activeListings"][number]): string {
  if (row.storageItemUniqueId == null) {
    return row.sold ? "No broker storage expected" : "Missing broker storage";
  }
  const parts = [`Object #${row.storageItemUniqueId}`, `location ${row.storageLocation ?? "unknown"}`];
  if (row.storageOwnerId !== row.sellerId) {
    parts.push(`owner #${row.storageOwnerId ?? "unknown"}`);
  }
  return parts.join(" / ");
}

function adminAccountRow(account: AdminDashboardView["adminAccounts"][number]): string {
  return `
    <tr>
      <td>${account.id}</td>
      <td><a href="/admin/accounts/${account.id}">${escapeHtml(account.name)}</a></td>
      <td>${account.accessLevel}</td>
      <td>${account.activated ? "Yes" : "No"}</td>
    </tr>`;
}

function adminAccountsSection(view: AdminDashboardView): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Level 9 Accounts</h2>
          <span class="muted">Accounts with administrator-level Aion access.</span>
        </div>
        <span class="pill">${view.adminAccounts.length} shown</span>
      </div>
      ${
        view.adminAccounts.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Account</th>
                    <th>Access level</th>
                    <th>Activated</th>
                  </tr>
                </thead>
                <tbody>
                  ${view.adminAccounts.map(adminAccountRow).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No level 9 accounts were found.</div>`
      }
    </section>`;
}

function adminAuditSection(entries: AdminAuditEntry[]): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Recent Admin Audit</h2>
          <span class="muted">Latest portal JSONL audit entries across live actions, express mail, and warehouse transfers.</span>
        </div>
        <span class="pill">${entries.length} shown</span>
      </div>
      ${
        entries.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr><th>Time</th><th>Action</th><th>Admin</th><th>Source</th><th>Summary</th></tr>
                </thead>
                <tbody>
                  ${entries.map(adminAuditRow).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No admin audit entries have been recorded yet.</div>`
      }
    </section>`;
}

function adminAuditRow(entry: AdminAuditEntry): string {
  return `
    <tr>
      <td>${escapeHtml(formatAuditTime(entry.at))}</td>
      <td><span class="pill">${escapeHtml(formatEnum(String(entry.action ?? "unknown")))}</span></td>
      <td>${escapeHtml(String(entry.adminUsername ?? "system"))}</td>
      <td class="muted">${escapeHtml(String(entry.source ?? ""))}</td>
      <td><code>${escapeHtml(adminAuditSummary(entry))}</code></td>
    </tr>`;
}

function adminLiveOnlinePlayersSection(): string {
  return `
    <section class="panel" data-admin-live-online>
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Live Online Players</h2>
          <span class="muted">Read directly from the running game-server world through the admin HTTP service.</span>
        </div>
        <span class="pill" data-admin-live-count>Loading</span>
      </div>
      <div class="admin-live-toolbar">
        <div class="admin-live-meta">
          <span class="pill online">Live</span>
          <span class="muted" data-admin-live-updated></span>
          <span class="muted" data-admin-live-capabilities>Checking admin API</span>
        </div>
        <button type="button" class="secondary" data-admin-live-refresh>Refresh</button>
      </div>
      <div class="admin-live-action-status muted" data-admin-live-action-status></div>
      <div class="admin-live-actions">
        <form data-admin-live-notify-form>
          <label>Player
            <select name="recipientCharacterId" data-admin-live-notify-recipient required>
              <option value="">Loading players</option>
            </select>
          </label>
          <button type="submit">Notify</button>
          <textarea name="message" maxlength="1000" required placeholder="Player notice"></textarea>
        </form>
        <form data-admin-live-kick-form>
          <label>Player
            <select name="recipientCharacterId" data-admin-live-kick-recipient required>
              <option value="">Loading players</option>
            </select>
          </label>
          <button type="submit" class="danger">Kick</button>
          <textarea name="reason" maxlength="200" placeholder="Optional audit reason"></textarea>
        </form>
        <form data-admin-live-bind-form>
          <label>Player
            <select name="recipientCharacterId" data-admin-live-bind-recipient required>
              <option value="">Loading players</option>
            </select>
          </label>
          <button type="submit" class="secondary">Move to Bind</button>
          <textarea name="reason" maxlength="200" placeholder="Optional audit reason"></textarea>
        </form>
        <form data-admin-live-exit-form>
          <label>Player
            <select name="recipientCharacterId" data-admin-live-exit-recipient required>
              <option value="">Loading players</option>
            </select>
          </label>
          <button type="submit" class="secondary">Move to Exit</button>
          <textarea name="reason" maxlength="200" placeholder="Optional audit reason"></textarea>
        </form>
        <form data-admin-live-unstuck-form>
          <label>Player
            <select name="recipientCharacterId" data-admin-live-unstuck-recipient required>
              <option value="">Loading players</option>
            </select>
          </label>
          <button type="submit" class="secondary">Unstuck</button>
          <textarea name="reason" maxlength="200" placeholder="Optional audit reason"></textarea>
        </form>
        <form data-admin-live-mailbox-form>
          <label>Player
            <select name="recipientCharacterId" data-admin-live-mailbox-recipient required>
              <option value="">Loading players</option>
            </select>
          </label>
          <button type="submit" class="secondary">Refresh Mailbox</button>
          <textarea name="reason" maxlength="200" placeholder="Optional audit reason"></textarea>
        </form>
        <form data-admin-live-inventory-form>
          <label>Player
            <select name="recipientCharacterId" data-admin-live-inventory-recipient required>
              <option value="">Loading players</option>
            </select>
          </label>
          <button type="submit" class="secondary">Refresh Inventory</button>
          <textarea name="reason" maxlength="200" placeholder="Optional audit reason"></textarea>
        </form>
        <form data-admin-live-warehouse-form>
          <label>Player
            <select name="recipientCharacterId" data-admin-live-warehouse-recipient required>
              <option value="">Loading players</option>
            </select>
          </label>
          <button type="submit" class="secondary">Refresh Warehouse</button>
          <textarea name="reason" maxlength="200" placeholder="Optional audit reason"></textarea>
        </form>
        <form data-admin-live-reload-cache-form>
          <label>Target
            <select name="target" required>
              <option value="announcements">Announcements</option>
              <option value="html">HTML Cache</option>
              <option value="item-restrictions">Item Restrictions</option>
            </select>
          </label>
          <button type="submit" class="secondary">Reload</button>
          <textarea name="reason" maxlength="200" placeholder="Optional audit reason"></textarea>
        </form>
        <form data-admin-live-broadcast-form>
          <label>Scope
            <select name="scope">
              <option value="all">All</option>
              <option value="elyos">Elyos</option>
              <option value="asmodians">Asmodians</option>
            </select>
          </label>
          <button type="submit">Broadcast</button>
          <textarea name="message" maxlength="1000" required placeholder="Server notice"></textarea>
        </form>
        <form data-admin-live-maintenance-form>
          <label>Scope
            <select name="scope">
              <option value="all">All</option>
              <option value="elyos">Elyos</option>
              <option value="asmodians">Asmodians</option>
            </select>
          </label>
          <label>Starts in minutes
            <input name="minutesUntilMaintenance" type="number" min="1" max="1440" value="15" required>
          </label>
          <button type="submit" class="secondary">Schedule Warning</button>
          <textarea name="messageTemplate" maxlength="1000" placeholder="Server maintenance begins in {minutes} {minuteLabel}. Please log out safely.">Server maintenance begins in {minutes} {minuteLabel}. Please log out safely.</textarea>
        </form>
      </div>
      <div data-admin-live-content>
        <div class="empty">Loading live player state.</div>
      </div>
    </section>`;
}

function adminMailForm(
  view: AdminDashboardView,
  mailBundles: AdminMailBundle[],
  mailTemplates: AdminMailTemplate[],
): string {
  const recipients = [...view.characters.online, ...view.characters.offline];
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Express Mail</h2>
          <span class="muted">Creates an unread express letter through the live game-server mail service.</span>
        </div>
      </div>
      ${
        recipients.length
          ? `<div class="admin-mail-layout" data-admin-mail-layout data-mail-kind="item">
              <form class="admin-mail-form" method="post" action="/admin/mail-items" data-admin-mail-form data-mail-kind="item">
                <div class="wide admin-mail-kind">
                  <label><input type="radio" name="mailKind" value="item" checked data-admin-mail-kind> Item</label>
                  <label><input type="radio" name="mailKind" value="kinah" data-admin-mail-kind> Kinah</label>
                </div>
                <label class="wide">Recipient
                  <select name="recipientCharacterId" required>
                    ${recipients.map(adminMailRecipientOption).join("")}
                  </select>
                </label>
                <fieldset class="wide admin-mail-mode-section" data-mail-mode-active="true" aria-hidden="false" data-admin-mail-mode-content="item" data-admin-mail-mode-panel data-mail-kind-panel="item" data-admin-item-panel>
                  <div class="admin-selected-item" data-admin-selected-item>
                    <img src="/icons/item/0" alt="">
                    <div>
                      <strong>No item selected</strong>
                      <div class="muted">Select an item or enter a template id.</div>
                    </div>
                  </div>
                  <div class="admin-mail-mode-fields">
                    <label>Item template id
                      <input name="itemId" type="number" min="1" inputmode="numeric" required data-required-when-active="true" data-admin-mail-item-id data-admin-item-field>
                    </label>
                    <label>Count
                      <input name="itemCount" type="number" min="1" inputmode="numeric" value="1" required data-required-when-active="true" data-admin-mail-item-count data-admin-item-field>
                    </label>
                  </div>
                </fieldset>
                <fieldset class="wide admin-mail-mode-section" hidden inert disabled data-mail-mode-active="false" aria-hidden="true" data-admin-mail-mode-content="kinah" data-admin-mail-mode-panel data-mail-kind-panel="kinah" data-admin-kinah-panel>
                  <div class="admin-kinah-panel">
                    <strong>Kinah delivery</strong>
                    <span class="muted">Uses the mail Kinah attachment field, not item template 182400001.</span>
                  </div>
                  <div class="admin-mail-mode-fields">
                    <label>Kinah amount
                      <input name="kinahAmount" type="text" inputmode="numeric" placeholder="1000000" disabled data-required-when-active="true" data-admin-kinah-field>
                    </label>
                  </div>
                </fieldset>
                <label>Sender
                  <input name="senderName" maxlength="16" value="Aion Portal" required>
                </label>
                <label>Title
                  <input name="title" maxlength="20" value="Admin Delivery" required>
                </label>
                <label class="wide">Message
                  <textarea name="message" maxlength="1000" required>Admin delivery.</textarea>
                </label>
                <div class="wide admin-bundle-actions">
                  <button type="button" class="secondary" data-admin-mail-check>Check delivery</button>
                  <button type="submit" data-admin-mail-submit>Send Item Mail</button>
                </div>
                <div class="wide admin-live-action-status muted" data-admin-mail-check-status></div>
              </form>
              <div class="admin-item-browser" data-mail-mode-active="true" aria-hidden="false" data-admin-mail-mode-content="item" data-admin-item-browser>
                <div class="admin-item-filters">
                  <label>Search
                    <input data-admin-item-query autocomplete="off" placeholder="Name or item id">
                  </label>
                  <label>Category
                    <select data-admin-item-category><option value="">All</option></select>
                  </label>
                  <label>Type
                    <select data-admin-item-type><option value="">All</option></select>
                  </label>
                  <label>Quality
                    <select data-admin-item-quality><option value="">All</option></select>
                  </label>
                </div>
                <div>
                  <h2 class="transfer-column-title">Favorites</h2>
                  <div class="admin-favorite-items" data-admin-item-favorites>
                    <div class="empty">Loading favorites.</div>
                  </div>
                </div>
                <div>
                  <h2 class="transfer-column-title">Item Search</h2>
                  <div class="admin-item-results" data-admin-item-results>
                    <div class="empty">Loading item catalog.</div>
                  </div>
                </div>
              </div>
            </div>`
          : `<div class="empty">No active characters are available.</div>`
      }
      ${adminMailTemplatePanel(mailTemplates)}
      ${adminMailBundlePanel(mailBundles, recipients)}
    </section>`;
}

function adminMailTemplatePanel(templates: AdminMailTemplate[]): string {
  return `
    <div class="admin-bundle-panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Mail Templates</h2>
          <span class="muted">Saved JSON sender/title/message presets for common admin mail workflows.</span>
        </div>
        <span class="pill">${templates.length} saved</span>
      </div>
      <form class="admin-mail-form" method="post" action="/admin/mail-templates">
        <label>Name
          <input name="name" maxlength="80" required placeholder="Compensation Notice">
        </label>
        <label>Default type
          <select name="mailKind">
            <option value="item">Item</option>
            <option value="kinah">Kinah</option>
          </select>
        </label>
        <label>Sender
          <input name="senderName" maxlength="16" value="Aion Portal" required>
        </label>
        <label>Title
          <input name="title" maxlength="20" value="Admin Delivery" required>
        </label>
        <label class="wide">Message
          <textarea name="message" maxlength="1000" required>Admin delivery.</textarea>
        </label>
        <div class="wide">
          <button type="submit">Save Template</button>
        </div>
      </form>
      ${
        templates.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr><th>Template</th><th>Message</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  ${templates.map(adminMailTemplateRow).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No saved mail templates yet.</div>`
      }
    </div>`;
}

function adminMailTemplateRow(template: AdminMailTemplate): string {
  return `
    <tr>
      <td>
        <strong>${escapeHtml(template.name)}</strong>
        <div class="muted">${escapeHtml(formatEnum(template.mailKind))} / ${escapeHtml(template.senderName)} / ${escapeHtml(template.title)}</div>
      </td>
      <td>${escapeHtml(template.message)}</td>
      <td>
        <div class="admin-bundle-actions">
          <button
            type="button"
            class="secondary"
            data-admin-mail-template-apply
            data-mail-kind="${escapeHtml(template.mailKind)}"
            data-sender-name="${escapeHtml(template.senderName)}"
            data-title="${escapeHtml(template.title)}"
            data-message="${escapeHtml(template.message)}"
          >Apply</button>
          <form method="post" action="/admin/mail-templates/delete">
            <input type="hidden" name="templateId" value="${escapeHtml(template.id)}">
            <button type="submit" class="danger">Delete</button>
          </form>
        </div>
      </td>
    </tr>`;
}

function adminMailBundlePanel(
  bundles: AdminMailBundle[],
  recipients: AdminDashboardView["characters"]["online"],
): string {
  return `
    <div class="admin-bundle-panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Mail Bundles</h2>
          <span class="muted">Saved JSON bundles. Each entry sends one live express letter.</span>
        </div>
        <span class="pill">${bundles.length} saved</span>
      </div>
      <form class="admin-mail-form" method="post" action="/admin/mail-bundles">
        <label>Name
          <input name="name" maxlength="80" required placeholder="Starter Pack">
        </label>
        <label>Sender
          <input name="senderName" maxlength="16" value="Aion Portal" required>
        </label>
        <label>Title
          <input name="title" maxlength="20" value="Admin Delivery" required>
        </label>
        <label class="wide">Message
          <textarea name="message" maxlength="1000" required>Admin delivery.</textarea>
        </label>
        <label class="wide">Entries
          <textarea name="entries" required placeholder="item 188052639 1&#10;kinah 1000000"></textarea>
        </label>
        <div class="wide">
          <button type="submit">Save Bundle</button>
        </div>
      </form>
      ${
        bundles.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr><th>Bundle</th><th>Letters</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  ${bundles.map(bundle => adminMailBundleRow(bundle, recipients)).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No saved mail bundles yet.</div>`
      }
    </div>`;
}

function adminMailBundleRow(
  bundle: AdminMailBundle,
  recipients: AdminDashboardView["characters"]["online"],
): string {
  return `
    <tr>
      <td>
        <strong>${escapeHtml(bundle.name)}</strong>
        <div class="muted">${escapeHtml(bundle.senderName)} / ${escapeHtml(bundle.title)}</div>
      </td>
      <td>${escapeHtml(bundle.entries.map(mailBundleEntryLabel).join(", "))}</td>
      <td>
        <div class="admin-bundle-actions">
          <form method="post" action="/admin/mail-bundles/send">
            <input type="hidden" name="bundleId" value="${escapeHtml(bundle.id)}">
            <select name="recipientCharacterId" required ${recipients.length ? "" : "disabled"}>
              ${recipients.length ? recipients.map(adminMailRecipientOption).join("") : `<option value="">No characters</option>`}
            </select>
            <button type="submit" ${recipients.length ? "" : "disabled"}>Send Bundle</button>
          </form>
          <form method="post" action="/admin/mail-bundles/delete">
            <input type="hidden" name="bundleId" value="${escapeHtml(bundle.id)}">
            <button type="submit" class="danger">Delete</button>
          </form>
        </div>
      </td>
    </tr>`;
}

function mailBundleEntryLabel(entry: AdminMailBundleEntry): string {
  if (entry.kind === "kinah") {
    return `${formatIntegerString(entry.kinahAmount)} Kinah`;
  }
  return `Item ${entry.itemId} x${entry.itemCount}`;
}

function adminAccountProfileSection(view: AdminAccountDetailView): string {
  const account = view.account;
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Account Profile</h2>
          <span class="muted">Login-server account snapshot.</span>
        </div>
        ${account.loginBlocked ? `<span class="pill">Login blocked</span>` : `<span class="pill online">Login allowed</span>`}
      </div>
      <div class="admin-detail-grid">
        <dl class="admin-detail-list">
          ${detailRow("Display name", account.name)}
          ${detailRow("Account id", String(account.id))}
          ${detailRow("Name", account.canonicalName ?? "")}
          ${detailRow("External auth", account.externalAuthName ?? "")}
          ${detailRow("Created", formatDate(account.creationDate))}
          ${detailRow("Activated", account.activated ? "Yes" : "No")}
        </dl>
        <dl class="admin-detail-list">
          ${detailRow("Access level", String(account.accessLevel))}
          ${detailRow("Membership", `${account.membership} (old ${account.oldMembership})`)}
          ${detailRow("Toll", formatIntegerString(account.toll))}
          ${detailRow("Last server", String(account.lastServer))}
          ${detailRow("Account expire", formatDate(account.expireDate))}
          ${detailRow("IP force", account.ipForce ?? "")}
        </dl>
        <dl class="admin-detail-list">
          ${detailRow("Last IP", account.lastIp ?? "")}
          ${detailRow("Last MAC", account.lastMac ?? "")}
          ${detailRow("Last HDD", account.lastHddSerial ?? "")}
          ${detailRow("Allowed HDD", account.allowedHddSerial ?? "")}
          ${detailRow("Last active", formatDate(account.time.lastActive))}
          ${detailRow("Penalty end", formatDate(account.time.penaltyEnd))}
        </dl>
        <dl class="admin-detail-list">
          ${detailRow("Time expiration", formatDate(account.time.expirationTime))}
          ${detailRow("Session duration", formatDurationSeconds(account.time.sessionDuration))}
          ${detailRow("Online total", formatDurationSeconds(account.time.accumulatedOnline))}
          ${detailRow("Rest total", formatDurationSeconds(account.time.accumulatedRest))}
        </dl>
      </div>
    </section>`;
}

function adminAccountBanSection(view: AdminAccountDetailView): string {
  const activeCount = view.account.bans.filter(ban => ban.active).length;
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Ban Evidence</h2>
          <span class="muted">Matches against login-server IP, MAC, and HDD ban tables using this account's last known values.</span>
        </div>
        <span class="pill">${activeCount} active</span>
      </div>
      ${
        view.account.bans.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr><th>Kind</th><th>Value</th><th>Status</th><th>Ends</th><th>Detail</th></tr>
                </thead>
                <tbody>
                  ${view.account.bans.map(adminAccountBanRow).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No matching IP, MAC, or HDD bans were found for this account's latest login identifiers.</div>`
      }
    </section>`;
}

function adminAccountBanRow(row: AdminAccountDetailView["account"]["bans"][number]): string {
  return `
    <tr>
      <td>${escapeHtml(row.kind.toUpperCase())}</td>
      <td>${escapeHtml(row.value)}</td>
      <td>${row.active ? `<span class="pill">Active</span>` : `<span class="pill">Expired</span>`}</td>
      <td>${escapeHtml(formatDate(row.endsAt))}</td>
      <td>${escapeHtml(row.detail)}</td>
    </tr>`;
}

function adminAccountLiveSection(view: AdminAccountDetailView): string {
  const account = view.account;
  return `
    <section class="panel" data-admin-account-live data-account-id="${account.id}" data-account-name="${escapeHtml(account.name)}">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Live Account</h2>
          <span class="muted">Game-server account state for loaded characters and account warehouse refresh.</span>
        </div>
        <span class="pill" data-admin-account-live-count>Unchecked</span>
      </div>
      <div class="admin-live-action-status muted" data-admin-account-live-status>
        Checking whether this account is loaded in the live game server.
      </div>
      <div class="admin-live-inline-actions">
        <button type="button" class="secondary" data-admin-account-live-check>Check Live State</button>
        <form method="post" action="/admin/live/refresh-account-warehouse" data-admin-account-live-refresh data-live-enabled="false" data-confirm="Refresh account warehouse packets for all loaded characters on ${escapeHtml(account.name)}?" data-pending="Refreshing account warehouse packets.">
          <input type="hidden" name="accountId" value="${account.id}">
          <input type="hidden" name="reason" value="account-detail-refresh-account-warehouse">
          <button type="submit" class="secondary" disabled>Refresh Account Warehouse</button>
        </form>
      </div>
    </section>`;
}

function adminAccountCharactersSection(view: AdminAccountDetailView): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Characters</h2>
          <span class="muted">Active characters on this account. Names link to the character inspector and live stuck helper.</span>
        </div>
        <span class="pill">${view.characters.length} character${view.characters.length === 1 ? "" : "s"}</span>
      </div>
      ${
        view.characters.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr><th>Character</th><th>Race / Class</th><th>Status</th><th>Last online</th></tr>
                </thead>
                <tbody>
                  ${view.characters.map(adminAccountCharacterRow).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No active characters were found for this account.</div>`
      }
    </section>`;
}

function adminAccountCharacterRow(character: AdminAccountDetailView["characters"][number]): string {
  return `
    <tr>
      <td>
        <strong><a href="/admin/characters/${character.id}">${escapeHtml(character.name)}</a></strong>
        <div class="muted">Character #${character.id}</div>
      </td>
      <td>${escapeHtml(formatEnum(character.race))} / ${escapeHtml(formatEnum(character.playerClass))}</td>
      <td>${character.online ? `<span class="pill online">Online</span>` : `<span class="pill">Offline</span>`}</td>
      <td>${escapeHtml(formatDate(character.lastOnline))}</td>
    </tr>`;
}

function adminAccountLoginHistorySection(view: AdminAccountDetailView): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Login History</h2>
          <span class="muted">Latest login-server history rows for this account.</span>
        </div>
        <span class="pill">${view.loginHistory.length} shown</span>
      </div>
      ${
        view.loginHistory.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr><th>Date</th><th>Game server</th><th>IP</th><th>MAC</th><th>HDD serial</th></tr>
                </thead>
                <tbody>
                  ${view.loginHistory.map(adminAccountLoginHistoryRow).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No login history rows were found for this account.</div>`
      }
    </section>`;
}

function adminAccountLoginHistoryRow(row: AdminAccountDetailView["loginHistory"][number]): string {
  return `
    <tr>
      <td>${escapeHtml(formatDate(row.date))}</td>
      <td>${row.gameserverId}</td>
      <td>${escapeHtml(row.ip ?? "")}</td>
      <td>${escapeHtml(row.mac ?? "")}</td>
      <td>${escapeHtml(row.hddSerial ?? "")}</td>
    </tr>`;
}

function adminCharacterProfileSection(view: AdminCharacterDetailView): string {
  const character = view.character;
  const coords = `${formatCoordinate(character.x)}, ${formatCoordinate(character.y)}, ${formatCoordinate(character.z)}`;
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Profile</h2>
          <span class="muted">DB snapshot from the players table.</span>
        </div>
        ${character.online ? `<span class="pill online">Online</span>` : `<span class="pill">Offline</span>`}
      </div>
      <div class="admin-detail-grid">
        <dl class="admin-detail-list">
          ${detailRow("Name", `${character.name} (#${character.id})`)}
          ${detailRow("Account", `${character.accountName} (#${character.accountId})`)}
          ${detailRow("Race / Class", `${formatEnum(character.race)} / ${formatEnum(character.playerClass)}`)}
          ${detailRow("Gender", formatEnum(character.gender))}
          ${detailRow("Created", formatDate(character.creationDate))}
          ${detailRow("Last online", formatDate(character.lastOnline))}
        </dl>
        <dl class="admin-detail-list">
          ${detailRow("EXP", formatIntegerString(character.exp))}
          ${detailRow("Recover EXP", formatIntegerString(character.recoverExp))}
          ${detailRow("Warehouse expands", `${character.warehouseExpansions.total}/${character.warehouseExpansions.max} (${character.warehouseExpansions.npc} NPC, ${character.warehouseExpansions.bonus} bonus)`)}
          ${detailRow("World", `${character.worldId} / owner ${character.worldOwnerId}`)}
          ${detailRow("Position", coords)}
          ${detailRow("Heading", String(character.heading))}
        </dl>
      </div>
    </section>`;
}

function adminCharacterStuckHelperSection(view: AdminCharacterDetailView): string {
  const character = view.character;
  const disabled = "disabled";
  const reason = "character-detail-stuck-helper";
  return `
    <section class="panel" data-admin-character-live data-character-id="${character.id}" data-character-name="${escapeHtml(character.name)}">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Stuck Helper</h2>
          <span class="muted">Live actions call the game-server admin HTTP service and are enabled only after a live state check.</span>
        </div>
        ${character.online ? `<span class="pill online">Online</span>` : `<span class="pill">Offline</span>`}
      </div>
      <div class="admin-live-action-status muted" data-admin-character-live-status>
        ${
          character.online
            ? `Checking whether ${escapeHtml(character.name)} is loaded in the live game server.`
            : `${escapeHtml(character.name)} is offline in the latest DB snapshot.`
        }
      </div>
      <div class="admin-live-inline-actions">
        <button type="button" class="secondary" data-admin-character-live-storage ${disabled}>Check Live Storage</button>
        ${adminCharacterLiveForm("/admin/live/unstuck-player", character.id, "Unstuck", reason, disabled, `Unstuck ${character.name} using their instance exit or bind fallback?`, "Running live unstuck.")}
        ${adminCharacterLiveForm("/admin/live/move-to-instance-exit", character.id, "Move to Exit", reason, disabled, `Move ${character.name} to their instance exit or bind fallback?`, "Moving player to safe exit.")}
        ${adminCharacterLiveForm("/admin/live/move-to-bind-point", character.id, "Move to Bind", reason, disabled, `Move ${character.name} to their bind point?`, "Moving player to bind point.")}
        ${adminCharacterLiveForm("/admin/live/refresh-inventory", character.id, "Refresh Inventory", reason, disabled, `Refresh inventory packets for ${character.name}?`, "Refreshing inventory packets.")}
        ${adminCharacterLiveForm("/admin/live/refresh-warehouse", character.id, "Refresh Warehouse", reason, disabled, `Refresh warehouse packets for ${character.name}?`, "Refreshing warehouse packets.")}
        ${adminCharacterLiveForm("/admin/live/refresh-mailbox", character.id, "Refresh Mailbox", reason, disabled, `Refresh mailbox state for ${character.name}?`, "Refreshing mailbox state.")}
      </div>
    </section>`;
}

function adminCharacterLiveForm(
  action: string,
  characterId: number,
  label: string,
  reason: string,
  disabled: string,
  confirm: string,
  pending: string,
): string {
  return `
    <form method="post" action="${escapeHtml(action)}" data-admin-character-live-form data-confirm="${escapeHtml(confirm)}" data-pending="${escapeHtml(pending)}">
      <input type="hidden" name="recipientCharacterId" value="${characterId}">
      <input type="hidden" name="reason" value="${escapeHtml(reason)}">
      <button type="submit" class="secondary" ${disabled}>${escapeHtml(label)}</button>
    </form>`;
}

function adminCharacterIssuesSection(view: AdminCharacterDetailView): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Diagnostics</h2>
          <span class="muted">Read-only checks for missing templates, invalid counts, and warehouse slot overflow.</span>
        </div>
        <span class="pill">${view.issues.length} issue${view.issues.length === 1 ? "" : "s"}</span>
      </div>
      ${
        view.issues.length
          ? `<ul class="admin-issue-list">
              ${view.issues.map(issue => `<li class="${issue.severity === "error" ? "error" : ""}"><strong>${escapeHtml(formatEnum(issue.severity))}</strong> ${escapeHtml(issue.message)}</li>`).join("")}
            </ul>`
          : `<div class="empty">No obvious storage, mail, or broker data issues were found.</div>`
      }
    </section>`;
}

type AdminInventoryInspectorOptions = {
  characterWarehouseLimit?: number;
  accountWarehouseLimit?: number;
  discard?: {
    recipientCharacterId: number;
    enabled: boolean;
  };
};

function adminInventoryInspectorSection(
  title: string,
  items: InventoryItem[],
  description: string,
  options: AdminInventoryInspectorOptions = {},
): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>${escapeHtml(title)}</h2>
          <span class="muted">${escapeHtml(description)}</span>
        </div>
        <span class="pill">${items.length} row${items.length === 1 ? "" : "s"}</span>
      </div>
      ${
        items.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr><th>Item</th><th>Count</th><th>Storage</th><th>Slot</th><th>Flags</th></tr>
                </thead>
                <tbody>
                  ${items.map(item => adminInventoryInspectorRow(item, options)).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No inventory rows were found for this scope.</div>`
      }
    </section>`;
}

function adminInventoryInspectorRow(item: InventoryItem, options: AdminInventoryInspectorOptions): string {
  const flags = itemFlags(item).join(", ") || "None";
  const currentStorageLimit = adminInspectorStorageLimit(item, options);
  const discardForm = adminInventoryDiscardForm(item, options);
  const repairSlotForm = adminInventoryRepairSlotForm(item, options, currentStorageLimit);
  const repairCountForm = adminInventoryRepairCountForm(item, options);
  return `
    <tr>
      <td>${adminInspectorItem(item.itemId, item.itemName, `Object #${item.itemUniqueId}`)}</td>
      <td>${escapeHtml(formatIntegerString(item.itemCount))}</td>
      <td>${escapeHtml(item.storageName)} <div class="muted">location ${item.storageId}</div></td>
      <td>${escapeHtml(item.slot)}</td>
      <td>
        <div>${escapeHtml(flags)}</div>
        <div class="admin-bundle-actions">
          <button
            type="button"
            class="secondary"
            data-admin-storage-rule-check
            data-item-id="${item.itemId}"
            data-is-soul-bound="${item.soulBound ? "true" : "false"}"
            data-item-count="${escapeHtml(item.itemCount)}"
            data-current-storage-id="${item.storageId}"
            data-current-slot="${escapeHtml(item.slot)}"
            data-current-storage-limit="${currentStorageLimit ?? ""}"
          >Check rules</button>
          ${repairCountForm}
          ${repairSlotForm}
          ${discardForm}
        </div>
        <div class="muted" data-admin-storage-rule-status></div>
      </td>
    </tr>`;
}

function adminInventoryRepairCountForm(item: InventoryItem, options: AdminInventoryInspectorOptions): string {
  if (!options.discard?.enabled || !isAdminCountRepairCandidate(item)) {
    return "";
  }

  const itemLabel = item.itemName ?? `item ${item.itemId}`;
  const maxStack = String(item.itemMaxStackCount);
  return `
    <form method="post" action="/admin/items/repair-count" data-confirm-submit="Clamp ${escapeHtml(itemLabel)} to ${escapeHtml(formatIntegerString(maxStack))}? Excess count will be removed." data-admin-requires-live-character="${options.discard.recipientCharacterId}" data-live-enabled="false">
      <input type="hidden" name="recipientCharacterId" value="${options.discard.recipientCharacterId}">
      <input type="hidden" name="itemUniqueId" value="${item.itemUniqueId}">
      <input type="hidden" name="storageId" value="${item.storageId}">
      <input type="hidden" name="targetCount" value="${escapeHtml(maxStack)}">
      <input type="hidden" name="reason" value="admin-inspector-count-repair">
      <button type="submit" class="secondary" disabled>Clamp count</button>
    </form>`;
}

function adminInventoryRepairSlotForm(
  item: InventoryItem,
  options: AdminInventoryInspectorOptions,
  currentStorageLimit: number | undefined,
): string {
  if (!options.discard?.enabled || !isAdminSlotRepairCandidate(item, currentStorageLimit)) {
    return "";
  }

  const itemLabel = item.itemName ?? `item ${item.itemId}`;
  return `
    <form method="post" action="/admin/items/repair-slot" data-confirm-submit="Move ${escapeHtml(itemLabel)} to the first free live warehouse slot?" data-admin-requires-live-character="${options.discard.recipientCharacterId}" data-live-enabled="false">
      <input type="hidden" name="recipientCharacterId" value="${options.discard.recipientCharacterId}">
      <input type="hidden" name="itemUniqueId" value="${item.itemUniqueId}">
      <input type="hidden" name="storageId" value="${item.storageId}">
      <input type="hidden" name="reason" value="admin-inspector-slot-repair">
      <button type="submit" class="secondary" disabled>Repair slot</button>
    </form>`;
}

function adminInventoryDiscardForm(item: InventoryItem, options: AdminInventoryInspectorOptions): string {
  if (!options.discard?.enabled || !isAdminDiscardCandidate(item)) {
    return "";
  }

  const itemLabel = item.itemName ?? `item ${item.itemId}`;
  return `
    <form method="post" action="/admin/items/discard" data-confirm-submit="Discard ${escapeHtml(itemLabel)} from live storage? This removes the full item row." data-admin-requires-live-character="${options.discard.recipientCharacterId}" data-live-enabled="false">
      <input type="hidden" name="recipientCharacterId" value="${options.discard.recipientCharacterId}">
      <input type="hidden" name="itemUniqueId" value="${item.itemUniqueId}">
      <input type="hidden" name="storageId" value="${item.storageId}">
      <input type="hidden" name="reason" value="admin-inspector-discard">
      <button type="submit" class="danger" disabled>Discard</button>
    </form>`;
}

function isAdminDiscardCandidate(item: InventoryItem): boolean {
  return (item.storageId === 0 || item.storageId === 1 || item.storageId === 2)
    && item.itemId !== KINAH_ITEM_ID
    && !item.equipped
    && (item.itemGroup ?? "").toLocaleLowerCase("en-US") !== "quest";
}

function isAdminSlotRepairCandidate(item: InventoryItem, currentStorageLimit: number | undefined): boolean {
  if ((item.storageId !== 1 && item.storageId !== 2) || currentStorageLimit === undefined || item.itemId === KINAH_ITEM_ID || item.equipped) {
    return false;
  }
  const slot = Number.parseInt(item.slot, 10);
  return !Number.isFinite(slot) || slot < 0 || slot >= currentStorageLimit;
}

function isAdminCountRepairCandidate(item: InventoryItem): boolean {
  if ((item.storageId !== 0 && item.storageId !== 1 && item.storageId !== 2) || item.itemId === KINAH_ITEM_ID || item.equipped || item.itemMaxStackCount <= 0) {
    return false;
  }
  if (!isPositiveIntegerString(item.itemCount)) {
    return false;
  }
  return BigInt(item.itemCount) > BigInt(item.itemMaxStackCount);
}

function adminInspectorStorageLimit(item: InventoryItem, options: AdminInventoryInspectorOptions): number | undefined {
  if (item.itemId === KINAH_ITEM_ID) {
    return undefined;
  }
  if (item.storageId === 1) {
    return options.characterWarehouseLimit;
  }
  if (item.storageId === 2) {
    return options.accountWarehouseLimit;
  }
  return undefined;
}

function adminMailInspectorSection(view: AdminCharacterDetailView): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Mailbox</h2>
          <span class="muted">Latest mail table rows for this recipient.</span>
        </div>
        <span class="pill">${view.mail.length} shown</span>
      </div>
      ${
        view.mail.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr><th>Letter</th><th>Sender</th><th>Attachment</th><th>Kinah</th><th>Status</th><th>Received</th></tr>
                </thead>
                <tbody>
                  ${view.mail.map(adminMailInspectorRow).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No mail rows were found for this character.</div>`
      }
    </section>`;
}

function adminMailInspectorRow(row: AdminCharacterDetailView["mail"][number]): string {
  const attachment = row.attachedItemId > 0
    ? adminInspectorItem(row.attachedItemId, row.attachedItemName, `Template ${row.attachedItemId}`)
    : `<span class="muted">None</span>`;
  return `
    <tr>
      <td><strong>${escapeHtml(row.title)}</strong><div class="muted">Mail #${row.mailUniqueId}</div></td>
      <td>${escapeHtml(row.senderName)}</td>
      <td>${attachment}</td>
      <td>${escapeHtml(formatIntegerString(row.attachedKinahCount))}</td>
      <td>${row.unread ? `<span class="pill online">Unread</span>` : `<span class="pill">Read</span>`} ${row.express ? `<span class="pill">Express ${row.express}</span>` : ""}</td>
      <td>${escapeHtml(formatDate(row.receivedTime))}</td>
    </tr>`;
}

function adminBrokerInspectorSection(view: AdminCharacterDetailView): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Broker</h2>
          <span class="muted">Broker listings owned by this character.</span>
        </div>
        <span class="pill">${view.broker.length} shown</span>
      </div>
      ${
        view.broker.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr><th>Listing</th><th>Count</th><th>Price</th><th>Race</th><th>Status</th><th>Expires</th></tr>
                </thead>
                <tbody>
                  ${view.broker.map(adminBrokerInspectorRow).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No broker listings were found for this character.</div>`
      }
    </section>`;
}

function adminBrokerInspectorRow(row: AdminCharacterDetailView["broker"][number]): string {
  const status = [
    row.sold ? "Sold" : "Listed",
    row.settled ? "Settled" : "",
    row.splittingAvailable ? "Splittable" : "",
  ].filter(Boolean).join(", ");
  return `
    <tr>
      <td>${adminInspectorItem(row.itemId, row.itemName, `Listing #${row.id}`)}<div class="muted">Pointer #${row.itemPointer}${row.itemCreator ? ` / ${escapeHtml(row.itemCreator)}` : ""}</div></td>
      <td>${escapeHtml(formatIntegerString(row.itemCount))}</td>
      <td>${escapeHtml(formatIntegerString(row.price))}</td>
      <td>${escapeHtml(formatEnum(row.brokerRace))}</td>
      <td>${escapeHtml(status || "Listed")}</td>
      <td>${escapeHtml(formatDate(row.expireTime))}</td>
    </tr>`;
}

function adminInspectorItem(itemId: number, itemName: string | undefined, detail: string): string {
  return `
    <div class="admin-inspector-item">
      <img src="/icons/item/${itemId}" alt="">
      <div>
        <strong>${escapeHtml(itemName ?? `Item ${itemId}`)}</strong>
        <div class="muted">${escapeHtml(detail)} / template ${itemId}</div>
      </div>
    </div>`;
}

function detailRow(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function formatCoordinate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : String(value);
}

function adminMailRecipientOption(character: AdminDashboardView["characters"]["online"][number]): string {
  return `<option value="${character.id}">${escapeHtml(character.name)} (#${character.id}) / ${character.online ? "Online" : "Offline"}</option>`;
}

function adminCharacterSection(
  title: string,
  characters: AdminDashboardView["characters"]["online"],
  description: string,
): string {
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>${escapeHtml(title)}</h2>
          <span class="muted">${escapeHtml(description)}</span>
        </div>
        <span class="pill">${characters.length} character${characters.length === 1 ? "" : "s"}</span>
      </div>
      ${
        characters.length
          ? `<div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Character</th>
                    <th>Account</th>
                    <th>Race / Class</th>
                    <th>Status</th>
                    <th>Last online</th>
                  </tr>
                </thead>
                <tbody>
                  ${characters.map(adminCharacterRow).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">No characters in this group.</div>`
      }
    </section>`;
}

function adminCharacterRow(character: AdminDashboardView["characters"]["online"][number]): string {
  return `
    <tr>
      <td>
        <strong><a href="/admin/characters/${character.id}">${escapeHtml(character.name)}</a></strong>
        <div class="muted">Character #${character.id}</div>
      </td>
      <td>
        <a href="/admin/accounts/${character.accountId}">${escapeHtml(character.accountName)}</a>
        <div class="muted">Account #${character.accountId}</div>
      </td>
      <td>${escapeHtml(character.race)} / ${escapeHtml(character.playerClass)}</td>
      <td>${character.online ? `<span class="pill online">Online</span>` : `<span class="pill">Offline</span>`}</td>
      <td>${escapeHtml(formatDate(character.lastOnline))}</td>
    </tr>`;
}

function formatDate(value: Date | null): string {
  if (!value) {
    return "Never";
  }
  return `${value.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDurationSeconds(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0s";
  }
  const totalSeconds = Math.floor(value);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [
    days ? `${days}d` : "",
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
    !days && !hours && !minutes ? `${seconds}s` : "",
  ].filter(Boolean);
  return parts.join(" ");
}

function formatIntegerString(value: string): string {
  try {
    return new Intl.NumberFormat("en-US").format(BigInt(value));
  } catch {
    return value;
  }
}

function isPositiveIntegerString(value: string): boolean {
  if (!/^\d+$/.test(value)) {
    return false;
  }
  return BigInt(value) > 0n;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
