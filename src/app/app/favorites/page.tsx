import { LibraryHeader } from "../../../components/library/library-header";
import { LibraryBrowser } from "../../../components/library/library-browser";
import { requireAuth } from "../../../lib/supabase/require-auth";

const favoriteCount = 286;

export default async function FavoritesPage() {
  await requireAuth();

  return (
    <main className="min-h-svh bg-background">
      <LibraryHeader itemCount={favoriteCount} title="Favorites" />
      <LibraryBrowser initialFilter="favorites" initialTag="" initialCollection="" />
    </main>
  );
}
