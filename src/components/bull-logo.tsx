import * as React from "react"

export const BullLogo = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M24 20C18 18 12 14 4 8C6 18 14 24 24 26Z" />
      <path d="M40 20C46 18 52 14 60 8C58 18 50 24 40 26Z" />
      <path d="M24 18Q32 14 40 18Q46 24 44 38Q42 50 36 56Q32 60 28 56Q22 50 20 38Q18 24 24 18Z" />
    </svg>
  )
)
BullLogo.displayName = "BullLogo"
