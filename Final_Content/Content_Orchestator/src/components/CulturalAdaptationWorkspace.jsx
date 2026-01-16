// import React, { useMemo, useState, useEffect } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import "../App.css";

// /**
//  * Cultural Intelligence Hub (Destination page)
//  * - Tabs (Cultural Adaptation | Culturally-Adapted Draft | Intelligence Report)
//  * - Left segments card + Right detail card (Translation | Culturally Adapted)
//  * - Original Translation content also appears inside the AI Analysis modal:
//  * - Under a \"Translation\" section above \"Problem\" in each issue card
//  *
//  * ✅ Updates in this version:
//  * - \"Culturally Adapted Text\" starts blank for all segments.
//  * - It only populates when \"Accept Suggestion\" is clicked in the AI modal.
//  * - We no longer auto-populate adapted text in the right card during Analyze.
//  */
// export default function CulturalAdaptationWorkspace({
//   projectName: projectNameProp = "No project name to display",
//   therapyArea = "Respiratory · DE",
//   progressItems: progressItemsProp = { reviewed: 0, total: 75 }, // example
//   segments: segmentsProp = [],
// }) {
//   const { state } = useLocation();
//   const navigate = useNavigate();

//   /** Tabs */
//   const [activeTab, setActiveTab] = useState("adaptation"); // "adaptation" | "draft" | "report"

//   /** Prefer project from previous page */
//   const projectName = state?.projectName ?? projectNameProp;

//   /**
//    * ========= ENV HELPERS =========
//    * CRA/runtime-safe env access (node process.env or window._env_)
//    */
//   const getEnv = () => {
//     const pe = typeof process !== "undefined" && process.env ? process.env : {};
//     const we = typeof window !== "undefined" && window._env_ ? window._env_ : {};
//     return { ...we, ...pe };
//   };
//   const ENV = getEnv();

//   const N8N_CULTURAL_WEBHOOK_URL =
//     ENV.REACT_APP_N8N_CULTURAL_WEBHOOK_URL ||
//     ENV.VITE_N8N_CULTURAL_WEBHOOK_URL ||
//     "http://172.16.4.237:8010/webhook-test/cultural";

//   const N8N_AUTH = ENV.REACT_APP_N8N_TOKEN || ENV.VITE_N8N_TOKEN || "";

//   const getTargetLang = (therapyAreaStr) => {
//     const m = String(therapyAreaStr || "").match(/·\s*([A-Za-z-]+)/);
//     return m?.[1] || "DE";
//   };

//   const tryParseJSON = (str) => {
//     try {
//       return JSON.parse(str);
//     } catch (e) {
//       return null;
//     }
//   };

//   /**
//    * extractTPSFromBody
//    * Look for a JSON object with {translation, problem, suggestion}
//    * inside the response body (from 'output' or 'cultural_output' field).
//    */
//   const extractTPSFromBody = (body) => {
//     if (!body) return null;
//     const data = Array.isArray(body) ? body[0] : body;
//     const out = data?.output ?? data?.cultural_output ?? data;

//     if (typeof out === "string") {
//       const parsed = tryParseJSON(out);
//       if (parsed && (parsed.translation || parsed.problem || parsed.suggestion)) {
//         return {
//           translation: String(parsed.translation || "").trim(),
//           problem: String(parsed.problem || "").trim(),
//           suggestion: String(parsed.suggestion || "").trim(),
//         };
//       }
//       return {
//         translation: "",
//         problem: "",
//         suggestion: String(out).trim(),
//       };
//     }

//     if (out && typeof out === "object") {
//       return {
//         translation: String(out.translation || "").trim(),
//         problem: String(out.problem || "").trim(),
//         suggestion: String(out.suggestion || "").trim(),
//       };
//     }
//     return null;
//   };

//   const extractTPSFromResponse = async (res) => {
//     let body;
//     try {
//       body = await res.json();
//     } catch (e) {
//       const text = await res.text();
//       body = tryParseJSON(text) ?? text;
//     }
//     const extracted = extractTPSFromBody(body);
//     return extracted || { translation: "", problem: "", suggestion: "" };
//   };

//   /**
//    * ========= DATA MERGING & NORMALIZATION =========
//    */
//   const segments = useMemo(() => {
//     const raw = Array.isArray(state?.segments)
//       ? state.segments
//       : Array.isArray(segmentsProp)
//       ? segmentsProp
//       : [];

//     const targetFromTherapy = getTargetLang(therapyArea);

//     return (raw || [])
//       .map((seg, i) => {
//         const index = typeof seg.index === "number" ? seg.index : i + 1;
//         const source = String(seg.source ?? "");
//         return {
//           id: seg.id ?? `seg-${index}`,
//           index,
//           title: seg.title || seg.assetTitle || source.split(/\r?\n/)[0] || `Section ${index}`,
//           source,
//           translated: String(seg.translated ?? ""),
//           adapted: seg.adapted || "",
//           words: typeof seg.words === "number" ? seg.words : source.split(/\s+/).filter(Boolean).length,
//           status: seg.status || "Pending",
//           lang: seg.lang ?? targetFromTherapy ?? "EN",
//         };
//       })
//       .filter((s) => s.source.trim().length > 0)
//       .sort((a, b) => a.index - b.index);
//   }, [state?.segments, segmentsProp, therapyArea]);

//   const [selectedId, setSelectedId] = useState(null);
//   useEffect(() => {
//     if (!selectedId && segments.length > 0) {
//       setSelectedId(segments[0].id);
//     }
//   }, [segments, selectedId]);

//   const [segOverrides, setSegOverrides] = useState({});

//   /** AI Analysis Modal & Results State */
//   const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [analysisError, setAnalysisError] = useState(null);
//   const [analysisBySegment, setAnalysisBySegment] = useState({});

//   const selectedResolved = useMemo(() => {
//     const base = segments.find((s) => s.id === selectedId);
//     if (!base) return null;
//     const overrides = segOverrides[selectedId] || {};
//     return { ...base, ...overrides };
//   }, [segments, selectedId, segOverrides]);

//   const progressItems = useMemo(() => {
//     const total = segments.length || 0;
//     const reviewed = segments.filter((s) => {
//       const currentStatus = String(
//         segOverrides[s.id]?.status ?? s.status ?? "Pending"
//       ).toLowerCase();
//       return currentStatus === "reviewed" || currentStatus === "completed";
//     }).length;
//     return { reviewed, total };
//   }, [segments, segOverrides]);

//   const progressPct = Math.round(
//     (progressItems.reviewed / Math.max(progressItems.total, 1)) * 100
//   );

//   const statusPill = (status) => {
//     const s = String(status || "Pending").toLowerCase();
//     if (s === "reviewed" || s === "completed") return "completed";
//     return "pending";
//   };

//   const HourglassIcon = ({ className }) => (
//     <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M12 2v10l4 2" />
//       <path d="M12 22V12m0 0L8 14" />
//       <circle cx="12" cy="12" r="10" />
//     </svg>
//   );

//   /**
//    * ========= ACTIONS =========
//    */
//   const handlePhaseClick = (phaseName) => {
//     if (phaseName === "Smart TM Translation") {
//       navigate("/smartTMTranslationHub", { state: { projectName, segments } });
//     } else if (phaseName === "Global Context Capture") {
//       navigate("/globalAssetCapture", { state: { projectName, segments } });
//     }
//   };

