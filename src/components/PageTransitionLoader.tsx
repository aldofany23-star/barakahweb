'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function PageTransitionLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  // When pathname or searchParams change, mark transition as complete
  useEffect(() => {
    if (isNavigating) {
      setProgress(100)
      const timeout = setTimeout(() => {
        setIsNavigating(false)
        setProgress(0)
      }, 350)
      return () => clearTimeout(timeout)
    }
  }, [pathname, searchParams])

  // Listen to clicks on navigation links
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null
    let safetyTimeout: NodeJS.Timeout | null = null

    const handleLinkClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      const target = anchor.getAttribute('target')

      // Ignore external links, new tabs, modifier keys, downloads, and hashes
      if (
        !href ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        target === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }

      const currentPath = window.location.pathname
      const currentFull = currentPath + window.location.search

      // Only trigger if navigating to a different destination
      if (href !== currentFull && href !== currentPath) {
        setIsNavigating(true)
        setProgress(25)

        if (progressInterval) clearInterval(progressInterval)
        if (safetyTimeout) clearTimeout(safetyTimeout)

        progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) {
              if (progressInterval) clearInterval(progressInterval)
              return 85
            }
            return prev + Math.floor(Math.random() * 12) + 5
          })
        }, 120)

        // Safety fallback in case navigation is cancelled or errors
        safetyTimeout = setTimeout(() => {
          if (progressInterval) clearInterval(progressInterval)
          setIsNavigating(false)
          setProgress(0)
        }, 8000)
      }
    }

    document.addEventListener('click', handleLinkClick, true)
    return () => {
      document.removeEventListener('click', handleLinkClick, true)
      if (progressInterval) clearInterval(progressInterval)
      if (safetyTimeout) clearTimeout(safetyTimeout)
    }
  }, [])

  if (!isNavigating && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2.5px] bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-[#00A250] to-[#10B981] shadow-[0_0_10px_rgba(0,162,80,0.6)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? 'width 0.15s ease-out, opacity 0.35s ease-out'
              : 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  )
}
