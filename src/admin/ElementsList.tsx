import { useQuery } from "convex/react";
import { useState, useMemo, useEffect, useRef } from "preact/hooks";
import Fuse from "fuse.js";
import { api } from "../../convex/_generated/api";

export function ElementsList() {
  const elements = useQuery(api.elements.listElements);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(() => {
    if (!elements) return null;
    return new Fuse(elements, {
      keys: ["name"],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [elements]);

  const filteredElements = useMemo(() => {
    if (!elements) return [];
    if (!searchQuery.trim()) return elements;
    if (!fuse) return elements;
    return fuse.search(searchQuery).map((result) => result.item);
  }, [elements, searchQuery, fuse]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        if (e.key === "Escape" && target === searchInputRef.current) {
          setSearchQuery("");
          searchInputRef.current?.blur();
        }
        return;
      }

      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (elements === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div class="mb-4">
        <input
          ref={searchInputRef}
          type="text"
          placeholder={`Search ${elements.length} elements...`}
          value={searchQuery}
          onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setSearchQuery("");
              searchInputRef.current?.blur();
            }
          }}
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div class="grid grid-cols-6 gap-4">
        {filteredElements.map((element) => (
          <a
            key={element._id}
            href={`/admin/elements/${element._id}`}
            class="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div class="w-full aspect-square border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden">
              <div dangerouslySetInnerHTML={{ __html: element.SVG }} class="w-full h-full flex items-center justify-center" />
            </div>
            <div class="mt-2 text-center">{element.name}</div>
          </a>
        ))}
        {filteredElements.length === 0 && searchQuery && (
          <p class="text-sm text-gray-500 col-span-6 text-center py-4">No elements found</p>
        )}
      </div>
    </div>
  );
}
