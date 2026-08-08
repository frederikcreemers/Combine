import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ElementGrid } from "./ElementGrid";

interface UserPageProps {
  id: string;
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserPage({ id }: UserPageProps) {
  const userId = id as Id<"users">;
  const progress = useQuery(api.admin.getUserProgress, { userId });

  if (progress === undefined) {
    return <div>Loading...</div>;
  }

  if (progress === null) {
    return <div>User not found</div>;
  }

  const { user, unlockedElements, discoveredElements } = progress;

  return (
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-6">
          <a href="/admin/users" class="text-blue-600 hover:underline">
            ← Back to Users
          </a>
        </div>

        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            {user.email ?? (user.isAnonymous ? "Anonymous user" : "No email")}
          </h1>
          {user.name && <p class="text-gray-600 mb-1">{user.name}</p>}
          <p class="text-sm text-gray-500">Added {formatDateTime(user._creationTime)}</p>
        </div>

        <section class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 class="text-2xl font-semibold mb-4 text-gray-900">
            Discovered Elements
            <span class="text-gray-500 font-normal ml-2">({discoveredElements.length})</span>
          </h2>
          <p class="text-sm text-gray-600 mb-4">
            Elements this user was the first to discover.
          </p>
          <ElementGrid
            elements={discoveredElements}
            emptyMessage="This user hasn't discovered any elements"
          />
        </section>

        <section class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-semibold mb-4 text-gray-900">
            Unlocked Elements
            <span class="text-gray-500 font-normal ml-2">({unlockedElements.length})</span>
          </h2>
          <ElementGrid
            elements={unlockedElements}
            emptyMessage="This user hasn't unlocked any elements"
          />
        </section>
      </div>
    </div>
  );
}
