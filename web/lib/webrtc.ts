import { Socket } from "socket.io-client";

interface PeerEntry {
  pc: RTCPeerConnection;
  stream?: MediaStream;
  makingOffer: boolean;
  ignoreOffer: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 4,
};

export class WebRTCManager {
  private peers = new Map<string, PeerEntry>();
  private localStream: MediaStream | null = null;
  private socket: Socket;
  private mySocketId: string;
  private destroyed = false;
  private onRemoteStream: (socketId: string, stream: MediaStream) => void;
  private onPeerDisconnected: (socketId: string) => void;

  constructor(
    socket: Socket,
    mySocketId: string,
    onRemoteStream: (socketId: string, stream: MediaStream) => void,
    onPeerDisconnected: (socketId: string) => void
  ) {
    this.socket = socket;
    this.mySocketId = mySocketId;
    this.onRemoteStream = onRemoteStream;
    this.onPeerDisconnected = onPeerDisconnected;
    this.setupSignaling();
  }

  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    // Replace tracks on existing peers
    this.peers.forEach(({ pc }) => {
      const senders = pc.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) sender.replaceTrack(track).catch(() => {});
        else pc.addTrack(track, stream);
      });
    });
  }

  async connectToPeer(targetSocketId: string) {
    if (this.destroyed || targetSocketId === this.mySocketId) return;
    if (this.peers.has(targetSocketId)) return; // already connected

    const entry = this.createPeer(targetSocketId);
    entry.makingOffer = true;

    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach((t) => {
          entry.pc.addTrack(t, this.localStream!);
        });
      }
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      this.socket.emit("webrtc:offer", {
        to: targetSocketId,
        from: this.mySocketId,
        offer: entry.pc.localDescription,
      });
    } catch (err) {
      console.error("[WebRTC] offer failed:", err);
      this.removePeer(targetSocketId);
    } finally {
      entry.makingOffer = false;
    }
  }

  private createPeer(targetSocketId: string): PeerEntry {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const entry: PeerEntry = { pc, makingOffer: false, ignoreOffer: false };
    this.peers.set(targetSocketId, entry);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && !this.destroyed) {
        this.socket.emit("webrtc:ice", {
          to: targetSocketId,
          from: this.mySocketId,
          candidate,
        });
      }
    };

    pc.ontrack = ({ streams }) => {
      if (this.destroyed) return;
      const stream = streams[0];
      if (stream) {
        entry.stream = stream;
        this.onRemoteStream(targetSocketId, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "failed") {
        // Attempt ICE restart
        pc.restartIce();
      }
      if (state === "closed" || state === "disconnected") {
        this.removePeer(targetSocketId);
        this.onPeerDisconnected(targetSocketId);
      }
    };

    pc.onnegotiationneeded = async () => {
      if (this.destroyed || entry.makingOffer) return;
      entry.makingOffer = true;
      try {
        await pc.setLocalDescription();
        this.socket.emit("webrtc:offer", {
          to: targetSocketId,
          from: this.mySocketId,
          offer: pc.localDescription,
        });
      } catch (err) {
        console.error("[WebRTC] renegotiation failed:", err);
      } finally {
        entry.makingOffer = false;
      }
    };

    return entry;
  }

  private removePeer(socketId: string) {
    const entry = this.peers.get(socketId);
    if (entry) {
      entry.pc.onicecandidate = null;
      entry.pc.ontrack = null;
      entry.pc.onconnectionstatechange = null;
      entry.pc.onnegotiationneeded = null;
      entry.pc.close();
      this.peers.delete(socketId);
    }
  }

  private setupSignaling() {
    this.socket.on("webrtc:offer", async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      if (this.destroyed) return;
      let entry = this.peers.get(from);
      if (!entry) entry = this.createPeer(from);

      const polite = this.mySocketId > from; // deterministic politeness
      const offerCollision = entry.makingOffer || entry.pc.signalingState !== "stable";
      entry.ignoreOffer = !polite && offerCollision;
      if (entry.ignoreOffer) return;

      try {
        if (this.localStream && entry.pc.getSenders().length === 0) {
          this.localStream.getTracks().forEach((t) => entry!.pc.addTrack(t, this.localStream!));
        }
        await entry.pc.setRemoteDescription(offer);
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        this.socket.emit("webrtc:answer", { to: from, from: this.mySocketId, answer: entry.pc.localDescription });
      } catch (err) {
        console.error("[WebRTC] answer failed:", err);
      }
    });

    this.socket.on("webrtc:answer", async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      if (this.destroyed) return;
      const entry = this.peers.get(from);
      if (!entry) return;
      try {
        await entry.pc.setRemoteDescription(answer);
      } catch (err) {
        console.error("[WebRTC] setRemoteDescription answer failed:", err);
      }
    });

    this.socket.on("webrtc:ice", async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (this.destroyed) return;
      const entry = this.peers.get(from);
      if (!entry || entry.ignoreOffer) return;
      try {
        await entry.pc.addIceCandidate(candidate);
      } catch (err) {
        if (!entry.ignoreOffer) console.error("[WebRTC] ICE candidate failed:", err);
      }
    });
  }

  replaceTrack(newTrack: MediaStreamTrack) {
    this.peers.forEach(({ pc }) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === newTrack.kind);
      if (sender) sender.replaceTrack(newTrack).catch(() => {});
    });
  }

  disconnect() {
    this.destroyed = true;
    this.peers.forEach((_, id) => this.removePeer(id));
    this.peers.clear();
  }
}
