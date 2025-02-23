const initialState = {
  user: null,
  profile: null,
  loading: false,
  error: null,
}

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        error: null,
      }
    case 'SET_PROFILE':
      return {
        ...state,
        profile: action.payload,
      }
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: {
          ...state.profile,
          ...action.payload,
        },
      }
    case 'CLEAR_USER':
      return {
        ...state,
        user: null,
        profile: null,
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

export default authReducer 