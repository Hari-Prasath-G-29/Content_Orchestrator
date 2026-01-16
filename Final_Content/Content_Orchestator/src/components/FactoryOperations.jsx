
import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import FactoryOutlinedIcon from '@mui/icons-material/FactoryOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

const FactoryOperations = () => {
  return (
    <div className="container-fluid page-wrap">
      <div className="container factory-page" style={{ maxWidth: '600px' }}>
        
        {/* Page Header */}
        <h2 className="factory-title">Factory Operations</h2>
        
        {/* Card */}
        <article className="factory-card">
          <div className="factory-card__inner">
            
            {/* Header */}
            <div className="factory-card__header">
              <span className="factory-card__icon">
                <FactoryOutlinedIcon sx={{ fontSize: 18 }} />
              </span>
              <h3 className="factory-card__heading">Factory Operations</h3>
            </div>

            {/* Central metric panel */}
            <div className="factory-card__panel">
              <p className="factory-card__panel-label">OPERATIONS METRICS</p>
              <span className="factory-card__panel-value">6</span>
              <p className="factory-card__panel-sub">Analytics modules</p>
            </div>

            {/* Bottom tiles */}
            <div className="factory-card__tiles">
              <div className="factory-tile">
                <p className="factory-tile__label">Lifecycle</p>
                <span className="factory-tile__value">42d</span>
              </div>
              <div className="factory-tile">
                <p className="factory-tile__label">Throughput</p>
                <span className="factory-tile__value">23</span>
              </div>
              <div className="factory-tile">
                <p className="factory-tile__label">Quality</p>
                <span className="factory-tile__value">78%</span>
              </div>
            </div>
          </div>
        </article>

        {/* Footer link */}
        <button type="button" className="factory-footer btn-link">
          <SettingsOutlinedIcon sx={{ fontSize: 20 }} />
          <span>System Administration</span>
        </button>

      </div>
    </div>
  );
};

export default FactoryOperations;

