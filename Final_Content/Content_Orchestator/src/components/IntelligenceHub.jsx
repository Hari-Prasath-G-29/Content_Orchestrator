
import React from 'react';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import '../App.css'; // keep this import so CSS applies

export default function IntelligenceHub() {
  return (
    <main className="intel-page">
      {/* Add the outlined variant + (optional) exact 2rem rounding */}
      <section className="intel-card intel-card--outlined rounded-2rem">
        <div className="intel-card__header">
          <PsychologyIcon className="intel-card__logo" />
          <ArrowForwardIcon className="intel-card__arrow" />
        </div>

        <h1 className="intel-card__title">Intelligence Hub</h1>
        <p className="intel-card__subtitle">
          Unified view of all your brand intelligence insights
        </p>

        <ul className="intel-card__list">
          <li><PeopleOutlineIcon className="list-icon" /> Audience Insights</li>
          <li><TrackChangesIcon className="list-icon" /> Content Performance</li>
          <li><EqualizerIcon className="list-icon" /> Competitive Analysis</li>
        </ul>

        <div className="intel-actions">
          <button className="intel-card__cta">View Intelligence</button>
        </div>
      </section>
    </main>
  );
}

