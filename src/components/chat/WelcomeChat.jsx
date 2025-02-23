import React from 'react'
import UpdateLogs from '../UpdateLogs'
import './styles/WelcomeChat.css'

const WelcomeChat = () => {
  return (
    <section className='wrapper'>
      <div className='hero'>
      </div>
      <div className='content'>
        <h1 className='h1--scalingSize' data-text='Welcome to Hive'>Welcome to Hive</h1>
        <span className='beta-tag'>BETA</span>
        <p className='welcome-subtitle'>Select a conversation to start messaging</p>
        <UpdateLogs />
      </div>
    </section>
  )
}

export default WelcomeChat 