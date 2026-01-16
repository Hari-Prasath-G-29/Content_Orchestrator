
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../App.css";
import { getveevaData } from "./api/dataService";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Clock,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Edit2,
  Upload,
  FileText,
  Target,MessageSquare, Zap
} from 'lucide-react';
import { Button } from "@mui/material";
//import "./css/Importcontent.css";

const VEEVA_TAB = "Veeva Content";
const workspaces = [VEEVA_TAB, "Content Studio", "Pre-MLR", "Design Studio"];

/** Static demo data for the other tabs */
const data = [
  {
    id: "1",
    title: "IPF Localization Demo Project",
    typeRight: "content_project",
    subtitle: "IPF Localization Demo Project",
    tags: ["content_studio"],
    statusChip: "active",
    workspace: "Content Studio",
  },
  {
    id: "2",
    title: "HCP Clinical Insights Email Campaign",
    typeRight: "content_project",
    subtitle: "HCP Clinical Insights Email Campaign",
    tags: ["content_studio"],
    statusChip: "active",
    workspace: "Pre-MLR",
  },
  {
    id: "3",
    title: "ABC 010101 - mass-email",
    typeRight: "mass-email",
    subtitle: "No project",
    extraRows: [{ label: "Indication", value: "SSC-ILD" }],
    tags: ["content_studio"],
    statusChip: "approved",
    workspace: "Design Studio",
  },
];

