(function () {
  let session = null;
  let sdkLoaded = false;
  let sessionStarted = false;
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
      width: 60px;
      height: 60px;
      background: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 4px 15px rgba(0,0,0, 0.2);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    #liveavatar-chat-bubble:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0, 0.3);
    }

    #liveavatar-widget {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 375px;
      height: 600px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 24px;
      overflow: hidden;
      display: none;
      z-index: 999998;
      flex-direction: column;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    #liveavatar-loader {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      /* Simple CSS loader */
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 2s linear infinite;
      z-index: 11;
      display: none; /* Initially hidden */
    }

    @keyframes spin {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }

    #liveavatar-messages {
        position: absolute;
        bottom: 80px; /* Adjust based on controls height */
        left: 0;
        width: 100%;
        height: 150px; /* Example height */
        overflow-y: auto;
        padding: 10px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 5;
    }

    .liveavatar-message {
        padding: 8px 12px;
        border-radius: 18px;
        max-width: 80%;
        font-size: 14px;
        line-height: 1.4;
    }

    .liveavatar-message.user {
        background-color: #007bff;
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
    }

    .liveavatar-message.avatar {
        background-color: #e9e9eb;
        color: black;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
    }


    #liveavatar-header {
      width: 100%;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      background: transparent;
      z-index: 10;
      box-sizing: border-box;
      cursor: move; /* Add move cursor to header */
    }

    .liveavatar-control-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
    }

    .liveavatar-control-btn:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .liveavatar-control-btn.active {
        background: #007bff;
    }

    #liveavatar-close-btn {
      border: none;
      background: rgba(255, 255, 255, 0.1);
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
    }

    #liveavatar-close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    #liveavatar-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    #liveavatar-container video,
    #liveavatar-container canvas {
      width: 100%;
      height: 100%;
      object-fit: cover;
      position: absolute;
      top: 0;
      left: 0;
    }

    #liveavatar-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      z-index: 10;
      box-sizing: border-box;
    }

    #liveavatar-text-input {
      flex: 1;
      height: 48px;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0 20px;
      font-size: 16px;
      font-family: 'Inter', sans-serif;
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
      outline: none;
      transition: background 0.2s;
    }

    #liveavatar-text-input:focus {
      background: rgba(255, 255, 255, 0.2);
    }

    #liveavatar-text-input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    #liveavatar-send-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: #fff;
      color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 20px;
    }

    #liveavatar-send-btn:hover {
      background: #eee;
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  document.body.appendChild(bubble);

  const widget = document.createElement("div");
  widget.id = "liveavatar-widget";
  widget.innerHTML = `
    <div id="liveavatar-header">
      <button id="liveavatar-close-btn" aria-label="Close avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div id="liveavatar-loader"></div>
    <div id="liveavatar-container"></div>
    <div id="liveavatar-messages"></div>
    <div id="liveavatar-controls">
       <button id="liveavatar-mic-btn" class="liveavatar-control-btn" aria-label="Toggle Microphone">${ICONS.micOn}</button>
       <input
        id="liveavatar-text-input"
        type="text"
        placeholder="Type a message..."
      />
      <button id="liveavatar-send-btn" aria-label="Send Message">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
       <button id="liveavatar-speaker-btn" class="liveavatar-control-btn" aria-label="Toggle Speaker">${ICONS.speakerOn}</button>
    </div>
  `;
  document.body.appendChild(widget);

  const textInput = widget.querySelector("#liveavatar-text-input");
  const sendBtn = widget.querySelector("#liveavatar-send-btn");
  const closeBtn = widget.querySelector("#liveavatar-close-btn");
  const header = widget.querySelector("#liveavatar-header");
  const messagesContainer = widget.querySelector("#liveavatar-messages");
  const loader = widget.querySelector("#liveavatar-loader");
  const micBtn = widget.querySelector("#liveavatar-mic-btn");
  const speakerBtn = widget.querySelector("#liveavatar-speaker-btn");


  /***************************
   * Load LiveAvatar SDK (UMD)
   ***************************/
  function loadLiveAvatarSDK() {
    return new Promise((resolve, reject) => {
      if (sdkLoaded && window.HeyGen) {
        return resolve(window.HeyGen);
      }

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/@heygen/liveavatar-web-sdk/dist/liveavatar.umd.js";
      script.async = true;

      script.onload = () => {
        if (window.HeyGen) {
          sdkLoaded = true;
          console.log("[LiveAvatar] LiveAvatar SDK loaded");
          resolve(window.HeyGen);
        } else {
          reject(
            new Error("HeyGen global not found after loading script")
          );
        }
      };

      script.onerror = () => {
        reject(new Error("Failed to load LiveAvatar SDK script"));
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
   * Send Text Message via SDK
   ***************************/
  async function sendTextMessage(message) {
    if (!session || !message || !message.trim()) return;

    try {
      sendBtn.disabled = true;
      appendMessage(message.trim(), "user");
      textInput.value = "";

      await session.message(message.trim());
    } catch (err) {
      console.error("[LiveAvatar] sendTextMessage error:", err);
      alert("Error sending message: " + err.message);
    } finally {
      sendBtn.disabled = false;
    }
  }

  /***************************
   * Microphone and Speaker Toggle
   ***************************/
  async function toggleMicrophone() {
    if (!session) return;

    micEnabled = !micEnabled;
    micBtn.innerHTML = micEnabled ? ICONS.micOff : ICONS.micOn;
    micBtn.classList.toggle("active", micEnabled);

    if (micEnabled) {
      if (!localAudioTrack) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localAudioTrack = stream.getAudioTracks()[0];
        } catch (err) {
          console.error("[LiveAvatar] Microphone access error:", err);
          alert("Could not get microphone access. Please allow permission.");
          micEnabled = false; // Revert state
          micBtn.innerHTML = ICONS.micOn;
          micBtn.classList.remove("active");
          return;
        }
      }
      session.startMicrophone(localAudioTrack);
    } else {
      if (localAudioTrack) {
        session.stopMicrophone();
      }
    }
  }

  function toggleSpeaker() {
    if (!remoteAudioElement) return;

    const isMuted = remoteAudioElement.muted;
    remoteAudioElement.muted = !isMuted;
    speakerBtn.innerHTML = isMuted ? ICONS.speakerOn : ICONS.speakerOff;
    speakerBtn.classList.toggle("muted", !isMuted);
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
   * Start Avatar Session
   ***************************/
  async function startAvatarSession() {
    if (sessionStarted) return;

    // Show loader immediately
    if (loader) loader.style.display = "flex";

    try {
      const [HeyGen, result] = await Promise.all([
        loadLiveAvatarSDK(),
        createSession(),
      ]);

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

      const sessionToken = result.data.session_token;

      session = new HeyGen.LiveAvatarSession(sessionToken);

      const container = document.getElementById("liveavatar-container");
      container.innerHTML = ""; // Clear previous elements

      const mediaElement = document.createElement('video');
      mediaElement.autoplay = true;
      mediaElement.playsInline = true;
      mediaElement.style.display = 'none'; // Hide the original video

      const canvasElement = document.createElement('canvas');

      container.appendChild(mediaElement);
      container.appendChild(canvasElement);

      session.on("session.stream", (media) => {
        mediaElement.srcObject = media;
        mediaElement.onloadedmetadata = () => {
            mediaElement.play().catch(console.error);

            // Start chroma key processing and assign the cleanup function
            stopChromaKeyProcessing = setupChromaKey(mediaElement, canvasElement, {
                minHue: 80,
                maxHue: 140,
                minSaturation: 0.25,
                threshold: 1.1,
            });
        };

        if (loader) loader.style.display = "none";
        remoteAudioElement = mediaElement;
      });

      session.on('agent.message', (data) => {
        console.log('[LiveAvatar] agent.message:', data);
        if (data.message) {
          appendMessage(data.message, 'avatar');
        }
      });

      await session.start();


      sessionStarted = true;
    } catch (err) {
      console.error("🚨 LiveAvatar / SDK error:", err);
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
  let stopChromaKeyProcessing = null;

  function applyChromaKey(sourceVideo, targetCanvas, options) {
      const ctx = targetCanvas.getContext("2d", { willReadFrequently: true, alpha: true });
      if (!ctx || sourceVideo.readyState < 2) return;

      targetCanvas.width = sourceVideo.videoWidth;
      targetCanvas.height = sourceVideo.videoHeight;

      ctx.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height);

      const imageData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;

          let h = 0;
          if (delta !== 0) {
              if (max === r) {
                  h = ((g - b) / delta) % 6;
              } else if (max === g) {
                  h = (b - r) / delta + 2;
              } else {
                  h = (r - g) / delta + 4;
              }
          }

          h = Math.round(h * 60);
          if (h < 0) h += 360;

          const s = max === 0 ? 0 : delta / max;

          const isGreen = h >= options.minHue && h <= options.maxHue && s > options.minSaturation && g > r * options.threshold && g > b * options.threshold;

          if (isGreen) {
              data[i + 3] = 0; // Set alpha to 0 for green pixels
          }
      }

      ctx.putImageData(imageData, 0, 0);
  }

  function setupChromaKey(sourceVideo, targetCanvas, options) {
      let animationFrameId = null;

      const render = () => {
          applyChromaKey(sourceVideo, targetCanvas, options);
          animationFrameId = requestAnimationFrame(render);
      };

      render();

      return () => {
          if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
          }
      };
  }


  /***************************
   * Close Widget and Cleanup
   ***************************/
  function closeWidget() {
    widget.style.display = "none";
    if (loader) loader.style.display = "none";

    if (stopChromaKeyProcessing) {
      stopChromaKeyProcessing();
      stopChromaKeyProcessing = null;
    }

    if (session) {
      try {
        session.stop();
      } catch (err) {
        console.warn("[LiveAvatar] Error while stopping session:", err);
      }
      session = null;
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

  // Mic and Speaker buttons
  if (micBtn) {
    micBtn.addEventListener("click", toggleMicrophone);
  }
  if (speakerBtn) {
    speakerBtn.addEventListener("click", toggleSpeaker);
  }

  /***************************
   * Draggable Widget
   ***************************/
  let isDragging = false;
  let offsetX, offsetY;

  if (header) {
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = widget.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      widget.style.transition = 'none'; // Disable transition for smooth dragging
    });
  }

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    // Constrain within the viewport
    const maxX = window.innerWidth - widget.offsetWidth;
    const maxY = window.innerHeight - widget.offsetHeight;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    widget.style.left = `${newX}px`;
    widget.style.top = `${newY}px`;
    widget.style.bottom = 'auto'; // Override fixed positioning
    widget.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      widget.style.transition = 'all 0.3s ease'; // Re-enable transition
    }
  });

})();
