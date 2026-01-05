import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Volume2, VolumeX, Bell, BellOff, MessageSquare } from "lucide-react";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useNotificationContext } from "@/components/NotificationProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { 
    settings, 
    toggleSound, 
    toggleBrowserNotifications, 
    toggleToastNotifications 
  } = useNotificationSettings();
  const { permissionGranted, requestPermission } = useNotificationContext();

  const handleEnableBrowserPermission = async () => {
    await requestPermission();
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
      </div>
    </div>
  );
};

export default NotificationSettings;
