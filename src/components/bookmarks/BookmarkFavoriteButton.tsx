"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import {
  useBookmarkActions,
  useBookmarkInteractionState,
} from "./bookmark-interactions-provider";
import type { Bookmark } from "./types";

type BookmarkFavoriteButtonProps = {
  bookmark: Bookmark;
  variant?: "icon" | "pill" | "menu";
};

export function BookmarkFavoriteButton({
  bookmark,
  variant = "icon",
}: BookmarkFavoriteButtonProps) {
  const { setFavorite } = useBookmarkActions();
  const interactionState = useBookmarkInteractionState(bookmark);
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const favorite = favoriteOverride ?? interactionState.favorite;

  function toggleFavorite() {
    const nextValue = !favorite;
    setFavoriteOverride(nextValue);
    startTransition(async () => {
      try {
        const succeeded = await setFavorite(bookmark.id, nextValue);
        if (!succeeded) {
          setFavoriteOverride(null);
          return;
        }
        setFavoriteOverride(null);
      } catch {
        setFavoriteOverride(null);
      }
    });
  }

  const className =
    variant === "menu"
      ? "flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
      : variant === "pill"
        ? `inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70 ${
            favorite
              ? "border-rose-300/60 bg-rose-500/10 text-rose-500"
              : "border-border text-text-muted hover:bg-background hover:text-rose-500"
          }`
        : `flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70 ${
            favorite
              ? "text-rose-500 hover:bg-rose-500/10"
              : "text-text-muted hover:bg-background hover:text-rose-500"
          }`;

  return (
    <button
      type="button"
      role={variant === "menu" ? "menuitem" : undefined}
      aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorite}
      aria-busy={isPending}
      disabled={isPending}
      onClick={toggleFavorite}
      className={className}
    >
      <Heart
        aria-hidden="true"
        className={`size-4 ${favorite ? "fill-current" : ""} ${
          variant === "icon" ? "size-[18px]" : ""
        } ${variant === "menu" && favorite ? "text-rose-500" : ""}`}
      />
      {variant === "pill" && (favorite ? "Favorited" : "Favorite")}
      {variant === "menu" &&
        (favorite ? "Remove from favorites" : "Add to favorites")}
    </button>
  );
}