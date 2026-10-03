"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Bookmark } from "./types";
import { useAppToast } from "../feedback/AppToaster";
import {
  getBookmarkDetailSnapshot,
  getServerBookmarkDetailSnapshot,
  readBookmarkDetailState,
  subscribeToBookmarkDetail,
} from "../../lib/bookmarks";
import {
  createLocalBookmarkActions,
  type BookmarkActions,
} from "../../lib/bookmark-actions";

const BookmarkActionsContext = createContext<BookmarkActions | null>(null);

export function BookmarkInteractionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const toast = useAppToast();
  const actions = useMemo(
    () =>
      createLocalBookmarkActions({
        success: toast.success,
        error: toast.error,
      }),
    [toast],
  );

  return (
    <BookmarkActionsContext.Provider value={actions}>
      {children}
    </BookmarkActionsContext.Provider>
  );
}

export function useBookmarkActions() {
  const actions = useContext(BookmarkActionsContext);
  if (!actions) {
    throw new Error(
      "useBookmarkActions must be used within BookmarkInteractionsProvider.",
    );
  }
  return actions;
}

export function useBookmarkInteractionState(bookmark: Bookmark) {
  const detailSnapshot = useSyncExternalStore(
    (onChange) => subscribeToBookmarkDetail(bookmark.id, onChange),
    () => getBookmarkDetailSnapshot(bookmark.id),
    getServerBookmarkDetailSnapshot,
  );
  const detailState = useMemo(() => {
    try {
      return readBookmarkDetailState(detailSnapshot);
    } catch {
      return {};
    }
  }, [detailSnapshot]);

  return {
    detailState,
    favorite: detailState.favorite ?? bookmark.favorite ?? false,
    unread: detailState.unread ?? bookmark.unread ?? false,
  };
}
