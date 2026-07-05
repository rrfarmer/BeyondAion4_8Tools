import type {
  AdminDashboardView,
  InventoryItem,
  WarehouseHubView,
  WarehouseSection,
} from "./aionData.js";
import { KINAH_ITEM_ID, transferStorageSections } from "./aionData.js";
import type { PortalUser } from "./authStore.js";

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
  const adminLink = options.user?.isAdmin ? `<a href="/admin">Admin</a>` : "";
  const nav = options.user
    ? `
      <nav>
        <a href="/warehouses">Warehouses</a>
        ${adminLink}
        <form method="post" action="/logout"><button type="submit">Sign out</button></form>
      </nav>`
    : `
      <nav>
        <a href="/login">Sign in</a>
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
          --bg: #0b0f17;
          --panel: #111827;
          --panel-2: #151e2f;
          --border: #26334a;
          --text: #e8edf7;
          --muted: #99a6bd;
          --accent: #63b3ff;
          --accent-strong: #2383e2;
          --danger: #ff8d8d;
          --good: #5de0a8;
        }
        * { box-sizing: border-box; }
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
          min-height: 56px;
          padding: 0 24px;
          border-bottom: 1px solid var(--border);
          background: rgba(17, 24, 39, 0.92);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        header strong { font-size: 17px; }
        nav { display: flex; align-items: center; gap: 14px; }
        nav form { margin: 0; }
        main { width: min(1120px, calc(100vw - 32px)); margin: 28px auto; }
        a { color: var(--accent); text-decoration: none; }
        a:hover { text-decoration: underline; }
        h1 { margin: 0 0 18px; font-size: 28px; letter-spacing: 0; }
        h2 { margin: 0; font-size: 20px; letter-spacing: 0; }
        .panel {
          background: rgba(17, 24, 39, 0.94);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 18px;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; }
        .stat { display: grid; gap: 5px; }
        .stat-value { font-size: 28px; line-height: 1; font-weight: 800; }
        .character { display: flex; flex-direction: column; gap: 8px; }
        .page-actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 14px 0 18px; }
        .muted { color: var(--muted); }
        .error { color: var(--danger); margin: 0 0 12px; }
        .notice { background: #13243d; border: 1px solid #285a92; color: #d7eaff; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; }
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
          padding: 0 12px;
          border: 1px solid #2f8fe8;
          border-radius: 6px;
          background: var(--accent-strong);
          color: white;
          font: inherit;
          cursor: pointer;
        }
        button.secondary, .button.secondary {
          border-color: var(--border);
          background: var(--panel);
          color: var(--text);
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
        .admin-mail-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          align-items: end;
        }
        .admin-mail-form .wide { grid-column: 1 / -1; }
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
          padding: 9px 10px;
          border-bottom: 1px solid var(--border);
          text-align: left;
          vertical-align: top;
          font-size: 14px;
        }
        th { background: #1b263a; color: #c6d2e8; font-weight: 700; }
        tr:last-child td { border-bottom: 0; }
        tbody tr:hover { background: rgba(99, 179, 255, 0.08); }
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
        <strong>Aion Portal</strong>
        ${nav}
      </header>
      <main>
        ${options.notice ? `<div class="notice">${escapeHtml(options.notice)}</div>` : ""}
        ${options.body}
      </main>
      <script>
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

          document.querySelectorAll("[data-admin-item-browser]").forEach(browser => {
            const form = document.querySelector("[data-admin-mail-form]");
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
): string {
  return `
    <h1>Admin</h1>
    <p class="muted">Read-only snapshot from the Aion login and game databases.</p>
    ${notice ? `<div class="notice ${notice.kind === "error" ? "error" : ""}">${escapeHtml(notice.message)}</div>` : ""}
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
      ${adminMailForm(view)}
      ${adminCharacterSection("Online Characters", view.characters.online, "Characters currently marked online in the game database.")}
      ${adminCharacterSection("Offline Characters", view.characters.offline, "Characters currently marked offline in the game database.")}
      ${adminAccountsSection(view)}
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

function adminAccountRow(account: AdminDashboardView["adminAccounts"][number]): string {
  return `
    <tr>
      <td>${account.id}</td>
      <td>${escapeHtml(account.name)}</td>
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

function adminMailForm(view: AdminDashboardView): string {
  const recipients = [...view.characters.online, ...view.characters.offline];
  return `
    <section class="panel">
      <div class="warehouse-header">
        <div class="warehouse-copy">
          <h2>Express Mail Item</h2>
          <span class="muted">Creates an unread express letter with one attached item.</span>
        </div>
      </div>
      ${
        recipients.length
          ? `<div class="admin-mail-layout">
              <form class="admin-mail-form" method="post" action="/admin/mail-items" data-admin-mail-form>
                <label class="wide">Recipient
                  <select name="recipientCharacterId" required>
                    ${recipients.map(adminMailRecipientOption).join("")}
                  </select>
                </label>
                <div class="wide admin-selected-item" data-admin-selected-item>
                  <img src="/icons/item/0" alt="">
                  <div>
                    <strong>No item selected</strong>
                    <div class="muted">Select an item or enter a template id.</div>
                  </div>
                </div>
                <label>Item template id
                  <input name="itemId" type="number" min="1" inputmode="numeric" required data-admin-mail-item-id>
                </label>
                <label>Count
                  <input name="itemCount" type="number" min="1" inputmode="numeric" value="1" required data-admin-mail-item-count>
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
                  <button type="submit">Send express mail</button>
                </div>
              </form>
              <div class="admin-item-browser" data-admin-item-browser>
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
    </section>`;
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
        <strong>${escapeHtml(character.name)}</strong>
        <div class="muted">Character #${character.id}</div>
      </td>
      <td>
        ${escapeHtml(character.accountName)}
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
