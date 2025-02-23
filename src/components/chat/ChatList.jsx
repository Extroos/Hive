const getChatName = (chat) => {
  if (!chat) {
    console.log('No chat object provided')
    return 'Unknown Chat'
  }

  console.log('Getting name for chat:', chat)

  if (chat.is_group) {
    return chat.name || 'Unnamed Group'
  }

  if (!chat.chat_members || !Array.isArray(chat.chat_members)) {
    console.log('No chat members found for chat:', chat.id)
    return 'Unknown User'
  }

  // Find the other member (not the current user)
  const otherMember = chat.chat_members.find(
    member => member.user_id !== profile.id
  )

  console.log('Other member found:', otherMember)

  if (!otherMember || !otherMember.profiles) {
    console.log('No profile found for other member')
    return 'Unknown User'
  }

  return otherMember.profiles.username || 'Unknown User'
}

const getChatAvatar = (chat) => {
  if (!chat) {
    return null
  }

  if (chat.is_group) {
    return '/group-avatar.png' // Default group avatar
  }

  if (!chat.chat_members || !Array.isArray(chat.chat_members)) {
    console.log('No chat members found for avatar:', chat.id)
    return null
  }

  // Find the other member (not the current user)
  const otherMember = chat.chat_members.find(
    member => member.user_id !== profile.id
  )

  if (!otherMember || !otherMember.profiles) {
    console.log('No profile found for other member avatar')
    return null
  }

  return otherMember.profiles.avatar_url || null
} 