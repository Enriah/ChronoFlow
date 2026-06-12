use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanionActionExecuteRequest {
  action_type: String,
  label: String,
  path: Option<String>,
  url: Option<String>,
}

fn validate_http_url(url: &str) -> Result<(), String> {
  let lower = url.trim().to_lowercase();
  if lower.starts_with("https://") || lower.starts_with("http://") {
    Ok(())
  } else {
    Err("Only http and https URLs are allowed.".to_string())
  }
}

fn clean_path_value(path: &str) -> String {
  path
    .trim()
    .trim_matches('"')
    .trim_matches('\'')
    .trim()
    .to_string()
}

fn path_extension(path: &Path) -> String {
  path
    .extension()
    .and_then(|extension| extension.to_str())
    .unwrap_or("")
    .to_lowercase()
}

fn spawn_fixed(program: &str, args: &[&str]) -> Result<(), String> {
  Command::new(program)
    .args(args)
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("Failed to launch {program}: {error}"))
}

#[tauri::command]
pub fn execute_companion_action(request: CompanionActionExecuteRequest) -> Result<(), String> {
  println!(
    "[CompanionActions] execute request: type={}, label={}, path={:?}, url={:?}",
    request.action_type, request.label, request.path, request.url
  );

  match request.action_type.as_str() {
    "app" => {
      let raw_path = request
        .path
        .as_deref()
        .ok_or_else(|| "App action is missing an executable path.".to_string())?;
      let cleaned_path = clean_path_value(raw_path);
      let executable = PathBuf::from(&cleaned_path);
      println!(
        "[CompanionActions] app path check: cleaned={}, exists={}, is_file={}, extension={}",
        cleaned_path,
        executable.exists(),
        executable.is_file(),
        path_extension(&executable)
      );

      if !executable.exists() || !executable.is_file() {
        return Err(format!(
          "Registered app path does not exist or is not a file: {}",
          cleaned_path
        ));
      }

      let extension = path_extension(&executable);
      if extension == "lnk" {
        return spawn_fixed("explorer.exe", &[cleaned_path.as_str()]);
      }
      if extension != "exe" {
        return Err(format!(
          "Only .exe or .lnk app actions are allowed on Windows. Got: .{}",
          extension
        ));
      }

      let mut command = Command::new(&executable);
      if let Some(parent) = executable.parent() {
        command.current_dir(parent);
      }
      command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to launch app '{}': {error}", cleaned_path))
    }
    "folder" => {
      let raw_path = request
        .path
        .as_deref()
        .ok_or_else(|| "Folder action is missing a path.".to_string())?;
      let cleaned_path = clean_path_value(raw_path);
      let folder = Path::new(&cleaned_path);
      if !folder.exists() || !folder.is_dir() {
        return Err(format!(
          "Registered folder path does not exist or is not a folder: {}",
          cleaned_path
        ));
      }
      spawn_fixed("explorer.exe", &[cleaned_path.as_str()])
    }
    "url" => {
      let raw_url = request
        .url
        .as_deref()
        .ok_or_else(|| "URL action is missing a URL.".to_string())?;
      let url = raw_url.trim();
      validate_http_url(url)?;
      spawn_fixed("rundll32.exe", &["url.dll,FileProtocolHandler", url])
    }
    _ => Err("Unsupported Companion action type.".to_string()),
  }
}
