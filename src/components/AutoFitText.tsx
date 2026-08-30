import { useLayoutEffect, useRef } from 'preact/hooks'

type FitTextOptions = {
  maxFontSize?: number
  minFontSize?: number
  maxLines?: number
  lineHeight?: number
}

export function fitTextToLines(
  element: HTMLElement,
  {
    maxFontSize = 14,
    minFontSize = 9,
    maxLines = 2,
    lineHeight = 1.2,
  }: FitTextOptions = {},
) {
  element.style.display = 'block'
  element.style.overflow = 'visible'
  element.style.webkitLineClamp = 'unset'
  element.style.webkitBoxOrient = 'unset'
  element.style.lineHeight = String(lineHeight)

  let fontSize = maxFontSize
  for (; fontSize > minFontSize; fontSize -= 0.5) {
    element.style.fontSize = `${fontSize}px`
    const maximumHeight = fontSize * lineHeight * maxLines + 1
    if (
      element.scrollHeight <= maximumHeight &&
      element.scrollWidth <= element.clientWidth + 1
    ) {
      break
    }
  }

  element.style.fontSize = `${Math.max(fontSize, minFontSize)}px`
  element.style.display = '-webkit-box'
  element.style.overflow = 'hidden'
  element.style.webkitLineClamp = String(maxLines)
  element.style.webkitBoxOrient = 'vertical'
}

type AutoFitTextProps = FitTextOptions & {
  children: string
  class?: string
}

export function AutoFitText({ children, class: className = '', ...options }: AutoFitTextProps) {
  const textRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const element = textRef.current
    if (!element) return

    const fit = () => fitTextToLines(element, options)
    fit()

    const resizeObserver = new ResizeObserver(fit)
    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [children, options.maxFontSize, options.minFontSize, options.maxLines, options.lineHeight])

  return (
    <span
      ref={textRef}
      class={`w-full [overflow-wrap:anywhere] ${className}`}
      title={children}
    >
      {children}
    </span>
  )
}
