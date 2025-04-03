# Zaphnath Bible Reader

Zaphnath is a cross-platform Bible reading application built with Tauri, React, and TypeScript. It provides a clean, accessible interface for reading scripture in multiple languages.

## Features

- Multi-language support
- Multiple Bible translations
- Clean, distraction-free reading experience
- Dark mode
- Adjustable font size
- Responsive design

## Design System

Zaphnath uses a comprehensive design system to ensure consistency across the application. The design system is documented in `src/design-system.md` and includes:

- Color palette
- Typography
- Spacing
- Component styles
- Accessibility guidelines

## Tech Stack

- [Tauri](https://tauri.app/) - Framework for building desktop applications
- [React](https://reactjs.org/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Rust](https://www.rust-lang.org/) (v1.60 or later)
- [pnpm](https://pnpm.io/) (v7 or later)

### Setup

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm tauri dev
```

### Building

To build the application for production:

```bash
pnpm tauri build
```

## UI Components

Zaphnath includes several reusable UI components:

- `Button` - Primary, secondary, and text buttons
- `Select` - Dropdown select component
- `Card` - Container component with various elevation options
- `Toggle` - Toggle switch component
- `ScriptureView` - Component for displaying Bible verses

## Project Structure

```
zaphnath/
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── App.tsx           # Main application component
│   ├── App.css           # Global styles
│   ├── design-system.md  # Design system documentation
│   └── main.tsx          # Entry point
├── src-tauri/            # Rust backend code
│   ├── src/              # Rust source code
│   └── Cargo.toml        # Rust dependencies
├── public/               # Static assets
├── index.html            # HTML template
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Node.js dependencies
```

## Recommended IDE Setup:

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

