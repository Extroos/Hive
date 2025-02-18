import { createStore, combineReducers } from 'redux'
import authReducer from './reducers/authReducer'
import chatReducer from './reducers/chatReducer'

const rootReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer
})

const store = createStore(rootReducer)

export default store 