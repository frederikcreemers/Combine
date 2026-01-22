interface Element {
  _id: string
  name: string
  SVG: string
}

interface ElementGridProps {
  elements: Element[]
  emptyMessage?: string
}

export function ElementGrid({ elements, emptyMessage = "No elements" }: ElementGridProps) {
  return (
    <div class="grid grid-cols-6 gap-4">
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
      {elements.length === 0 && (
        <p class="text-sm text-gray-500 col-span-6 text-center py-4">{emptyMessage}</p>
      )}
    </div>
  )
}
