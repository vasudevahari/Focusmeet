"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { createRoom, getRoom } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Video, Shield, Zap, BarChart2, ChevronRight,
  ArrowRight, Users, Eye, Lock,
} from "lucide-react";

/* ── Animation presets ────────────────────────────────────────── */
const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: "easeOut" },
  }),
};

const stagger: any = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* ── Logo ────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 bg-primary rounded-xl blur-md opacity-40" />
        <div className="relative w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <Video size={15} className="text-white" strokeWidth={2.5} />
        </div>
      </div>
      <span className="font-semibold text-base tracking-tight">FocusMeet</span>
    </div>
  );
}

/* ── Feature pill ────────────────────────────────────────────── */
function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.div
      variants={fadeUp}
      className="pill gap-2 text-muted-foreground"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </motion.div>
  );
}

/* ── Join/Create form ────────────────────────────────────────── */
function MeetingForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [roomName, setRoomName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!roomName.trim() || !displayName.trim()) return;
    setLoading(true); setError("");
    try {
      const data = await createRoom(roomName, displayName);
      sessionStorage.setItem(`focusmeet_${data.roomCode}`, JSON.stringify({
        userId: data.hostId, displayName: displayName.trim(),
        isHost: true, meetingId: data.meetingId,
      }));
      router.push(`/room/${data.roomCode}`);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code || !joinName.trim()) return;
    setLoading(true); setError("");
    try {
      const data = await getRoom(code);
      if (!data.isActive) throw new Error("This meeting has ended.");
      sessionStorage.setItem(`focusmeet_${code}`, JSON.stringify({
        userId: uuidv4(), displayName: joinName.trim(),
        isHost: false, meetingId: data.meetingId,
      }));
      router.push(`/room/${code}`);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-sm glass-strong rounded-2xl overflow-hidden shadow-float"
    >
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); }}
            className={`flex-1 py-3.5 text-sm font-medium transition-all relative ${
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === t && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            {t === "create" ? "New Meeting" : "Join Meeting"}
          </button>
        ))}
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {tab === "create" ? (
            <motion.form
              key="create"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleCreate}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <label className="text-2xs font-mono text-muted-foreground uppercase tracking-widest">
                  Meeting name
                </label>
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Design review, Team sync..."
                  className="input-base text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-2xs font-mono text-muted-foreground uppercase tracking-widest">
                  Your name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Chen"
                  className="input-base text-sm"
                  required
                />
              </div>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive font-mono">
                  {error}
                </motion.p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium text-sm py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <span className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: `${i*0.1}s` }} />
                    ))}
                  </span>
                ) : (
                  <>Create Meeting <ArrowRight size={14} /></>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="join"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleJoin}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <label className="text-2xs font-mono text-muted-foreground uppercase tracking-widest">
                  Room code
                </label>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC12345"
                  className="input-base text-sm font-mono tracking-widest uppercase"
                  maxLength={8}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-2xs font-mono text-muted-foreground uppercase tracking-widest">
                  Your name
                </label>
                <input
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="Alex Chen"
                  className="input-base text-sm"
                  required
                />
              </div>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive font-mono">
                  {error}
                </motion.p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium text-sm py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <span className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: `${i*0.1}s` }} />
                    ))}
                  </span>
                ) : (
                  <>Join Meeting <ArrowRight size={14} /></>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Feature card ────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, delay }: {
  icon: React.ReactNode; title: string; desc: string; delay: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="glass rounded-2xl p-5 group hover:border-primary/30 transition-colors duration-300"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-sm mb-1.5 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between px-6 py-4 glass border-b border-border sticky top-0 z-50"
      >
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </motion.nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* Left: copy */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 pill mb-6 text-primary border-primary/20"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
                AI-Powered Focus Monitoring
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.55, ease: "easeOut" }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-[1.08]"
              >
                Meet with
                <span className="text-gradient-primary block">full clarity.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.55, ease: "easeOut" }}
                className="text-base text-muted-foreground max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed"
              >
                Video conferencing that knows when your team is truly engaged.
                Real-time AI focus scores, smart alerts, and beautiful analytics.
              </motion.p>

              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="flex flex-wrap gap-2 justify-center lg:justify-start"
              >
                {[
                  { icon: <Eye size={11} />, label: "AI Focus Tracking" },
                  { icon: <Shield size={11} />, label: "Encrypted" },
                  { icon: <Zap size={11} />, label: "Zero signup" },
                  { icon: <BarChart2 size={11} />, label: "Meeting analytics" },
                ].map((f) => (
                  <FeaturePill key={f.label} {...f} />
                ))}
              </motion.div>
            </div>

            {/* Right: form */}
            <div className="w-full max-w-sm lg:max-w-none lg:w-80 flex-shrink-0">
              <MeetingForm />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center text-xs text-muted-foreground mt-4 font-mono"
              >
                No account required. Meetings are ephemeral.
              </motion.p>
            </div>
          </div>
        </div>

        {/* Features section */}
        <div className="w-full max-w-5xl mx-auto mt-24 sm:mt-32">
          <div className="text-center mb-10">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
            >
              Built for focused teams
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-sm max-w-md mx-auto"
            >
              Everything a modern team needs. Nothing they don't.
            </motion.p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                icon: <Video size={18} />,
                title: "HD Video Conferencing",
                desc: "Crystal-clear video and audio with WebRTC. Screen sharing, multi-participant grids, host controls.",
                delay: 0,
              },
              {
                icon: <Eye size={18} />,
                title: "AI Focus Monitoring",
                desc: "MediaPipe face mesh tracks eye aspect ratio, head orientation, and gaze direction in real time.",
                delay: 0.06,
              },
              {
                icon: <BarChart2 size={18} />,
                title: "Meeting Analytics",
                desc: "Per-participant focus scores, distraction timelines, attentiveness rankings, and exportable reports.",
                delay: 0.12,
              },
              {
                icon: <Users size={18} />,
                title: "Host Controls",
                desc: "Mute participants, remove disruptive attendees, and get real-time focus alerts from your dashboard.",
                delay: 0.18,
              },
              {
                icon: <Zap size={18} />,
                title: "Instant Rooms",
                desc: "No signup, no downloads. Share a link and your team is in. 8-character room codes expire automatically.",
                delay: 0.24,
              },
              {
                icon: <Lock size={18} />,
                title: "Private by Design",
                desc: "Focus AI runs entirely in the browser. No video is ever sent to a server. Your data stays yours.",
                delay: 0.3,
              },
            ].map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="border-t border-border px-6 py-6 flex items-center justify-between"
      >
        <Logo />
        <p className="text-xs text-muted-foreground font-mono">
          © {new Date().getFullYear()} FocusMeet
        </p>
      </motion.footer>
    </div>
  );
}
