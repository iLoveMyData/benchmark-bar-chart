"use strict";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

/* ──────────────────────────────────────────────────────────────────────────
 * General — visual-wide settings (currently: locale override)
 * ──────────────────────────────────────────────────────────────────────── */
export class GeneralSettings extends formattingSettings.SimpleCard {
    name = "general"; displayName = "General"; displayNameKey = "Obj_General";
    localeOverride = new formattingSettings.ItemDropdown({
        name: "localeOverride", displayName: "Visual language", displayNameKey: "Prop_LocaleOverride",
        items: [
            { value: "auto",  displayName: "Auto (host)" },
            { value: "en-US", displayName: "English"     },
            { value: "fr-FR", displayName: "Français"    },
            { value: "es-ES", displayName: "Español"     },
            { value: "de-DE", displayName: "Deutsch"     },
            { value: "it-IT", displayName: "Italiano"    },
            { value: "pt-BR", displayName: "Português"   },
            { value: "zh-CN", displayName: "中文 (简体)"  }
        ],
        value: { value: "auto", displayName: "Auto (host)" }
    });
    slices = [this.localeOverride];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Title — CompositeCard: Content · Typography
 * ──────────────────────────────────────────────────────────────────────── */
export class TitleSettings extends formattingSettings.CompositeCard {
    name = "title"; displayName = "Title"; displayNameKey = "Obj_Title";
    show          = new formattingSettings.ToggleSwitch({ name: "show",          displayName: "Show",        displayNameKey: "Prop_Show",        value: true });
    text          = new formattingSettings.TextInput({   name: "text",          displayName: "Text",        displayNameKey: "Prop_Text",        placeholder: "", value: "" });
    color         = new formattingSettings.ColorPicker({ name: "color",         displayName: "Color",       displayNameKey: "Prop_Color",       value: { value: "#0E1336" } });
    fontFamily    = new formattingSettings.FontPicker({  name: "fontFamily",    displayName: "Font",        displayNameKey: "Prop_FontFamily",  value: "Segoe UI" });
    fontSize      = new formattingSettings.NumUpDown({   name: "fontSize",      displayName: "Font size",   displayNameKey: "Prop_FontSize",    value: 18 });
    fontBold      = new formattingSettings.ToggleSwitch({ name: "fontBold",     displayName: "Bold",        displayNameKey: "Prop_Bold",        value: true });
    fontItalic    = new formattingSettings.ToggleSwitch({ name: "fontItalic",   displayName: "Italic",      displayNameKey: "Prop_Italic",      value: false });
    fontUnderline = new formattingSettings.ToggleSwitch({ name: "fontUnderline",displayName: "Underline",   displayNameKey: "Prop_Underline",   value: false });
    align         = new formattingSettings.ItemDropdown({ name: "align",        displayName: "Alignment",   displayNameKey: "Prop_Align",
        items: [
            { value: "left",   displayName: "Left" },
            { value: "center", displayName: "Center" },
            { value: "right",  displayName: "Right" }
        ],
        value: { value: "left", displayName: "Left" }
    });

    topLevelSlice = this.show;

    groupContent = new formattingSettings.Group({
        name: "titleContent", displayName: "Content", displayNameKey: "TitleGroup_Content",
        collapsible: true,
        slices: [this.text, this.align, this.color]
    });
    groupTypography = new formattingSettings.Group({
        name: "titleTypography", displayName: "Typography", displayNameKey: "TitleGroup_Typography",
        collapsible: true,
        slices: [this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontUnderline]
    });

    groups = [this.groupContent, this.groupTypography];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Bar value labels — CompositeCard: Typography · Position & color mode · Per-zone colors
 * ──────────────────────────────────────────────────────────────────────── */
export class LabelsSettings extends formattingSettings.CompositeCard {
    name = "labels"; displayName = "Bar value labels"; displayNameKey = "Obj_Labels";
    show       = new formattingSettings.ToggleSwitch({ name: "show",       displayName: "Show",                       displayNameKey: "Prop_Show",                value: true });
    color      = new formattingSettings.ColorPicker({ name: "color",       displayName: "Neutral color (on target)",  displayNameKey: "Prop_LabelNeutralColor",   value: { value: "#4C5275" } });
    fontFamily = new formattingSettings.FontPicker({  name: "fontFamily",  displayName: "Font",                       displayNameKey: "Prop_FontFamily",          value: "Segoe UI" });
    fontSize   = new formattingSettings.NumUpDown({   name: "fontSize",    displayName: "Font size",                  displayNameKey: "Prop_FontSize",            value: 12 });
    fontBold   = new formattingSettings.ToggleSwitch({ name: "fontBold",   displayName: "Bold",                       displayNameKey: "Prop_Bold",                value: true });
    fontItalic = new formattingSettings.ToggleSwitch({ name: "fontItalic", displayName: "Italic",                     displayNameKey: "Prop_Italic",              value: false });
    position   = new formattingSettings.ItemDropdown({ name: "position",   displayName: "Position",                   displayNameKey: "Prop_LabelPosition",
        items: [
            { value: "auto", displayName: "Auto" },
            { value: "end",  displayName: "End of bar" }
        ],
        value: { value: "auto", displayName: "Auto" }
    });
    colorMode      = new formattingSettings.ItemDropdown({ name: "colorMode", displayName: "Color mode", displayNameKey: "Prop_LabelColorMode",
        items: [
            { value: "inheritFromBar", displayName: "Inherit from bar" },
            { value: "manual",         displayName: "Manual (per zone)" }
        ],
        value: { value: "inheritFromBar", displayName: "Inherit from bar" }
    });
    colorDeepUnder = new formattingSettings.ColorPicker({ name: "colorDeepUnder", displayName: "Deep under (label)", displayNameKey: "Prop_LabelColorDeepUnder", value: { value: "#4C5275" } });
    colorSoftUnder = new formattingSettings.ColorPicker({ name: "colorSoftUnder", displayName: "Soft under (label)", displayNameKey: "Prop_LabelColorSoftUnder", value: { value: "#4C5275" } });
    colorTolerance = new formattingSettings.ColorPicker({ name: "colorTolerance", displayName: "On target (label)",  displayNameKey: "Prop_LabelColorTolerance", value: { value: "#4C5275" } });
    colorSoftOver  = new formattingSettings.ColorPicker({ name: "colorSoftOver",  displayName: "Soft over (label)",  displayNameKey: "Prop_LabelColorSoftOver",  value: { value: "#4C5275" } });
    colorDeepOver  = new formattingSettings.ColorPicker({ name: "colorDeepOver",  displayName: "Deep over (label)",  displayNameKey: "Prop_LabelColorDeepOver",  value: { value: "#4C5275" } });

