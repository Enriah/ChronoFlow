use serde::{Deserialize, Serialize};
use std::{env, fs, io::{ErrorKind, Write}, path::{Path, PathBuf}, process::{Command, Stdio}, thread, time::{Duration, Instant, SystemTime, UNIX_EPOCH}};

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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCommandRequest {
  command: String,
  args: Vec<String>,
  working_directory: Option<String>,
  prompt: String,
  timeout_seconds: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCommandResult {
  exit_code: Option<i32>,
  stdout: String,
  stderr: String,
}

const ALLOWED_EXECUTABLES: &[&str] = &[
  "npm", "npm.cmd", "pnpm", "pnpm.cmd", "yarn", "yarn.cmd", "bun",
  "git", "cargo", "dotnet", "docker", "kubectl", "terraform", "node",
  "deno", "python", "python3", "pytest", "go", "java", "mvn", "gradle",
  "codex", "codex.cmd", "codex.exe", "claude", "claude.cmd", "claude.exe",
  "gemini", "gemini.cmd", "gemini.exe", "opencode", "opencode.cmd", "opencode.exe",
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

fn validate_executable(command: &str) -> Result<String, String> {
  let trimmed = command.trim().trim_matches('"');
  if trimmed.is_empty() || trimmed.len() > 260 { return Err("Command is empty or too long.".into()); }
  if trimmed.contains(['\n', '\r', '\0']) { return Err("Invalid command name.".into()); }
  let executable = Path::new(trimmed)
    .file_name()
    .and_then(|name| name.to_str())
    .unwrap_or(trimmed)
    .to_lowercase();
  if !ALLOWED_EXECUTABLES.contains(&executable.as_str()) {
    return Err(format!("Executable '{executable}' is not in the ChronoFlow command allowlist."));
  }
  Ok(trimmed.to_string())
}

#[cfg(target_os = "windows")]
fn has_directory(value: &str) -> bool {
  Path::new(value).parent().is_some_and(|parent| !parent.as_os_str().is_empty())
}

#[cfg(target_os = "windows")]
fn windows_path_candidates(command_name: &str) -> Vec<String> {
  env::var_os("PATH").map(|path| {
    env::split_paths(&path)
      .map(|directory| directory.join(command_name).to_string_lossy().to_string())
      .collect()
  }).unwrap_or_default()
}

#[cfg(target_os = "windows")]
fn codex_windows_app_candidates() -> Vec<String> {
  let mut roots: Vec<PathBuf> = env::var_os("ProgramFiles").map(PathBuf::from).into_iter().collect();
  roots.push(PathBuf::from(r"C:\Program Files"));

  let mut candidates = Vec::new();
  for root in roots {
    let windows_apps = root.join("WindowsApps");
    let Ok(entries) = fs::read_dir(windows_apps) else { continue };
    for entry in entries.flatten() {
      let name = entry.file_name().to_string_lossy().to_string();
      if !name.starts_with("OpenAI.Codex_") { continue; }
      let candidate = entry.path().join("app").join("resources").join("codex.exe");
      if candidate.is_file() {
        candidates.push(candidate.to_string_lossy().to_string());
      }
    }
  }
  candidates.sort();
  candidates.reverse();
  candidates
}

fn agent_executable_candidates(executable: &str) -> Vec<String> {
  let mut candidates = vec![executable.to_string()];

  #[cfg(target_os = "windows")]
  {
    let path = Path::new(executable);
    let has_directory = has_directory(executable);
    let has_extension = path.extension().is_some();
    let stem = path.file_stem().and_then(|value| value.to_str()).unwrap_or(executable).to_lowercase();
    if !has_directory {
      if !has_extension {
        candidates.push(format!("{executable}.exe"));
        candidates.push(format!("{executable}.cmd"));
        candidates.extend(windows_path_candidates(&format!("{executable}.exe")));
        candidates.extend(windows_path_candidates(&format!("{executable}.cmd")));
      } else {
        candidates.extend(windows_path_candidates(executable));
      }
      if let Ok(appdata) = env::var("APPDATA") {
        let command_name = if has_extension { executable.to_string() } else { format!("{executable}.cmd") };
        candidates.push(Path::new(&appdata).join("npm").join(command_name).to_string_lossy().to_string());
      }
      if stem == "codex" {
        candidates.extend(codex_windows_app_candidates());
      }
    }
  }

  candidates.dedup();
  candidates
}

fn build_process(executable: &str, args: &[String], working_directory: Option<&str>, capture: bool) -> Command {
  #[cfg(target_os = "windows")]
  {
    let extension = Path::new(executable).extension().and_then(|value| value.to_str()).unwrap_or_default().to_lowercase();
    if extension == "cmd" || extension == "bat" {
      let mut process = Command::new("cmd.exe");
      process.args(["/D", "/C", "call", executable]).args(args.iter().map(|arg| arg.as_str()));
      if capture {
        process.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
      } else {
        process.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
      }
      if let Some(directory) = working_directory { process.current_dir(directory); }
      return process;
    }
  }

  let mut process = Command::new(executable);
  process.args(args.iter().map(|arg| arg.as_str()));
  if capture {
    process.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
  } else {
    process.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
  }
  if let Some(directory) = working_directory { process.current_dir(directory); }
  process
}

fn prompt_file_path() -> PathBuf {
  let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map(|value| value.as_millis()).unwrap_or(0);
  env::temp_dir().join(format!("chronoflow-agent-prompt-{stamp}.txt"))
}

fn prepare_app_args(args: &[String], prompt: &str) -> Result<(Vec<String>, Option<PathBuf>, bool), String> {
  let mut prompt_file = None;
  let mut injected = false;
  let mut next_args = Vec::with_capacity(args.len());
  for arg in args {
    if arg.contains("{promptFile}") {
      let path = prompt_file.get_or_insert_with(prompt_file_path);
      fs::write(path.as_path(), prompt).map_err(|error| format!("Could not write prompt file: {error}"))?;
      next_args.push(arg.replace("{promptFile}", path.to_string_lossy().as_ref()));
      injected = true;
    } else if arg.contains("{prompt}") {
      next_args.push(arg.replace("{prompt}", prompt));
      injected = true;
    } else {
      next_args.push(arg.clone());
    }
  }
  Ok((next_args, prompt_file, injected))
}

fn spawn_agent_process(executable: &str, args: &[String], working_directory: Option<&str>, capture: bool) -> Result<std::process::Child, String> {
  let candidates = agent_executable_candidates(executable);
  let mut last_not_found = None;
  for candidate in candidates {
    #[cfg(target_os = "windows")]
    if has_directory(&candidate) && !Path::new(&candidate).is_file() {
      last_not_found = Some(format!("{candidate}: file does not exist"));
      continue;
    }
    match build_process(&candidate, args, working_directory, capture).spawn() {
      Ok(process) => return Ok(process),
      Err(error) if error.kind() == ErrorKind::NotFound => {
        last_not_found = Some(format!("{candidate}: {error}"));
      }
      Err(error) => return Err(format!("Could not launch agent '{candidate}': {error}")),
    }
  }
  Err(format!("Could not launch agent. {}", last_not_found.unwrap_or_else(|| "Executable was not found.".into())))
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

#[tauri::command]
pub fn run_agent_command(request: AgentCommandRequest) -> Result<AgentCommandResult, String> {
  let executable = validate_executable(&request.command)?;
  let prompt = request.prompt.trim();
  if prompt.is_empty() { return Err("Agent prompt is empty.".into()); }
  if prompt.len() > 12_500 { return Err("Agent prompt is too long.".into()); }
  if request.args.iter().any(|arg| arg.contains('\0')) { return Err("Invalid agent argument.".into()); }
  if let Some(directory) = request.working_directory.as_deref() {
    if !Path::new(directory).is_dir() { return Err("Working directory does not exist.".into()); }
  }
  let timeout_seconds = request.timeout_seconds.unwrap_or(900).clamp(30, 7_200);

  let mut child = spawn_agent_process(&executable, &request.args, request.working_directory.as_deref(), true)?;
  if let Some(mut stdin) = child.stdin.take() {
    stdin.write_all(prompt.as_bytes()).map_err(|error| format!("Could not write prompt to agent: {error}"))?;
  }
  let started = Instant::now();
  loop {
    if child.try_wait().map_err(|error| format!("Could not check agent status: {error}"))?.is_some() {
      break;
    }
    if started.elapsed() >= Duration::from_secs(timeout_seconds) {
      let _ = child.kill();
      let output = child.wait_with_output().map_err(|error| format!("Could not read timed-out agent output: {error}"))?;
      let mut stderr = String::from_utf8_lossy(&output.stderr).to_string();
      if !stderr.is_empty() { stderr.push('\n'); }
      stderr.push_str(&format!("ChronoFlow: agent timed out after {timeout_seconds} seconds."));
      return Ok(AgentCommandResult {
        exit_code: output.status.code().or(Some(124)),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr,
      });
    }
    thread::sleep(Duration::from_millis(100));
  }
  let output = child.wait_with_output().map_err(|error| format!("Could not read agent output: {error}"))?;
  Ok(AgentCommandResult {
    exit_code: output.status.code(),
    stdout: String::from_utf8_lossy(&output.stdout).to_string(),
    stderr: String::from_utf8_lossy(&output.stderr).to_string(),
  })
}

#[tauri::command]
pub fn run_agent_app(request: AgentCommandRequest) -> Result<AgentCommandResult, String> {
  let executable = validate_executable(&request.command)?;
  let prompt = request.prompt.trim();
  if prompt.is_empty() { return Err("Agent prompt is empty.".into()); }
  if prompt.len() > 12_500 { return Err("Agent prompt is too long.".into()); }
  if request.args.iter().any(|arg| arg.contains('\0')) { return Err("Invalid agent argument.".into()); }
  if let Some(directory) = request.working_directory.as_deref() {
    if !Path::new(directory).is_dir() { return Err("Working directory does not exist.".into()); }
  }

  let (args, prompt_file, injected) = prepare_app_args(&request.args, prompt)?;
  let _child = spawn_agent_process(&executable, &args, request.working_directory.as_deref(), false)?;
  let stdout = if injected {
    match prompt_file {
      Some(path) => format!("Agent app launched. Prompt was written to {} and passed through arguments.", path.to_string_lossy()),
      None => "Agent app launched. Prompt was passed through arguments.".to_string(),
    }
  } else {
    "Agent app launched. This app profile does not pass the prompt automatically; use {prompt} or {promptFile} in Arguments if the app supports it. The prompt is saved in ChronoFlow Agent runs.".to_string()
  };
  Ok(AgentCommandResult { exit_code: Some(0), stdout, stderr: String::new() })
}
