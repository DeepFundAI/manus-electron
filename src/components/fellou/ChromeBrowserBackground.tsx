"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { AnimatedBackground } from "./AmbientLightBg";

export function ChromeBrowserBackground() {
  const [backgroundReady, setBackgroundReady] = useState(false);

  // Listen for background animation ready state
  useEffect(() => {
    const handleBackgroundReady = () => {
      setBackgroundReady(true);
    };

    // Listen for ambient background loaded event
    window.addEventListener("ambientBgLoaded", handleBackgroundReady);

    return () => {
      window.removeEventListener("ambientBgLoaded", handleBackgroundReady);
    };
  }, []);

  return (
    <>
      {/* Black background - always visible as fallback */}
      <div className="fixed inset-0 bg-black z-0" />

      {/* AnimatedBackground with loading-based opacity control */}
      <motion.div
        className="fixed inset-0 z-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: backgroundReady ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{
          opacity: backgroundReady ? 1 : 0,
        }}
      >
        {/* Animated background - render at desktop size for mobile consistency */}
        <div 
          className="absolute"
          style={{
            width: "100vw",
            height: "100vh",
            minWidth: "1440px", // Desktop width for consistent appearance
            minHeight: "900px",  // Desktop height for consistent appearance
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)"
          }}
        >
          <AnimatedBackground speed={0.25} />
        </div>
        {/* Black overlay with 40% opacity */}
        <div className="absolute inset-0 bg-black/40" />
      </motion.div>
    </>
  );
}