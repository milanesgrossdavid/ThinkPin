"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { MouseEvent } from "react";
import { scrollToSection } from "../lib/smooth-scroll";

type SmoothScrollLinkProps = Omit<HTMLMotionProps<"a">, "href" | "onClick"> & {
  href: `#${string}`;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function SmoothScrollLink({
  href,
  onClick,
  ...props
}: SmoothScrollLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (!event.defaultPrevented && scrollToSection(href.slice(1))) {
      event.preventDefault();
    }
  }

  return <motion.a href={href} onClick={handleClick} {...props} />;
}
