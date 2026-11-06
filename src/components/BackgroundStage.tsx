"use client";

import React, { useEffect, useState } from "react";

interface BackgroundStageProps {
  paused?: boolean;
}

export function BackgroundStage({ paused = false }: BackgroundStageProps) {
  const [isTabHidden, setIsTabHidden] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const effectivePaused = paused || isTabHidden;

  return (
    <>
      <div
        className={`bg-stage ${effectivePaused ? "motion-paused" : ""}`}
        aria-hidden="true"
        data-testid="bg-stage"
      >
        <i style={{ animationPlayState: effectivePaused ? "paused" : "running" }} />
        <i style={{ animationPlayState: effectivePaused ? "paused" : "running" }} />
        <i style={{ animationPlayState: effectivePaused ? "paused" : "running" }} />
        <i style={{ animationPlayState: effectivePaused ? "paused" : "running" }} />
      </div>
      <div className="bg-grain" aria-hidden="true" />
    </>
  );
}
