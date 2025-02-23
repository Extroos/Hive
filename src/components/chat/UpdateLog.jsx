import React, { useState } from 'react';

const UpdateLog = ({ version, date, changes }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="update-entry">
      <div className="update-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="update-version">v{version}</span>
        <span className="update-date">{date}</span>
      </div>
      {isExpanded && (
        <ul className="update-changes">
          {changes.map((change, index) => (
            <li key={index}>{change}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UpdateLog;
