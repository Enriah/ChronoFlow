use serde::{Deserialize, Serialize};
use std::{path::Path, process::Command};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisteredCommandRequest {
  command: String,
  working_directory: Option<String>,
  danger_level: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandLaunchResult {
  launched: bool,
  executable: String,
}

const ALLOWED_EXECUTABLES: &[&str] = &[
  "npm", "npm.cmd", "pnpm", "pnpm.cmd", "yarn", "yarn.cmd", "bun",
  "git", "cargo", "dotnet", "docker", "kubectl", "terraform", "node",
  "deno", "python", "python3", "pytest", "go", "java", "mvn", "gradle",
];

const BLOCKED_PATTERNS: &[&str] = &[
  "rm -rf", "del /s", "del /q", "terraform destroy", "kubectl delete",
  "format ", "shutdown", "reg delete", "remove-item", "diskpart", "bcdedit",
];

fn validate_command(command: &str, danger_level: Option<&str>) -> Result<String, String> {
  let trimmed = command.trim();
  if trimmed.is_empty() || trimmed.len() > 500 { return Err("Command is empty or too long.".into()); }
  if trimmed.contains(['\n', '\r', '\0']) { return Err("Multiline commands are not allowed.".into()); }
  if ["&&", "||", ";", "|", ">", "<", "`", "$("].iter().any(|token| trimmed.contains(token)) {
    return Err("Shell chaining, redirection, and substitution are not allowed.".into());
  }
  let lower = trimmed.to_lowercase();
  if danger_level == Some("dangerous") || BLOCKED_PATTERNS.iter().any(|pattern| lower.contains(pattern)) {
    return Err("Dangerous command blocked by ChronoFlow.".into());
  }
  let executable = trimmed.split_whitespace().next().unwrap_or_default().trim_matches('"').to_lowercase();
  if !ALLOWED_EXECUTABLES.contains(&executable.as_str()) {
    return Err(format!("Executable '{executable}' is not in the ChronoFlow command allowlist."));
  }
  Ok(executable)
}

#[tauri::command]
pub fn run_registered_command(request: RegisteredCommandRequest) -> Result<CommandLaunchResult, String> {
  let executable = validate_command(&request.command, request.danger_level.as_deref())?;
  if let Some(directory) = request.working_directory.as_deref() {
    if !Path::new(directory).is_dir() { return Err("Working directory does not exist.".into()); }
  }

  #[cfg(target_os = "windows")]
  let mut process = {
    let mut command = Command::new("cmd.exe");
    command.args(["/C", "start", "", "cmd.exe", "/K", request.command.as_str()]);
    command
  };

  #[cfg(not(target_os = "windows"))]
  let mut process = {
    let mut command = Command::new("sh");
    command.args(["-lc", request.command.as_str()]);
    command
  };

  if let Some(directory) = request.working_directory { process.current_dir(directory); }
  process.spawn().map_err(|error| format!("Could not launch command: {error}"))?;
  Ok(CommandLaunchResult { launched: true, executable })
}