    topLevelSlice = this.show;

    groupTypography = new formattingSettings.Group({
        name: "labelsTypography", displayName: "Typography", displayNameKey: "LabelsGroup_Typography",
        collapsible: true,
        slices: [this.fontFamily, this.fontSize, this.fontBold, this.fontItalic]
    });
    groupBehavior = new formattingSettings.Group({
        name: "labelsBehavior", displayName: "Behavior", displayNameKey: "LabelsGroup_Behavior",
        collapsible: true,
        slices: [this.position, this.colorMode, this.color]
    });
    groupZoneColors = new formattingSettings.Group({
        name: "labelsZoneColors", displayName: "Per-zone colors", displayNameKey: "LabelsGroup_ZoneColors",
        collapsible: true,
        slices: [this.colorDeepUnder, this.colorSoftUnder, this.colorTolerance, this.colorSoftOver, this.colorDeepOver]
    });

    groups = [this.groupTypography, this.groupBehavior, this.groupZoneColors];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Bars
 * ──────────────────────────────────────────────────────────────────────── */
export class BarsSettings extends formattingSettings.SimpleCard {
    name = "bars"; displayName = "Bars"; displayNameKey = "Obj_Bars";
    barRadius      = new formattingSettings.NumUpDown({   name: "barRadius",       displayName: "Corner radius (px)", displayNameKey: "Prop_BarRadius",     value: 6 });
    barOpacity     = new formattingSettings.NumUpDown({   name: "barOpacity",      displayName: "Opacity (0-1)",      displayNameKey: "Prop_BarOpacity",    value: 1 });
    barShadow      = new formattingSettings.ToggleSwitch({ name: "barShadow",      displayName: "Drop shadow",        displayNameKey: "Prop_BarShadow",     value: true });
    barHeightMode  = new formattingSettings.ItemDropdown({ name: "barHeightMode",  displayName: "Height mode",        displayNameKey: "Prop_BarHeightMode",
        items: [
            { value: "auto",  displayName: "Auto" },
            { value: "fixed", displayName: "Fixed" }
        ],
        value: { value: "auto", displayName: "Auto" }
    });
    barHeightFixed = new formattingSettings.NumUpDown({ name: "barHeightFixed", displayName: "Fixed height (px)", displayNameKey: "Prop_BarHeightFixed", value: 30 });
    slices = [this.barRadius, this.barOpacity, this.barShadow, this.barHeightMode, this.barHeightFixed];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Zone colors
 * ──────────────────────────────────────────────────────────────────────── */
export class ZoneColorsSettings extends formattingSettings.SimpleCard {
    name = "zoneColors"; displayName = "Zone colors"; displayNameKey = "Obj_ZoneColors";
    colorDeepUnder  = new formattingSettings.ColorPicker({ name: "colorDeepUnder", displayName: "Deep under target",   displayNameKey: "Prop_ColorDeepUnder", value: { value: "#7E45FF" } });
    colorSoftUnder  = new formattingSettings.ColorPicker({ name: "colorSoftUnder", displayName: "Soft under target",   displayNameKey: "Prop_ColorSoftUnder", value: { value: "#DBCCFB" } });
    colorTolerance  = new formattingSettings.ColorPicker({ name: "colorTolerance", displayName: "On target (tolerance)", displayNameKey: "Prop_ColorTolerance", value: { value: "#ECECF3" } });
    colorSoftOver   = new formattingSettings.ColorPicker({ name: "colorSoftOver",  displayName: "Soft over target",    displayNameKey: "Prop_ColorSoftOver",  value: { value: "#FBD2DE" } });
    colorDeepOver   = new formattingSettings.ColorPicker({ name: "colorDeepOver",  displayName: "Deep over target",    displayNameKey: "Prop_ColorDeepOver",  value: { value: "#F0477A" } });
    slices = [this.colorDeepUnder, this.colorSoftUnder, this.colorTolerance, this.colorSoftOver, this.colorDeepOver];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Decomposition (zone thresholds + tolerance) — dedicated card
 * ──────────────────────────────────────────────────────────────────────── */
export class DecompositionSettings extends formattingSettings.SimpleCard {
    name = "decomposition"; displayName = "Decomposition (zones)"; displayNameKey = "Obj_Decomposition";
    thresholdSoft   = new formattingSettings.NumUpDown({ name: "thresholdSoft",   displayName: "Soft threshold (%)",     displayNameKey: "Prop_DecompThresholdSoft", value: 5  });
    thresholdDeep   = new formattingSettings.NumUpDown({ name: "thresholdDeep",   displayName: "Deep threshold (%)",     displayNameKey: "Prop_DecompThresholdDeep", value: 20 });
    tolerance       = new formattingSettings.NumUpDown({ name: "tolerance",       displayName: "Tolerance threshold (%)",displayNameKey: "Prop_DecompTolerance",     value: 5  });
    tolerancePolicy = new formattingSettings.ItemDropdown({ name: "tolerancePolicy", displayName: "Tolerance policy",   displayNameKey: "Prop_DecompTolPolicy",
        items: [
            { value: "soft",   displayName: "Use soft threshold" },
            { value: "custom", displayName: "Use custom tolerance" }
        ],
        value: { value: "soft", displayName: "Use soft threshold" }
    });
    slices = [this.thresholdSoft, this.thresholdDeep, this.tolerancePolicy, this.tolerance];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Items axis — left labels (font, color, overflow handling)
 * ──────────────────────────────────────────────────────────────────────── */
export class AxisSettings extends formattingSettings.SimpleCard {
    name = "axis"; displayName = "Items axis"; displayNameKey = "Obj_Axis";
    show         = new formattingSettings.ToggleSwitch({ name: "show",         displayName: "Show",        displayNameKey: "Prop_Show",         value: true });
    color        = new formattingSettings.ColorPicker({ name: "color",         displayName: "Color",       displayNameKey: "Prop_Color",        value: { value: "#0E1336" } });
    fontFamily   = new formattingSettings.FontPicker({  name: "fontFamily",    displayName: "Font",        displayNameKey: "Prop_FontFamily",   value: "Segoe UI" });
    fontSize     = new formattingSettings.NumUpDown({   name: "fontSize",      displayName: "Font size",   displayNameKey: "Prop_FontSize",     value: 12 });
    fontBold     = new formattingSettings.ToggleSwitch({ name: "fontBold",     displayName: "Bold",        displayNameKey: "Prop_Bold",         value: false });
    fontItalic   = new formattingSettings.ToggleSwitch({ name: "fontItalic",   displayName: "Italic",      displayNameKey: "Prop_Italic",       value: false });
    overflow     = new formattingSettings.ItemDropdown({ name: "overflow",     displayName: "When too long", displayNameKey: "Prop_AxisOverflow",
        items: [
            { value: "ellipsis", displayName: "Ellipsis" },
            { value: "wrap",     displayName: "Wrap on words" },
            { value: "shrink",   displayName: "Auto-shrink font" }
        ],
        value: { value: "ellipsis", displayName: "Ellipsis" }
    });
    maxWidthPct  = new formattingSettings.NumUpDown({ name: "maxWidthPct",  displayName: "Max width (% of chart)", displayNameKey: "Prop_AxisMaxWidthPct", value: 35 });
    minFontSize  = new formattingSettings.NumUpDown({ name: "minFontSize",  displayName: "Min font (when shrink)", displayNameKey: "Prop_AxisMinFont",     value: 8  });
    slices = [this.show, this.color, this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.overflow, this.maxWidthPct, this.minFontSize];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Semantics
 * ──────────────────────────────────────────────────────────────────────── */
export class SemanticsSettings extends formattingSettings.SimpleCard {
    name = "semantics"; displayName = "Semantics"; displayNameKey = "Obj_Semantics";
    overIsBad         = new formattingSettings.ToggleSwitch({ name: "overIsBad",         displayName: "Over is negative",   displayNameKey: "Prop_OverIsBad",         value: true });
    overTermSingular  = new formattingSettings.TextInput({   name: "overTermSingular",  displayName: "Over (singular)",     displayNameKey: "Prop_OverTermSingular",  placeholder: "", value: "" });
    overTermPlural    = new formattingSettings.TextInput({   name: "overTermPlural",    displayName: "Over (plural)",       displayNameKey: "Prop_OverTermPlural",    placeholder: "", value: "" });
    underTermSingular = new formattingSettings.TextInput({   name: "underTermSingular", displayName: "Under (singular)",    displayNameKey: "Prop_UnderTermSingular", placeholder: "", value: "" });
    underTermPlural   = new formattingSettings.TextInput({   name: "underTermPlural",   displayName: "Under (plural)",      displayNameKey: "Prop_UnderTermPlural",   placeholder: "", value: "" });
    slices = [this.overIsBad, this.overTermSingular, this.overTermPlural, this.underTermSingular, this.underTermPlural];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Tooltip style
 * ──────────────────────────────────────────────────────────────────────── */
export class TooltipStyleSettings extends formattingSettings.SimpleCard {
    name = "tooltipStyle"; displayName = "Tooltip"; displayNameKey = "Obj_TooltipStyle";
    bg         = new formattingSettings.ColorPicker({  name: "bg",         displayName: "Background",     displayNameKey: "Prop_TtBg",        value: { value: "#14162E" } });
    text       = new formattingSettings.ColorPicker({  name: "text",       displayName: "Text color",     displayNameKey: "Prop_TtText",      value: { value: "#FFFFFF" } });
    fontFamily = new formattingSettings.FontPicker({   name: "fontFamily", displayName: "Font",           displayNameKey: "Prop_FontFamily",  value: "Segoe UI" });
    size       = new formattingSettings.NumUpDown({    name: "size",       displayName: "Font size",      displayNameKey: "Prop_FontSize",    value: 12 });
    bold       = new formattingSettings.ToggleSwitch({ name: "bold",       displayName: "Bold",           displayNameKey: "Prop_Bold",        value: false });
    italic     = new formattingSettings.ToggleSwitch({ name: "italic",     displayName: "Italic",         displayNameKey: "Prop_Italic",      value: false });
    radius     = new formattingSettings.NumUpDown({    name: "radius",     displayName: "Corner radius",  displayNameKey: "Prop_TtRadius",    value: 12 });
    m1Label    = new formattingSettings.TextInput({    name: "m1Label",    displayName: "Reference label override", displayNameKey: "Prop_TtM1Label", placeholder: "", value: "" });
    m2Label    = new formattingSettings.TextInput({    name: "m2Label",    displayName: "Actual label override",    displayNameKey: "Prop_TtM2Label", placeholder: "", value: "" });
    slices = [this.bg, this.text, this.fontFamily, this.size, this.bold, this.italic, this.radius, this.m1Label, this.m2Label];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Side panel — CompositeCard split into 6 collapsible sub-groups:
 *   General · Total · Distribution · Global gap · Max over · Max under
 * All property names stay flat in capabilities (object: "panel") — groups
 * are a UI-only construct and don't change persisted property paths.
 * ──────────────────────────────────────────────────────────────────────── */
export class PanelSettings extends formattingSettings.CompositeCard {
    name = "panel"; displayName = "Side panel"; displayNameKey = "Obj_Panel";

    /* properties (kept as instance fields so visual.ts keeps the same paths) */
    show              = new formattingSettings.ToggleSwitch({ name: "show",              displayName: "Show panel",            displayNameKey: "Prop_Show",              value: true });
    headText          = new formattingSettings.TextInput({   name: "headText",          displayName: "Heading text",          displayNameKey: "Prop_PanelHeadText",     placeholder: "", value: "" });
    headColor         = new formattingSettings.ColorPicker({ name: "headColor",         displayName: "Heading color",         displayNameKey: "Prop_PanelHeadColor",    value: { value: "#8A8AAA" } });
    headSize          = new formattingSettings.NumUpDown({   name: "headSize",          displayName: "Heading size",          displayNameKey: "Prop_PanelHeadSize",     value: 11 });
    totalSize         = new formattingSettings.NumUpDown({   name: "totalSize",         displayName: "Total size",            displayNameKey: "Prop_PanelTotalSize",    value: 30 });
    totalLblText      = new formattingSettings.TextInput({   name: "totalLblText",      displayName: "Total label override",  displayNameKey: "Prop_PanelTotalLblText", placeholder: "", value: "" });
    distributionShow  = new formattingSettings.ToggleSwitch({ name: "distributionShow", displayName: "Show distribution",     displayNameKey: "Prop_PanelDistShow",     value: true });
    distributionLblText = new formattingSettings.TextInput({ name: "distributionLblText", displayName: "Distribution label",  displayNameKey: "Prop_PanelDistLbl",      placeholder: "", value: "" });
    ecartGlobalLblText  = new formattingSettings.TextInput({ name: "ecartGlobalLblText",  displayName: "Global gap label",    displayNameKey: "Prop_PanelEcartLbl",     placeholder: "", value: "" });
    depMaxLblText     = new formattingSettings.TextInput({   name: "depMaxLblText",     displayName: "Max over label",        displayNameKey: "Prop_PanelDepMaxLbl",    placeholder: "", value: "" });
    retardMaxLblText  = new formattingSettings.TextInput({   name: "retardMaxLblText",  displayName: "Max under label",       displayNameKey: "Prop_PanelRetardMaxLbl", placeholder: "", value: "" });
    separatorColor    = new formattingSettings.ColorPicker({ name: "separatorColor",    displayName: "Separator color",       displayNameKey: "Prop_PanelSepColor",     value: { value: "#E2E2EF" } });
    valColor          = new formattingSettings.ColorPicker({ name: "valColor",          displayName: "Value color",           displayNameKey: "Prop_PanelValColor",     value: { value: "#0E1336" } });
    lblColor          = new formattingSettings.ColorPicker({ name: "lblColor",          displayName: "Label color",           displayNameKey: "Prop_PanelLblColor",     value: { value: "#8A8AAA" } });
    lblSize           = new formattingSettings.NumUpDown({   name: "lblSize",           displayName: "Label size",            displayNameKey: "Prop_PanelLblSize",      value: 11 });
    valSize           = new formattingSettings.NumUpDown({   name: "valSize",           displayName: "Value size",            displayNameKey: "Prop_PanelValSize",      value: 24 });
    fontFamily        = new formattingSettings.FontPicker({  name: "fontFamily",        displayName: "Font",                  displayNameKey: "Prop_FontFamily",        value: "Segoe UI" });
    widthPx           = new formattingSettings.NumUpDown({   name: "widthPx",           displayName: "Width (px)",            displayNameKey: "Prop_PanelWidth",        value: 220 });
    showDepMax        = new formattingSettings.ToggleSwitch({ name: "showDepMax",       displayName: "Show 'max over' block", displayNameKey: "Prop_PanelShowDepMax",    value: true });
    showRetardMax     = new formattingSettings.ToggleSwitch({ name: "showRetardMax",    displayName: "Show 'max under' block",displayNameKey: "Prop_PanelShowRetardMax", value: true });
    showTotal         = new formattingSettings.ToggleSwitch({ name: "showTotal",        displayName: "Show total block",      displayNameKey: "Prop_PanelShowTotal",     value: true });
    showEcartGlobal   = new formattingSettings.ToggleSwitch({ name: "showEcartGlobal",  displayName: "Show global gap block", displayNameKey: "Prop_PanelShowEcart",     value: true });
    bgColor           = new formattingSettings.ColorPicker({  name: "bgColor",          displayName: "Panel background",      displayNameKey: "Prop_PanelBg",            value: { value: "#FFFFFF" } });
    namesColor        = new formattingSettings.ColorPicker({  name: "namesColor",       displayName: "Max names color",       displayNameKey: "Prop_PanelNamesColor",    value: { value: "#0E1336" } });
    tagBgOpacity      = new formattingSettings.NumUpDown({   name: "tagBgOpacity",     displayName: "Max tag bg opacity",    displayNameKey: "Prop_PanelTagBgOpacity",  value: 1 });
    bandHeight        = new formattingSettings.NumUpDown({   name: "bandHeight",       displayName: "Distribution band height (px)", displayNameKey: "Prop_PanelBandHeight", value: 22 });
    axisRetardsLabel  = new formattingSettings.TextInput({   name: "axisRetardsLabel", displayName: "Distribution: under label",     displayNameKey: "Prop_PanelAxisRetards", placeholder: "", value: "" });
    axisOnTargetLabel = new formattingSettings.TextInput({   name: "axisOnTargetLabel",displayName: "Distribution: on-target label", displayNameKey: "Prop_PanelAxisTol",     placeholder: "", value: "" });
    axisDepLabel      = new formattingSettings.TextInput({   name: "axisDepLabel",     displayName: "Distribution: over label",      displayNameKey: "Prop_PanelAxisDep",     placeholder: "", value: "" });
    distributionTickWidth = new formattingSettings.NumUpDown({ name: "distributionTickWidth", displayName: "Distribution separator width (px)", displayNameKey: "Prop_PanelDistTickWidth", value: 2 });

    /* master toggle pinned at the top of the card */
    topLevelSlice = this.show;

    /* sub-groups */
    groupGeneral = new formattingSettings.Group({
        name: "panelGeneral", displayName: "General", displayNameKey: "PanelGroup_General",
        collapsible: true,
        slices: [
            this.headText, this.headSize, this.headColor,
            this.bgColor, this.separatorColor,
            this.fontFamily, this.widthPx,
            this.lblColor, this.lblSize,
            this.valColor, this.valSize
        ]
    });
    groupTotal = new formattingSettings.Group({
        name: "panelTotal", displayName: "Total block", displayNameKey: "PanelGroup_Total",
        collapsible: true,
        topLevelSlice: this.showTotal,
        slices: [this.totalLblText, this.totalSize]
    });
    groupDistribution = new formattingSettings.Group({
        name: "panelDistribution", displayName: "Distribution band", displayNameKey: "PanelGroup_Distribution",
        collapsible: true,
        topLevelSlice: this.distributionShow,
        slices: [
            this.distributionLblText, this.bandHeight, this.distributionTickWidth,
            this.axisRetardsLabel, this.axisOnTargetLabel, this.axisDepLabel
        ]
    });
    groupEcartGlobal = new formattingSettings.Group({
        name: "panelEcartGlobal", displayName: "Global gap", displayNameKey: "PanelGroup_EcartGlobal",
        collapsible: true,
        topLevelSlice: this.showEcartGlobal,
        slices: [this.ecartGlobalLblText]
    });
    groupDepMax = new formattingSettings.Group({
        name: "panelDepMax", displayName: "Max over (tag)", displayNameKey: "PanelGroup_DepMax",
        collapsible: true,
        topLevelSlice: this.showDepMax,
        slices: [this.depMaxLblText, this.namesColor, this.tagBgOpacity]
    });
    groupRetardMax = new formattingSettings.Group({
        name: "panelRetardMax", displayName: "Max under (tag)", displayNameKey: "PanelGroup_RetardMax",
        collapsible: true,
        topLevelSlice: this.showRetardMax,
        slices: [this.retardMaxLblText]
    });

