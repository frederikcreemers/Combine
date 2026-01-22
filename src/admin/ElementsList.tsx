import { useQuery } from "convex/react";
import { useState, useMemo, useEffect, useRef } from "preact/hooks";
import Fuse from "fuse.js";
import { api } from "../../convex/_generated/api";
import { ElementGrid } from "./ElementGrid";

export function ElementsList() {
  const elements = useQuery(api.elements.listElements);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sortedElements = useMemo(() => {
    if (!elements) return [];
    return [...elements].sort((a, b) => b._creationTime - a._creationTime);
  }, [elements]);

  const fuse = useMemo(() => {
    if (!sortedElements.length) return null;
    return new Fuse(sortedElements, {
      keys: ["name"],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [sortedElements]);

  const filteredElements = useMemo(() => {
    if (!sortedElements.length) return [];
    if (!searchQuery.trim()) return sortedElements;
    if (!fuse) return sortedElements;
    return fuse.search(searchQuery).map((result) => result.item);
  }, [sortedElements, searchQuery, fuse]);

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
      <ElementGrid 
        elements={filteredElements} 
        emptyMessage={searchQuery ? "No elements found" : "No elements"} 
      />
    </div>
  );
}
