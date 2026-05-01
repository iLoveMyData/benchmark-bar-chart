"use strict";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import * as d3 from "d3";

import { VisualFormattingSettingsModel } from "./settings";
import { transformDataView, BenchmarkData, BenchmarkItem } from "./dataTransformer";
import { TRANSLATIONS } from "./translations";
import "./../style/visual.less";

import IVisual                  = powerbi.extensibility.visual.IVisual;
import IVisualHost              = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions      = powerbi.extensibility.visual.VisualUpdateOptions;
import ILocalizationManager     = powerbi.extensibility.ILocalizationManager;
import ISelectionManager        = powerbi.extensibility.ISelectionManager;

type ModeId   = "flop" | "top" | "all" | "pareto";
type MetricId = "pct" | "abs";
type NId      = "auto" | "5" | "10" | "15" | "20" | "all";

interface DropOpt<TId extends string = string> {
    id: TId;
    label: string;
    icon?: string;
    hint?: string;
}

interface BinDef {
    min: number;
    max: number;
    side: "under" | "tol" | "over";
    deep: boolean;
    count?: number;
}

interface RowsResult {
    rows: BenchmarkItem[];
    totalPages: number;
    totalAfterFilter: number;
}

const STATE_OBJECT_NAME = "state";

export class Visual implements IVisual {
    /* ── powerbi handles ───────────────────────────────────────────────── */
    private host: IVisualHost;
    private root: HTMLElement;
    private selectionManager: ISelectionManager;
    private localizationManager: ILocalizationManager;

    /* ── DOM (built once in constructor) ──────────────────────────────── */
    private rootEl!: HTMLElement;          // .bb-root
    private mainEl!: HTMLElement;          // .bb-main
    private contentEl!: HTMLElement;       // .bb-content
    private headEl!: HTMLElement;
    private titleEl!: HTMLElement;
    private headRow1!: HTMLElement;
    private headRow2!: HTMLElement;
    private controlsEl!: HTMLElement;
    private searchWrap!: HTMLElement;
    private searchInput!: HTMLInputElement;
    private searchClear!: HTMLButtonElement;
    private dropMode!: HTMLElement;
    private dropMetric!: HTMLElement;
    private dropN!: HTMLElement;
    private chartWrap!: HTMLElement;
    private chartSvg!: SVGSVGElement;
    private emptyEl!: HTMLElement;
    private welcomeEl!: HTMLElement;
    private pagerEl!: HTMLElement;
    private pagerPrev!: HTMLButtonElement;
    private pagerNext!: HTMLButtonElement;
    private pagerInfo!: HTMLElement;
    private panelEl!: HTMLElement;
    private ttEl!: HTMLElement;

    /* ── runtime data ─────────────────────────────────────────────────── */
    private formattingSettings!: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private events!: powerbi.extensibility.IVisualEventService;
    private tooltipService!: powerbi.extensibility.ITooltipService;
    private data: BenchmarkData = {
        items: [], hasCategory: false, hasM1: false, hasM2: false,
        m1ColumnName: "", m2ColumnName: "", categoryColumnName: "",
        anyHighlight: false
    };

    /* ── persistent UI state ──────────────────────────────────────────── */
    private state = {
        mode:   "flop"   as ModeId,
        metric: "abs"    as MetricId,
        n:      "auto"   as NId,
        page:   0,
        search: ""
    };
    private stateLoaded = false;
    private firstRender = true;

    /* ── scratch ──────────────────────────────────────────────────────── */
    private resizeObserver: ResizeObserver | null = null;
    private outsideClickHandler: ((e: MouseEvent) => void) | null = null;
    private viewport = { width: 100, height: 100 };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.root = options.element;
        this.formattingSettingsService = new FormattingSettingsService();
        this.selectionManager = this.host.createSelectionManager();
        this.localizationManager = this.host.createLocalizationManager();
        // Required for AppSource certification: rendering events + tooltip service.
        this.events = this.host.eventService;
        this.tooltipService = this.host.tooltipService;

