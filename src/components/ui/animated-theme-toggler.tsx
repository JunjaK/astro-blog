import { useCallback, useRef } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"
import { useStore } from "@nanostores/react"

import { $theme, setTheme } from "@/store/system"
import { cn } from "@/lib/utils"

interface AnimatedThemeTogglerProps
  extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

export function AnimatedThemeToggler({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) {
  const theme = useStore($theme)
  const isDark = theme === "dark"
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return

    const newTheme = isDark ? "light" : "dark"

    const applyTheme = () => {
      setTheme(newTheme)
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark")
        document.documentElement.setAttribute("data-theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        document.documentElement.removeAttribute("data-theme")
      }
      document.body.dispatchEvent(new Event("theme-set"))
    }

    if (!document.startViewTransition) {
      applyTheme()
      return
    }

    await document.startViewTransition(() => {
      flushSync(applyTheme)
    }).ready

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    )

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    )
  }, [isDark, duration])

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
      aria-label="Toggle theme"
      {...props}
    >
      {isDark ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
