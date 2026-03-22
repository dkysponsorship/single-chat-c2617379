import { useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { GroupCallState, GroupCallType, ParticipantStream } from "@/hooks/useGroupCall";

interface GroupCallScreenProps {
  callState: GroupCallState;
  callType: GroupCallType;
  groupName: string;
  callDuration: number;
  isMuted: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  participantStreams: ParticipantStream[];
  onAccept?: () => void;
  onDecline?: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

const formatCallDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const VideoTile = ({
  stream,
  label,
  muted = false,
  mirror = false,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirror?: boolean;
}) => {
  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node && stream) {
        node.srcObject = stream;
      }
    },
    [stream]
  );

  return (
    <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${mirror ? "mirror-video" : ""}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-white/40 text-sm">Connecting...</p>
        </div>
      )}
      <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded-md">
        <span className="text-white text-xs">{label}</span>
      </div>
    </div>
  );
};

export const GroupCallScreen = ({
  callState,
  callType,
  groupName,
  callDuration,
  isMuted,
  isCameraOff,
  localStream,
  participantStreams,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleCamera,
}: GroupCallScreenProps) => {
  if (callState === "idle" || callState === "ended") return null;

  const isVideoCall = callType === "video";
  const totalParticipants = participantStreams.length + 1; // +1 for self

  const getGridClass = () => {
    if (totalParticipants <= 2) return "grid-cols-1";
    if (totalParticipants <= 4) return "grid-cols-2";
    return "grid-cols-2 md:grid-cols-3";
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[hsl(262,83%,20%)] to-[hsl(262,83%,10%)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center pt-12 pb-4 relative z-10">
        <div className="text-center">
          <h2 className="text-white text-lg font-semibold">{groupName}</h2>
          <p className="text-white/60 text-sm">
            {callState === "calling" && "Starting call..."}
            {callState === "incoming" &&
              (isVideoCall ? "Incoming Group Video Call" : "Incoming Group Voice Call")}
            {callState === "active" &&
              `${formatCallDuration(callDuration)} · ${totalParticipants} participants`}
          </p>
        </div>
      </div>

      {/* Video grid or voice call avatar view */}
      <div className="flex-1 overflow-auto px-4 pb-4 relative z-10">
        {callState === "active" && isVideoCall ? (
          <div className={`grid ${getGridClass()} gap-2 h-full auto-rows-fr`}>
            {/* Local video */}
            <VideoTile
              stream={isCameraOff ? null : localStream}
              label="You"
              muted
              mirror
            />
            {/* Remote participants */}
            {participantStreams.map((p) => (
              <VideoTile
                key={p.peerId}
                stream={p.stream}
                label={p.displayName || p.peerId.slice(0, 8)}
              />
            ))}
          </div>
        ) : callState === "active" && !isVideoCall ? (
          <div className="flex flex-wrap justify-center gap-6 items-center h-full">
            {/* Self */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-primary/30 flex items-center justify-center border-2 border-primary/40">
                <span className="text-white text-xl font-bold">You</span>
              </div>
              {isMuted && <MicOff className="w-4 h-4 text-white/60" />}
            </div>
            {participantStreams.map((p) => (
              <div key={p.peerId} className="flex flex-col items-center gap-2">
                <Avatar className="w-20 h-20 border-2 border-white/20">
                  <AvatarImage src={p.avatarUrl} />
                  <AvatarFallback className="bg-primary/30 text-white text-xl">
                    {(p.displayName || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white/80 text-xs">
                  {p.displayName || p.peerId.slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* Incoming / Calling state */
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center border-4 border-white/20 relative">
              <span className="text-white text-3xl font-bold">
                {groupName.slice(0, 2).toUpperCase()}
              </span>
              {callState === "calling" && (
                <div className="absolute inset-0 rounded-full call-pulse-ring" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-6 items-center justify-center relative z-10 pb-12">
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
              {isVideoCall ? (
                <Video className="w-7 h-7 text-white" />
              ) : (
                <Phone className="w-7 h-7 text-white" />
              )}
            </button>
          </>
        )}

        {(callState === "calling" || callState === "active") && (
          <>
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
            <button
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center call-button-bounce"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
