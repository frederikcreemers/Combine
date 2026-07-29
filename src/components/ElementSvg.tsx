type ElementSvgProps = {
  name: string
  svgUrl?: string | null
  legacySvg?: string
  markup?: string
  class?: string
}

export function ElementSvg({
  name,
  svgUrl,
  legacySvg,
  markup,
  class: className = '',
}: ElementSvgProps) {
  const inlineSvg = markup ?? legacySvg

  if (markup || (!svgUrl && inlineSvg)) {
    return (
      <div
        class={className}
        dangerouslySetInnerHTML={{ __html: inlineSvg ?? '' }}
      />
    )
  }

  if (!svgUrl) {
    return <div class={className} aria-label={`${name} image unavailable`} />
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
