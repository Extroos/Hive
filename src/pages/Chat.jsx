import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { supabase } from '../supabaseClient'
import Message from '../components/Message'
import MessageInput from '../components/MessageInput'
import CreateGroupChat from '../components/CreateGroupChat'
import CreateDirectChat from '../components/CreateDirectChat'
import ProfileSetup from '../components/ProfileSetup'
import ProfileSettings from '../components/ProfileSettings'
import ChatList from '../components/ChatList'
import mobileUtils from '../utils/mobileUtils'
import ChatSidebar from '../components/chat/ChatSidebar'
import ChatMessages from '../components/chat/ChatMessages'
import WelcomeChat from '../components/chat/WelcomeChat'
import Loading from '../components/Loading'
import '../styles/chat.css'
import '../styles/loading.css'

const REALTIME_CHANNEL = 'realtime_messages'

const useMessageScroll = (messages, selectedChat) => {
  const messagesEndRef = useRef(null)
  const scrollTimeout = useRef(null)
  const lastMessageRef = useRef(null)
  const isScrollingRef = useRef(false)

  const scrollToBottom = (smooth = true) => {
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current)
    }

    // Set scrolling flag
    isScrollingRef.current = true

    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        const chatMessages = document.querySelector('.chat-messages')
        if (chatMessages) {
          const scrollOptions = {
            behavior: smooth ? 'smooth' : 'auto',
            block: 'end',
          }
          
          messagesEndRef.current.scrollIntoView(scrollOptions)

          // Clear scrolling flag after animation
          scrollTimeout.current = setTimeout(() => {
            isScrollingRef.current = false
          }, smooth ? 300 : 0)
        }
      }
    })
  }

  // Scroll on chat change
  useEffect(() => {
    scrollToBottom(false)
    lastMessageRef.current = messages[messages.length - 1]?.id
  }, [selectedChat])

  // Scroll on new messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    
    // Only scroll if it's a new message
    if (lastMessage?.id !== lastMessageRef.current) {
      lastMessageRef.current = lastMessage?.id
      
      // Small delay to ensure content is rendered
      setTimeout(() => {
        scrollToBottom(true)
      }, 50)
    }
  }, [messages])

  // Cleanup
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
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const actionButtonRef = useRef(null)
  const actionMenuRef = useRef(null)
  const [status, setStatus] = useState(user?.status || 'offline')
  const [countdown, setCountdown] = useState(null)

  // Initialize mobile viewport
  useEffect(() => {
    const cleanup = mobileUtils.initMobileViewport();
    return cleanup;
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSidebarOpen && 
          !event.target.closest('.sidebar') && 
          !event.target.closest('.menu-button')) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isSidebarOpen]);

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

      try {
        // Clean up existing subscription if any
        if (subscription) {
          await supabase.removeChannel(subscription)
        }

        console.log('🔄 Setting up real-time subscription for user:', user.id)

        // Get all chat IDs the user is a member of
        const { data: memberChats, error: memberError } = await supabase
          .from('chat_members')
          .select('chat_id')
          .eq('user_id', user.id)

        if (memberError) {
          console.error('❌ Error fetching member chats:', memberError)
          return
        }

        const chatIds = memberChats?.map(chat => chat.chat_id) || []
        console.log('📱 Subscribing to chats:', chatIds)

        // Create a new subscription
        subscription = supabase
          .channel(`messages:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `chat_id=in.(${chatIds.join(',')})`
            },
            (payload) => {
              console.log('📨 Real-time message event received:', {
                event: payload.eventType,
                payload,
                timestamp: new Date().toISOString()
              })

              if (payload.eventType === 'INSERT') {
                handleNewMessage(payload)
              } else if (payload.eventType === 'UPDATE') {
                handleMessageUpdate(payload)
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'typing_indicators',
              filter: selectedChat ? `chat_id=eq.${selectedChat.id}` : undefined
            },
            handleTypingUpdate
          )
          .subscribe(async (status) => {
            console.log(`🔌 Subscription status:`, status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to real-time changes')
            } else if (status === 'CLOSED') {
              console.log('❌ Subscription closed')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Channel error')
            }
          })

        return () => {
          console.log('🔄 Cleaning up subscription')
          if (subscription) {
            supabase.removeChannel(subscription)
          }
        }
      } catch (error) {
        console.error('❌ Error in setupSubscription:', error)
      }
    }

    setupSubscription()
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
        console.error('No user found');
        return;
      }

      setLoading(true);
      
      // First get the chat IDs the user is a member of
      const { data: memberChats, error: memberError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching member chats:', memberError);
        return;
      }

      if (!memberChats?.length) {
        setChats([]);
        return;
      }

      const chatIds = memberChats.map(chat => chat.chat_id);

      // Then fetch basic chat information
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(`
          id,
          name,
          is_group,
          created_at,
          created_by
        `)
        .in('id', chatIds)
        .order('created_at', { ascending: false });

      if (chatsError) {
        console.error('Error fetching chats:', chatsError);
        return;
      }

      // Fetch members for each chat
      const chatsWithMembers = await Promise.all(
        chatsData.map(async (chat) => {
          const { data: members, error: membersError } = await supabase
            .from('chat_members')
            .select(`
              user_id,
              profiles (
                id,
                username,
                email,
                avatar_url,
                status
              )
            `)
            .eq('chat_id', chat.id);

          if (membersError) {
            console.error(`Error fetching members for chat ${chat.id}:`, membersError);
            return chat;
          }

          // Get the latest message for this chat
          const { data: latestMessage, error: messageError } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              sender:profiles!messages_sender_id_fkey (
                id,
                username,
                avatar_url
              )
            `)
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (messageError && messageError.code !== 'PGRST116') {
            console.error(`Error fetching latest message for chat ${chat.id}:`, messageError);
          }

          return {
            ...chat,
            profiles: members?.map(member => member.profiles).filter(Boolean) || [],
            last_message: latestMessage || null
          };
        })
      );

      // Sort chats by latest message
      const sortedChats = chatsWithMembers.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime) - new Date(aTime);
      });

      setChats(sortedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      if (!selectedChat?.id) return;
      
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
        .eq('chat_id', selectedChat.id)
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
      if (!selectedChat?.id) return;

      // Get typing indicators from the last 3 seconds
      const threeSecondsAgo = new Date(Date.now() - 3000).toISOString()
      
      const { data, error } = await supabase
        .from('typing_indicators')
        .select('*, profiles(*)')
        .eq('chat_id', selectedChat.id)
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
    console.log('🔵 RECEIVER - New message event received:', {
      messageId: payload.new.id,
      chatId: payload.new.chat_id,
      senderId: payload.new.sender_id,
      timestamp: new Date().toISOString()
    })

    try {
      // Check if message already exists in state
      const messageExists = messages.some(msg => msg.id === payload.new.id)
      if (messageExists) {
        console.log('🟡 RECEIVER - Message already exists, skipping:', payload.new.id)
        return
      }

      // Fetch the complete message data with sender information
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('id', payload.new.id)
        .single()

      if (messageError) {
        console.error('🔴 RECEIVER - Error fetching message details:', messageError)
        return
      }

      console.log('🟢 RECEIVER - Fetched full message data:', messageData)

      // Update messages if this is for the current chat
      if (selectedChat?.id === messageData.chat_id) {
        console.log('🟣 RECEIVER - Updating messages for current chat')
        // Update local state with deduplication
        setMessages(prevMessages => {
          // Check again for duplicates before adding
          if (prevMessages.some(msg => msg.id === messageData.id)) {
            return prevMessages
          }
          return [...prevMessages, messageData]
        })
        
        // Update Redux state
        dispatch({
          type: 'ADD_MESSAGE',
          payload: messageData
        })

        // Scroll to bottom
        scrollToBottom()

        // Update last message in chats list
        const updatedChat = {
          ...selectedChat,
          last_message: messageData
        }
        
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === messageData.chat_id ? updatedChat : chat
          )
        )
        
        dispatch({
          type: 'UPDATE_CHAT',
          payload: updatedChat
        })
      } else {
        console.log('🟡 RECEIVER - Message is for a different chat, updating unread count')
        // Update unread count for other chats
        const { data: chat } = await supabase
          .from('chats')
          .select('*')
          .eq('id', messageData.chat_id)
          .single()

        if (chat) {
          const updatedChat = {
            ...chat,
            last_message: messageData,
            unread_count: (chat.unread_count || 0) + 1
          }
          
          // Update local state
          setChats(prevChats => 
            prevChats.map(c => 
              c.id === messageData.chat_id ? updatedChat : c
            )
          )
          
          // Update Redux state
          dispatch({
            type: 'UPDATE_CHAT',
            payload: updatedChat
          })
        }
      }
    } catch (error) {
      console.error('🔴 RECEIVER - Error handling new message:', error)
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
    // Check if message already exists
    if (messages.some(msg => msg.id === message.id)) {
      console.log('🟡 SENDER - Message already exists, skipping:', message.id)
      return
    }

    console.log('🟢 SENDER - Adding new message to UI:', message.id)
    setMessages(prevMessages => [...prevMessages, message])
    scrollToBottom()
  }

  const handleTyping = async () => {
    if (!selectedChat?.id) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('typing_indicators')
        .upsert({
          chat_id: selectedChat.id,
          user_id: user.id,
          updated_at: new Date().toISOString()
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

  // Add click outside handler for action menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showActionMenu &&
        actionButtonRef.current &&
        actionMenuRef.current &&
        !actionButtonRef.current.contains(event.target) &&
        !actionMenuRef.current.contains(event.target)
      ) {
        setShowActionMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showActionMenu])

  const handleSidebarToggle = () => {
    setIsSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    const messagesContainer = document.querySelector('.chat-messages');

    const preventDefault = (e) => {
      e.preventDefault();
    };

    if (messagesContainer) {
      messagesContainer.addEventListener('touchmove', preventDefault, { passive: false });
    }

    return () => {
      if (messagesContainer) {
        messagesContainer.removeEventListener('touchmove', preventDefault);
      }
    };
  }, []);

  useEffect(() => {
    const setOnlineStatus = async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'online' })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating status to online:', error);
      }
    };

    const setOfflineStatus = async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'offline' })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating status to offline:', error);
      }
    };

    // Set user status to online when component mounts
    setOnlineStatus();

    // Start countdown timer when component unmounts
    return () => {
      setCountdown(120); // Set countdown to 120 seconds
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setOfflineStatus(); // Set status to offline after countdown
            return 0;
          }
          return prev - 1;
        });
      }, 1000); // Decrease countdown every second

      return () => clearInterval(timer); // Cleanup timer on unmount
    };
  }, [user.id]);

  // Effect to clear countdown if user returns
  useEffect(() => {
    if (countdown !== null) {
      clearTimeout(countdown);
      setCountdown(null); // Reset countdown if user returns
    }
  }, [selectedChat]); // You can adjust this dependency based on your logic

  useEffect(() => {
    const fetchProfile = async () => {
      // Fetch the user's profile to get the last status
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      // Set the status to the last known status
      if (profileData) {
        setStatus(profileData.status);
      }
    };

    fetchProfile();
  }, [user.id]);

  if (!profile) {
    return <Loading />
  }

  if (!profile.has_completed_setup) {
    return <ProfileSetup user={user} onComplete={fetchProfile} />
  }

  return (
    <div className="chat-container">
      <button 
        className={`menu-button ${isSidebarOpen ? 'open' : ''}`}
        onClick={handleSidebarToggle}
        aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
      >
        {isSidebarOpen ? "×" : "☰"}
      </button>
      
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <ChatSidebar
          selectedChat={selectedChat}
          onChatSelect={(chat) => {
            if (chat?.id) {
              setSelectedChat(chat);
              setIsSidebarOpen(false);
            }
          }}
          onLogout={handleLogout}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          chats={chats}
          showCreateDirect={showCreateDirect}
          setShowCreateDirect={setShowCreateDirect}
          showCreateGroup={showCreateGroup}
          setShowCreateGroup={setShowCreateGroup}
          showProfileSettings={showProfileSettings}
          setShowProfileSettings={setShowProfileSettings}
          showActionMenu={showActionMenu}
          setShowActionMenu={setShowActionMenu}
          showSettingsMenu={showSettingsMenu}
          setShowSettingsMenu={setShowSettingsMenu}
          actionButtonRef={actionButtonRef}
          actionMenuRef={actionMenuRef}
        />
      </div>

      <div className="chat-main">
        {selectedChat ? (
          <>
            <ChatMessages
              messages={messages}
              typingUsers={typingUsers}
              user={user}
              messagesEndRef={messagesEndRef}
            />
            <MessageInput
              chatId={selectedChat}
              onMessageSent={handleMessageSent}
              onTyping={handleTyping}
            />
          </>
        ) : (
          <WelcomeChat />
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