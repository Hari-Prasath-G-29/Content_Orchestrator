
import React from 'react';
import { Link } from 'react-router-dom';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const GlocalizationFactory = () => {
  return (
    <Link
      to="/glocalizationHub"
      className="glocal-card glocal-card--link"
      aria-label="Open Quick Actions page"
    >
      <div className="glocal-card__inner">
        {/* Header with arrow */}
        <div className="glocal-card__header">
          <div className="glocal-card__head-left">
            <span className="glocal-card__icon">
              <LanguageOutlinedIcon sx={{ fontSize: 18 }} />
            </span>
            <h3 className="glocal-card__title">Glocalization Factory</h3>
          </div>
          <span className="glocal-card__arrow" aria-hidden="true">
            <ArrowForwardIcon fontSize="small" />
          </span>
        </div>

        {/* Badge */}
        <span className="glocal-card__badge">34 Active Projects</span>

        {/* Description */}
        <p className="glocal-card__desc">
          Scale content globally with AI translation, cultural adaptation, and regulatory compliance.
        </p>

        {/* Metrics */}
        <div className="glocal-card__metrics">
          <div className="glocal-card__metric">
            <span className="glocal-card__label">ACTIVE PROJECTS</span>
            <span className="glocal-card__value">--</span>
          </div>
          <div className="glocal-card__metric">
            <span className="glocal-card__label">LANGUAGES</span>
            <span className="glocal-card__value">--</span>
          </div>
          <div className="glocal-card__metric">
            <span className="glocal-card__label">CULTURAL SCORE</span>
            <span className="glocal-card__value">--</span>
          </div>
          <div className="glocal-card__metric">
            <span className="glocal-card__label">TM LEVERAGE</span>
            <span className="glocal-card__value">--</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default GlocalizationFactory;