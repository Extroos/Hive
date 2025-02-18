import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { supabase } from '../supabaseClient'
import Message from '../components/Message'
import MessageInput from '../components/MessageInput'
import CreateGroupChat from '../components/CreateGroupChat'
import CreateDirectChat from '../components/CreateDirectChat'
import ProfileSetup from '../components/ProfileSetup'
import ProfileSettings from '../components/ProfileSettings'
import ChatList from '../components/ChatList'
import { initMobileViewport } from '../utils/mobileUtils'
import '../styles/chat.css'
import '../styles/loading.css'

const REALTIME_CHANNEL = 'realtime_messages'

const useMessageScroll = (messages, selectedChat) => {
  const messagesEndRef = React.useRef(null)
  const scrollTimeout = React.useRef(null)

  const scrollToBottom = (smooth = true) => {
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current)
    }

    scrollTimeout.current = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'end'
        })
      }
    }, 100)
  }

  useEffect(() => {
    scrollToBottom(false) // Instant scroll on chat change
  }, [selectedChat])

  useEffect(() => {
    scrollToBottom() // Smooth scroll on new messages
  }, [messages])

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
    }
  }, [])

  return { messagesEndRef, scrollToBottom }
}

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

const Chat = () => {
  const [messages, setMessages] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [chats, setChats] = useState([])
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showCreateDirect, setShowCreateDirect] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [typingUsers, setTypingUsers] = useState({})
  const [loading, setLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user } = useSelector((state) => state.auth)
  const { profile } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const { messagesEndRef, scrollToBottom } = useMessageScroll(messages, selectedChat)

  // Initialize mobile viewport
  useEffect(() => {
    const cleanup = initMobileViewport();
    return cleanup;
  }, []);

  useEffect(() => {
    let subscription = null

    const initializeChat = async () => {
      if (user) {
        setLoading(true)
        await fetchProfile()
        await fetchChats()
        setLoading(false)
      }
    }

    initializeChat()

    return () => {
      if (subscription) {
        console.log('Unsubscribing from channel')
        supabase.removeChannel(subscription)
      }
    }
  }, [user])

  useEffect(() => {
    let subscription = null

    const setupSubscription = async () => {
      if (!user) return

      // Clean up existing subscription if any
      if (subscription) {
        console.log('Cleaning up existing subscription')
        await supabase.removeChannel(subscription)
      }

      console.log('Setting up new realtime subscription for user:', user.id)

      // Get all chat IDs the user is a member of
      const { data: memberChats } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id)

      const chatIds = memberChats?.map(chat => chat.chat_id) || []
      console.log('Subscribing to chats:', chatIds)

      subscription = supabase
        .channel('messages_and_profiles')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: chatIds.length > 0 ? `chat_id=in.(${chatIds.join(',')})` : undefined
          },
          (payload) => {
            console.log('🟢 New message INSERT event received:', {
              payload,
              currentChat: selectedChat,
              currentUser: user.id
            })
            handleNewMessage(payload)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: chatIds.length > 0 ? `chat_id=in.(${chatIds.join(',')})` : undefined
          },
          (payload) => {
            console.log('🔵 Message UPDATE event received:', payload)
            handleMessageUpdate(payload)
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'typing_indicators',
            filter: selectedChat ? `chat_id=eq.${selectedChat}` : undefined
          },
          (payload) => {
            console.log('⌨️ Typing indicator event received:', payload)
            handleTypingUpdate(payload)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles'
          },
          (payload) => {
            console.log('👤 Profile UPDATE event received:', payload)
            handleProfileUpdate(payload)
          }
        )
        .subscribe((status) => {
          console.log(`🔌 Subscription status changed to: ${status}`)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to real-time changes')
          }
        })
    }

    setupSubscription()

    return () => {
      if (subscription) {
        console.log('🔴 Cleaning up subscription on unmount')
        supabase.removeChannel(subscription)
      }
    }
  }, [user?.id, selectedChat])

  useEffect(() => {
    if (selectedChat) {
      fetchMessages()
      fetchTypingStatus()

      const typingInterval = setInterval(fetchTypingStatus, 3000)
      return () => clearInterval(typingInterval)
    }
  }, [selectedChat])

  const fetchProfile = async () => {
    try {
      if (!user) {
        console.error('No user found')
        return
      }

      // Try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                email: user.email,
                username: user.email.split('@')[0], // Temporary username from email
                has_completed_setup: false
              }
            ])
            .select()
            .single()

          if (createError) {
            console.error('Error creating profile:', createError)
            return
          }

          dispatch({ type: 'SET_PROFILE', payload: newProfile })
        } else {
          console.error('Error fetching profile:', fetchError)
          return
        }
      } else {
        dispatch({ type: 'SET_PROFILE', payload: existingProfile })
      }
    } catch (error) {
      console.error('Error in profile management:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchChats = async () => {
    try {
      if (!user) {
        console.error('No user found')
        return
      }

      setLoading(true)
      
      // First get the chats the user is a member of
      const { data: memberChats, error: memberError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      if (!memberChats.length) {
        setChats([])
        setLoading(false)
        return
      }

      // Then fetch the chat details with members and latest messages
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select(`
          id,
          name,
          is_group,
          created_at,
          created_by,
          messages!messages_chat_id_fkey (
            id,
            content,
            created_at,
            sender:profiles!messages_sender_id_fkey (
              id,
              username,
              avatar_url
            )
          ),
          chat_members (
            user_id,
            profiles (
              id,
              username,
              email,
              avatar_url,
              status,
              last_seen
            )
          )
        `)
        .in('id', memberChats.map(chat => chat.chat_id))
        .order('created_at', { ascending: false })

      if (chatError) throw chatError

      // Process the chat data
      const processedChats = chatData.map(chat => ({
        ...chat,
        profiles: chat.chat_members.map(member => member.profiles).filter(Boolean),
        messages: chat.messages || [],
        last_message: chat.messages?.[0]
      }))

      // Sort chats by latest message
      const sortedChats = processedChats.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at
        const bTime = b.last_message?.created_at || b.created_at
        return new Date(bTime) - new Date(aTime)
      })

      setChats(sortedChats)
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          reactions:message_reactions(*),
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .eq('chat_id', selectedChat)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      const processedMessages = data.map(message => ({
        ...message,
        sender: message.sender || { username: 'Unknown User' }
      }))

      setMessages(processedMessages)
    } catch (error) {
      console.error('Error in fetchMessages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTypingStatus = async () => {
    try {
      if (!selectedChat) return;

      // Get typing indicators from the last 10 seconds
      const threeSecondsAgo = new Date(Date.now() - 3000).toISOString()
      
      const { data, error } = await supabase
        .from('typing_indicators')
        .select('*, profiles(*)')
        .eq('chat_id', selectedChat.toString())
        .gt('updated_at', threeSecondsAgo)

      if (error) {
        console.error('Error fetching typing status:', error)
        return
      }

      const typing = {}
      data.forEach((indicator) => {
        if (indicator.user_id !== user.id) {
          typing[indicator.user_id] = indicator.profiles
        }
      })
      setTypingUsers(typing)
    } catch (error) {
      console.error('Error fetching typing status:', error)
    }
  }

  const handleNewMessage = async (payload) => {
    console.log('🎯 Starting to process new message:', {
      payload,
      selectedChat,
      userId: user.id
    })

    if (!payload.new) {
      console.log('❌ No new message data in payload')
      return
    }

    try {
      console.log('🔍 Fetching complete message data for id:', payload.new.id)
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .eq('id', payload.new.id)
        .single()

      if (messageError) {
        console.error('❌ Error fetching message details:', messageError)
        return
      }

      console.log('✅ Successfully fetched message data:', messageData)

      const processedMessage = {
        ...messageData,
        sender: messageData.sender || { username: 'Unknown User' }
      }

      // Update messages if it's for the selected chat
      if (payload.new.chat_id === selectedChat) {
        console.log('📝 Updating messages for current chat')
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg => msg.id === processedMessage.id)
          if (exists) {
            console.log('⚠️ Message already exists in state')
            return prev
          }
          
          console.log('✨ Adding new message to state')
          const updatedMessages = [...prev, processedMessage].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          )
          
          // Schedule a scroll after the state update
          requestAnimationFrame(() => {
            console.log('📜 Scrolling to bottom')
            scrollToBottom()
          })
          
          return updatedMessages
        })
      } else {
        console.log('📋 Message is for a different chat:', payload.new.chat_id)
      }

      // Always update the chats list with the new message
      console.log('🔄 Updating chats list')
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat.id === payload.new.chat_id) {
            console.log('📌 Updating chat:', chat.id)
            return {
              ...chat,
              messages: [processedMessage, ...(chat.messages || [])].slice(0, 50),
              last_message: processedMessage
            }
          }
          return chat
        })

        return updatedChats.sort((a, b) => {
          const aTime = a.last_message?.created_at || a.created_at
          const bTime = b.last_message?.created_at || b.created_at
          return new Date(bTime) - new Date(aTime)
        })
      })

      console.log('✅ Finished processing new message')
    } catch (error) {
      console.error('❌ Error processing new message:', error)
    }
  }

  const handleMessageUpdate = (payload) => {
    if (payload.new.chat_id === selectedChat) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
        )
      )
    }
  }

  const handleTypingUpdate = (payload) => {
    if (payload.new.chat_id === selectedChat && payload.new.user_id !== user.id) {
      setTypingUsers((prev) => ({
        ...prev,
        [payload.new.user_id]: payload.new.profiles
      }))

      setTimeout(() => {
        setTypingUsers((prev) => {
          const updated = { ...prev }
          delete updated[payload.new.user_id]
          return updated
        })
      }, 3000)
    }
  }

  const handleMessageSent = (message) => {
    setMessages((prev) => [...prev, message])
  }

  const handleTyping = async () => {
    if (!selectedChat) return
    
    try {
      const user = await supabase.auth.getUser()
      if (!user.data.user) return

      const { error } = await supabase
        .from('typing_indicators')
        .upsert({
          chat_id: selectedChat,
          user_id: user.data.user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'chat_id,user_id'
        })

      if (error) {
        console.error('Error updating typing status:', error)
      }
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  }

  const handleChatCreated = (chat) => {
    setChats((prev) => [chat, ...prev])
    setSelectedChat(chat.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'CLEAR_USER' })
  }

  const getChatName = (chat) => {
    if (!chat) return 'Unknown Chat'
    if (chat.is_group) return chat.name || 'Unnamed Group'
    const otherMember = chat.profiles?.find((p) => p?.id !== user?.id)
    return otherMember?.username || 'Unknown User'
  }

  const handleProfileUpdate = (payload) => {
    const updatedProfile = payload.new
    
    // Update chats list to reflect the new profile data
    setChats(prevChats => {
      return prevChats.map(chat => {
        // Update profiles in the chat
        const updatedProfiles = chat.profiles?.map(profile =>
          profile.id === updatedProfile.id ? { ...profile, ...updatedProfile } : profile
        )
        
        // Update messages that contain this user's profile
        const updatedMessages = chat.messages?.map(message => {
          if (message.sender?.id === updatedProfile.id) {
            return {
              ...message,
              sender: { ...message.sender, ...updatedProfile }
            }
          }
          return message
        })

        return {
          ...chat,
          profiles: updatedProfiles,
          messages: updatedMessages
        }
      })
    })

    // Update current messages if they contain the updated profile
    setMessages(prevMessages => {
      return prevMessages.map(message => {
        if (message.sender?.id === updatedProfile.id) {
          return {
            ...message,
            sender: { ...message.sender, ...updatedProfile }
          }
        }
        return message
      })
    })
  }

  if (!profile) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    )
  }

  if (!profile.has_completed_setup) {
    return <ProfileSetup user={user} onComplete={fetchProfile} />
  }

  return (
    <div className="chat-container">
      <button 
        className={`menu-button ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle menu"
      />
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay visible" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="user-profile" onClick={() => setShowProfileSettings(true)}>
            <div className="user-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} />
              ) : (
                profile?.username?.[0]?.toUpperCase() || '?'
              )}
              <div className={`status-indicator ${profile?.status || 'offline'}`}>
                <span className="status-tooltip">{profile?.status || 'offline'}</span>
              </div>
            </div>
            <div className="user-info">
              <h3>{profile?.username}</h3>
              <p className="user-status">
                <span className="status-icon">{getStatusIcon(profile?.status)}</span>
                {profile?.status || 'offline'}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button
              onClick={() => setShowCreateDirect(true)}
              className="create-direct-btn"
            >
              New Chat
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="create-group-btn"
            >
              New Group
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
        <ChatList 
          chats={chats}
          selectedChat={chats.find(chat => chat.id === selectedChat)}
          onChatSelect={(chat) => {
            setSelectedChat(chat.id);
            setIsSidebarOpen(false); // Close sidebar when chat is selected
          }}
        />
      </div>
      <div className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-messages">
              {messages.map((message) => (
                <Message
                  key={message?.id || Math.random()}
                  message={message}
                  currentUserId={user?.id}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
            {Object.keys(typingUsers).length > 0 && (
              <div className="typing-indicator">
                {Object.values(typingUsers)
                  .filter(Boolean)
                  .map((user) => user?.username || 'Someone')
                  .join(', ')}{' '}
                {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            <MessageInput
              chatId={selectedChat}
              onMessageSent={handleMessageSent}
              onTyping={handleTyping}
            />
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="welcome-content">
              <div className="app-logo" />
              <h1 className="welcome-title">Welcome to Ana O s7abi</h1>
              <p className="welcome-subtitle">
                Connect with friends, family, and colleagues through instant messaging, group chats, and seamless file sharing.
              </p>
            </div>
            <div className="welcome-features">
              <div className="feature-card">
                <div className="feature-icon">💬</div>
                <div className="feature-content">
                  <h3 className="feature-title">Direct Messages</h3>
                  <p className="feature-description">
                    Start private conversations with anyone in your network. Share messages, photos, and files securely.
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">👥</div>
                <div className="feature-content">
                  <h3 className="feature-title">Group Chats</h3>
                  <p className="feature-description">
                    Create groups for team collaboration, family circles, or friend gatherings. Keep everyone in the loop.
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <div className="feature-content">
                  <h3 className="feature-title">Secure Communication</h3>
                  <p className="feature-description">
                    Your conversations are protected with end-to-end encryption. Your privacy is our top priority.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showCreateGroup && (
        <CreateGroupChat
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={handleChatCreated}
        />
      )}
      {showCreateDirect && (
        <CreateDirectChat
          onClose={() => setShowCreateDirect(false)}
          onChatCreated={handleChatCreated}
        />
      )}
      {showProfileSettings && (
        <ProfileSettings
          onClose={() => setShowProfileSettings(false)}
        />
      )}
    </div>
  )
}

export default Chat 