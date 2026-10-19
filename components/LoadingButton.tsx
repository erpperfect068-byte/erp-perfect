import * as React from "react"
import { Button, ButtonProps, buttonVariants } from "./ui/button"

export type LoadingButtonProps = ButtonProps

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (props, ref) => {
    return <Button ref={ref} {...props} />
  }
)

LoadingButton.displayName = "LoadingButton"

export default LoadingButton
export { Button, buttonVariants }
