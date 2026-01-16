import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

/* Sidebar phases (original list retained) */
const SIDEBAR_PHASES = [
  {
    id: 1,
    name: "Global Context Capture",
    sub: "Source content analysis",
    status: "done",
    iconClass: "icon-context",
  },
  {
    id: 2,
    name: "Smart TM Translation",
    sub: "AI-powered translation",
    status: "active",
    iconClass: "icon-translation",
  },
  {
    id: 3,
    name: "Cultural Intelligence",
    sub: "Cultural adaptation",
    status: "todo",
    iconClass: "icon-culture",
  },
  {
    id: 4,
    name: "Regulatory Compliance",
    sub: "Compliance validation",
    status: "todo",
    iconClass: "icon-compliance",
  },
  {
    id: 5,
    name: "Quality Intelligence",
    sub: "Quality assurance",
    status: "todo",
    iconClass: "icon-quality",
  },
  {
    id: 6,
    name: "DAM Integration",
    sub: "Asset packaging",
    status: "todo",
    iconClass: "icon-dam",
  },
  {
    id: 7,
    name: "Integration Lineage",
    sub: "System integration",
    status: "todo",
    iconClass: "icon-integration",
  },
];

/* Env helpers (CRA/runtime; no import.meta) */
const getEnv = () => {
  const pe = typeof process !== "undefined" && process.env ? process.env : {};
  const we = typeof window !== "undefined" && window._env_ ? window._env_ : {};
  return { ...we, ...pe };
};
const ENV = getEnv();

/**
 * Persists the successful AI translation to the PostgreSQL database
 */
const saveTranslationToDb = async (source, target, sLang, tLang) => {
  try {
    const response = await fetch(
      "http://127.0.0.1:5000/api/translated-content",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_text: source,
          target_text: target,
          source_language: sLang || "EN",
          target_language: tLang,
        }),
      }
    );

    if (response.ok) {
      console.log("Translation successfully saved to DB");
    } else {
      console.error("Failed to save to DB:", await response.text());
    }
  } catch (error) {
    console.error("Network error saving translation:", error);
  }
};

/** Use .env or hardcode during test */
// const N8N_WEBHOOK_URL =
//   ENV.REACT_APP_N8N_WEBHOOK_URL ||
//   ENV.VITE_N8N_WEBHOOK_URL ||
//   "";

// For quick test you can uncomment and set directly:
const N8N_WEBHOOK_URL = "http://172.16.4.237:8033/webhook-test/csv_upload";

const N8N_AUTH = ENV.REACT_APP_N8N_TOKEN || ENV.VITE_N8N_TOKEN || "";

/** Extract target language from therapyArea like "Respiratory · DE" */
const getTargetLang = (therapyArea) => {
  const m = String(therapyArea || "").match(/·\s*([A-Za-z-]+)/);
  return m?.[1] || "DE";
};

/** Extract translated text from n8n response:
 * Supports:
 *  - [{ output: "…" }]  <-- your case from screenshot
 *  - { translated: "…" }
 *  - { data: { translated: "…" } }
 *  - plain text "…"
 */
const extractTranslated = async (res) => {
  let body;
  try {
    body = await res.json();
  } catch {
    const text = await res.text();
    return (text || "").trim();
  }

  if (Array.isArray(body) && body.length > 0) {
    const first = body[0];
    if (first && typeof first.output === "string") return first.output.trim();
    for (const k of Object.keys(first || {})) {
      const v = first[k];
      if (typeof v === "string" && /translat|output/i.test(k)) return v.trim();
    }
  }

  if (body && typeof body === "object") {
    if (typeof body.translated === "string") return body.translated.trim();
    if (body.data && typeof body.data.translated === "string")
      return body.data.translated.trim();
    for (const k of Object.keys(body)) {
      const v = body[k];
      if (typeof v === "string" && /translat|output/i.test(k)) return v.trim();
    }
  }

  return "";
};

/**
 * Smart TM Translation Hub
 * - RIGHT PANEL has two separate cards:
 *   1) Action Card (AI Translate + Complete + toggle) — always first
 *   2) Detail Card (Source + Translated) — below; disabled until translation arrives from n8n
 * - Original segments/progress logic preserved (non-mutating UI overlays)
 */
