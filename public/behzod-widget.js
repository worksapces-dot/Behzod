/**
 * Behzod Chat Widget - Embeddable Script
 * Usage: <script src="https://your-domain.com/behzod-widget.js"></script>
 */

(function() {
  'use strict';
  
  const WIDGET_API = window.BEHZOD_API_URL || window.location.origin;
  const AGENT_AVATAR_SEED = window.BEHZOD_AVATAR_SEED || 'behzod-blue';
  const SESSION_TOKEN_STORAGE_KEY = 'behzod_session_token';
  const USER_AVATAR_SEED = window.BEHZOD_USER_AVATAR_SEED || 'user-self';
  
  // Create widget HTML
  const widgetHTML = `
    <style>
      * { box-sizing: border-box; }
      
      #behzod-widget-button {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #10B981;
        border: none;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      }
      
      #behzod-widget-button canvas {
        width: 100%;
        height: 100%;
      }
      
      #behzod-widget-button:hover { 
        transform: scale(1.05);
        box-shadow: 0 12px 32px rgba(16, 185, 129, 0.6);
      }
      
      #behzod-widget-button:active {
        transform: scale(0.95);
      }
      
      #behzod-widget-container {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 400px;
        height: 650px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        z-index: 999998;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      #behzod-widget-container.open { display: flex; }
      
      .behzod-chat-header {
        background: #10B981;
        color: white;
        padding: 24px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      
      .behzod-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .behzod-avatar svg {
        width: 100%;
        height: 100%;
      }
      
      .behzod-header-info {
        flex: 1;
      }
      
      .behzod-chat-header h3 { 
        font-size: 18px; 
        font-weight: 600; 
        margin: 0;
        letter-spacing: -0.3px;
      }
      
      .behzod-chat-header p { 
        font-size: 14px; 
        opacity: 0.95; 
        margin: 6px 0 0 0;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
      }
      
      .behzod-status-dot {
        width: 10px;
        height: 10px;
        background: #10B981;
        border-radius: 50%;
        display: inline-block;
        position: relative;
        animation: pulse 2s infinite;
      }
      
      .behzod-status-dot::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        background: #10B981;
        border-radius: 50%;
        animation: ripple 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes ripple {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(2.5);
          opacity: 0;
        }
      }
      
      .behzod-close-btn {
        background: rgba(255,255,255,0.15);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      
      .behzod-close-btn:hover {
        background: rgba(255,255,255,0.25);
      }
      
      .behzod-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 24px 20px;
        background: #F5F5F7;
      }
      
      .behzod-chat-messages::-webkit-scrollbar {
        width: 6px;
      }
      
      .behzod-chat-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .behzod-chat-messages::-webkit-scrollbar-thumb {
        background: #D1D5DB;
        border-radius: 3px;
      }
      
      .behzod-message {
        margin-bottom: 20px;
        display: flex;
        gap: 10px;
        animation: messageSlide 0.3s ease-out;
      }
      
      @keyframes messageSlide {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .behzod-message.user { 
        flex-direction: row-reverse; 
      }
      
      .behzod-message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #10B981;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      }
      
      .behzod-message-avatar svg {
        width: 100%;
        height: 100%;
      }
      
      .behzod-message.user .behzod-message-avatar {
        background: #6B7280;
      }
      
      .behzod-message-content {
        max-width: 75%;
        padding: 14px 18px;
        border-radius: 20px;
        font-size: 15px;
        line-height: 1.6;
        word-wrap: break-word;
      }
      
      .behzod-message.bot .behzod-message-content {
        background: white;
        color: #1F2937;
        border-bottom-left-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      
      .behzod-message.user .behzod-message-content {
        background: #10B981;
        color: white;
        border-bottom-right-radius: 6px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
      
      .behzod-typing-indicator {
        display: none;
        padding: 12px 16px;
        background: white;
        border-radius: 18px;
        border-bottom-left-radius: 6px;
        width: fit-content;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        margin-left: 42px;
      }
      
      .behzod-typing-indicator.show { 
        display: flex;
        gap: 4px;
        align-items: center;
      }
      
      .behzod-typing-indicator span {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #9CA3AF;
        animation: behzod-typing 1.4s infinite;
      }
      
      .behzod-typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
      .behzod-typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
      
      @keyframes behzod-typing {
        0%, 60%, 100% { 
          transform: translateY(0);
          opacity: 0.4;
        }
        30% { 
          transform: translateY(-8px);
          opacity: 1;
        }
      }
      
      .behzod-chat-input {
        padding: 20px;
        background: white;
        border-top: none;
        display: flex;
        gap: 12px;
        align-items: center;
      }
      
      .behzod-input-wrapper {
        flex: 1;
        position: relative;
      }
      
      .behzod-chat-input input {
        width: 100%;
        padding: 16px 24px;
        border: 2px solid #10B981;
        border-radius: 30px;
        font-size: 15px;
        outline: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: white;
        color: #1F2937;
      }
      
      .behzod-chat-input input:focus { 
        border-color: #10B981;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
        transform: translateY(-1px);
      }
      
      .behzod-chat-input input::placeholder {
        color: #9CA3AF;
      }
      
      .behzod-chat-input button {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #10B981;
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }
      
      .behzod-chat-input button:hover {
        background: #059669;
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
      }
      
      .behzod-chat-input button:active {
        transform: scale(0.95);
      }
      
      .behzod-chat-input button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: scale(1);
      }
      
      @media (max-width: 480px) {
        #behzod-widget-container {
          width: calc(100vw - 40px);
          height: calc(100vh - 120px);
        }
      }
    </style>
    
    <button id="behzod-widget-button" aria-label="Open chat"></button>

    <div id="behzod-widget-container">
      <div class="behzod-chat-header">
        <div class="behzod-avatar"></div>
        <div class="behzod-header-info">
          <h3>Behzod</h3>
          <p><span class="behzod-status-dot"></span>Onlayn</p>
        </div>
        <button class="behzod-close-btn" id="behzod-close-chat">✕</button>
      </div>
      
      <div class="behzod-chat-messages" id="behzod-chat-messages">
        <div class="behzod-message bot">
          <div class="behzod-message-avatar"></div>
          <div class="behzod-message-content">
            Assalomu alaykum! Men Behzod, sizga qanday yordam bera olaman? 👋
          </div>
        </div>
      </div>
      
      <div class="behzod-typing-indicator" id="behzod-typing-indicator">
        <span></span><span></span><span></span>
      </div>
      
      <div class="behzod-chat-input">
        <div class="behzod-input-wrapper">
          <input 
            type="text" 
            id="behzod-chat-input" 
            placeholder="Xabar yozing..."
            autocomplete="off"
          />
        </div>
        <button id="behzod-send-btn" aria-label="Send message">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white"></polygon>
          </svg>
        </button>
      </div>
    </div>
  `;
  
  // Load agent avatar library
  const avatarScript = document.createElement('script');
  avatarScript.src = `${WIDGET_API}/agent-avatar.js`;
  document.head.appendChild(avatarScript);
  
  // Wait for avatar library to load
  avatarScript.onload = () => {
    // Inject widget into page
    const container = document.createElement('div');
    container.innerHTML = widgetHTML;
    document.body.appendChild(container);
    
    let sessionToken = localStorage.getItem(SESSION_TOKEN_STORAGE_KEY) || '';

    async function getSessionToken(forceRefresh = false) {
      if (sessionToken && !forceRefresh) {
        return sessionToken;
      }

      const headers = {};
      if (sessionToken) {
        headers['X-Session-Token'] = sessionToken;
      }

      const response = await fetch(`${WIDGET_API}/api/chat/session`, { headers });
      const data = await response.json();

      if (!response.ok || !data.sessionToken) {
        throw new Error(data.error || 'Failed to initialize chat session');
      }

      sessionToken = data.sessionToken;
      localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
      return sessionToken;
    }
    
    // Add animated avatar to button
    const widgetButton = document.getElementById('behzod-widget-button');
    if (widgetButton && window.createAgentAvatar) {
      const buttonAvatar = window.createAgentAvatar(AGENT_AVATAR_SEED, 64, true);
      widgetButton.appendChild(buttonAvatar);
    }
    
    // Update header avatar
    const headerAvatar = document.querySelector('.behzod-avatar');
    if (headerAvatar && window.createAgentAvatar) {
      const avatar = window.createAgentAvatar(AGENT_AVATAR_SEED, 48, true);
      headerAvatar.appendChild(avatar);
    }
    
    // Update initial bot message avatar
    const initialBotAvatar = document.querySelector('.behzod-message.bot .behzod-message-avatar');
    if (initialBotAvatar && window.createAgentAvatar) {
      const avatar = window.createAgentAvatar(AGENT_AVATAR_SEED, 32, true);
      initialBotAvatar.appendChild(avatar);
    }
    // Get DOM elements
    const widgetContainer = document.getElementById('behzod-widget-container');
    const closeBtn = document.getElementById('behzod-close-chat');
    const chatMessages = document.getElementById('behzod-chat-messages');
    const chatInput = document.getElementById('behzod-chat-input');
    const sendBtn = document.getElementById('behzod-send-btn');
    const typingIndicator = document.getElementById('behzod-typing-indicator');
    
    // Toggle chat
    widgetButton.addEventListener('click', () => {
      widgetContainer.classList.toggle('open');
      if (widgetContainer.classList.contains('open')) {
        chatInput.focus();
      }
    });
    
    closeBtn.addEventListener('click', () => {
      widgetContainer.classList.remove('open');
    });
    
    // Send message
    async function sendMessage() {
      const message = chatInput.value.trim();
      if (!message) return;
      
      addMessage(message, 'user');
      chatInput.value = '';
      sendBtn.disabled = true;
      
      typingIndicator.classList.add('show');
      scrollToBottom();
      
      try {
        let token = await getSessionToken();
        let response = await fetch(`${WIDGET_API}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: token, message })
        });

        if (response.status === 401) {
          token = await getSessionToken(true);
          response = await fetch(`${WIDGET_API}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: token, message })
          });
        }
        
        const data = await response.json();
        
        typingIndicator.classList.remove('show');
        
        if (data.error) {
          addMessage('Xatolik yuz berdi. Qaytadan urinib ko\'ring.', 'bot');
        } else {
          addMessage(data.response, 'bot');
        }
        
      } catch (error) {
        console.error('Behzod chat error:', error);
        typingIndicator.classList.remove('show');
        addMessage('Xatolik yuz berdi. Qaytadan urinib ko\'ring.', 'bot');
      } finally {
        sendBtn.disabled = false;
        chatInput.focus();
      }
    }
    
    function addMessage(text, sender) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `behzod-message ${sender}`;
      
      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'behzod-message-avatar';
      
      if (sender === 'bot' && window.createAgentAvatar) {
        const avatar = window.createAgentAvatar(AGENT_AVATAR_SEED, 32, true);
        avatarDiv.appendChild(avatar);
      } else if (sender === 'user' && window.createAgentAvatar) {
        const avatar = window.createAgentAvatar(USER_AVATAR_SEED, 32, true);
        avatarDiv.appendChild(avatar);
      }
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'behzod-message-content';
      contentDiv.innerHTML = escapeHtml(text);
      
      messageDiv.appendChild(avatarDiv);
      messageDiv.appendChild(contentDiv);
      chatMessages.appendChild(messageDiv);
      scrollToBottom();
    }
    
    function scrollToBottom() {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    
    console.log('✅ Behzod chat widget loaded with animated avatars');
  };
})();
