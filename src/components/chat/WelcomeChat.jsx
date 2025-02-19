import React from 'react'
import './styles/WelcomeChat.css'

const WelcomeChat = () => {
  const currentFeatures = [
    { icon: 'realtime', text: 'Real-time messaging' },
    { icon: 'group', text: 'Group & direct chats' },
    { icon: 'mobile', text: 'Mobile responsive' },
    { icon: 'security', text: 'Secure conversations' }
  ]

  const upcomingFeatures = [
    { icon: 'file', text: 'File sharing & media' },
    { icon: 'reaction', text: 'Message reactions' },
    { icon: 'search', text: 'Search messages' },
    { icon: 'theme', text: 'Theme customization' }
  ]

  const renderFeatures = (features) => {
    return features.map((feature, index) => (
      <div className="feature" key={index}>
        <div className="feature-icon">
          <span className={`icon-${feature.icon}`}></span>
        </div>
        <span>{feature.text}</span>
      </div>
    ))
  }

  return (
    <div className="welcome-chat">
      <div className="welcome-chat-content">
        <div className="welcome-chat-icon"></div>
        
        <div className="welcome-header">
          <h1>Chat Dial Ra7a!</h1>
          <span className="beta-tag">BETA</span>
        </div>
        
        <p className="welcome-subtitle">Select a conversation to start messaging</p>
        
        <div className="feature-section">
          <h3>Current Features</h3>
          <div className="welcome-chat-features">
            {renderFeatures(currentFeatures)}
          </div>
        </div>

        <div className="feature-section">
          <h3>Coming Soon</h3>
          <div className="welcome-chat-features upcoming">
            {renderFeatures(upcomingFeatures)}
          </div>
        </div>

        <div className="version-info">
          <p>Version 0.1.0 Beta</p>
          <p className="update-note">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeChat 