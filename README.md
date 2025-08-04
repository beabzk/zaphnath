
# Zaphnath Bible Reader

A modern, cross-platform Bible reading application built with Electron, React, and TypeScript. Zaphnath provides a beautiful, feature-rich interface for studying the Bible with support for multiple translations, advanced search, bookmarks, and reading plans.

![Zaphnath Bible Reader](https://img.shields.io/badge/version-0.1.0-blue)
![Electron](https://img.shields.io/badge/electron-latest-brightgreen)
![React](https://img.shields.io/badge/react-18-blue)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)

## ✨ Features

### 📖 Bible Reading
- **Multiple Translations**: Support for various Bible translations and languages
- **Repository Management**: Import and manage Bible repositories from URLs
- **Reading Modes**: Verse-by-verse, paragraph, or chapter reading modes
- **Cross-References**: Built-in cross-reference support
- **Footnotes**: Access to detailed footnotes and study notes

### 🎨 User Experience
- **Modern UI**: Clean, intuitive interface with dark/light theme support
- **Responsive Design**: Optimized for different screen sizes
- **Customizable**: Adjustable fonts, sizes, and layout preferences
- **Accessibility**: Full keyboard navigation and screen reader support

### 🔍 Advanced Features
- **Search**: Powerful search across all installed translations
- **Bookmarks**: Save and organize favorite verses
- **Reading History**: Track your reading progress
- **Reading Plans**: Structured Bible reading plans
- **Notes**: Personal study notes and annotations

### 🛠️ Technical Features
- **Offline First**: Works without internet connection
- **Cross-Platform**: Windows, macOS, and Linux support
- **Performance**: Fast search and navigation
- **Data Management**: Efficient SQLite database storage
- **Error Handling**: Comprehensive error reporting and recovery

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/beabzk/zaphnath.git
   cd zaphnath
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Build for production**
   ```bash
   npm run compile
   ```

### First Run
1. Launch the application
2. Navigate to **Repository Management**
3. Import your first Bible translation by entering a repository URL
4. Start reading and exploring!

## 📚 Repository Management

Zaphnath supports importing Bible translations from various sources:

### Supported Formats
- **ZBRS (Zaphnath Bible Repository Standard)**: Native format with full feature support
- **USFM**: Universal Standard Format Marker files
- **JSON**: Structured Bible data in JSON format
- **XML**: Various XML-based Bible formats

### Repository Sources
- **Direct URLs**: Import from any accessible URL
- **Local Files**: Import from local repository files
- **Repository Discovery**: Automatic discovery of available translations

## 🎯 Usage

### Navigation
- **Sidebar**: Access all major features and navigation
- **Search**: Global search across all installed translations
- **Settings**: Customize appearance, reading preferences, and more
- **Debug Panel**: Development tools and error reporting (development mode)

### Reading Features
- **Chapter Navigation**: Easy navigation between books and chapters
- **Verse Highlighting**: Click verses to highlight and reference
- **Reading Modes**: Switch between verse, paragraph, and chapter views
- **Auto-scroll**: Automatic scrolling for hands-free reading

### Customization
- **Themes**: Light, dark, and system theme support
- **Typography**: Adjustable fonts, sizes, and line spacing
- **Layout**: Configurable sidebar width and column layout
- **Reading Preferences**: Auto-scroll speed, verse numbers, and more

## 🏗️ Architecture

Zaphnath is built with modern web technologies and follows best practices for security and performance:

### Frontend Stack
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety and excellent developer experience
- **Zustand**: Lightweight state management
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible, unstyled UI components

### Backend Stack
- **Electron**: Cross-platform desktop application framework
- **SQLite**: Fast, reliable local database
- **Node.js**: Server-side JavaScript runtime
- **TypeScript**: Type-safe backend development

### Key Features
- **Security**: Follows Electron security best practices
- **Performance**: Optimized for fast startup and smooth operation
- **Accessibility**: Full keyboard navigation and screen reader support
- **Error Handling**: Comprehensive error boundaries and logging
- **Testing**: End-to-end tests with Playwright

## 📁 Project Structure

Zaphnath is organized as a monorepo with clear separation of concerns:

```
zaphnath/
├── packages/
│   ├── main/                 # Electron main process
│   │   ├── src/
│   │   │   ├── services/     # Database and repository services
│   │   │   ├── modules/      # Application modules
│   │   │   └── index.ts      # Main entry point
│   │   └── package.json
│   ├── preload/              # Electron preload scripts
│   │   ├── src/
│   │   │   ├── index.ts      # Preload entry point
│   │   │   └── versions.ts   # Version information
│   │   └── package.json
│   └── renderer/             # React frontend application
│       ├── src/
│       │   ├── components/   # React components
│       │   ├── services/     # Frontend services
│       │   ├── stores/       # Zustand state management
│       │   ├── types/        # TypeScript type definitions
│       │   └── App.tsx       # Main React component
│       └── package.json
├── tests/                    # End-to-end tests
└── package.json             # Root package configuration
```

### Package Overview

- **`packages/main`**: Electron main process handling system integration, database operations, and repository management
- **`packages/preload`**: Secure bridge between main and renderer processes
- **`packages/renderer`**: React-based user interface with modern UI components and state management

## 🛠️ Development

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Git for version control

### Development Workflow

1. **Start development server**
   ```bash
   npm start
   ```
   This starts both the Electron main process and the React development server with hot reload.

2. **Type checking**
   ```bash
   npm run typecheck
   ```
   Runs TypeScript type checking across all packages.

3. **Testing**
   ```bash
   npm run test
   ```
   Runs end-to-end tests using Playwright.

4. **Building**
   ```bash
   npm run build
   ```
   Builds all packages for production.

5. **Packaging**
   ```bash
   npm run compile
   ```
   Creates distributable packages for the current platform.

## 📦 Building and Distribution

### Local Development Build
```bash
npm run compile
```
Creates a local executable for testing and development.

### Production Release
The application uses GitHub Actions for automated building and distribution:
- Automatic builds on version tags
- Code signing for security
- Multi-platform support (Windows, macOS, Linux)
- Auto-updater integration

### Supported Platforms
- **Windows**: Windows 10/11 (x64, arm64)
- **macOS**: macOS 10.15+ (Intel and Apple Silicon)
- **Linux**: Ubuntu 18.04+ and compatible distributions


## 🔧 Configuration

### Application Settings
Zaphnath stores user preferences in a local configuration file:
- **Appearance**: Theme, fonts, layout preferences
- **Reading**: Default translations, reading modes, auto-scroll settings
- **Audio**: Text-to-speech configuration (future feature)
- **Advanced**: Debug settings, performance options

### Repository Configuration
Bible repositories are managed through the Repository Management interface:
- **Import Sources**: Add new repository URLs
- **Validation**: Automatic repository validation before import
- **Storage**: Local SQLite database for fast access
- **Updates**: Check for repository updates and new translations

## 🤝 Contributing

We welcome contributions to Zaphnath Bible Reader! Here's how you can help:

### Development Setup
1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature`
5. Make your changes and test thoroughly
6. Submit a pull request

### Contribution Guidelines
- **Code Style**: Follow the existing TypeScript and React patterns
- **Testing**: Add tests for new features
- **Documentation**: Update documentation for user-facing changes
- **Commits**: Use clear, descriptive commit messages

### Areas for Contribution
- **Translations**: Help translate the interface to other languages
- **Repository Formats**: Add support for additional Bible formats
- **Features**: Implement new reading and study features
- **Bug Fixes**: Help identify and fix issues
- **Documentation**: Improve user and developer documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Bible Translations**: Thanks to all organizations providing open Bible translations
- **Open Source Libraries**: Built on the shoulders of amazing open source projects
- **Community**: Thanks to all contributors and users providing feedback
- **Electron Team**: For the excellent cross-platform framework
- **React Team**: For the powerful UI library

## 📞 Support

- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/beabzk/zaphnath/issues)
- **Discussions**: Join community discussions on [GitHub Discussions](https://github.com/beabzk/zaphnath/discussions)
- **Documentation**: Check the [Wiki](https://github.com/beabzk/zaphnath/wiki) for detailed documentation

## 🗺️ Roadmap

### Sprint 1 (Current) ✅
- ✅ Basic UI layout and navigation
- ✅ Theme system (dark/light mode)
- ✅ Repository management
- ✅ Settings and preferences
- ✅ State management with Zustand
- ✅ Logging and error handling

### Sprint 2 (Next)
- 🔄 Search functionality
- 🔄 Reading plans
- 🔄 Bookmarks and notes
- 🔄 Cross-references
- 🔄 Performance optimizations

### Future Sprints
- 📅 Audio features (text-to-speech)
- 📅 Advanced search with filters
- 📅 Study tools and commentaries
- 📅 Synchronization across devices
- 📅 Plugin system for extensions

---

**Zaphnath Bible Reader** - A modern Bible reading application for the digital age.

Built with ❤️ using Electron, React, and TypeScript.
