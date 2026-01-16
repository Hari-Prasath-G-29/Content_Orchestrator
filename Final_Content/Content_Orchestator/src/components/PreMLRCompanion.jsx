
import React from 'react';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

const PreMLRCompanion = () => {
  return (
    <article className="mlr-card">
      <div className="mlr-card__inner">
        {/* Header */}
        <div className="mlr-card__header">
          <span className="mlr-card__icon">
            <ShieldOutlinedIcon sx={{ fontSize: 18 }} />
          </span>
          <h3 className="mlr-card__title">Pre-MLR Companion</h3>

          {/* Badge */}
          <span className="mlr-card__badge">44 Reviews Ready</span>
        </div>

        {/* Description */}
        <p className="mlr-card__desc">
          AI-powered compliance checking and intelligent review preparation before MLR submission.
        </p>

        {/* Metrics Grid (Empty Data for now) */}
        <div className="mlr-card__metrics">
          <div className="mlr-card__metric">
            <span className="mlr-card__label">REVIEWS READY</span>
            <span className="mlr-card__value">--</span>
          </div>

          <div className="mlr-card__metric">
            <span className="mlr-card__label">SUCCESS PREDICTION</span>
            <span className="mlr-card__value">
              -- {/* example: <span className="mlr-card__delta mlr-card__delta--up">+4%</span> */}
            </span>
          </div>

          <div className="mlr-card__metric">
            <span className="mlr-card__label">ISSUES FOUND</span>
            <span className="mlr-card__value">--</span>
          </div>

          <div className="mlr-card__metric">
            <span className="mlr-card__label">REVIEW TIME</span>
            <span className="mlr-card__value">
              -- {/* example: <span className="mlr-card__delta mlr-card__delta--down">-18%</span> */}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PreMLRCompanion;