export default function ImportContentPage() {
  const navigate = useNavigate();

  // Optional: capture rendered page content via ref
  const pageRef = useRef(null);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [activeTab, setActiveTab] = useState("Content Studio");

  // Veeva API states
  const [veevaData, setVeevaData] = useState([]);
  const [veevaLoading, setVeevaLoading] = useState(false);
  const [veevaError, setVeevaError] = useState("");
  const [veevaFetchedOnce, setVeevaFetchedOnce] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [contextExpanded, setContextExpanded] = useState(false);

  /** Lazy fetch when the user switches to the Veeva tab */
  useEffect(() => {
    if (activeTab !== VEEVA_TAB || veevaFetchedOnce) return;

    let unmounted = false;
    setVeevaLoading(true);
    setVeevaError("");

    getveevaData()
      .then((res) => {
        if (unmounted) return;
        const json = res?.data;

        const itemsArray =
          Array.isArray(json?.items) ? json.items :
          Array.isArray(json)        ? json :
          (json && typeof json === "object") ? [json] : [];

        const mapped = itemsArray.map(mapVeevaItem);
        console.log(mapped);
        setVeevaData(mapped);
        setVeevaFetchedOnce(true);
      })
      .catch((err) => {
        if (unmounted) return;
        setVeevaError(err?.message || "Failed to load Veeva content.");
      })
      .finally(() => {
        if (!unmounted) setVeevaLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, [activeTab, veevaFetchedOnce]);

  /** Counts per tab */
  const counts = useMemo(() => {
    const obj = {};
    for (const w of workspaces) {
      obj[w] = w === VEEVA_TAB ? veevaData.length : data.filter((d) => d.workspace === w).length;
    }
    return obj;
  }, [veevaData]);

  /** Dataset for current tab */
  const currentDataset = useMemo(() => {
    return activeTab === VEEVA_TAB ? veevaData : data.filter((d) => d.workspace === activeTab);
  }, [activeTab, veevaData]);

  /** Filters */
  const filtered = useMemo(() => {
    return currentDataset
      .filter((d) =>
        !query
          ? true
          : (
              (d.title || "") +
              " " +
              (d.subtitle || "") +
              " " +
              (d.typeRight || "") +
              " " +
              (Array.isArray(d.tags) ? d.tags.join(" ") : "") +
              " " +
              (d.documentContent || "")
            )
              .toLowerCase()
              .includes(query.toLowerCase())
      )
      .filter((d) => (typeFilter === "All Types" ? true : d.typeRight === typeFilter))
      .filter((d) =>
        statusFilter === "All Statuses"
          ? true
          : normalizeStatusText(d.statusChip) === normalizeStatusText(statusFilter)
      );
  }, [currentDataset, query, typeFilter, statusFilter]);

  /** Filter options from both static + veeva data */
  const allTypes = useMemo(() => {
    const set = new Set([...data, ...veevaData].map((d) => d.typeRight).filter(Boolean));
    return ["All Types", ...Array.from(set)];
  }, [veevaData]);

  const allStatuses = useMemo(() => {
    const set = new Set([...data, ...veevaData].map((d) => normalizeStatusText(d.statusChip)).filter(Boolean));
    return ["All Statuses", ...Array.from(set)];
  }, [veevaData]);

  /** Modal open/close */
  const openModal = (card) => {
    setSelectedCard(card);
    setContextExpanded(false);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  /** Close on ESC key */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    if (isModalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen]);

  /**
   * Select & Continue → navigate to next page with ONLY projectName + content
   */
  const handleSelectAsset = () => {
    if (!selectedCard) return;

    // Project name: prefer title else subtitle
    const projectName =
      selectedCard.title ?? selectedCard.subtitle ?? "(Untitled Project)";

    // Content: for Veeva, from documentContent; for static, try extraRows "Content"
    const content =
      selectedCard.documentContent ??
      (Array.isArray(selectedCard.extraRows)
        ? (selectedCard.extraRows.find(
            (r) => String(r.label || "").toLowerCase() === "content"
          )?.value || "")
        : "") ??
      "";
    const assettype =  selectedCard.typeRight;
    navigate("/adapt/confirm", {
      state: { projectName, content, assettype },
    });
  };

  return (
    <div className="page" ref={pageRef}>
      {/* Top bar */}
      <div className="topbar">
        {/* <button className="back-btn" aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button> */}
        <Button variant="ghost" size="icon" onClick={() => navigate('/glocalizationHub')}>
            <ArrowLeft size={20} className="h-5 w-5" />
          </Button>
        <div className="title-wrap">
          <h1 className="page-title">
          <Upload className="h-8 w-8" />
            Import Content for Adaptation</h1>
          <p className="subtitle">Select an approved asset from your content modules</p>
        </div>
      </div>

      {/* Discover Assets panel */}
      <section className="panel">
        <h2 className="panel-title">Discover Assets</h2>
        <p className="panel-desc">
          Find and select approved assets from Content Studio, Pre‑MLR, Design Studio, or Veeva Content
        </p>

        <div className="search-row">
          <div className="search-input">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#8A8F98" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="#8A8F98" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search assets by name, type, or content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          
          {/* <button className="ghost-btn" title="Filter">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button> */}
          <select
            className="select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Type filter"
          >
            
            {allTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Status filter"
          >
            {allStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Tabs on pill bar */}
      <div className="tabs-bar">
        <div className="tabs">
          {workspaces.map((w) => (
            <button
              key={w}
              className={`tab ${activeTab === w ? "is-active" : ""}`}
              onClick={() => setActiveTab(w)}
            >
              <span className="tab-label">{w}</span>
              <span className="tab-count">({counts[w] || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid">
        {activeTab === VEEVA_TAB && veevaLoading && (
          <div className="loading" role="status">
            <div className="spinner" />
            <span>Loading Veeva content…</span>
          </div>
        )}

        {activeTab === VEEVA_TAB && !!veevaError && (
          <div className="error">
            <strong>Couldn’t load Veeva content.</strong>
            <div className="error-sub">{veevaError}</div>
          </div>
        )}

        {filtered.map((card) => (
          <button
            key={card.id}
            className="card-btn"
            onClick={() => openModal(card)}
            aria-label={`Open details for ${card.title}`}
          >
            <article className="card">
              <div className="card-header">
                <h3 className="card-title">{card.title}</h3>
                {card.typeRight && <span className="right-type">{card.typeRight}</span>}
              </div>

              {card.subtitle && <p className="card-subtitle">{card.subtitle}</p>}

              {Array.isArray(card.extraRows) && card.extraRows.length > 0 && (
                <div className="extra">
                  {card.extraRows.map((r, idx) => (
                    <div key={idx} className="extra-row">
                      <span className="extra-label">{r.label}</span>
                      <span className="extra-value">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="card-footer">
                <div className="chips-left">
                  {card.tags?.map((tag) => (
                    <span key={tag} className="chip muted">
                      {tag}
                    </span>
                  ))}
                </div>
                {card.statusChip && (
                  <span className={`chip ${chipClass(card.statusChip)}`}>{card.statusChip}</span>
                )}
              </div>
            </article>
          </button>
        ))}

        {!veevaLoading && filtered.length === 0 && (
          <div className="empty">
            <p>No Content is Found.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedCard && (
        <div className="modal-backdrop" onClick={closeModal} aria-hidden="true">
          <div
            className="modal modal-medium"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div>
                <div className="modal-title-row">
                <FileText className="h-5 w-5" />
                  <h2 id="modal-title" className="modal-title">
                    {selectedCard.title}
                  </h2>
                </div>
                <p className="modal-subtitle">
                  Review asset details and strategic context before importing
                </p>
              </div>
              <button className="modal-close" onClick={closeModal} aria-label="Close">✕</button>
            </div>

            {/* Body — RE-STYLED to match first screenshot */}
            <div className="modal-body">
              {/* Asset Information (soft card) */}
              <div className="section-card soft">
                <h3 className="section-title">Asset Information</h3>

                <div className="info-grid two-col">
                  <div className="info-item">
                    <div className="info-label">Asset Type</div>
                    <span className="chip chip-soft">{selectedCard.typeRight || "—"}</span>
                  </div>

                  <div className="info-item">
                    <div className="info-label">Status</div>
                    <span className={`chip ${chipClassFriendly(selectedCard.statusChip)}`}>
                      {friendlyStatusText(selectedCard.statusChip)}
                    </span>
                  </div>

                  <div className="info-item">
                    <div className="info-label">Source Module</div>
                    <span className="chip chip-soft">{selectedCard.tags?.[0] || "veeva"}</span>
                  </div>

                  {/* <div className="info-item">
                    <div className="info-label">Content Type</div>
                    <div className="info-value">{selectedCard.documentContent ? "text" : "none"}</div>
                  </div> */}
                  {/* {strategicContext.projectName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Original Project</p>
                    <p className="text-sm font-medium">{strategicContext.projectName}</p>
                  </div>
                )} */}
                </div>
              </div>

              {/* Strategic Context (collapsible) */}
              <div className="section-card">
                <button
                  className="accordion-btn"
                  onClick={() => setContextExpanded((v) => !v)}
                  aria-expanded={contextExpanded}
                >
                  <Target  size={14} className="h-4 w-4" />
                  <span className="accordion-title">Strategic Context</span>
                  <svg
                    className={`chev ${contextExpanded ? "open" : ""}`}
                    width="18" height="18" viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                 
                </button>

                {contextExpanded && (
                  <div className="context-content">
                    <div className="content-box">
                      <pre className="content-pre">
                        { "No strategic context/content available."}
                        {/* {strategicContext.indication && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Indication</p>
                    <p className="text-sm">{strategicContext.indication}</p>
                  </div>
                )}
                
                {strategicContext.keyMessage && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Key Message</p>
                    <p className="text-sm">{strategicContext.keyMessage}</p>
                  </div>
                )}
                
                {strategicContext.callToAction && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Call to Action</p>
                    <p className="text-sm">{strategicContext.callToAction}</p>
                  </div>
                )}
                
                {strategicContext.targetAudience && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Target Audience</p>
                    <p className="text-sm">{strategicContext.targetAudience}</p>
                  </div>
                )} */}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Context */}
              <div className="section-card soft">
                <div className="section-header">
                <Zap  size={14} className="h-4 w-4" />
                  <h3 className="section-title">Theme Context</h3>
                </div>

                <div className="info-grid vertical">
                  <div className="info-item">
                    <div className="info-label">Theme Name</div>
                    <div className="info-value">{deriveThemeName(selectedCard)}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Description</div>
                    <div className="info-value1">{selectedCard.subtitle || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Content Preview */}
              <div className="section-card soft">
                <div className="section-header">
                <MessageSquare size={14} className="h-4 w-4" />
                  <h3 className="section-title">Content Preview</h3>
                </div>
                <div className="content-preview">
                  <pre className="content-pre muted">
{/* {trimForPreview(selectedCard.documentContent)} */}
{selectedCard.documentContent}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer spaced">
              <button className="btn ghost" onClick={closeModal}>Cancel</button>
              <button className="btn primary" onClick={handleSelectAsset}>
                Select Asset &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Map API output → card model (includes text_content in card) */
function mapVeevaItem(item) {
  const id        = item.document_id ?? item.documentId ?? cryptoRandom();
  const title     = item.file_name ?? item.name ?? "(Untitled)";
  const type      = item.asset_type ?? item.contentType ?? "veeva_item";
  const statusRaw = item.status ?? item.status_v ?? ""; // e.g., "SUCCESS: Extracted from Viewable Rendition (PDF)"
  const source    = "veeva";
  const text      = item.document_content || "No content available.";
  const description = item.description || "no description present";

  return {
    id,
    title,
    typeRight: type,
    subtitle: description,     // project name (shown in Theme Context)
    tags: [source],
    statusChip: statusRaw,     // raw text; we show a friendly chip in modal
    statusRaw,
    workspace: VEEVA_TAB,
    documentContent: text,     // content
    description,
    // extraRows: [
    //   { label: "Content Type", value: text ? "text" : "none" },
    //   text ? { label: "Content", value: truncate(text, 140) } : null,
    // ].filter(Boolean),
  };
}

/** Tone chip based on raw status (for cards list) */
function chipClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("success")) return "success";   // green
  if (s.includes("approved")) return "primary";  // blue (if applicable)
  if (s.includes("error") || s.includes("fail")) return "muted";
  if (s.includes("pending") || s.includes("review")) return "muted";
  return "muted"; // default gray
}

/** FRIENDLY status text + chip class (for modal) */
function friendlyStatusText(status = "") {
  const s = String(status).toLowerCase();
  if (s.includes("approved")) return "approved";
  if (s.includes("success")) return "success";
  if (s.includes("error") || s.includes("fail")) return "error";
  if (s.includes("pending") || s.includes("review")) return "pending";
  return status || "unknown";
}
function chipClassFriendly(status = "") {
  const t = friendlyStatusText(status);
  switch (t) {
    case "approved": return "chip-approved";
    case "success":  return "chip-success";
    case "pending":  return "chip-pending";
    case "error":    return "chip-error";
    default:         return "chip-muted";
  }
}

/** Normalize status text for filtering equality */
function normalizeStatusText(s) {
  return String(s || "").trim().toLowerCase();
}

/** Truncate helper for content preview (plain JS, safe) */
function truncate(text, max = 140) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  return s.length <= max ? s : s.slice(0, max) + "…";
}

/** Format header like "<title> - email" (if typeRight exists) */
function formatHeaderTitle(card) {
  const title = card?.title || "(Untitled)";
  const type = (card?.typeRight || "").toLowerCase();
  return type ? `${title} - ${type}` : title;
}

/** Try deriving a theme name from title (remove trailing type suffix) */
function deriveThemeName(card) {
  if (card?.themeName) return card.themeName;
  const title = card?.title || "";
  return title.replace(/\s*-\s*\w+$/i, "") || "—";
}

/** Trim preview to match screenshot style */
function trimForPreview(content, max = 600) {
  const s = String(content || "").replace(/\s+/g, " ").trim();
  return s.length <= max ? s : s.slice(0, max) + "…";
}

//** Fallback id if API lacks a stable ID */
function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

