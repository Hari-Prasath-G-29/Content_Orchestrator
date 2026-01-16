
import React from "react";
// Optional: Material UI icons (you can replace with emojis or SVGs if you prefer)
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import ShowChartOutlinedIcon from "@mui/icons-material/ShowChartOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
//import "./css/Glocalizationhub.css"
 import '../App.css'; 
import {
  Globe,
  Plus,
  RefreshCw,
  FileText,
  BarChart3,
  TrendingUp,
  CheckCircle,
  Clock,
  Target,
  Brain,
  Shield,
  Zap,
  Eye,
  Download,
  Upload,
  ArrowLeft
} from 'lucide-react';
import { Button } from "@mui/material";

import { useNavigate } from "react-router-dom";



const StatRow = ({ icon: Icon, label, value }) => (
  <div className="gh-stat-row">
    <div className="gh-stat-left">
      <span className="gh-stat-icon">
        {Icon ? <Icon fontSize="small" /> : null}
      </span>
      <span className="gh-stat-label">{label}</span>
    </div>
    <div className="gh-stat-value">{value}</div>
  </div>
);

const QuickTile = ({ children, disabled }) => (
  <button
    type="button"
    className={`gh-qa-tile ${disabled ? "gh-qa-tile--disabled" : ""}`}
    disabled={disabled}
  >
    {children}
  </button>
);

const AdaptCard = ({ title, category, domain, status = "In Progress" }) => (
  <article className="adapt-card">
    <div className="adapt-card__top">
      <h4 className="adapt-card__title">{title}</h4>
      <span className="adapt-card__chip">{status}</span>
    </div>
    <div className="adapt-card__meta">
      <span>{category}</span>
      <span className="dot">•</span>
      <span>{domain}</span>
    </div>
  </article>
);

export default function GlocalizationHub() {
  
const navigate = useNavigate();

  const handleImport = () => {
    // Navigate to the Import Content page
    navigate("/importContentPage");
  };

  return (
    <section className="glocal-hub">
      {/* Top bar */}
      <div className="gh-topbar">
        <div className="gh-titlegroup">
        <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="gh-title">Glocalization Hub</h1>
          <p className="gh-subtitle">4 active projects · 2 languages supported</p>
        </div>
        <div className="gh-actions">
          <button type="button" className="gh-btn gh-btn--ghost">
            <RefreshIcon fontSize="small" />
            <span>Refresh</span>
          </button>
          <button type="button" className="gh-btn gh-btn--primary">
            <AddIcon fontSize="small" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Stat list (rows with separators, like the second image) */}
      <div className="gh-stats">
        <StatRow
          label="Active Projects"
          value="4"
          icon={FileText}
        />
        <StatRow
          icon={Globe}
          label="Languages Supported"
          value="2"
        />
        <StatRow
          icon={Brain}
          label="Cultural Intelligence"
          value="0%"
        />
        <StatRow
          icon={TrendingUp}
          label="Adaptation Success"
          value="0%"
        />
      </div>

      {/* Quick Actions */}
      <div className="gh-qa">
        <h3 className="gh-section-title">Quick Actions</h3>

        <div className="gh-qa-row">
          <button className="gh-qa-tile gh-qa-tile--primary">
            <div className="gh-qa-content">
              <span className="gh-qa-icon">+</span>
              <span className="gh-qa-text">New Project</span>
            </div>
          </button>

           <button onClick={handleImport} className="gh-qa-tile gh-qa-tile--primary">
            <div className="gh-qa-content">
              <CloudUploadOutlinedIcon fontSize="small" />
              <span className="gh-qa-text">Import Content</span>
            </div>
          </button>

           <button className="gh-qa-tile gh-qa-tile--primary">
            <div className="gh-qa-content">
              <InsightsOutlinedIcon fontSize="small" />
              <span className="gh-qa-text">Cultural Analysis</span>
            </div>
          </button>

           <button className="gh-qa-tile gh-qa-tile--primary">
            <div className="gh-qa-content">
              <AssessmentOutlinedIcon fontSize="small" />
              <span className="gh-qa-text">View Reports</span>
            </div>
          </button>
        </div>
      </div>

      {/* In Progress Adaptations */}
      <div className="gh-list">
        <h3 className="gh-section-title">In Progress Adaptations</h3>
             <div className="gh-list-grid">
          <AdaptCard
            title="HCP Clinical Insights Email Campaign – DE Adaptation"
            category="Content"
            domain="Respiratory"
          />
          <AdaptCard
            title="HCP Clinical Insights Email Campaign – DE Adaptation"
            category="Content"
            domain="Respiratory"
          />
        </div>
      </div>
    </section>
  );
} 