//   const handleMarkReviewed = () => {
//     if (!selectedResolved) return;
//     setSegOverrides((prev) => ({
//       ...prev,
//       [selectedResolved.id]: {
//         ...prev[selectedResolved.id],
//         status: "Reviewed",
//       },
//     }));
//   };

//   const handleAnalyzeClick = async () => {
//     if (!selectedResolved || isAnalyzing) return;

//     setIsAnalyzing(true);
//     setAnalysisError(null);
//     setIsAnalysisOpen(true);

//     try {
//       const res = await fetch(N8N_CULTURAL_WEBHOOK_URL, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           ...(N8N_AUTH ? { Authorization: N8N_AUTH } : {}),
//         },
//         body: JSON.stringify({
//           segmentId: selectedResolved.id,
//           source: selectedResolved.source,
//           translated: selectedResolved.translated,
//           targetLang: selectedResolved.lang,
//         }),
//       });

//       if (!res.ok) {
//         throw new Error(`N8N Webhook responded with status: ${res.status}`);
//       }

//       const tps = await extractTPSFromResponse(res);

//       const mockAnalysis = {
//         overallScore: 75,
//         needsStatus: "Needs Improvement",
//         sections: [
//           {
//             id: "tone",
//             title: "Cultural Tone & Messaging",
//             score: 70,
//             strengths: [
//               "Appropriate medical terminology used",
//               "Maintains professional register suitable for DE market",
//             ],
//             issues: [
//               {
//                 priority: "Medium",
//                 translation: tps.translation || selectedResolved.translated,
//                 problem: tps.problem || "Tone is slightly too formal for the target patient demographic in the DACH region.",
//                 suggestion: tps.suggestion || "Adjust phrasing to be more empathetic while maintaining clinical accuracy.",
//               },
//             ],
//           },
//         ],
//         terminology: {
//           found: [
//             { original: "Pulmonary", target: "Lungen-" },
//             { original: "Adherence", target: "Therapietreue" }
//           ],
//           missing: [
//             { term: "Inhaler device", status: "HIGH PRIORITY", issue: "Literal translation used instead of local clinical term 'Inhalationsgerät'." }
//           ]
//         },
//         visual: [
//           { label: "Medical Imagery Relevance", status: "pass", text: "Imagery aligns with local clinical settings." },
//           { label: "Color Palette Sensitivity", status: "review", text: "Certain red tones may imply 'danger' in specific sub-regions; suggest using soft blues." }
//         ]
//       };

//       setAnalysisBySegment((prev) => ({
//         ...prev,
//         [selectedResolved.id]: mockAnalysis,
//       }));
//     } catch (err) {
//       setAnalysisError(err.message || "An error occurred during AI analysis.");
//     } finally {
//       setIsAnalyzing(false);
//     }
//   };

//   const handleAcceptSuggestion = (suggestionText) => {
//     if (!selectedResolved) return;
//     setSegOverrides((prev) => ({
//       ...prev,
//       [selectedResolved.id]: {
//         ...prev[selectedResolved.id],
//         adapted: suggestionText,
//         status: "Pending",
//       },
//     }));
//     setIsAnalysisOpen(false);
//   };

//   return (
//     <div className="tm-app">
//       {/* Sidebar */}
//       <aside className="tm-sidebar">
//         <div className="tm-sidebar-progress">
//           <div className="tm-progress-row">
//             <span className="tm-progress-label">Overall Progress</span>
//             <span className="tm-progress-value">{progressPct}%</span>
//           </div>
//           <div className="tm-progress-bar">
//             <div className="tm-progress-fill" style={{ width: `${progressPct}%` }} />
//           </div>
//         </div>

//         <nav className="tm-phases">
//           {SIDEBAR_PHASES.map((p) => {
//             const isActive = p.name === "Cultural Intelligence";
//             return (
//               <button
//                 key={p.id}
//                 className={`tm-phase-item ${p.status} ${isActive ? "is-active" : ""}`}
//                 onClick={() => handlePhaseClick(p.name)}
//               >
//                 <span className={`tm-phase-icon ${p.iconClass}`} />
//                 <span className="tm-phase-text">
//                   <span className="tm-phase-title">{p.name}</span>
//                   <span className="tm-phase-sub">{p.sub}</span>
//                 </span>
//                 {p.status === "done" && <span className="tm-phase-check">✓</span>}
//                 {isActive && <span className="tm-phase-dot" />}
//               </button>
//             );
//           })}
//         </nav>
//       </aside>

//       {/* Main Content Area */}
//       <div className="tm-main">
//         {/* Top Header / Tabs Bar */}
//         <section className="tm-tabs-bar">
//           <div className="tm-tabs">
//             <button className={`tm-tab ${activeTab === "adaptation" ? "is-active" : ""}`} onClick={() => setActiveTab("adaptation")}>
//               Cultural Adaptation
//             </button>
//             <button className={`tm-tab ${activeTab === "draft" ? "is-active" : ""}`} onClick={() => setActiveTab("draft")}>
//               Culturally-Adapted Draft
//             </button>
//             <button className={`tm-tab ${activeTab === "report" ? "is-active" : ""}`} onClick={() => setActiveTab("report")}>
//               Intelligence Report
//             </button>
//           </div>

//           <div className="tm-tabs-right">
//             <div className="tm-saved-banner">
//               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12B981" strokeWidth="2">
//                 <path d="M5 13l4 4L19 7" />
//               </svg>
//               <span>All changes saved</span>
//             </div>
//             <div className="tm-tabs-actions">
//               <button className="tm-btn outline">📄 Generate Agency Handoff PDF</button>
//               <button className="tm-btn primary">Complete Phase 3</button>
//             </div>
//           </div>
//         </section>

//         {/* Workspace Info Header */}
//         <section className="tm-header-secondary">
//           <div className="tm-header-left">
//             <h2 className="tm-page-subtitle">Cultural Adaptation Workspace</h2>
//             <span className="tm-light">Review translations and adapt content for cultural relevance</span>
//           </div>
//           <div className="tm-header-right-inline">
//             <div className="tm-progress-inline">
//               <span className="tm-progress-inline-label">Progress:</span>
//               <span className="tm-progress-inline-value">{progressItems.reviewed} / {progressItems.total} reviewed</span>
//               <div className="tm-progress-inline-bar">
//                 <div className="tm-progress-inline-fill" style={{ width: `${progressPct}%` }} />
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Content Workspace Split */}
//         <section className="tm-workspace ci-workspace">
//           {/* Left Column: Segments List & Detailed Analysis Cards */}
//           <div className="tm-card tm-left">
//             <div className="tm-card-header">
//               <h3 className="tm-card-title">Content Segments</h3>
//               <span className="tm-light">{segments.length} segments to review</span>
//             </div>

//             <div className="tm-seg-list">
//               {segments.map((seg) => {
//                 const isSelected = seg.id === selectedId;
//                 const status = segOverrides[seg.id]?.status || seg.status;
//                 return (
//                   <button
//                     key={seg.id}
//                     className={`tm-seg-item ${isSelected ? "is-selected" : ""}`}
//                     onClick={() => setSelectedId(seg.id)}
//                   >
//                     <div className="tm-seg-item-top">
//                       <span className="tm-ci-index">[{seg.index}]</span>
//                       <span className={`tm-seg-pill ${statusPill(status)}`}>
//                         <HourglassIcon className="tm-pill-icon" /> {status}
//                       </span>
//                     </div>
//                     <div className="tm-seg-title">{seg.title}</div>
//                     <div className="tm-seg-meta-row">
//                       <span className="tm-seg-meta">{seg.words} words</span>
//                     </div>
//                   </button>
//                 );
//               })}
//             </div>

//             {/* AI Cultural Analysis Segment Card */}
//             <div className="tm-ai-analysis-card">
//               <div className="tm-card-header">
//                 <h3 className="tm-card-title">🧠 AI Cultural Analysis - Segment {selectedResolved?.index}</h3>
//               </div>
//               {selectedResolved && analysisBySegment[selectedResolved.id] ? (
//                 <div className="ai-analysis-summary">
//                   <div className="ai-summary-row">
//                     <div className="ai-score-group">
//                       <div className="ai-label">Overall Score</div>
//                       <div className="ai-score-value">
//                         <span className="ai-score-big">{analysisBySegment[selectedResolved.id].overallScore}</span>
//                         <span className="ai-score-total">/100</span>
//                       </div>
//                     </div>
//                     <div className="ai-status-pill needs-improvement">
//                       {analysisBySegment[selectedResolved.id].needsStatus}
//                     </div>
//                   </div>

//                   <div className="ai-analysis-details">
//                     <div className="ai-detail-item">
//                       <div className="ai-detail-header">
//                         <span className="ai-icon">💬</span>
//                         <span className="ai-detail-title">Cultural Tone & Messaging</span>
//                         <span className="ai-detail-score">70/100</span>
//                       </div>
//                       <div className="ai-strengths-box">
//                         <div className="ai-strengths-header">✅ Strengths:</div>
//                         <ul className="ai-strengths-list">
//                           {analysisBySegment[selectedResolved.id].sections[0].strengths.map((str, i) => (
//                             <li key={i}>{str}</li>
//                           ))}
//                         </ul>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="tm-empty-state-p">Perform AI analysis to see insights.</div>
//               )}
//             </div>

//             {/* Terminology Validation Card */}
//             <div className="tm-ai-analysis-card tm-terminology-card">
//               <div className="tm-card-header">
//                 <h3 className="tm-card-title">📚 Terminology Validation</h3>
//               </div>
//               {selectedResolved && analysisBySegment[selectedResolved.id] ? (
//                 <div className="tm-terminology-content">
//                   <div className="tm-term-group">
//                     <div className="tm-term-label">Key Terms Found</div>
//                     <div className="tm-term-grid">
//                       <div className="tm-term-grid-header">
//                         <span>Original</span>
//                         <span>Target</span>
//                       </div>
//                       {analysisBySegment[selectedResolved.id].terminology.found.map((term, i) => (
//                         <div key={i} className="tm-term-grid-row">
//                           <span className="tm-term-orig">{term.original}</span>
//                           <span className="tm-term-targ">{term.target}</span>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
                  
//                   <div className="tm-term-group">
//                     <div className="tm-term-label">Missing/Incorrect Terms</div>
//                     {analysisBySegment[selectedResolved.id].terminology.missing.map((term, i) => (
//                       <div key={i} className="tm-term-issue-box">
//                         <div className="tm-term-issue-header">
//                           <span className="tm-term-name">{term.term}</span>
//                           <span className="ai-status-pill high-priority">{term.status}</span>
//                         </div>
//                         <div className="tm-term-issue-body">{term.issue}</div>
//                         <div className="tm-term-issue-footer">
//                           <button className="tm-btn primary small" onClick={() => handleAcceptSuggestion("Updated with correct term")}>Accept & Update</button>
//                           <button className="tm-btn outline small">Ignore</button>
//                           <button className="tm-btn link small">Edit</button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               ) : (
//                 <div className="tm-empty-state-p">Run analysis to validate terminology.</div>
//               )}
//             </div>

//             {/* Visual and Color Guidance Card */}
//             <div className="tm-ai-analysis-card tm-visual-card">
//               <div className="tm-card-header">
//                 <h3 className="tm-card-title">🎨 Visual and Color Guidance</h3>
//               </div>
//               {selectedResolved && analysisBySegment[selectedResolved.id] ? (
//                 <div className="tm-visual-content">
//                   {analysisBySegment[selectedResolved.id].visual.map((item, i) => (
//                     <div key={i} className={`tm-visual-item ${item.status}`}>
//                       <div className="tm-visual-header">
//                         <span className="tm-visual-icon">{item.status === 'pass' ? '✅' : '⚠️'}</span>
//                         <span className="tm-visual-label">{item.label}</span>
//                       </div>
//                       <div className="tm-visual-desc">{item.text}</div>
//                     </div>
//                   ))}
//                   <div className="tm-visual-footer">
//                     <button className="tm-btn primary full-width">View Regional Visual Guidelines</button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="tm-empty-state-p">Visual analysis data not available yet.</div>
//               )}
//             </div>
//           </div>

//           {/* Right Column: Context Editor */}
//           <div className="tm-card tm-right">
//             {!selectedResolved ? (
//               <div className="tm-empty large">Select a segment on the left.</div>
//             ) : (
//               <div className="tm-detail">
//                 <div className="tm-detail-row">
//                   <div className="tm-detail-row-left">
//                     <span className="tm-chip soft">Translation ({selectedResolved.lang})</span>
//                   </div>
//                   <div className="tm-detail-row-right">
//                     <span className="tm-lang-chip">{selectedResolved.lang}</span>
//                   </div>
//                 </div>

//                 <div className="tm-light" style={{ margin: "4px 0 8px" }}>{selectedResolved.title}</div>

//                 <div className="tm-box source" style={{ whiteSpace: "pre-wrap" }}>
//                   {selectedResolved.translated || <span className="tm-light">— No translation —</span>}
//                 </div>

//                 <div className="tm-detail-head" style={{ marginTop: 12 }}>
//                   <span className="tm-chip success">Analysis</span>
//                   <button
//                     className={`tm-btn link small is-blue ${isAnalyzing ? "is-loading" : ""}`}
//                     disabled={isAnalyzing}
//                     onClick={handleAnalyzeClick}
//                   >
//                     Analyze with AI
//                   </button>
//                 </div>

//                 <div className="tm-detail-head">
//                   <span className="tm-chip">Culturally Adapted Text</span>
//                   <button className="tm-btn link small is-teal-muted" onClick={handleMarkReviewed}>
//                     Mark as Reviewed
//                   </button>
//                 </div>

//                 <div className="tm-box" style={{ whiteSpace: "pre-wrap" }}>
//                   {selectedResolved.adapted || (
//                     <span className="tm-light">— Awaiting cultural adaptation —</span>
//                   )}
//                 </div>

//                 {analysisError && (
//                   <div className="tm-inline-error" style={{ marginTop: 8 }}>{analysisError}</div>
//                 )}

//                 <div className="tm-detail-tools">
//                   <span className="tm-light">TM 0% Match</span>
//                   <div className="tm-detail-spacer" />
//                   <button className="tm-btn link small">View TM History</button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </section>

