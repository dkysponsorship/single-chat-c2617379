import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Volume1 } from "lucide-react";
import { CallState } from "@/hooks/useVoiceCall";

interface VoiceCallScreenProps {
  callState: CallState;
  friendName: string;
  friendAvatar?: string;
  callDuration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

const formatCallDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const VoiceCallScreen = ({
  callState,
  friendName,
  friendAvatar,
  callDuration,
  isMuted,
  isSpeaker,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
}: VoiceCallScreenProps) => {
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (callState === "incoming" || callState === "calling") {
      ringtoneRef.current = new Audio("/notification.mp3");
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(() => {});
    }
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, [callState]);

  if (callState === "idle" || callState === "ended") return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[hsl(262,83%,20%)] to-[hsl(262,83%,10%)] flex flex-col items-center justify-between py-16 px-8">
      {/* Top - Friend Info */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="w-28 h-28 border-4 border-white/20">
            <AvatarImage src={friendAvatar} alt={friendName} />
            <AvatarFallback className="bg-primary/30 text-white text-3xl font-bold">
              {friendName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {callState === "calling" && (
            <div className="absolute inset-0 rounded-full call-pulse-ring" />
          )}
        </div>
        <h2 className="text-white text-2xl font-bold">{friendName}</h2>
        <p className="text-white/60 text-lg">
          {callState === "calling" && "Calling..."}
          {callState === "incoming" && "Incoming Call"}
          {callState === "active" && formatCallDuration(callDuration)}
        </p>
      </div>

      {/* Middle - Call Controls (active only) */}
      {callState === "active" && (
        <div className="flex gap-8">
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? "bg-white text-black" : "bg-white/20 text-white"
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button
            onClick={onToggleSpeaker}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isSpeaker ? "bg-white text-black" : "bg-white/20 text-white"
            }`}
          >
            {isSpeaker ? <Volume2 className="w-6 h-6" /> : <Volume1 className="w-6 h-6" />}
          </button>
        </div>
      )}

      {/* Bottom - Action Buttons */}
      <div className="flex gap-12 items-center">
        {callState === "incoming" && (
          <>
            <button
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center call-button-bounce"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-[hsl(142,76%,36%)] flex items-center justify-center call-button-bounce"
            >
              <Phone className="w-7 h-7 text-white" />
            </button>
          </>
        )}

        {(callState === "calling" || callState === "active") && (
          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center call-button-bounce"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};
