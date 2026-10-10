"use client";

import { useEffect } from "react";

export function ScrollRevealObserver() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(
      "[data-scroll-reveal]",
    );
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => {
        target.dataset.scrollVisible = "true";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          target.dataset.scrollVisible = "true";
          observer.unobserve(target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" },
    );

    targets.forEach((target) => observer.observe(target));
    document.documentElement.classList.add("scroll-reveal-enabled");

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("scroll-reveal-enabled");
    };
  }, []);

  return null;
}
