import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, RefreshCw, Send, Copy, Check, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOneSignalContext } from "@/components/OneSignalProvider";
import { useToast } from "@/hooks/use-toast";
import { isMedianApp, getMedianOneSignalInfo, getMedianPlayerId, isMedianSubscribed } from "@/lib/onesignal-median";
import { getPlatformType } from "@/lib/capacitor";

interface PushTestResult {
  timestamp: Date;
  recipientId: string;
  success: boolean;
  response?: any;
  error?: string;
}

interface DebugLog {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
  data?: any;
}

const PushDebug = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const oneSignal = useOneSignalContext();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [dbProfile, setDbProfile] = useState<any>(null);
  const [medianInfo, setMedianInfo] = useState<any>(null);
  const [pushResults, setPushResults] = useState<PushTestResult[]>([]);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    setDebugLogs(prev => [...prev, { timestamp: new Date(), type, message, data }]);
  };

  const fetchData = async () => {
    setLoading(true);
    setDebugLogs([]);
    addLog('info', 'Starting debug data fetch...');

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        addLog('error', 'No user session found');
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
      addLog('success', 'User ID:', session.user.id);

      // Get profile from database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, onesignal_player_id, push_enabled, device_platform')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        addLog('error', 'Failed to fetch profile:', profileError);
      } else {
        setDbProfile(profile);
        addLog('success', 'DB Profile fetched:', profile);
        
        if (!profile.onesignal_player_id) {
          addLog('warn', 'No OneSignal Player ID in database! Push will not work.');
        }
        if (!profile.push_enabled) {
          addLog('warn', 'Push is disabled in database!');
        }
      }

      // Check Median info if applicable
      if (isMedianApp()) {
        addLog('info', 'Median.co detected, fetching OneSignal info...');
        const info = await getMedianOneSignalInfo();
        setMedianInfo(info);
        
        if (info) {
          const playerId = getMedianPlayerId(info);
          const subscribed = isMedianSubscribed(info);
          addLog('success', 'Median OneSignal info:', { playerId, subscribed, rawInfo: info });
          
          if (playerId !== profile?.onesignal_player_id) {
            addLog('warn', `Player ID mismatch! Median: ${playerId}, DB: ${profile?.onesignal_player_id}`);
          }
        } else {
          addLog('warn', 'No Median OneSignal info returned');
        }
      } else {
        addLog('info', 'Not running in Median.co app');
      }

      // Check OneSignal context state
      if (oneSignal) {
        addLog('info', 'OneSignal Context State:', {
          isInitialized: oneSignal.isInitialized,
          playerId: oneSignal.playerId,
          pushEnabled: oneSignal.pushEnabled,
          isNative: oneSignal.isNative,
          platformType: oneSignal.platformType,
        });
      }

    } catch (error) {
      addLog('error', 'Unexpected error:', error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sendTestPush = async () => {
    if (!userId) {
      toast({ title: "No user", description: "Please login first", variant: "destructive" });
      return;
    }

    addLog('info', 'Sending test push notification...');

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          recipientUserId: userId,
          title: '🧪 Debug Test Push',
          body: `Test at ${new Date().toLocaleTimeString()}`,
          data: { type: 'debug_test', timestamp: Date.now().toString() },
        },
      });

      const result: PushTestResult = {
        timestamp: new Date(),
        recipientId: userId,
        success: !error && data?.success,
        response: data,
        error: error?.message,
      };

      setPushResults(prev => [result, ...prev]);

      if (error) {
        addLog('error', 'Push send failed (FunctionsError):', { name: error.name, message: error.message });
        toast({ title: "Push failed", description: error.message, variant: "destructive" });
      } else if (data?.success) {
        addLog('success', 'Push sent successfully!', data);
        toast({ title: "Push sent!", description: "Check your notifications" });
      } else {
        // Show detailed OneSignal error if available
        addLog('error', 'Push not delivered:', {
          reason: data?.reason,
          oneSignalStatus: data?.oneSignalStatus,
          oneSignalResult: data?.oneSignalResult,
          apiKeyPrefix: data?.apiKeyPrefix,
          error: data?.error,
          details: data?.details,
        });
        
        // Build descriptive error message
        let errorMsg = data?.reason || data?.error || 'Unknown reason';
        if (data?.oneSignalResult?.errors) {
          errorMsg = data.oneSignalResult.errors.join('; ');
        }
        if (data?.details) {
          errorMsg = data.details;
        }
        
        toast({ 
          title: "Push not delivered", 
          description: errorMsg, 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      addLog('error', 'Exception sending push:', { name: error.name, message: error.message, stack: error.stack });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const copyDebugInfo = () => {
    const debugInfo = {
      userId,
      dbProfile,
      medianInfo,
      oneSignalContext: oneSignal ? {
        isInitialized: oneSignal.isInitialized,
        playerId: oneSignal.playerId,
        pushEnabled: oneSignal.pushEnabled,
        platformType: oneSignal.platformType,
      } : null,
      platformType: getPlatformType(),
      isMedian: isMedianApp(),
      userAgent: navigator.userAgent,
      debugLogs: debugLogs.map(l => `[${l.type}] ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`),
    };

    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Debug info copied to clipboard" });
  };

  const getStatusBadge = (enabled: boolean | null | undefined) => {
    if (enabled === true) {
      return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Enabled</Badge>;
    } else if (enabled === false) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Disabled</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Push Debug</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={copyDebugInfo}>
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            Copy
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Push Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Platform</p>
                <Badge variant="outline">{getPlatformType()}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Median.co</p>
                <Badge variant={isMedianApp() ? "default" : "secondary"}>
                  {isMedianApp() ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Context Push</p>
                {getStatusBadge(oneSignal?.pushEnabled)}
              </div>
              <div>
                <p className="text-muted-foreground">DB Push</p>
                {getStatusBadge(dbProfile?.push_enabled)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player ID */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">OneSignal IDs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-muted-foreground">Context Player ID</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                {oneSignal?.playerId || 'Not set'}
              </code>
            </div>
            <div>
              <p className="text-muted-foreground">DB Player ID</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                {dbProfile?.onesignal_player_id || 'Not set'}
              </code>
            </div>
            {medianInfo && (
              <div>
                <p className="text-muted-foreground">Median Player ID</p>
                <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                  {getMedianPlayerId(medianInfo) || 'Not set'}
                </code>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">User ID</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                {userId || 'Not logged in'}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Test Push Button */}
        <Button className="w-full" onClick={sendTestPush} disabled={!userId}>
          <Send className="w-4 h-4 mr-2" />
          Send Test Push to Self
        </Button>

        {/* Push Results */}
        {pushResults.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Push Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                    {pushResults.map((result, i) => (
                    <div key={i} className={`p-2 rounded text-xs ${result.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <div className="flex justify-between">
                        <span>{result.timestamp.toLocaleTimeString()}</span>
                        <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                          {result.success ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                      {result.response?.reason && (
                        <p className="text-muted-foreground mt-1">Reason: {result.response.reason}</p>
                      )}
                      {result.response?.oneSignalStatus && (
                        <p className="text-muted-foreground mt-1">OneSignal Status: {result.response.oneSignalStatus}</p>
                      )}
                      {result.response?.oneSignalResult?.errors && (
                        <p className="text-red-500 mt-1">OneSignal Errors: {result.response.oneSignalResult.errors.join('; ')}</p>
                      )}
                      {result.response?.apiKeyPrefix && (
                        <p className="text-muted-foreground mt-1">API Key Prefix: {result.response.apiKeyPrefix}</p>
                      )}
                      {result.error && (
                        <p className="text-red-500 mt-1">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Debug Logs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Debug Logs</CardTitle>
            <CardDescription className="text-xs">Real-time debugging information</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60">
              <div className="space-y-1 font-mono text-xs">
                {debugLogs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`py-1 px-2 rounded ${
                      log.type === 'error' ? 'bg-red-500/10 text-red-500' :
                      log.type === 'warn' ? 'bg-yellow-500/10 text-yellow-600' :
                      log.type === 'success' ? 'bg-green-500/10 text-green-600' :
                      'bg-muted'
                    }`}
                  >
                    <span className="text-muted-foreground">[{log.timestamp.toLocaleTimeString()}]</span>
                    {' '}{log.message}
                    {log.data && (
                      <pre className="mt-1 text-[10px] overflow-x-auto">
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Raw Median Info */}
        {medianInfo && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Raw Median Info</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(medianInfo, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PushDebug;
