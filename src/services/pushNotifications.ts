import { supabase } from '@/integrations/supabase/client';

interface SendPushParams {
  recipientUserId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const sendPushNotification = async ({
  recipientUserId,
  title,
  body,
  data,
}: SendPushParams): Promise<boolean> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        recipientUserId,
        title,
        body,
        data,
      },
    });

    if (error) {
      console.error('Error sending push notification:', error);
      return false;
    }

    console.log('Push notification result:', result);
    return result?.success ?? false;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};
