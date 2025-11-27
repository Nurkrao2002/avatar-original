# LiveAvatar Chatbot Plugin API Reference

## Overview

The LiveAvatar Chatbot plugin integrates a floating, interactive AI avatar into your WordPress site. It uses LiveKit for real-time video/audio streaming and a custom backend API for session management and chat.

## Shortcode

Use the shortcode `[liveavatar_chatbot]` to embed the widget on any page.
_(Note: The widget is currently injected via JavaScript, so the shortcode is primarily a placeholder or for server-side initialization if needed in the future.)_

## JavaScript Widget (`liveavatar-widget.js`)

The widget is a self-contained JavaScript module that handles:

- **UI Rendering**: Creates the floating bubble, chat window, and controls.
- **Session Management**: Connects to the backend to start a session.
- **LiveKit Integration**: Handles video/audio tracks and chroma key rendering.
- **Chat Interface**: Sends text messages to the backend and displays responses.

### Key Functions

- `startAvatarSession()`: Initializes the session, loads LiveKit SDK, and connects to the room.
- `setupRoomEventHandlers(room)`: Handles track subscriptions (video/audio) and data messages (chat).
- `renderFrame()`: Performs real-time chroma keying on the video feed to remove the background.
- `toggleMicrophone()`: Manages local audio track publishing and muting.
- `sendTextMessage(message)`: Sends user input to the backend.

## Backend API (`liveavatar-chatbot.php`)

The plugin exposes AJAX endpoints for the frontend widget.

### `wp_ajax_liveavatar_create_session`

- **Description**: Creates a new avatar session.
- **Method**: POST
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "livekit_url": "wss://...",
      "livekit_token": "...",
      "session_id": "..."
    }
  }
  ```

### `wp_ajax_liveavatar_send_text`

- **Description**: Sends a text message to the active avatar session.
- **Method**: POST
- **Parameters**:
  - `message`: The text message to send.
  - `session_id`: The current session ID.
- **Response**:
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

## External API Integration

The plugin communicates with `https://api.liveavatar.com/v1` (assumed endpoint).

- **Token**: `POST /v1/sessions/token`
- **Start**: `POST /v1/sessions/start`
- **Chat**: `POST /v1/sessions/chat`

## Configuration

Configure the plugin in **Settings > LiveAvatar Chatbot**:

- **LiveAvatar API Key**: Your API key.
- **Avatar ID**: The ID of the avatar to use.
- **Context ID**: The context/knowledge base ID.
