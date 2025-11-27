(function () {
  let room = null;
  let livekitLoaded = false;
  let sessionStarted = false;
  let LivekitClientRef = null;
  let localAudioTrack = null;
  let micEnabled = false;
  let remoteAudioElement = null;
  let currentSessionId = null;

  /***************************
   * Inject Widget Styles
   ***************************/
  const style = document.createElement("style");
  style.innerHTML = `
    #liveavatar-chat-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 999px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    #liveavatar-chat-bubble:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
    }

    #liveavatar-widget {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 420px; /* Landscape Width */
      height: 280px; /* Landscape Height */
      background: transparent;
      border-radius: 24px;
      overflow: hidden;
      display: none;
      z-index: 999998;
      flex-direction: column;
      transition: background 0.3s ease, backdrop-filter 0.3s ease, box-shadow 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.05); 
    }

    /* Clear Glassmorphism on Hover */
    #liveavatar-widget:hover {
      background: rgba(255, 255, 255, 0.05); /* Clear/White tint */
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    #liveavatar-header {
      position: absolute; /* Overlay */
      top: 0;
      left: 0;
      width: 100%;
      height: 48px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      background: transparent;
      z-index: 10; /* Above video */
      opacity: 0;
      transition: opacity 0.3s ease;
      cursor: grab;
      box-sizing: border-box;
    }

    #liveavatar-widget:hover #liveavatar-header {
      opacity: 1;
    }

    #liveavatar-header:active {
      cursor: grabbing;
    }

    #liveavatar-close-btn {
      border: none;
      background: rgba(0, 0, 0, 0.2); /* Darker background for visibility on light video */
      color: #fff;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
      backdrop-filter: blur(4px);
    }

    #liveavatar-close-btn:hover {
      background: rgba(0, 0, 0, 0.4);
    }

    #liveavatar-container {
      width: 100%;
      height: 100%; /* Fill widget */
      position: absolute; /* Fill widget */
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 1; /* Behind controls */
    }
    
    #liveavatar-container canvas, #liveavatar-container video {
      width: 100%;
      height: 100%;
      object-fit: cover; /* Fill the container, crop if needed */
      pointer-events: auto; 
    }

    #liveavatar-controls {
      position: absolute; /* Overlay */
      bottom: 0;
      left: 0;
      width: 100%;
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      background: transparent; /* No background for cleaner look, or add gradient if needed */
      z-index: 10; /* Above video */
      box-sizing: border-box;
    }

    #liveavatar-widget:hover #liveavatar-controls {
      opacity: 1;
      transform: translateY(0);
    }

    /* Material Design Buttons */
    .liveavatar-icon-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(0, 0, 0, 0.3); /* Darker for contrast */
      backdrop-filter: blur(4px);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 18px;
      flex-shrink: 0;
    }

    .liveavatar-icon-btn:hover {
      background: rgba(0, 0, 0, 0.5);
      transform: scale(1.05);
    }

    .liveavatar-icon-btn.active {
      background: #ef4444;
      color: white;
    }

    #liveavatar-text-input {
      flex: 1;
      height: 40px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0 16px;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      color: #fff;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      outline: none;
      transition: background 0.2s;
      min-width: 0; /* Prevent overflow */
    }

    #liveavatar-text-input:focus {
      background: rgba(0, 0, 0, 0.5);
      border-color: rgba(255, 255, 255, 0.4);
    }

    #liveavatar-text-input::placeholder {
      color: rgba(255, 255, 255, 0.7);
    }

    /* Loader Styles */
    #liveavatar-loader {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 5; /* Below controls, above video container */
      flex-direction: column;
      gap: 12px;
    }

    .liveavatar-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
    }

    .liveavatar-loading-text {
      color: rgba(255, 255, 255, 0.9);
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 500;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Chat Messages Area */
    #liveavatar-messages {
      flex: 1;
      width: 100%;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 2; /* Above video container */
      /* Scrollbar styling */
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }

    #liveavatar-messages::-webkit-scrollbar {
      width: 6px;
    }
    #liveavatar-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    #liveavatar-messages::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    .liveavatar-message {
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #fff;
      word-wrap: break-word;
      animation: fadeIn 0.3s ease;
    }

    .liveavatar-message.user {
      align-self: flex-end;
      background: rgba(99, 102, 241, 0.8); /* Primary color */
      border-bottom-right-radius: 2px;
    }

    .liveavatar-message.avatar {
      align-self: flex-start;
      background: rgba(0, 0, 0, 0.6);
      border-bottom-left-radius: 2px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Chat Messages Area */
    #liveavatar-messages {
      flex: 1;
      width: 100%;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 2; /* Above video container */
      /* Scrollbar styling */
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }

    #liveavatar-messages::-webkit-scrollbar {
      width: 6px;
    }
    #liveavatar-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    #liveavatar-messages::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    .liveavatar-message {
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #fff;
      word-wrap: break-word;
      animation: fadeIn 0.3s ease;
    }

    .liveavatar-message.user {
      align-self: flex-end;
      background: rgba(99, 102, 241, 0.8); /* Primary color */
      border-bottom-right-radius: 2px;
    }

    .liveavatar-message.avatar {
      align-self: flex-start;
      background: rgba(0, 0, 0, 0.6);
      border-bottom-left-radius: 2px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  /***************************
   * Icons (Feather Icons)
   ***************************/
  const ICONS = {
    micOn: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
    micOff: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
    speakerOn: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
    speakerOff: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`,
  };

  /***************************
   * Create UI Elements
   ***************************/
  const bubble = document.createElement("div");
  bubble.id = "liveavatar-chat-bubble";
  bubble.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    AI Assistant`;
  document.body.appendChild(bubble);

  const widget = document.createElement("div");
  widget.id = "liveavatar-widget";
  widget.innerHTML = `
    <div id="liveavatar-header" title="Drag to move">
      <button id="liveavatar-close-btn" aria-label="Close avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div id="liveavatar-container"></div>
    <div id="liveavatar-messages"></div>
    <div id="liveavatar-loader">
      <div class="liveavatar-spinner"></div>
      <div class="liveavatar-loading-text">Connecting...</div>
    </div>
    <div id="liveavatar-controls">
      <button id="liveavatar-speaker-btn" class="liveavatar-icon-btn" type="button" aria-label="Toggle Speaker">
        ${ICONS.speakerOn}
      </button>
      <button id="liveavatar-mic-btn" class="liveavatar-icon-btn" type="button" aria-label="Toggle Microphone">
        ${ICONS.micOn}
      </button>
      <input
        id="liveavatar-text-input"
        type="text"
        placeholder="Type a message..."
      />
      <button id="liveavatar-send-btn" class="liveavatar-icon-btn" type="button" aria-label="Send Message">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
    </div>
  `;
  document.body.appendChild(widget);

  const textInput = widget.querySelector("#liveavatar-text-input");
  const sendBtn = widget.querySelector("#liveavatar-send-btn");
  const micBtn = widget.querySelector("#liveavatar-mic-btn");
  const speakerBtn = widget.querySelector("#liveavatar-speaker-btn");
  const closeBtn = widget.querySelector("#liveavatar-close-btn");
  const header = widget.querySelector("#liveavatar-header");
  const loader = widget.querySelector("#liveavatar-loader");
  const messagesContainer = widget.querySelector("#liveavatar-messages");

  /***************************
   * Drag Functionality
   ***************************/
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  header.addEventListener("mousedown", dragStart);
  document.addEventListener("mouseup", dragEnd);
  document.addEventListener("mousemove", drag);

  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === header || header.contains(e.target)) {
      if (e.target.closest("button")) return;
      isDragging = true;
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      xOffset = currentX;
      yOffset = currentY;

      setTranslate(currentX, currentY, widget);
    }
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }

  /***************************
   * Load LiveKit SDK (UMD)
   ***************************/
  function loadLiveKitSDK() {
    return new Promise((resolve, reject) => {
      if (livekitLoaded && window.LivekitClient) {
        return resolve(window.LivekitClient);
      }

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.min.js";
      script.async = true;

      script.onload = () => {
        if (window.LivekitClient) {
          livekitLoaded = true;
          console.log("[LiveAvatar] LiveKit SDK loaded");
          resolve(window.LivekitClient);
        } else {
          reject(
            new Error("LivekitClient global not found after loading script")
          );
        }
      };

      script.onerror = () => {
        reject(new Error("Failed to load LiveKit SDK script"));
      };

      document.body.appendChild(script);
    });
  }

  /***************************
   * Backend call (create session)
   ***************************/
  async function createSession() {
    const response = await fetch(LiveAvatarWP.ajaxUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "liveavatar_create_session" }),
    });

    const json = await response.json();
    console.log("[LiveAvatar] Session API response:", json);
    if (json.success && json.data && json.data.session_id) {
      currentSessionId = json.data.session_id;
    }
    return json;
  }

  /***************************
   * (Optional) Backend call (send text)
   ***************************/
  async function sendTextMessage(message) {
    if (!message || !message.trim()) return;

    try {
      sendBtn.disabled = true;

      const response = await fetch(LiveAvatarWP.ajaxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "liveavatar_send_text",
          message: message.trim(),
          session_id: currentSessionId || "",
        }),
      });

      const json = await response.json();
      console.log("[LiveAvatar] send_text response:", json);

      // Append User Message to Chat
      appendMessage(message.trim(), "user");
      textInput.value = ""; // Clear input

      if (!json.success) {
        const msg =
          json.data?.message || json.data?.response?.message || "Unknown error";
        alert("Error sending message to avatar:\n" + msg);
      }
    } catch (err) {
      console.error("[LiveAvatar] send_text error:", err);
      const msg =
        err?.message || err?.toString() || JSON.stringify(err, null, 2);
      alert("Error sending message:\n" + msg);
    } finally {
      sendBtn.disabled = false;
    }
  }

  function appendMessage(text, sender) {
    if (!messagesContainer) return;
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("liveavatar-message", sender);
    msgDiv.textContent = text;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /***************************
   * Attach Remote Video (Chroma Key)
   ***************************/
  function setupRoomEventHandlers(LivekitClient, room) {
    const { RoomEvent, Track } = LivekitClient;
    const container = document.getElementById("liveavatar-container");

    // Handle Data Messages (Chat from Avatar)
    room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
      const str = new TextDecoder().decode(payload);
      console.log("[LiveAvatar] DataReceived:", str);
      try {
        const data = JSON.parse(str);
        // Check for system events to ignore
        if (
          data.type === "avatar_start_talking" ||
          data.type === "avatar_stop_talking" ||
          data.type === "ping"
        ) {
          console.log("[LiveAvatar] Ignoring system event:", data.type);
          return;
        }

        if (data.text) {
          appendMessage(data.text, "avatar");
        } else if (data.message) {
          appendMessage(data.message, "avatar");
        } else {
          // If it's a JSON object but has no text/message and isn't a known event,
          // we assume it's metadata and do NOT show it to the user.
          console.log("[LiveAvatar] Ignoring non-text JSON:", data);
        }
      } catch (e) {
        // If it's not JSON, assume it's a plain text message
        // But check if it looks like a system message just in case
        if (
          str.includes("avatar_start_talking") ||
          str.includes("avatar_stop_talking")
        ) {
          return;
        }
        appendMessage(str, "avatar");
      }
    });

    // Clear container
    container.innerHTML = "";

    // Variables for the rendering loop
    let animationFrameId = null;
    let videoElement = null;
    let canvasElement = null;
    let canvasCtx = null;

    // Chroma Key Configuration (Standard Green Screen)
    // Adjust these values to tune the sensitivity
    const CHROMA_TARGET = { r: 0, g: 255, b: 0 }; // Target green
    const SIMILARITY_THRESHOLD = 100; // Distance threshold in RGB space
    const SMOOTHNESS = 0.1; // Alpha blending for edges (0.0 - 1.0)

    function renderFrame() {
      if (!videoElement || !canvasCtx || !canvasElement) return;

      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        const width = videoElement.videoWidth;
        const height = videoElement.videoHeight;

        // Resize canvas if dimensions change
        if (canvasElement.width !== width || canvasElement.height !== height) {
          canvasElement.width = width;
          canvasElement.height = height;
        }

        // Draw video frame to canvas
        canvasCtx.drawImage(videoElement, 0, 0, width, height);

        // Get image data for pixel manipulation
        const frame = canvasCtx.getImageData(0, 0, width, height);
        const data = frame.data;
        const len = data.length;

        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate distance from target color (Euclidean distance in RGB)
          // Simple approximation: check if Green is dominant and significantly brighter than Red and Blue
          // Or use standard Euclidean distance

          // Method 1: Simple Green Dominance (often faster/better for clear green screens)
          // if (g > 100 && g > r * 1.4 && g > b * 1.4) {
          //   data[i + 3] = 0; // Transparent
          // }

          // Method 2: Euclidean Distance (more precise control)
          const dist = Math.sqrt(
            (r - CHROMA_TARGET.r) ** 2 +
              (g - CHROMA_TARGET.g) ** 2 +
              (b - CHROMA_TARGET.b) ** 2
          );

          if (dist < SIMILARITY_THRESHOLD) {
            // Full transparency
            data[i + 3] = 0;
          } else if (dist < SIMILARITY_THRESHOLD + 20) {
            // Soft edge (semi-transparent)
            // Linear fade from 0 to 255
            const alpha = (dist - SIMILARITY_THRESHOLD) / 20;
            data[i + 3] = Math.floor(alpha * 255);
          }
        }

        // Put modified data back
        canvasCtx.putImageData(frame, 0, 0);
      }

      animationFrameId = requestAnimationFrame(renderFrame);
    }

    // Handle Data Messages (Chat from Avatar)
    room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
      const str = new TextDecoder().decode(payload);
      console.log("[LiveAvatar] DataReceived:", str);
      // Assuming the payload is just the text string.
      // If it's JSON, parse it.
      try {
        // Try parsing as JSON first just in case
        const data = JSON.parse(str);
        if (data.text) {
          appendMessage(data.text, "avatar");
        } else if (data.message) {
          appendMessage(data.message, "avatar");
        } else {
          appendMessage(str, "avatar");
        }
      } catch (e) {
        // Not JSON, just text
        appendMessage(str, "avatar");
      }
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log(
        "[LiveAvatar] TrackSubscribed:",
        track.kind,
        participant.identity
      );

      if (track.kind === Track.Kind.Video) {
        // 🎥 Remote video (avatar)

        // 1. Create hidden video element
        // IMPORTANT: Some browsers won't update the video texture if display is 'none'.
        // Use opacity 0 and absolute positioning instead.
        videoElement = document.createElement("video");
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.style.position = "absolute";
        videoElement.style.opacity = "0";
        videoElement.style.pointerEvents = "none";
        videoElement.style.zIndex = "-1";

        // 2. Create visible canvas
        canvasElement = document.createElement("canvas");
        canvasElement.style.width = "100%";
        canvasElement.style.height = "100%";
        canvasElement.style.objectFit = "cover"; // Fill container
        canvasCtx = canvasElement.getContext("2d", {
          willReadFrequently: true,
        });

        container.innerHTML = "";
        container.appendChild(videoElement);
        container.appendChild(canvasElement);

        // Hide loader when video is ready
        if (loader) loader.style.display = "none";

        // Attach track to video element
        track.attach(videoElement);

        // Explicitly play (sometimes needed)
        videoElement
          .play()
          .catch((e) => console.warn("[LiveAvatar] Video play error:", e));

        // Start rendering loop
        renderFrame();
      } else if (track.kind === Track.Kind.Audio) {
        // 🔊 Remote audio (avatar voice)
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.controls = false;
        audioEl.style.display = "none";
        audioEl.muted = false;
        audioEl.volume = 1.0;

        document.body.appendChild(audioEl);
        track.attach(audioEl);

        // Store reference for speaker toggle
        remoteAudioElement = audioEl;

        // Try to play explicitly
        audioEl
          .play()
          .then(() => {
            console.log("[LiveAvatar] Remote audio playing");
          })
          .catch((err) => {
            console.warn(
              "[LiveAvatar] Audio autoplay blocked, user may need to interact:",
              err
            );
          });
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      console.log("[LiveAvatar] TrackUnsubscribed:", track.kind);
      const elements = track.getAttachedElements();
      elements.forEach((el) => el.remove());

      if (track.kind === Track.Kind.Video) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        videoElement = null;
        canvasElement = null;
        videoElement = null;
        canvasElement = null;
        canvasCtx = null;
      } else if (track.kind === Track.Kind.Audio) {
        remoteAudioElement = null;
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log("[LiveAvatar] Room disconnected");

      // Cleanup loop
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      videoElement = null;
      canvasElement = null;
      videoElement = null;
      canvasElement = null;
      canvasCtx = null;
      remoteAudioElement = null;

      container.innerHTML =
        "<p style='color:#fff;font-family:system-ui;font-size:14px;text-align:center;padding:16px;'>Session ended.</p>";

      if (loader) loader.style.display = "none";

      sessionStarted = false;
      localAudioTrack = null;
      micEnabled = false;
      micEnabled = false;
      if (micBtn) micBtn.innerHTML = ICONS.micOn; // Reset to default state (ready to turn on)

      // Reset speaker button
      if (speakerBtn) {
        speakerBtn.innerHTML = ICONS.speakerOn;
        speakerBtn.classList.remove("active"); // Assuming active style implies "off" or "special state", but here default is On.
      }
    });
  }

  /***************************
   * Toggle / Enable Microphone
   ***************************/
  async function toggleMicrophone(LivekitClient, room) {
    if (!micBtn) return;

    // First time: create track and publish
    if (!localAudioTrack) {
      // Check secure origin requirements
      const isSecure =
        location.protocol === "https:" ||
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1";

      if (!isSecure) {
        alert(
          "Microphone access requires HTTPS or running on localhost.\n" +
            "Current origin: " +
            location.origin
        );
        return;
      }

      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        alert("Microphone API is not available in this browser/context.");
        return;
      }

      const { createLocalAudioTrack } = LivekitClient;
      if (!createLocalAudioTrack) {
        console.warn(
          "[LiveAvatar] createLocalAudioTrack not available on LivekitClient"
        );
        return;
      }

      try {
        localAudioTrack = await createLocalAudioTrack();
        await room.localParticipant.publishTrack(localAudioTrack);
        micEnabled = true;
        micBtn.innerHTML = ICONS.micOn;
        micBtn.classList.add("active"); // Visual indicator for ON
        console.log("[LiveAvatar] Microphone track published");
      } catch (err) {
        console.error("[LiveAvatar] Microphone error:", err);
        const msg =
          err?.message || err?.toString() || JSON.stringify(err, null, 2);
        alert(
          "Unable to access microphone. Please check browser permissions.\n\n" +
            msg
        );
      }

      return;
    }

    // Subsequent toggles: mute/unmute
    try {
      if (micEnabled) {
        if (typeof localAudioTrack.mute === "function") {
          await localAudioTrack.mute();
        }
        micEnabled = false;
        micBtn.innerHTML = ICONS.micOff;
        micBtn.classList.remove("active");
      } else {
        if (typeof localAudioTrack.unmute === "function") {
          await localAudioTrack.unmute();
        }
        micEnabled = true;
        micBtn.innerHTML = ICONS.micOn;
        micBtn.classList.add("active");
      }
    } catch (err) {
      console.error("[LiveAvatar] Mic toggle error:", err);
    }
  }

  /***************************
   * Toggle Speaker (Mute Remote Audio)
   ***************************/
  /***************************
   * Toggle Speaker (Mute Remote Audio)
   ***************************/
  function toggleSpeaker(room) {
    if (!speakerBtn) return;

    const isMuted = speakerBtn.classList.contains("muted");
    const newMuteState = !isMuted; // If currently muted, we want to unmute (false). If not muted, we want to mute (true).

    // 1. Mute/Unmute the specific remote element we captured
    if (remoteAudioElement) {
      remoteAudioElement.muted = newMuteState;
    }

    // 2. "Nuclear option": Find ALL audio elements in the document and mute/unmute them
    // This catches any elements created by LiveKit that we might have missed
    const allAudioElements = document.querySelectorAll("audio");
    allAudioElements.forEach((el) => {
      el.muted = newMuteState;
    });

    // 3. Iterate through LiveKit participants (just to be safe)
    if (room) {
      room.participants.forEach((participant) => {
        participant.audioTracks.forEach((publication) => {
          if (publication.track) {
            publication.track.attachedElements.forEach((el) => {
              el.muted = newMuteState;
            });
          }
        });
      });
    }

    // Update UI
    if (newMuteState) {
      // Now Muted
      speakerBtn.innerHTML = ICONS.speakerOff;
      speakerBtn.classList.add("muted");
    } else {
      // Now Unmuted
      speakerBtn.innerHTML = ICONS.speakerOn;
      speakerBtn.classList.remove("muted");
    }
  }

  /***************************
   * Start Avatar Session
   ***************************/
  async function startAvatarSession() {
    if (sessionStarted) return;

    // Show loader immediately
    if (loader) loader.style.display = "flex";

    try {
      const [LivekitClient, result] = await Promise.all([
        loadLiveKitSDK(),
        createSession(),
      ]);

      LivekitClientRef = LivekitClient;

      if (!result.success) {
        const msg =
          result.data?.response?.message ||
          result.data?.message ||
          "Unknown server error";

        if (msg.includes("Session concurrency limit")) {
          alert(
            "Your LiveAvatar/HeyGen account reached the session limit.\n" +
              "Close other sessions and try again."
          );
          return;
        }

        alert("Server Error:\n" + msg);
        return;
      }

      const livekitUrl = result.data.livekit_url;
      const livekitToken = result.data.livekit_token;

      console.log("[LiveAvatar] LiveKit URL:", livekitUrl);
      console.log(
        "[LiveAvatar] LiveKit Token (truncated):",
        livekitToken?.slice(0, 20) + "..."
      );

      const { Room } = LivekitClient;

      room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      setupRoomEventHandlers(LivekitClient, room);

      await room.connect(livekitUrl, livekitToken);
      console.log("[LiveAvatar] Connected to LiveKit room.");

      sessionStarted = true;
    } catch (err) {
      console.error("🚨 LiveAvatar / LiveKit error:", err);
      const msg =
        err?.message || err?.toString() || JSON.stringify(err, null, 2);
      alert("LiveAvatar Error:\n\n" + msg);
    } finally {
      // If error occurred and we didn't connect, hide loader
      if (!sessionStarted && loader) {
        loader.style.display = "none";
      }
    }
  }

  /***************************
   * Close Widget and Cleanup
   ***************************/
  function closeWidget() {
    widget.style.display = "none";
    if (loader) loader.style.display = "none";

    if (room) {
      try {
        room.disconnect();
      } catch (err) {
        console.warn("[LiveAvatar] Error while disconnecting room:", err);
      }
      room = null;
    }

    sessionStarted = false;

    // Stop and release microphone
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack = null;
    }

    micEnabled = false;
    if (micBtn) {
      micBtn.innerHTML = ICONS.micOn;
      micBtn.classList.remove("active");
    }
    if (speakerBtn) {
      speakerBtn.innerHTML = ICONS.speakerOn;
      speakerBtn.classList.remove("muted");
    }

    const container = document.getElementById("liveavatar-container");
    if (container) {
      container.innerHTML = "";
    }
  }

  /***************************
   * Button Handlers
   ***************************/
  // AI Assistance button (open / close)
  bubble.addEventListener("click", () => {
    const isHidden =
      widget.style.display === "none" || widget.style.display === "";

    if (isHidden) {
      widget.style.display = "flex";
      startAvatarSession();
    } else {
      closeWidget();
    }
  });

  // Close (X) button
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      closeWidget();
    });
  }

  // Mic button
  if (micBtn) {
    micBtn.addEventListener("click", async () => {
      if (!room || !LivekitClientRef) {
        alert("Please start AI Assistance first.");
        return;
      }
      await toggleMicrophone(LivekitClientRef, room);
    });
  }

  // Speaker button
  if (speakerBtn) {
    speakerBtn.addEventListener("click", () => {
      if (!room) return;
      toggleSpeaker(room);
    });
  }

  // Text Send button
  if (sendBtn && textInput) {
    sendBtn.addEventListener("click", () => {
      const message = textInput.value;
      if (!message.trim()) return;
      sendTextMessage(message);
      textInput.value = "";
    });

    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const message = textInput.value;
        if (!message.trim()) return;
        sendTextMessage(message);
        textInput.value = "";
      }
    });
  }
})();
