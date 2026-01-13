import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  recipientUserId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID_RAW = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY_RAW = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Normalize secrets by trimming whitespace/newlines
    const appId = (ONESIGNAL_APP_ID_RAW ?? '').trim();
    const apiKey = (ONESIGNAL_REST_API_KEY_RAW ?? '').trim();

    // Log key info for debugging (never log full key!)
    const apiKeyPrefix = apiKey.substring(0, 12);
    const apiKeyLength = apiKey.length;
    console.log('OneSignal config:', { appId, apiKeyPrefix, apiKeyLength });

    if (!appId || !apiKey) {
      console.error('OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'OneSignal credentials not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key type - V2 App keys should start with os_v2_app_
    const isV2ApiKey = apiKey.startsWith('os_v2_');
    if (isV2ApiKey && !apiKey.startsWith('os_v2_app_')) {
      console.error('Invalid API key type. V2 keys must be App API Keys (os_v2_app_...), not Organization keys (os_v2_org_...)');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid OneSignal API key type',
          details: 'Use OneSignal App API Key (os_v2_app_...), not Organization Key (os_v2_org_...)',
          apiKeyPrefix,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OneSignal supports legacy REST API keys (Authorization: Basic) and newer V2 keys (Authorization: Key)
    const oneSignalApiUrl = isV2ApiKey
      ? 'https://api.onesignal.com/notifications?c=push'
      : 'https://onesignal.com/api/v1/notifications';
    const oneSignalAuthHeader = isV2ApiKey
      ? `Key ${apiKey}`
      : `Basic ${apiKey}`;

    const { recipientUserId, title, body, data } = await req.json() as PushNotificationRequest;

    if (!recipientUserId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipientUserId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client to get recipient's player ID
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onesignal_player_id, push_enabled')
      .eq('id', recipientUserId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recipient profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile?.onesignal_player_id) {
      console.log('Recipient has no OneSignal player ID registered');
      return new Response(
        JSON.stringify({ success: false, reason: 'no_player_id' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile?.push_enabled) {
      console.log('Recipient has push notifications disabled');
      return new Response(
        JSON.stringify({ success: false, reason: 'push_disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if this is a subscription ID (UUID format) or legacy player ID
    // Subscription IDs are UUIDs (36 chars with hyphens), player IDs are shorter
    const playerId = profile.onesignal_player_id;
    const isSubscriptionId = playerId.length === 36 && playerId.includes('-');

    console.log('Sending push to:', playerId, 'isSubscriptionId:', isSubscriptionId, 'isV2ApiKey:', isV2ApiKey);

    // Build the request body based on ID type
    // Add deep-link URL for notification tap action
    const chatDeepLink = data?.senderId ? `/chat/${data.senderId}` : null;

    const requestBody: Record<string, any> = {
      app_id: appId,
      // V2 API expects target_channel for /notifications
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      data: {
        ...(data || {}),
        // Deep-link data for Median.co tap handler
        targetUrl: chatDeepLink,
      },
      // For web: open specific URL when clicked
      ...(chatDeepLink && { url: chatDeepLink }),
    };

    // Use the appropriate targeting field
    if (isSubscriptionId) {
      // New format: subscription IDs (from Median.co and newer SDKs)
      requestBody.include_subscription_ids = [playerId];
    } else {
      // Legacy format: player IDs
      requestBody.include_player_ids = [playerId];
    }

    console.log('OneSignal request body:', JSON.stringify(requestBody));

    // Send push notification via OneSignal
    const oneSignalResponse = await fetch(oneSignalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': oneSignalAuthHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const oneSignalResult = await oneSignalResponse.json();
    console.log('OneSignal response status:', oneSignalResponse.status);
    console.log('OneSignal response body:', oneSignalResult);

    // Return 200 even on OneSignal failure so UI can see the actual error
    if (!oneSignalResponse.ok) {
      console.error('OneSignal API error:', oneSignalResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'onesignal_rejected',
          oneSignalStatus: oneSignalResponse.status,
          oneSignalResult,
          apiKeyPrefix,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, oneSignalResult }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
