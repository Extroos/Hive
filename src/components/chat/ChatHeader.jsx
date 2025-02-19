import React from 'react'
import './styles/ChatHeader.css'

const getStatusIcon = (status) => {
  switch (status) {
    case 'online':
      return '🟢'
    case 'away':
      return '🟡'
    case 'busy':
      return '🔴'
    case 'offline':
    default:
      return '⚫'
  }
}

const ChatHeader = ({
  profile,
  showProfileSettings,
  setShowProfileSettings,
  showActionMenu,
  setShowActionMenu,
  showSettingsMenu,
  setShowSettingsMenu,
  setShowCreateDirect,
  setShowCreateGroup,
  handleLogout,
  actionButtonRef,
  actionMenuRef,
  selectedChat
}) => {
  // Close menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionButtonRef?.current && !actionButtonRef.current.contains(event.target) &&
          actionMenuRef?.current && !actionMenuRef.current.contains(event.target)) {
        setShowActionMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="sidebar-header">
      <div className="user-profile" onClick={() => setShowProfileSettings(true)}>
        <div className="user-avatar">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} />
          ) : (
            profile?.username?.[0]?.toUpperCase() || '?'
          )}
          <div className={`status-indicator ${profile?.status || 'offline'}`}>
            <div className="status-tooltip">{getStatusIcon(profile?.status)}</div>
          </div>
        </div>
        <div className="user-info">
          <h3>{profile?.username}</h3>
          <span className="user-status">{profile?.status || 'offline'}</span>
        </div>
      </div>
      <div className="header-actions">
        {selectedChat && (
          <>
            <button 
              ref={actionButtonRef}
              className="floating-action-button header-button"
              onClick={(e) => {
                e.stopPropagation()
                setShowActionMenu(!showActionMenu)
                setShowSettingsMenu(false)
              }}
              aria-label={showActionMenu ? 'Close menu' : 'Open menu'}
              title={showActionMenu ? 'Close menu' : 'Create new chat'}
            >
              {showActionMenu ? '×' : '+'}
            </button>
            <div 
              ref={actionMenuRef} 
              className={`action-menu ${showActionMenu ? 'visible' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="action-menu-item"
                onClick={() => {
                  setShowCreateDirect(true)
                  setShowActionMenu(false)
                }}
              >
                <span className="icon">👤</span>
                New Direct Message
              </button>
              <button 
                className="action-menu-item"
                onClick={() => {
                  setShowCreateGroup(true)
                  setShowActionMenu(false)
                }}
              >
                <span className="icon">👥</span>
                New Group Chat
              </button>
            </div>
          </>
        )}
        <button 
          className="action-button"
          onClick={(e) => {
            e.stopPropagation()
            setShowSettingsMenu(!showSettingsMenu)
            setShowActionMenu(false)
          }}
          title="Settings"
        >
          ⚙️
        </button>
        <div 
          className={`settings-menu ${showSettingsMenu ? 'visible' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="action-menu-item" onClick={() => setShowProfileSettings(true)}>
            <span className="icon">👤</span>
            Profile Settings
          </button>
          <button className="action-menu-item" onClick={handleLogout}>
            <span className="icon">🚪</span>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatHeader 