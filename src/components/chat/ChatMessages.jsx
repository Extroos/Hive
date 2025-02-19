import React from 'react'
import Message from '../Message'
import './styles/ChatMessages.css'

const ChatMessages = ({ 
  messages, 
  typingUsers, 
  user, 
  messagesEndRef
}) => {
  return (
    <div className="messages-container">
      <div className="chat-messages">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            currentUserId={user?.id}
          />
        ))}
        <div ref={messagesEndRef} />
        {Object.keys(typingUsers).length > 0 && (
          <div className="typing-indicator">
            <div className="typing-text">
              {Object.values(typingUsers)
                .filter(Boolean)
                .map(user => user.username || user.full_name || 'Someone')
                .join(', ')}{' '}
              {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing
              <span className="typing-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(ChatMessages) 