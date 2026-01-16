
import React from 'react';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TextSnippetOutlinedIcon from '@mui/icons-material/TextSnippetOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import '../App.css'; // keep this

const ContentWorkshopCard = () => {
  return (
    <div className="cw-card">
      {/* Header */}
      <div className="cw-header">
        <SmartToyOutlinedIcon className="cw-bot-icon" />
        <button className="cw-templates">
          <DescriptionOutlinedIcon fontSize="small" />
          <span>9+ Templates</span>
        </button>
      </div>

      {/* Title + Subtitle */}
      <h1 className="cw-title">Content Workshop</h1>
      <p className="cw-subtitle">
        Create content with intelligence-driven recommendations
      </p>

      {/* Status row */}
      <div className="cw-status">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="cw-pill">30</span>
          <span style={{ color: '#374151' }}>Active</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, color: '#111827' }}>0</span>
          <span>In Review</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, color: '#111827' }}>0</span>
          <span>Completed</span>
        </div>
      </div>

      {/* Primary CTA */}
      <button className="cw-primary">
        <SmartToyOutlinedIcon sx={{ fontSize: 24 }} />
        <span>Start Creating Content</span>
        <ArrowForwardIcon sx={{ fontSize: 24 }} />
      </button>

      {/* Secondary CTA */}
      <button className="cw-secondary">
        <TextSnippetOutlinedIcon />
        <span>Browse Templates</span>
      </button>

      {/* Floating bubble */}
      <div className="cw-floating">
        <ChatBubbleOutlineIcon sx={{ fontSize: 22 }} />
      </div>
    </div>
  );
};

export default ContentWorkshopCard;
