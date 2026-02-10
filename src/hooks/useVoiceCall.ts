import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CallState = "idle" | "calling" | "incoming" | "active" | "ended";

interface UseVoiceCallProps {
  currentUserId: string;
  friendId: string;
  chatId: string;
}

export const useVoiceCall = ({ currentUserId, friendId, chatId }: UseVoiceCallProps) => {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callSignalId, setCallSignalId] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    setCallDuration(0);
    setIsMuted(false);
    setIsSpeaker(false);
    setCallSignalId(null);
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = async (event) => {
      if (event.candidate && callSignalId) {
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
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = event.streams[0];
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [chatId, currentUserId, friendId, callSignalId]);

  // Start a call
  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const { data, error } = await supabase.from("call_signals").insert({
        chat_id: chatId,
        caller_id: currentUserId,
        receiver_id: friendId,
        signal_type: "offer",
        signal_data: { sdp: offer.sdp, type: offer.type },
        status: "calling",
      } as any).select().single();

      if (error) throw error;
      
      setCallSignalId(data.id);
      setCallState("calling");

      // 30s timeout
      timeoutRef.current = setTimeout(async () => {
        if (callState === "calling") {
          await endCall("missed");
        }
      }, 30000);
    } catch (err) {
      console.error("Error starting call:", err);
      cleanup();
      setCallState("idle");
    }
  }, [chatId, currentUserId, friendId, createPeerConnection, cleanup, callState]);

  // Accept incoming call
  const acceptCall = useCallback(async (signalId: string, offerSdp: RTCSessionDescriptionInit) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

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

      // Update original call signal status
      await supabase.from("call_signals").update({ status: "active" }).eq("id", signalId);

      setCallSignalId(signalId);
      setCallState("active");
      
      // Start timer
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
    
    // Also send end-call signal
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

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setIsSpeaker(prev => !prev);
    if (remoteAudioRef.current) {
      // @ts-ignore - setSinkId is not in all browsers
      if (remoteAudioRef.current.setSinkId) {
        // Toggle between default and speaker
      }
    }
  }, []);

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

    // Also listen for updates (declined, ended)
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
    isMuted,
    isSpeaker,
    callDuration,
    callSignalId,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    getIncomingCallOffer,
  };
};
