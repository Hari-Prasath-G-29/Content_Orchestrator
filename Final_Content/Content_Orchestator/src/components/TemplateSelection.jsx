import React from 'react';
// Material UI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'; // The 'sparkle' icon
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'; // Conference Event
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined'; // Product Launch (Target look)
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'; // Awareness Campaign
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'; // HCP Education
 
const TemplateSelection = ({ onBack }) => {
  // Exact Cyan color matching your previous dashboard
  const themeColor = 'cyan-500'; 
  const hoverBorder = 'hover:border-cyan-500';
  const hoverText = 'group-hover:text-cyan-600';
 
  const scenarios = [
    { title: 'Conference Event', icon: <CalendarTodayOutlinedIcon fontSize="inherit" /> },
    { title: 'Product Launch', icon: <TrackChangesOutlinedIcon fontSize="inherit" /> },
    { title: 'Awareness Campaign', icon: <TrendingUpOutlinedIcon fontSize="inherit" /> },
    { title: 'HCP Education', icon: <PeopleOutlineIcon fontSize="inherit" /> },
  ];
 
  return (
    // Main Container - Matches the clean white look of the second screenshot
    <div className="bg-white rounded-[2rem] shadow-sm max-w-[800px] w-full font-sans border border-gray-100 overflow-hidden relative">
      
      {/* Header Bar */}
      <div className="flex items-center p-6 border-b border-gray-100">
        <button 
          onClick={onBack} 
          className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 28 }} />
        </button>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Content Workshop
        </h2>
      </div>
 
      <div className="p-8">
        
        {/* Subtitle */}
        <p className="text-gray-500 text-lg mb-8 font-medium">
          Describe what you need, and we'll match intelligence from your data
        </p>
 
        {/* Input Section */}
        <div className="mb-8">
          <label className="block text-gray-700 font-bold mb-3 text-lg">
            What's on your mind?
          </label>
          <textarea 
            className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all resize-none text-lg"
            rows="3"
            placeholder="Example: Event materials for upcoming HIV conference with ID specialists in Chicago..."
          />
        </div>
 
        {/* Match Intelligence Button */}
        <button className={`w-full bg-${themeColor} hover:bg-cyan-600 text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all duration-200 mb-10`}>
          <AutoAwesomeIcon /> 
          <span>Match Intelligence</span>
        </button>
 
        {/* Quick Start Scenarios */}
        <div>
          <h3 className="text-gray-600 font-bold text-lg mb-4">
            Quick Start Scenarios:
          </h3>
          
          {/* Grid Layout using Bootstrap row/col structure inside the component */}
          <div className="row g-4">
            {scenarios.map((item, index) => (
              <div key={index} className="col-md-3 col-6">
                <div className={`
                  group cursor-pointer 
                  h-full flex flex-col items-center justify-center text-center 
                  p-4 rounded-xl border border-gray-200 bg-white 
                  ${hoverBorder} hover:shadow-md hover:bg-cyan-50
                  transition-all duration-200
                `}>
                  {/* Icon Wrapper */}
                  <div className={`text-gray-400 text-4xl mb-3 ${hoverText} transition-colors`}>
                    {item.icon}
                  </div>
                  {/* Label */}
                  <span className={`text-gray-500 font-semibold text-sm ${hoverText} transition-colors leading-tight`}>
                    {item.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
 
      </div>
    </div>
  );
};
 
export default TemplateSelection;