//         {/* AI Analysis Modal */}
//         <Modal
//           open={isAnalysisOpen}
//           onClose={() => setIsAnalysisOpen(false)}
//           ariaLabel="AI Analysis Results"
//         >
//           <div className="ai-modal-header">
//             <span className="tm-chip soft">🧠 AI Cultural Analysis - Segment {selectedResolved?.index}</span>
//           </div>

//           <div className="ai-summary">
//             {isAnalyzing ? (
//               <div className="tm-loading-block">Analyzing segment...</div>
//             ) : (
//               selectedResolved &&
//               analysisBySegment[selectedResolved.id] && (
//                 <>
//                   <div className="ai-overall">
//                     <div className="ai-overall-left">
//                       <div className="ai-overall-label">Overall Score</div>
//                       <div className="ai-overall-score">
//                         <span className="ai-score-number">{analysisBySegment[selectedResolved.id].overallScore}</span>
//                         <span className="ai-score-total">/100</span>
//                       </div>
//                     </div>
//                     <div className="ai-overall-right">
//                       <span className={`ai-status-badge ${analysisBySegment[selectedResolved.id].needsStatus.replace(/\s+/g, '-').toLowerCase()}`}>
//                         {analysisBySegment[selectedResolved.id].needsStatus}
//                       </span>
//                     </div>
//                   </div>

//                   <div className="ai-sections">
//                     {analysisBySegment[selectedResolved.id].sections.map((sec) => (
//                       <div key={sec.id} className="ai-section">
//                         <div className="ai-section-head">
//                           <span className="tm-chip">{sec.title}</span>
//                           <div className="ai-section-score"><span>{sec.score}/100</span></div>
//                         </div>

//                         {sec.issues.map((issue, idx) => (
//                           <div key={idx} className="ai-issue-card">
//                             <div className="ai-issue-meta">
//                               <span className="ai-issue-priority">{issue.priority} PRIORITY ISSUE</span>
//                             </div>

//                             <div className="ai-issue-block">
//                               <div className="ai-issue-label">Translation:</div>
//                               <div className="ai-issue-content">{issue.translation}</div>
//                             </div>

//                             <div className="ai-issue-block">
//                               <div className="ai-issue-label">Problem:</div>
//                               <div className="ai-issue-content">{issue.problem}</div>
//                             </div>

//                             <div className="ai-issue-block">
//                               <div className="ai-issue-label">Suggestion:</div>
//                               <div className="ai-issue-content">{issue.suggestion}</div>
//                             </div>

//                             <div className="ai-issue-actions">
//                               <button
//                                 className="tm-btn primary"
//                                 onClick={() => handleAcceptSuggestion(issue.suggestion)}
//                               >
//                                 Accept Suggestion
//                               </button>
//                               <button className="tm-btn outline">Flag for Review</button>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     ))}
//                   </div>
//                 </>
//               )
//             )}
//           </div>
//         </Modal>
//       </div>
//     </div>
//   );
// }

// /* Sidebar phases (single source of truth) */
// const SIDEBAR_PHASES = [
//   { id: 1, name: "Global Context Capture", sub: "Source content analysis", status: "done", iconClass: "icon-context" },
//   { id: 2, name: "Smart TM Translation", sub: "AI-powered translation", status: "done", iconClass: "icon-translation" },
//   { id: 3, name: "Cultural Intelligence", sub: "Cultural adaptation", status: "active", iconClass: "icon-culture" },
//   { id: 4, name: "Regulatory Compliance", sub: "Compliance validation", status: "todo", iconClass: "icon-compliance" },
//   { id: 5, name: "Quality Intelligence", sub: "Quality assurance", status: "todo", iconClass: "icon-quality" },
//   { id: 6, name: "DAM Integration", sub: "Asset packaging", status: "todo", iconClass: "icon-dam" },
//   { id: 7, name: "Integration Lineage", sub: "System integration", status: "todo", iconClass: "icon-integration" },
// ];

// /** ========= Simple Reusable Modal ========= */
// function Modal({ open, onClose, children, ariaLabel = "Dialog" }) {
//   if (!open) return null;
//   return (
//     <div className="tm-modal-overlay" role="dialog" aria-modal="true" aria-label={ariaLabel}>
//       <div className="tm-modal">
//         <div className="tm-modal-body">{children}</div>
//         <div className="tm-modal-footer">
//           <button className="tm-btn outline" onClick={onClose}>Close</button>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

/**
 * Cultural Intelligence Hub (Destination page)
 * Updated to support Dynamic Language Mock Data (DE, JA, ZH, EN)
 */
export default function CulturalAdaptationWorkspace({
  projectName: projectNameProp = "No project name to display",
  therapyArea = "Respiratory · DE",
  progressItems: progressItemsProp = { reviewed: 0, total: 75 },
  segments: segmentsProp = [],
}) {
  const { state } = useLocation();
  const navigate = useNavigate();

  /** Tabs */
  const [activeTab, setActiveTab] = useState("adaptation");
  /** Prefer project from previous page */
  const projectName = state?.projectName ?? projectNameProp;
  /** Env Helpers */
  const getEnv = () => {
    const pe = typeof process !== "undefined" && process.env ?
process.env : {};
    const we = typeof window !== "undefined" && window._env_ ? window._env_ : {};
return { ...we, ...pe };
  };
  const ENV = getEnv();

  const N8N_CULTURAL_WEBHOOK_URL =
    ENV.REACT_APP_N8N_CULTURAL_WEBHOOK_URL ||
    ENV.VITE_N8N_CULTURAL_WEBHOOK_URL ||
"http://172.16.4.237:8010/webhook-test/cultural";

  const N8N_AUTH = ENV.REACT_APP_N8N_TOKEN || ENV.VITE_N8N_TOKEN || "";

  const getTargetLang = (therapyAreaStr) => {
    const m = String(therapyAreaStr || "").match(/·\s*([A-Za-z-]+)/);
return m?.[1] || "DE";
  };

  const tryParseJSON = (str) => {
    try {
      return JSON.parse(str);
} catch (e) {
      return null;
    }
  };
const extractTPSFromBody = (body) => {
    if (!body) return null;
    const data = Array.isArray(body) ?
body[0] : body;
    const out = data?.output ?? data?.cultural_output ?? data;
if (typeof out === "string") {
      const parsed = tryParseJSON(out);
if (parsed && (parsed.translation || parsed.problem || parsed.suggestion)) {
        return {
          translation: String(parsed.translation || "").trim(),
          problem: String(parsed.problem || "").trim(),
          suggestion: String(parsed.suggestion || "").trim(),
        };
}
      return {
        translation: "",
        problem: "",
        suggestion: String(out).trim(),
      };
}

    if (out && typeof out === "object") {
      return {
        translation: String(out.translation || "").trim(),
        problem: String(out.problem || "").trim(),
        suggestion: String(out.suggestion || "").trim(),
      };
}
    return null;
  };

  const extractTPSFromResponse = async (res) => {
    let body;
try {
      body = await res.json();
} catch (e) {
      const text = await res.text();
      body = tryParseJSON(text) ?? text;
}
    const extracted = extractTPSFromBody(body);
    return extracted || { translation: "", problem: "", suggestion: "" };
  };
/**
   * ========= DATA MERGING & NORMALIZATION =========
   */
  const segments = useMemo(() => {
    const raw = Array.isArray(state?.segments)
      ? state.segments
      : Array.isArray(segmentsProp)
      ? segmentsProp
      : [];

    const targetFromTherapy = getTargetLang(therapyArea);

    return (raw || [])
      .map((seg, i) => {
        const index = typeof seg.index === "number" ? seg.index : i + 1;
   
     const source = String(seg.source ?? "");
        return {
          id: seg.id ?? `seg-${index}`,
          index,
          title: seg.title || seg.assetTitle || source.split(/\r?\n/)[0] || `Section ${index}`,
          source,
          translated: String(seg.translated ?? ""),
          adapted: seg.adapted || "",
    
      words: typeof seg.words === "number" ? seg.words : source.split(/\s+/).filter(Boolean).length,
          status: seg.status || "Pending",
          lang: seg.lang ?? targetFromTherapy ?? "EN",
        };
      })
      .filter((s) => s.source.trim().length > 0)
      .sort((a, b) => a.index - b.index);
}, [state?.segments, segmentsProp, therapyArea]);

  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    if (!selectedId && segments.length > 0) {
      setSelectedId(segments[0].id);
    }
  }, [segments, selectedId]);
