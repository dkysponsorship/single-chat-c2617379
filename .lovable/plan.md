

# Call Duration Message + Camera Flip + Screen Sharing

## 3 Features to Add

### 1. Call End → Duration Message in Chat (Instagram style)
Jab call end ho, chat me ek system message aaye: "📞 Voice call · 02:35" or "📹 Video call · 05:12" or "📞 Missed call"

**Changes:**
- `src/pages/Chat.tsx`: `endCall` ke baad ek message insert karo in `messages` table with call duration info
- Create a helper `formatCallDuration` to format seconds → "MM:SS"
- Insert message like: `📞 Voice call · 02:35` (for completed calls) or `📞 Missed voice call` (for missed/declined)
- Wrap `voiceCall.endCall()` in a new function that also sends the call summary message

### 2. Camera Flip Button (Front ↔ Back)
Video call me ek button add karna hai jo front/back camera switch kare.

**Changes:**
- `src/hooks/useVoiceCall.ts`: Add `flipCamera` function
  - Get current video track → stop it
  - Request new stream with `facingMode: environment` or `user` (toggle)
  - Replace track on peer connection using `RTCRtpSender.replaceTrack()`
  - Update `localStream` state
  - Track current facing mode in a ref

- `src/components/VoiceCallScreen.tsx`: Add flip camera button (🔄 icon) next to camera toggle during active video call
  - New `onFlipCamera` prop
  - `SwitchCamera` icon from lucide-react

### 3. Screen Sharing During Video Call
Video call me screen share option.

**Changes:**
- `src/hooks/useVoiceCall.ts`: Add `toggleScreenShare` function
  - Use `navigator.mediaDevices.getDisplayMedia()` to get screen stream
  - Replace video track on peer connection
  - When screen share stops (user clicks browser's stop button), revert to camera
  - Track `isScreenSharing` state

- `src/components/VoiceCallScreen.tsx`: Add screen share button (Monitor icon) during active video call
  - New `onToggleScreenShare` and `isScreenSharing` props
  - Show `MonitorUp` / `Monitor` icon

## Files to Modify
1. **`src/hooks/useVoiceCall.ts`** - Add `flipCamera`, `toggleScreenShare`, `isScreenSharing`, facingMode ref
2. **`src/components/VoiceCallScreen.tsx`** - Add flip camera + screen share buttons, new props
3. **`src/pages/Chat.tsx`** - Wrap endCall to insert call duration message, pass new props to VoiceCallScreen

## Technical Notes
- `replaceTrack()` avoids renegotiation - smooth track swap
- `getDisplayMedia()` has built-in browser UI for screen selection
- Call duration message uses existing `messages` table, content like `📞 Voice call · 02:35`
- Missed/declined calls show `📞 Missed voice call` or `📹 Missed video call`