export default function SmartTMTranslationHub({
  projectName: projectNameProp = "No project name to display",
  therapyArea = "Respiratory · DE",
  progressWords: progressWordsProp = { done: 0, total: 333 },
  segments: segmentsProp = "No Segments to display",
}) {
  const { state } = useLocation();
  const navigate = useNavigate();

  /** Tabs */
  const [activeTab, setActiveTab] = useState("workspace");

  /** Prefer project from previous page */
  const projectName = state?.projectName ?? projectNameProp;

  /** 🆕 Language passed from previous page (as you send it via navigate(..., { state: { lang: inboundLang } })) */
  const inboundLang = state?.lang ?? "EN";

  /** Normalize incoming segments (original logic retained) */
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
        const translated = String(seg.translated ?? "");
        const words =
          typeof seg.words === "number"
            ? seg.words
            : source.split(/\s+/).filter(Boolean).length;

        return {
          id: seg.id ?? `seg-${index}`,
          index,
          source,
          translated,
          words,
          status: seg.status ?? (translated.trim() ? "Completed" : "Pending"),
          // 🆕 Default each segment's lang to inboundLang if not present
          lang: seg.lang ?? inboundLang,
        };
      })
      .filter((s) => s.source.trim().length > 0)
      .sort((a, b) => a.index - b.index);
  }, [state?.segments, segmentsProp, inboundLang]);

  /** Selected segment (original logic retained) */
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    if (!selectedId && segments.length) setSelectedId(segments[0].id);
  }, [segments, selectedId]);

  const selected = useMemo(
    () => segments.find((s) => s.id === selectedId) || null,
    [segments, selectedId]
  );

  /** UI overlays — do NOT mutate original segments */
  const [segOverrides, setSegOverrides] = useState({}); // { [id]: { translated?: string, status?: string } }
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const [tmLeverageOn, setTmLeverageOn] = useState(true);

  /** Resolved selected with overrides applied (display only) */
  const selectedResolved = useMemo(() => {
    if (!selected) return null;
    const o = segOverrides[selected.id] || {};
    return { ...selected, ...o };
  }, [selected, segOverrides]);

  /** Helper: has a real translated string (non-empty and not placeholder)? */
  const hasRealTranslation = (s) => {
    const t = (s?.translated || "").trim();
    return t.length > 0 && t !== "— Awaiting translation —";
  };

  /** Detail card enabled iff we have real translation */
  const isDetailEnabled = useMemo(
    () => hasRealTranslation(selectedResolved),
    [selectedResolved]
  );

  /** When switching segments, keep the detail card disabled until that specific segment gets translated */
  useEffect(() => {
    if (!selected) return;
    setSegOverrides((prev) => ({
      ...prev,
      [selected.id]: {
        ...prev[selected.id],
        translated: (prev[selected.id]?.translated || "").trim()
          ? prev[selected.id]?.translated
          : "", // empty => disabled until translation arrives
      },
    }));
  }, [selectedId]);

  /** Progress (original logic retained) */
  const progressWords = useMemo(() => {
    const total = segments.reduce((acc, s) => acc + (s.words || 0), 0);
    const done = segments
      .filter(
        (s) =>
          (s.translated || "").trim().length > 0 || s.status === "Completed"
      )
      .reduce((acc, s) => acc + (s.words || 0), 0);
    return total > 0 ? { done, total } : progressWordsProp;
  }, [segments, progressWordsProp]);

  const progressPct = useMemo(() => {
    const pct = (progressWords.done / Math.max(progressWords.total, 1)) * 100;
    return Math.round(pct);
  }, [progressWords]);

  /** Sidebar navigation (original) */
  const handlePhaseClick = (phaseName) => {
    if (phaseName === "Global Context Capture") {
      navigate("/globalAssetCapture", {
        // 🆕 Also pass lang back if needed (optional)
        state: { projectName, segments, lang: inboundLang },
      });
    }
  };

  /** Merge UI overrides (segOverrides) into base segments before navigation */
  const mergeSegmentsWithOverrides = (segments, overrides) => {
    if (!Array.isArray(segments)) return [];
    return segments.map((s) => {
      const o = overrides?.[s.id] || {};
      return {
        ...s,
        // Only overlay known keys; keep the rest identical to the input segment
        ...(o.translated !== undefined ? { translated: o.translated } : {}),
        ...(o.status !== undefined ? { status: o.status } : {}),
      };
    });
  };

  /** Complete Phase → go to Cultural Adaptation (preserving translated text) */
  const handleCompletePhase = () => {
    // Merge translated/status overlays (from n8n) into base segments
    const mergedSegments = mergeSegmentsWithOverrides(segments, segOverrides);

    navigate("/culturalAdaptationWorkspace", {
      state: {
        projectName,
        segments: mergedSegments, // ✅ entire segments list, with translated content included
        // 🆕 propagate lang
        lang: inboundLang,
      },
    });
  };

  /** Send selected segment to n8n, enable detail card when translation arrives */
  /**
   * PERSISTENCE: Saves the new AI translation to the professional TM table
   */
  const saveToTranslationMemory = async (source, target, sLang, tLang, stateData) => {
    try {
      const payload = {
        brand_id: stateData?.brand_id || "00000000-0000-0000-0000-000000000000",
        source_text: source,
        target_text: target,
        source_language: sLang || "EN",
        target_language: tLang,
        domain_context: stateData?.therapeuticContext || "General",
        match_type: "machine",
        quality_score: 70, 
        confidence_level: 0.85, 
        usage_count: 1,
        last_used: new Date().toISOString(),
        project_id: stateData?.project_id || null,
        market: stateData?.market || "Global"
      };

      const response = await fetch("http://127.0.0.1:5000/api/translation-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log("Memory captured successfully.");
      }
    } catch (error) {
      console.error("Error indexing to TM:", error);
    }
  };

 
