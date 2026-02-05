
# Chat Theme Selector - Instagram Style with Animated Objects

## Overview
Add beautiful chat themes with animated floating objects (like Instagram DMs). The theme selector opens when you tap on the friend's name in the chat header - exactly like Instagram's behavior.

## Theme Categories

### Simple Gradient Themes (4)
1. **Default** - No background, clean look
2. **Minimal Light** - Soft gray gradient
3. **Minimal Dark** - Dark elegant gradient
4. **Lavender** - Soft purple/pink gradient

### Animated Object Themes (8)
5. **Love** - Pink gradient with floating hearts animation
6. **Galaxy** - Dark purple/blue with twinkling stars
7. **Ocean** - Blue gradient with floating bubbles
8. **Sky** - Light blue with drifting clouds
9. **Neon** - Vibrant purple/pink with glowing particles
10. **Sunset** - Orange/purple with floating sun rays
11. **Forest** - Green gradient with falling leaves
12. **Celebration** - Colorful with confetti animation

## User Experience Flow
1. User opens chat with a friend
2. Taps on friend's name in the header
3. Bottom drawer opens showing friend profile info + Theme option
4. Tap "Change Theme" shows theme grid
5. Each theme shows live preview with animation
6. Selected theme applies immediately with smooth transition
7. Theme saves per-chat to database

## Implementation Steps

### Step 1: Database Setup
Create table to store theme preferences:

```text
Table: chat_themes
+--------------+------------+
| Column       | Type       |
+--------------+------------+
| id           | uuid (PK)  |
| chat_id      | text       |
| user_id      | uuid       |
| theme_key    | text       |
| created_at   | timestamp  |
| updated_at   | timestamp  |
+--------------+------------+

Unique constraint: (chat_id, user_id)
RLS: Users can only manage their own preferences
```

### Step 2: Create Theme Definitions
New file: `src/styles/chatThemes.ts`

Define 12 themes with:
- `key`: Unique identifier (e.g., "love", "galaxy")
- `name`: Display name
- `background`: CSS gradient
- `pattern`: Animation class name (optional)
- `hasAnimation`: Boolean for animated themes
- `previewEmoji`: Emoji to show in selector

### Step 3: Create CSS Animations
Add to `src/index.css`:

- Floating hearts animation
- Twinkling stars animation
- Rising bubbles animation
- Drifting clouds animation
- Glowing particles animation
- Falling leaves animation
- Confetti animation

Each animation uses CSS keyframes with multiple animated divs positioned absolutely.

### Step 4: Create Theme Hook
New file: `src/hooks/useChatTheme.ts`

- Fetch current theme for chat from database
- Save/update theme preference
- Return current theme configuration
- Cache theme locally for instant load

### Step 5: Create Chat Profile Drawer
New file: `src/components/ChatProfileDrawer.tsx`

When tapping friend's name, drawer shows:
- Friend's avatar (large)
- Friend's display name
- Online/Offline status
- "Change Theme" button with current theme preview
- Opens theme selector when clicked

### Step 6: Create Theme Selector Component
New file: `src/components/ChatThemeSelector.tsx`

- Grid of 12 theme preview cards (3 columns)
- Each card shows:
  - Live animated background preview
  - Theme name
  - Checkmark if selected
- Smooth selection animation
- "Apply" button or instant apply on click

### Step 7: Update ChatWindow Component
Modify `src/components/ChatWindow.tsx`:

- Make friend name clickable (opens drawer)
- Add ChatProfileDrawer component
- Apply selected theme background to messages area
- Add theme animation overlay layer
- Pass theme state through props or context

---

## Technical Details

### Theme Configuration Structure
```text
Theme Object:
- key: "love"
- name: "Love"
- emoji: "❤️"
- background: "linear-gradient(180deg, #FFE5EC 0%, #FFCCD5 100%)"
- animation: "floating-hearts"
- hasAnimation: true
- objectCount: 15 (number of floating objects)
```

### Animation Implementation
Each animated theme has:
- Container div with `overflow: hidden` and `pointer-events: none`
- Multiple child divs with random positions and animation delays
- CSS animations for movement (float, drift, twinkle, etc.)
- Objects rendered as emoji or SVG for performance

### Files to Create
1. `src/styles/chatThemes.ts` - Theme definitions
2. `src/hooks/useChatTheme.ts` - Theme state management
3. `src/components/ChatProfileDrawer.tsx` - Friend profile + theme access
4. `src/components/ChatThemeSelector.tsx` - Theme picker grid
5. `src/components/ChatThemeBackground.tsx` - Animated background component

### Files to Modify
1. `src/components/ChatWindow.tsx` - Add clickable name + apply theme
2. `src/index.css` - Add animation keyframes and classes

### Animation Examples

**Floating Hearts:**
- 15 heart emojis at random x positions
- Float upward with gentle side-to-side sway
- Fade in at bottom, fade out at top
- 6-10 second animation cycle

**Twinkling Stars:**
- 30 small star dots
- Random positions across background
- Scale and opacity pulse animation
- Staggered timing for natural effect

**Rising Bubbles:**
- 20 circular divs with gradient fill
- Rise from bottom with wobble
- Various sizes (4px to 12px)
- Subtle glow effect

