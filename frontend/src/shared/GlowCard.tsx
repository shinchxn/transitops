// File: frontend/src/shared/GlowCard.tsx
import React, { useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";

const GLOW_COLOR = "79, 123, 255"; // brand-400 in rgb
const PARTICLE_COUNT = 10;

function createParticle(x: number, y: number) {
  const el = document.createElement("div");
  el.style.cssText = `
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(${GLOW_COLOR}, 1);
    box-shadow: 0 0 8px rgba(${GLOW_COLOR}, 0.8);
    pointer-events: none;
    left: ${x}px;
    top: ${y}px;
    z-index: 5;
  `;
  return el;
}

export default function GlowCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHoveredRef = useRef(false);

  const clearParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    particlesRef.current.forEach((p) => {
      gsap.to(p, {
        scale: 0,
        opacity: 0,
        duration: 0.25,
        ease: "back.in(1.7)",
        onComplete: () => {
          p.parentNode?.removeChild(p);
        },
      });
    });
    particlesRef.current = [];
  }, []);

  const spawnParticles = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const { width, height } = card.getBoundingClientRect();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;
        const particle = createParticle(Math.random() * width, Math.random() * height);
        cardRef.current.appendChild(particle);
        particlesRef.current.push(particle);

        gsap.fromTo(particle, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
        gsap.to(particle, {
          x: (Math.random() - 0.5) * 80,
          y: (Math.random() - 0.5) * 80,
          duration: 2 + Math.random() * 2,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });
        gsap.to(particle, { opacity: 0.25, duration: 1.4, ease: "power2.inOut", repeat: -1, yoyo: true });
      }, i * 90);
      timeoutsRef.current.push(timeoutId);
    }
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const handleEnter = () => {
      isHoveredRef.current = true;
      spawnParticles();
      gsap.to(el, { rotateX: 4, rotateY: 4, duration: 0.4, ease: "power2.out", transformPerspective: 1000 });
    };

    const handleLeave = () => {
      isHoveredRef.current = false;
      clearParticles();
      gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.4, ease: "power2.out" });
      el.style.setProperty("--glow-intensity", "0");
    };

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;
      gsap.to(el, { rotateX, rotateY, duration: 0.15, ease: "power2.out", transformPerspective: 1000 });

      el.style.setProperty("--glow-x", `${(x / rect.width) * 100}%`);
      el.style.setProperty("--glow-y", `${(y / rect.height) * 100}%`);
      el.style.setProperty("--glow-intensity", "1");
    };

    el.addEventListener("mouseenter", handleEnter);
    el.addEventListener("mouseleave", handleLeave);
    el.addEventListener("mousemove", handleMove);

    return () => {
      el.removeEventListener("mouseenter", handleEnter);
      el.removeEventListener("mouseleave", handleLeave);
      el.removeEventListener("mousemove", handleMove);
      clearParticles();
    };
  }, [spawnParticles, clearParticles]);

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        transformStyle: "preserve-3d",
        // @ts-expect-error custom css vars
        "--glow-x": "50%",
        "--glow-y": "50%",
        "--glow-intensity": "0",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          opacity: "var(--glow-intensity)",
          background: `radial-gradient(circle at var(--glow-x) var(--glow-y), rgba(${GLOW_COLOR}, 0.18), transparent 60%)`,
        }}
      />
      <div className="relative z-10" style={{ transform: "translateZ(20px)" }}>
        {children}
      </div>
    </div>
  );
}
