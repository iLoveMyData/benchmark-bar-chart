"use strict";
import powerbi from "powerbi-visuals-api";
import DataView                = powerbi.DataView;
import IVisualHost             = powerbi.extensibility.visual.IVisualHost;
import ISelectionId            = powerbi.visuals.ISelectionId;

export interface BenchmarkItem {
    id: string;
    index: number;
    name: string;
    m1: number;
    m2: number;
    delta: number;
    pct: number;
    ratio: number;
    selectionId: ISelectionId;
    highlighted: boolean;
}

export interface BenchmarkData {
    items: BenchmarkItem[];
    hasCategory: boolean;
    hasM1: boolean;
    hasM2: boolean;
    m1ColumnName: string;
    m2ColumnName: string;
    categoryColumnName: string;
    anyHighlight: boolean;
}

export function transformDataView(dataView: DataView | undefined, host: IVisualHost): BenchmarkData {
    const empty: BenchmarkData = {
        items: [], hasCategory: false, hasM1: false, hasM2: false,
        m1ColumnName: "", m2ColumnName: "", categoryColumnName: "",
        anyHighlight: false
    };
    if (!dataView || !dataView.categorical) return empty;

    const cat = dataView.categorical.categories?.[0];
    const vals = dataView.categorical.values;
    const hasCategory = !!cat && Array.isArray(cat.values);
    const hasValues = !!vals && vals.length > 0;

    if (!hasCategory && !hasValues) return empty;

    let m1Series: powerbi.DataViewValueColumn | undefined;
    let m2Series: powerbi.DataViewValueColumn | undefined;
    let m1ColumnName = "";
    let m2ColumnName = "";

    if (vals) {
        for (const series of vals) {
            const roles = (series.source.roles || {}) as Record<string, boolean>;
            if (roles["measure1"] && !m1Series) {
                m1Series = series;
                m1ColumnName = String(series.source.displayName || "");
            }
            if (roles["measure2"] && !m2Series) {
                m2Series = series;
                m2ColumnName = String(series.source.displayName || "");
            }
        }
    }

    const hasM1 = !!m1Series;
    const hasM2 = !!m2Series;
    const categoryColumnName = cat ? String(cat.source.displayName || "") : "";

    if (!hasCategory || !hasM1 || !hasM2) {
        return {
            items: [], hasCategory, hasM1, hasM2,
            m1ColumnName, m2ColumnName, categoryColumnName,
            anyHighlight: false
        };
    }

    const n = cat!.values.length;
    const items: BenchmarkItem[] = [];
    const m1Highlights = m1Series!.highlights;
    const m2Highlights = m2Series!.highlights;
    const anyHighlight = !!(m1Highlights || m2Highlights);

    for (let i = 0; i < n; i++) {
        const rawName = cat!.values[i];
        const name = rawName == null ? "" : String(rawName);
        if (!name) continue;

        const m1Raw = m1Series!.values[i];
        const m2Raw = m2Series!.values[i];
        if (m1Raw == null || m2Raw == null) continue;
        const m1 = Number(m1Raw);
        const m2 = Number(m2Raw);
        if (!isFinite(m1) || !isFinite(m2)) continue;
        if (m1 === 0) continue; // can't compute pct meaningfully

        const delta = m2 - m1;
        const pct = (delta / m1) * 100;
        const ratio = m2 / m1;

        const selectionId: ISelectionId = host.createSelectionIdBuilder()
            .withCategory(cat!, i)
            .createSelectionId();

        let highlighted = false;
        if (anyHighlight) {
            const h1 = m1Highlights ? m1Highlights[i] : null;
            const h2 = m2Highlights ? m2Highlights[i] : null;
            highlighted = (h1 != null && Number(h1) !== 0) || (h2 != null && Number(h2) !== 0);
        }

        items.push({
            id: "i" + i,
            index: i,
            name,
            m1, m2, delta, pct, ratio,
            selectionId,
            highlighted
        });
    }

    return {
        items, hasCategory, hasM1, hasM2,
        m1ColumnName, m2ColumnName, categoryColumnName,
        anyHighlight
    };
}
