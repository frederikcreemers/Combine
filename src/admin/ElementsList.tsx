import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ElementsList() {
  const elements = useQuery(api.elements.listElements);

  if (elements === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div class="grid grid-cols-5 gap-4">
      {elements.map((element) => (
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
    </div>
  );
}
