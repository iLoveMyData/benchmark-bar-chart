# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0.0] — 2026-05-01

### Added
- **Custom visual icon**. New 40×40 transparent PNG showing three benchmark bars with a target line, in the project palette.
- **Format pane sub-grouping** via `CompositeCard` + collapsible `Group`. The 5 most-populated cards now expose nested sections natively:
  - `Title` → Content · Typography
  - `Bar value labels` → Typography · Behavior · Per-zone colors
  - `Side panel` → General · Total · Distribution · Global gap · Max over · Max under
  - `Controls` → General · Neutral · Hover · Selected
  - `Pagination` → General · Neutral · Hover · Selected
- 19 new locale keys (×7 languages = 133 strings) for the sub-section labels.

### Notes
- 100% backwards-compatible: capabilities object names and property paths are unchanged. Existing reports keep all their saved formatting.

## [1.6.0.0] — 2026-05-01

### Added
- **User-controllable visual language** — runtime locale override dropdown (auto + 7 supported locales). Bypasses the host locale binding and re-translates every visual text instantly.
- **Embedded translation map** (`src/translations.ts`) covering 61 runtime keys × 7 locales.
- **Control sizing customization** — 5 new properties: `controlsHeight`, `controlsPaddingV`, `controlsPaddingH`, `controlsGap`, `searchWidth`.

### Changed
- Data role display names made generic — `Category` / `Reference` / `Actual` (previously project-specific).

## [1.5.0.0] — 2026-05-01

### Added
- Microsoft AppSource certification readiness:
  - `host.eventService.renderingStarted/Finished/Failed`
  - `host.tooltipService` for accessible Power BI tooltips
  - `host.colorPalette.isHighContrast` with full high-contrast palette
  - `host.hostCapabilities.allowInteractions` respected on bar clicks
  - `selectionManager` cross-visual highlighting and multi-visual selection
  - `supportsHighlight`, `supportsKeyboardFocus`, `supportsLandingPage`, `supportsSynchronizingFilterState` all enabled
  - ARIA labels on every interactive control

## [1.4.x] — 2026-04-30 / 2026-05-01

### Added
- Items axis overflow strategies: `ellipsis` · `wrap on words` · `auto-shrink font`.
- Distribution band: configurable separator width.
- Pareto pagination respects the configured page size with no upper cap.

### Fixed
- Multi-word font names not applying (wrap with double quotes in the CSS variable).
- Resjson parse errors caused by unescaped inner quotes.

## [1.3.x] — 2026-04-30

### Added
- 7-language localization (en-US, fr-FR, es-ES, de-DE, it-IT, pt-BR, zh-CN).
- Welcome / landing page when no data is bound.
- Side panel auto-hide when the visual is too small (< 480 × 280).
- "Soit" linker between absolute and percentage in the global-gap row.

## [1.2.0.0] — 2026-04-30

### Added
- Pagination with full pager customization (font, colors, hover, selected).
- Pareto 20-80 sort mode.

## [1.1.0.0] — 2026-04-30

### Added
- Live search with auto-switch to "All" mode.
- Format-pane state persistence via `host.persistProperties`.

## [1.0.0.0] — 2026-04-29

Initial release.
