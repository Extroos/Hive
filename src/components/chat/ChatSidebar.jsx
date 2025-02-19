import React, { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { supabase } from '../../supabaseClient'
import ChatHeader from './ChatHeader'
import ChatList from '../ChatList'
import CreateDirectChat from '../CreateDirectChat'
import CreateGroupChat from '../CreateGroupChat'
import ProfileSettings from '../ProfileSettings'
import './styles/ChatSidebar.css'

const ChatSidebar = ({ 
  onLogout, 
  selectedChat, 
  onChatSelect,
  isSidebarOpen,
  setIsSidebarOpen,
  chats,
  showCreateDirect,
  setShowCreateDirect,
  showCreateGroup,
  setShowCreateGroup,
  showProfileSettings,
  setShowProfileSettings,
  showActionMenu,
  setShowActionMenu,
  showSettingsMenu,
  setShowSettingsMenu,
  actionButtonRef,
  actionMenuRef
}) => {
  const dispatch = useDispatch()
  const { profile } = useSelector((state) => state.auth)

  // Fetch chats when component mounts
  useEffect(() => {
    const fetchChats = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true })
        
        const { data: chatMembers, error: membersError } = await supabase
          .from('chat_members')
          .select(`
            chat_id,
            chats (
              id,
              name,
              is_group,
              created_at,
              created_by,
              chat_members (
                user_id,
                profiles (
                  id,
                  username,
                  email,
                  avatar_url,
                  status
                )
              )
            )
          `)
          .eq('user_id', profile.id)

        if (membersError) throw membersError

        // Get the last message for each chat
        const chatsWithMessages = await Promise.all(
          chatMembers.map(async ({ chats: chat }) => {
            const { data: messages, error: messagesError } = await supabase
              .from('messages')
              .select('*')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1)

            if (messagesError) throw messagesError

            return {
              ...chat,
              last_message: messages[0] || null,
              profiles: chat.chat_members.map(member => member.profiles).filter(Boolean)
            }
          })
        )

        dispatch({ type: 'SET_CHATS', payload: chatsWithMessages })
      } catch (error) {
        console.error('Error fetching chats:', error)
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load chats' })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    if (profile?.id) {
      fetchChats()
    }
  }, [profile?.id, dispatch])

  const handleLogout = async () => {
    setShowSettingsMenu(false)
    if (onLogout) {
      await onLogout()
    }
  }

  // Close menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!actionButtonRef.current?.contains(event.target) &&
          !actionMenuRef.current?.contains(event.target)) {
        setShowActionMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <ChatHeader
        profile={profile}
        showProfileSettings={showProfileSettings}
        setShowProfileSettings={setShowProfileSettings}
        showActionMenu={showActionMenu}
        setShowActionMenu={setShowActionMenu}
        showSettingsMenu={showSettingsMenu}
        setShowSettingsMenu={setShowSettingsMenu}
        setShowCreateDirect={setShowCreateDirect}
        setShowCreateGroup={setShowCreateGroup}
        handleLogout={handleLogout}
        actionButtonRef={actionButtonRef}
        actionMenuRef={actionMenuRef}
        selectedChat={selectedChat}
      />
      
      <ChatList
        chats={chats}
        selectedChat={selectedChat}
        onChatSelect={(chat) => {
          onChatSelect(chat);
          setIsSidebarOpen(false);
        }}
      />

      {showCreateDirect && (
        <CreateDirectChat
          onClose={() => setShowCreateDirect(false)}
          onChatCreated={(chat) => {
            onChatSelect(chat)
            setShowCreateDirect(false)
          }}
        />
      )}

      {showCreateGroup && (
        <CreateGroupChat
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(chat) => {
            onChatSelect(chat)
            setShowCreateGroup(false)
          }}
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

export default ChatSidebar 