        this.buildDOM();
        this.attachStaticHandlers();
    }

    /* =====================================================================
     * DOM construction
     * =================================================================== */
    private buildDOM(): void {
        this.rootEl = document.createElement("div");
        this.rootEl.className = "bb-root";
        this.rootEl.setAttribute("role", "img");
        this.rootEl.setAttribute("aria-label", this.lz("Visual_AriaLabel", "Benchmark Bar Chart"));
        this.root.appendChild(this.rootEl);

        // header
        this.headEl = this.mk("div", "bb-head");
        this.rootEl.appendChild(this.headEl);

        this.headRow1 = this.mk("div", "bb-head-row1");
        this.titleEl = this.mk("div", "bb-title");
        this.headRow1.appendChild(this.titleEl);
        this.headEl.appendChild(this.headRow1);

        this.headRow2 = this.mk("div", "bb-head-row2");
        this.controlsEl = this.mk("div", "bb-controls");
        this.headRow2.appendChild(this.controlsEl);
        this.headEl.appendChild(this.headRow2);

        // Pills come FIRST (left), search comes LAST (right)
        this.dropMode   = this.mkDropdownTrigger();
        this.dropMetric = this.mkDropdownTrigger();
        this.dropN      = this.mkDropdownTrigger();
        this.controlsEl.appendChild(this.dropMode);
        this.controlsEl.appendChild(this.dropMetric);
        this.controlsEl.appendChild(this.dropN);

        // search input — last in the controls bar
        this.searchWrap = this.mk("div", "bb-search");
        const svgIcon = this.svgEl("svg", { class: "bb-search-icon", width: "13", height: "13", viewBox: "0 0 13 13", fill: "none" });
        const c = this.svgEl("circle", { cx: "5.5", cy: "5.5", r: "3.8", stroke: "currentColor", "stroke-width": "1.4" });
        const p = this.svgEl("path", { d: "M8.4 8.4 L11.5 11.5", stroke: "currentColor", "stroke-width": "1.4", "stroke-linecap": "round" });
        svgIcon.appendChild(c); svgIcon.appendChild(p);
        this.searchWrap.appendChild(svgIcon);

        this.searchInput = document.createElement("input");
        this.searchInput.type = "text";
        this.searchWrap.appendChild(this.searchInput);

        this.searchClear = document.createElement("button");
        this.searchClear.className = "bb-search-clear";
        this.searchClear.setAttribute("aria-label", "Clear");
        this.searchClear.textContent = "×";
        this.searchWrap.appendChild(this.searchClear);

        this.controlsEl.appendChild(this.searchWrap);

        // main
        this.mainEl = this.mk("div", "bb-main");
        this.rootEl.appendChild(this.mainEl);

        this.contentEl = this.mk("div", "bb-content");
        this.mainEl.appendChild(this.contentEl);

        this.chartWrap = this.mk("div", "bb-chart-wrap");
        this.contentEl.appendChild(this.chartWrap);

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "bb-chart");
        svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
        // shine gradient
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        grad.setAttribute("id", "bb-shine-grad");
        grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
        grad.setAttribute("x2", "100%"); grad.setAttribute("y2", "0%");
        const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s1.setAttribute("offset", "0%");   s1.setAttribute("stop-color", "#fff"); s1.setAttribute("stop-opacity", "0");
        const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s2.setAttribute("offset", "50%");  s2.setAttribute("stop-color", "#fff"); s2.setAttribute("stop-opacity", "0.6");
        const s3 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s3.setAttribute("offset", "100%"); s3.setAttribute("stop-color", "#fff"); s3.setAttribute("stop-opacity", "0");
        grad.appendChild(s1); grad.appendChild(s2); grad.appendChild(s3);
        defs.appendChild(grad);
        svg.appendChild(defs);
        this.chartSvg = svg;
        this.chartWrap.appendChild(svg);

        // empty state
        this.emptyEl = this.mk("div", "bb-empty");
        const emptyCard = this.mk("div", "bb-empty-card");
        const emptyTitle = this.mk("div", "bb-empty-title");
        emptyTitle.textContent = this.lz("Empty_Title", "No item to display");
        const emptyDesc = this.mk("div", "bb-empty-desc");
        emptyDesc.textContent = this.lz("Empty_Desc", "The current filter returned no items.");
        emptyCard.appendChild(emptyTitle); emptyCard.appendChild(emptyDesc);
        this.emptyEl.appendChild(emptyCard);
        this.chartWrap.appendChild(this.emptyEl);

        // pager
        this.pagerEl = this.mk("div", "bb-pager");
        this.pagerPrev = document.createElement("button");
        this.pagerPrev.className = "bb-pager-btn";
        this.pagerPrev.setAttribute("aria-label", "Previous page");
        this.pagerPrev.innerHTML = `<svg width="8" height="10" viewBox="0 0 8 10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5.5 1 L1.5 5 L5.5 9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        this.pagerInfo = this.mk("span", "bb-pager-info");
        this.pagerInfo.textContent = "1 / 1";
        this.pagerNext = document.createElement("button");
        this.pagerNext.className = "bb-pager-btn";
        this.pagerNext.setAttribute("aria-label", "Next page");
        this.pagerNext.innerHTML = `<svg width="8" height="10" viewBox="0 0 8 10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.5 1 L6.5 5 L2.5 9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        this.pagerEl.appendChild(this.pagerPrev);
        this.pagerEl.appendChild(this.pagerInfo);
        this.pagerEl.appendChild(this.pagerNext);
        this.chartWrap.appendChild(this.pagerEl);

        // welcome (empty data roles) — Comparative-style
        this.welcomeEl = this.mk("div", "bb-welcome");
        const welcomeCard = this.mk("div", "bb-welcome-card");

        // Hero illustration (inline SVG mini benchmark)
        const hero = this.mk("div", "bb-welcome-hero");
        hero.innerHTML = `
<svg viewBox="0 0 240 110" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <!-- bars with stagger reveal -->
  <g>
    <rect x="64" y="6"  width="170" height="16" rx="8" fill="#F0477A">
      <animate attributeName="width" from="0" to="170" dur="540ms" begin="80ms" fill="freeze"/>
    </rect>
    <text x="56" y="18" font-size="9" fill="#0E1336" text-anchor="end" font-family="Segoe UI, sans-serif">+42%</text>
  </g>
  <g>
    <rect x="64" y="28" width="138" height="16" rx="8" fill="#FBD2DE">
      <animate attributeName="width" from="0" to="138" dur="540ms" begin="160ms" fill="freeze"/>
    </rect>
    <text x="56" y="40" font-size="9" fill="#0E1336" text-anchor="end" font-family="Segoe UI, sans-serif">+18%</text>
  </g>
  <g>
    <rect x="64" y="50" width="56"  height="16" rx="8" fill="#ECECF3">
      <animate attributeName="width" from="0" to="56"  dur="540ms" begin="240ms" fill="freeze"/>
    </rect>
    <text x="56" y="62" font-size="9" fill="#0E1336" text-anchor="end" font-family="Segoe UI, sans-serif">+3%</text>
  </g>
  <g>
    <rect x="64" y="72" width="98"  height="16" rx="8" fill="#DBCCFB">
      <animate attributeName="width" from="0" to="98"  dur="540ms" begin="320ms" fill="freeze"/>
    </rect>
    <text x="56" y="84" font-size="9" fill="#0E1336" text-anchor="end" font-family="Segoe UI, sans-serif">−12%</text>
  </g>
  <g>
    <rect x="64" y="94" width="34"  height="16" rx="8" fill="#7E45FF">
      <animate attributeName="width" from="0" to="34"  dur="540ms" begin="400ms" fill="freeze"/>
    </rect>
    <text x="56" y="106" font-size="9" fill="#0E1336" text-anchor="end" font-family="Segoe UI, sans-serif">−28%</text>
  </g>
</svg>`;

        const welcomeTitle = this.mk("div", "bb-welcome-title");
        welcomeTitle.textContent = this.lz("Welcome_Title", "Benchmark Bar Chart");

        const welcomeDesc = this.mk("div", "bb-welcome-desc");
        welcomeDesc.textContent = this.lz("Welcome_Desc",
            "Compare a reference value against an actual value, item by item. Spot the biggest variances at a glance.");

        const welcomeList = document.createElement("ul");
        welcomeList.className = "bb-welcome-list";

        const buildItem = (dotClass: string, label: string, hint: string): HTMLElement => {
            const li = document.createElement("li");
            li.className = "bb-welcome-item";
            const dot = this.mk("span", "bb-welcome-dot " + dotClass);
            const body = this.mk("div", "bb-welcome-body");
            const lbl = this.mk("div", "bb-welcome-label");
            lbl.textContent = label;
            const hnt = this.mk("div", "bb-welcome-hint-row");
            hnt.textContent = hint;
            body.appendChild(lbl); body.appendChild(hnt);
            li.appendChild(dot); li.appendChild(body);
            return li;
        };

        welcomeList.appendChild(buildItem("dot-cat",
            this.lz("Role_Category", "Item / Project"),
            this.lz("Welcome_CatHint", "the identifier (project, customer …)")));
        welcomeList.appendChild(buildItem("dot-m1",
            this.lz("Role_M1", "Reference value (planned)"),
            this.lz("Welcome_M1Role", "the planned / target value")));
        welcomeList.appendChild(buildItem("dot-m2",
            this.lz("Role_M2", "Actual value"),
            this.lz("Welcome_M2Role", "the actual / consumed value")));

        const welcomeFoot = this.mk("div", "bb-welcome-foot");
        welcomeFoot.textContent = this.lz("Welcome_Hint",
            "Add the three fields above to get started.");

        welcomeCard.appendChild(hero);
        welcomeCard.appendChild(welcomeTitle);
        welcomeCard.appendChild(welcomeDesc);
        welcomeCard.appendChild(welcomeList);
        welcomeCard.appendChild(welcomeFoot);
        this.welcomeEl.appendChild(welcomeCard);
        this.welcomeEl.style.display = "none";
        this.rootEl.appendChild(this.welcomeEl);

        // panel
        this.panelEl = this.mk("aside", "bb-panel");
        this.mainEl.appendChild(this.panelEl);

        // tooltip
        this.ttEl = this.mk("div", "bb-tt");
        this.rootEl.appendChild(this.ttEl);
    }

    private mk(tag: string, cls: string = ""): HTMLElement {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        return e;
    }
    private svgEl(tag: string, attrs: Record<string, string>): SVGElement {
        const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        return e as SVGElement;
    }
    private mkDropdownTrigger(): HTMLElement {
        const el = this.mk("div", "bb-drop");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-expanded", "false");
        return el;
    }

    /* =====================================================================
     * Static handlers (search, pager, context menu)
     * =================================================================== */
    private attachStaticHandlers(): void {
        // search input
        this.searchInput.addEventListener("input", () => {
            const wasEmpty = this.state.search === "";
            this.state.search = (this.searchInput.value || "").trim();
            this.state.page = 0;
            const auto = this.formattingSettings?.search?.autoSwitchAllOnSearch?.value !== false;
            if (auto && wasEmpty && this.state.search) {
                this.state.mode = "all";
                this.state.n = "all";
            }
            this.searchWrap.classList.toggle("has-value", !!this.state.search);
            this.persistState();
            this.rebuildControls();
            this.render();
        });
        this.searchInput.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Escape" && this.state.search) {
                e.preventDefault();
                this.clearSearch();
            }
        });
        this.searchClear.addEventListener("click", () => {
            this.clearSearch();
            this.searchInput.focus();
        });

        // pager
        this.pagerPrev.addEventListener("click", () => {
            if (this.state.page > 0) {
                this.state.page--;
                this.persistState();
                this.render();
            }
        });
        this.pagerNext.addEventListener("click", () => {
            this.state.page++;
            this.persistState();
            this.render();
        });

        // close dropdowns on outside click
        this.outsideClickHandler = (e: MouseEvent) => {
            [this.dropMode, this.dropMetric, this.dropN].forEach(d => {
                if (d && !d.contains(e.target as Node)) {
                    this.closeDropdown(d);
                }
            });
        };
        document.addEventListener("mousedown", this.outsideClickHandler);

        // context menu (AppSource cert 1180.2.5)
        this.rootEl.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
            const sm = this.selectionManager;
            const target = e.target as HTMLElement;
            const barEl = target?.closest?.("rect.bb-bar") as SVGRectElement | null;
            const sel: powerbi.extensibility.ISelectionId | Record<string, never> =
                (barEl && (barEl as unknown as { __data__?: BenchmarkItem }).__data__?.selectionId) || {};
            sm.showContextMenu(sel as powerbi.extensibility.ISelectionId, { x: e.clientX, y: e.clientY });
        });

        // ResizeObserver for crisp re-render
        try {
            this.resizeObserver = new ResizeObserver(() => {
                if (!this.formattingSettings) return;
                this.viewport.width = this.chartWrap.clientWidth || this.viewport.width;
                this.viewport.height = this.chartWrap.clientHeight || this.viewport.height;
                this.render();
            });
            this.resizeObserver.observe(this.chartWrap);
        } catch (_) { /* IE / older */ }

        // mouseleave on chart hides tooltip
        this.chartSvg.addEventListener("mouseleave", () => this.hideTooltip());
    }

    private clearSearch(): void {
        this.searchInput.value = "";
        this.state.search = "";
        this.state.page = 0;
        this.searchWrap.classList.remove("has-value");
        this.persistState();
        this.render();
    }

    /* =====================================================================
     * Update — main entry point from PowerBI
     * =================================================================== */
    public update(options: VisualUpdateOptions): void {
        // AppSource cert : signal render lifecycle to the host.
        if (this.events) { try { this.events.renderingStarted(options); } catch (_) { /* ignore */ } }
        try {
            const dataView = options?.dataViews?.[0];
            this.viewport.width = options?.viewport?.width || this.rootEl.clientWidth || 800;
            this.viewport.height = options?.viewport?.height || this.rootEl.clientHeight || 400;

            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
                VisualFormattingSettingsModel, dataView
            );

            this.data = transformDataView(dataView, this.host);

            // Restore state once from metadata.objects.state
            if (!this.stateLoaded) {
                const stObj = (dataView?.metadata?.objects?.[STATE_OBJECT_NAME] || {}) as Record<string, unknown>;
                if (typeof stObj.mode === "string"   && this.isValidMode(stObj.mode))     this.state.mode   = stObj.mode as ModeId;
                else                                                                       this.state.mode   = (this.formattingSettings.sortDefaults.defaultMode.value.value as ModeId) || "flop";
                if (typeof stObj.metric === "string" && this.isValidMetric(stObj.metric)) this.state.metric = stObj.metric as MetricId;
                else                                                                       this.state.metric = (this.formattingSettings.sortDefaults.defaultMetric.value.value as MetricId) || "abs";
                if (typeof stObj.n === "string"      && this.isValidN(stObj.n))           this.state.n      = stObj.n as NId;
                else                                                                       this.state.n      = (this.formattingSettings.sortDefaults.defaultN.value.value as NId) || "auto";
                if (typeof stObj.page === "number")  this.state.page = Math.max(0, stObj.page as number);
                if (typeof stObj.search === "string") this.state.search = String(stObj.search);

                this.searchInput.value = this.state.search;
                if (this.state.search) this.searchWrap.classList.add("has-value");
                this.stateLoaded = true;
            }

            this.applyCssTokens();
            this.applyTitle();
            this.applySearchPlaceholder();

            // welcome state — hide header (title + controls) too, only the welcome card shows
            const showWelcome = !(this.data.hasCategory && this.data.hasM1 && this.data.hasM2);
            this.welcomeEl.style.display = showWelcome ? "flex" : "none";
            if (showWelcome) {
                this.headEl.style.display = "none";
                this.contentEl.style.visibility = "hidden";
                this.panelEl.style.display = "none";
                return;
            }
            this.headEl.style.display = "";
            this.contentEl.style.visibility = "";
            // Auto-hide panel when the visual is too small to fit it AND the chart.
            // Width threshold: ~480px. Height threshold: ~280px (below which panel content
            // would overlap the chart bars even with reduced row heights).
            const userWantsPanel = !!this.formattingSettings.panel.show.value;
            const w = this.viewport.width || this.rootEl.clientWidth || 0;
            const h = this.viewport.height || this.rootEl.clientHeight || 0;
            const enough = w >= 480 && h >= 280;
            this.panelEl.style.display = (userWantsPanel && enough) ? "" : "none";

            this.rebuildControls();
            this.render();
            if (this.events) { try { this.events.renderingFinished(options); } catch (_) { /* ignore */ } }
        } catch (err) {
            // never let an exception bubble to the host
            try { console.error("[BenchmarkBarChart] update error:", err); } catch (_) { /* ignore */ }
            if (this.events) { try { this.events.renderingFailed(options, String(err)); } catch (_) { /* ignore */ } }
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    public destroy(): void {
        if (this.outsideClickHandler) {
            document.removeEventListener("mousedown", this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
        if (this.resizeObserver) {
            try { this.resizeObserver.disconnect(); } catch (_) { /* ignore */ }
            this.resizeObserver = null;
        }
    }

    private isValidMode(s: string): boolean { return s === "flop" || s === "top" || s === "all" || s === "pareto"; }
    private isValidMetric(s: string): boolean { return s === "pct" || s === "abs"; }
    private isValidN(s: string): boolean { return s === "auto" || s === "5" || s === "10" || s === "15" || s === "20" || s === "all"; }

    /* =====================================================================
     * State persistence
     * =================================================================== */
    private persistState(): void {
        try {
            this.host.persistProperties({
                merge: [{
                    objectName: STATE_OBJECT_NAME,
                    selector: undefined as unknown as powerbi.data.Selector,
                    properties: {
                        mode:   this.state.mode,
                        metric: this.state.metric,
                        n:      this.state.n,
                        page:   this.state.page,
                        search: this.state.search
                    }
                }]
            });
        } catch (_) { /* non-blocking */ }
    }

    /* =====================================================================
     * Localization helper
     * =================================================================== */
    private lz(key: string, fallback: string): string {
        // 1) User-selected language override (general.localeOverride) takes priority.
        try {
            const ovRaw = this.formattingSettings?.general?.localeOverride?.value?.value;
            const ov = (typeof ovRaw === "string") ? ovRaw : "auto";
            if (ov && ov !== "auto" && TRANSLATIONS[ov]) {
                const v = TRANSLATIONS[ov][key];
                if (typeof v === "string" && v.length > 0) return v;
            }
        } catch (_) { /* ignore */ }
        // 2) Host's localizationManager (driven by host.locale).
        try {
            const v = this.localizationManager?.getDisplayName(key);
            if (v && typeof v === "string" && v !== key) return v;
        } catch (_) { /* ignore */ }
        return fallback;
    }
    private fmtTpl(tpl: string, ...args: (string | number)[]): string {
        return tpl.replace(/\{(\d+)\}/g, (_m, idx) => {
            const i = Number(idx);
            return args[i] != null ? String(args[i]) : "";
        });
    }

    /* =====================================================================
     * CSS tokens — drive the Less variables from FormattingModel
     * =================================================================== */
    private applyCssTokens(): void {
        const f = this.formattingSettings;
        const z = f.zoneColors;
        const t = f.tooltipStyle;
        const c = f.controls;
        const p = f.panel;

        const set = (k: string, v: string) => this.rootEl.style.setProperty(k, v);

        // High-contrast mode — when active, override every color token with the
        // host-provided high-contrast palette so accessibility stays preserved.
        const cp = this.host.colorPalette;
        const isHC = !!(cp && cp.isHighContrast);
        if (isHC) {
            const fg  = (cp.foreground && cp.foreground.value) || "#000000";
            const bg  = (cp.background && cp.background.value) || "#FFFFFF";
            const sel = (cp.foregroundSelected && cp.foregroundSelected.value) || fg;
            const lnk = (cp.hyperlink && cp.hyperlink.value) || sel;
            this.rootEl.classList.add("bb-high-contrast");
            set("--bb-text",      fg);
            set("--bb-text-2",    fg);
            set("--bb-muted",     fg);
            set("--bb-grid",      fg);
            set("--bb-sep",       fg);
            set("--bb-tt-bg",     bg);
            set("--bb-tt-text",   fg);
            set("--bb-pos",       lnk);
            set("--bb-pos-soft",  bg);
            set("--bb-neg",       sel);
            set("--bb-neg-soft",  bg);
            set("--bb-zone-soft", bg);
            // We still process the rest to set drop/pager tokens but in HC values:
            // drop/pager tokens reuse fg/bg below.
        } else {
            this.rootEl.classList.remove("bb-high-contrast");
            set("--bb-text",        f.title.color.value.value || "#0E1336");
            set("--bb-tt-bg",       t.bg.value.value          || "#14162E");
            set("--bb-tt-text",     t.text.value.value        || "#FFFFFF");
            set("--bb-pos",         z.colorDeepUnder.value.value || "#24C38E");
            set("--bb-pos-soft",    z.colorSoftUnder.value.value || "#C7EFDD");
            set("--bb-neg",         z.colorDeepOver.value.value  || "#F0477A");
            set("--bb-neg-soft",    z.colorSoftOver.value.value  || "#FBD2DE");
            set("--bb-zone-soft",   z.colorTolerance.value.value || "#ECECF3");
        }

        // Neutral state
        set("--bb-drop-bg",      c.controlsBg.value.value      || "#FFFFFF");
        set("--bb-drop-border",  c.controlsBorder.value.value  || "#E2E2EF");
        set("--bb-drop-bw",      ((c.controlsBorderWidth.value ?? 1) + "px"));
        set("--bb-drop-text",    c.controlsText.value.value    || "#0E1336");
        // Hover state
        set("--bb-drop-hover",   c.controlsHover.value.value   || "#F4F1FF");
        set("--bb-drop-hover-border", c.controlsHoverBorder?.value?.value || c.controlsSelectedBg.value.value || "#7E45FF");
        set("--bb-drop-hover-text",   c.controlsHoverText?.value?.value   || c.controlsText.value.value || "#0E1336");
        // Selected (active) state
        set("--bb-drop-selbg",   c.controlsSelectedBg.value.value || "#7E45FF");
        set("--bb-drop-selborder", c.controlsSelectedBorder?.value?.value || c.controlsSelectedBg.value.value || "#7E45FF");
        set("--bb-drop-seltext", c.controlsSelectedText.value.value || "#FFFFFF");
        set("--bb-radius-pill",  ((c.controlsRadius.value ?? 99) >= 99 ? "99px" : (c.controlsRadius.value + "px")));
        set("--bb-ctrl-font",   this.cssFont(c.controlsFontFamily.value));
        set("--bb-ctrl-size",   (c.controlsSize.value ?? 12) + "px");
        // User-controlled dimensions (height, padding, gap, search width)
        const ctrlH      = Math.max(16, Math.min(60, Number(c.controlsHeight.value)  || 28));
        const ctrlPadV   = Math.max(0,  Math.min(20, Number(c.controlsPaddingV.value) || 0));
        const ctrlPadH   = Math.max(2,  Math.min(40, Number(c.controlsPaddingH.value) || 12));
        const ctrlGap    = Math.max(0,  Math.min(40, Number(c.controlsGap.value)      || 6));
        const searchW    = Math.max(60, Math.min(400, Number(c.searchWidth.value)     || 130));
        set("--bb-ctrl-height", ctrlH + "px");
        set("--bb-ctrl-padv",   ctrlPadV + "px");
        set("--bb-ctrl-padh",   ctrlPadH + "px");
        set("--bb-ctrl-gap",    ctrlGap + "px");
        set("--bb-search-w",    searchW + "px");

        set("--bb-sep",         p.separatorColor.value.value || "#E2E2EF");
        set("--bb-panel-font",  this.cssFont(p.fontFamily.value));

        // Panel inline width (the CSS only defaults it)
        const panelWidth = Math.max(140, Math.min(400, Number(p.widthPx.value) || 220));
        this.panelEl.style.width = panelWidth + "px";
    }

    /* =====================================================================
     * Title
     * =================================================================== */
    private applyTitle(): void {
        const t = this.formattingSettings.title;
        if (!t.show.value) {
            this.titleEl.style.display = "none";
            return;
        }
        this.titleEl.style.display = "";
        const userText = String(t.text.value || "").trim();
        const text = userText || this.lz("Visual_Title_Default", "Benchmark");
        this.titleEl.textContent = text;
        this.titleEl.style.color      = t.color.value.value || "#0E1336";
        this.titleEl.style.fontFamily = this.cssFont(t.fontFamily.value);
        this.titleEl.style.fontSize   = (t.fontSize.value ?? 18) + "px";
        this.titleEl.style.fontWeight = t.fontBold.value   ? "700" : "500";
        this.titleEl.style.fontStyle  = t.fontItalic.value ? "italic" : "normal";
        this.titleEl.style.textDecoration = t.fontUnderline.value ? "underline" : "none";
        const align = String(t.align.value.value || "left");
        this.titleEl.classList.remove("center", "right");
        if (align === "center") this.titleEl.classList.add("center");
        else if (align === "right") this.titleEl.classList.add("right");
    }

    private applySearchPlaceholder(): void {
        const s = this.formattingSettings.search;
        const userPh = String(s.placeholder.value || "").trim();
        const ph = userPh || this.lz("Search_Placeholder", "Filter…");
        this.searchInput.placeholder = ph;
        this.searchWrap.style.display = s.show.value ? "" : "none";
    }

    /* =====================================================================
     * Controls — dropdowns
     * =================================================================== */
    private modeOpts(): DropOpt<ModeId>[] {
        const sd = this.formattingSettings.sortDefaults;
        const flop = String(sd.modeFlopLabel.value || "").trim()   || this.lz("Mode_Flop",   "Top over");
        const top  = String(sd.modeTopLabel.value || "").trim()    || this.lz("Mode_Top",    "Top under");
        const all  = String(sd.modeAllLabel.value || "").trim()    || this.lz("Mode_All",    "All ranked");
        const par  = String(sd.modeParetoLabel.value || "").trim() || this.lz("Mode_Pareto", "Pareto 20/80");
        return [
            { id: "flop",   icon: "↓", label: flop, hint: this.lz("Mode_FlopHint",   "positive variance") },
            { id: "top",    icon: "↑", label: top,  hint: this.lz("Mode_TopHint",    "negative variance") },
            { id: "all",    icon: "≡", label: all,  hint: this.lz("Mode_AllHint",    "no filter") },
            { id: "pareto", icon: "◉", label: par,  hint: this.lz("Mode_ParetoHint", "dominant variances") }
        ];
    }
    private metricOpts(): DropOpt<MetricId>[] {
        return [
            { id: "pct", label: this.lz("Metric_Pct", "Variance %"),     hint: this.lz("Metric_PctHint", "relative ranking") },
            { id: "abs", label: this.lz("Metric_Abs", "Absolute value"), hint: this.lz("Metric_AbsHint", "absolute ranking") }
        ];
    }
    private nOpts(): DropOpt<NId>[] {
        const cap = Math.max(1, Math.floor(Number(this.formattingSettings.sortDefaults.autoNCap.value) || 10));
        return [
            { id: "auto", label: this.lz("N_Auto", "Auto"), hint: this.fmtTpl(this.lz("N_AutoHint", "up to {0}"), cap) },
            { id: "5",    label: this.lz("N_5",    "5") },
            { id: "10",   label: this.lz("N_10",   "10") },
            { id: "15",   label: this.lz("N_15",   "15") },
            { id: "20",   label: this.lz("N_20",   "20") },
            { id: "all",  label: this.lz("N_All",  "All") }
        ];
    }

    private rebuildControls(): void {
        this.applySearchPlaceholder();
        this.buildDrop(this.dropMode, this.modeOpts(), this.state.mode, (id: ModeId) => {
            this.state.mode = id;
            this.state.page = 0;
            if (id === "all") this.state.n = "all";
            this.persistState();
            this.rebuildControls();
            this.render();
        }, true);

        this.buildDrop(this.dropMetric, this.metricOpts(), this.state.metric, (id: MetricId) => {
            this.state.metric = id;
            this.state.page = 0;
            this.persistState();
            this.rebuildControls();
            this.render();
        }, false);

        this.buildDrop(this.dropN, this.nOpts(), this.state.n, (id: NId) => {
            this.state.n = id;
            this.state.page = 0;
            this.persistState();
            this.rebuildControls();
            this.render();
        }, false);

        const isPareto = this.state.mode === "pareto";
        const isAll    = this.state.mode === "all";
        this.dropN.classList.toggle("is-disabled", isPareto || isAll);
    }

    private clearChildren(el: Element): void {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    private buildDrop<T extends string>(
        el: HTMLElement,
        opts: DropOpt<T>[],
        currentId: T,
        onPick: (id: T) => void,
        showIconInTrigger: boolean
    ): void {
        // close any open menu
        const existingMenu = el.querySelector(".bb-drop-menu");
        if (existingMenu) existingMenu.remove();
        el.setAttribute("aria-expanded", "false");
        this.clearChildren(el);

        const cur = opts.find(o => o.id === currentId) || opts[0];
        const dv = document.createElement("span");
        dv.className = "bb-drop-dv";
        if (showIconInTrigger && cur.icon) {
            const ic = document.createElement("span");
            ic.className = "bb-drop-icon";
            ic.textContent = cur.icon;
            dv.appendChild(ic);
        }
        dv.appendChild(document.createTextNode(cur.label));
        el.appendChild(dv);

        const arrow = this.svgEl("svg", { class: "bb-drop-arrow", width: "10", height: "10", viewBox: "0 0 10 10" });
        const path  = this.svgEl("path", { d: "M2 3.5 L5 6.5 L8 3.5", stroke: "currentColor", "stroke-width": "1.5", fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
        arrow.appendChild(path);
        el.appendChild(arrow);

        // bind click
        el.onclick = (ev: MouseEvent) => {
            ev.stopPropagation();
            if (el.classList.contains("is-disabled")) return;
            if (el.getAttribute("aria-expanded") === "true") this.closeDropdown(el);
            else this.openDropdown(el, opts, currentId, onPick);
        };
    }

    private openDropdown<T extends string>(
        el: HTMLElement,
        opts: DropOpt<T>[],
        currentId: T,
        onPick: (id: T) => void
    ): void {
        if (el.querySelector(".bb-drop-menu")) return;
        // close other dropdowns first
        [this.dropMode, this.dropMetric, this.dropN].forEach(d => {
            if (d !== el) this.closeDropdown(d);
        });
        el.setAttribute("aria-expanded", "true");
        const menu = document.createElement("div");
        menu.className = "bb-drop-menu";
        opts.forEach(opt => {
            const o = document.createElement("div");
            o.className = "bb-drop-opt" + (opt.id === currentId ? " is-selected" : "");

            const main = document.createElement("span");
            main.className = "bb-drop-opt-main";
            const icon = document.createElement("span");
            icon.className = "bb-drop-opt-icon";
            if (opt.icon) icon.textContent = opt.icon;
            main.appendChild(icon);
            main.appendChild(document.createTextNode(opt.label));
            o.appendChild(main);

            if (opt.hint) {
                const hint = document.createElement("span");
                hint.className = "bb-drop-opt-hint";
                hint.textContent = opt.hint;
                o.appendChild(hint);
            }

            o.addEventListener("mousedown", (ev: MouseEvent) => {
                ev.preventDefault(); ev.stopPropagation();
                this.closeDropdown(el);
                onPick(opt.id);
            });
            menu.appendChild(o);
        });
        el.appendChild(menu);
    }
    private closeDropdown(el: HTMLElement): void {
        if (!el) return;
        el.setAttribute("aria-expanded", "false");
        const m = el.querySelector(".bb-drop-menu");
        if (m) m.remove();
    }


    /* =====================================================================
     * Color computation (5-zone bins)
     * =================================================================== */
    private getThresholds(): { soft: number; deep: number } {
        const dec = this.formattingSettings.decomposition;
        const softRaw = Number(dec.thresholdSoft.value);
        const deepRaw = Number(dec.thresholdDeep.value);
        const soft = Math.max(0, Number.isFinite(softRaw) ? softRaw : 5);
        const deep = Math.max(soft + 0.0001, Number.isFinite(deepRaw) ? deepRaw : 20);
        return { soft, deep };
    }
    private binFor(pct: number): BinDef {
        const { soft, deep } = this.getThresholds();
        // Tolerance threshold: by default = soft. User can override via decomposition card.
        const dec = this.formattingSettings.decomposition;
        const policy = String(dec.tolerancePolicy.value.value || "soft");
        const tolRaw = Number(dec.tolerance.value);
        const tol = (policy === "custom" && Number.isFinite(tolRaw)) ? Math.max(0, tolRaw) : soft;
        if (pct < -deep)  return { min: -Infinity, max: -deep, side: "under", deep: true  };
        if (pct < -tol)   return { min: -deep,     max: -tol,  side: "under", deep: false };
        if (pct <= tol)   return { min: -tol,      max:  tol,  side: "tol",   deep: false };
        if (pct <= deep)  return { min:  tol,      max:  deep, side: "over",  deep: false };
        return            { min:  deep,            max:  Infinity, side: "over", deep: true  };
    }
    private colorForBin(bin: BinDef): string {
        const z = this.formattingSettings.zoneColors;
        const overIsBad = !!this.formattingSettings.semantics.overIsBad.value;
        const overDeep  = z.colorDeepOver.value.value  || "#F0477A";
        const overSoft  = z.colorSoftOver.value.value  || "#FBD2DE";
        const underDeep = z.colorDeepUnder.value.value || "#24C38E";
        const underSoft = z.colorSoftUnder.value.value || "#C7EFDD";

        // Re-map: in the CSS preview model, "over=bad" stays the deep/soft we picked.
        // We expose 5 swatches for both meanings; let the user pick semantics by toggling overIsBad,
        // but the bins honor the swatches directly (they ARE the over/under colors).
        if (bin.side === "tol") return z.colorTolerance.value.value || "#ECECF3";
        if (bin.side === "over") {
            const useDeep = bin.deep;
            // If overIsBad -> over uses negative-coded swatches (deepOver/softOver). Already what we have.
            // If !overIsBad -> "over" is a positive thing — swap with deepUnder/softUnder swatches.
            if (overIsBad) return useDeep ? overDeep : overSoft;
            return useDeep ? underDeep : underSoft;
        }
        // under
        const useDeep = bin.deep;
        if (overIsBad) return useDeep ? underDeep : underSoft;
        return useDeep ? overDeep : overSoft;
    }
    private colorForPct(pct: number): string {
        return this.colorForBin(this.binFor(pct));
    }
    private labelColorClass(pct: number): "neutral" | "pos" | "neg" {
        const { soft } = this.getThresholds();
        if (Math.abs(pct) <= soft) return "neutral";
        const overIsBad = !!this.formattingSettings.semantics.overIsBad.value;
        const isOver = pct > 0;
        if (overIsBad) return isOver ? "neg" : "pos";
        return isOver ? "pos" : "neg";
    }
    private labelColorForPct(pct: number): string {
        const f = this.formattingSettings;
        const mode = String(f.labels.colorMode.value.value || "inheritFromBar");

        if (mode === "manual") {
            // 5-zone explicit colors driven by the user.
            const bin = this.binFor(pct);
            const lbl = f.labels;
            if (bin.side === "tol")   return lbl.colorTolerance.value.value || lbl.color.value.value || "#4C5275";
            if (bin.side === "over")  return bin.deep
                ? (lbl.colorDeepOver.value.value  || "#F0477A")
                : (lbl.colorSoftOver.value.value  || "#B73464");
            return bin.deep
                ? (lbl.colorDeepUnder.value.value || "#24C38E")
                : (lbl.colorSoftUnder.value.value || "#169968");
        }

        // inheritFromBar — use the same color as the bar (5-zone scale).
        const cls = this.labelColorClass(pct);
        if (cls === "neutral") return f.labels.color.value.value || "#4C5275";
        return this.colorForPct(pct);
    }

    /* =====================================================================
     * Filtering and sorting
     * =================================================================== */
    private effective(): BenchmarkItem[] {
        let arr = this.data.items.slice();
        if (this.data.anyHighlight) {
            // when a cross-filter exists, prefer highlighted items
            const highlighted = arr.filter(d => d.highlighted);
            if (highlighted.length > 0) arr = highlighted;
        }
        if (this.state.search) {
            const q = this.state.search.toLowerCase();
            arr = arr.filter(d => d.name.toLowerCase().indexOf(q) >= 0);
        }
        return arr;
    }

    private sortKey(d: BenchmarkItem): number {
        return this.state.metric === "abs" ? Math.abs(d.delta) : Math.abs(d.pct);
    }
    private paretoCount(arr: BenchmarkItem[]): number {
        // Number of items needed to explain ≥ 80% of cumulative |variance|.
        // No artificial cap — pagination handles long lists.
        const total = d3.sum(arr, d => this.sortKey(d));
        if (total === 0) return arr.length;
        let cum = 0;
        for (let i = 0; i < arr.length; i++) {
            cum += this.sortKey(arr[i]);
            if (cum >= 0.80 * total) return i + 1;
        }
        return arr.length;
    }

    private filterAndSort(): RowsResult {
        let arr = this.effective();

        if (this.state.mode === "pareto") {
            arr.sort((a, b) => this.sortKey(b) - this.sortKey(a));
            const paretoArr = arr.slice(0, this.paretoCount(arr));
            // Apply pagination: if pareto items exceed pageSize, paginate.
            const pageSize = Math.max(1, Math.floor(Number(this.formattingSettings.pagination.pageSize.value) || 20));
            if (paretoArr.length <= pageSize) {
                return { rows: paretoArr, totalPages: 1, totalAfterFilter: paretoArr.length };
            }
            const totalPages = Math.max(1, Math.ceil(paretoArr.length / pageSize));
            if (this.state.page >= totalPages) this.state.page = totalPages - 1;
            if (this.state.page < 0) this.state.page = 0;
            const start = this.state.page * pageSize;
            return { rows: paretoArr.slice(start, start + pageSize), totalPages, totalAfterFilter: paretoArr.length };
        }

        if (this.state.mode === "flop")     arr = arr.filter(d => d.pct > 0);
        else if (this.state.mode === "top") arr = arr.filter(d => d.pct < 0);

        if (this.state.metric === "abs") {
            if (this.state.mode === "flop")      arr.sort((a, b) => b.delta - a.delta);
            else if (this.state.mode === "top")  arr.sort((a, b) => a.delta - b.delta);
            else                                 arr.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        } else {
            if (this.state.mode === "flop")      arr.sort((a, b) => b.pct - a.pct);
            else if (this.state.mode === "top")  arr.sort((a, b) => a.pct - b.pct);
            else                                 arr.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
        }

        const pageSize = Math.max(1, Math.floor(Number(this.formattingSettings.pagination.pageSize.value) || 20));

        if (this.state.n === "all") {
            const totalPages = Math.max(1, Math.ceil(arr.length / pageSize));
            if (this.state.page >= totalPages) this.state.page = totalPages - 1;
            if (this.state.page < 0) this.state.page = 0;
            const start = this.state.page * pageSize;
            return { rows: arr.slice(start, start + pageSize), totalPages, totalAfterFilter: arr.length };
        }

        let cap: number;
        if (this.state.n === "auto") {
            const autoCap = Math.max(1, Math.floor(Number(this.formattingSettings.sortDefaults.autoNCap.value) || 10));
            cap = Math.min(autoCap, arr.length);
        } else {
            cap = Math.max(1, parseInt(this.state.n, 10) || 5);
        }
        return { rows: arr.slice(0, cap), totalPages: 1, totalAfterFilter: arr.length };
    }

    /* =====================================================================
     * Number formatting
     * =================================================================== */
    private fmt(v: number, withSign: boolean = false, omitUnit: boolean = false): string {
        const f = this.formattingSettings.numberFormat;
        const unit = String(f.units.value.value || "none");
        const dec = Math.max(0, Math.floor(Number(f.decimals.value) || 0));
        const sep = String(f.thousandsSeparator.value.value || "space");

        let val = v;
        let scaleSuf = "";
        switch (unit) {
            case "K": val = v / 1000;          scaleSuf = "K"; break;
            case "M": val = v / 1_000_000;     scaleSuf = "M"; break;
            case "B": val = v / 1_000_000_000; scaleSuf = "B"; break;
        }

        const absStr = Math.abs(val).toFixed(dec);
        const parts = absStr.split(".");
        let ip = parts[0];
        const dp = parts[1];
        if (sep !== "none") {
            const sc = sep === "comma" ? "," : sep === "dot" ? "." : " ";
            ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, sc);
        }
        const sign = val < 0 ? "-" : (withSign && val > 0 ? "+" : "");
        let out = sign + (dp ? ip + "." + dp : ip);
        if (scaleSuf) out += " " + scaleSuf;
        // suffix removed — number format no longer appends a unit
        return out;
    }
    private fmtPct(p: number): string {
        const f = this.formattingSettings.numberFormat;
        const decRaw = Number(f.decimalsPct.value);
        const dec = Math.max(0, Math.floor(Number.isFinite(decRaw) ? decRaw : 1));
        const s = (p > 0 ? "+" : "") + p.toFixed(dec) + "%";
        return s;
    }
    private valueSeparator(): string {
        const v = this.formattingSettings.numberFormat.valueSeparator.value;
        return (typeof v === "string" && v.length > 0) ? v : " | ";
    }
    private fmtSign(v: number, omitUnit: boolean = false): string {
        return this.fmt(v, true, omitUnit);
    }

    /**
     * Convert a font-family value (returned by Power BI's FontPicker) into a
     * CSS-safe string. Names containing spaces or special characters MUST be
     * quoted so the browser doesn't parse "Times New Roman" as 3 fonts.
     */
    private cssFont(family: unknown, fallback: string = "Segoe UI"): string {
        let s = String(family || fallback).trim();
        if (!s) s = fallback;
        // Already a font stack (commas) or already quoted → use as-is
        if (s.indexOf(",") >= 0 || s.indexOf('"') >= 0 || s.indexOf("'") >= 0) {
            return s;
        }
        // Single bare word: no quotes needed (e.g., Arial, Tahoma)
        if (/^[A-Za-z0-9\-]+$/.test(s)) return s;
        // Multi-word or special chars: wrap in double quotes (e.g., "Times New Roman")
        return '"' + s + '"';
    }

    /* =====================================================================
     * Render
     * =================================================================== */
    private render(): void {
        if (!this.formattingSettings) return;
        const W = Math.max(40, this.chartWrap.clientWidth || this.viewport.width);
        const H = Math.max(40, this.chartWrap.clientHeight || (this.viewport.height - 80));

        const svg = d3.select(this.chartSvg);
        svg.attr("viewBox", `0 0 ${W} ${H}`)
           .attr("width", W).attr("height", H);

        const { rows, totalPages, totalAfterFilter } = this.filterAndSort();
        this.renderPager(totalPages);

        if (rows.length === 0) {
            svg.selectAll("g.bb-root-g > g").selectAll("*")
                .transition().duration(220).style("opacity", 0).remove();
            this.emptyEl.classList.add("is-on");
            this.renderPanel([], totalAfterFilter);
            return;
        }
        this.emptyEl.classList.remove("is-on");

        const PAD = {
            top: 14,
            right: this.state.metric === "abs" ? 130 : 80,
            bottom: 6,
            left: this.computeLabelGutter(rows, W)
        };
        const innerW = Math.max(60, W - PAD.left - PAD.right);
        const innerH = Math.max(40, H - PAD.top - PAD.bottom);

        // Adaptive row height. When the chart is short, allow rowH to shrink down to
        // a hard floor (12px) before truncating, so all rows remain visible.
        const ROW_MIN_DEFAULT = 22, ROW_MAX = 56, ROW_MIN_FLOOR = 12;
        const barsCfg = this.formattingSettings.bars;
        let rowH: number;
        if (String(barsCfg.barHeightMode.value.value || "auto") === "fixed") {
            rowH = Math.max(ROW_MIN_FLOOR, Math.min(120, Number(barsCfg.barHeightFixed.value) || 30));
        } else {
            rowH = innerH / rows.length;
            if (rowH > ROW_MAX) rowH = ROW_MAX;
            if (rowH < ROW_MIN_DEFAULT) {
                // Try to fit. If still too small, clamp at floor (some rows might overflow,
                // but most chart heights will accommodate the floor).
                rowH = Math.max(ROW_MIN_FLOOR, innerH / rows.length);
            }
        }
        const totalH = rowH * rows.length;
        const yOffset = Math.max(0, (innerH - totalH) / 2);

        const y = d3.scaleBand<string>()
            .domain(rows.map(d => d.id))
            .range([yOffset, yOffset + totalH])
            .paddingInner(0.30)
            .paddingOuter(0.10);

        const magOf = (d: BenchmarkItem) =>
            this.state.metric === "abs" ? Math.abs(d.delta) : Math.abs(d.pct);
        const maxMag = (d3.max(rows, magOf) as number) || 1;
        const x = d3.scaleLinear().domain([0, maxMag * 1.04]).range([0, innerW]);

        let root = svg.select<SVGGElement>("g.bb-root-g");
        if (root.empty()) {
            root = svg.append("g").attr("class", "bb-root-g");
            root.append("g").attr("class", "bb-bars");
            root.append("g").attr("class", "bb-row-lbls");
            root.append("g").attr("class", "bb-row-vals");
        }
        root.attr("transform", `translate(${PAD.left},${PAD.top})`);

        const animEnabled = !!this.formattingSettings.animations.enabled.value;
        const animDur = Math.max(0, Number(this.formattingSettings.animations.duration.value) || 820);
        const easeFn = this.getEasing(String(this.formattingSettings.animations.easing.value.value || "easeOut"));
        const radiusRaw = Number(barsCfg.barRadius.value);
        const barsRadius = Math.max(0, Number.isFinite(radiusRaw) ? radiusRaw : 6);
        const barsOpacity = Math.max(0, Math.min(1, Number(barsCfg.barOpacity.value) || 1));
        const barShadow = !!barsCfg.barShadow.value;
        const dimNonHighlighted = this.data.anyHighlight; // soft visual

        /* ---- bars ---- */
        const barG = root.select<SVGGElement>("g.bb-bars");
        const barSel = barG.selectAll<SVGRectElement, BenchmarkItem>("rect.bb-bar")
            .data(rows, (d: BenchmarkItem) => d.id);

        barSel.exit()
            .transition().duration(280).ease(d3.easeCubicIn)
            .attr("width", 0).style("opacity", 0).remove();

        const barEnter = barSel.enter().append("rect")
            .attr("class", "bb-bar")
            .attr("data-id", d => d.id)
            .attr("rx", barsRadius).attr("ry", barsRadius)
            .attr("y", d => y(d.id) ?? 0)
            .attr("height", y.bandwidth())
            .attr("x", 0).attr("width", 0)
            .attr("fill", d => this.colorForPct(d.pct))
            .style("opacity", 0)
            .style("filter", barShadow ? "drop-shadow(0 1px 3px rgba(14,19,54,0.06))" : null)
            .each(function(d) { (this as unknown as { __data__: BenchmarkItem }).__data__ = d; })
            .on("mousemove", (ev: MouseEvent, d: BenchmarkItem) => this.showTooltip(ev, d))
            .on("mouseleave", () => this.hideTooltip())
            .on("mouseenter", function() { d3.select(this).classed("is-hover", true); })
            .on("mouseout",   function() { d3.select(this).classed("is-hover", false); })
            .on("click", (ev: MouseEvent, d: BenchmarkItem) => {
                ev.stopPropagation();
                this.onBarClick(d, ev);
            });

        const barAll = barEnter.merge(barSel as unknown as d3.Selection<SVGRectElement, BenchmarkItem, SVGGElement, unknown>);
        const trans = barAll.transition()
            .duration(animEnabled ? animDur : 0)
            .ease(easeFn)
            .delay((_d, i) => animEnabled ? (this.firstRender ? 200 + i * 50 : i * 30) : 0);

        trans
            .attr("rx", barsRadius).attr("ry", barsRadius)
            .attr("y", d => y(d.id) ?? 0)
            .attr("height", y.bandwidth())
            .attr("x", 0)
            .attr("width", d => Math.max(0, x(magOf(d))))
            .attr("fill", d => this.colorForPct(d.pct))
            .style("opacity", barsOpacity);

        barAll.style("filter", barShadow ? "drop-shadow(0 1px 3px rgba(14,19,54,0.06))" : null);
        barAll.classed("is-dim", (d) => dimNonHighlighted && !d.highlighted);

        /* ---- name labels ---- */
        const nameG = root.select<SVGGElement>("g.bb-row-lbls");
        // Axis (items label) settings — font, color, overflow handling
        const axisCfg = this.formattingSettings.axis;
        const axShow = !!axisCfg.show.value;
        const axColor = axisCfg.color.value.value || "#0E1336";
        const axFontFam = this.cssFont(axisCfg.fontFamily.value);
        const axFontSize = Math.max(6, Math.min(40, Number(axisCfg.fontSize.value) || 12));
        const axBold = !!axisCfg.fontBold.value;
        const axItalic = !!axisCfg.fontItalic.value;
        const axOverflow = String(axisCfg.overflow.value.value || "ellipsis");
        const axMinFont = Math.max(6, Math.min(axFontSize, Number(axisCfg.minFontSize.value) || 8));
        // Available label width = PAD.left - 14 (small gutter)
        const axLabelWidth = Math.max(40, PAD.left - 14);

        const lblSel = nameG.selectAll<SVGTextElement, BenchmarkItem>("text.bb-row-lbl").data(rows, (d: BenchmarkItem) => d.id);
        lblSel.exit().transition().duration(220).style("opacity", 0).remove();
        const lblEnter = lblSel.enter().append("text")
            .attr("class", "bb-row-lbl")
            .attr("text-anchor", "end")
            .attr("x", -10)
            .attr("y", d => (y(d.id) ?? 0) + y.bandwidth() / 2 + 4)
            .style("opacity", 0);

        const lblMerged = lblEnter.merge(lblSel as unknown as d3.Selection<SVGTextElement, BenchmarkItem, SVGGElement, unknown>)
            .style("display", axShow ? "" : "none")
            .style("font-family", axFontFam)
            .style("font-weight", axBold ? "700" : "500")
            .style("font-style", axItalic ? "italic" : "normal")
            .style("font-size", axFontSize + "px")
            .attr("fill", axColor);

        // Apply overflow strategy to each label
        const measureText = (text: string, fontSize: number, fontFam: string, bold: boolean, italic: boolean): number => {
            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("font-family", fontFam);
            t.setAttribute("font-size", fontSize + "px");
            t.setAttribute("font-weight", bold ? "700" : "500");
            t.setAttribute("font-style", italic ? "italic" : "normal");
            t.style.visibility = "hidden";
            t.style.position = "absolute";
            t.textContent = text;
            this.chartSvg.appendChild(t);
            const w = (t.getComputedTextLength && t.getComputedTextLength()) || (text.length * fontSize * 0.55);
            this.chartSvg.removeChild(t);
            return w;
        };

        lblMerged.each((d, i, nodes) => {
            const node = nodes[i] as SVGTextElement;
            // clear prior content
            while (node.firstChild) node.removeChild(node.firstChild);
            const yMid = (y(d.id) ?? 0) + y.bandwidth() / 2 + 4;
            const fullText = d.name;
            const fullWidth = measureText(fullText, axFontSize, axFontFam, axBold, axItalic);

            if (fullWidth <= axLabelWidth || axOverflow === "ellipsis") {
                // ellipsis or fits
                if (fullWidth <= axLabelWidth) {
                    node.setAttribute("y", String(yMid));
                    node.textContent = fullText;
                } else {
                    // truncate with ellipsis
                    let lo = 0, hi = fullText.length;
                    let truncated = fullText;
                    while (lo < hi - 1) {
                        const mid = Math.floor((lo + hi) / 2);
                        const candidate = fullText.substring(0, mid).trimEnd() + "…";
                        const w = measureText(candidate, axFontSize, axFontFam, axBold, axItalic);
                        if (w <= axLabelWidth) { lo = mid; truncated = candidate; }
                        else { hi = mid; }
                    }
                    node.setAttribute("y", String(yMid));
                    node.textContent = truncated;
                    const ttip = document.createElementNS("http://www.w3.org/2000/svg", "title");
                    ttip.textContent = fullText;
                    node.appendChild(ttip);
                }
            } else if (axOverflow === "shrink") {
                // shrink font until it fits OR reaches min
                let fs = axFontSize;
                while (fs > axMinFont && measureText(fullText, fs, axFontFam, axBold, axItalic) > axLabelWidth) {
                    fs -= 0.5;
                }
                node.setAttribute("font-size", fs + "px");
                node.setAttribute("y", String(yMid));
                node.textContent = fullText;
            } else if (axOverflow === "wrap") {
                // word-wrap into multiple tspans, vertically centered
                const words = fullText.split(/\s+/);
                const lines: string[] = [];
                let current = "";
                for (const w of words) {
                    const candidate = current ? (current + " " + w) : w;
                    if (measureText(candidate, axFontSize, axFontFam, axBold, axItalic) <= axLabelWidth) {
                        current = candidate;
                    } else {
                        if (current) lines.push(current);
                        current = w;
                    }
                }
                if (current) lines.push(current);
                const lineHeight = axFontSize * 1.15;
                const totalH = lines.length * lineHeight;
                const startY = yMid - totalH / 2 + lineHeight / 2;
                for (let li = 0; li < lines.length; li++) {
                    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                    tspan.setAttribute("x", "-10");
                    tspan.setAttribute("y", String(startY + li * lineHeight));
                    tspan.textContent = lines[li];
                    node.appendChild(tspan);
                }
            }
        });

        lblMerged
            .transition().duration(animEnabled ? Math.min(540, animDur) : 0).ease(d3.easeCubicOut)
                .delay((_d, i) => animEnabled ? (this.firstRender ? 100 + i * 40 : i * 20) : 0)
            .style("opacity", 1);

        /* ---- value labels ---- */
        const valG = root.select<SVGGElement>("g.bb-row-vals");
        const valSel = valG.selectAll<SVGTextElement, BenchmarkItem>("text.bb-row-val").data(rows, (d: BenchmarkItem) => d.id);
        valSel.exit().transition().duration(220).style("opacity", 0).remove();

        const showValueLabels = !!this.formattingSettings.labels.show.value;
        const valEnter = valSel.enter().append("text")
            .attr("class", "bb-row-val bb-row-val-primary")
            .attr("text-anchor", "start")
            .attr("y", d => (y(d.id) ?? 0) + y.bandwidth() / 2 + 4)
            .style("opacity", 0);

        const lblFontFam = this.cssFont(this.formattingSettings.labels.fontFamily.value);
        const lblFontSize = Math.max(8, Math.min(40, Number(this.formattingSettings.labels.fontSize.value) || 12));
        const lblBold = !!this.formattingSettings.labels.fontBold.value;
        const lblItalic = !!this.formattingSettings.labels.fontItalic.value;

        const valMerged = valEnter.merge(valSel as unknown as d3.Selection<SVGTextElement, BenchmarkItem, SVGGElement, unknown>)
            .attr("fill", d => this.labelColorForPct(d.pct))
            .style("font-family", lblFontFam)
            .style("font-size", lblFontSize + "px")
            .style("font-weight", lblBold ? "700" : "500")
            .style("font-style", lblItalic ? "italic" : "normal");

        valMerged.each((d, i, nodes) => {
            const node = nodes[i] as SVGTextElement;
            while (node.firstChild) node.removeChild(node.firstChild);
            if (!showValueLabels) return;
            const t = d3.select(node);
            const primaryFill = this.labelColorForPct(d.pct);
            if (this.state.metric === "abs") {
                t.append("tspan")
                    .attr("fill", primaryFill)
                    .text(this.fmtSign(d.delta));
                t.append("tspan")
                    .attr("class", "bb-row-val-secondary")
                    .attr("fill", "var(--bb-muted)")
                    .style("font-size", "10.5px")
                    .style("font-weight", "500")
                    .text(this.valueSeparator() + this.fmtPct(d.pct));
            } else {
                t.append("tspan").attr("fill", primaryFill).text(this.fmtPct(d.pct));
            }
        });

        valMerged.transition()
            .duration(animEnabled ? Math.min(540, animDur) : 0).ease(d3.easeCubicOut)
            .delay((_d, i) => animEnabled ? (this.firstRender ? 350 + i * 40 : 100 + i * 20) : 0)
            .attr("x", d => x(magOf(d)) + 8)
            .attr("y", d => (y(d.id) ?? 0) + y.bandwidth() / 2 + 4)
            .style("opacity", showValueLabels ? 1 : 0);

        /* ---- shine sweep on first render ---- */
        const shineCfg = this.formattingSettings.shine;
        if (this.firstRender && shineCfg.enabled.value && animEnabled) {
            const lastBarDelay = 200 + (rows.length - 1) * 50 + animDur;
            setTimeout(() => this.addShine(innerW, innerH), Math.max(0, lastBarDelay - 50));
        }

        this.renderPanel(rows, totalAfterFilter);
        this.firstRender = false;
    }

    private computeLabelGutter(rows: BenchmarkItem[], totalW: number): number {
        if (rows.length === 0) return 160;
        if (!this.formattingSettings.axis.show.value) return 12;
        const maxPct = Math.max(10, Math.min(60, Number(this.formattingSettings.axis.maxWidthPct.value) || 35));
        const cap = Math.max(80, Math.floor(totalW * (maxPct / 100)));
        let longest = 0;
        for (const r of rows) if (r.name.length > longest) longest = r.name.length;
        const fontSize = Math.max(6, Number(this.formattingSettings.axis.fontSize.value) || 12);
        const charW = fontSize * 0.55;
        const desired = longest * charW + 14;
        return Math.round(Math.min(Math.max(80, desired), cap));
    }

    private addShine(innerW: number, innerH: number): void {
        const root = d3.select(this.chartSvg).select<SVGGElement>("g.bb-root-g");
        if (root.empty()) return;
        root.selectAll("rect.bb-shine").remove();
        const shineW = 130;
        const dur = Math.max(80, Number(this.formattingSettings.shine.duration.value) || 900);
        const shine = root.append("rect")
            .attr("class", "bb-shine")
            .attr("y", 0).attr("height", innerH)
            .attr("width", shineW)
            .attr("x", -shineW)
            .attr("fill", "url(#bb-shine-grad)")
            .style("opacity", 0);
        shine.transition().duration(120).style("opacity", 1)
            .transition().duration(dur).ease(d3.easeQuadInOut)
                .attr("x", innerW)
            .transition().duration(180).style("opacity", 0)
            .on("end", function() { d3.select(this).remove(); });
    }

    private getEasing(name: string): (t: number) => number {
        switch (name) {
            case "easeInOut": return d3.easeCubicInOut;
            case "linear":    return d3.easeLinear;
            case "bounce":    return d3.easeBounceOut;
            case "elastic":   return d3.easeElasticOut;
            default:          return d3.easeBackOut.overshoot(0.5);
        }
    }

    /* =====================================================================
     * Bar click — selection
     * =================================================================== */
    private onBarClick(item: BenchmarkItem, ev: MouseEvent): void {
        try {
            // Respect host.hostCapabilities.allowInteractions when available
            // (older API versions: property may not exist; cast to any for safety).
            const hostAny = this.host as unknown as { hostCapabilities?: { allowInteractions?: boolean }; allowInteractions?: boolean };
            const allow = (hostAny.hostCapabilities && hostAny.hostCapabilities.allowInteractions);
            const allowDirect = hostAny.allowInteractions;
            if (allow === false || allowDirect === false) return;
            const multi = !!ev.ctrlKey || !!ev.metaKey;
            this.selectionManager.select(item.selectionId, multi).then(() => { /* visual updates via host */ });
        } catch (_) { /* ignore */ }
    }

    /* =====================================================================
     * Pager
     * =================================================================== */
    private renderPager(totalPages: number): void {
        const pgShow = !!this.formattingSettings.pagination.pagerShow.value;
        // Show pager whenever there are multiple pages — applies to "Tous" mode AND
        // Pareto mode (when the items needed to explain 80% of variance exceed pageSize).
        const showPager = pgShow && totalPages > 1;
        this.pagerEl.classList.toggle("is-shown", showPager);
        if (!showPager) return;
        // Apply pager styling via CSS vars on the pager element
        const p = this.formattingSettings.pagination;
        const pe = this.pagerEl;
        pe.style.background = p.pagerBg.value.value || "#FFFFFF";
        pe.style.borderColor = p.pagerBorder.value.value || "#E2E2EF";
        pe.style.color = p.pagerText.value.value || "#4C5275";
        pe.style.borderRadius = ((Number(p.pagerRadius.value) ?? 99)) + "px";
        pe.style.fontFamily = this.cssFont(p.pagerFontFamily.value);
        pe.style.fontSize = (Number(p.pagerFontSize.value) || 11) + "px";
        pe.style.fontWeight = p.pagerFontBold.value ? "700" : "400";
        pe.style.fontStyle = p.pagerFontItalic.value ? "italic" : "normal";
        pe.style.setProperty("--bb-pg-hover-bg",   p.pagerHoverBg.value.value   || "#F4F1FF");
        pe.style.setProperty("--bb-pg-hover-text", p.pagerHoverText.value.value || "#7E45FF");
        pe.style.setProperty("--bb-pg-active-bg",   p.pagerActiveBg.value.value   || "#7E45FF");
        pe.style.setProperty("--bb-pg-active-text", p.pagerActiveText.value.value || "#FFFFFF");
        this.pagerInfo.textContent = (this.state.page + 1) + " / " + totalPages;
        this.pagerPrev.disabled = this.state.page === 0;
        this.pagerNext.disabled = this.state.page >= totalPages - 1;
    }

    /* =====================================================================
     * Side panel
     * =================================================================== */
    private renderPanel(rowsShown: BenchmarkItem[], totalEffective: number): void {
        this.clearChildren(this.panelEl);
        const panel = d3.select(this.panelEl);
        if (!this.formattingSettings.panel.show.value) return;

        const data = this.effective();
        const total = data.length;
        const p = this.formattingSettings.panel;

        // CSS-driven custom widths via inline styles for fonts/colors/sizes
        const lblColor = p.lblColor.value.value || "#8A8AAA";
        const valColor = p.valColor.value.value || "#0E1336";
        const lblSize = Math.max(8, Number(p.lblSize.value) || 11);
        const valSize = Math.max(10, Number(p.valSize.value) || 18);
        const headSize = Math.max(8, Number(p.headSize.value) || 11);
        const totalSize = Math.max(14, Number(p.totalSize.value) || 30);
        const headColor = p.headColor.value.value || "#8A8AAA";
        const fontFam = this.cssFont(p.fontFamily.value);

        const headText = String(p.headText.value || "").trim() || this.lz("Panel_Head", "Portfolio summary");
        const head = panel.append("div").attr("class", "bb-pn-head")
            .style("color", headColor)
            .style("font-size", headSize + "px")
            .style("font-family", fontFam)
            .text(headText);
        head; // suppress unused
        // Apply panel-level styling (background, etc.)
        const panelBg = p.bgColor && p.bgColor.value ? (p.bgColor.value.value || "") : "";
        if (panelBg) this.panelEl.style.background = panelBg;
        else this.panelEl.style.background = "";

        const blocks = panel.append("div").attr("class", "bb-pn-blocks");

        const overIsBad = !!this.formattingSettings.semantics.overIsBad.value;
        const overClass: "neg" | "pos"  = overIsBad ? "neg" : "pos";
        const underClass: "neg" | "pos" = overIsBad ? "pos" : "neg";

        if (total === 0) {
            const empty = blocks.append("div").attr("class", "bb-pn-blk");
            empty.append("div").attr("class", "bb-pn-total")
                .style("color", valColor).style("font-family", fontFam)
                .style("font-size", totalSize + "px")
                .text("0");
            empty.append("div").attr("class", "bb-pn-total-lbl")
                .style("color", lblColor).style("font-family", fontFam)
                .style("font-size", lblSize + "px")
                .text(this.state.search
                    ? this.lz("Panel_NoSearch", "No item matches")
                    : this.lz("Panel_NoData", "No item"));
            return;
        }

        const totalDelta = d3.sum(data, d => d.delta) as number;
        const totalM1 = d3.sum(data, d => d.m1) as number;
        const totalDeltaPct = totalM1 > 0 ? (totalDelta / totalM1) * 100 : 0;
        const sortedByDelta = data.slice().sort((a, b) => b.delta - a.delta);
        const worst = sortedByDelta[0];                            // most over (largest +delta)
        const best  = sortedByDelta[sortedByDelta.length - 1];     // most under (most negative delta)

        // Block 1: total — big number with inline label "items dans le scope"
        if (p.showTotal.value) {
            const b1 = blocks.append("div").attr("class", "bb-pn-blk");
            const totalRow = b1.append("div").attr("class", "bb-pn-total-row")
                .style("font-family", fontFam)
                .node() as HTMLElement;
            if (totalRow) {
                const numEl = document.createElement("span");
                numEl.className = "bb-pn-total";
                numEl.style.color = valColor;
                numEl.style.fontFamily = fontFam;
                numEl.style.fontSize = totalSize + "px";
                numEl.textContent = String(total);
                totalRow.appendChild(numEl);
                const totalLblOverride = String(p.totalLblText.value || "").trim();
                const totalLbl = totalLblOverride
                    || (this.state.search
                        ? this.lz("Panel_TotalLblFiltered", "items in scope (filtered)")
                        : this.lz("Panel_TotalLbl", "items in scope"));
                const lblEl = document.createElement("span");
                lblEl.className = "bb-pn-total-lbl";
                lblEl.style.color = lblColor;
                lblEl.style.fontSize = lblSize + "px";
                lblEl.textContent = totalLbl;
                totalRow.appendChild(lblEl);
            }
        }

        // Block 2: global gap — placed BEFORE distribution. "Écart global" + value [soit] pct.
        if (p.showEcartGlobal.value) {
            const totalCls: "neg" | "pos" = totalDelta >= 0 ? overClass : underClass;
            const b2 = blocks.append("div").attr("class", "bb-pn-blk");
            const ecartLbl = String(p.ecartGlobalLblText.value || "").trim()
                || this.lz("Panel_EcartGlobal", "Global gap");
            b2.append("div").attr("class", "bb-pn-lbl")
                .style("color", lblColor).style("font-family", fontFam)
                .style("font-size", lblSize + "px")
                .text(ecartLbl);
            // Écart global value font is slightly smaller than the total count above.
            const ecartValSize = Math.max(12, Math.round(totalSize * 0.78));
            const valEl = b2.append("div").attr("class", "bb-pn-val " + totalCls)
                .style("font-family", fontFam)
                .style("font-size", ecartValSize + "px")
                .node() as HTMLElement;
            if (valEl) {
                valEl.textContent = this.fmtSign(totalDelta);
                // Insert "soit" linker (translatable) between absolute value and pct.
                const linker = document.createElement("span");
                linker.className = "bb-pn-val-linker";
                linker.style.fontSize = Math.max(10, Math.round(ecartValSize * 0.55)) + "px";
                linker.style.fontWeight = "400";
                linker.style.color = lblColor;
                linker.style.margin = "0 6px";
                linker.style.fontStyle = "italic";
                linker.textContent = this.lz("Word_Soit", "i.e.");
                valEl.appendChild(linker);
                const pctSpan = document.createElement("span");
                pctSpan.className = "bb-pn-val-pct";
                pctSpan.style.fontSize = Math.max(11, Math.round(ecartValSize * 0.7)) + "px";
                pctSpan.style.fontWeight = "500";
                pctSpan.style.opacity = "0.9";
                pctSpan.textContent = this.fmtPct(totalDeltaPct);
                valEl.appendChild(pctSpan);
            }
        }

        // Block 3: distribution (now after écart global)
        if (p.distributionShow.value) {
            const b3 = blocks.append("div").attr("class", "bb-pn-blk");
            const distLbl = String(p.distributionLblText.value || "").trim()
                || this.lz("Panel_Distribution", "Variance distribution");
            b3.append("div").attr("class", "bb-pn-lbl")
                .style("color", lblColor).style("font-family", fontFam)
                .style("font-size", lblSize + "px")
                .text(distLbl);
            this.renderDistribution(b3, data);
        }

        // Granular max-blocks customization
        const namesColor = (p.namesColor && p.namesColor.value && p.namesColor.value.value) || valColor;
        const tagOpacity = Math.max(0, Math.min(1, Number(p.tagBgOpacity.value)));
        const tagOpacityValid = Number.isFinite(tagOpacity) ? tagOpacity : 1;

        // Block 4: max over
        if (worst && worst.delta > 0 && p.showDepMax.value) {
            const b4 = blocks.append("div").attr("class", "bb-pn-blk");
            const depMaxLbl = String(p.depMaxLblText.value || "").trim()
                || this.lz("Panel_DepMax", "Max over");
            b4.append("div").attr("class", "bb-pn-lbl")
                .style("color", lblColor).style("font-family", fontFam)
                .style("font-size", lblSize + "px")
                .text(depMaxLbl);
            b4.append("div").attr("class", "bb-pn-val-name")
                .style("font-family", fontFam)
                .style("color", namesColor)
                .text(worst.name)
                .on("click", () => this.flashOrJumpToItem(worst));
            b4.append("div").attr("class", "bb-pn-tag " + overClass)
                .style("opacity", String(tagOpacityValid))
                .text(`${this.fmtSign(worst.delta)}${this.valueSeparator()}${this.fmtPct(worst.pct)}`);
        }

        // Block 5: max under
        if (best && best.delta < 0 && p.showRetardMax.value) {
            const b5 = blocks.append("div").attr("class", "bb-pn-blk");
            const retardLbl = String(p.retardMaxLblText.value || "").trim()
                || this.lz("Panel_RetardMax", "Max under");
            b5.append("div").attr("class", "bb-pn-lbl")
                .style("color", lblColor).style("font-family", fontFam)
                .style("font-size", lblSize + "px")
                .text(retardLbl);
            b5.append("div").attr("class", "bb-pn-val-name")
                .style("font-family", fontFam)
                .style("color", namesColor)
                .text(best.name)
                .on("click", () => this.flashOrJumpToItem(best));
            b5.append("div").attr("class", "bb-pn-tag " + underClass)
                .style("opacity", String(tagOpacityValid))
                .text(`${this.fmtSign(best.delta)}${this.valueSeparator()}${this.fmtPct(best.pct)}`);
        }
    }

    private measureLabel(which: "m1" | "m2"): string {
        const ts = this.formattingSettings.tooltipStyle;
        if (which === "m1") {
            const ov = String(ts.m1Label.value || "").trim();
            return ov || this.data.m1ColumnName || this.lz("Tt_Reference", "Reference");
        }
        const ov = String(ts.m2Label.value || "").trim();
        return ov || this.data.m2ColumnName || this.lz("Tt_Actual", "Actual");
    }

    /* =====================================================================
     * Distribution band
     * =================================================================== */
    private renderDistribution(parent: d3.Selection<HTMLDivElement, unknown, null, undefined>, data: BenchmarkItem[]): void {
        const { soft, deep } = this.getThresholds();
        const bins: BinDef[] = [
            { min: -Infinity, max: -deep, side: "under", deep: true,  count: 0 },
            { min: -deep,     max: -soft, side: "under", deep: false, count: 0 },
            { min: -soft,     max:  soft, side: "tol",   deep: false, count: 0 },
            { min:  soft,     max:  deep, side: "over",  deep: false, count: 0 },
            { min:  deep,     max:  Infinity, side: "over", deep: true, count: 0 }
        ];
        for (const d of data) {
            for (const b of bins) {
                if (d.pct >= b.min && d.pct < b.max) { b.count = (b.count || 0) + 1; break; }
            }
        }
        const total = data.length;
        const overIsBad = !!this.formattingSettings.semantics.overIsBad.value;
        const z = this.formattingSettings.zoneColors;

        const overFill  = overIsBad ? (z.colorDeepOver.value.value  || "#F0477A") : (z.colorDeepUnder.value.value || "#24C38E");
        const underFill = overIsBad ? (z.colorDeepUnder.value.value || "#24C38E") : (z.colorDeepOver.value.value  || "#F0477A");

        const colorOf = (b: BinDef): string => this.colorForBin(b);

        const W = 192;
        const bandH = Math.max(8, Math.min(64, Number(this.formattingSettings.panel.bandHeight.value) || 22));
        const H = bandH;
        // Reuse the bars' corner-radius setting so the distribution band matches.
        const barRadiusRaw = Number(this.formattingSettings.bars.barRadius.value);
        const R = Math.max(0, Math.min(H / 2, Number.isFinite(barRadiusRaw) ? barRadiusRaw : 6));
        const tickWidthRaw = Number(this.formattingSettings.panel.distributionTickWidth.value);
        const tickW = Math.max(0, Math.min(8, Number.isFinite(tickWidthRaw) ? tickWidthRaw : 2));
        const wrap = parent.append("div").attr("class", "bb-pn-dist");
        const svgD = wrap.append("svg")
            .attr("class", "bb-pn-dist-band")
            .attr("viewBox", `0 0 ${W} ${H}`)
            .attr("preserveAspectRatio", "none");

        svgD.append("rect")
            .attr("x", 0).attr("y", 0)
            .attr("width", W).attr("height", H)
            .attr("rx", R).attr("ry", R)
            .attr("fill", "var(--bb-grid)");

        if (total === 0) return;

        const clipId = "bb-dist-clip-" + this.cryptoId();
        svgD.append("defs").append("clipPath").attr("id", clipId)
            .append("rect").attr("x", 0).attr("y", 0).attr("width", W).attr("height", H)
            .attr("rx", R).attr("ry", R);

        const segG = svgD.append("g").attr("clip-path", `url(#${clipId})`);
        const rangeLabel = (b: BinDef): string => {
            if (b.max === Infinity)  return this.fmtTpl(this.lz("Range_OverPlus", "More than +{0}% over"), b.min);
            if (b.min === -Infinity) return this.fmtTpl(this.lz("Range_UnderPlus", "More than {0}% under"), Math.abs(b.max));
            if (b.side === "tol")    return this.fmtTpl(this.lz("Range_OnTarget", "On target (between {0}% and +{1}%)"), b.min, b.max);
            if (b.side === "over")   return this.fmtTpl(this.lz("Range_OverBetween", "Over from +{0}% to +{1}%"), b.min, b.max);
            return this.fmtTpl(this.lz("Range_UnderBetween", "Under from {0}% to {1}%"), Math.abs(b.max), Math.abs(b.min));
        };

        let xCum = 0;
        bins.forEach((b, i) => {
            const w = ((b.count || 0) / total) * W;
            if ((b.count || 0) === 0) return;
            const seg = segG.append("rect")
                .attr("class", "bb-dist-seg")
                .attr("y", 0).attr("height", H)
                .attr("x", xCum).attr("width", 0)
                .attr("fill", colorOf(b))
                .style("cursor", "help")
                .on("mousemove", (ev: MouseEvent) => this.showDistTooltip(ev, b, rangeLabel(b)))
                .on("mouseleave", () => this.hideTooltip());
            seg.transition().duration(620).ease(d3.easeCubicOut).delay(150 + i * 60)
                .attr("width", w);
            xCum += w;
        });

        // separators
        let xCum2 = 0;
        bins.forEach((b, i) => {
            const w = ((b.count || 0) / total) * W;
            if ((b.count || 0) === 0) return;
            if (xCum2 > 0 && tickW > 0) {
                segG.append("line")
                    .attr("class", "bb-dist-tick")
                    .attr("x1", xCum2).attr("x2", xCum2)
                    .attr("y1", 0).attr("y2", H)
                    .attr("stroke-width", tickW)
                    .style("opacity", 0)
                    .transition().duration(300).delay(400 + i * 60)
                    .style("opacity", 1);
            }
            xCum2 += w;
        });

        const overCount  = bins.filter(b => b.side === "over").reduce((a, b) => a + (b.count || 0), 0);
        const tolCount   = bins.filter(b => b.side === "tol").reduce((a, b) => a + (b.count || 0), 0);
        const underCount = bins.filter(b => b.side === "under").reduce((a, b) => a + (b.count || 0), 0);

        const f = this.formattingSettings;
        const overTermPlural  = String(f.semantics.overTermPlural.value  || "").trim() || this.lz("Term_OverPlural",  this.lz("Dist_Depassements", "over"));
        const underTermPlural = String(f.semantics.underTermPlural.value || "").trim() || this.lz("Term_UnderPlural", this.lz("Dist_Retards",      "under"));
        // panel-level overrides (granular)
        const axisRetardsOv = String(f.panel.axisRetardsLabel.value || "").trim();
        const axisTolOv     = String(f.panel.axisOnTargetLabel.value || "").trim();
        const axisDepOv     = String(f.panel.axisDepLabel.value || "").trim();

        const axisNode = wrap.append("div").attr("class", "bb-pn-dist-axis").node() as HTMLElement;
        if (axisNode) {
            // Set CSS var so the 3 number columns align based on the longest count.
            const longest = Math.max(
                String(underCount).length,
                String(tolCount).length,
                String(overCount).length,
                1
            );
            axisNode.style.setProperty("--bb-dist-num-w", longest + "ch");
            this.appendDistRow(axisNode, underFill, false, underCount, axisRetardsOv || underTermPlural);
            this.appendDistRow(axisNode, "", true,  tolCount,   axisTolOv || this.lz("Dist_OnTarget", "on target"));
            this.appendDistRow(axisNode, overFill,  false, overCount,  axisDepOv || overTermPlural);
        }
    }

    private appendDistRow(parent: HTMLElement, dotBg: string, isTol: boolean, count: number, label: string): void {
        const row = document.createElement("div");
        row.className = "bb-pn-dist-row";
        const dot = document.createElement("span");
        dot.className = "bb-pn-dist-dot" + (isTol ? " is-tol" : "");
        if (!isTol && dotBg) dot.style.background = dotBg;
        const strong = document.createElement("strong");
        strong.textContent = String(count);
        row.appendChild(dot);
        row.appendChild(strong);
        row.appendChild(document.createTextNode(" " + label));
        parent.appendChild(row);
    }

    private cryptoId(): string {
        try {
            const arr = new Uint8Array(4);
            (window.crypto || (window as unknown as { msCrypto: Crypto }).msCrypto).getRandomValues(arr);
            return Array.from(arr).map(b => (b & 0xff).toString(16).padStart(2, "0")).join("");
        } catch (_) {
            // Fallback for very old environments — non-security context (DOM ID only)
            return Date.now().toString(36) + (++this.idCounter).toString(36);
        }
    }
    private idCounter = 0;

    /* =====================================================================
     * Tooltips
     * =================================================================== */
    private showTooltip(ev: MouseEvent, d: BenchmarkItem): void {
        const pctCls = this.labelColorClass(d.pct);
        const cls = pctCls === "neutral" ? "" : pctCls;
        const m1Lbl = this.measureLabel("m1");
        const m2Lbl = this.measureLabel("m2");
        this.applyTooltipStyle();
        this.clearChildren(this.ttEl);
        this.appendTtTitle(this.ttEl, d.name);
        this.appendTtRow(this.ttEl, m1Lbl, this.fmt(d.m1));
        this.appendTtRow(this.ttEl, m2Lbl, this.fmt(d.m2));
        this.appendTtDivider(this.ttEl);
        this.appendTtRow(this.ttEl, this.lz("Tt_Delta", "Variance"), this.fmtSign(d.delta), cls);
        this.appendTtRow(this.ttEl, this.lz("Tt_Variation", "Change"), this.fmtPct(d.pct), cls);
        this.positionTooltip(ev);
        // Power BI native tooltip (canvas + accessibility) — emit alongside our custom bubble
        if (this.tooltipService) {
            try {
                this.tooltipService.show({
                    coordinates: [ev.clientX, ev.clientY],
                    isTouchEvent: false,
                    dataItems: [
                        { displayName: m1Lbl, value: this.fmt(d.m1) },
                        { displayName: m2Lbl, value: this.fmt(d.m2) },
                        { displayName: this.lz("Tt_Delta", "Variance"),  value: this.fmtSign(d.delta) },
                        { displayName: this.lz("Tt_Variation", "Change"), value: this.fmtPct(d.pct) }
                    ],
                    identities: d.selectionId ? [d.selectionId] : []
                });
            } catch (_) { /* ignore */ }
        }
    }

    private showDistTooltip(ev: MouseEvent, b: BinDef, range: string): void {
        const total = this.effective().length;
        const cls = b.side === "over" ? this.labelColorClass(1)
                  : b.side === "under" ? this.labelColorClass(-1)
                  : "neutral";
        const clsStr = cls === "neutral" ? "" : cls;
        const pct = total > 0 ? (((b.count || 0) / total) * 100).toFixed(0) + "%" : "0%";
        this.applyTooltipStyle();
        this.clearChildren(this.ttEl);
        this.appendTtTitle(this.ttEl, range);
        this.appendTtRow(this.ttEl, this.lz("Tt_Concerned", "Items concerned"), (b.count || 0) + " / " + total);
        this.appendTtRow(this.ttEl, this.lz("Tt_PortfolioShare", "Portfolio share"), pct, clsStr);
        this.positionTooltip(ev);
    }

    private appendTtTitle(parent: HTMLElement, txt: string): void {
        const t = document.createElement("div");
        t.className = "bb-tt-title";
        t.textContent = txt;
        parent.appendChild(t);
    }
    private appendTtDivider(parent: HTMLElement): void {
        const d = document.createElement("div");
        d.className = "bb-tt-divider";
        parent.appendChild(d);
    }
    private appendTtRow(parent: HTMLElement, key: string, value: string, deltaCls?: string): void {
        const row = document.createElement("div");
        row.className = "bb-tt-row";
        const k = document.createElement("span");
        k.className = "k";
        k.textContent = key;
        const v = document.createElement("span");
        v.className = "v";
        if (deltaCls && deltaCls.length > 0) {
            const delta = document.createElement("span");
            delta.className = "bb-tt-delta " + deltaCls;
            delta.textContent = value;
            v.appendChild(delta);
        } else {
            v.textContent = value;
        }
        row.appendChild(k); row.appendChild(v);
        parent.appendChild(row);
    }

    private applyTooltipStyle(): void {
        const ts = this.formattingSettings.tooltipStyle;
        const radius = Math.max(0, Number(ts.radius.value) || 12);
        this.ttEl.style.background = ts.bg.value.value || "#14162E";
        this.ttEl.style.color = ts.text.value.value || "#FFFFFF";
        this.ttEl.style.fontFamily = this.cssFont(ts.fontFamily.value);
        this.ttEl.style.fontSize = (Number(ts.size.value) || 12) + "px";
        this.ttEl.style.fontWeight = ts.bold.value ? "700" : "400";
        this.ttEl.style.fontStyle = ts.italic.value ? "italic" : "normal";
        this.ttEl.style.borderRadius = radius + "px";
    }

    private positionTooltip(ev: MouseEvent): void {
        const rect = this.rootEl.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        const flipBelow = y < 170;
        this.ttEl.classList.toggle("is-below", flipBelow);
        this.ttEl.style.left = x + "px";
        this.ttEl.style.top = y + "px";
        this.ttEl.style.setProperty("--tt-caret-x", "50%");
        this.ttEl.classList.add("is-on");
        // Clamp horizontally to keep tooltip inside the visual frame.
        // Caret X is shifted to keep pointing at the cursor.
        const margin = 8;
        const ttRect = this.ttEl.getBoundingClientRect();
        const halfW = ttRect.width / 2;
        let leftPx = x;
        let caretShiftPx = 0;
        const ttLeftEdge = x - halfW;
        const ttRightEdge = x + halfW;
        if (ttRightEdge > rect.width - margin) {
            const overshoot = ttRightEdge - (rect.width - margin);
            leftPx -= overshoot;
            caretShiftPx = overshoot;
        } else if (ttLeftEdge < margin) {
            const overshoot = margin - ttLeftEdge;
            leftPx += overshoot;
            caretShiftPx = -overshoot;
        }
        if (caretShiftPx !== 0) {
            this.ttEl.style.left = leftPx + "px";
            this.ttEl.style.setProperty("--tt-caret-x", `calc(50% + ${caretShiftPx}px)`);
        }
    }
    private hideTooltip(): void {
        this.ttEl.classList.remove("is-on");
        if (this.tooltipService) {
            try { this.tooltipService.hide({ isTouchEvent: false, immediately: false }); } catch (_) { /* ignore */ }
        }
    }

    /* =====================================================================
     * Flash / jump
     * =================================================================== */
    private flashOrJumpToItem(item: BenchmarkItem): void {
        const visibleIds = this.filterAndSort().rows.map(d => d.id);
        if (visibleIds.indexOf(item.id) < 0) {
            this.state.mode = "all";
            this.state.page = 0;
            if (this.state.n !== "all") this.state.n = "auto";
            this.persistState();
            this.rebuildControls();
            this.render();
            setTimeout(() => this.flashBar(item.id), 600);
        } else {
            this.flashBar(item.id);
        }
    }
    private flashBar(id: string): void {
        const sel = d3.select(this.chartSvg).select<SVGRectElement>(`rect.bb-bar[data-id="${id}"]`);
        if (sel.empty()) return;
        sel.classed("is-flash", false);
        const node = sel.node();
        if (node) void node.getBoundingClientRect(); // force reflow
        sel.classed("is-flash", true);
        setTimeout(() => sel.classed("is-flash", false), 1300);
    }
}
