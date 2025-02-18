import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import { supabase } from '../supabaseClient'
import '../styles/message.css'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡']

const Message = memo(({ message, currentUserId }) => {
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
  const isMobile = window.innerWidth <= 768
  const isSentByMe = message.sender_id === currentUserId
  const messageTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
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
    const handlePressStart = (e) => {
      if (!isMobile || message.type !== 'text' || !isSentByMe) return
      pressTimer.current = setTimeout(() => {
        setShowContext(true)
      }, 500)
    }

    const handlePressEnd = () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current)
        pressTimer.current = null
      }
    }

    const handleClickOutside = (e) => {
      if (showContext && !messageRef.current?.contains(e.target)) {
        setShowContext(false)
      }
    }

    const element = messageRef.current
    if (element) {
      element.addEventListener('mousedown', handlePressStart, { passive: false })
      element.addEventListener('touchstart', handlePressStart, { passive: false })
      element.addEventListener('mouseup', handlePressEnd)
      element.addEventListener('mouseleave', handlePressEnd)
      element.addEventListener('touchend', handlePressEnd)
      element.addEventListener('touchcancel', handlePressEnd)
      element.addEventListener('contextmenu', (e) => {
        if (isMobile && isSentByMe) {
          e.preventDefault()
          setShowContext(true)
        }
      })
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('touchend', handleClickOutside)

    return () => {
      if (element) {
        element.removeEventListener('mousedown', handlePressStart)
        element.removeEventListener('touchstart', handlePressStart)
        element.removeEventListener('mouseup', handlePressEnd)
        element.removeEventListener('mouseleave', handlePressEnd)
        element.removeEventListener('touchend', handlePressEnd)
        element.removeEventListener('touchcancel', handlePressEnd)
        element.removeEventListener('contextmenu', handlePressStart)
      }
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('touchend', handleClickOutside)
      if (pressTimer.current) {
        clearTimeout(pressTimer.current)
      }
    }
  }, [isMobile, message.type, showContext, isSentByMe])

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
    >
      {!isSentByMe && (
        <div className="message-sender">
          {message.sender?.username || 'Unknown User'}
        </div>
      )}
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