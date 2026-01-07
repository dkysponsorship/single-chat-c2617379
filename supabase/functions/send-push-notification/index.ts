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
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ error: 'OneSignal credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Send push notification via OneSignal
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [profile.onesignal_player_id],
        headings: { en: title },
        contents: { en: body },
        data: data || {},
      }),
    });

    const oneSignalResult = await oneSignalResponse.json();
    console.log('OneSignal response:', oneSignalResult);

    if (!oneSignalResponse.ok) {
      console.error('OneSignal API error:', oneSignalResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification', details: oneSignalResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
