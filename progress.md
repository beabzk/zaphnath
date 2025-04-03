# Zaphnath - A Cross-Platform Bible Application

## 1. Introduction

Zaphnath is a modern, cross-platform Bible application built using the Tauri framework, leveraging the speed and efficiency of Vite for the frontend build process and React for the user interface. The application's primary goal is to provide users with a clean, accessible, and feature-rich way to read, study, and engage with the Bible. The initial release focuses on a core set of features, with subsequent releases expanding functionality and language support.

## 2. Project Goals

- [x] **Cross-Platform Compatibility**: Deploy the application on Windows and Linux initially
- [ ] Android support for mobile access

- [x] **Multiple Translations**: Allow users to switch between multiple Bible translations
- [x] Support for English translations
- [x] Support for non-English translations (e.g., Amharic)

- [x] **User-Friendly Interface**: Provide a clean, intuitive, and responsive user interface
- [x] Easy navigation and reading experience

- [x] **Performance**: Fast and responsive application, even with large text datasets

- [ ] **Extensibility**: Architecture that accommodates future features
- [ ] Audio support
- [ ] Note-taking
- [ ] Reading plans
- [ ] Additional language support

- [x] **Offline Access**: Translations available offline once downloaded

## 3. Target Audience

- Individuals seeking a digital Bible for personal study and reading
- Students and researchers needing to access and compare different Bible translations
- Users who prefer a lightweight, fast, and native-feeling application compared to web-based Bible platforms

## 4. Technology Stack

- [x] **Tauri**: Cross-platform application framework for backend and native system access
- [x] **Vite**: Fast frontend build tool
- [x] **React**: Component-based UI library
- [x] **Rust**: Backend for file system interaction and data processing
- [x] **TypeScript**: Type safety for frontend and Tauri interaction
- [x] **JSON**: Bible data storage format
- [x] **Tailwind CSS**: Utility-first CSS framework for styling

## 5. Phase 1: Minimum Viable Product (MVP)

### 5.1. Core Features

#### Book and Chapter Selection
- [x] Dropdown menus for selecting a book and chapter
- [x] Clear display of the selected book and chapter name
- [x] Responsive navigation that updates the displayed content instantly

#### Verse Display
- [x] Render the selected chapter's verses in a clear and readable format
- [x] Include verse numbers
- [x] Basic text formatting

#### Translation Management
- [x] Support for multiple translations
- [x] UI for switching between translations
- [x] Language selection support
- [x] Offline availability of downloaded translations

#### Basic Settings
- [x] Font size adjustment
- [x] Light/Dark mode toggle

### 5.2. Technical Requirements

- [x] **Tauri Setup**: Configured Tauri project with Vite and React
- [x] **Rust Backend**: Implemented functions for:
  - [x] Fetching the list of available translations
  - [x] Reading the contents of the selected translation and chapter files

- [x] **React Frontend**: Developed components for:
  - [x] Book/Chapter selection UI
  - [x] Verse display
  - [x] Translation selection UI
  - [x] Settings panel
  - [x] Communication with the Rust backend

- [x] **Error Handling**: Basic error handling for missing files or failed operations
- [x] **Version Control**: Git for version control

- [ ] **Testing**: Unit tests for components and backend functions

## 6. Phase 2: Enhanced Functionality (Future Development)

### 6.1. Expanded Features

#### Audio Bible Support
- [ ] Integrate audio playback for supported translations
- [ ] Download audio files for offline listening
- [ ] Synchronize audio with text (highlighting the currently playing verse)

#### Note-Taking
- [ ] Add notes to specific verses or chapters
- [ ] Store notes locally
- [ ] View, edit, and delete notes

#### Reading Plans
- [ ] Include pre-defined reading plans
- [ ] Track progress through reading plans
- [ ] Create custom reading plans

#### Search Functionality
- [ ] Search for specific words or phrases within translations
- [ ] Implement efficient search indexing

#### Cross-References
- [ ] Display cross-references for verses

#### Multi-Language Support
- [x] Support for non-English translations
- [ ] Localize the application UI for different languages

#### Android Build
- [ ] Build and deploy for Android devices
- [ ] Implement UI adjustments for mobile screens

#### Bookmarks
- [ ] Bookmark specific verses or chapters

### 6.2. Technical Considerations

- [ ] **Database**: Implement storage for notes, reading plans, and user data
- [ ] **Audio Library**: Integration for cross-platform audio playback
- [ ] **Search Indexing**: Efficient search functionality
- [ ] **Internationalization (i18n)**: System for managing UI translations

## 7. Project Management

- [x] **Version Control**: Git for version control
- [ ] **Issue Tracking**: Platform for tracking bugs and feature requests
- [ ] **Agile Development**: Iterative approach with regular releases
- [ ] **Documentation**: Maintain documentation for codebase and features

## 8. Success Metrics

- [x] Successful build and deployment on Windows and Linux
- [ ] Deployment on Android (future)
- [ ] Positive user feedback
- [ ] Growing number of active users
- [ ] Regular feature updates and bug fixes
- [ ] Community engagement (if open-sourced)

## 9. Conclusion

Zaphnath aims to be a valuable resource for individuals seeking a modern and feature-rich Bible application. By building on the strong foundation established in Phase 1 and iteratively adding features in subsequent phases, the project will continue to evolve and provide a compelling user experience. The use of Tauri, Vite, and React ensures a modern, performant, and maintainable codebase, positioning the project for long-term success.