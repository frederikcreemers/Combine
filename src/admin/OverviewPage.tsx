import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ElementGrid } from "./ElementGrid";

export function OverviewPage() {
  const unusedElements = useQuery(api.admin.getUnusedElements);

  return (
    <div>
      <section>
        <h2 class="text-xl font-semibold mb-4">
          Unused Elements
          {unusedElements && <span class="text-gray-500 font-normal ml-2">({unusedElements.length})</span>}
        </h2>
        <p class="text-sm text-gray-600 mb-4">
          Elements that aren't used as an ingredient in any recipe.
        </p>
        {unusedElements === undefined ? (
          <div>Loading...</div>
        ) : (
          <ElementGrid elements={unusedElements} emptyMessage="All elements are used in recipes" />
        )}
      </section>
    </div>
  );
}
