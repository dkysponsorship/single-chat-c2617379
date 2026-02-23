import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Volume1, Video, VideoOff } from "lucide-react";
import { CallState, CallType } from "@/hooks/useVoiceCall";

interface VoiceCallScreenProps {
  callState: CallState;
  callType: CallType;
  friendName: string;
  friendAvatar?: string;
  callDuration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept?: () => void;
  onDecline?: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleCamera: () => void;
}

const formatCallDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const VoiceCallScreen = ({
  callState,
  callType,
  friendName,
  friendAvatar,
  callDuration,
  isMuted,
  isSpeaker,
  isCameraOff,
  localStream,
  remoteStream,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
}: VoiceCallScreenProps) => {
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

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

  // Attach local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === "idle" || callState === "ended") return null;

  const isVideoCall = callType === "video";

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[hsl(262,83%,20%)] to-[hsl(262,83%,10%)] flex flex-col items-center justify-between">
      {/* Video Call - Full screen remote video */}
      {isVideoCall && callState === "active" && (
        <div className="absolute inset-0 bg-black">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-white/60">Connecting video...</p>
            </div>
          )}
        </div>
      )}

      {/* Local video preview (picture-in-picture style) */}
      {isVideoCall && callState === "active" && localStream && (
        <div className="absolute top-16 right-4 z-10 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg">
          {isCameraOff ? (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-muted-foreground" />
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror-video"
            />
          )}
        </div>
      )}

      {/* Top - Friend Info (voice call or calling/incoming states) */}
      {(!isVideoCall || callState !== "active") && (
        <div className="flex flex-col items-center gap-4 pt-16 relative z-10">
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
            {callState === "calling" && (isVideoCall ? "Video Calling..." : "Calling...")}
            {callState === "incoming" && (isVideoCall ? "Incoming Video Call" : "Incoming Call")}
            {callState === "active" && formatCallDuration(callDuration)}
          </p>
        </div>
      )}

      {/* Video call active - top overlay with name + duration */}
      {isVideoCall && callState === "active" && (
        <div className="relative z-10 pt-16 flex flex-col items-center">
          <h2 className="text-white text-lg font-semibold drop-shadow-lg">{friendName}</h2>
          <p className="text-white/80 text-sm drop-shadow-lg">{formatCallDuration(callDuration)}</p>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Middle - Call Controls (active only) */}
      {callState === "active" && (
        <div className="flex gap-6 relative z-10 mb-8">
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? "bg-white text-black" : "bg-white/20 text-white"
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          {isVideoCall && (
            <button
              onClick={onToggleCamera}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isCameraOff ? "bg-white text-black" : "bg-white/20 text-white"
              }`}
            >
              {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}
          {!isVideoCall && (
            <button
              onClick={onToggleSpeaker}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isSpeaker ? "bg-white text-black" : "bg-white/20 text-white"
              }`}
            >
              {isSpeaker ? <Volume2 className="w-6 h-6" /> : <Volume1 className="w-6 h-6" />}
            </button>
          )}
        </div>
      )}

      {/* Bottom - Action Buttons */}
      <div className="flex gap-12 items-center relative z-10 pb-16">
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
              {isVideoCall ? <Video className="w-7 h-7 text-white" /> : <Phone className="w-7 h-7 text-white" />}
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
