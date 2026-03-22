import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type GroupCallState = "idle" | "calling" | "incoming" | "active" | "ended";
export type GroupCallType = "voice" | "video";

export interface ParticipantStream {
  peerId: string;
  stream: MediaStream;
  displayName?: string;
  avatarUrl?: string;
}

interface UseGroupCallProps {
  currentUserId: string;
  groupId: string;
}

export const useGroupCall = ({ currentUserId, groupId }: UseGroupCallProps) => {
  const [callState, setCallState] = useState<GroupCallState>("idle");
  const [callType, setCallType] = useState<GroupCallType>("voice");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participantStreams, setParticipantStreams] = useState<ParticipantStream[]>([]);
  const [callRoomId, setCallRoomId] = useState<string | null>(null);
  const [incomingCallType, setIncomingCallType] = useState<GroupCallType>("voice");

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTypeRef = useRef<GroupCallType>("voice");
  const callRoomIdRef = useRef<string | null>(null);

  const chatId = `group_${groupId}`;

  const cleanup = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setParticipantStreams([]);
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setCallRoomId(null);
    callRoomIdRef.current = null;
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.from("call_signals").insert({
            chat_id: chatId,
            caller_id: currentUserId,
            receiver_id: peerId,
            signal_type: "group-ice-candidate",
            signal_data: {
              candidate: event.candidate.toJSON(),
              roomId: callRoomIdRef.current,
            },
            status: "active",
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        setParticipantStreams((prev) => {
          const existing = prev.find((p) => p.peerId === peerId);
          if (existing) {
            return prev.map((p) => (p.peerId === peerId ? { ...p, stream } : p));
          }
          return [...prev, { peerId, stream }];
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setParticipantStreams((prev) => prev.filter((p) => p.peerId !== peerId));
          peerConnectionsRef.current.delete(peerId);
          pc.close();
        }
      };

      peerConnectionsRef.current.set(peerId, pc);
      return pc;
    },
    [chatId, currentUserId]
  );

  const getMediaStream = useCallback(async (type: GroupCallType) => {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === "video" ? { facingMode: "user", width: 640, height: 480 } : false,
    };
    return navigator.mediaDevices.getUserMedia(constraints);
  }, []);

  // Start a group call
  const startCall = useCallback(
    async (type: GroupCallType = "voice") => {
      try {
        callTypeRef.current = type;
        setCallType(type);

        const stream = await getMediaStream(type);
        localStreamRef.current = stream;
        setLocalStream(stream);

        const roomId = crypto.randomUUID();
        setCallRoomId(roomId);
        callRoomIdRef.current = roomId;

        // Broadcast group call start to all members
        await supabase.from("call_signals").insert({
          chat_id: chatId,
          caller_id: currentUserId,
          receiver_id: currentUserId, // self - broadcast signal
          signal_type: "group-call-start",
          signal_data: { roomId, callType: type, initiator: currentUserId },
          status: "calling",
        });

        setCallState("active");

        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("Error starting group call:", err);
        cleanup();
        setCallState("idle");
      }
    },
    [chatId, currentUserId, getMediaStream, cleanup]
  );

  // Join an existing group call
  const joinCall = useCallback(
    async (roomId: string, type: GroupCallType = "voice") => {
      try {
        callTypeRef.current = type;
        setCallType(type);

        const stream = await getMediaStream(type);
        localStreamRef.current = stream;
        setLocalStream(stream);

        setCallRoomId(roomId);
        callRoomIdRef.current = roomId;

        // Announce joining
        await supabase.from("call_signals").insert({
          chat_id: chatId,
          caller_id: currentUserId,
          receiver_id: currentUserId,
          signal_type: "group-call-join",
          signal_data: { roomId, callType: type, joinerId: currentUserId },
          status: "active",
        });

        setCallState("active");

        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("Error joining group call:", err);
        cleanup();
        setCallState("idle");
      }
    },
    [chatId, currentUserId, getMediaStream, cleanup]
  );

  const declineCall = useCallback(() => {
    cleanup();
    setCallState("idle");
  }, [cleanup]);

  // End call (leave the group call)
  const endCall = useCallback(async () => {
    // Notify others that we're leaving
    await supabase.from("call_signals").insert({
      chat_id: chatId,
      caller_id: currentUserId,
      receiver_id: currentUserId,
      signal_type: "group-call-leave",
      signal_data: { roomId: callRoomIdRef.current, leaverId: currentUserId },
      status: "ended",
    });

    cleanup();
    setCallState("idle");
  }, [chatId, currentUserId, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Create offer to a specific peer
  const createOfferToPeer = useCallback(
    async (peerId: string) => {
      if (!localStreamRef.current) return;
      const pc = createPeerConnection(peerId);
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from("call_signals").insert({
        chat_id: chatId,
        caller_id: currentUserId,
        receiver_id: peerId,
        signal_type: "group-offer",
        signal_data: {
          sdp: offer.sdp,
          type: offer.type,
          roomId: callRoomIdRef.current,
        },
        status: "active",
      });
    },
    [chatId, currentUserId, createPeerConnection]
  );

  // Handle incoming offer from a peer
  const handleOffer = useCallback(
    async (peerId: string, offerSdp: RTCSessionDescriptionInit) => {
      if (!localStreamRef.current) return;
      const pc = createPeerConnection(peerId);
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from("call_signals").insert({
        chat_id: chatId,
        caller_id: currentUserId,
        receiver_id: peerId,
        signal_type: "group-answer",
        signal_data: {
          sdp: answer.sdp,
          type: answer.type,
          roomId: callRoomIdRef.current,
        },
        status: "active",
      });
    },
    [chatId, currentUserId, createPeerConnection]
  );

  // Listen for realtime signals
  useEffect(() => {
    if (!currentUserId || !groupId) return;

    const channel = supabase
      .channel(`group-call-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload: any) => {
          const signal = payload.new;
          if (signal.caller_id === currentUserId && signal.signal_type !== "group-call-start") {
            // Ignore own signals except call-start
            if (signal.signal_type !== "group-call-start") return;
          }

          const roomId = signal.signal_data?.roomId;

          switch (signal.signal_type) {
            case "group-call-start": {
              if (signal.caller_id === currentUserId) return;
              // Incoming group call
              if (callState === "idle") {
                const type = signal.signal_data?.callType || "voice";
                setIncomingCallType(type);
                callTypeRef.current = type;
                setCallType(type);
                setCallRoomId(roomId);
                callRoomIdRef.current = roomId;
                setCallState("incoming");
              }
              break;
            }

            case "group-call-join": {
              const joinerId = signal.signal_data?.joinerId;
              if (joinerId === currentUserId) return;
              if (callRoomIdRef.current === roomId && callState === "active") {
                // New participant joined - create offer to them
                await createOfferToPeer(joinerId);
              }
              break;
            }

            case "group-offer": {
              if (signal.receiver_id !== currentUserId) return;
              if (callRoomIdRef.current === roomId) {
                await handleOffer(signal.caller_id, {
                  sdp: signal.signal_data.sdp,
                  type: signal.signal_data.type,
                });
              }
              break;
            }

            case "group-answer": {
              if (signal.receiver_id !== currentUserId) return;
              const pc = peerConnectionsRef.current.get(signal.caller_id);
              if (pc) {
                await pc.setRemoteDescription(
                  new RTCSessionDescription({
                    sdp: signal.signal_data.sdp,
                    type: signal.signal_data.type,
                  })
                );
              }
              break;
            }

            case "group-ice-candidate": {
              if (signal.receiver_id !== currentUserId) return;
              const pc2 = peerConnectionsRef.current.get(signal.caller_id);
              if (pc2 && signal.signal_data?.candidate) {
                await pc2.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
              }
              break;
            }

            case "group-call-leave": {
              const leaverId = signal.signal_data?.leaverId;
              if (leaverId === currentUserId) return;
              // Remove peer connection
              const pcLeave = peerConnectionsRef.current.get(leaverId);
              if (pcLeave) {
                pcLeave.close();
                peerConnectionsRef.current.delete(leaverId);
              }
              setParticipantStreams((prev) => prev.filter((p) => p.peerId !== leaverId));
              break;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, groupId, chatId, callState, createOfferToPeer, handleOffer]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    callState,
    callType,
    isMuted,
    isCameraOff,
    callDuration,
    localStream,
    participantStreams,
    callRoomId,
    incomingCallType,
    startCall,
    joinCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
};
