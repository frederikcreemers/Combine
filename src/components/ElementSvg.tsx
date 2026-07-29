type ElementSvgProps = {
  name: string
  svgUrl: string
  markup?: string
  class?: string
}

export function ElementSvg({
  name,
  svgUrl,
  markup,
  class: className = '',
}: ElementSvgProps) {
  if (markup) {
    return (
      <div
        class={className}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    )
  }

  return (
    <img
      src={svgUrl}
      alt=""
      aria-label={name}
      class={`object-contain ${className}`}
      draggable={false}
    />
  )
}
