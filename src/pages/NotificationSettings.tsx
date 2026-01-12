import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Volume2, VolumeX, Bell, BellOff, MessageSquare, Smartphone, Send, Loader2, CheckCircle, Bug } from "lucide-react";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useNotificationContext } from "@/components/NotificationProvider";
import { useOneSignalContext } from "@/components/OneSignalProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const NotificationSettings = () => {
  const navigate = useNavigate();
  const [testingPush, setTestingPush] = useState(false);
  const { 
    settings, 
    toggleSound, 
    toggleBrowserNotifications, 
    toggleToastNotifications 
  } = useNotificationSettings();
  const { permissionGranted, requestPermission } = useNotificationContext();
  const oneSignal = useOneSignalContext();

  const handleEnableBrowserPermission = async () => {
    await requestPermission();
  };

  const handleEnablePush = async () => {
    if (oneSignal) {
      await oneSignal.requestPermission();
    }
  };

  const handleDisablePush = async () => {
    if (oneSignal) {
      await oneSignal.disablePush();
    }
  };

  const handleTestPush = async () => {
    if (!oneSignal) return;
    
    setTestingPush(true);
    const success = await oneSignal.sendTestPush();
    setTestingPush(false);
    
    if (success) {
      toast.success("Test notification sent! Check your notification tray.");
    } else {
      toast.error("Failed to send test notification");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card pt-safe">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Notification Settings</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Push Notifications Card */}
        <Card className={oneSignal?.pushEnabled ? "border-primary/20 bg-primary/5" : "border-border"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Push Notifications
              {oneSignal?.platformType === 'median' && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Native App
                </span>
              )}
              {oneSignal?.platformType === 'capacitor' && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Native
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {oneSignal?.pushEnabled 
                ? "Push notifications are enabled. You'll receive notifications even when the app is closed."
                : "Enable push notifications to receive alerts when the app is closed or in background."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {oneSignal?.pushEnabled ? (
                <Button variant="outline" size="sm" onClick={handleDisablePush}>
                  Disable Push Notifications
                </Button>
              ) : (
                <Button onClick={handleEnablePush} size="sm">
                  Enable Push Notifications
                </Button>
              )}
              
              {oneSignal?.pushEnabled && oneSignal?.playerId && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleTestPush}
                  disabled={testingPush}
                >
                  {testingPush ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Send Test
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {oneSignal?.playerId && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-primary" />
                Device registered
              </p>
            )}
          </CardContent>
        </Card>

        {/* Browser Permission Card */}
        {!permissionGranted && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BellOff className="w-5 h-5 text-muted-foreground" />
                Browser Notifications Disabled
              </CardTitle>
              <CardDescription>
                Enable browser notifications to receive alerts even when the app is in the background.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleEnableBrowserPermission} size="sm">
                Enable Browser Notifications
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Preferences</CardTitle>
            <CardDescription>
              Customize how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sound Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-primary" />
                ) : (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Notification Sound</p>
                  <p className="text-sm text-muted-foreground">
                    Play a sound when you receive new messages
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings.soundEnabled} 
                onCheckedChange={toggleSound}
              />
            </div>

            <Separator />

            {/* Browser Notifications Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.browserNotificationsEnabled && permissionGranted ? (
                  <Bell className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Browser Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Show desktop notifications for new messages
                  </p>
                  {!permissionGranted && (
                    <p className="text-xs text-destructive mt-1">
                      Browser permission required
                    </p>
                  )}
                </div>
              </div>
              <Switch 
                checked={settings.browserNotificationsEnabled && permissionGranted} 
                onCheckedChange={toggleBrowserNotifications}
                disabled={!permissionGranted}
              />
            </div>

            <Separator />

            {/* Toast Notifications Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.toastNotificationsEnabled ? (
                  <MessageSquare className="w-5 h-5 text-primary" />
                ) : (
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">In-App Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Show toast notifications within the app
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings.toastNotificationsEnabled} 
                onCheckedChange={toggleToastNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              These settings are saved locally on this device and will apply to all your conversations.
            </p>
          </CardContent>
        </Card>

        {/* Debug Link */}
        <Button 
          variant="ghost" 
          className="w-full text-muted-foreground" 
          onClick={() => navigate('/push-debug')}
        >
          <Bug className="w-4 h-4 mr-2" />
          Push Debug Console
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
