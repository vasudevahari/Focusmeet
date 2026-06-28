"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Participant } from "@/types";
import { Maximize2, Minimize2, Mic, MicOff, Video, VideoOff } from "lucide-react";

interface VideoTileProps {
  participant: Participant;
  stream?: MediaStream;
  isLocal: boolean;
  isFocused?: boolean;
  onFocusToggle?: () => void;
}

export default function VideoTile({
  participant,
  stream,
  isLocal,
  isFocused = false,
  onFocusToggle,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const prevStreamRef = useRef<MediaStream | null | undefined>(null);

  // Sync stream to video element
  useEffect(() => {
    if (!videoRef.current) return;

    // Only update if stream reference changed
    if (prevStreamRef.current !== stream) {
      prevStreamRef.current = stream;
      if (stream) {
        videoRef.current.srcObject = stream;
        setHasVideo(true);
      } else {
        videoRef.current.srcObject = null;
        setHasVideo(false);
      }
    }
  }, [stream]);

  // Track audio/video states from stream
  useEffect(() => {
    if (!stream) return;
    
    const updateTrackStates = () => {
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      setIsVideoEnabled(videoTracks.length > 0 && videoTracks[0].enabled);
      setIsAudioEnabled(audioTracks.length > 0 && audioTracks[0].enabled);
    };

    updateTrackStates();

    // Listen for track enable/disable
    stream.getTracks().forEach(track => {
      track.addEventListener('enabled', updateTrackStates);
      track.addEventListener('mute', updateTrackStates);
      track.addEventListener('unmute', updateTrackStates);
    });

    return () => {
      stream.getTracks().forEach(track => {
        track.removeEventListener('enabled', updateTrackStates);
        track.removeEventListener('mute', updateTrackStates);
        track.removeEventListener('unmute', updateTrackStates);
      });
    };
  }, [stream]);

  return (
    <motion.div
      layout
      className="relative w-full h-full bg-secondary/40 rounded-lg overflow-hidden shadow-lg border border-border group"
      whileHover={{ scale: isFocused ? 1 : 0.98 }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          hasVideo && isVideoEnabled ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* No video fallback */}
      {(!hasVideo || !isVideoEnabled) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/60 to-secondary/30">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Video size={20} className="text-muted-foreground/60" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">{participant.displayName}</p>
            {!isVideoEnabled && (
              <p className="text-2xs text-muted-foreground/70">Camera off</p>
            )}
          </div>
        </div>
      )}

      {/* Header: name + controls */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        whileHover={{ opacity: 1, y: 0 }}
        className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/40 to-transparent flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            participant.isActive !== false ? "bg-green-500" : "bg-gray-500"
          }`} />
          <p className="text-xs font-medium text-white truncate">{participant.displayName}</p>
          {isLocal && <span className="text-2xs bg-primary/80 text-white px-2 py-0.5 rounded-md">You</span>}
        </div>
      </motion.div>

      {/* Footer: status indicators */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileHover={{ opacity: 1, y: 0 }}
        className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-1.5">
          {!isAudioEnabled && <MicOff size={14} className="text-red-400" />}
          {!isVideoEnabled && <VideoOff size={14} className="text-red-400" />}
        </div>

        {onFocusToggle && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onFocusToggle();
            }}
            className="p-1.5 bg-primary/80 hover:bg-primary text-white rounded-md transition-colors"
            title={isFocused ? "Minimize" : "Focus"}
          >
            {isFocused ? (
              <Minimize2 size={14} />
            ) : (
              <Maximize2 size={14} />
            )}
          </motion.button>
        )}
      </motion.div>

      {/* Screen share badge */}
      {participant.isScreenSharing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-10 right-2 bg-orange-500 text-white text-2xs px-2 py-1 rounded-md font-semibold z-20"
        >
          Screen
        </motion.div>
      )}
    </motion.div>
  );
}
