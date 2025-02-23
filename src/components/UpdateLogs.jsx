import React, { useState } from 'react';
import { updateLogs } from '../data/updateLogs';
import '../styles/updateLogs.css'; // Create this CSS file for styling

const UpdateLogs = () => {
  return (
    <div className="update-logs-container">
      <h2 className="update-logs-title">Update Logs</h2>
      {updateLogs.map((log) => (
        <UpdateLogEntry key={log.version} log={log} />
      ))}
    </div>
  );
};

const UpdateLogEntry = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="update-log">
      <div className="update-log-header" onClick={toggleExpand} style={{ cursor: 'pointer' }}>
        <h3 className="update-log-version">
          Version {log.version} - {log.date}
        </h3>
        <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
      </div>
      {isExpanded && (
        <div className="update-log-changes">
          <p className="update-log-type">{log.type}</p>
          {log.changes.map((change, index) => (
            <div key={index} className="update-log-change">
              <h4 className="change-title">{change.title}</h4>
              <ul className="change-details">
                {change.details.map((detail, idx) => (
                  <li key={idx} className="change-detail">{detail}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpdateLogs; 