import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { supabase } from '../../supabaseClient'
import ChatHeader from './ChatHeader'
import ChatList from '../ChatList'
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

  const fetchChats = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      // First, get all chats the user is a member of with their full details
      const { data: userChats, error: chatsError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          chats!inner (
            id,
            name,
            is_group,
            created_at,
            created_by
          ),
          profiles!chat_members_user_id_fkey (
            id,
            username,
            avatar_url,
            status
          )
        `)
        .eq('user_id', profile.id)

      console.log('Initial user chats:', userChats)

      if (chatsError) {
        console.error('Error fetching chats:', chatsError)
        throw chatsError
      }

      if (!userChats || !Array.isArray(userChats)) {
        console.error('User chats data is not an array:', userChats)
        return
      }

      // Extract chat IDs
      const chatIds = userChats.map(chat => chat.chats.id)
      console.log('Chat IDs to fetch members for:', chatIds)

      // Fetch all members with their profiles for these chats
      const { data: allMembers, error: membersError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          user_id,
          profiles!chat_members_user_id_fkey (
            id,
            username,
            avatar_url,
            status
          )
        `)
        .in('chat_id', chatIds)

      if (membersError) {
        console.error('Error fetching members:', membersError)
        throw membersError
      }

      console.log('All members data:', allMembers)

      // Process and structure the data
      const processedChats = userChats.map(userChat => {
        const chat = userChat.chats
        
        // Get all members for this specific chat
        const chatMembers = allMembers
          .filter(member => member.chat_id === chat.id)
          .map(member => ({
            user_id: member.user_id,
            profiles: member.profiles
          }))

        console.log(`Members for chat ${chat.id}:`, chatMembers)

        return {
          ...chat,
          chat_members: chatMembers
        }
      })

      console.log('Final processed chats:', processedChats)
      
      dispatch({ type: 'SET_CHATS', payload: processedChats })
    } catch (error) {
      console.error('Error fetching chats:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load chats' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // Fetch chats when component mounts
  useEffect(() => {
    if (profile?.id) {
      fetchChats()
    }
  }, [profile?.id])

  const handleLogout = async () => {
    setShowSettingsMenu(false)
    if (onLogout) {
      await onLogout()
    }
  }

  // Close menus when clicking outside
  useEffect(() => {
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
          onChatSelect(chat)
          setIsSidebarOpen(false)
        }}
      />
    </div>
  )
}

export default ChatSidebar 