/**
   * Integrated AI Translation with Two-Tier Lookup (Glossary + TM) and Indexing
   */
  const handleAiTranslate = async () => {
    if (!selected) return;
    if (!N8N_WEBHOOK_URL) {
      setTranslationError("N8N_WEBHOOK_URL is not configured.");
      return;
    }

      // Check if we already have a 100% match in our local overrides or state
    if (segOverrides[selected.id]?.status === "Completed") {
      setIsTranslating(false);
      return; 
  }

    setIsTranslating(true);
    setTranslationError(null);

    // 1. UI Feedback: Set status to Pending and show placeholder
    setSegOverrides((prev) => ({
      ...prev,
      [selected.id]: {
        ...prev[selected.id],
        translated: "— Awaiting translation —",
        status: "Pending",
      },
    }));

    try {
      const targetLang = getTargetLang(therapyArea);
      const sourceLang = "English";

      // 2. Fragment Lookup: Queries both Glossary (Word-to-Word) and TM (Sentence Context)
      let glossaryHints = {};
      try {
        // We pass target_lang and brand_id to ensure we get contextually correct matches
        const lookupRes = await fetch(
          `http://127.0.0.1:5000/api/translation-memory/match-fragments?text=${encodeURIComponent(
            selected.source
          )}&target_lang=${targetLang}&brand_id=${state?.brand_id || ""}`
        );
        
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          // This matches object now contains either direct glossary terms or TM contextual hints
          glossaryHints = lookupData.matches || {};
        }
      } catch (lookupErr) {
        console.warn("Fragment lookup failed, proceeding with standard AI translation", lookupErr);
      }

      // 3. Prepare Smart Payload for n8n
      const payload = {
        segmentId: selected.id,
        index: selected.index,
        projectName,
        source: selected.source,
        sourceLang,
        targetLang,
        inboundLang,
        // The AI uses these hints to enforce terminology consistency (e.g., "Go" -> "Po")
        glossaryHints, 
        meta: {
          therapyArea,
          words: selected.words,
          tmLeverage: tmLeverageOn,
          brand_id: state?.brand_id,
          project_id: state?.project_id
        },
      };

      // 4. Execute AI Translation via n8n Webhook
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(N8N_AUTH ? { Authorization: N8N_AUTH } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`n8n Error: ${res.status}`);

      const translated = (await extractTranslated(res)).trim();

      // 5. Indexing: Automatically save successful results to the TM table
      // This builds our database for future "100% Matches"
      if (translated && translated !== "— Awaiting translation —") {
        await saveToTranslationMemory(
          selected.source,
          translated,
          sourceLang,
          targetLang,
          state 
        );
      }

      // 6. Final UI Update
      setSegOverrides((prev) => ({
        ...prev,
        [selected.id]: {
          ...prev[selected.id],
          translated: translated || "— Awaiting translation —",
          status: translated ? "Completed" : "Pending",
        },
      }));

    } catch (err) {
      setTranslationError(err.message || "Translation failed.");
      setSegOverrides((prev) => ({
        ...prev,
        [selected.id]: { ...prev[selected.id], status: "Pending" },
      }));
    } finally {
      setIsTranslating(false);
    }
  };
  /** Mark selected segment complete (overlay only) */
  const handleCompleteSegment = () => {
    if (!selected) return;
    setSegOverrides((prev) => ({
      ...prev,
      [selected.id]: {
        ...prev[selected.id],
        status: "Completed",
      },
    }));
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
          <div className="tm-progress-sub">1 of 7 phases completed</div>
          <div className="tm-progress-bar">
            <div
              className="tm-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <nav className="tm-phases">
          {SIDEBAR_PHASES.map((p) => (
            <button
              key={p.id}
              className={`tm-phase-item ${p.status} ${
                p.status === "active" ? "is-active" : ""
              }`}
              aria-label={`Open ${p.name}`}
              onClick={() => handlePhaseClick(p.name)}
            >
              <span className={`tm-phase-icon ${p.iconClass}`} />
              <span className="tm-phase-text">
                <span className="tm-phase-title">{p.name}</span>
                <span className="tm-phase-sub">{p.sub}</span>
              </span>
              {p.status === "done" && <span className="tm-phase-check">✓</span>}
              {p.status === "active" && <span className="tm-phase-dot" />}
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
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#1F7AEC"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Saved
            </span>
            <button className="tm-btn ghost">Save</button>
            <button className="tm-btn ghost">Focus</button>
          </div>
        </header>

        {/* Top tabs bar */}
        <section className="tm-tabs-bar">
          <div className="tm-tabs">
            <button
              className={`tm-tab ${
                activeTab === "workspace" ? "is-active" : ""
              }`}
              onClick={() => setActiveTab("workspace")}
            >
              Translation Workspace
            </button>
            <button
              className={`tm-tab ${activeTab === "draft" ? "is-active" : ""}`}
              onClick={() => setActiveTab("draft")}
            >
              Draft Translation
            </button>
            <button
              className={`tm-tab ${activeTab === "tm" ? "is-active" : ""}`}
              onClick={() => setActiveTab("tm")}
            >
              TM Leverage Overview
            </button>
          </div>

          <div className="tm-tabs-right">
            <div className="tm-progress-inline">
              <span className="tm-progress-inline-label">Progress:</span>
              <span className="tm-progress-inline-value">
                {progressWords.done} / {progressWords.total} words
              </span>
              <div className="tm-progress-inline-bar">
                <div
                  className="tm-progress-inline-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <div className="tm-tabs-actions">
              <button className="tm-btn outline">Translate All</button>
              <button className="tm-btn primary" onClick={handleCompletePhase}>
                Complete Phase
              </button>
            </div>
          </div>
        </section>

        {/* Two-card workspace */}
        <section className="tm-workspace">
          {/* Left card: Segments list (unchanged) */}
          <div className="tm-card tm-left">
            <div className="tm-card-header">
              <h3 className="tm-card-title">Segments</h3>
              <span className="tm-light">{segments.length} items</span>
            </div>

            <div className="tm-seg-list">
              {segments.map((seg) => {
                const isSelected = seg.id === selectedId;
                const statusClass =
                  seg.status === "Pending"
                    ? "pending"
                    : seg.status === "Completed"
                    ? "completed"
                    : "neutral";

                return (
                  <button
                    key={seg.id}
                    className={`tm-seg-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedId(seg.id)}
                    aria-label={`Open Segment ${seg.index}`}
                  >
                    <div className="tm-seg-item-top">
                      <span className={`tm-seg-pill ${statusClass}`}>
                        Segment {seg.index}
                      </span>
                      <span className="tm-seg-state">{seg.status}</span>
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

          {/* ===== Right column: TWO SEPARATE CARDS ===== */}
          <div className="tm-right-column">
            {/* 1) ACTION CARD — always first */}
            <div className="tm-card tm-action-card">
              <div className="tm-card-header">
                <div className="tm-action-title">
                  <h3 className="tm-card-title">TM Leverage</h3>
                  <div className="tm-card-subset">
                    <span className="tm-light">
                      AI will use Translation Memory for consistency and cost
                      savings
                    </span>
                  </div>
                </div>
                <label className="tm-switch" aria-label="Toggle TM Leverage">
                  <input
                    type="checkbox"
                    checked={tmLeverageOn}
                    onChange={(e) => setTmLeverageOn(e.target.checked)}
                  />
                  <span className="tm-slider" />
                </label>
              </div>

              <div className="tm-action-buttons">
                <button
                  className={`tm-btn primary small ${
                    isTranslating ? "is-loading" : ""
                  }`}
                  onClick={handleAiTranslate}
                  disabled={!selected || isTranslating}
                >
                  {isTranslating ? "Translating…" : "AI Translate"}
                </button>

                <button
                  className="tm-btn outline small"
                  onClick={handleCompleteSegment}
                  disabled={!selected}
                >
                  Complete
                </button>
              </div>

              {/* Inline feedback */}
              {translationError && (
                <div className="tm-inline-error" role="alert">
                  {translationError}
                </div>
              )}
              {!isDetailEnabled && selected && (
                <div className="tm-inline-hint">
                  After translation, the detail card with Source/Translated will
                  enable below.
                </div>
              )}
            </div>

            {/* 2) DETAIL CARD — below; disabled until translation exists */}
            <div
              className={`tm-card tm-detail-card ${
                isDetailEnabled ? "" : "is-disabled"
              }`}
              aria-disabled={!isDetailEnabled}
            >
              {!isDetailEnabled && (
                <div className="tm-detail-overlay">
                  <div className="tm-overlay-content">
                    <div className="tm-overlay-title">
                      Waiting for translation…
                    </div>
                    <div className="tm-overlay-sub">
                      Click <strong>AI Translate</strong> above to fetch
                      translation from n8n.
                    </div>
                  </div>
                </div>
              )}

              <div className="tm-card-header">
                <h3 className="tm-card-title">Section 1</h3>
                <div className="tm-card-subset">
                  <span className="tm-light">body</span>
                </div>
              </div>

              {!selected && (
                <div className="tm-empty large">
                  Select a segment from the left to view Source &amp; Translated
                  text.
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
                      {/* 🆕 Show inboundLang when segment has no lang */}
                      <span className="tm-lang-chip">
                        {selectedResolved?.lang || inboundLang || "EN"}
                      </span>
                    </div>
                  </div>
                  <div className="tm-box source">
                    {selectedResolved?.source || ""}
                  </div>

                  {/* Actions under source */}
                  <div className="tm-detail-actions">
                    <button
                      className="tm-btn outline small"
                      disabled={!isDetailEnabled}
                    >
                      Edit Translation
                    </button>
                  </div>

                  {/* Translated Text (shows n8n output) */}
                  <div className="tm-chip success">Translated Text</div>
                  <div className="tm-box translated">
                    {isDetailEnabled ? (
                      selectedResolved?.translated || ""
                    ) : (
                      <span className="tm-light">— Awaiting translation —</span>
                    )}
                  </div>

                  {/* Right tools beneath translated */}
                  <div className="tm-detail-tools">
                    <span className="tm-light">
                      {selectedResolved?.status === "Completed"
                        ? "TM 100%"
                        : "TM 0%"}
                    </span>
                    <div className="tm-detail-spacer" />
                    <button
                      className="tm-btn link small"
                      disabled={!isDetailEnabled}
                    >
                      Locked
                    </button>
                    <button
                      className="tm-btn link small"
                      disabled={!isDetailEnabled}
                    >
                      View TM Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