const [segOverrides, setSegOverrides] = useState({});

  /** AI Analysis Modal & Results State */
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisBySegment, setAnalysisBySegment] = useState({});
// Local state to track selected alternatives in the Terminology Card
  const [termSelections, setTermSelections] = useState({});
const selectedResolved = useMemo(() => {
    const base = segments.find((s) => s.id === selectedId);
    if (!base) return null;
    const overrides = segOverrides[selectedId] || {};
    return { ...base, ...overrides };
  }, [segments, selectedId, segOverrides]);
const progressItems = useMemo(() => {
    const total = segments.length || 0;
    const reviewed = segments.filter((s) => {
      const currentStatus = String(
        segOverrides[s.id]?.status ?? s.status ?? "Pending"
      ).toLowerCase();
      return currentStatus === "reviewed" || currentStatus === "completed";
    }).length;
    return { reviewed, total };
  }, [segments, segOverrides]);
const progressPct = Math.round(
    (progressItems.reviewed / Math.max(progressItems.total, 1)) * 100
  );
const statusPill = (status) => {
    const s = String(status || "Pending").toLowerCase();
if (s === "reviewed" || s === "completed") return "completed";
    return "pending";
  };
const HourglassIcon = ({ className }) => (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v10l4 2" />
      <path d="M12 22V12m0 0L8 14" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
/**
   * ========= ACTIONS =========
   */
  const handlePhaseClick = (phaseName) => {
    if (phaseName === "Smart TM Translation") {
      navigate("/smartTMTranslationHub", { state: { projectName, segments } });
} else if (phaseName === "Global Context Capture") {
      navigate("/globalAssetCapture", { state: { projectName, segments } });
}
  };

  const handleMarkReviewed = () => {
    if (!selectedResolved) return;
setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        status: "Reviewed",
      },
    }));
};

  const handleAnalyzeClick = async () => {
    if (!selectedResolved || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setIsAnalysisOpen(true);
try {
      // --- Simulate or Real Fetch ---
      let tps = { translation: "", problem: "", suggestion: "" };
try {
        const res = await fetch(N8N_CULTURAL_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(N8N_AUTH ? { Authorization: N8N_AUTH } : {}),
          },
          body: JSON.stringify({
           
  segmentId: selectedResolved.id,
            source: selectedResolved.source,
            translated: selectedResolved.translated,
            targetLang: selectedResolved.lang,
          }),
        });
if (res.ok) {
          tps = await extractTPSFromResponse(res);
}
      } catch (e) {
        console.warn("API unavailable, using mock data", e);
}

      // --- DYNAMIC MOCK DATA GENERATION ---
      const targetLang = selectedResolved.lang ?
selectedResolved.lang.toUpperCase() : "DE";
      const sourceTextUpper = selectedResolved.source ? selectedResolved.source.toUpperCase() : "";
// Default structure
      let mockTerminology = {
        score: 85,
        approvedTerms: [],
        needsReview: []
      };
// 1. GERMAN (DE)
      if (targetLang.includes("DE")) {
        mockTerminology.approvedTerms = ["Klinisch", "Behandlung", "Studie"];
// Check context for DE specific cases if needed, but keeping it flexible
        if (sourceTextUpper.includes("HIV") || sourceTextUpper.includes("AIDS")) {
           mockTerminology.needsReview.push({
             id: "term_hiv_de",
             term: "AIDS-Heilung",
             issue: "'AIDS-Heilung' implies a cure, which is medically inaccurate. 'HIV-Therapie' or 'Antiretrovirale Therapie' is preferred to describe ongoing management.",
      
       alternatives: ["HIV-Therapie", "Antiretrovirale Therapie"]
           });
} else {
           mockTerminology.needsReview.push({
             id: "term_gen_de",
             term: "Klinische Exzellenz",
             issue: "'Klinische Exzellenz' sounds like marketing jargon. In German medical communications, specifying the benefit (e.g., efficacy) is more compliant.",
             alternatives: ["Klinische Wirksamkeit", "Therapeutischer Nutzen"]
          
  });
        }

      // 2. JAPANESE (JA/JP) - Specific Screenshot Logic
      } else if (targetLang.includes("JA") || targetLang.includes("JP")) {
         mockTerminology.approvedTerms = ["アセット", "ソーシャルメディア投稿"];
// Mocking specific Japanese issues from screenshots
         mockTerminology.needsReview.push({
            id: "term_social_ja",
            term: "ソーシャルコンテンツ",
            issue: "While 'ソーシャルコンテンツ' (social content) is generally understood, in a formal pharmaceutical context, a more precise phrasing might be preferred.",
       
      alternatives: ["ソーシャルメディア用コンテンツ", "広報コンテンツ (SNS向け)"]
         });
mockTerminology.needsReview.push({
            id: "term_trend_ja",
            term: "トレンドトピックの増幅",
            issue: "'増幅' (amplification) can sound a bit aggressive or overly technical in some contexts.",
            alternatives: ["トレンドトピックの拡散", "トレンドトピックの活用"]
         });
// 3. CHINESE (ZH/CN)
      } else if (targetLang.includes("ZH") || targetLang.includes("CN")) {
         mockTerminology.approvedTerms = ["艾滋病", "临床", "治疗"];
if (sourceTextUpper.includes("HIV") || sourceTextUpper.includes("AIDS")) {
            mockTerminology.needsReview.push({
              id: "term_hiv_zh",
              term: "艾滋病治疗",
              issue: "Use 'HIV' (Human Immunodeficiency Virus) rather than 'AIDS' to avoid stigma. 'HIV治疗' is preferred.",
              alternatives: ["HIV治疗", "HIV/AIDS治疗"]
          
    });
         } else {
             mockTerminology.needsReview.push({
               id: "term_gen_zh",
               term: "临床卓越",
               issue: "'临床卓越' is too generic. Specify the outcome.",
               alternatives: ["临床优势", "卓越临床实践"]
           
    });
         }

      // 4. FALLBACK / ENGLISH - Specific "Perfect Cure" Logic
      } else {
         mockTerminology.approvedTerms = ["Clinical", "Therapy", "Study"];
// Specific English Fallback from screenshot
         mockTerminology.needsReview.push({
           id: "term_gen_en",
           term: "Perfect Cure",
           issue: "Avoid absolute claims like 'Perfect'. Use statistical evidence.",
           alternatives: ["Significant Improvement", "High Efficacy"]
         });
}

      const mockAnalysis = {
        overallScore: 80,
        needsStatus: "Needs Review",
        sections: [
          {
            id: "tone",
            title: "Cultural Tone & Messaging",
            score: 70,
           
  strengths: [
              "Appropriate medical terminology used",
              "Maintains professional register",
            ],
            issues: [
              {
                priority: "Medium",
         
        translation: tps.translation ||
selectedResolved.translated,
                problem: tps.problem ||
"Tone is slightly too formal for patient education.",
                suggestion: tps.suggestion ||
"Adjust phrasing to be more empathetic and accessible.",
              },
            ],
          },
        ],
        // DYNAMIC TERMINOLOGY DATA HERE
        terminology: mockTerminology,
        visual: [
          { label: "Medical Imagery Relevance", status: "pass", text: "Imagery aligns with local clinical settings." },
          { label: "Color Palette Sensitivity", status: "review", text: "Ensure color coding for charts meets local accessibility standards."
}
        ]
      };
setAnalysisBySegment((prev) => ({
        ...prev,
        [selectedResolved.id]: mockAnalysis,
      }));
// Initialize default selections (first alternative)
      const initialSelections = {};
mockAnalysis.terminology.needsReview.forEach(item => {
        initialSelections[item.id] = item.alternatives[0];
      });
      setTermSelections(initialSelections);
} catch (err) {
      setAnalysisError(err.message || "An error occurred during AI analysis.");
} finally {
      setIsAnalyzing(false);
    }
  };
