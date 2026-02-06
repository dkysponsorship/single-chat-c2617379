
# Custom Image Background for Chat Theme

## Overview
Tumhe chat background me apni custom image lagane ka option chahiye jaise reference image me hai (Sidhu Moose Wala poster type). Animated themes ko remove karke simple image/gradient themes rakhne hain. Buttons ki position same rahegi.

## Kya Changes Honge

### 1. Database Update
`chat_themes` table me ek naya column add karenge:
- `custom_image_url` - User ki upload ki hui image ka URL store karne ke liye

### 2. Storage Bucket
Chat wallpapers store karne ke liye ek naya storage bucket banayenge:
- Bucket name: `chat-wallpapers`
- Users apni images upload kar sakenge

### 3. Theme System Changes
Themes se animated options remove karke simple options rakhenge:
- Default (no background)
- Minimal Light
- Minimal Dark
- Custom Image (user upload)

### 4. UI Updates

**ChatThemeSelector.tsx:**
- Simple theme cards (gradients only)
- "Choose from Gallery" button - phone gallery se image select
- Uploaded image ka preview

**ChatThemeBackground.tsx:**
- Animations code remove
- Custom image display support with `object-cover` style (image puri screen cover karega, reference image jaisa)

**ChatProfileDrawer.tsx:**
- Theme selector pe custom image option

### 5. Image Upload Flow
1. User "Choose from Gallery" tap karega
2. Phone gallery se image select
3. Image upload hogi storage me
4. Background apply ho jayega

---

## Technical Details

### Database Migration
```sql
-- Add custom_image_url column to chat_themes
ALTER TABLE chat_themes 
ADD COLUMN custom_image_url TEXT;
```

### Storage Bucket
```sql
-- Create chat-wallpapers bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-wallpapers', 'chat-wallpapers', true);
```

### Files to Modify

1. **src/styles/chatThemes.ts**
   - Remove all animated themes (love, galaxy, ocean, sky, neon, sunset, forest, celebration)
   - Add `custom` theme type for user-uploaded images
   - Update ChatTheme interface to support `customImageUrl`

2. **src/hooks/useChatTheme.ts**
   - Fetch `custom_image_url` along with `theme_key`
   - Add `setCustomImage` function for uploading/saving custom wallpaper
   - Update return type to include `customImageUrl`

3. **src/components/ChatThemeSelector.tsx**
   - Remove animated theme previews
   - Add "Gallery" button with image picker
   - Show current custom image if set
   - Handle image selection and upload

4. **src/components/ChatThemeBackground.tsx**
   - Remove all animation rendering code
   - Add support for `customImageUrl` prop
   - Render full-screen background image with `object-cover`

5. **src/components/ChatProfileDrawer.tsx**
   - Pass `customImageUrl` to ChatThemeSelector
   - Handle custom image selection callback

6. **src/components/ChatWindow.tsx**
   - Pass `customImageUrl` from theme hook to ChatThemeBackground

7. **src/index.css**
   - Remove all theme animation CSS (floating-hearts, twinkling-stars, etc.)
   - Keep only essential styles

### Updated Theme Options
```text
Themes available:
1. Default - transparent (app default)
2. Minimal Light - soft gray gradient
3. Minimal Dark - dark gradient
4. Custom Image - user ki apni image
```

### Image Handling
- Image upload to Supabase Storage `chat-wallpapers` bucket
- Image displayed with `object-fit: cover` to fill screen like reference
- Image positioned behind messages with `z-index: 0`
- Messages remain readable on top

### Result Preview
Reference image jaisa result milega:
- Full screen custom wallpaper
- Messages clearly visible upar
- Header aur input bar unchanged
- No animations, clean static background
