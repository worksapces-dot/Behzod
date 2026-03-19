/**
 * Behzod Chat Widget - Crisp Style
 * Vanilla JS recreation of Crisp chat interface
 */

(function() {
  'use strict';
  
  const WIDGET_API = window.BEHZOD_API_URL || window.location.origin;
  const AGENT_AVATAR_SEED = window.BEHZOD_AVATAR_SEED || 'behzod-blue';
  
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
        background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
        border: none;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(30, 136, 229, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        transition: all 0.3s ease;
        overflow: hidden;
      }
      
      #behzod-widget-button:hover { 
        transform: scale(1.05);
        box-shadow: 0 12px 32px rgba(30, 136, 229, 0.6);
      }
      
      #behzod-widget-container {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 450px;
        height: 700px;
        background: white;
        border-radius: 24px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        z-index: 999998;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      #behzod-widget-container.open { display: flex; }
      
      /* Header with tabs */
      .crisp-header {
        background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
        color: white;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        transition: all 0.3s ease;
        position: relative;
      }
      
      .crisp-header.minimized {
        padding: 12px 20px;
        gap: 0;
      }
      
      .crisp-header.minimized .crisp-team {
        display: none;
      }
      
      .crisp-header.minimized .crisp-tabs {
        justify-content: space-between;
      }
      
      .crisp-tabs {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.15);
        padding: 6px;
        border-radius: 28px;
        width: fit-content;
        margin: 0 auto;
      }
      
      .crisp-tab {
        padding: 8px 20px;
        border-radius: 22px;
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.85);
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.15s ease-out;
        user-select: none;
      }
      
      .crisp-tab:active {
        transform: scale(0.97);
      }
      
      .crisp-tab.active {
        background: linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0.25));
        color: white;
        box-shadow: 0 1px 2px rgba(0,0,0,0.3), inset 0 0.75px 0 rgba(255,255,255,0.3);
        border: 0.5px solid rgba(255,255,255,0.2);
      }
      
      .crisp-tab:hover:not(.active) {
        background: rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.95);
      }
      
      .crisp-close {
        position: absolute;
        right: 20px;
        top: 20px;
        background: rgba(0,0,0,0.15);
        border: 0.5px solid rgba(255,255,255,0.1);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease-out;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        user-select: none;
      }
      
      .crisp-close:hover {
        background: rgba(0,0,0,0.25);
        transform: translateY(-1px);
      }
      
      .crisp-close:active {
        transform: scale(0.97);
      }
      
      /* Team avatars */
      .crisp-team {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      
      .crisp-avatars {
        display: flex;
        gap: -8px;
      }
      
      .crisp-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.3);
        overflow: hidden;
        margin-left: -8px;
      }
      
      .crisp-avatar:first-child {
        margin-left: 0;
      }
      
      .crisp-hero {
        text-align: center;
      }
      
      .crisp-hero h2 {
        font-size: 22px;
        font-weight: 600;
        margin: 0 0 8px 0;
      }
      
      .crisp-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 14px;
        opacity: 0.95;
      }
      
      .crisp-status-dot {
        width: 8px;
        height: 8px;
        background: #4CAF50;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
      }
      
      /* Messages area */
      .crisp-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #F5F5F7;
      }
      
      .crisp-date {
        text-align: center;
        color: #9CA3AF;
        font-size: 13px;
        margin: 16px 0;
      }
      
      .crisp-message {
        margin-bottom: 16px;
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
      
      /* Bot messages - with avatar and name */
      .crisp-message.bot {
        display: flex;
        gap: 10px;
        align-items: flex-start;
      }
      
      .crisp-message.bot.thinking {
        opacity: 0.8;
      }
      
      .crisp-message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #E5E7EB;
        flex-shrink: 0;
        overflow: hidden;
      }
      
      .crisp-message-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-width: 75%;
      }
      
      .crisp-bot-name {
        color: #6B7280;
        font-size: 12px;
        font-weight: 600;
        padding-left: 2px;
      }
      
      /* Thinking indicator */
      .thinking-indicator {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.08);
      }
      
      .thinking-grid {
        display: inline-grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2px;
        width: 20px;
        height: 20px;
        filter: blur(1px);
      }
      
      .thinking-dot {
        width: 5px;
        height: 5px;
        background: #38bdf8;
        border-radius: 1px;
        opacity: 0.4;
        animation: thinkingStagger 1.4s ease-in-out infinite;
        box-shadow: 0 0 6px rgba(56, 189, 248, 0.6);
      }
      
      /* Frame pattern - outer ring animates */
      .thinking-dot:nth-child(1) { animation-delay: 0s; }
      .thinking-dot:nth-child(2) { animation-delay: 0.1s; }
      .thinking-dot:nth-child(3) { animation-delay: 0.2s; }
      .thinking-dot:nth-child(4) { animation-delay: 0.7s; }
      .thinking-dot:nth-child(5) { opacity: 0; animation: none; } /* center stays off */
      .thinking-dot:nth-child(6) { animation-delay: 0.3s; }
      .thinking-dot:nth-child(7) { animation-delay: 0.6s; }
      .thinking-dot:nth-child(8) { animation-delay: 0.5s; }
      .thinking-dot:nth-child(9) { animation-delay: 0.4s; }
      
      .thinking-text {
        color: #1F2937;
        font-size: 14px;
        font-weight: 500;
      }
      
      @keyframes thinkingStagger {
        0%, 100% { 
          opacity: 0.2;
          transform: scale(0.8);
        }
        20%, 80% { 
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @media (prefers-reduced-motion: reduce) {
        .thinking-grid {
          filter: none;
        }
        .thinking-dot {
          animation: none;
          opacity: 0.6;
        }
      }
      
      .crisp-message-content {
        display: inline-block;
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
        word-break: break-word;
      }
      
      .crisp-message.bot .crisp-message-content {
        background: white;
        color: #1F2937;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.08);
      }
      
      /* User messages - no avatar, right aligned */
      .crisp-message.user {
        display: flex;
        justify-content: flex-end;
      }
      
      .crisp-message.user .crisp-message-content {
        background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
        color: white;
        border-bottom-right-radius: 4px;
        box-shadow: 0 1px 2px rgba(30, 136, 229, 0.2);
        max-width: 75%;
      }
      
      .crisp-action-button {
        margin-top: 12px;
        padding: 12px 20px;
        background: #1F2937;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s;
      }
      
      .crisp-action-button:hover {
        background: #374151;
      }
      
      /* Input area */
      .crisp-input-area {
        padding: 16px 20px 20px 20px;
        background: white;
        border-top: 1px solid #E5E7EB;
      }
      
      .crisp-input-wrapper {
        position: relative;
        margin-bottom: 12px;
      }
      
      .crisp-input {
        width: 100%;
        padding: 14px 50px 14px 16px;
        border: 1px solid #E5E7EB;
        border-radius: 12px;
        font-size: 15px;
        outline: none;
        background: #F9FAFB;
        transition: all 0.2s;
      }
      
      .crisp-input:focus {
        background: white;
        border-color: #10B981;
      }
      
      .crisp-send-btn {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: transparent;
        border: none;
        color: #9CA3AF;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .crisp-send-btn:hover {
        background: #F3F4F6;
        color: #10B981;
      }
      
      .crisp-input-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .crisp-action-icons {
        display: flex;
        gap: 4px;
      }
      
      .crisp-action-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: transparent;
        border: none;
        color: #9CA3AF;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .crisp-action-icon:hover {
        background: #F3F4F6;
        color: #6B7280;
      }
      
      /* Emoji Picker */
      .emoji-picker {
        position: absolute;
        bottom: 60px;
        left: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        padding: 12px;
        display: none;
        width: 280px;
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
      }
      
      .emoji-picker::-webkit-scrollbar {
        width: 6px;
      }
      
      .emoji-picker::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .emoji-picker::-webkit-scrollbar-thumb {
        background: #D1D5DB;
        border-radius: 3px;
      }
      
      .emoji-picker::-webkit-scrollbar-thumb:hover {
        background: #9CA3AF;
      }
      
      .emoji-picker.show {
        display: block;
      }
      
      .emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
      }
      
      .emoji-item {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.2s;
      }
      
      .emoji-item:hover {
        background: #F3F4F6;
      }
      
      .crisp-branding {
        color: #9CA3AF;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .crisp-branding strong {
        color: #6B7280;
        font-weight: 600;
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
      <!-- Header with tabs -->
      <div class="crisp-header">
        <div class="crisp-tabs">
          <button class="crisp-tab active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Chat
          </button>
          <button class="crisp-tab">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Qo'llanma
          </button>
        </div>
        <button class="crisp-close" id="crisp-close">✕</button>
        
        <div class="crisp-team">
          <div class="crisp-avatars">
            <div class="crisp-avatar"></div>
            <div class="crisp-avatar"></div>
            <div class="crisp-avatar"></div>
            <div class="crisp-avatar"></div>
          </div>
          <div class="crisp-hero">
            <h2>Behzod bilan gaplashing! 😃</h2>
            <div class="crisp-status">
              <span class="crisp-status-dot"></span>
              <span><strong>Muammo bormi? Demak, men hali kerakman!?</strong></span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Messages -->
      <div class="crisp-messages" id="crisp-messages">
        <div class="crisp-date">Bugun</div>
        
        <div class="crisp-message bot">
          <div class="crisp-message-avatar"></div>
          <div class="crisp-message-wrapper">
            <div class="crisp-bot-name">Behzod bot</div>
            <div class="crisp-message-content">
              Assalomu alaykum! Men Behzod, sizga qanday yordam bera olaman? 👋
            </div>
          </div>
        </div>
      </div>
      
      <!-- Input area -->
      <div class="crisp-input-area">
        <div class="emoji-picker" id="emoji-picker">
          <div class="emoji-grid" id="emoji-grid"></div>
        </div>
        
        <div class="crisp-input-wrapper">
          <input 
            type="text" 
            class="crisp-input" 
            id="crisp-input"
            placeholder="Xabaringizni yozing..."
            autocomplete="off"
          />
          <button class="crisp-send-btn" id="crisp-send">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor"></polygon>
            </svg>
          </button>
        </div>
        
        <div class="crisp-input-actions">
          <div class="crisp-action-icons">
            <button class="crisp-action-icon" id="emoji-btn" title="Emoji">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
            </button>
            <button class="crisp-action-icon" title="Fayl biriktirish">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </button>
          </div>
          
          <div class="crisp-branding">
            Powered by <strong>Behzod AI</strong>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Load avatar library
  const avatarScript = document.createElement('script');
  avatarScript.src = `${WIDGET_API}/agent-avatar.js`;
  document.head.appendChild(avatarScript);
  
  avatarScript.onload = () => {
    const container = document.createElement('div');
    container.innerHTML = widgetHTML;
    document.body.appendChild(container);
    
    let userId = localStorage.getItem('behzod_user_id');
    if (!userId) {
      userId = 'web_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('behzod_user_id', userId);
    }
    
    // Add animated avatar to button
    const widgetButton = document.getElementById('behzod-widget-button');
    if (widgetButton && window.createAgentAvatar) {
      const buttonAvatar = window.createAgentAvatar(AGENT_AVATAR_SEED, 64, true);
      widgetButton.appendChild(buttonAvatar);
    }
    
    // Add avatars to header with different colors
    const avatarContainers = document.querySelectorAll('.crisp-avatar');
    if (window.createAgentAvatar) {
      const seeds = ['team-green', 'team-blue', 'team-yellow', 'team-purple'];
      avatarContainers.forEach((container, index) => {
        const avatar = window.createAgentAvatar(seeds[index], 56, true);
        container.appendChild(avatar);
      });
    }
    
    // Add bot avatar to first message
    const botAvatar = document.querySelector('.crisp-message.bot .crisp-message-avatar');
    if (botAvatar && window.createAgentAvatar) {
      const avatar = window.createAgentAvatar(AGENT_AVATAR_SEED, 32, true);
      botAvatar.appendChild(avatar);
    }
    
    const widgetContainer = document.getElementById('behzod-widget-container');
    const closeBtn = document.getElementById('crisp-close');
    const messagesContainer = document.getElementById('crisp-messages');
    const input = document.getElementById('crisp-input');
    const sendBtn = document.getElementById('crisp-send');
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    const emojiGrid = document.getElementById('emoji-grid');
    const header = document.querySelector('.crisp-header');
    
    // Minimize header when input is focused (for mobile)
    input.addEventListener('focus', () => {
      header.classList.add('minimized');
    });
    
    input.addEventListener('blur', () => {
      setTimeout(() => {
        header.classList.remove('minimized');
      }, 200);
    });
    
    // Popular emojis
    const emojis = [
      '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
      '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
      '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
      '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
      '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
      '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
      '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
      '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶',
      '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮',
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
      '🔥', '✨', '💫', '⭐', '🌟', '💯', '✅', '❌'
    ];
    
    // Populate emoji grid
    emojis.forEach(emoji => {
      const emojiItem = document.createElement('div');
      emojiItem.className = 'emoji-item';
      emojiItem.textContent = emoji;
      emojiItem.addEventListener('click', () => {
        input.value += emoji;
        input.focus();
        emojiPicker.classList.remove('show');
      });
      emojiGrid.appendChild(emojiItem);
    });
    
    // Toggle emoji picker
    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPicker.classList.toggle('show');
    });
    
    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
      if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.classList.remove('show');
      }
    });
    
    widgetButton.addEventListener('click', () => {
      widgetContainer.classList.toggle('open');
      if (widgetContainer.classList.contains('open')) {
        input.focus();
      }
    });
    
    closeBtn.addEventListener('click', () => {
      widgetContainer.classList.remove('open');
    });
    
    async function sendMessage() {
      const message = input.value.trim();
      if (!message) return;
      
      addMessage(message, 'user');
      input.value = '';
      sendBtn.disabled = true;
      
      // Show thinking indicator
      const thinkingId = addThinkingIndicator();
      
      try {
        const response = await fetch(`${WIDGET_API}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, message })
        });
        
        const data = await response.json();
        
        // Remove thinking indicator
        removeThinkingIndicator(thinkingId);
        
        if (data.error) {
          addMessage('Xatolik yuz berdi. Qaytadan urinib ko\'ring.', 'bot');
        } else {
          addMessage(data.response, 'bot');
        }
        
      } catch (error) {
        console.error('Chat error:', error);
        removeThinkingIndicator(thinkingId);
        addMessage('Xatolik yuz berdi. Qaytadan urinib ko\'ring.', 'bot');
      } finally {
        sendBtn.disabled = false;
        input.focus();
      }
    }
    
    function addThinkingIndicator() {
      const thinkingId = 'thinking-' + Date.now();
      const messageDiv = document.createElement('div');
      messageDiv.className = 'crisp-message bot thinking';
      messageDiv.id = thinkingId;
      
      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'crisp-message-avatar';
      if (window.createAgentAvatar) {
        const avatar = window.createAgentAvatar(AGENT_AVATAR_SEED, 32, true);
        avatarDiv.appendChild(avatar);
      }
      
      const wrapperDiv = document.createElement('div');
      wrapperDiv.className = 'crisp-message-wrapper';
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'crisp-message-content';
      contentDiv.style.background = 'transparent';
      contentDiv.style.boxShadow = 'none';
      contentDiv.style.padding = '0';
      contentDiv.innerHTML = `
        <div class="thinking-indicator">
          <div class="thinking-grid">
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
          </div>
          <span class="thinking-text">Thinking</span>
        </div>
      `;
      
      wrapperDiv.appendChild(contentDiv);
      messageDiv.appendChild(avatarDiv);
      messageDiv.appendChild(wrapperDiv);
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      return thinkingId;
    }
    
    function removeThinkingIndicator(thinkingId) {
      const thinkingElement = document.getElementById(thinkingId);
      if (thinkingElement) {
        thinkingElement.remove();
      }
    }
    
    function addMessage(text, sender) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `crisp-message ${sender}`;
      
      if (sender === 'user') {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'crisp-message-content';
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);
      } else {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'crisp-message-avatar';
        if (window.createAgentAvatar) {
          const avatar = window.createAgentAvatar(AGENT_AVATAR_SEED, 32, true);
          avatarDiv.appendChild(avatar);
        }
        
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'crisp-message-wrapper';
        wrapperDiv.innerHTML = `
          <div class="crisp-bot-name">Behzod bot</div>
          <div class="crisp-message-content">${escapeHtml(text)}</div>
        `;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(wrapperDiv);
      }
      
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    
    console.log('✅ Behzod Crisp-style widget loaded');
  };
})();
