# Rentars Design System

This document outlines the design system and component library for the Rentars frontend, built with shadcn/ui and Tailwind CSS.

## Overview

The Rentars design system is built on:
- **shadcn/ui** - Unstyled, accessible component library
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library

## Color System

The design system uses CSS variables for theming, supporting both light and dark modes.

### Light Mode (Default)
```css
--background: 0 0% 100%;      /* White */
--foreground: 0 0% 3.6%;      /* Near black */
--primary: 0 0% 9.0%;         /* Dark gray */
--secondary: 0 0% 96.1%;      /* Light gray */
--accent: 0 0% 9.0%;          /* Dark gray */
--destructive: 0 84.2% 60.2%; /* Red */
--muted: 0 0% 96.1%;          /* Light gray */
```

### Dark Mode
```css
--background: 0 0% 3.6%;      /* Near black */
--foreground: 0 0% 98%;       /* White */
--primary: 0 0% 98%;          /* White */
--secondary: 0 0% 14.9%;      /* Dark gray */
--accent: 0 0% 98%;           /* White */
--destructive: 0 62.8% 30.6%; /* Dark red */
--muted: 0 0% 14.9%;          /* Dark gray */
```

## Components

### Core UI Components

#### Button
```tsx
import { Button } from "@/components/ui"

<Button>Click me</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

**Variants:** default, outline, ghost, secondary, destructive, link
**Sizes:** default, sm, lg, icon

#### Card
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer content</CardFooter>
</Card>
```

#### Badge
```tsx
import { Badge } from "@/components/ui"

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

#### Input
```tsx
import { Input } from "@/components/ui"

<Input placeholder="Enter text..." />
<Input type="email" placeholder="Email..." />
<Input type="password" placeholder="Password..." />
```

#### Label
```tsx
import { Label } from "@/components/ui"

<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

#### Alert
```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui"

<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>You can add components to your app using the cli.</AlertDescription>
</Alert>
```

### Custom Components

#### Loading Skeleton
```tsx
import { 
  Skeleton, 
  PropertyCardSkeleton, 
  PropertyListSkeleton,
  BookingSkeleton 
} from "@/components/ui"

// Generic skeleton
<Skeleton className="h-12 w-12 rounded-full" />

// Property card skeleton
<PropertyCardSkeleton />

// Property list skeleton (6 cards by default)
<PropertyListSkeleton count={12} />

// Booking skeleton
<BookingSkeleton />
```

#### Error Display
```tsx
import { 
  ErrorDisplay, 
  SuccessDisplay, 
  InfoDisplay, 
  WarningDisplay 
} from "@/components/ui"

<ErrorDisplay 
  title="Error" 
  message="Something went wrong" 
  onDismiss={() => {}}
/>

<SuccessDisplay 
  title="Success" 
  message="Operation completed" 
/>

<InfoDisplay 
  title="Info" 
  message="Here's some information" 
/>

<WarningDisplay 
  title="Warning" 
  message="Be careful with this action" 
/>
```

#### Icon Container
```tsx
import { IconContainer } from "@/components/ui"
import { Home } from "lucide-react"

<IconContainer size="md" variant="primary">
  <Home className="h-5 w-5" />
</IconContainer>
```

**Sizes:** sm (8x8), md (10x10), lg (12x12)
**Variants:** default, primary, secondary, destructive

## Tailwind CSS Configuration

The tailwind config includes:
- CSS variable-based color system
- Responsive breakpoints (sm, md, lg, xl, 2xl)
- Extended border radius with CSS variables
- Dark mode support via class strategy

## Usage Examples

### Form with Validation
```tsx
import { Button, Input, Label, ErrorDisplay } from "@/components/ui"
import { useState } from "react"

export function LoginForm() {
  const [error, setError] = useState("")

  return (
    <form className="space-y-4">
      {error && <ErrorDisplay message={error} onDismiss={() => setError("")} />}
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="••••••••" />
      </div>
      
      <Button className="w-full">Sign In</Button>
    </form>
  )
}
```

### Property Card
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from "@/components/ui"

export function PropertyCard({ property }) {
  return (
    <Card>
      <img src={property.image} alt={property.title} className="w-full h-48 object-cover" />
      <CardHeader>
        <CardTitle>{property.title}</CardTitle>
        <CardDescription>{property.location}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Badge>{property.bedrooms} beds</Badge>
          <Badge>{property.bathrooms} baths</Badge>
        </div>
        <p className="text-lg font-semibold">${property.price}/night</p>
      </CardContent>
      <div className="p-4 border-t">
        <Button className="w-full">View Details</Button>
      </div>
    </Card>
  )
}
```

## Accessibility

All components follow WAI-ARIA guidelines:
- Semantic HTML
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Color contrast compliance

## Dark Mode

Enable dark mode by adding the `dark` class to the root element:

```tsx
// In layout.tsx
<html className="dark">
  {/* content */}
</html>
```

Or use a theme provider for dynamic switching.

## Contributing

When adding new components:
1. Follow shadcn/ui patterns
2. Use Tailwind CSS utilities
3. Support dark mode
4. Include TypeScript types
5. Add to `src/components/ui/index.ts`
6. Document in this file

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Radix UI Documentation](https://www.radix-ui.com)
- [Lucide Icons](https://lucide.dev)
