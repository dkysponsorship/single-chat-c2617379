import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CallState = "idle" | "calling" | "incoming" | "active" | "ended";
export type CallType = "voice" | "video";

interface UseVoiceCallProps {
  currentUserId: string;
  friendId: string;
  chatId: string;
}

export const useVoiceCall = ({ currentUserId, friendId, chatId }: UseVoiceCallProps) => {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("voice");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callSignalId, setCallSignalId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callTypeRef = useRef<CallType>("voice");
  const facingModeRef = useRef<"user" | "environment">("user");
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    remoteStreamRef.current = null;
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeaker(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setCallSignalId(null);
    facingModeRef.current = "user";
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await supabase.from("call_signals").insert({
          chat_id: chatId,
          caller_id: currentUserId,
          receiver_id: friendId,
          signal_type: "ice-candidate",
          signal_data: { candidate: event.candidate.toJSON() },
          status: "active",
        } as any);
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      
      if (callTypeRef.current === "voice") {
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
        }
        remoteAudioRef.current.srcObject = stream;
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [chatId, currentUserId, friendId]);

  // Start a call (voice or video)
  const startCall = useCallback(async (type: CallType = "voice") => {
    try {
      callTypeRef.current = type;
      setCallType(type);

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video" ? { facingMode: "user", width: 640, height: 480 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const { data, error } = await supabase.from("call_signals").insert({
        chat_id: chatId,
        caller_id: currentUserId,
        receiver_id: friendId,
        signal_type: "offer",
        signal_data: { sdp: offer.sdp, type: offer.type, callType: type },
        status: "calling",
      } as any).select().single();

      if (error) throw error;
      
      setCallSignalId(data.id);
      setCallState("calling");

      timeoutRef.current = setTimeout(async () => {
        await endCall("missed");
      }, 30000);
    } catch (err) {
      console.error("Error starting call:", err);
      cleanup();
      setCallState("idle");
    }
  }, [chatId, currentUserId, friendId, createPeerConnection, cleanup]);

  // Accept incoming call
  const acceptCall = useCallback(async (signalId: string, offerSdp: RTCSessionDescriptionInit, incomingCallType: CallType = "voice") => {
    try {
      callTypeRef.current = incomingCallType;
      setCallType(incomingCallType);

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: incomingCallType === "video" ? { facingMode: "user", width: 640, height: 480 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from("call_signals").insert({
        chat_id: chatId,
        caller_id: currentUserId,
        receiver_id: friendId,
        signal_type: "answer",
        signal_data: { sdp: answer.sdp, type: answer.type },
        status: "active",
      } as any);

      await supabase.from("call_signals").update({ status: "active" }).eq("id", signalId);

      setCallSignalId(signalId);
      setCallState("active");
      
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accepting call:", err);
      cleanup();
      setCallState("idle");
    }
  }, [chatId, currentUserId, friendId, createPeerConnection, cleanup]);

  // Decline incoming call
  const declineCall = useCallback(async (signalId: string) => {
    await supabase.from("call_signals").update({ status: "declined" }).eq("id", signalId);
    cleanup();
    setCallState("idle");
  }, [cleanup]);

  // End call
  const endCall = useCallback(async (status: string = "ended") => {
    if (callSignalId) {
      await supabase.from("call_signals").update({ status }).eq("id", callSignalId);
    }
    
    await supabase.from("call_signals").insert({
      chat_id: chatId,
      caller_id: currentUserId,
      receiver_id: friendId,
      signal_type: "end-call",
      signal_data: {},
      status,
    } as any);

    cleanup();
    setCallState("idle");
  }, [callSignalId, chatId, currentUserId, friendId, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setIsSpeaker(prev => !prev);
  }, []);

  // Flip camera (front ↔ back)
  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current || !peerConnectionRef.current) return;
    
    const newFacing = facingModeRef.current === "user" ? "environment" : "user";
    
    try {
      // Get new stream with flipped camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: 640, height: 480 },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      // Replace track on peer connection
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      // Replace track on local stream
      if (oldVideoTrack) {
        localStreamRef.current.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      localStreamRef.current.addTrack(newVideoTrack);

      facingModeRef.current = newFacing;
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    } catch (err) {
      console.error("Error flipping camera:", err);
    }
  }, []);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current || !localStreamRef.current) return;

    if (isScreenSharing) {
      // Stop screen share, revert to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }

      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingModeRef.current, width: 640, height: 480 },
          audio: false,
        });
        const camTrack = camStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(camTrack);

        const oldVideo = localStreamRef.current.getVideoTracks()[0];
        if (oldVideo) {
          localStreamRef.current.removeTrack(oldVideo);
          oldVideo.stop();
        }
        localStreamRef.current.addTrack(camTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      } catch (err) {
        console.error("Error reverting to camera:", err);
      }

      setIsScreenSharing(false);
    } else {
      // Start screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);

        // Replace local stream video track for preview
        const oldVideo = localStreamRef.current.getVideoTracks()[0];
        if (oldVideo) {
          localStreamRef.current.removeTrack(oldVideo);
          // Don't stop old track - we may revert to it
        }
        localStreamRef.current.addTrack(screenTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsScreenSharing(true);

        // When user stops sharing via browser UI
        screenTrack.onended = async () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          try {
            const camStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: facingModeRef.current, width: 640, height: 480 },
              audio: false,
            });
            const camTrack = camStream.getVideoTracks()[0];
            const s = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === "video");
            if (s) await s.replaceTrack(camTrack);

            if (localStreamRef.current) {
              const old = localStreamRef.current.getVideoTracks()[0];
              if (old) localStreamRef.current.removeTrack(old);
              localStreamRef.current.addTrack(camTrack);
              setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            }
          } catch {}
        };
      } catch (err) {
        console.error("Error starting screen share:", err);
      }
    }
  }, [isScreenSharing]);

  // Listen for realtime signals
  useEffect(() => {
    if (!currentUserId || !chatId) return;

    const channel = supabase
      .channel(`call-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        async (payload: any) => {
          const signal = payload.new;

          if (signal.signal_type === "offer" && callState === "idle") {
            const incomingType = signal.signal_data?.callType || "voice";
            callTypeRef.current = incomingType;
            setCallType(incomingType);
            setCallSignalId(signal.id);
            setCallState("incoming");
          }

          if (signal.signal_type === "answer" && peerConnectionRef.current) {
            const answerSdp = signal.signal_data as RTCSessionDescriptionInit;
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(answerSdp)
            );
            setCallState("active");
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            callTimerRef.current = setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          }

          if (signal.signal_type === "ice-candidate" && peerConnectionRef.current) {
            const candidate = signal.signal_data?.candidate;
            if (candidate) {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(candidate)
              );
            }
          }

          if (signal.signal_type === "end-call") {
            cleanup();
            setCallState("idle");
          }
        }
      )
      .subscribe();

    const updateChannel = supabase
      .channel(`call-update-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_signals",
        },
        (payload: any) => {
          const signal = payload.new;
          if (
            (signal.caller_id === currentUserId || signal.receiver_id === currentUserId) &&
            (signal.status === "ended" || signal.status === "declined" || signal.status === "missed")
          ) {
            cleanup();
            setCallState("idle");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(updateChannel);
    };
  }, [currentUserId, chatId, callState, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Get incoming call offer data
  const getIncomingCallOffer = useCallback(async () => {
    if (!callSignalId) return null;
    const { data } = await supabase
      .from("call_signals")
      .select("*")
      .eq("id", callSignalId)
      .maybeSingle();
    return data;
  }, [callSignalId]);

  return {
    callState,
    callType,
    isMuted,
    isSpeaker,
    isCameraOff,
    isScreenSharing,
    callDuration,
    callSignalId,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    flipCamera,
    toggleScreenShare,
    getIncomingCallOffer,
  };
};
