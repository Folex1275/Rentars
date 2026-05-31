import * as React from "react"
import { AlertCircle, CheckCircle, InfoIcon, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "./alert"
import { cn } from "@/lib/utils"

interface ErrorDisplayProps {
  title?: string
  message: string
  className?: string
  onDismiss?: () => void
}

export function ErrorDisplay({
  title = "Error",
  message,
  className,
  onDismiss,
}: ErrorDisplayProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-sm font-medium hover:underline"
          >
            Dismiss
          </button>
        )}
      </AlertDescription>
    </Alert>
  )
}

interface SuccessDisplayProps {
  title?: string
  message: string
  className?: string
  onDismiss?: () => void
}

export function SuccessDisplay({
  title = "Success",
  message,
  className,
  onDismiss,
}: SuccessDisplayProps) {
  return (
    <Alert className={cn("border-green-200 bg-green-50 text-green-900", className)}>
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-900">{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between text-green-800">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-sm font-medium hover:underline"
          >
            Dismiss
          </button>
        )}
      </AlertDescription>
    </Alert>
  )
}

interface InfoDisplayProps {
  title?: string
  message: string
  className?: string
  onDismiss?: () => void
}

export function InfoDisplay({
  title = "Info",
  message,
  className,
  onDismiss,
}: InfoDisplayProps) {
  return (
    <Alert className={cn("border-blue-200 bg-blue-50 text-blue-900", className)}>
      <InfoIcon className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between text-blue-800">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-sm font-medium hover:underline"
          >
            Dismiss
          </button>
        )}
      </AlertDescription>
    </Alert>
  )
}

interface WarningDisplayProps {
  title?: string
  message: string
  className?: string
  onDismiss?: () => void
}

export function WarningDisplay({
  title = "Warning",
  message,
  className,
  onDismiss,
}: WarningDisplayProps) {
  return (
    <Alert className={cn("border-yellow-200 bg-yellow-50 text-yellow-900", className)}>
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-900">{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between text-yellow-800">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-sm font-medium hover:underline"
          >
            Dismiss
          </button>
        )}
      </AlertDescription>
    </Alert>
  )
}
