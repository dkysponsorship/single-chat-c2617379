

# Voice Call aur Location Sharing - Instagram Style

## Overview
Chat header me Instagram jaisa phone icon add karenge voice call ke liye, aur chat me location share karne ka option bhi milega. Voice call WebRTC se real-time hogi aur location GPS coordinates + Google Maps link ke saath share hoga.

## Voice Call Feature

### Kaise kaam karega
1. Chat header me phone icon hoga (Instagram jaisa)
2. Tap karne pe calling screen aayegi with ringtone
3. Dusre user ko incoming call notification aayegi
4. Accept karne pe real-time voice call start
5. Call end button se disconnect

### Signaling - Supabase Realtime
WebRTC call ke liye "signaling" chahiye (dono users ka connection setup). Iske liye:
- `call_signals` table banayenge database me
- Supabase Realtime se signal messages exchange honge
- Offer/Answer/ICE candidates exchange

### Call Flow
```text
User A taps Call button
    |
    v
Create WebRTC offer --> Store in call_signals table
    |
    v
User B gets notification (Realtime subscription)
    |
    v
User B sees Incoming Call screen
    |
    v
User B Accepts --> Creates WebRTC answer --> Store in call_signals
    |
    v
ICE candidates exchange via call_signals table
    |
    v
Voice call connected (peer-to-peer audio)
    |
    v
Either user taps End --> Call disconnected
```

### UI Screens
**Outgoing Call Screen:**
- Friend ka avatar (large, centered)
- Friend ka name
- "Calling..." text with animation
- Red end call button

**Incoming Call Screen:**
- Friend ka avatar (large, centered)
- Friend ka name
- "Incoming Call" text
- Green accept + Red decline buttons

**Active Call Screen:**
- Friend ka avatar
- Call duration timer
- Mute button
- Speaker button
- Red end call button

## Location Sharing Feature

### Kaise kaam karega
1. Message input ke paas attachment menu me "Location" option
2. Tap karne pe browser GPS permission maangega
3. Current location milega
4. Chat me location message show hoga with map preview
5. Tap karne pe Google Maps me khulega

### Location Message
- Static map image preview (using OpenStreetMap)
- Address text (if available via reverse geocoding)
- Clickable - opens Google Maps with coordinates

## Database Changes

### New Table: `call_signals`
```text
+----------------+-----------+
| Column         | Type      |
+----------------+-----------+
| id             | uuid (PK) |
| chat_id        | text      |
| caller_id      | uuid      |
| receiver_id    | uuid      |
| signal_type    | text      |
| signal_data    | jsonb     |
| status         | text      |
| created_at     | timestamp |
+----------------+-----------+

signal_type: 'offer', 'answer', 'ice-candidate', 'end-call'
status: 'calling', 'active', 'ended', 'declined', 'missed'
RLS: Both caller and receiver can read/write
Realtime enabled for instant signal delivery
```

### Messages table update
- `location_lat` column (double precision, nullable)
- `location_lng` column (double precision, nullable)  
- `location_address` column (text, nullable)

## Implementation Steps

### Step 1: Database Migration
- Create `call_signals` table with RLS
- Add location columns to `messages` table
- Enable realtime on `call_signals`

### Step 2: WebRTC Hook
New file: `src/hooks/useVoiceCall.ts`
- WebRTC peer connection setup
- Signaling via Supabase Realtime (subscribe to call_signals changes)
- Handle offer/answer/ICE candidate exchange
- Microphone access
- Mute/unmute, speaker toggle
- Call duration timer
- Cleanup on disconnect

### Step 3: Call UI Components
New file: `src/components/VoiceCallScreen.tsx`
- Full screen overlay for call
- Outgoing call view (calling animation)
- Incoming call view (accept/decline)
- Active call view (timer, mute, speaker, end)
- Ringtone audio playback

### Step 4: Incoming Call Listener
New file: `src/components/IncomingCallProvider.tsx`
- Global listener for incoming calls
- Shows incoming call screen anywhere in app
- Uses Supabase Realtime subscription on call_signals

### Step 5: Location Message Component
New file: `src/components/LocationMessage.tsx`
- Map preview using static OpenStreetMap tile image
- Address display
- Click to open Google Maps

### Step 6: Update ChatWindow Header
Modify: `src/components/ChatWindow.tsx`
- Add Phone icon button in header (between friend name and gallery icon)
- Add location option in attachment/input area
- Render LocationMessage for messages with coordinates

### Step 7: Update Chat Page
Modify: `src/pages/Chat.tsx`
- Add VoiceCallScreen component
- Handle call initiation
- Handle location send function
- Pass location data to message sending

### Step 8: Update Message Sending
Modify: `src/pages/Chat.tsx`
- New `handleSendLocation` function
- Get GPS coordinates via `navigator.geolocation`
- Insert message with lat/lng/address columns

---

## Technical Details

### Files to Create
1. `src/hooks/useVoiceCall.ts` - WebRTC + signaling logic
2. `src/components/VoiceCallScreen.tsx` - Call UI (outgoing/incoming/active)
3. `src/components/IncomingCallProvider.tsx` - Global incoming call listener
4. `src/components/LocationMessage.tsx` - Location message bubble with map

### Files to Modify
1. `src/components/ChatWindow.tsx` - Phone icon in header + location button + LocationMessage rendering
2. `src/pages/Chat.tsx` - Call handlers + location send
3. `src/App.tsx` - Wrap with IncomingCallProvider
4. `src/index.css` - Call screen animations (pulse ring, etc.)

### WebRTC Configuration
- STUN servers: Google public STUN servers (free)
- No TURN server needed for most cases (direct peer-to-peer)
- Audio only (no video)

### Header Layout (Instagram style)
```text
[<Back] [Avatar] [Name + Status] ............. [Phone] [Gallery] [Menu]
```

Phone icon position: Right side, before the gallery button - exactly like Instagram.

### Location in Input Area
- New MapPin icon button next to image attachment
- Or inside the attachment dropdown menu

### Call Notification
- Push notification sent to receiver when call starts
- Ringtone plays on incoming call screen
- 30 second timeout - if no answer, call marked as "missed"
