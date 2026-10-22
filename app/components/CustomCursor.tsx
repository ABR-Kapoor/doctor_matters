'use client'
import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0 })
  const outerPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    // Enable custom cursor styles on body
    document.body.classList.add('custom-cursor-active')

    let animId: number

    const onMouseMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY }
      if (inner) {
        inner.style.left = `${e.clientX}px`
        inner.style.top = `${e.clientY}px`
      }
    }

    const animate = () => {
      outerPos.current.x += (pos.current.x - outerPos.current.x) * 0.12
      outerPos.current.y += (pos.current.y - outerPos.current.y) * 0.12
      if (outer) {
        outer.style.left = `${outerPos.current.x}px`
        outer.style.top = `${outerPos.current.y}px`
      }
      animId = requestAnimationFrame(animate)
    }

    animate()
    window.addEventListener('mousemove', onMouseMove)

    // Hover states
    const addHover = () => document.body.classList.add('cursor-hover')
    const removeHover = () => document.body.classList.remove('cursor-hover')
    const addImage = () => document.body.classList.add('cursor-image')
    const removeImage = () => document.body.classList.remove('cursor-image')
    const addHeading = () => document.body.classList.add('cursor-heading')
    const removeHeading = () => document.body.classList.remove('cursor-heading')

    const refreshListeners = () => {
      const links = document.querySelectorAll('a, button, [data-cursor="hover"]')
      const images = document.querySelectorAll('img, [data-cursor="image"]')
      const headings = document.querySelectorAll('h1, h2, h3, h4, .font-heading, [data-cursor="heading"]')

      links.forEach(el => { el.addEventListener('mouseenter', addHover); el.addEventListener('mouseleave', removeHover) })
      images.forEach(el => { el.addEventListener('mouseenter', addImage); el.addEventListener('mouseleave', removeImage) })
      headings.forEach(el => { el.addEventListener('mouseenter', addHeading); el.addEventListener('mouseleave', removeHeading) })
    }

    refreshListeners()

    // Click compress
    const onMouseDown = () => {
      document.body.classList.add('cursor-active')
    }
    const onMouseUp = () => {
      document.body.classList.remove('cursor-active')
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      document.body.classList.remove('custom-cursor-active', 'cursor-hover', 'cursor-image', 'cursor-heading', 'cursor-active')
    }
  }, [])

  return (
    <>
      <div id="cursor-outer" ref={outerRef} />
      <div id="cursor-inner" ref={innerRef} />
    </>
  )
}
