import React from 'react'
import './styles/ChatHeader.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCog, faUserPlus, faUsers, faDoorOpen } from '@fortawesome/free-solid-svg-icons'

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

  const getUsername = (profile) => {
    return profile?.username || 'Unknown User';
  };

  const getAvatarUrl = (profile) => {
    return profile?.avatar_url || 'path/to/default/avatar.png'; // Provide a default avatar path
  };

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
          +
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
            <FontAwesomeIcon icon={faUserPlus} />
            New Direct Message
          </button>
          <button 
            className="action-menu-item"
            onClick={() => {
              setShowCreateGroup(true)
              setShowActionMenu(false)
            }}
          >
            <FontAwesomeIcon icon={faUsers} />
            New Group Chat
          </button>
        </div>
        <button 
          className="action-button"
          onClick={(e) => {
            e.stopPropagation()
            setShowSettingsMenu(!showSettingsMenu)
            setShowActionMenu(false)
          }}
          title="Settings"
        >
          <FontAwesomeIcon icon={faCog} />
        </button>
        <div 
          className={`settings-menu ${showSettingsMenu ? 'visible' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="action-menu-item" onClick={() => setShowProfileSettings(true)}>
            <FontAwesomeIcon icon={faUserPlus} />
            Profile Settings
          </button>
          <button className="action-menu-item" onClick={handleLogout}>
            <FontAwesomeIcon icon={faDoorOpen} />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatHeader 