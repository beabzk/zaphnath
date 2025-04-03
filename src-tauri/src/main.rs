#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use tauri::Manager; // Import Manager trait for AppHandle methods

// --- Data Structures ---
// These should match your JSON structures exactly

#[derive(Serialize, Deserialize, Debug, Clone)]
struct TranslationInfo {
    id: String,       // e.g., "KJV", "AMH1962"
    name: String,     // e.g., "King James Version"
    year: Option<u16>, // Optional year
    folder: String,   // Folder name within the language directory (e.g., "KJV", "Amharic Bible 1962")
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct LanguageInfo {
    code: String,     // e.g., "eng", "amh"
    name: String,     // e.g., "English", "Amharic"
    translations: Vec<TranslationInfo>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct BookInfo {
    name: String,    // Name to display (can be English or Amharic depending on manifest)
    abbr: String,    // Abbreviation used for filename (e.g., "gen", "1ch")
    chapters: u32,   // Number of chapters in the book
}

// Structure matching the verse object in your book JSON files
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Verse {
    verse: String, // Can be a single number "1" or a range "1-2"
    text: String,
}

// Structure matching the chapter object in your book JSON files
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Chapter {
    #[serde(default)]
    chapter: serde_json::Value, // Can be a number or string
    verses: Vec<Verse>,
}

// Structure matching the overall book JSON file (e.g., 1ch.json)
#[derive(Serialize, Deserialize, Debug, Clone)]
struct BookFile {
    book: String,        // English book name (seems consistent)
    book_amharic: Option<String>, // Optional Amharic name
    chapters: Vec<Chapter>,
}

// --- Utility Functions ---

// Gets the application's public directory using AppHandle
fn get_public_dir(_app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    // In development, use the project's public directory
    let public_dir = if cfg!(debug_assertions) {
        PathBuf::from("../public")
    } else {
        // In production, try to use the app's resource directory
        _app_handle.path()
            .resource_dir()
            .map_err(|e| format!("Failed to resolve resource directory: {}", e))?
            .join("public")
    };

    if !public_dir.exists() {
        return Err(format!("Public directory not found at: {}", public_dir.display()));
    }

    Ok(public_dir)
}

// Helper to read and parse a JSON file, providing better error context
fn read_json_file<T: for<'de> Deserialize<'de>>(file_path: &Path) -> Result<T, String> {
    let file_path_str = file_path.to_string_lossy(); // For error messages
    let contents = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file '{}': {}", file_path_str, e))?;
    serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse JSON from '{}': {}", file_path_str, e))
}


// --- Tauri Commands ---

/// Fetches the list of available languages and their translations.
#[tauri::command]
fn get_translations_manifest(app_handle: tauri::AppHandle) -> Result<Vec<LanguageInfo>, String> {
    // Use get_public_dir to resolve the path correctly
    let manifest_path = get_public_dir(&app_handle)?.join("translations_manifest.json");
    println!("get_translations_manifest: manifest_path = {:?}", manifest_path);

    println!("Reading translations manifest from: {:?}", manifest_path);
    let result: Result<Vec<LanguageInfo>, String> = read_json_file(&manifest_path);
    println!("get_translations_manifest: read_json_file result = {:?}", result);
    result
}

/// Fetches the list of books for a specific translation.
#[tauri::command]
fn get_book_manifest(app_handle: tauri::AppHandle, language_code: String, translation_folder: String) -> Result<Vec<BookInfo>, String> {
    let manifest_path = get_public_dir(&app_handle)?
        .join(&language_code) // Use & to borrow strings
        .join(&translation_folder)
        .join("manifest.json");
    println!("Reading book manifest from: {:?}", manifest_path); // Debug print
    read_json_file(&manifest_path)
}

/// Attempts to load a book file with different naming conventions
fn load_book_file(app_handle: &tauri::AppHandle, language_code: &str, translation_folder: &str, book_abbr: &str) -> Result<(PathBuf, BookFile), String> {
    // First try with the abbreviation as provided (lowercase convention like "gen.json")
    let base_path = get_public_dir(app_handle)?
        .join(language_code)
        .join(translation_folder)
        .join("json");

    // Try lowercase abbreviation first (Amharic style)
    let lowercase_path = base_path.join(format!("{}.json", book_abbr.to_lowercase()));
    println!("Trying to read chapter content from: {:?}", lowercase_path);

    if lowercase_path.exists() {
        let book_data: BookFile = read_json_file(&lowercase_path)?;
        return Ok((lowercase_path, book_data));
    }

    // Try with the exact abbreviation as provided (KJV style with full book name)
    let exact_path = base_path.join(format!("{}.json", book_abbr));
    println!("Trying to read chapter content from: {:?}", exact_path);

    if exact_path.exists() {
        let book_data: BookFile = read_json_file(&exact_path)?;
        return Ok((exact_path, book_data));
    }

    // If we're here, neither file exists
    Err(format!("Book file not found for '{}' in {}/{}/json/", book_abbr, language_code, translation_folder))
}

/// Fetches the verses for a specific chapter of a book in a given translation.
#[tauri::command]
fn get_chapter_content(
    app_handle: tauri::AppHandle, // Tauri automatically provides this
    language_code: String,        // e.g., "eng"
    translation_folder: String,   // e.g., "KJV"
    book_abbr: String,            // e.g., "gen" or "Genesis"
    chapter_number: u32,          // 1-based chapter number from frontend
) -> Result<Vec<Verse>, String> {
    // Try to load the book file with different naming conventions
    let (file_path, book_data) = load_book_file(&app_handle, &language_code, &translation_folder, &book_abbr)?;
    println!("Successfully loaded book file from: {:?}", file_path);

    // Convert chapter_number to string for comparison
    let chapter_str = chapter_number.to_string();

    // Find the chapter by comparing either numeric or string values
    for chapter in &book_data.chapters {
        // Check if chapter.chapter is a number that matches chapter_number
        if let Some(num) = chapter.chapter.as_u64() {
            if num as u32 == chapter_number {
                return Ok(chapter.verses.clone());
            }
        }

        // Check if chapter.chapter is a string that matches chapter_str
        if let Some(str_val) = chapter.chapter.as_str() {
            if str_val == chapter_str {
                return Ok(chapter.verses.clone());
            }
        }
    }

    Err(format!("Chapter {} not found in book file for {}", chapter_number, book_abbr))
}


// --- Main Function ---
fn main() {
    tauri::Builder::default()
        // Register the commands that the frontend can invoke
        .invoke_handler(tauri::generate_handler![
            get_translations_manifest,
            get_book_manifest,
            get_chapter_content
        ])
        .run(tauri::generate_context!()) // Generates context including path resolver
        .expect("error while running tauri application");
}