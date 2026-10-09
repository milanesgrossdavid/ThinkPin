import { NextResponse } from "next/server";
import {
  createPrivateCollection,
  DuplicateCollectionNameError,
  listPrivateCollections,
  replacePrivateCollectionBookmarks,
  renamePrivateCollection,
} from "../../../lib/collections/repository";
import { createClient } from "../../../lib/supabase/server";
import { isSupabaseAuthUnavailable } from "../../../lib/supabase/auth-errors";

type RequestBody = Record<string, unknown>;

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (isSupabaseAuthUnavailable(error)) {
    return { supabase, user: null, unavailable: true };
  }
  if (error && error.name !== "AuthSessionMissingError" && error.status !== 401) {
    throw error;
  }
  return { supabase, user, unavailable: false };
}

function isRequestBody(value: unknown): value is RequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET() {
  try {
    const { supabase, user, unavailable } = await getAuthenticatedClient();
    if (unavailable) {
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable." },
        { status: 503 },
      );
    }
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const collections = await listPrivateCollections(supabase, user.id);
    return NextResponse.json(
      { collections },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Private collection list failed.", error);
    return NextResponse.json(
      { error: "Collections could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, unavailable } = await getAuthenticatedClient();
    if (unavailable) {
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable." },
        { status: 503 },
      );
    }
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const input: unknown = await request.json();
    if (!isRequestBody(input) || typeof input.operation !== "string") {
      return NextResponse.json({ error: "Invalid collection request." }, { status: 400 });
    }

    if (input.operation === "migrate") {
      if (!Array.isArray(input.collections) || input.collections.length > 100) {
        return NextResponse.json({ error: "Legacy collections are invalid." }, { status: 400 });
      }
      const existing = await listPrivateCollections(supabase, user.id);
      const memberships =
        typeof input.memberships === "object" &&
        input.memberships !== null &&
        !Array.isArray(input.memberships)
          ? input.memberships as Record<string, unknown>
          : {};

      for (const legacy of input.collections) {
        if (!isRequestBody(legacy) || typeof legacy.name !== "string") {
          return NextResponse.json({ error: "Legacy collections are invalid." }, { status: 400 });
        }
        const name = legacy.name.trim().replace(/\s+/g, " ");
        const current = existing.find(
          (collection) => collection.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        );
        const collection =
          current ??
          await createPrivateCollection(supabase, user.id, {
            name,
            description: legacy.description,
          });
        const legacyIds =
          typeof legacy.id === "string" ? memberships[legacy.id] : undefined;
        const bookmarkIds = Array.isArray(legacyIds) ? legacyIds : [];
        const found = await replacePrivateCollectionBookmarks(
          supabase,
          user.id,
          collection.id,
          bookmarkIds,
        );
        if (!found) {
          return NextResponse.json({ error: "A legacy collection could not be migrated." }, { status: 404 });
        }
      }
      const collections = await listPrivateCollections(supabase, user.id);
      return NextResponse.json({ collections });
    }

    if (input.operation === "create") {
      const collection = await createPrivateCollection(supabase, user.id, {
        name: input.name,
        description: input.description,
        bookmarkIds: input.bookmarkIds,
      });
      return NextResponse.json({ collection }, { status: 201 });
    }

    if (input.operation === "rename" && typeof input.collectionId === "string") {
      const collection = await renamePrivateCollection(
        supabase,
        user.id,
        input.collectionId,
        { name: input.name, description: input.description },
      );
      if (!collection) {
        return NextResponse.json({ error: "Collection not found." }, { status: 404 });
      }
      return NextResponse.json({ collection });
    }

    if (
      input.operation === "members" &&
      typeof input.collectionId === "string" &&
      Array.isArray(input.bookmarkIds)
    ) {
      const found = await replacePrivateCollectionBookmarks(
        supabase,
        user.id,
        input.collectionId,
        input.bookmarkIds,
      );
      if (!found) {
        return NextResponse.json({ error: "Collection not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid collection request." }, { status: 400 });
  } catch (error) {
    if (error instanceof DuplicateCollectionNameError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof TypeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "A collection with this name already exists." },
        { status: 409 },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid collection request." }, { status: 400 });
    }
    console.error("Private collection mutation failed.", error);
    return NextResponse.json(
      { error: "The collection could not be saved." },
      { status: 500 },
    );
  }
}
