
import React, { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container, Paper, Typography, Box, Checkbox, IconButton,
  Button, Divider, Chip, Accordion, AccordionSummary, AccordionDetails, InputLabel,Input
} from "@mui/material";
import {
  Edit as EditIcon, ExpandMore as ExpandMoreIcon, Language as LanguageIcon,
  Public as PublicIcon, CellTower as ChannelIcon,
  ArrowForward as ArrowForwardIcon, ArrowBack as ArrowBackIcon
} from "@mui/icons-material";
import Badge from 'react-bootstrap/Badge';
import { CheckCircle, Edit2 } from "lucide-react";
const Label = InputLabel;

// Primary Market Data
const MARKET_DATA = [
  { id: "japan", name: "Japan", lang: "Japanese", flag: "🇯🇵", code:"JP", priority: "High", timeline: "8-12w", weeks: 12 },
  { id: "china", name: "China", lang: "Chinese", flag: "🇨🇳", code:"CN", priority: "High", timeline: "8-12w", weeks: 12 },
  { id: "germany", name: "Germany", lang: "German", flag: "🇩🇪", code:"DE", priority: "Medium", timeline: "6-8w", weeks: 8 },
];

// Coming Soon Data
const COMING_SOON_DATA = [
  { name: "France", flag: "🇫🇷" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Australia", flag: "🇦🇺" },
];

const AssetImportContext = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditingName, setIsEditingName] = useState(false);
  // 🔹 Read values from previous page (with fallbacks)
const [projectName, setProjectName] = useState(location.state?.projectName || "Adaptation Project");
 const [baseProjectName, setBaseProjectName] = useState(
  location.state?.projectName || "Adaptation Project"
)

  const content = location.state?.content || "No strategic context/content provided.";
  const type = location.state?.assettype || "email";
  console.log(type)
  const [selectedMarkets, setSelectedMarkets] = useState([]);

  const handleToggle = (market) => {
    const currentIndex = selectedMarkets.findIndex((m) => m.id === market.id);
    const newChecked = [...selectedMarkets];
    if (currentIndex === -1) newChecked.push(market);
    else newChecked.splice(currentIndex, 1);
    setSelectedMarkets(newChecked);
  };

  const estTimeline = useMemo(() => {
    if (selectedMarkets.length === 0) return "0 weeks";
    const maxWeeks = Math.max(...selectedMarkets.map((m) => m.weeks));
    return `${maxWeeks} weeks`;
  }, [selectedMarkets]);

  
 const derivedProjectName = useMemo(() => {
  const codes = selectedMarkets.map((m) => m.code);
  const uniqueCodes = Array.from(new Set(codes));
  const codePart = uniqueCodes.length > 0 ? `${uniqueCodes.join(", ")} ` : "";
  return `${baseProjectName} - ${codePart}Adaptation`;
}, [baseProjectName, selectedMarkets]);


  // 🔹 When clicking "Create Project & Continue", navigate to the next page
  //     with projectName + content from THIS page's state.
  const handleCreateProjectAndContinue = () => {
const firstLang = selectedMarkets[0]?.lang ?? null;
    navigate("/globalAssetCapture", {
      state: { projectName: derivedProjectName, content, type, lang: firstLang },
    });
  };

  return (
    <Container maxWidth="md" className="py-5">
      {/* Header Section */}
      <Box className="d-flex align-items-center mb-4">
        <IconButton className="me-2" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Import Content for Adaptation
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Configure target markets, languages, and channels
          </Typography>
        </Box>
      </Box>

      {/* Project Name Card (dynamic) */}
<Paper variant="outlined" className="p-4 mb-3">
  <div className="d-flex align-items-center flex-nowrap w-100">
    {/* Label */}
    <span className="text-secondary text-nowrap me-2">Project Name:</span>

    {isEditingName ? (
      <>
        {/* Wide input */}
        <input
          value={baseProjectName}
          onChange={(e) => setBaseProjectName(e.target.value)}
          placeholder="Enter project name..."
          className="form-control flex-grow-1"
          style={{ maxWidth: '60vw' }}  // increase box size; adjust as needed
        />

        {/* Save button on far right */}
        <button
          type="button"
          className="btn btn-outline-primary ms-auto d-inline-flex align-items-center"
          onClick={() => setIsEditingName(false)}
        >
          <CheckCircle size={16} className="me-1" />
          Save
        </button>
      </>
    ) : (
      <>
        {/* Name occupies space */}
        <span className="fw-semibold text-truncate" style={{ maxWidth: '60vw' }}>
          {derivedProjectName}
        </span>

        {/* Edit button on far right */}
        <button
          type="button"
          className="btn btn-link ms-auto d-inline-flex align-items-center text-decoration-none"
          onClick={() => setIsEditingName(true)}
        >
          <Edit2 size={16} className="me-1" />
          Edit
        </button>
      </>
    )}
  </div>
</Paper>
      {/* Strategic Context (dynamic content) */}
      <Accordion variant="outlined" className="mb-4 shadow-none" defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <strong>Strategic Context</strong>{" "}
            <small className="text-secondary ms-2">From Source Asset</small>
          </Typography>
        </AccordionSummary>
       
{/* 
<AccordionDetails>
  
  <pre
    style={{
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
      margin: 0,
      fontFamily: "inherit",
      color: "rgba(0,0,0,0.6)",
    }}
  >
    {content}
  </pre>
</AccordionDetails>
*/}

      </Accordion>

      {/* Target Markets Selection */}
      <Paper variant="outlined" className="p-4 mb-4">
        <Box className="d-flex align-items-center mb-1">
          <PublicIcon className="me-2" fontSize="small" />
          <Typography variant="h6">Target Markets</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" className="mb-4">
          Select markets for glocalization ({MARKET_DATA.length} supported)
        </Typography>

        <Box className="d-flex flex-column gap-2">
          {MARKET_DATA.map((market) => (
            <Box
              key={market.id}
              className="d-flex align-items-center justify-content-between p-2 border rounded"
              style={{ backgroundColor: selectedMarkets.some((m) => m.id === market.id) ? "#f8f9fa" : "white" }}
            >
              <Box className="d-flex align-items-center">
                <Checkbox
                  checked={selectedMarkets.some((m) => m.id === market.id)}
                  onChange={() => handleToggle(market)}
                  
                />
                <Typography className="ms-2 d-flex align-items-center">
                  <span className="me-2" style={{ fontSize: "1.2rem" }}>{market.flag}</span>
                  <strong>{market.name}</strong>
                  <span className="text-secondary ms-1">({market.lang})</span>
                </Typography>
              </Box>
              <Box className="d-flex align-items-center gap-4 me-3">
                <Chip
                  label={market.priority}
                  size="small"
                  color={market.priority === "High" ? "error" : "default"}
                  sx={{ width: 70, fontWeight: "bold" }}
                />
                <Typography variant="body2" color="textSecondary" className="d-flex align-items-center">
                  <i className="bi bi-clock me-1" />
                  {market.timeline}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Coming Soon Section */}
        <Box className="mt-4 pt-2">
          <Typography variant="caption" color="textSecondary" className="d-block mb-2">
            Coming Soon:
          </Typography>
          <Box className="d-flex flex-wrap gap-3">
            {COMING_SOON_DATA.map((item) => (
              <Box key={item.name} className="d-flex align-items-center" style={{ opacity: 0.6 }}>
                <span className="me-1" style={{ fontSize: "0.9rem" }}>{item.flag}</span>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.75rem" }}>
                  {item.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Auto-Configured Sections (Conditional) */}
      {selectedMarkets.length > 0 && (
        <Box className="d-flex flex-column gap-3 mb-4">
          <Paper variant="outlined" sx={{ bgcolor: "#f0f9f1", borderColor: "#c8e6c9" }} className="p-3">
            <Typography variant="caption" color="success.main" fontWeight="bold">
              Selected: {selectedMarkets.length} market
            </Typography>
            <Box className="mt-2 d-flex gap-2 flex-wrap">
              {selectedMarkets.map((m) => (
                <Chip
                  key={m.id}
                  label={`${m.flag} ${m.name}`}
                  size="small"
                  sx={{ bgcolor: "white", border: "1px solid #c8e6c9" }}
                />
              ))}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ bgcolor: "#f0f9f1", borderColor: "#c8e6c9" }} className="p-3">
            <Box className="d-flex align-items-center mb-1">
              <LanguageIcon fontSize="small" color="disabled" className="me-2" />
              <Typography variant="subtitle2" sx={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                Auto-Selected Languages
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary" className="mb-2 d-block">
              Automatically configured based on selected markets
            </Typography>
            <Box className="d-flex gap-2">
              {[...new Set(selectedMarkets.map((m) => m.lang))].map((lang) => (
                <Chip key={lang} label={lang} size="small" sx={{ bgcolor: "white", border: "1px solid #c8e6c9" }} />
              ))}
            </Box>
          </Paper>

          {/* <Paper variant="outlined" sx={{ bgcolor: "#f0f9f1", borderColor: "#c8e6c9" }} className="p-3">
            <Box className="d-flex align-items-center mb-1">
              <ChannelIcon fontSize="small" color="disabled" className="me-2" />
              <Typography variant="subtitle2" sx={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                Auto-Configured Channel
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary" className="mb-2 d-block">
              Based on source asset type: content_project
            </Typography>
            <Box>
              <Chip label="Email" size="small" sx={{ bgcolor: "white", border: "1px solid #c8e6c9" }} />
            </Box>
          </Paper> */}
        </Box>
      )}
      <Paper variant="outlined" sx={{ bgcolor: "#f0f9f1", borderColor: "#c8e6c9" }} className="p-3">
            <Box className="d-flex align-items-center mb-1">
              <ChannelIcon fontSize="small" color="disabled" className="me-2" />
              <Typography variant="subtitle2" sx={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                Auto-Configured Channel
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary" className="mb-2 d-block">
              Based on source asset type: {type}
            </Typography>
            <Badge variant="secondary" className="px-4 py-2 text-base">
            📧 {type}
          </Badge>
            {/* <Box>
              <Chip label="Email" size="small" sx={{ bgcolor: "white", border: "1px solid #c8e6c9" }} />
            </Box> */}
          </Paper>

      {/* Project Summary Section */}
      {selectedMarkets.length > 0 && (
      <Paper variant="outlined" sx={{ bgcolor: "#f8fbff", borderColor: "#e1f5fe" }} className="p-4 mb-4">
        <Typography variant="h6" className="mb-3" sx={{ fontSize: "1rem", fontWeight: "bold" }}>
          Project Summary
        </Typography>
        <Box className="d-flex flex-column gap-2">
          <Box className="d-flex justify-content-between">
            <Typography variant="body2" color="textSecondary">Target Markets:</Typography>
            <Typography variant="body2" fontWeight="bold">{selectedMarkets.length}</Typography>
          </Box>
          <Box className="d-flex justify-content-between">
            <Typography variant="body2" color="textSecondary">Languages:</Typography>
            <Typography variant="body2" fontWeight="bold">
              {[...new Set(selectedMarkets.map((m) => m.lang))].length}
            </Typography>
          </Box>
          <Box className="d-flex justify-content-between">
            <Typography variant="body2" color="textSecondary">Channel:</Typography>
            <Typography variant="body2" fontWeight="bold">{type}</Typography>
          </Box>
          <Divider className="my-2" />
          <Box className="d-flex justify-content-between align-items-center">
            <Typography variant="body1" fontWeight="bold">Est. Timeline:</Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">{estTimeline}</Typography>
          </Box>
        </Box>
      </Paper>
      )}

      {/* Footer Actions */}
      <Box className="d-flex justify-content-between align-items-center mt-5">
        <Button
          variant="text"
          color="inherit"
          sx={{ textTransform: "none", color: "#666" }}
          onClick={() => navigate(-1)}
        >
          Back to Assets
        </Button>
        <Button
          variant="contained"
          disableElevation
          endIcon={<ArrowForwardIcon />}
          disabled={selectedMarkets.length === 0}
          sx={{ textTransform: "none", px: 4, borderRadius: "8px" }}
          onClick={handleCreateProjectAndContinue}  
        >
          Create Project &amp; Continue
        </Button>
      </Box>
    </Container>
  );
};

export default AssetImportContext;