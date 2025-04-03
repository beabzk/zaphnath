# Zaphnath Design System

## Introduction

Zaphnath is a Bible reading application designed to provide a clean, accessible interface for reading scripture in multiple languages. This design system defines the visual language and UI components used throughout the application.

## Brand Identity

### Purpose
Zaphnath aims to provide a distraction-free, accessible Bible reading experience that works across languages and translations.

### Target Audience
- Bible readers of all ages
- Multilingual users
- Users who need accessibility features

### Brand Values
- Clarity
- Accessibility
- Simplicity
- Respect for sacred texts

## Color Palette

### Primary Colors
- Primary-50: #f0f9ff
- Primary-100: #e0f2fe
- Primary-200: #bae6fd
- Primary-300: #7dd3fc
- Primary-400: #38bdf8
- Primary-500: #0ea5e9
- Primary-600: #0284c7
- Primary-700: #0369a1
- Primary-800: #075985
- Primary-900: #0c4a6e
- Primary-950: #082f49

### Secondary Colors
- Secondary-50: #f5f3ff
- Secondary-100: #ede9fe
- Secondary-200: #ddd6fe
- Secondary-300: #c4b5fd
- Secondary-400: #a78bfa
- Secondary-500: #8b5cf6
- Secondary-600: #7c3aed
- Secondary-700: #6d28d9
- Secondary-800: #5b21b6
- Secondary-900: #4c1d95
- Secondary-950: #2e1065

### Neutral Colors
- Neutral-50: #f9fafb
- Neutral-100: #f3f4f6
- Neutral-200: #e5e7eb
- Neutral-300: #d1d5db
- Neutral-400: #9ca3af
- Neutral-500: #6b7280
- Neutral-600: #4b5563
- Neutral-700: #374151
- Neutral-800: #1f2937
- Neutral-900: #111827
- Neutral-950: #030712

### Semantic Colors
- Success: #10b981
- Warning: #f59e0b
- Error: #ef4444
- Info: #3b82f6

## Typography

### Font Families
- Primary: 'Inter', sans-serif
- Scripture: 'Noto Serif', serif
- Amharic: 'Noto Sans Ethiopic', sans-serif

### Font Sizes
- xs: 0.75rem (12px)
- sm: 0.875rem (14px)
- base: 1rem (16px)
- lg: 1.125rem (18px)
- xl: 1.25rem (20px)
- 2xl: 1.5rem (24px)
- 3xl: 1.875rem (30px)
- 4xl: 2.25rem (36px)
- 5xl: 3rem (48px)

### Font Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### Line Heights
- Tight: 1.25
- Normal: 1.5
- Relaxed: 1.75
- Loose: 2

## Spacing

We use a consistent 4px spacing scale:
- 0: 0px
- 1: 0.25rem (4px)
- 2: 0.5rem (8px)
- 3: 0.75rem (12px)
- 4: 1rem (16px)
- 5: 1.25rem (20px)
- 6: 1.5rem (24px)
- 8: 2rem (32px)
- 10: 2.5rem (40px)
- 12: 3rem (48px)
- 16: 4rem (64px)
- 20: 5rem (80px)
- 24: 6rem (96px)

## Borders & Radius

### Border Widths
- 0: 0px
- 1: 1px
- 2: 2px
- 4: 4px
- 8: 8px

### Border Radius
- None: 0px
- Small: 0.25rem (4px)
- Medium: 0.375rem (6px)
- Large: 0.5rem (8px)
- XL: 0.75rem (12px)
- 2XL: 1rem (16px)
- Full: 9999px

## Shadows

- Shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
- Shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
- Shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
- Shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
- Shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)

## Components

### Buttons

#### Primary Button
- Background: Primary-600
- Text: White
- Hover: Primary-700
- Active: Primary-800
- Disabled: Primary-300
- Padding: 0.5rem 1rem
- Border Radius: Medium
- Font Weight: Medium

#### Secondary Button
- Background: White
- Border: 1px solid Primary-600
- Text: Primary-600
- Hover: Primary-50
- Active: Primary-100
- Disabled: Neutral-200
- Padding: 0.5rem 1rem
- Border Radius: Medium
- Font Weight: Medium

#### Text Button
- Background: Transparent
- Text: Primary-600
- Hover: Primary-700
- Active: Primary-800
- Disabled: Neutral-400
- Padding: 0.5rem 1rem
- Border Radius: Medium
- Font Weight: Medium

### Form Elements

#### Input
- Background: White
- Border: 1px solid Neutral-300
- Text: Neutral-900
- Placeholder: Neutral-400
- Focus: Border Primary-500, ring Primary-200
- Disabled: Background Neutral-100, Border Neutral-200
- Padding: 0.5rem 0.75rem
- Border Radius: Medium

#### Select
- Same as Input
- With dropdown icon

#### Checkbox & Radio
- Unchecked: Border 1px solid Neutral-300
- Checked: Background Primary-600
- Focus: Ring Primary-200
- Size: 1rem

### Cards

#### Standard Card
- Background: White
- Border: None
- Shadow: Shadow
- Border Radius: Large
- Padding: 1rem

#### Elevated Card
- Background: White
- Border: None
- Shadow: Shadow-md
- Border Radius: Large
- Padding: 1rem

### Scripture Display

#### Verse Container
- Background: White
- Padding: 1rem
- Border Radius: Large
- Line Height: Relaxed

#### Verse Number
- Font Size: sm
- Font Weight: Semibold
- Color: Neutral-500
- Margin Right: 0.5rem
- Vertical Align: Top

#### Verse Text
- Font Family: Scripture
- Font Size: Base to 2xl (user configurable)
- Color: Neutral-900
- Line Height: Relaxed

## Layout

### Container Widths
- Small: 640px
- Medium: 768px
- Large: 1024px
- XL: 1280px
- 2XL: 1536px

### Grid System
- 12-column grid
- Gutters: 1rem (16px)

### Responsive Breakpoints
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

## Light and Dark Mode

### Light Mode

#### Background Colors
- Page: Neutral-100
- Card: White with Neutral-200 border
- Input: White with Neutral-300 border

#### Text Colors
- Primary: Neutral-900
- Secondary: Neutral-600
- Tertiary: Neutral-500
- Headers: Neutral-900 (previously Primary-700)

### Dark Mode

#### Background Colors
- Page: Neutral-950
- Card: Neutral-800 with Neutral-700 border
- Input: Neutral-800 with Neutral-600 border

#### Text Colors
- Primary: Neutral-50
- Secondary: Neutral-300
- Tertiary: Neutral-400
- Headers: Neutral-100 (previously Primary-300)

### Component Adjustments
- Shadows: Reduced opacity in dark mode
- Borders: Added for better visual separation in light mode
- Focus rings: Adjusted for contrast in both modes

## Accessibility

### Color Contrast
- All text meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- Interactive elements have sufficient contrast

### Focus States
- All interactive elements have visible focus states
- Focus ring color: Primary-500
- Focus ring width: 2px

### Screen Reader Support
- All interactive elements have appropriate ARIA labels
- Proper heading hierarchy
- Semantic HTML

## Implementation Guidelines

### CSS Classes

Use Tailwind CSS utility classes following these patterns:

#### Buttons
```html
<button class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-300 disabled:cursor-not-allowed">
  Button Text
</button>
```

#### Cards
```html
<div class="bg-white p-4 rounded-lg shadow">
  Card content
</div>
```

#### Scripture Display
```html
<div class="space-y-2 leading-relaxed font-scripture">
  <p>
    <span class="font-semibold text-sm align-top mr-2 text-neutral-500">1</span>
    Verse text goes here
  </p>
</div>
```
