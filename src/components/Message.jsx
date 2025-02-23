import React, { memo, useEffect, useRef, useState } from 'react'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import '../styles/message.css';

const Message = memo(({ message, currentUserId, onDelete, onEdit }) => {
  const supabase = useSupabase()
  const messageRef = useRef(null)
  const [showActions, setShowActions] = useState(false)
  const pressTimeoutRef = useRef(null)

  const isSentByMe = message.sender_id === currentUserId
  
  // Format message time
  const messageTime = React.useMemo(() => {
    const timestamp = message.created_at
    if (!timestamp) return ''

    const messageDate = new Date(timestamp)
    const now = new Date()
    const diff = now - messageDate
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }, [message.created_at])

  const handleTouchStart = (e) => {
    if (!isSentByMe) return;
    
    e.preventDefault();
    pressTimeoutRef.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  }

  const handleTouchEnd = () => {
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
    }
  }

  const handleMouseDown = (e) => {
    if (!isSentByMe) return;
    
    pressTimeoutRef.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  }

  const handleMouseUp = () => {
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
    }
  }

  const handleClickOutside = (event) => {
    if (messageRef.current && !messageRef.current.contains(event.target)) {
      setShowActions(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      if (pressTimeoutRef.current) {
        clearTimeout(pressTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={messageRef}
      className={`message-wrapper ${isSentByMe ? 'sent' : 'received'}`}
      style={{ position: 'relative' }}
    >
      {showActions && isSentByMe && (
        <div className="message-actions">
          <button onClick={(e) => {
            e.stopPropagation();
            onEdit(message);
            setShowActions(false);
          }}>
            <span className="action-icon">✎</span>
            Edit
          </button>
          <button onClick={(e) => {
            e.stopPropagation();
            onDelete(message.id);
            setShowActions(false);
          }}>
            <span className="action-icon">🗑️</span>
            Delete
          </button>
        </div>
      )}
      
      {!isSentByMe && (
        <div className="message-sender">
          {message.sender?.username || 'Unknown User'}
        </div>
      )}
      
      <div className="message">
        <div 
          className={`message-bubble ${isSentByMe ? 'sent-bubble' : 'received-bubble'}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          style={{ userSelect: 'none' }}
        > 
          <div className="message-content">
            <div className="message-text">{message.content}</div>
            <div className="message-time">{messageTime}</div>
          </div>
        </div>
      </div>
    </div>
  )
})

Message.displayName = 'Message'

export default Message 