    groups = [
        this.groupGeneral,
        this.groupTotal,
        this.groupDistribution,
        this.groupEcartGlobal,
        this.groupDepMax,
        this.groupRetardMax
    ];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Controls (search, dropdowns, pager) — CompositeCard split into 4 groups:
 *   General (sizing/font) · Neutral · Hover · Selected
 * ──────────────────────────────────────────────────────────────────────── */
export class ControlsSettings extends formattingSettings.CompositeCard {
    name = "controls"; displayName = "Controls"; displayNameKey = "Obj_Controls";
    controlsBg             = new formattingSettings.ColorPicker({ name: "controlsBg",             displayName: "Background (neutral)",     displayNameKey: "Prop_CtrlBg",            value: { value: "#FFFFFF" } });
    controlsBorder         = new formattingSettings.ColorPicker({ name: "controlsBorder",         displayName: "Border (neutral)",         displayNameKey: "Prop_CtrlBorder",        value: { value: "#E2E2EF" } });
    controlsBorderWidth    = new formattingSettings.NumUpDown({   name: "controlsBorderWidth",    displayName: "Border width",             displayNameKey: "Prop_CtrlBorderWidth",   value: 1 });
    controlsText           = new formattingSettings.ColorPicker({ name: "controlsText",           displayName: "Text (neutral)",           displayNameKey: "Prop_CtrlText",          value: { value: "#0E1336" } });
    controlsRadius         = new formattingSettings.NumUpDown({   name: "controlsRadius",         displayName: "Corner radius",            displayNameKey: "Prop_CtrlRadius",        value: 99 });
    controlsHover          = new formattingSettings.ColorPicker({ name: "controlsHover",          displayName: "Background (hover)",       displayNameKey: "Prop_CtrlHover",         value: { value: "#F4F1FF" } });
    controlsHoverBorder    = new formattingSettings.ColorPicker({ name: "controlsHoverBorder",    displayName: "Border (hover)",           displayNameKey: "Prop_CtrlHoverBorder",   value: { value: "#7E45FF" } });
    controlsHoverText      = new formattingSettings.ColorPicker({ name: "controlsHoverText",      displayName: "Text (hover)",             displayNameKey: "Prop_CtrlHoverText",     value: { value: "#0E1336" } });
    controlsSelectedBg     = new formattingSettings.ColorPicker({ name: "controlsSelectedBg",     displayName: "Background (selected)",    displayNameKey: "Prop_CtrlSelBg",         value: { value: "#7E45FF" } });
    controlsSelectedBorder = new formattingSettings.ColorPicker({ name: "controlsSelectedBorder", displayName: "Border (selected)",        displayNameKey: "Prop_CtrlSelBorder",     value: { value: "#7E45FF" } });
    controlsSelectedText   = new formattingSettings.ColorPicker({ name: "controlsSelectedText",   displayName: "Text (selected)",          displayNameKey: "Prop_CtrlSelText",       value: { value: "#FFFFFF" } });
    controlsFontFamily     = new formattingSettings.FontPicker({  name: "controlsFontFamily",     displayName: "Font",                     displayNameKey: "Prop_FontFamily",        value: "Segoe UI" });
    controlsSize           = new formattingSettings.NumUpDown({   name: "controlsSize",           displayName: "Font size",                displayNameKey: "Prop_FontSize",          value: 12 });
    controlsHeight         = new formattingSettings.NumUpDown({   name: "controlsHeight",         displayName: "Pill height (px)",          displayNameKey: "Prop_CtrlHeight",        value: 28 });
    controlsPaddingV       = new formattingSettings.NumUpDown({   name: "controlsPaddingV",       displayName: "Pill padding-Y (px)",       displayNameKey: "Prop_CtrlPadV",          value: 0  });
    controlsPaddingH       = new formattingSettings.NumUpDown({   name: "controlsPaddingH",       displayName: "Pill padding-X (px)",       displayNameKey: "Prop_CtrlPadH",          value: 12 });
    controlsGap            = new formattingSettings.NumUpDown({   name: "controlsGap",            displayName: "Gap between controls (px)", displayNameKey: "Prop_CtrlGap",           value: 6  });
    searchWidth            = new formattingSettings.NumUpDown({   name: "searchWidth",            displayName: "Search input width (px)",   displayNameKey: "Prop_SearchWidth",       value: 130 });

