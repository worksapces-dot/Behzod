/**
 * Behzod Chat Widget - Crisp Style
 * Vanilla JS recreation of Crisp chat interface
 */

(function() {
  'use strict';
  
  const WIDGET_API = window.BEHZOD_API_URL || window.location.origin;
  const AGENT_AVATAR_SEED = window.BEHZOD_AVATAR_SEED || 'behzod-blue';
  const SESSION_TOKEN_STORAGE_KEY = 'behzod_session_token';
  const LIVEKIT_CLIENT_URLS = window.BEHZOD_LIVEKIT_CLIENT_URL
    ? [window.BEHZOD_LIVEKIT_CLIENT_URL]
    : [
        `${WIDGET_API}/livekit-client.umd.js`,
        'https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.js',
        'https://unpkg.com/livekit-client/dist/livekit-client.umd.js'
      ];
  const LIVEKIT_ROOM = window.BEHZOD_LIVEKIT_ROOM || '';
  
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
      
      .crisp-view {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      
      .crisp-view.hidden { display: none; }
      
      /* Header with tabs */
      .crisp-header {
        background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
        color: white;
        padding: 22px 20px 18px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        transition: all 0.3s ease;
        position: relative;
        isolation: isolate;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.22);
      }

      .crisp-header::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0.22;
        background-image:
          url("data:image/svg+xml,%3Csvg width='220' height='140' viewBox='0 0 220 140' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M22 18L46 30' stroke='%230B4BA8' stroke-width='1.5' stroke-linecap='round'/%3E%3Cpath d='M180 18L198 30L184 46' stroke='%230B4BA8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M10 88C13 78 13 62 10 52' stroke='%230B4BA8' stroke-width='1.5' stroke-linecap='round'/%3E%3Cpath d='M198 86C202 75 202 60 198 48' stroke='%230B4BA8' stroke-width='1.5' stroke-linecap='round'/%3E%3Cpath d='M150 78H166V94H150V78Z' stroke='%230B4BA8' stroke-width='1.5'/%3E%3Cpath d='M78 56L87 41H105L114 56L105 71H87L78 56Z' stroke='%230B4BA8' stroke-width='1.5'/%3E%3Cpath d='M38 78L46 68H58L62 80L54 90H42L38 78Z' stroke='%230B4BA8' stroke-width='1.5'/%3E%3Ccircle cx='116' cy='18' r='2' fill='%230B4BA8'/%3E%3Ccircle cx='188' cy='94' r='2' fill='%230B4BA8'/%3E%3Ccircle cx='68' cy='110' r='2' fill='%230B4BA8'/%3E%3C/svg%3E");
        background-size: 220px 140px;
        background-repeat: repeat;
        background-position: center;
        z-index: 0;
      }

      .crisp-header::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at top center, rgba(255,255,255,0.18), transparent 42%),
          linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0));
        z-index: 0;
      }

      .crisp-header > * {
        position: relative;
        z-index: 1;
      }
      
      .crisp-header.minimized {
        padding: 12px 20px;
        gap: 0;
      }
      
      .crisp-header.minimized .crisp-team {
        display: none;
      }
      
      .crisp-header.minimized .crisp-tabs {
        justify-content: stretch;
        width: calc(100% - 72px);
        max-width: 360px;
        margin: 0;
      }
      
      .crisp-tabs {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: center;
        background: linear-gradient(to bottom, rgba(11, 75, 168, 0.28), rgba(8, 54, 124, 0.32));
        padding: 6px;
        border-radius: 28px;
        width: fit-content;
        margin: 0 auto;
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 10px 24px rgba(10, 57, 125, 0.16);
        backdrop-filter: blur(8px);
      }
      
      .crisp-tab {
        padding: 8px 18px;
        min-width: 0;
        border-radius: 22px;
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.85);
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex: 1 1 0;
        transition: all 0.15s ease-out;
        user-select: none;
        white-space: nowrap;
      }
      
      .crisp-tab:active {
        transform: scale(0.97);
      }
      
      .crisp-tab.active {
        background: linear-gradient(to bottom, rgba(255,255,255,0.38), rgba(255,255,255,0.2));
        color: white;
        box-shadow: 0 6px 14px rgba(7, 39, 92, 0.22), inset 0 1px 0 rgba(255,255,255,0.32);
        border: 0.5px solid rgba(255,255,255,0.24);
      }
      
      .crisp-tab:hover:not(.active) {
        background: rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.95);
      }
      
      .crisp-close {
        position: absolute;
        right: 20px;
        top: 20px;
        background: linear-gradient(to bottom, rgba(255,255,255,0.16), rgba(255,255,255,0.08));
        border: 0.5px solid rgba(255,255,255,0.18);
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 24px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease-out;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 24px rgba(8, 48, 112, 0.2);
        user-select: none;
      }
      
      .crisp-close:hover {
        background: linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
        transform: translateY(-1px) scale(1.02);
      }
      
      .crisp-close:active {
        transform: scale(0.97);
      }
      
      /* Team avatars */
      .crisp-team {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }
      
      .crisp-avatars {
        display: flex;
        align-items: center;
        padding: 3px 8px;
        border-radius: 999px;
        background: rgba(12, 78, 173, 0.16);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
        transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
      }

      .crisp-avatars:hover {
        transform: translateY(-1px);
        background: rgba(12, 78, 173, 0.22);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 24px rgba(6, 40, 96, 0.16);
      }
      
      .crisp-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.55);
        overflow: visible;
        margin-left: -10px;
        box-shadow: 0 8px 18px rgba(6, 40, 96, 0.22), 0 0 0 1px rgba(11, 75, 168, 0.28);
        background: rgba(255,255,255,0.14);
        transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease, border-color 0.25s ease, margin 0.25s ease;
        transform-origin: center bottom;
        cursor: pointer;
        position: relative;
      }

      .crisp-avatar canvas {
        border-radius: 50%;
        overflow: hidden;
      }
      
      .crisp-avatar:first-child {
        margin-left: 0;
      }

      .crisp-avatars:hover .crisp-avatar {
        margin-left: -4px;
      }

      .crisp-avatars:hover .crisp-avatar:first-child {
        margin-left: 0;
      }

      .crisp-avatar:hover {
        transform: translateY(-6px) scale(1.08);
        border-color: rgba(255,255,255,0.9);
        box-shadow: 0 16px 28px rgba(6, 40, 96, 0.3), 0 0 0 1px rgba(255,255,255,0.22);
        z-index: 2;
      }

      .crisp-avatar:hover + .crisp-avatar {
        transform: translateX(2px);
      }

      .crisp-avatar canvas {
        transition: transform 0.25s ease, filter 0.25s ease;
      }

      .crisp-avatar:hover canvas {
        transform: scale(1.06);
        filter: saturate(1.08) brightness(1.06);
      }

      .crisp-avatar::after {
        content: attr(data-name);
        position: absolute;
        left: 50%;
        bottom: calc(100% + 10px);
        transform: translateX(-50%) translateY(6px);
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(255,255,255,0.14);
        color: white;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.01em;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.26);
        z-index: 4;
      }

      .crisp-avatar:hover::after {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      
      .crisp-hero {
        text-align: center;
      }
      
      .crisp-hero h2 {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.03em;
        margin: 0 0 10px 0;
        text-shadow: 0 2px 10px rgba(7, 39, 92, 0.24);
      }
      
      .crisp-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 13px;
        opacity: 0.98;
        text-shadow: 0 2px 10px rgba(7, 39, 92, 0.22);
      }
      
      .crisp-status-dot {
        width: 10px;
        height: 10px;
        background: #4CAF50;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.75);
        flex-shrink: 0;
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
        padding: 12px 20px 10px 20px;
        background: white;
        border-top: 1px solid #E5E7EB;
      }
      
      .crisp-input-wrapper {
        position: relative;
        margin-bottom: 6px;
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
        border-color: #1E88E5;
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
        color: #1E88E5;
      }
      
      .crisp-input-actions {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 6px;
        margin-top: 2px;
      }
      
      .crisp-action-icons {
        display: flex;
        gap: 4px;
        justify-content: flex-start;
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
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        width: 100%;
        padding-top: 0;
        color: #94A3B8;
        font-size: 12px;
        text-align: center;
        line-height: 1.4;
      }
      
      .crisp-branding strong {
        color: #64748B;
        font-weight: 600;
      }

      .crisp-branding::before {
        content: '';
        width: 14px;
        height: 12px;
        display: inline-block;
        background: linear-gradient(135deg, #94A3B8, #64748B);
        clip-path: polygon(0 15%, 70% 15%, 70% 0, 100% 0, 100% 85%, 30% 85%, 30% 100%, 0 100%);
        opacity: 0.75;
      }
      
      @media (max-width: 480px) {
        #behzod-widget-container {
          width: calc(100vw - 40px);
          height: calc(100vh - 120px);
        }

        .crisp-voice-toolbar {
          flex-wrap: wrap;
        }

        .crisp-voice-mode {
          width: 100%;
          min-width: 0;
          order: 3;
        }
      }

      /* Voice tab */
      .crisp-voice {
        flex: 1;
        padding: 18px 20px 22px;
        background:
          radial-gradient(circle at top left, rgba(96, 165, 250, 0.12), transparent 32%),
          radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.12), transparent 34%),
          linear-gradient(180deg, #F8FAFF 0%, #F3F4F8 100%);
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow: auto;
      }

      .crisp-voice-card {
        position: relative;
        background: transparent;
        border-radius: 0;
        padding: 0;
        border: none;
        box-shadow: none;
        backdrop-filter: none;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        overflow: visible;
      }

      .crisp-voice-card::before {
        display: none;
      }

      .crisp-voice-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 4px 4px 16px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        position: relative;
        z-index: 1;
      }

      .crisp-voice-toolbar-icons {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #1E3A8A;
        padding: 10px 14px;
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0.18));
        border: 1px solid rgba(255,255,255,0.44);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.48), 0 10px 24px rgba(30, 64, 175, 0.08);
        backdrop-filter: blur(14px);
      }

      .crisp-voice-toolbar-icons svg {
        width: 18px;
        height: 18px;
        display: block;
      }

      .crisp-voice-visual {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 12px 0 18px;
        padding: 18px 0 22px;
      }

      .crisp-voice-label {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.62);
        display: none;
      }

      .crisp-voice-mode {
        font-size: 12px;
        font-weight: 700;
        color: rgba(255,255,255,0.88);
        min-width: 150px;
        text-align: center;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
      }

      .crisp-voice-matrix {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 330px;
      }

      .crisp-voice-orb-wrap {
        --voice-level: 0.14;
        --voice-c1: #1D4ED8;
        --voice-c2: #60A5FA;
        --voice-c3: #4338CA;
        --voice-bg: rgba(241, 245, 249, 0.96);
        position: relative;
        width: 340px;
        height: 340px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .crisp-voice-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 1px solid rgba(129, 140, 248, 0.14);
        opacity: 0.16;
        transform: scale(0.9);
        transition: transform 140ms ease, opacity 140ms ease, box-shadow 140ms ease;
      }

      .crisp-voice-ring:nth-child(1) {
        inset: 34px;
      }

      .crisp-voice-ring:nth-child(2) {
        inset: 18px;
      }

      .crisp-voice-ring:nth-child(3) {
        inset: 0;
      }

      .crisp-voice-core-glow {
        position: absolute;
        width: 276px;
        height: 276px;
        border-radius: 999px;
        background:
          radial-gradient(circle, rgba(96, 165, 250, 0.18) 0%, rgba(37, 99, 235, 0.14) 36%, rgba(67, 56, 202, 0.1) 62%, transparent 80%);
        filter: blur(24px);
        opacity: 0.56;
        transition: transform 140ms ease, opacity 140ms ease;
      }

      .crisp-voice-column {
        position: relative;
        width: 208px;
        height: 208px;
        border-radius: 50%;
        background: radial-gradient(circle at center, rgba(255,255,255,0.14), rgba(255,255,255,0.02));
        box-shadow:
          0 24px 40px rgba(37, 99, 235, 0.14),
          0 8px 22px rgba(67, 56, 202, 0.1),
          inset 0 1px 2px rgba(255,255,255,0.55),
          inset 0 -16px 24px rgba(30, 64, 175, 0.14);
        transition: transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease, filter 140ms ease;
        transform: translateY(calc(var(--voice-level) * -4px)) scale(calc(1 + var(--voice-level) * 0.12));
        opacity: 0.98;
        overflow: hidden;
        isolation: isolate;
        filter: saturate(calc(1.02 + var(--voice-level) * 0.45)) brightness(calc(0.98 + var(--voice-level) * 0.12));
        animation: crispVoiceOrbFloat 7.5s ease-in-out infinite;
      }

      .crisp-voice-orb-surface,
      .crisp-voice-orb-blob,
      .crisp-voice-orb-inner,
      .crisp-voice-orb-shine {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
      }

      .crisp-voice-orb-surface {
        background:
          conic-gradient(from  calc(220deg + var(--voice-level) * 120deg) at 25% 70%, var(--voice-c3), transparent 20% 80%, var(--voice-c3)),
          conic-gradient(from calc(160deg + var(--voice-level) * 160deg) at 45% 75%, var(--voice-c2), transparent 30% 60%, var(--voice-c2)),
          conic-gradient(from calc(-120deg - var(--voice-level) * 180deg) at 80% 20%, var(--voice-c1), transparent 40% 60%, var(--voice-c1)),
          conic-gradient(from calc(20deg + var(--voice-level) * 90deg) at 15% 5%, var(--voice-c2), transparent 10% 90%, var(--voice-c2)),
          conic-gradient(from calc(45deg + var(--voice-level) * 110deg) at 20% 80%, var(--voice-c1), transparent 10% 90%, var(--voice-c1)),
          conic-gradient(from calc(-60deg - var(--voice-level) * 140deg) at 85% 10%, var(--voice-c3), transparent 20% 80%, var(--voice-c3));
        box-shadow: inset var(--voice-bg) 0 0 18px 4px;
        filter: blur(calc(10px + var(--voice-level) * 8px)) contrast(calc(1.45 + var(--voice-level) * 0.45)) saturate(1.08);
        transform: scale(1.04);
        animation: crispVoiceSurfaceSpin 18s linear infinite;
      }

      .crisp-voice-orb-inner {
        inset: 7%;
        background:
          radial-gradient(circle at center, var(--voice-bg) 1.2px, transparent 1.2px);
        background-size: 8px 8px;
        backdrop-filter: blur(18px) contrast(1.9);
        mix-blend-mode: overlay;
        mask-image: radial-gradient(circle, black 18%, transparent 74%);
        opacity: 0.7;
      }

      .crisp-voice-orb-blob {
        mix-blend-mode: screen;
        filter: blur(12px);
        opacity: calc(0.48 + var(--voice-level) * 0.16);
      }

      .crisp-voice-orb-blob-a {
        inset: 16% 14% 18% 18%;
        background: radial-gradient(circle, rgba(147, 197, 253, 0.88) 0%, rgba(96, 165, 250, 0.22) 48%, transparent 72%);
        animation: crispVoiceBlobA 8.8s ease-in-out infinite;
      }

      .crisp-voice-orb-blob-b {
        inset: 18% 18% 14% 14%;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.84) 0%, rgba(29, 78, 216, 0.22) 50%, transparent 74%);
        animation: crispVoiceBlobB 10.5s ease-in-out infinite;
      }

      .crisp-voice-orb-blob-c {
        inset: 20% 16% 16% 16%;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.78) 0%, rgba(67, 56, 202, 0.18) 52%, transparent 76%);
        animation: crispVoiceBlobC 9.6s ease-in-out infinite;
      }

      .crisp-voice-orb-shine {
        background:
          radial-gradient(circle at 34% 24%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.18) 14%, transparent 28%),
          linear-gradient(135deg, rgba(255,255,255,0.22), transparent 48%);
        opacity: calc(0.62 + var(--voice-level) * 0.14);
        mix-blend-mode: screen;
      }

      .crisp-voice-column.active {
        box-shadow:
          0 28px 50px rgba(37, 99, 235, 0.18),
          0 10px 28px rgba(67, 56, 202, 0.14),
          inset 0 1px 3px rgba(255,255,255,0.6),
          inset 0 -18px 28px rgba(30, 64, 175, 0.16);
      }

      @keyframes crispVoiceOrbFloat {
        0%, 100% { transform: translateY(calc(var(--voice-level) * -4px)) scale(calc(1 + var(--voice-level) * 0.12)); }
        50% { transform: translateY(calc(-4px + var(--voice-level) * -6px)) scale(calc(1.02 + var(--voice-level) * 0.13)); }
      }

      @keyframes crispVoiceSurfaceSpin {
        0% { transform: rotate(0deg) scale(1.02); }
        50% { transform: rotate(180deg) scale(1.06); }
        100% { transform: rotate(360deg) scale(1.02); }
      }

      @keyframes crispVoiceBlobA {
        0%, 100% { transform: translate(-10%, -6%) scale(1.02); }
        50% { transform: translate(12%, 10%) scale(1.16); }
      }

      @keyframes crispVoiceBlobB {
        0%, 100% { transform: translate(10%, -8%) scale(1.14); }
        50% { transform: translate(-12%, 12%) scale(0.96); }
      }

      @keyframes crispVoiceBlobC {
        0%, 100% { transform: translate(0%, 12%) scale(0.98); }
        50% { transform: translate(8%, -12%) scale(1.12); }
      }

      .crisp-voice-pixel {
        display: none;
      }

      .crisp-voice-title {
        font-size: 16px;
        font-weight: 700;
        color: #0F172A;
        margin: 0;
        letter-spacing: -0.2px;
      }

      .crisp-voice-sub {
        font-size: 12px;
        color: #64748B;
        margin: 3px 0 0 0;
        line-height: 1.5;
      }

      .crisp-voice-footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .crisp-voice-status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #1E3A8A;
        background: linear-gradient(180deg, rgba(239, 246, 255, 0.96), rgba(219, 234, 254, 0.78));
        border-radius: 999px;
        padding: 8px 12px;
        margin: 0;
        border: 1px solid rgba(147, 197, 253, 0.42);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.62), 0 8px 18px rgba(37, 99, 235, 0.08);
        backdrop-filter: blur(12px);
      }

      .crisp-voice-status.is-connecting {
        color: #1E40AF;
        background: linear-gradient(180deg, rgba(239, 246, 255, 0.98), rgba(219, 234, 254, 0.84));
      }

      .crisp-voice-status.is-live {
        color: #1D4ED8;
        background: linear-gradient(180deg, rgba(219, 234, 254, 0.98), rgba(191, 219, 254, 0.88));
        border-color: rgba(96, 165, 250, 0.5);
      }

      .crisp-voice-status.is-error {
        color: #4338CA;
        background: linear-gradient(180deg, rgba(237, 233, 254, 0.96), rgba(224, 231, 255, 0.84));
        border-color: rgba(167, 139, 250, 0.46);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.62), 0 8px 18px rgba(99, 102, 241, 0.1);
      }

      .crisp-voice-status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #9CA3AF;
      }

      .crisp-voice-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        width: 100%;
      }

      .crisp-voice-btn {
        appearance: none;
        border: 1px solid rgba(191, 219, 254, 0.62);
        background: linear-gradient(180deg, rgba(239, 246, 255, 0.96), rgba(219, 234, 254, 0.84));
        color: #1D4ED8;
        border-radius: 22px;
        width: 68px;
        height: 62px;
        padding: 0;
        font-size: 0;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.12s ease-out, background 0.12s ease-out, border-color 0.12s ease-out, box-shadow 0.12s ease-out;
        min-width: 68px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 22px rgba(37, 99, 235, 0.12), inset 0 1px 0 rgba(255,255,255,0.74);
        backdrop-filter: blur(14px);
      }

      .crisp-voice-btn:hover {
        transform: translateY(-1px);
        background: linear-gradient(180deg, rgba(219, 234, 254, 0.98), rgba(191, 219, 254, 0.9));
        border-color: rgba(96, 165, 250, 0.44);
        box-shadow: 0 14px 24px rgba(37, 99, 235, 0.16), inset 0 1px 0 rgba(255,255,255,0.82);
      }

      .crisp-voice-btn:active { transform: scale(0.98); }

      .crisp-voice-btn.primary {
        border: 1px solid rgba(255,255,255,0.22);
        color: white;
        background:
          linear-gradient(135deg, #3B82F6 0%, #1E88E5 50%, #5B5BD6 100%);
        box-shadow: 0 16px 30px rgba(30, 136, 229, 0.3), inset 0 1px 0 rgba(255,255,255,0.3);
        width: 86px;
        height: 72px;
        min-width: 86px;
        border-radius: 26px;
      }

      .crisp-voice-btn.primary:hover {
        background:
          linear-gradient(135deg, #2563EB 0%, #1565C0 50%, #4F46E5 100%);
      }

      .crisp-voice-btn svg {
        width: 24px;
        height: 24px;
        display: block;
      }

      .crisp-voice-btn.primary svg {
        width: 28px;
        height: 28px;
      }

      .crisp-voice-btn.muted {
        color: #1D4ED8;
        border-color: rgba(191, 219, 254, 0.62);
        background: linear-gradient(180deg, rgba(239, 246, 255, 0.96), rgba(219, 234, 254, 0.84));
      }

      .crisp-voice-btn.live {
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.16), 0 16px 30px rgba(30, 136, 229, 0.3), inset 0 1px 0 rgba(255,255,255,0.3);
      }

      .crisp-voice-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
      }

      .crisp-voice-error {
        width: 100%;
        font-size: 13px;
        color: #4338CA;
        line-height: 1.5;
        text-align: center;
        opacity: 0.9;
      }

      .crisp-voice-debug {
        width: 100%;
        margin-top: 12px;
        padding: 12px;
        border-radius: 16px;
        background: rgba(255,255,255,0.7);
        border: 1px solid rgba(148, 163, 184, 0.2);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
        backdrop-filter: blur(10px);
      }

      .crisp-voice-debug-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }

      .crisp-voice-debug-title {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #475569;
      }

      .crisp-voice-debug-clear {
        border: none;
        background: transparent;
        color: #2563EB;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
      }

      .crisp-voice-debug-log {
        max-height: 140px;
        overflow-y: auto;
        margin: 0;
        font-family: Consolas, "Courier New", monospace;
        font-size: 11px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        color: #0F172A;
      }

      .crisp-tab[data-tab="voice"],
      #crisp-view-voice {
        display: none !important;
      }
    </style>
    
    <button id="behzod-widget-button" aria-label="Open chat"></button>

    <div id="behzod-widget-container">
      <!-- Header with tabs -->
      <div class="crisp-header">
        <div class="crisp-tabs">
          <button class="crisp-tab active" data-tab="chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Chat
          </button>
          <button class="crisp-tab" data-tab="voice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            Ovoz
          </button>
        </div>
        <button class="crisp-close" id="crisp-close">✕</button>
        
        <div class="crisp-team">
          <div class="crisp-avatars">
            <div class="crisp-avatar" data-name="Aziza"></div>
            <div class="crisp-avatar" data-name="Madina"></div>
            <div class="crisp-avatar" data-name="Javohir"></div>
            <div class="crisp-avatar" data-name="Behzod"></div>
          </div>
          <div class="crisp-hero">
            <h2>Behzod bilan bog'laning!</h2>
            <div class="crisp-status">
              <span class="crisp-status-dot"></span>
              <span><strong>Savolingiz bormi? Bemalol yozing.</strong></span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="crisp-view" id="crisp-view-chat">
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
            <span>Powered by</span>
            <strong>Behzod AI</strong>
          </div>
        </div>
      </div>
      </div>

      <div class="crisp-view hidden" id="crisp-view-voice">
        <div class="crisp-voice">
          <div class="crisp-voice-card">
            <div class="crisp-voice-toolbar">
              <div>
                <div class="crisp-voice-title">Behzod Voice</div>
                <div class="crisp-voice-sub">Ovozli suhbat oynasi</div>
              </div>
              <div class="crisp-voice-mode" id="crisp-voice-mode">AI Voice</div>
              <div class="crisp-voice-toolbar-icons" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 5 6 9H2v6h4l5 4V5Z"></path>
                  <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
                  <path d="M18.5 5.5a9 9 0 0 1 0 13"></path>
                </svg>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 12a8 8 0 0 0 14.9 4"></path>
                  <path d="M20 12A8 8 0 0 0 5.1 8"></path>
                  <path d="M20 4v5h-5"></path>
                  <path d="M4 20v-5h5"></path>
                </svg>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 9v4"></path>
                  <path d="M12 17h.01"></path>
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path>
                </svg>
              </div>
            </div>
            <div class="crisp-voice-visual">
              <div class="crisp-voice-matrix" id="crisp-voice-matrix"></div>
            </div>
            <div class="crisp-voice-footer">
              <div class="crisp-voice-status" id="crisp-voice-status">
                <span class="crisp-voice-status-dot" id="crisp-voice-dot"></span>
                <span id="crisp-voice-status-text">Ulanmagan</span>
              </div>
              <div class="crisp-voice-actions">
                <button class="crisp-voice-btn" id="crisp-voice-disconnect" disabled title="Uzish" aria-label="Uzish">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                  </svg>
                </button>
                <button class="crisp-voice-btn primary" id="crisp-voice-toggle" title="Ovozni boshlash" aria-label="Ovozni boshlash">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </button>
                <button class="crisp-voice-btn" id="crisp-voice-mute" title="Ovoz" aria-label="Ovozni o'chirish yoki yoqish">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 5 6 9H2v6h4l5 4V5Z"></path>
                    <path d="m23 9-6 6"></path>
                    <path d="m17 9 6 6"></path>
                  </svg>
                </button>
              </div>
              <div class="crisp-voice-error" id="crisp-voice-error" style="display:none"></div>
              <div class="crisp-voice-debug">
                <div class="crisp-voice-debug-head">
                  <div class="crisp-voice-debug-title">Voice Logs</div>
                  <button class="crisp-voice-debug-clear" id="crisp-voice-debug-clear" type="button">Clear</button>
                </div>
                <pre class="crisp-voice-debug-log" id="crisp-voice-debug-log">Voice tab ready.</pre>
              </div>
            </div>
          </div>
          <audio id="crisp-voice-audio" autoplay playsinline></audio>
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
    const tabs = Array.from(document.querySelectorAll('.crisp-tab'));
    const chatView = document.getElementById('crisp-view-chat');
    const voiceView = document.getElementById('crisp-view-voice');
    const voiceToggleBtn = document.getElementById('crisp-voice-toggle');
    const voiceDisconnectBtn = document.getElementById('crisp-voice-disconnect');
    const voiceStatus = document.getElementById('crisp-voice-status');
    const voiceDot = document.getElementById('crisp-voice-dot');
    const voiceStatusText = document.getElementById('crisp-voice-status-text');
    const voiceError = document.getElementById('crisp-voice-error');
    const voiceAudio = document.getElementById('crisp-voice-audio');
    const voiceMuteBtn = document.getElementById('crisp-voice-mute');
    const voiceMode = document.getElementById('crisp-voice-mode');
    const voiceMatrix = document.getElementById('crisp-voice-matrix');
    const voiceDebugLog = document.getElementById('crisp-voice-debug-log');
    const voiceDebugClearBtn = document.getElementById('crisp-voice-debug-clear');

    let activeTab = 'chat';
    let livekitRoom = null;
    let livekitMicTrack = null;
    let voiceMuted = false;
    let voiceBars = [];
    let voiceGlow = null;
    let voiceRings = [];
    let voiceAnimationFrame = null;
    let voiceVisualState = 'idle';
    let voiceStartupInFlight = false;
    let voiceStartGeneration = 0;
    let voiceWaitTimeoutId = null;
    let voiceRemoteAudioTrack = null;
    let voiceDebugEntries = [];
    let browserVoiceActive = false;
    let voiceManualStopRequested = false;
    let voiceRecognition = null;
    let voiceRecognitionRestartTimer = null;
    let voiceReplyInFlight = false;
    let voiceSpeechInFlight = false;

    function setHeaderMinimized(shouldMinimize) {
      if (!header) return;
      header.classList.toggle('minimized', !!shouldMinimize);
    }

    function serializeVoiceDebug(value) {
      if (value === undefined || value === null) return '';
      if (typeof value === 'string') return value;

      try {
        return JSON.stringify(value);
      } catch (error) {
        return String(value);
      }
    }

    function logVoiceEvent(message, details) {
      const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
      const suffix = details === undefined || details === null ? '' : ` ${serializeVoiceDebug(details)}`;
      const entry = `[${timestamp}] ${message}${suffix}`;

      voiceDebugEntries.push(entry);
      if (voiceDebugEntries.length > 80) {
        voiceDebugEntries = voiceDebugEntries.slice(-80);
      }

      if (voiceDebugLog) {
        voiceDebugLog.textContent = voiceDebugEntries.join('\n');
        voiceDebugLog.scrollTop = voiceDebugLog.scrollHeight;
      }

      console.log('[Behzod Voice]', entry);
    }

    function clearVoiceDebugLog() {
      voiceDebugEntries = [];
      if (voiceDebugLog) {
        voiceDebugLog.textContent = '';
      }
      logVoiceEvent('Voice log cleared.');
    }

    function withTimeout(promise, ms, label) {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);

        Promise.resolve(promise).then(
          (value) => {
            clearTimeout(timeoutId);
            resolve(value);
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          }
        );
      });
    }

    function clearVoiceRecognitionRestartTimer() {
      if (!voiceRecognitionRestartTimer) return;
      clearTimeout(voiceRecognitionRestartTimer);
      voiceRecognitionRestartTimer = null;
    }

    function getSpeechRecognitionCtor() {
      return window.SpeechRecognition || window.webkitSpeechRecognition || null;
    }

    function detectSpeechLang(text) {
      if (/[А-Яа-яЁё]/.test(text || '')) {
        return 'ru-RU';
      }

      const browserLang = (navigator.language || 'uz-UZ').trim();
      return browserLang || 'uz-UZ';
    }

    function stopSpeechSynthesisPlayback() {
      if (!window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
      } catch (error) {}
      voiceSpeechInFlight = false;
    }

    function createVoiceMatrix() {
      if (!voiceMatrix) return;
      voiceMatrix.innerHTML = '';
      voiceBars = [];
      voiceRings = [];

      const orbWrap = document.createElement('div');
      orbWrap.className = 'crisp-voice-orb-wrap';

      for (let index = 0; index < 3; index++) {
        const ring = document.createElement('div');
        ring.className = 'crisp-voice-ring';
        orbWrap.appendChild(ring);
        voiceRings.push(ring);
      }

      const glow = document.createElement('div');
      glow.className = 'crisp-voice-core-glow';
      orbWrap.appendChild(glow);
      voiceGlow = glow;

      const orb = document.createElement('div');
      orb.className = 'crisp-voice-column active';
      const orbSurface = document.createElement('div');
      orbSurface.className = 'crisp-voice-orb-surface';
      orb.appendChild(orbSurface);

      ['a', 'b', 'c'].forEach((variant) => {
        const blob = document.createElement('div');
        blob.className = `crisp-voice-orb-blob crisp-voice-orb-blob-${variant}`;
        orb.appendChild(blob);
      });

      const orbInner = document.createElement('div');
      orbInner.className = 'crisp-voice-orb-inner';
      orb.appendChild(orbInner);

      const orbShine = document.createElement('div');
      orbShine.className = 'crisp-voice-orb-shine';
      orb.appendChild(orbShine);

      orbWrap.appendChild(orb);
      voiceBars.push(orb);

      voiceMatrix.appendChild(orbWrap);
    }

    function renderVoiceMatrix(levels) {
      if (!voiceBars.length) return;
      const level = Math.max(0, Math.min(1, levels[0] || 0));
      const orb = voiceBars[0];
      const orbWrap = orb.parentElement;
      if (orbWrap) {
        orbWrap.style.setProperty('--voice-level', level.toFixed(3));
      }
      orb.style.setProperty('--voice-level', level.toFixed(3));
      orb.classList.toggle('active', level > 0.08);

      if (voiceGlow) {
        voiceGlow.style.transform = `scale(${1 + level * 0.18})`;
        voiceGlow.style.opacity = `${0.48 + level * 0.34}`;
      }

      voiceRings.forEach((ring, index) => {
        const spread = 1 + level * (0.08 + index * 0.07);
        ring.style.transform = `scale(${spread})`;
        ring.style.opacity = `${0.1 + level * (0.22 - index * 0.03)}`;
        ring.style.boxShadow = level > 0.12
          ? `0 0 ${24 + index * 14}px rgba(${index === 2 ? '67,56,202' : '59,130,246'}, ${0.08 + level * 0.16})`
          : 'none';
      });
    }

    function setVoiceVisualState(nextState) {
      voiceVisualState = nextState;
      if (voiceMode) {
        const labels = {
          idle: 'AI Voice',
          connecting: 'Ulanmoqda',
          listening: 'Tinglamoqda',
          connected: 'AI Voice',
          error: 'Xatolik'
        };
        voiceMode.textContent = labels[nextState] || 'Kutmoqda';
      }
    }

    function clearVoiceWaitTimer() {
      if (!voiceWaitTimeoutId) return;
      logVoiceEvent('Clearing AI wait timer.');
      clearTimeout(voiceWaitTimeoutId);
      voiceWaitTimeoutId = null;
    }

    function hasRemoteParticipants() {
      return !!(livekitRoom && livekitRoom.remoteParticipants && livekitRoom.remoteParticipants.size > 0);
    }

    function syncVoiceMuteButton() {
      if (!voiceMuteBtn || !voiceAudio) return;
      voiceAudio.muted = voiceMuted;
      voiceMuteBtn.classList.toggle('muted', voiceMuted);
      voiceMuteBtn.setAttribute('title', voiceMuted ? 'Ovozni yoqish' : "Ovozni o'chirish");
      voiceMuteBtn.setAttribute('aria-label', voiceMuted ? 'Ovozni yoqish' : "Ovozni o'chirish");

      if (voiceMuted) {
        stopSpeechSynthesisPlayback();
      }
    }

    function startVoiceAnimation() {
      if (voiceAnimationFrame) cancelAnimationFrame(voiceAnimationFrame);

      const animate = (time) => {
        const t = time / 1000;
        const levels = Array.from({ length: 1 }, () => {
          if (voiceVisualState === 'error') {
            return 0.22;
          }

          if (voiceVisualState === 'connecting') {
            return 0.35 + ((Math.sin(t * 4) + 1) / 2) * 0.45;
          }

          if (voiceVisualState === 'connected' || voiceVisualState === 'listening') {
            const base = (Math.sin(t * 3.8) + 1) / 2;
            const wave = (Math.sin(t * 7.2 + 1.4) + 1) / 2;
            return Math.max(0.18, Math.min(1, base * 0.58 + wave * 0.42));
          }

          return 0.14;
        });

        renderVoiceMatrix(levels);
        voiceAnimationFrame = requestAnimationFrame(animate);
      };

      voiceAnimationFrame = requestAnimationFrame(animate);
    }

    createVoiceMatrix();
    setVoiceVisualState('idle');
    startVoiceAnimation();

    function setVoiceStatus(status, tone, variant = 'idle', visualState = 'idle') {
      if (voiceStatusText) {
        voiceStatusText.textContent = status;
      }

      if (voiceDot) {
        voiceDot.style.background = tone || '#9CA3AF';
      }

      if (voiceStatus) {
        voiceStatus.classList.remove('is-connecting', 'is-live', 'is-error');
        if (variant === 'connecting') voiceStatus.classList.add('is-connecting');
        if (variant === 'live') voiceStatus.classList.add('is-live');
        if (variant === 'error') voiceStatus.classList.add('is-error');
      }

      setVoiceVisualState(visualState);
    }

    function showVoiceError(message) {
      if (!voiceError) return;
      if (!message) {
        voiceError.style.display = 'none';
        voiceError.textContent = '';
        return;
      }
      voiceError.style.display = 'block';
      voiceError.textContent = message;
    }

    async function resumeVoiceAudioPlayback() {
      if (!voiceAudio || typeof voiceAudio.play !== 'function') return;

      try {
        logVoiceEvent('Trying to resume remote audio playback.');
        const playPromise = voiceAudio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          await playPromise;
        }
        logVoiceEvent('Remote audio playback resumed.');
      } catch (error) {
        logVoiceEvent('Remote audio playback blocked.', error && error.message ? error.message : String(error));
        showVoiceError("Brauzer audio ijrosini blokladi. Sahifa bilan yana bir marta interaction qiling.");
      }
    }

    function scheduleVoiceAgentWaitNotice() {
      clearVoiceWaitTimer();
      logVoiceEvent('Waiting for AI voice agent or remote audio track.');
      voiceWaitTimeoutId = window.setTimeout(() => {
        if (!livekitRoom || voiceRemoteAudioTrack || browserVoiceActive) return;

        const fallbackReason = hasRemoteParticipants()
          ? 'LiveKit room has participants but no remote audio track.'
          : 'No LiveKit AI voice worker joined the room.';

        void startBrowserVoiceFallback(fallbackReason);
      }, 5000);
    }

    function updateVoiceLiveStatus() {
      if (browserVoiceActive) {
        if (voiceReplyInFlight) {
          setVoiceStatus('Javob olinmoqda...', '#F59E0B', 'connecting', 'connecting');
          return;
        }

        if (voiceSpeechInFlight) {
          setVoiceStatus("Javob o'qilmoqda...", '#10B981', 'live', 'connected');
          return;
        }

        setVoiceStatus('Tinglamoqda...', '#10B981', 'live', 'listening');
        return;
      }

      if (!livekitRoom) {
        setVoiceStatus('Ulanmagan', '#9CA3AF', 'idle', 'idle');
        return;
      }

      if (voiceRemoteAudioTrack) {
        setVoiceStatus('AI ovozi eshitilmoqda', '#10B981', 'live', 'listening');
        return;
      }

      if (hasRemoteParticipants()) {
        clearVoiceWaitTimer();
        setVoiceStatus('AI ulandi, audio kutilmoqda', '#3B82F6', 'live', 'connected');
        return;
      }

      setVoiceStatus('Ulangan, AI agent kutilmoqda', '#3B82F6', 'live', 'connected');
      scheduleVoiceAgentWaitNotice();
    }

    async function attachRemoteVoiceTrack(track) {
      if (!track || !voiceAudio) return;
      logVoiceEvent('Attaching remote audio track.', {
        sid: track.sid || null,
        kind: track.kind || null
      });

      if (voiceRemoteAudioTrack && voiceRemoteAudioTrack !== track) {
        detachRemoteVoiceTrack(voiceRemoteAudioTrack);
      }

      try {
        track.attach(voiceAudio);
      } catch (error) {
        throw new Error('Remote audio track could not be attached.');
      }

      voiceRemoteAudioTrack = track;
      clearVoiceWaitTimer();
      showVoiceError('');
      syncVoiceMuteButton();
      setVoiceStatus('AI ovozi eshitilmoqda', '#10B981', 'live', 'listening');
      await resumeVoiceAudioPlayback();
    }

    function detachRemoteVoiceTrack(track) {
      const targetTrack = track || voiceRemoteAudioTrack;
      if (targetTrack) {
        logVoiceEvent('Detaching remote audio track.', {
          sid: targetTrack.sid || null,
          kind: targetTrack.kind || null
        });
      }

      if (targetTrack && voiceAudio) {
        try { targetTrack.detach(voiceAudio); } catch (error) {}
      }

      if (!track || targetTrack === voiceRemoteAudioTrack) {
        voiceRemoteAudioTrack = null;
      }

      if (voiceAudio) {
        try { voiceAudio.pause(); } catch (error) {}
        try { voiceAudio.removeAttribute('src'); } catch (error) {}
        try { voiceAudio.srcObject = null; } catch (error) {}
      }
    }

    async function cleanupVoiceConnection(options = {}) {
      const disconnectRoom = options.disconnectRoom !== false;
      const room = livekitRoom;
      const micTrack = livekitMicTrack;
      logVoiceEvent('Cleaning up voice connection.', {
        disconnectRoom,
        hasRoom: !!room,
        hasMicTrack: !!micTrack,
        hasRemoteTrack: !!voiceRemoteAudioTrack
      });

      clearVoiceWaitTimer();
      detachRemoteVoiceTrack();

      livekitRoom = null;
      livekitMicTrack = null;

      if (room && micTrack) {
        try { room.localParticipant.unpublishTrack(micTrack); } catch (error) {}
      }

      if (micTrack) {
        try { micTrack.stop(); } catch (error) {}
      }

      if (disconnectRoom && room) {
        try { room.disconnect(); } catch (error) {}
      }
    }

    function stopBrowserVoiceFallback(options = {}) {
      const preserveManualStop = !!options.preserveManualStop;
      logVoiceEvent('Stopping browser voice fallback.', { preserveManualStop });

      browserVoiceActive = false;
      voiceReplyInFlight = false;
      voiceSpeechInFlight = false;
      clearVoiceRecognitionRestartTimer();

      if (preserveManualStop) {
        voiceManualStopRequested = true;
      } else {
        voiceManualStopRequested = false;
      }

      if (voiceRecognition) {
        const activeRecognition = voiceRecognition;
        voiceRecognition = null;
        try { activeRecognition.onstart = null; } catch (error) {}
        try { activeRecognition.onresult = null; } catch (error) {}
        try { activeRecognition.onerror = null; } catch (error) {}
        try { activeRecognition.onend = null; } catch (error) {}
        try { activeRecognition.abort(); } catch (error) {}
      }

      stopSpeechSynthesisPlayback();
    }

    function scheduleVoiceRecognitionRestart(delayMs = 700) {
      clearVoiceRecognitionRestartTimer();

      if (!browserVoiceActive || voiceManualStopRequested || voiceReplyInFlight || voiceSpeechInFlight) {
        return;
      }

      logVoiceEvent('Scheduling browser speech recognition restart.', { delayMs });
      voiceRecognitionRestartTimer = setTimeout(() => {
        voiceRecognitionRestartTimer = null;
        startBrowserSpeechRecognition();
      }, delayMs);
    }

    function startBrowserSpeechRecognition() {
      if (!browserVoiceActive || voiceManualStopRequested || voiceReplyInFlight || voiceSpeechInFlight) {
        return;
      }

      const RecognitionCtor = getSpeechRecognitionCtor();
      if (!RecognitionCtor) {
        showVoiceError("Bu brauzer voice fallback uchun speech recognition'ni qo'llamaydi.");
        setVoiceStatus('Xatolik', '#EF4444', 'error', 'error');
        return;
      }

      if (!voiceRecognition) {
        voiceRecognition = new RecognitionCtor();
        voiceRecognition.lang = detectSpeechLang('');
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = false;
        voiceRecognition.maxAlternatives = 1;

        voiceRecognition.onstart = () => {
          logVoiceEvent('Browser speech recognition started.', { lang: voiceRecognition.lang });
          setVoiceStatus('Tinglamoqda...', '#10B981', 'live', 'listening');
        };

        voiceRecognition.onresult = (event) => {
          const transcript = Array.from(event.results || [])
            .map((result) => result && result[0] ? result[0].transcript : '')
            .join(' ')
            .trim();

          if (!transcript) {
            logVoiceEvent('Browser speech recognition returned empty transcript.');
            return;
          }

          void handleBrowserVoiceTranscript(transcript);
        };

        voiceRecognition.onerror = (event) => {
          const errorCode = event && event.error ? event.error : 'unknown';
          logVoiceEvent('Browser speech recognition error.', errorCode);

          if (errorCode === 'aborted') {
            return;
          }

          if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
            browserVoiceActive = false;
            showVoiceError("Brauzer mikrofon speech recognition ruxsatini bermadi.");
            setVoiceStatus('Xatolik', '#EF4444', 'error', 'error');
            return;
          }

          if (errorCode === 'no-speech') {
            scheduleVoiceRecognitionRestart(500);
            return;
          }

          showVoiceError(`Browser voice xatosi: ${errorCode}`);
        };

        voiceRecognition.onend = () => {
          logVoiceEvent('Browser speech recognition ended.');
          if (browserVoiceActive && !voiceManualStopRequested && !voiceReplyInFlight && !voiceSpeechInFlight) {
            scheduleVoiceRecognitionRestart();
          }
        };
      }

      try {
        voiceRecognition.lang = detectSpeechLang('');
        logVoiceEvent('Starting browser speech recognition.', { lang: voiceRecognition.lang });
        voiceRecognition.start();
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        if (!message.toLowerCase().includes('already started')) {
          logVoiceEvent('Browser speech recognition start failed.', message);
        }
      }
    }

    async function speakBrowserVoiceReply(text) {
      if (!text) return;

      if (voiceMuted) {
        logVoiceEvent('Voice reply muted. Skipping browser speech synthesis.');
        return;
      }

      if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
        logVoiceEvent('Speech synthesis is unavailable in this browser.');
        return;
      }

      await new Promise((resolve) => {
        stopSpeechSynthesisPlayback();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = detectSpeechLang(text);
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onstart = () => {
          voiceSpeechInFlight = true;
          logVoiceEvent('Browser speech synthesis started.', { lang: utterance.lang });
          setVoiceStatus("Javob o'qilmoqda...", '#10B981', 'live', 'connected');
        };

        utterance.onend = () => {
          voiceSpeechInFlight = false;
          logVoiceEvent('Browser speech synthesis ended.');
          resolve(true);
        };

        utterance.onerror = (event) => {
          voiceSpeechInFlight = false;
          logVoiceEvent('Browser speech synthesis error.', event && event.error ? event.error : 'unknown');
          resolve(true);
        };

        window.speechSynthesis.speak(utterance);
      });
    }

    async function handleBrowserVoiceTranscript(transcript) {
      if (!browserVoiceActive || !transcript) return;

      voiceReplyInFlight = true;
      logVoiceEvent('Browser voice transcript captured.', transcript);
      addMessage(transcript, 'user');

      const thinkingId = addThinkingIndicator();
      setVoiceStatus('Javob olinmoqda...', '#F59E0B', 'connecting', 'connecting');

      try {
        const reply = await requestAgentReply(transcript);
        addMessage(reply, 'bot');
        logVoiceEvent('Agent reply received for browser voice.', { length: reply.length });
        await speakBrowserVoiceReply(reply);
      } catch (error) {
        logVoiceEvent('Browser voice request failed.', error && error.message ? error.message : String(error));
        addMessage("Xatolik yuz berdi. Qaytadan urinib ko'ring.", 'bot');
        showVoiceError("Brauzer voice fallback javob olishda xatoga uchradi.");
      } finally {
        removeThinkingIndicator(thinkingId);
        voiceReplyInFlight = false;

        if (browserVoiceActive && !voiceManualStopRequested && !voiceSpeechInFlight) {
          scheduleVoiceRecognitionRestart();
        }
      }
    }

    async function startBrowserVoiceFallback(reason) {
      logVoiceEvent('Switching to browser voice fallback.', reason);
      stopBrowserVoiceFallback();
      await cleanupVoiceConnection();

      const RecognitionCtor = getSpeechRecognitionCtor();
      if (!RecognitionCtor) {
        showVoiceError("LiveKit worker topilmadi, brauzer voice fallback ham qo'llab-quvvatlanmaydi.");
        setVoiceStatus('Xatolik', '#EF4444', 'error', 'error');
        if (voiceToggleBtn) {
          voiceToggleBtn.classList.remove('live');
          voiceToggleBtn.disabled = false;
        }
        if (voiceDisconnectBtn) voiceDisconnectBtn.disabled = true;
        return;
      }

      browserVoiceActive = true;
      voiceManualStopRequested = false;
      showVoiceError("LiveKit worker topilmadi. Brauzer voice fallback ishlayapti.");
      setVoiceStatus('Brauzer voice faol', '#10B981', 'live', 'connected');

      if (voiceDisconnectBtn) voiceDisconnectBtn.disabled = false;
      if (voiceToggleBtn) {
        voiceToggleBtn.classList.add('live');
        voiceToggleBtn.disabled = true;
        voiceToggleBtn.setAttribute('title', 'Brauzer voice faol');
        voiceToggleBtn.setAttribute('aria-label', 'Brauzer voice faol');
      }

      syncVoiceMuteButton();
      startBrowserSpeechRecognition();
    }

    function formatVoiceError(error) {
      const name = error && error.name ? String(error.name) : '';
      const message = error && error.message ? String(error.message) : 'Voice start failed';
      const lower = message.toLowerCase();

      if (name === 'NotAllowedError' || lower.includes('permission')) {
        return "Mikrofon ruxsati berilmadi.";
      }

      if (name === 'NotFoundError' || lower.includes('device') || lower.includes('microphone')) {
        return "Mikrofon topilmadi yoki ishlamayapti.";
      }

      if (lower.includes('not configured')) {
        return "Serverda LiveKit voice sozlanmagan.";
      }

      if (lower.includes('invalid livekit room')) {
        return "Voice room nomi noto'g'ri.";
      }

      if (lower.includes('client not available')) {
        return "LiveKit client kutubxonasi yuklanmadi.";
      }

      if (lower.includes('autoplay')) {
        return "Brauzer audio ijrosini blokladi.";
      }

      return message;
    }

    function getLiveKit() {
      return window.livekitClient || window.LiveKitClient || window.LivekitClient || window.LiveKit || window.livekit || null;
    }

    function loadScript(url) {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-behzod-src="${url}"]`);
        if (existing) {
          logVoiceEvent('Reusing existing LiveKit client script.', url);
          existing.addEventListener('load', () => resolve(true));
          existing.addEventListener('error', () => reject(new Error('Failed to load script')));
          return;
        }

        logVoiceEvent('Loading LiveKit client script.', url);
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.dataset.behzodSrc = url;
        script.onload = () => {
          logVoiceEvent('LiveKit client script loaded.');
          resolve(true);
        };
        script.onerror = () => {
          logVoiceEvent('LiveKit client script failed to load.');
          reject(new Error('Failed to load script'));
        };
        document.head.appendChild(script);
      });
    }

    async function ensureLiveKitClient() {
      if (getLiveKit()) {
        logVoiceEvent('LiveKit client already available on window.');
        return;
      }

      let lastError = null;

      for (const candidateUrl of LIVEKIT_CLIENT_URLS) {
        try {
          logVoiceEvent('Trying LiveKit client source.', candidateUrl);
          await withTimeout(loadScript(candidateUrl), 15000, `LiveKit client load (${candidateUrl})`);
          if (getLiveKit()) {
            logVoiceEvent('LiveKit client confirmed on window.', candidateUrl);
            return;
          }
        } catch (error) {
          lastError = error;
          logVoiceEvent('LiveKit client source failed.', {
            url: candidateUrl,
            error: error && error.message ? error.message : String(error)
          });
        }
      }

      throw new Error(
        lastError && lastError.message
          ? `LiveKit client unavailable. Last error: ${lastError.message}`
          : 'LiveKit client not available after loading'
      );
    }

    async function startVoice() {
      if (voiceStartupInFlight) return;

      voiceStartupInFlight = true;
      const startGeneration = ++voiceStartGeneration;
      voiceManualStopRequested = false;
      logVoiceEvent('Voice start requested.', { generation: startGeneration, roomOverride: LIVEKIT_ROOM || null });
      showVoiceError('');
      clearVoiceWaitTimer();
      setVoiceStatus('Ulanmoqda...', '#F59E0B', 'connecting', 'connecting');
      if (voiceToggleBtn) voiceToggleBtn.disabled = true;

      try {
        stopBrowserVoiceFallback();
        await cleanupVoiceConnection();
        await ensureLiveKitClient();
        if (startGeneration !== voiceStartGeneration) return;

        logVoiceEvent('Requesting web session token.');
        let sessionToken = await getSessionToken();
        logVoiceEvent('Web session token ready.');
        const roomQuery = LIVEKIT_ROOM ? `?room=${encodeURIComponent(LIVEKIT_ROOM)}` : '';
        const tokenUrl = `${WIDGET_API}/api/livekit/token${roomQuery}`;
        logVoiceEvent('Requesting LiveKit token.', tokenUrl);
        let res = await withTimeout(fetch(tokenUrl, {
          headers: { 'X-Session-Token': sessionToken }
        }), 15000, 'LiveKit token request');
        logVoiceEvent('LiveKit token response received.', { status: res.status, ok: res.ok });

        if (res.status === 401) {
          logVoiceEvent('LiveKit token request returned 401. Refreshing session token.');
          sessionToken = await getSessionToken(true);
          res = await withTimeout(fetch(tokenUrl, {
            headers: { 'X-Session-Token': sessionToken }
          }), 15000, 'LiveKit token retry');
          logVoiceEvent('LiveKit token retry response received.', { status: res.status, ok: res.ok });
        }

        if (startGeneration !== voiceStartGeneration) return;

        const data = await res.json();
        if (!res.ok || !data || data.error) {
          throw new Error((data && data.error) ? data.error : `HTTP ${res.status}`);
        }
        logVoiceEvent('LiveKit token payload parsed.', {
          room: data.room || null,
          identity: data.identity || null,
          hasToken: !!data.token,
          url: data.url || null
        });

        const lk = getLiveKit();
        const Room = lk && lk.Room;
        const RoomEvent = lk && lk.RoomEvent;
        const Track = lk && lk.Track;
        const createLocalAudioTrack = lk && lk.createLocalAudioTrack;

        if (!Room || !RoomEvent || !Track || !createLocalAudioTrack) {
          throw new Error('LiveKit exports mismatch (Room/RoomEvent/Track/createLocalAudioTrack)');
        }
        logVoiceEvent('LiveKit client exports ready.');

        livekitRoom = new Room({ adaptiveStream: true, dynacast: true });
        logVoiceEvent('LiveKit room instance created.');
        livekitRoom.on(RoomEvent.Disconnected, () => {
          logVoiceEvent('Room disconnected event fired.');
          clearVoiceWaitTimer();
          detachRemoteVoiceTrack();
          setVoiceStatus('Ulanmagan', '#9CA3AF', 'idle', 'idle');
          if (voiceDisconnectBtn) voiceDisconnectBtn.disabled = true;
          if (voiceToggleBtn) {
            voiceToggleBtn.classList.remove('live');
            voiceToggleBtn.disabled = false;
            voiceToggleBtn.setAttribute('title', 'Ovozni boshlash');
            voiceToggleBtn.setAttribute('aria-label', 'Ovozni boshlash');
          }
          showVoiceError('');
          livekitRoom = null;
          livekitMicTrack = null;
        });

        if (RoomEvent.Reconnecting) {
          livekitRoom.on(RoomEvent.Reconnecting, () => {
            logVoiceEvent('Room reconnecting event fired.');
            setVoiceStatus('Qayta ulanmoqda...', '#F59E0B', 'connecting', 'connecting');
          });
        }

        if (RoomEvent.Reconnected) {
          livekitRoom.on(RoomEvent.Reconnected, () => {
            logVoiceEvent('Room reconnected event fired.');
            showVoiceError('');
            updateVoiceLiveStatus();
          });
        }

        if (RoomEvent.ParticipantConnected) {
          livekitRoom.on(RoomEvent.ParticipantConnected, (participant) => {
            logVoiceEvent('Remote participant connected.', participant ? {
              identity: participant.identity || null,
              sid: participant.sid || null
            } : null);
            showVoiceError('');
            updateVoiceLiveStatus();
          });
        }

        if (RoomEvent.ParticipantDisconnected) {
          livekitRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
            logVoiceEvent('Remote participant disconnected.', participant ? {
              identity: participant.identity || null,
              sid: participant.sid || null
            } : null);
            if (!hasRemoteParticipants() && !voiceRemoteAudioTrack) {
              showVoiceError("AI voice agent xonadan chiqdi.");
            }
            updateVoiceLiveStatus();
          });
        }

        livekitRoom.on(RoomEvent.TrackSubscribed, async (track) => {
          logVoiceEvent('Track subscribed event fired.', {
            sid: track && track.sid ? track.sid : null,
            kind: track && track.kind ? track.kind : null
          });
          if (track && track.kind === Track.Kind.Audio) {
            await attachRemoteVoiceTrack(track);
          }
        });

        if (RoomEvent.TrackUnsubscribed) {
          livekitRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
            logVoiceEvent('Track unsubscribed event fired.', {
              sid: track && track.sid ? track.sid : null,
              kind: track && track.kind ? track.kind : null
            });
            if (track && track.kind === Track.Kind.Audio) {
              detachRemoteVoiceTrack(track);
              updateVoiceLiveStatus();
            }
          });
        }

        logVoiceEvent('Connecting to LiveKit room.', { room: data.room || null, url: data.url || null });
        await withTimeout(livekitRoom.connect(data.url, data.token, { autoSubscribe: true }), 20000, 'LiveKit room connect');
        logVoiceEvent('Connected to LiveKit room.');
        if (startGeneration !== voiceStartGeneration) {
          await cleanupVoiceConnection();
          return;
        }

        logVoiceEvent('Creating local microphone track.');
        livekitMicTrack = await withTimeout(createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }), 15000, 'Microphone track creation');
        logVoiceEvent('Local microphone track created.', {
          sid: livekitMicTrack && livekitMicTrack.sid ? livekitMicTrack.sid : null
        });
        if (startGeneration !== voiceStartGeneration) {
          await cleanupVoiceConnection();
          return;
        }

        logVoiceEvent('Publishing local microphone track.');
        await withTimeout(livekitRoom.localParticipant.publishTrack(livekitMicTrack), 15000, 'Microphone track publish');
        logVoiceEvent('Local microphone track published.');
        syncVoiceMuteButton();
        showVoiceError('');
        updateVoiceLiveStatus();
        if (voiceDisconnectBtn) voiceDisconnectBtn.disabled = false;
        if (voiceToggleBtn) {
          voiceToggleBtn.classList.add('live');
          voiceToggleBtn.disabled = true;
          voiceToggleBtn.setAttribute('title', 'Ulangan');
          voiceToggleBtn.setAttribute('aria-label', 'Ulangan');
        }

        if (livekitRoom.remoteParticipants) {
          logVoiceEvent('Inspecting existing remote participants.', { count: livekitRoom.remoteParticipants.size });
          livekitRoom.remoteParticipants.forEach((participant) => {
            participant.trackPublications.forEach((publication) => {
              const track = publication.track;
              if (track && track.kind === Track.Kind.Audio) {
                logVoiceEvent('Found existing remote audio track publication.', {
                  participant: participant.identity || null,
                  sid: track.sid || null
                });
                attachRemoteVoiceTrack(track).catch(() => {});
              }
            });
          });
        }

        updateVoiceLiveStatus();
      } catch (e) {
        logVoiceEvent('Voice start failed.', e && e.message ? e.message : String(e));
        await cleanupVoiceConnection();
        showVoiceError(formatVoiceError(e));
        setVoiceStatus('Xatolik', '#EF4444', 'error', 'error');
        if (voiceToggleBtn) {
          voiceToggleBtn.classList.remove('live');
          voiceToggleBtn.disabled = false;
          voiceToggleBtn.setAttribute('title', 'Ovozni boshlash');
          voiceToggleBtn.setAttribute('aria-label', 'Ovozni boshlash');
        }
        if (voiceDisconnectBtn) voiceDisconnectBtn.disabled = true;
      } finally {
        voiceStartupInFlight = false;
      }
    }

    async function stopVoice() {
      logVoiceEvent('Voice stop requested.');
      voiceStartGeneration += 1;
      voiceStartupInFlight = false;
      stopBrowserVoiceFallback({ preserveManualStop: true });
      showVoiceError('');
      await cleanupVoiceConnection();
      setVoiceStatus('Ulanmagan', '#9CA3AF', 'idle', 'idle');
      if (voiceToggleBtn) {
        voiceToggleBtn.classList.remove('live');
        voiceToggleBtn.disabled = false;
        voiceToggleBtn.setAttribute('title', 'Ovozni boshlash');
        voiceToggleBtn.setAttribute('aria-label', 'Ovozni boshlash');
      }
      if (voiceDisconnectBtn) voiceDisconnectBtn.disabled = true;
    }
    
    // Minimize header when input is focused (for mobile)
    input.addEventListener('focus', () => {
      if (activeTab === 'chat') setHeaderMinimized(true);
    });
    
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (activeTab === 'chat') setHeaderMinimized(false);
      }, 200);
    });

    function setActiveTab(next) {
      if (next === activeTab) return;
      logVoiceEvent('Switching tab.', { from: activeTab, to: next });
      activeTab = next;

      tabs.forEach((btn) => {
        const tabName = btn.getAttribute('data-tab') || 'chat';
        if (tabName === next) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      if (chatView) chatView.classList.toggle('hidden', next !== 'chat');
      if (voiceView) voiceView.classList.toggle('hidden', next !== 'voice');
      setHeaderMinimized(next === 'voice');

      if (next === 'chat') {
        input.focus();
      }

      if (next !== 'voice') {
        stopVoice();
      }
    }

    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab') || 'chat';
        setActiveTab(tabName);
      });
    });

    if (voiceDebugClearBtn) {
      voiceDebugClearBtn.addEventListener('click', () => clearVoiceDebugLog());
    }

    if (voiceToggleBtn) voiceToggleBtn.addEventListener('click', () => startVoice());
    if (voiceDisconnectBtn) voiceDisconnectBtn.addEventListener('click', () => stopVoice());
    if (voiceMuteBtn) {
      voiceMuteBtn.addEventListener('click', () => {
        voiceMuted = !voiceMuted;
        syncVoiceMuteButton();
        if (browserVoiceActive && voiceMuted && !voiceReplyInFlight) {
          scheduleVoiceRecognitionRestart(300);
        }
      });
    }
    syncVoiceMuteButton();
    
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
      logVoiceEvent('Widget toggled.', { open: widgetContainer.classList.contains('open') });
      if (widgetContainer.classList.contains('open')) {
        if (activeTab === 'chat') input.focus();
      }
    });
    
    closeBtn.addEventListener('click', () => {
      logVoiceEvent('Widget close button clicked.');
      widgetContainer.classList.remove('open');
      stopVoice();
    });

    async function requestAgentReply(message) {
      let token = await getSessionToken();
      let response = await withTimeout(fetch(`${WIDGET_API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token, message })
      }), 20000, 'Chat request');

      if (response.status === 401) {
        token = await getSessionToken(true);
        response = await withTimeout(fetch(`${WIDGET_API}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: token, message })
        }), 20000, 'Chat retry');
      }

      const data = await response.json();
      if (!response.ok || !data || data.error) {
        throw new Error((data && data.error) ? data.error : `HTTP ${response.status}`);
      }

      return data.response || '';
    }
    
    async function sendMessage() {
      const message = input.value.trim();
      if (!message) return;
      
      addMessage(message, 'user');
      input.value = '';
      sendBtn.disabled = true;
      
      // Show thinking indicator
      const thinkingId = addThinkingIndicator();
      
      try {
        const reply = await requestAgentReply(message);
        removeThinkingIndicator(thinkingId);
        addMessage(reply, 'bot');
        
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
    
    logVoiceEvent('Voice UI initialized.');
    console.log('✅ Behzod Crisp-style widget loaded');
  };
})();
