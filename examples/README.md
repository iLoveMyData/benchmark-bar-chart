# Demo dataset

A 100-row enterprise project portfolio designed to exercise every feature of **Benchmark Bar Chart**.

## File

- [`projects-demo.csv`](./projects-demo.csv) — UTF-8 with BOM, 100 rows, 6 columns

## Columns

| Column | Type | Use as | Notes |
|--------|------|--------|-------|
| `Project` | text | **Category** field of the visual | 100 unique English project names |
| `Department` | text | slicer | 8 values: IT · Marketing · HR · Finance · Operations · R&D · Strategy · Facilities |
| `Region` | text | slicer | 5 values: North America · Europe · APAC · LATAM · Global |
| `Status` | text | slicer | 4 values: In Progress · Completed · Planning · On Hold |
| `Budget (k$)` | number | **Reference** field of the visual | Range 50 – 5 000 |
| `Actual (k$)` | number | **Actual** field of the visual | Computed from the budget × variance |

## Variance distribution

The 100 rows are intentionally spread across the five variance zones so every part of the visual is meaningful out of the box:

| Zone | Rows | Variance % range |
|------|-----:|------------------|
| Deep over (rose, > +20 %) | 30 | +25 % to +60 % |
| Soft over (rose soft) | 15 | +6 % to +18 % |
| On target (within tolerance) | 10 | -4 % to +4 % |
| Soft under (violet soft) | 15 | -7 % to -18 % |
| Deep under (violet, < -20 %) | 30 | -25 % to -55 % |

Total: **100 rows**, total budget **≈ 117 M$**, total actual **≈ 115 M$**, global gap **≈ -2.4 %**.

## How to use

1. Open Power BI Desktop and create a new report.
2. **Get data → Text/CSV** → pick `projects-demo.csv` → **Load**.
3. From the Visualizations pane, import `benchmarkBarChart7B4F2A9D8E6C1B5A.1.7.0.0.pbiviz` ([release page](https://github.com/iLoveMyData/benchmark-bar-chart/releases/tag/v1.7.0.0)).
4. Drop Benchmark Bar Chart on the canvas and bind:
   - **Category** ← `Project`
   - **Reference** ← `Budget (k$)` (set aggregation to **Don't summarize** or **Sum**)
   - **Actual** ← `Actual (k$)`
5. Add slicers for `Department`, `Region`, `Status` to demo the multi-visual selection.

The dataset is deterministic — the file regenerates byte-identically from the seeded script, so screenshots stay reproducible across runs.
