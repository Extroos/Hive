const initialState = {
  messages: [],
  contacts: [],
  selectedChat: null,
  loading: false,
  error: null,
}

const chatReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
      }
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      }
    case 'SET_CONTACTS':
      return {
        ...state,
        contacts: action.payload,
      }
    case 'SET_SELECTED_CHAT':
      return {
        ...state,
        selectedChat: action.payload,
      }
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      }
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      }
    default:
      return state
  }
}

export default chatReducer 