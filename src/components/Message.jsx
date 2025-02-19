import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import { supabase } from '../supabaseClient'
import '../styles/message.css'
import { formatDistanceToNow } from 'date-fns'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡']

const Message = memo(({ message, currentUserId, onDelete, onEdit, onReact }) => {
  const [showReactions, setShowReactions] = useState(false)
  const [reactions, setReactions] = useState([])
  const [isVisible, setIsVisible] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const [isDeleting, setIsDeleting] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const messageRef = useRef(null)
  const editInputRef = useRef(null)
  const [showContext, setShowContext] = useState(false)
  const pressTimer = useRef(null)
  const touchStartPos = useRef({ x: 0, y: 0 })
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isSentByMe = message.sender_id === currentUserId
  const messageTime = new Date(message.created_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })

  useEffect(() => {
    if (message?.id) {
      fetchReactions()
    }
  }, [message?.id])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 50)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.setSelectionRange(
        editedContent.length,
        editedContent.length
      )
    }
  }, [isEditing])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (messageRef.current && !messageRef.current.contains(e.target)) {
        setShowContext(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside, { passive: true })

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  const handleTouchStart = (e) => {
    if (!isSentByMe || !isMobile) return

    // Store touch start position
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    }
    
    pressTimer.current = setTimeout(() => {
      setShowContext(true)
    }, 500)
  }

  const handleTouchMove = (e) => {
    if (!pressTimer.current) return

    // Calculate distance moved
    const deltaX = Math.abs(e.touches[0].clientX - touchStartPos.current.x)
    const deltaY = Math.abs(e.touches[0].clientY - touchStartPos.current.y)

    // If moved more than 10px, cancel long press
    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const handleTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const fetchReactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', message.id)

      if (error) throw error
      setReactions(data || [])
    } catch (error) {
      console.error('Error fetching reactions:', error)
    }
  }, [message.id])

  const handleReaction = async (reaction) => {
    try {
      const existingReaction = reactions.find(
        r => r.user_id === currentUserId && r.reaction === reaction
      )

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .match({ 
            message_id: message.id, 
            user_id: currentUserId,
            reaction 
          })

        if (error) throw error
      } else {
        // Add reaction
        const { error } = await supabase
          .from('message_reactions')
          .upsert([{
            message_id: message.id,
            user_id: currentUserId,
            reaction
          }])

        if (error) throw error
      }

      await fetchReactions()
      onReact(message.id, reaction)
    } catch (error) {
      console.error('Error managing reaction:', error)
    }
    setShowReactions(false)
  }

  const handleEdit = async () => {
    if (!isEditing) {
      setIsEditing(true)
      return
    }

    if (editedContent.trim() === message.content) {
      setIsEditing(false)
      return
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: editedContent.trim(),
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', message.id)

      if (error) throw error
      setIsEditing(false)
      onEdit(message.id, editedContent.trim())
    } catch (error) {
      console.error('Error editing message:', error)
      setEditedContent(message.content)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) return

    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', message.id)

      if (error) throw error
      onDelete(message.id)
    } catch (error) {
      console.error('Error deleting message:', error)
      setIsDeleting(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false)
      setEditedContent(message.content)
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    }
  }

  const renderMessageContent = () => {
    if (isEditing) {
      return (
        <textarea
          ref={editInputRef}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="message-edit-input"
          placeholder="Edit your message..."
          rows={1}
          style={{
            height: 'auto',
            minHeight: '24px'
          }}
        />
      )
    }

    switch (message.type) {
      case 'image':
        return (
          <div className={`message-image ${imageLoaded ? 'loaded' : ''}`}>
            {!imageLoaded && <div className="image-loading-placeholder" />}
            <img 
              src={message.file_url} 
              alt={message.content}
              onLoad={() => {
                setImageLoaded(true)
                // Force scroll to bottom when image loads
                const messagesContainer = document.querySelector('.chat-messages')
                if (messagesContainer) {
                  messagesContainer.scrollTop = messagesContainer.scrollHeight
                }
              }}
            />
            <span className="file-name">{message.content}</span>
          </div>
        )
      case 'document':
        return (
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="document-link"
          >
            📎 {message.content}
          </a>
        )
      default:
        return <div className="message-text">{message.content}</div>
    }
  }

  return (
    <div 
      ref={messageRef}
      className={`message ${isSentByMe ? 'sent' : 'received'} ${isVisible ? 'visible' : ''} ${isDeleting ? 'deleting' : ''} ${showContext ? 'show-context' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => {
        if (isSentByMe) {
          e.preventDefault()
          setShowContext(true)
        }
      }}
    >
      {!isSentByMe && (
        <div className="message-sender">
          {message.sender?.username || 'Unknown User'}
        </div>
      )}
      <div className="message-content-wrapper">
        <div 
          className="message-content"
          onClick={(e) => {
            if (showContext) {
              e.stopPropagation()
              setShowContext(false)
            }
          }}
        >
          {renderMessageContent()}
          <div className="message-time">
            {messageTime}
            {message.is_edited && <span className="edited-label">(edited)</span>}
          </div>
          {isSentByMe && message.type === 'text' && (
            <div className="message-actions">
              <button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEdit()
                }}
                className="action-button edit"
                title={isEditing ? "Save (Enter)" : "Edit message"}
              >
                ✎
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDelete()
                }}
                className="action-button delete"
                title="Delete message"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>
      {reactions.length > 0 && (
        <div className="message-reactions">
          {Object.entries(
            reactions.reduce((acc, r) => {
              acc[r.reaction] = (acc[r.reaction] || 0) + 1
              return acc
            }, {})
          ).map(([reaction, count]) => (
            <button
              key={reaction}
              className={`reaction ${
                reactions.some(r => r.user_id === currentUserId && r.reaction === reaction)
                  ? 'active'
                  : ''
              }`}
              onClick={() => handleReaction(reaction)}
              title={`${count} ${count === 1 ? 'reaction' : 'reactions'}`}
            >
              {reaction} {count > 1 && <span className="reaction-count">{count}</span>}
            </button>
          ))}
        </div>
      )}
      {showReactions && (
        <div className="reaction-picker">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction}
              onClick={() => handleReaction(reaction)}
              className={`reaction-button ${
                reactions.some(r => r.user_id === currentUserId && r.reaction === reaction)
                  ? 'active'
                  : ''
              }`}
            >
              {reaction}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

Message.displayName = 'Message'

export default Message 