
import React from 'react';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';

const DesignStudio = () => {
  return (
    <div className="design-card">
      {/* Header */}
      <div className="design-card__header">
        <span className="design-card__icon">
          <PaletteOutlinedIcon sx={{ fontSize: 18 }} />
        </span>
        <h3 className="design-card__title">Design Studio</h3>
      </div>

      {/* Badge */}
      <div className="design-card__badge-wrap">
        <span className="design-card__badge">9 Designs Ready</span>
      </div>

      {/* Description */}
      <p className="design-card__desc">
        Transform approved content into production-ready designs with automated brand compliance.
      </p>

      {/* Metrics Grid */}
      <div className="design-card__metrics">
        <div className="design-card__metric">
          <p className="design-card__label">DESIGNS READY</p>
          <span className="design-card__value">--</span>
        </div>
        <div className="design-card__metric">
          <p className="design-card__label">BRAND COMPLIANCE</p>
          <span className="design-card__value">--</span>
        </div>
        <div className="design-card__metric">
          <p className="design-card__label">MULTI-FORMAT</p>
          <span className="design-card__value">--</span>
        </div>
        <div className="design-card__metric">
          <p className="design-card__label">QUALITY SCORE</p>
          <span className="design-card__value">--</span>
        </div>
      </div>
       </div>
  );
};

export default DesignStudio;