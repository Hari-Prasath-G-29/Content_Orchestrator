
import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

/**
 * Regulatory Compliance Hub (Destination page)
 * - 3 Tabs: Compliance Review | Compliance Report | Regulatory Intelligence
 * - Two cards: Left segments, Right detail (Source | Adapted | Compliant)
 */
export default function RegulatoryComplianceHub({
  projectName: projectNameProp = "No project name to display",
  therapyArea = "Respiratory · DE",
  progressItems: progressItemsProp = { approved: 0, total: 15 },
  segments: segmentsProp = [],
}) {
  const { state } = useLocation();
  const navigate = useNavigate();

  /** Tabs */
  const [activeTab, setActiveTab] = useState("review"); // "review" | "report" | "intel"

  /** Prefer project from previous page */
  const projectName = state?.projectName ?? projectNameProp;

  /** Normalize incoming segments from router state */
  const segments = useMemo(() => {
    const raw = Array.isArray(state?.segments)
      ? state.segments
      : Array.isArray(segmentsProp)
      ? segmentsProp
      : [];

    return (raw || [])
      .map((seg, i) => {
        const index = typeof seg.index === "number" ? seg.index : i + 1;
        const source = String(seg.source ?? "");
        const adapted = String(seg.adapted ?? seg.culturallyAdapted ?? seg.translated ?? ""); // phase 3 result if present
        const compliant = String(seg.compliant ?? ""); // phase 4 will fill this
        const words =
          typeof seg.words === "number"
            ? seg.words
            : source.split(/\s+/).filter(Boolean).length;

        return {
          id: seg.id ?? `seg-${index}`,
          index,
          source,
          adapted,   // shown under "Culturally Adapted Text (Phase 3)"
          compliant, // shown under "Regulatory Compliant Text"
          words,
          status: seg.status ?? (adapted.trim() ? "Pending" : "Pending"),
          lang: seg.lang ?? "EN",
          complianceScore: typeof seg.complianceScore === "number" ? seg.complianceScore : null,
        };
      })
      .filter((s) => s.source.trim().length > 0)
      .sort((a, b) => a.index - b.index);
  }, [state?.segments, segmentsProp]);

  /** Selected segment */
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    if (!selectedId && segments.length) setSelectedId(segments[0].id);
  }, [segments, selectedId]);
  const selected = useMemo(
    () => segments.find((s) => s.id === selectedId) || null,
    [segments, selectedId]
  );

  /** Local UI state for score & compliant text (per selection) */
  const [scoreById, setScoreById] = useState({});
  const [compliantById, setCompliantById] = useState({});

  useEffect(() => {
    // hydrate from incoming segment score/compliant if provided
    const initialScores = {};
    const initialCompliant = {};
    segments.forEach((s) => {
      if (typeof s.complianceScore === "number") initialScores[s.id] = s.complianceScore;
      if (s.compliant?.trim()) initialCompliant[s.id] = s.compliant;
    });
    setScoreById((prev) => ({ ...initialScores, ...prev }));
    setCompliantById((prev) => ({ ...initialCompliant, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length]);

  /** Progress (approved count) */
  const progressItems = useMemo(() => {
    const total = segments.length || progressItemsProp.total || 0;
    const approved = segments.filter((s) => (compliantById[s.id] || s.compliant || "").trim().length > 0).length;
    return total > 0 ? { approved, total } : progressItemsProp;
  }, [segments, compliantById, progressItemsProp]);

  const progressPct = useMemo(() => {
    const pct = (progressItems.approved / Math.max(progressItems.total, 1)) * 100;
    return Math.round(pct);
  }, [progressItems]);

  /** Sidebar: retain context when moving across phases */
  const handlePhaseClick = (phaseName) => {
    if (phaseName === "Global Context Capture") {
      navigate("/globalAssetCapture", { state: { projectName, segments } });
    }
    if (phaseName === "Smart TM Translation") {
      navigate("/smartTMTranslationHub", { state: { projectName, segments } });
    }
    if (phaseName === "Cultural Intelligence") {
      navigate("/culturalAdaptationWorkspace", { state: { projectName, segments } });
    }
  };

  /** Actions on detail panel */
  const runComplianceCheck = () => {
    if (!selected) return;
    // naive score demo: based on length and presence of certain terms
    const base = Math.min(100, Math.round(selected.adapted.length / 3));
    const hasBrand = /ofev|nintedanib/i.test(selected.adapted);
    const hasRisk = /risk|warning|contraindication/i.test(selected.adapted);
    const score = Math.max(0, Math.min(100, base + (hasBrand ? 10 : 0) + (hasRisk ? 8 : 0)));

    setScoreById((prev) => ({ ...prev, [selected.id]: score }));
  };

  const flagForReview = () => {
    if (!selected) return;
    // Just toggle a marker (you can persist if needed)
    alert(`Segment ${selected.index} flagged for regulatory review.`);
  };

  const approveCompliant = () => {
    if (!selected) return;
    // For demo: set compliant to adapted, you can pipe to your API
    const text = selected.adapted?.trim().length ? selected.adapted : selected.source;
    setCompliantById((prev) => ({ ...prev, [selected.id]: text }));
  };

  /** Complete Phase → next page (Quality Intelligence or your desired route) */
  const handleCompletePhase = () => {
    navigate("/qualityIntelligence", {
      state: {
        projectName,
        segments: segments.map((s) => ({
          ...s,
          complianceScore: scoreById[s.id] ?? s.complianceScore ?? null,
          compliant: compliantById[s.id] ?? s.compliant ?? "",
        })),
      },
    });
  };

  return (
    <div className="tm-app">
      {/* Sidebar */}
      <aside className="tm-sidebar">
        <div className="tm-sidebar-progress">
          <div className="tm-progress-row">
            <span className="tm-progress-label">Overall Progress</span>
            <span className="tm-progress-value">{progressPct}%</span>
          </div>
        </div>

        <nav className="tm-phases">
          {SIDEBAR_PHASES.map((p) => (
            <button
              key={p.id}
              className={`tm-phase-item ${p.status} ${p.name === "Regulatory Compliance" ? "is-active" : ""}`}
              aria-label={`Open ${p.name}`}
              onClick={() => handlePhaseClick(p.name)}
            >
              <span className={`tm-phase-icon ${p.iconClass}`} />
              <span className="tm-phase-text">
                <span className="tm-phase-title">{p.name}</span>
                <span className="tm-phase-sub">{p.sub}</span>
              </span>
              {p.status === "done" && <span className="tm-phase-check">✓</span>}
              {p.name === "Regulatory Compliance" && <span className="tm-phase-dot" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="tm-main">
        {/* Header */}
        <header className="tm-header">
          <div className="tm-header-left">
            <div className="tm-crumbs">
              <button className="tm-crumb">Main Hub</button>
              <svg className="tm-crumb-sep" viewBox="0 0 24 24" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
              <button className="tm-crumb">Glocalization Hub</button>
            </div>

            <div className="tm-title-row">
              <h1 className="tm-page-title">{projectName}</h1>
              <span className="tm-title-sub">{therapyArea}</span>
            </div>
          </div>

          <div className="tm-header-right">
            <span className="tm-saved">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 13l4 4L19 7" stroke="#1F7AEC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </span>
            <button className="tm-btn ghost">Save</button>
            <button className="tm-btn ghost">Focus</button>
          </div>
        </header>

        {/* Tabs bar */}
        <section className="tm-tabs-bar">
          <div className="tm-tabs">
            <button
              className={`tm-tab ${activeTab === "review" ? "is-active" : ""}`}
              onClick={() => setActiveTab("review")}
            >
              Compliance Review
            </button>
            <button
              className={`tm-tab ${activeTab === "report" ? "is-active" : ""}`}
              onClick={() => setActiveTab("report")}
            >
              Compliance Report
            </button>
            <button
              className={`tm-tab ${activeTab === "intel" ? "is-active" : ""}`}
              onClick={() => setActiveTab("intel")}
            >
              Regulatory Intelligence
            </button>
          </div>

          <div className="tm-tabs-right">
            <div className="tm-progress-inline">
              <span className="tm-progress-inline-label">Progress:</span>
              <span className="tm-progress-inline-value">
                {progressItems.approved} / {progressItems.total} approved
              </span>
              <div className="tm-progress-inline-bar">
                <div className="tm-progress-inline-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="tm-tabs-actions">
              <button className="tm-btn outline">Generate PDF</button>
              <button className="tm-btn primary" onClick={handleCompletePhase}>
                Complete Phase 3
              </button>
            </div>
          </div>
        </section>

        {/* Workspace grid */}
        <section className="tm-workspace rc-workspace">
          {/* Left card: Content Segments */}
          <div className="tm-card tm-left">
            <div className="tm-card-header">
              <h3 className="tm-card-title">Content Segments</h3>
              <span className="tm-light">{segments.length} segments to review</span>
            </div>

            <div className="tm-seg-list">
              {segments.map((seg) => {
                const isSelected = seg.id === selectedId;
                return (
                  <button
                    key={seg.id}
                    className={`tm-seg-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedId(seg.id)}
                    aria-label={`Open Segment ${seg.index}`}
                  >
                    <div className="tm-seg-item-top">
                      <span className="tm-ci-index">[{seg.index}]</span>
                      <span className="tm-seg-state">{(compliantById[seg.id] || seg.compliant || "").trim() ? "Approved" : "Pending"}</span>
                    </div>
                    <div className="tm-seg-snippet">{seg.source}</div>
                    <div className="tm-seg-meta-row">
                      <span className="tm-seg-meta">{seg.words} words</span>
                    </div>
                  </button>
                );
              })}
              {segments.length === 0 && (
                <div className="tm-empty">No segment present to display.</div>
              )}
            </div>
          </div>

          {/* Right card: Review panel */}
          <div className="tm-card tm-right">
            <div className="tm-card-header">
              <h3 className="tm-card-title">Regulatory Compliance Workspace</h3>
              <span className="tm-light">Review culturally adapted content for compliance</span>
            </div>

            {!selected && (
              <div className="tm-empty large">
                Select a segment on the left to review Source, Adapted, and Compliant text.
              </div>
            )}

            {selected && (
              <div className="tm-detail">
                {/* Source Text */}
                <div className="tm-detail-row">
                  <div className="tm-detail-row-left">
                    <span className="tm-chip soft">Source Text</span>
                  </div>
                  <div className="tm-detail-row-right">
                    <span className="tm-lang-chip">{selected.lang || "EN"}</span>
                  </div>
                </div>
                <div className="tm-box source">{selected.source}</div>

                {/* Culturally Adapted Text (Phase 3) */}
                <div className="tm-detail-head">
                  <span className="tm-chip">Culturally Adapted Text (Phase 3)</span>
                  <div className="rc-tools-inline">
                    <span className="rc-score-badge">
                      Score: {typeof scoreById[selected.id] === "number" ? `${scoreById[selected.id]}/100` : "—"}
                    </span>
                    <button className="tm-btn outline small" onClick={runComplianceCheck}>
                      Run Compliance Check
                    </button>
                  </div>
                </div>
                <div className="tm-box">{selected.adapted?.trim().length ? selected.adapted : <span className="tm-light">— No adapted text —</span>}</div>

                {/* Regulatory Compliant Text */}
                <div className="tm-detail-head">
                  <span className="tm-chip success">Regulatory Compliant Text</span>
                  <div className="rc-tools-inline">
                    <button className="tm-btn link small" onClick={flagForReview}>Flag for Review</button>
                    <button className="tm-btn primary small" onClick={approveCompliant}>Approve</button>
                  </div>
                </div>
                <div className="tm-box translated">
                  {(compliantById[selected.id] || selected.compliant || "").trim().length
                    ? (compliantById[selected.id] || selected.compliant)
                    : <span className="tm-light">— Awaiting compliance approval —</span>}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* Sidebar phases: Regulatory Compliance active */
const SIDEBAR_PHASES = [
  { id: 1, name: "Global Context Capture", sub: "Source content analysis", status: "done", iconClass: "icon-context" },
  { id: 2, name: "Smart TM Translation", sub: "AI-powered translation", status: "done", iconClass: "icon-translation" },
  { id: 3, name: "Cultural Intelligence", sub: "Cultural adaptation", status: "done", iconClass: "icon-culture" },
  { id: 4, name: "Regulatory Compliance", sub: "Compliance validation", status: "active", iconClass: "icon-compliance" },
  { id: 5, name: "Quality Intelligence", sub: "Quality assurance", status: "todo", iconClass: "icon-quality" },
  { id: 6, name: "DAM Integration", sub: "Asset packaging", status: "todo", iconClass: "icon-dam" },
  { id: 7, name: "Integration Lineage", sub: "System integration", status: "todo", iconClass: "icon-integration" },
];