/**
   * Helper to update the text in the right pane
   */
  const updateAdaptedText = (newText) => {
    if (!selectedResolved) return;
setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        adapted: newText,
        status: "Pending", // Reset to pending if changed
      },
    }));
};

  const handleAcceptSuggestion = (suggestionText) => {
    updateAdaptedText(suggestionText);
    setIsAnalysisOpen(false);
  };
// Terminology Buttons Logic
  const handleTermOptionSelect = (termId, option) => {
    setTermSelections(prev => ({ ...prev, [termId]: option }));
};

  const handleApplyTermAlternative = (termId) => {
    const selected = termSelections[termId];
if (selected) {
      updateAdaptedText(selected); // Apply to the editor
      
      // Remove from list locally to simulate "Done"
      const currentAnalysis = analysisBySegment[selectedResolved.id];
if (currentAnalysis) {
        const updatedNeedsReview = currentAnalysis.terminology.needsReview.filter(t => t.id !== termId);
setAnalysisBySegment(prev => ({
            ...prev,
            [selectedResolved.id]: {
                ...prev[selectedResolved.id],
                terminology: {
                    ...currentAnalysis.terminology,
                    
needsReview: updatedNeedsReview
                }
            }
        }));
}
    }
  };

  const handleFlagTerm = (termId) => {
    console.log(`Flagged term ${termId} for review`);
alert("Term flagged for review.");
  };

  const handleDismissTerm = (termId) => {
    const currentAnalysis = analysisBySegment[selectedResolved.id];
if (currentAnalysis) {
        const updatedNeedsReview = currentAnalysis.terminology.needsReview.filter(t => t.id !== termId);
setAnalysisBySegment(prev => ({
            ...prev,
            [selectedResolved.id]: {
                ...prev[selectedResolved.id],
                terminology: {
                    ...currentAnalysis.terminology,
                    
needsReview: updatedNeedsReview
                }
            }
        }));
}
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
          <div className="tm-progress-bar">
        
     <div className="tm-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <nav className="tm-phases">
          {SIDEBAR_PHASES.map((p) => {
            const isActive = p.name === "Cultural Intelligence";
            return (
              <button
      
           key={p.id}
                className={`tm-phase-item ${p.status} ${isActive ? "is-active" : ""}`}
                onClick={() => handlePhaseClick(p.name)}
              >
                <span className={`tm-phase-icon ${p.iconClass}`} />
                <span 
className="tm-phase-text">
                  <span className="tm-phase-title">{p.name}</span>
                  <span className="tm-phase-sub">{p.sub}</span>
                </span>
                {p.status === "done" && <span className="tm-phase-check">✓</span>}
                {isActive && <span className="tm-phase-dot" />}
     
          </button>
            );
})}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="tm-main">
        {/* Top Header / Tabs Bar */}
        <section className="tm-tabs-bar">
          <div className="tm-tabs">
            <button className={`tm-tab ${activeTab === "adaptation" ?
"is-active" : ""}`} onClick={() => setActiveTab("adaptation")}>
              Cultural Adaptation
            </button>
            <button className={`tm-tab ${activeTab === "draft" ?
"is-active" : ""}`} onClick={() => setActiveTab("draft")}>
              Culturally-Adapted Draft
            </button>
            <button className={`tm-tab ${activeTab === "report" ?
"is-active" : ""}`} onClick={() => setActiveTab("report")}>
              Intelligence Report
            </button>
          </div>

          <div className="tm-tabs-right">
            <div className="tm-saved-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12B981" strokeWidth="2">
           
        <path d="M5 13l4 4L19 7" />
              </svg>
              <span>All changes saved</span>
            </div>
            <div className="tm-tabs-actions">
              <button className="tm-btn outline">📄 Generate Agency Handoff PDF</button>
             
  <button className="tm-btn primary">Complete Phase 3</button>
            </div>
          </div>
        </section>

        {/* Workspace Info Header */}
        <section className="tm-header-secondary">
          <div className="tm-header-left">
            <h2 className="tm-page-subtitle">
              {activeTab === "adaptation" && "Cultural Adaptation Workspace"}
              {activeTab === "draft" && "Culturally-Adapted Draft Translation"}
              {activeTab === "report" && "Cultural Intelligence Report"}
            </h2>
            <span className="tm-light">
              {activeTab === "adaptation" && "Review translations and adapt content for cultural relevance"}
              {activeTab === "draft" && "Consolidated culturally-adapted content ready for final review"}
              {activeTab === "report" && "Comprehensive analysis of cultural adaptations"}
            </span>
          </div>
          <div className="tm-header-right-inline">
            <div className="tm-progress-inline">
              <span className="tm-progress-inline-label">Progress:</span>
              <span className="tm-progress-inline-value">{progressItems.reviewed} / {progressItems.total} reviewed</span>
              <div className="tm-progress-inline-bar">
                
 <div className="tm-progress-inline-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT SWITCHER BASED ON TABS */}
        {activeTab === "adaptation" && (
          <section className="tm-workspace ci-workspace">
            {/* Left Column: Segments List & Detailed Analysis Cards */}
            <div className="tm-card tm-left">
              <div className="tm-card-header">
                <h3 className="tm-card-title">Content Segments</h3>
                <span className="tm-light">{segments.length} segments to review</span>
              </div>

              <div className="tm-seg-list">
                {segments.map((seg) => {
                  const isSelected = seg.id === selectedId;
                  const status = segOverrides[seg.id]?.status || seg.status;
                  return (
                    <button
                      key={seg.id}
                      className={`tm-seg-item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedId(seg.id)}
                    >
                      <div className="tm-seg-item-top">
                        <span className="tm-ci-index">[{seg.index}]</span>
                        <span className={`tm-seg-pill ${statusPill(status)}`}>
                          <HourglassIcon className="tm-pill-icon" /> {status}
                        </span>
                      </div>
                      <div className="tm-seg-title">{seg.title}</div>
                      <div className="tm-seg-meta-row">
                        <span className="tm-seg-meta">{seg.words} words</span>
                      </div>
                    </button>
                  );
                })}
              </div>

{/* AI Cultural Analysis Segment Card */}
<div className="tm-ai-analysis-card">
  <div className="tm-card-header">
    <h3 className="tm-card-title">🧠 AI Cultural Analysis - Segment {selectedResolved?.index}</h3>
  </div>
  {selectedResolved && analysisBySegment[selectedResolved.id] ? (
    <div className="ai-analysis-summary">
      <div className="ai-summary-row">
        <div className="ai-score-group">
          <div className="ai-label">Overall Score</div>
          <div className="ai-score-value">
            <span className="ai-score-big">{analysisBySegment[selectedResolved.id].overallScore}</span>
            <span className="ai-score-total">/100</span>
          </div>
        </div>
        <div className={`ai-status-pill ${analysisBySegment[selectedResolved.id].needsStatus.replace(/\s+/g, '-').toLowerCase()}`}>
          {analysisBySegment[selectedResolved.id].needsStatus}
        </div>
      </div>

      <div className="ai-analysis-details">
        {analysisBySegment[selectedResolved.id].sections.map((sec, idx) => (
          <div className="ai-detail-item" key={idx}>
            <div className="ai-detail-header">
              <span className="ai-icon">💬</span>
              <span className="ai-detail-title">{sec.title}</span>
              <span className="ai-detail-score">{sec.score}/100</span>
            </div>
            {sec.issues.map((issue, i) => (
              <div key={i} className="ai-issue-card-inline">
                <div className="ai-issue-meta">MEDIUM PRIORITY ISSUE</div>
                <div className="ai-issue-block">
                  <strong>Translation:</strong> "{issue.translation}"
                </div>
                <div className="ai-issue-block">
                  <strong>Problem:</strong> {issue.problem}
                </div>
                <div className="ai-issue-block">
                  <strong>Suggestion:</strong> <span className="ai-suggestion-text">{issue.suggestion}</span>
                </div>
                <div className="ai-issue-actions">
                  <button className="tm-btn primary small" onClick={() => handleAcceptSuggestion(issue.suggestion)}>Accept Suggestion</button>
                  <button className="tm-btn outline small">Flag for Review</button>
                  <button className="tm-btn link small">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="ai-strengths-box">
          <div className="ai-strengths-header">✅ Strengths:</div>
          <ul className="ai-strengths-list">
            <li>The overall tone is neutral and appropriate for a content descriptor.</li>
            <li>Directness is suitable for internal asset titles.</li>
          </ul>
        </div>
      </div>
    </div>
  ) : (
    <div className="tm-empty-state-p">Perform AI analysis to see insights.</div>
  )}
</div>

{/* Terminology Validation Card */}
<div className="tm-ai-analysis-card">
  <div className="tm-card-header" style={{display:'flex', justifyContent:'space-between'}}>
    <h3 className="tm-card-title">📖 Terminology Validation</h3>
    <span className="tm-visual-score">{analysisBySegment[selectedResolved?.id]?.terminology?.score || 0}/100</span>
  </div>
  {selectedResolved && analysisBySegment[selectedResolved.id] ? (
    <div className="tm-terminology-content">
      <div className="ai-strengths-box" style={{borderLeftColor: '#10b981', marginBottom: '12px'}}>
        <div className="ai-strengths-header" style={{color: '#059669'}}>Approved Terms:</div>
        <div className="tm-token-wrap">
          {analysisBySegment[selectedResolved.id].terminology.approvedTerms.map((t, i) => (
            <span key={i} className="tm-token-pill">{t}</span>
          ))}
        </div>
      </div>
      
      {analysisBySegment[selectedResolved.id].terminology.needsReview.map((item) => (
        <div key={item.id} className="tm-term-issue-box">
          <div className="tm-term-issue-header">
            <span className="tm-term-name">Term: "{item.term}"</span>
            <span className="ai-status-pill high-priority">Needs Review</span>
          </div>
          <div className="tm-term-issue-body">{item.issue}</div>
          <div className="tm-alt-label">Approved Alternatives:</div>
          <div className="tm-alt-grid">
            {item.alternatives.map(alt => (
              <button key={alt} className={`tm-alt-btn ${termSelections[item.id] === alt ? 'active' : ''}`} onClick={() => handleTermOptionSelect(item.id, alt)}>{alt}</button>
            ))}
          </div>
          <div className="tm-term-issue-footer">
            <button className="tm-btn primary small" onClick={() => handleApplyTermAlternative(item.id)}>Apply Selected Alternative</button>
            <button className="tm-btn outline small">Flag for Review</button>
            <button className="tm-btn link small">Dismiss All</button>
          </div>
        </div>
      ))}
    </div>
  ) : <div className="tm-empty-state-p">Run analysis to validate terms.</div>}
</div>

{/* Visual & Color Guidance Card */}
<div className="tm-ai-analysis-card">
  <div className="tm-card-header" style={{display:'flex', justifyContent:'space-between'}}>
    <h3 className="tm-card-title">🎨 Visual & Color Guidance</h3>
    <span className="tm-visual-score" style={{color: '#ef4444'}}>0/100</span>
  </div>
  <div className="tm-visual-content">
    <div className="tm-visual-item">
      <div className="tm-visual-header">
        <span className="tm-visual-icon">💡</span>
        <span className="tm-visual-label">Image Guidance:</span>
      </div>
      <ul className="tm-visual-bullet-list">
        <li>Provide definitive guidance on colors once market is known.</li>
        <li>Avoid imagery promoting unapproved uses.</li>
      </ul>
    </div>
    <div className="tm-visual-item">
      <div className="tm-visual-header">
        <span className="tm-visual-icon">📐</span>
        <span className="tm-visual-label">Design Recommendations:</span>
      </div>
      <ul className="tm-visual-bullet-list">
        <li>Ensure adequate white space for email assets.</li>
        <li>Use clear, legible Sans-serif fonts.</li>
      </ul>
    </div>
    {/* 3-Button Footer Logic */}
    <div className="tm-visual-footer">
          <button className="tm-btn outline" onClick={() => setIsAnalysisOpen(false)}>Close</button>
          <button className="tm-btn outline" onClick={handleAnalyzeClick}>Re-analyze</button>
          <button className="tm-btn primary" onClick={handleMarkReviewed}>Mark as Reviewed & Continue</button>
        </div>
      </div>
    </div>

            {/* Right Column: Context Editor */}
            <div className="tm-card tm-right">
              {!selectedResolved ? (
                <div className="tm-empty large">Select a segment on the left.</div>
              ) : (
                <div className="tm-detail">
                  <div className="tm-detail-row">
                    <div className="tm-detail-row-left"><span className="tm-chip soft">Translation ({selectedResolved.lang})</span></div>
                    <div className="tm-detail-row-right"><span className="tm-lang-chip">{selectedResolved.lang}</span></div>
                  </div>
                  <div className="tm-light" style={{ margin: "4px 0 8px" }}>{selectedResolved.title}</div>
                  <div className="tm-box source" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedResolved.translated || <span className="tm-light">— No translation —</span>}
                  </div>
                  <div className="tm-detail-head" style={{ marginTop: 12 }}>
                    <span className="tm-chip success">Analysis</span>
                    <button className={`tm-btn link small is-blue ${isAnalyzing ? "is-loading" : ""}`} disabled={isAnalyzing} onClick={handleAnalyzeClick}>Analyze with AI</button>
                  </div>
                  <div className="tm-detail-head">
                    <span className="tm-chip">Culturally Adapted Text</span>
                    <button className="tm-btn link small is-teal-muted" onClick={handleMarkReviewed}>Mark as Reviewed</button>
                  </div>
                  <div className="tm-box" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedResolved.adapted || <span className="tm-light">— Awaiting cultural adaptation —</span>}
                  </div>
                  {analysisError && <div className="tm-inline-error" style={{ marginTop: 8 }}>{analysisError}</div>}
                  <div className="tm-detail-tools">
                    <span className="tm-light">TM 0% Match</span>
                    <div className="tm-detail-spacer" />
                    <button className="tm-btn link small">View TM History</button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </section>
        )}
        

        {/* CULTURALLY-ADAPTED DRAFT TAB */}
        {activeTab === "draft" && (
          <section className="tm-workspace" style={{ justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
            <div className="tm-card" style={{ maxWidth: '800px', width: '100%', textAlign: 'center', padding: '40px' }}>
              <div style={{ marginBottom: '24px' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1E293B', marginBottom: '8px' }}>Draft Not Generated Yet</h3>
              <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>Complete all segment reviews to generate the final culturally-adapted draft</p>
              <div style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '12px' }}>{progressItems.reviewed} of {progressItems.total} segments reviewed</div>
              <div className="tm-progress-bar" style={{ maxWidth: '300px', margin: '0 auto' }}>
                <div className="tm-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </section>
        )}

        {/* INTELLIGENCE REPORT TAB */}
        {activeTab === "report" && (
          <section className="tm-workspace">
             <div className="tm-card" style={{ width: '100%', padding: '24px' }}>
               {segments.map((seg, idx) => (
                 <div key={seg.id} style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '20px', marginBottom: '16px', position: 'relative' }}>
                   <div style={{ position: 'absolute', right: '20px', top: '20px', background: '#ECFDF5', color: '#10B981', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                     {analysisBySegment[seg.id]?.overallScore || 80}
                   </div>
                   <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#0F172A' }}>Segment {seg.index}</h4>
                   <div style={{ marginBottom: '12px' }}>
                     <div style={{ fontWeight: '600', fontSize: '13px', color: '#64748B' }}>Source:</div>
                     <div style={{ fontSize: '13px', color: '#334155' }}>Asset: {seg.title}</div>
                   </div>
                   <div>
                     <div style={{ fontWeight: '600', fontSize: '13px', color: '#64748B' }}>Adapted Translation:</div>
                     <div style={{ fontSize: '14px', color: '#0F172A', marginTop: '4px' }}>
                        {segOverrides[seg.id]?.adapted || (seg.lang.includes("JA") ? "アセット：ソーシャルコンテンツ・トレンドトピックの増幅・ソーシャルメディア投稿" : seg.translated)}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </section>
        )}

        {/* AI Analysis Modal */}
        <Modal open={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} ariaLabel="AI Analysis Results">
          <div className="ai-modal-header">
            <span className="tm-chip soft">🧠 AI Cultural Analysis - Segment {selectedResolved?.index}</span>
          </div>
          <div className="ai-summary">
            {isAnalyzing ? (
              <div className="tm-loading-block">Analyzing segment...</div>
            ) : (
              selectedResolved && analysisBySegment[selectedResolved.id] && (
                <>
                  <div className="ai-overall">
                    <div className="ai-overall-left">
                      <div className="ai-overall-label">Overall Score</div>
                      <div className="ai-overall-score">
                        <span className="ai-score-number">{analysisBySegment[selectedResolved.id].overallScore}</span>
                        <span className="ai-score-total">/100</span>
                      </div>
                    </div>
                    <div className={`ai-status-badge ${analysisBySegment[selectedResolved.id].needsStatus.replace(/\s+/g, '-').toLowerCase()}`}>
                      {analysisBySegment[selectedResolved.id].needsStatus}
                    </div>
                  </div>
                  <div className="ai-sections">
                    {analysisBySegment[selectedResolved.id].sections.map((sec) => (
                      <div key={sec.id} className="ai-section">
                        <div className="ai-section-head">
                          <span className="tm-chip">{sec.title}</span>
                          <div className="ai-section-score"><span>{sec.score}/100</span></div>
                        </div>
                        {sec.issues.map((issue, idx) => (
                          <div key={idx} className="ai-issue-card">
                            <div className="ai-issue-meta"><span className="ai-issue-priority">{issue.priority} PRIORITY ISSUE</span></div>
                            <div className="ai-issue-block"><div className="ai-issue-label">Translation:</div><div className="ai-issue-content">{issue.translation}</div></div>
                            <div className="ai-issue-block"><div className="ai-issue-label">Problem:</div><div className="ai-issue-content">{issue.problem}</div></div>
                            <div className="ai-issue-block"><div className="ai-issue-label">Suggestion:</div><div className="ai-issue-content">{issue.suggestion}</div></div>
                            <div className="ai-issue-actions">
                              <button className="tm-btn primary" onClick={() => handleAcceptSuggestion(issue.suggestion)}>Accept Suggestion</button>
                              <button className="tm-btn outline">Flag for Review</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}

/* Sidebar phases */
const SIDEBAR_PHASES = [
  { id: 1, name: "Global Context Capture", sub: "Source content analysis", status: "done", iconClass: "icon-context" },
  { id: 2, name: "Smart TM Translation", sub: "AI-powered translation", status: "done", iconClass: "icon-translation" },
  { id: 3, name: "Cultural Intelligence", sub: "Cultural adaptation", status: "active", iconClass: "icon-culture" },
  { id: 4, name: "Regulatory Compliance", sub: "Compliance validation", status: "todo", iconClass: "icon-compliance" },
  { id: 5, name: "Quality Intelligence", sub: "Quality assurance", status: "todo", iconClass: "icon-quality" },
  { id: 6, name: "DAM Integration", sub: "Asset packaging", status: "todo", iconClass: "icon-dam" },
  { id: 7, name: "Integration Lineage", sub: "System integration", status: "todo", iconClass: "icon-integration" },
];

/** ========= Simple Reusable Modal ========= */
function Modal({ open, onClose, children, ariaLabel = "Dialog" }) {
  if (!open) return null;
  return (
    <div className="tm-modal-overlay" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="tm-modal">
        <div className="tm-modal-body">{children}</div>
        <div className="tm-modal-footer">
          <button className="tm-btn outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

     
   