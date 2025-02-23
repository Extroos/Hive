import React, { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import '../styles/messageInput.css'

const MessageInput = ({ chatId, onMessageSent, onTyping }) => {
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const lastTypingUpdateRef = useRef(0)
  const lastMessageRef = useRef('')
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const TYPING_DEBOUNCE = 1000 // 1 second debounce
  const TYPING_EXPIRY = 3000 // 3 seconds before typing indicator expires

  // Load draft message on component mount
  useEffect(() => {
    const draft = localStorage.getItem(`draft_${chatId}`)
    if (draft) {
      setMessage(draft)
    }
    return () => {
      // Save draft when component unmounts
      if (message.trim()) {
        localStorage.setItem(`draft_${chatId}`, message)
      } else {
        localStorage.removeItem(`draft_${chatId}`)
      }
    }
  }, [chatId])

  useEffect(() => {
    const handleFocus = () => setIsKeyboardVisible(true)
    const handleBlur = () => setIsKeyboardVisible(false)
    
    const input = fileInputRef.current
    if (input) {
      input.addEventListener('focus', handleFocus)
      input.addEventListener('blur', handleBlur)
    }

    return () => {
      if (input) {
        input.removeEventListener('focus', handleFocus)
        input.removeEventListener('blur', handleBlur)
      }
    }
  }, [])

  // Improved debounced typing indicator
  const debouncedTyping = useCallback(() => {
    const now = Date.now()
    
    // Only update if enough time has passed since last update
    if (now - lastTypingUpdateRef.current < TYPING_DEBOUNCE) {
      return
    }

    lastTypingUpdateRef.current = now

    const updateTypingStatus = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return

        await supabase
          .from('typing_indicators')
          .upsert({
            chat_id: typeof chatId === 'object' ? chatId.id : chatId,
            user_id: userData.user.id,
            updated_at: new Date().toISOString()
          })

        if (onTyping) onTyping()
      } catch (error) {
        console.error('Error updating typing status:', error)
      }
    }

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    updateTypingStatus()

    // Set timeout to clear typing status
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return

        await supabase
          .from('typing_indicators')
          .delete()
          .match({ 
            chat_id: typeof chatId === 'object' ? chatId.id : chatId,
            user_id: userData.user.id 
          })
      } catch (error) {
        console.error('Error clearing typing status:', error)
      }
      typingTimeoutRef.current = null
    }, TYPING_EXPIRY)
  }, [chatId, onTyping])

  // Handle file drop
  const handleDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      await handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    try {
      setUploading(true)
      setUploadProgress(0)

      // Validate file
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        throw new Error('File size should be less than 10MB')
      }

      const fileExt = file.name.split('.').pop()
      const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
      if (!allowedTypes.includes(fileExt.toLowerCase())) {
        throw new Error('Invalid file type')
      }

      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = `${chatId}/${fileName}`

      // Upload with progress tracking
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, {
          upsert: true,
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100)
          }
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath)

      // Create message with file
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          content: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'document',
          file_url: publicUrl,
          sender_id: (await supabase.auth.getUser()).data.user.id
        }])
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .single()

      if (messageError) throw messageError

      if (onMessageSent) {
        onMessageSent({
          ...messageData,
          sender: messageData.sender || { username: 'Unknown User' }
        })
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      // Show error to user (you can add a toast notification system here)
      alert(error.message || 'Failed to upload file')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && !uploading) return;
    if (!chatId?.id && !chatId) return; // Add validation for chatId

    try {
      console.log('🔵 SENDER - Starting to send message:', {
        content: message.trim(),
        chatId: typeof chatId === 'object' ? chatId.id : chatId,
        timestamp: new Date().toISOString()
      });

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const newMessage = {
        chat_id: typeof chatId === 'object' ? chatId.id : chatId,
        content: message.trim(),
        type: 'text',
        sender_id: userData.user.id
      };

      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([newMessage])
        .select(`*, sender:profiles!messages_sender_id_fkey(id, username, avatar_url)`) // Ensure sender info is included
        .single();

      if (messageError) throw messageError;

      console.log('🟢 SENDER - Message sent successfully:', messageData);

      // Clear input and draft
      setMessage('');
      localStorage.removeItem(`draft_${chatId}`);

      // Notify local UI of sent message
      if (onMessageSent) {
        onMessageSent({
          ...messageData,
          sender: messageData.sender || { username: 'Unknown User' }
        });
      }
    } catch (error) {
      console.error('🔴 SENDER - Error sending message:', error);
      setMessage(lastMessageRef.current);
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Send message on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const containerClasses = [
    'message-input-container',
    dragOver ? 'drag-over' : '',
    uploading ? 'uploading' : '',
    isKeyboardVisible ? 'keyboard-visible' : ''
  ].filter(Boolean).join(' ')

  return (
    <form 
      onSubmit={handleSubmit} 
      className={containerClasses}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e.target.files[0])}
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx"
      />
      <button
        type="button"
        className="attach-button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Attach file"
      >
        {uploading ? '📤' : '📎'}
      </button>
      <input
        type="text"
        value={message}
        onChange={(e) => {
          const newValue = e.target.value
          setMessage(newValue)
          
          // Only trigger typing indicator if there's actual content
          if (newValue.trim().length > 0) {
            debouncedTyping()
          }
          
          // Save draft
          localStorage.setItem(`draft_${chatId}`, newValue)
        }}
        onKeyDown={handleKeyDown}
        placeholder={uploading ? `Uploading... ${Math.round(uploadProgress)}%` : "Type a message..."}
        disabled={uploading}
      />
      <button 
        type="submit" 
        disabled={uploading || (!message.trim() && !uploading)}
        aria-label="Send message"
        title="Send message (Ctrl + Enter)"
      />
    </form>
  )
}

export default MessageInput 