    groupGeneral = new formattingSettings.Group({
        name: "controlsGeneral", displayName: "General", displayNameKey: "ControlsGroup_General",
        collapsible: true,
        slices: [
            this.controlsFontFamily, this.controlsSize,
            this.controlsHeight, this.controlsPaddingV, this.controlsPaddingH,
            this.controlsGap, this.searchWidth,
            this.controlsRadius, this.controlsBorderWidth
        ]
    });
    groupNeutral = new formattingSettings.Group({
        name: "controlsNeutral", displayName: "Neutral state", displayNameKey: "ControlsGroup_Neutral",
        collapsible: true,
        slices: [this.controlsBg, this.controlsBorder, this.controlsText]
    });
    groupHover = new formattingSettings.Group({
        name: "controlsHover", displayName: "Hover state", displayNameKey: "ControlsGroup_Hover",
        collapsible: true,
        slices: [this.controlsHover, this.controlsHoverBorder, this.controlsHoverText]
    });
    groupSelected = new formattingSettings.Group({
        name: "controlsSelected", displayName: "Selected state", displayNameKey: "ControlsGroup_Selected",
        collapsible: true,
        slices: [this.controlsSelectedBg, this.controlsSelectedBorder, this.controlsSelectedText]
    });

    groups = [this.groupGeneral, this.groupNeutral, this.groupHover, this.groupSelected];
}


/* ──────────────────────────────────────────────────────────────────────────
 * Search
 * ──────────────────────────────────────────────────────────────────────── */
export class SearchSettings extends formattingSettings.SimpleCard {
    name = "search"; displayName = "Search"; displayNameKey = "Obj_Search";
    show                  = new formattingSettings.ToggleSwitch({ name: "show",                  displayName: "Show search",        displayNameKey: "Prop_Show",                value: true });
    placeholder           = new formattingSettings.TextInput({   name: "placeholder",           displayName: "Placeholder text",    displayNameKey: "Prop_SearchPlaceholder",   placeholder: "", value: "" });
    autoSwitchAllOnSearch = new formattingSettings.ToggleSwitch({ name: "autoSwitchAllOnSearch", displayName: "Auto-switch to All", displayNameKey: "Prop_SearchAutoSwitch",    value: true });
    slices = [this.show, this.placeholder, this.autoSwitchAllOnSearch];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Sort defaults
 * ──────────────────────────────────────────────────────────────────────── */
export class SortDefaultsSettings extends formattingSettings.SimpleCard {
    name = "sortDefaults"; displayName = "Sort defaults"; displayNameKey = "Obj_SortDefaults";
    defaultMode   = new formattingSettings.ItemDropdown({ name: "defaultMode",   displayName: "Default mode",   displayNameKey: "Prop_DefaultMode",
        items: [
            { value: "flop",   displayName: "Top over (flop)" },
            { value: "top",    displayName: "Top under" },
            { value: "all",    displayName: "All ranked" },
            { value: "pareto", displayName: "Pareto 20/80" }
        ],
        value: { value: "flop", displayName: "Top over (flop)" }
    });
    defaultMetric = new formattingSettings.ItemDropdown({ name: "defaultMetric", displayName: "Default metric", displayNameKey: "Prop_DefaultMetric",
        items: [
            { value: "pct", displayName: "Percent" },
            { value: "abs", displayName: "Absolute value" }
        ],
        value: { value: "abs", displayName: "Absolute value" }
    });
    defaultN      = new formattingSettings.ItemDropdown({ name: "defaultN",      displayName: "Default N",      displayNameKey: "Prop_DefaultN",
        items: [
            { value: "auto", displayName: "Auto" },
            { value: "5",    displayName: "5"    },
            { value: "10",   displayName: "10"   },
            { value: "15",   displayName: "15"   },
            { value: "20",   displayName: "20"   },
            { value: "all",  displayName: "All"  }
        ],
        value: { value: "auto", displayName: "Auto" }
    });
    autoNCap        = new formattingSettings.NumUpDown({ name: "autoNCap",        displayName: "Auto N cap",        displayNameKey: "Prop_AutoNCap",       value: 10 });
    modeFlopLabel   = new formattingSettings.TextInput({ name: "modeFlopLabel",   displayName: "Mode 'over' label",  displayNameKey: "Prop_ModeFlopLbl",   placeholder: "", value: "" });
    modeTopLabel    = new formattingSettings.TextInput({ name: "modeTopLabel",    displayName: "Mode 'under' label", displayNameKey: "Prop_ModeTopLbl",    placeholder: "", value: "" });
    modeAllLabel    = new formattingSettings.TextInput({ name: "modeAllLabel",    displayName: "Mode 'all' label",   displayNameKey: "Prop_ModeAllLbl",    placeholder: "", value: "" });
    modeParetoLabel = new formattingSettings.TextInput({ name: "modeParetoLabel", displayName: "Mode 'pareto' label",displayNameKey: "Prop_ModeParetoLbl", placeholder: "", value: "" });
    slices = [this.defaultMode, this.defaultMetric, this.defaultN, this.autoNCap, this.modeFlopLabel, this.modeTopLabel, this.modeAllLabel, this.modeParetoLabel];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Pagination — full pager customization (font, colors, hover, selected)
 *   General · Neutral · Hover · Selected
 * ──────────────────────────────────────────────────────────────────────── */
export class PaginationSettings extends formattingSettings.CompositeCard {
    name = "pagination"; displayName = "Pagination"; displayNameKey = "Obj_Pagination";
    pageSize          = new formattingSettings.NumUpDown({    name: "pageSize",          displayName: "Page size",           displayNameKey: "Prop_PageSize",         value: 20 });
    pagerShow         = new formattingSettings.ToggleSwitch({ name: "pagerShow",         displayName: "Show pager",          displayNameKey: "Prop_PagerShow",        value: true });
    pagerBg           = new formattingSettings.ColorPicker({  name: "pagerBg",           displayName: "Background",          displayNameKey: "Prop_PagerBg",          value: { value: "#FFFFFF" } });
    pagerBorder       = new formattingSettings.ColorPicker({  name: "pagerBorder",       displayName: "Border color",        displayNameKey: "Prop_PagerBorder",      value: { value: "#E2E2EF" } });
    pagerText         = new formattingSettings.ColorPicker({  name: "pagerText",         displayName: "Text color",          displayNameKey: "Prop_PagerText",        value: { value: "#4C5275" } });
    pagerHoverBg      = new formattingSettings.ColorPicker({  name: "pagerHoverBg",      displayName: "Hover background",    displayNameKey: "Prop_PagerHoverBg",     value: { value: "#F4F1FF" } });
    pagerHoverText    = new formattingSettings.ColorPicker({  name: "pagerHoverText",    displayName: "Hover text",          displayNameKey: "Prop_PagerHoverText",   value: { value: "#7E45FF" } });
    pagerActiveBg     = new formattingSettings.ColorPicker({  name: "pagerActiveBg",     displayName: "Selected background", displayNameKey: "Prop_PagerActiveBg",    value: { value: "#7E45FF" } });
    pagerActiveText   = new formattingSettings.ColorPicker({  name: "pagerActiveText",   displayName: "Selected text",       displayNameKey: "Prop_PagerActiveText",  value: { value: "#FFFFFF" } });
    pagerRadius       = new formattingSettings.NumUpDown({    name: "pagerRadius",       displayName: "Corner radius (px)",  displayNameKey: "Prop_PagerRadius",      value: 99 });
    pagerFontFamily   = new formattingSettings.FontPicker({   name: "pagerFontFamily",   displayName: "Font",                displayNameKey: "Prop_FontFamily",       value: "Segoe UI" });
    pagerFontSize     = new formattingSettings.NumUpDown({    name: "pagerFontSize",     displayName: "Font size",           displayNameKey: "Prop_FontSize",         value: 11 });
    pagerFontBold     = new formattingSettings.ToggleSwitch({ name: "pagerFontBold",     displayName: "Bold",                displayNameKey: "Prop_Bold",             value: false });
    pagerFontItalic   = new formattingSettings.ToggleSwitch({ name: "pagerFontItalic",   displayName: "Italic",              displayNameKey: "Prop_Italic",           value: false });

    topLevelSlice = this.pagerShow;

    groupGeneral = new formattingSettings.Group({
        name: "pagerGeneral", displayName: "General", displayNameKey: "PagerGroup_General",
        collapsible: true,
        slices: [this.pageSize, this.pagerRadius, this.pagerFontFamily, this.pagerFontSize, this.pagerFontBold, this.pagerFontItalic]
    });
    groupNeutral = new formattingSettings.Group({
        name: "pagerNeutral", displayName: "Neutral state", displayNameKey: "PagerGroup_Neutral",
        collapsible: true,
        slices: [this.pagerBg, this.pagerBorder, this.pagerText]
    });
    groupHover = new formattingSettings.Group({
        name: "pagerHover", displayName: "Hover state", displayNameKey: "PagerGroup_Hover",
        collapsible: true,
        slices: [this.pagerHoverBg, this.pagerHoverText]
    });
    groupSelected = new formattingSettings.Group({
        name: "pagerSelected", displayName: "Selected state", displayNameKey: "PagerGroup_Selected",
        collapsible: true,
        slices: [this.pagerActiveBg, this.pagerActiveText]
    });

    groups = [this.groupGeneral, this.groupNeutral, this.groupHover, this.groupSelected];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Shine
 * ──────────────────────────────────────────────────────────────────────── */
export class ShineSettings extends formattingSettings.SimpleCard {
    name = "shine"; displayName = "Shine effect"; displayNameKey = "Obj_Shine";
    enabled  = new formattingSettings.ToggleSwitch({ name: "enabled",  displayName: "Enable shine",   displayNameKey: "Prop_ShineEnabled",  value: true });
    duration = new formattingSettings.NumUpDown({    name: "duration", displayName: "Duration (ms)",  displayNameKey: "Prop_ShineDuration", value: 900 });
    slices = [this.enabled, this.duration];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Number format
 * ──────────────────────────────────────────────────────────────────────── */
export class NumberFormatSettings extends formattingSettings.SimpleCard {
    name = "numberFormat"; displayName = "Number format"; displayNameKey = "Obj_NumberFormat";
    decimals           = new formattingSettings.NumUpDown({   name: "decimals",    displayName: "Absolute decimals", displayNameKey: "Prop_DecimalsAbs", value: 0 });
    decimalsPct        = new formattingSettings.NumUpDown({   name: "decimalsPct", displayName: "Percent decimals",  displayNameKey: "Prop_DecimalsPct", value: 1 });
    units              = new formattingSettings.ItemDropdown({ name: "units",      displayName: "Scaling unit",      displayNameKey: "Prop_ScalingUnit",
        items: [
            { value: "none", displayName: "None" },
            { value: "K",    displayName: "Thousands (K)" },
            { value: "M",    displayName: "Millions (M)" },
            { value: "B",    displayName: "Billions (B)" }
        ],
        value: { value: "none", displayName: "None" }
    });
    thousandsSeparator = new formattingSettings.ItemDropdown({ name: "thousandsSeparator", displayName: "Thousands separator", displayNameKey: "Prop_ThousandsSep",
        items: [
            { value: "space", displayName: "Space" },
            { value: "none",  displayName: "None"  },
            { value: "comma", displayName: "Comma (,)" },
            { value: "dot",   displayName: "Dot (.)"   }
        ],
        value: { value: "space", displayName: "Space" }
    });
    valueSeparator     = new formattingSettings.TextInput({ name: "valueSeparator", displayName: "Abs/pct separator", displayNameKey: "Prop_ValueSeparator", placeholder: " | ", value: " | " });
    slices = [this.decimals, this.decimalsPct, this.units, this.thousandsSeparator, this.valueSeparator];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Animations
 * ──────────────────────────────────────────────────────────────────────── */
export class AnimationsSettings extends formattingSettings.SimpleCard {
    name = "animations"; displayName = "Animations"; displayNameKey = "Obj_Animations";
    enabled  = new formattingSettings.ToggleSwitch({ name: "enabled",  displayName: "Enable animations", displayNameKey: "Prop_AnimEnabled",  value: true });
    duration = new formattingSettings.NumUpDown({    name: "duration", displayName: "Duration (ms)",     displayNameKey: "Prop_AnimDuration", value: 820 });
    easing   = new formattingSettings.ItemDropdown({ name: "easing",   displayName: "Easing",            displayNameKey: "Prop_AnimEasing",
        items: [
            { value: "easeInOut", displayName: "Ease in-out" },
            { value: "easeOut",   displayName: "Ease out"    },
            { value: "linear",    displayName: "Linear"      },
            { value: "bounce",    displayName: "Bounce"      },
            { value: "elastic",   displayName: "Elastic"     }
        ],
        value: { value: "easeOut", displayName: "Ease out" }
    });
    slices = [this.enabled, this.duration, this.easing];
}

/* ──────────────────────────────────────────────────────────────────────────
 * State (persistence — kept hidden from the format pane via topLevelSlice)
 * ──────────────────────────────────────────────────────────────────────── */
export class StateSettings extends formattingSettings.SimpleCard {
    name = "state"; displayName = "Visual state"; displayNameKey = "Obj_State";
    mode   = new formattingSettings.TextInput({ name: "mode",   displayName: "Mode",   displayNameKey: "Prop_StateMode",   placeholder: "", value: "" });
    metric = new formattingSettings.TextInput({ name: "metric", displayName: "Metric", displayNameKey: "Prop_StateMetric", placeholder: "", value: "" });
    n      = new formattingSettings.TextInput({ name: "n",      displayName: "N",      displayNameKey: "Prop_StateN",      placeholder: "", value: "" });
    page   = new formattingSettings.NumUpDown({ name: "page",   displayName: "Page",   displayNameKey: "Prop_StatePage",   value: 0 });
    search = new formattingSettings.TextInput({ name: "search", displayName: "Search", displayNameKey: "Prop_StateSearch", placeholder: "", value: "" });
    slices = [this.mode, this.metric, this.n, this.page, this.search];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Root model
 * ──────────────────────────────────────────────────────────────────────── */
export class VisualFormattingSettingsModel extends formattingSettings.Model {
    general       = new GeneralSettings();
    title         = new TitleSettings();
    labels        = new LabelsSettings();
    axis          = new AxisSettings();
    bars          = new BarsSettings();
    zoneColors    = new ZoneColorsSettings();
    decomposition = new DecompositionSettings();
    semantics     = new SemanticsSettings();
    tooltipStyle  = new TooltipStyleSettings();
    panel         = new PanelSettings();
    controls      = new ControlsSettings();
    search        = new SearchSettings();
    sortDefaults  = new SortDefaultsSettings();
    pagination    = new PaginationSettings();
    shine         = new ShineSettings();
    numberFormat  = new NumberFormatSettings();
    animations    = new AnimationsSettings();
    state         = new StateSettings();

    cards = [
        this.general,
        this.title, this.labels, this.axis, this.bars, this.zoneColors, this.decomposition, this.semantics,
        this.tooltipStyle, this.panel, this.controls, this.search,
        this.sortDefaults, this.pagination, this.shine, this.numberFormat,
        this.animations
        // state intentionally omitted — internal persistence only
    ];
}
