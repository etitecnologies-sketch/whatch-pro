import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface LogoProps {
  className?: string
  size?: number
}

export default function Logo({ className, size = 48 }: LogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_15px_rgba(var(--primary-color-rgb),0.5)]"
      >
        {/* Main Hexagon Background */}
        <path
          d="M50 5L89.5 27.5V72.5L50 95L10.5 72.5V27.5L50 5Z"
          fill="url(#logo-gradient)"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary/30"
        />
        
        {/* Outer Glowing Hexagon */}
        <path
          d="M50 10L85 30V70L50 90L15 30V30L50 10Z"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
          className="text-primary/20 animate-pulse-slow"
        />

        {/* Geometric 'W' */}
        <path
          d="M25 35L40 70L50 55L60 70L75 35"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        />
        
        {/* Accent Diamond in the center */}
        <path
          d="M50 35L58 45L50 55L42 45L50 35Z"
          fill="currentColor"
          className="text-primary glow-primary"
        />

        {/* Bottom Connection */}
        <path
          d="M35 80H65"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary/40"
        />

        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="currentColor" className="text-primary" />
            <stop offset="1" stopColor="currentColor" className="text-blue-600" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
