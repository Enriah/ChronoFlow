use audio_tools::mic_config::find_best_config;
use audio_tools::process_audio::resample_into_chunks;
use audio_tools::resampler::make_resampler;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig};
use libloading::Library;
use oww_rs::config::SpeechUnlockType::{OpenWakeWordAlexa, OpenWakeWordHeyMycroft};
use oww_rs::mic_cpal::build_input_stream;
use oww_rs::oww::{OwwModel, OWW_MODEL_CHUNK_SIZE};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_short};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

const BUNDLED_VOSK_MODEL_DIR: &str = "vosk-model-small-en-us-0.15";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum WakeWordNativeState {
  Off,
  Initializing,
  ListeningForWakeWord,
  WakeDetected,
  Paused,
  Error,
}

#[derive(Debug, Clone, Serialize)]
pub struct WakeWordStatus {
  state: WakeWordNativeState,
  engine: String,
  microphone_level: f32,
  detection_confidence: f32,
  last_detection_time: Option<String>,
  false_trigger_count: u32,
  cpu_warning: Option<String>,
  message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WakeWordDetectedPayload {
  engine: String,
  keyword: String,
  confidence: f32,
  detected_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct WakeWordDebugPayload {
  engine: String,
  last_partial_transcript: Option<String>,
  last_final_transcript: Option<String>,
  matched_variant: Option<String>,
  detection_confidence: f32,
  trigger_reason: Option<String>,
  ignored_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WakeWordStartConfig {
  engine: String,
  keyword: String,
  sensitivity: f32,
  variants: Option<Vec<String>>,
  vosk_model_path: Option<String>,
}

pub(crate) struct WakeWordRuntime {
  stop_tx: Option<mpsc::Sender<()>>,
  status: WakeWordStatus,
}

impl Default for WakeWordRuntime {
  fn default() -> Self {
    Self {
      stop_tx: None,
      status: WakeWordStatus {
        state: WakeWordNativeState::Off,
        engine: "openwakeword_builtin".to_string(),
        microphone_level: 0.0,
        detection_confidence: 0.0,
        last_detection_time: None,
        false_trigger_count: 0,
        cpu_warning: None,
        message: None,
      },
    }
  }
}

pub type WakeWordState = Arc<Mutex<WakeWordRuntime>>;

pub fn new_state() -> WakeWordState {
  Arc::new(Mutex::new(WakeWordRuntime::default()))
}

fn emit_status(app: &AppHandle, status: &WakeWordStatus) {
  let _ = app.emit("wake_word_status", status.clone());
}

fn normalize_keyword(keyword: &str) -> String {
  keyword.trim().to_lowercase().replace([' ', '-', '_'], "")
}

fn keyword_to_model(keyword: &str) -> Result<oww_rs::config::SpeechUnlockType, String> {
  match normalize_keyword(keyword).as_str() {
    "alexa" => Ok(OpenWakeWordAlexa),
    "heymycroft" | "mycroft" => Ok(OpenWakeWordHeyMycroft),
    _ => Err("Real OpenWakeWord detection currently supports built-in wake words: Alexa or Hey Mycroft. Custom names are saved for future custom ONNX model training.".to_string()),
  }
}

fn threshold_from_sensitivity(sensitivity: f32) -> f32 {
  let clamped = sensitivity.clamp(0.0, 1.0);
  (1.0 - clamped).clamp(0.08, 0.85)
}

fn clean_optional_path(path: Option<&str>) -> Option<String> {
  path
    .map(str::trim)
    .map(|path| path.trim_matches('"').trim_matches('\'').trim())
    .filter(|path| !path.is_empty())
    .map(str::to_string)
}

fn candidate_bundled_vosk_roots(app: &AppHandle) -> Vec<PathBuf> {
  let mut roots = Vec::new();

  if let Ok(resource_dir) = app.path().resource_dir() {
    roots.push(resource_dir.join("vosk"));
    roots.push(resource_dir.join("resources").join("vosk"));
    roots.push(resource_dir.clone());
  }

  if let Ok(exe_path) = std::env::current_exe() {
    if let Some(exe_dir) = exe_path.parent() {
      roots.push(exe_dir.join("resources").join("vosk"));
      roots.push(exe_dir.join("vosk"));
      roots.push(exe_dir.to_path_buf());
    }
  }

  roots.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources").join("vosk"));
  roots.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("models"));

  roots.sort();
  roots.dedup();
  roots
}

fn resolve_vosk_model_path(app: &AppHandle, configured_path: Option<&str>) -> Result<(String, Vec<PathBuf>, bool), String> {
  if let Some(path) = clean_optional_path(configured_path) {
    let model_dir = PathBuf::from(&path);
    if model_dir.exists() && model_dir.is_dir() {
      let mut search_dirs = vec![model_dir.clone()];
      if let Some(parent) = model_dir.parent() {
        search_dirs.push(parent.to_path_buf());
      }
      search_dirs.extend(candidate_bundled_vosk_roots(app));
      return Ok((path, search_dirs, false));
    }

    eprintln!(
      "[SmartWakeVosk] Configured Vosk model folder does not exist, falling back to bundled model: {path}"
    );
  }

  let mut checked = Vec::<String>::new();
  for root in candidate_bundled_vosk_roots(app) {
    let model_dir = root.join(BUNDLED_VOSK_MODEL_DIR);
    checked.push(format!(
      "root={}, model={}, libvosk={}",
      root.display(),
      model_dir.display(),
      root.join("libvosk.dll").display()
    ));
    if model_dir.exists() && model_dir.is_dir() {
      let mut search_dirs = vec![model_dir.clone(), root.clone()];
      if let Some(parent) = root.parent() {
        search_dirs.push(parent.to_path_buf());
      }
      return Ok((model_dir.display().to_string(), search_dirs, true));
    }
  }

  Err(format!(
    "Bundled Vosk model was not found. Expected {} under one of: {}",
    BUNDLED_VOSK_MODEL_DIR,
    checked.join(" | ")
  ))
}

#[repr(C)]
struct VoskModel;

#[repr(C)]
struct VoskRecognizer;

struct VoskApi {
  _lib: Library,
  model_new: unsafe extern "C" fn(*const c_char) -> *mut VoskModel,
  model_free: unsafe extern "C" fn(*mut VoskModel),
  recognizer_new_grm: unsafe extern "C" fn(*mut VoskModel, f32, *const c_char) -> *mut VoskRecognizer,
  recognizer_set_max_alternatives: unsafe extern "C" fn(*mut VoskRecognizer, c_int),
  recognizer_set_words: unsafe extern "C" fn(*mut VoskRecognizer, c_int),
  recognizer_set_partial_words: unsafe extern "C" fn(*mut VoskRecognizer, c_int),
  recognizer_accept_waveform_s: unsafe extern "C" fn(*mut VoskRecognizer, *const c_short, c_int) -> c_int,
  recognizer_result: unsafe extern "C" fn(*mut VoskRecognizer) -> *const c_char,
  recognizer_partial_result: unsafe extern "C" fn(*mut VoskRecognizer) -> *const c_char,
  recognizer_reset: unsafe extern "C" fn(*mut VoskRecognizer),
  recognizer_free: unsafe extern "C" fn(*mut VoskRecognizer),
}

unsafe impl Send for VoskApi {}
unsafe impl Sync for VoskApi {}

#[derive(Clone, Copy)]
struct VoskRecognizerHandle(*mut VoskRecognizer);

unsafe impl Send for VoskRecognizerHandle {}
unsafe impl Sync for VoskRecognizerHandle {}

#[derive(Clone, Copy)]
struct VoskModelHandle(*mut VoskModel);

unsafe impl Send for VoskModelHandle {}
unsafe impl Sync for VoskModelHandle {}

#[derive(Default)]
struct VoskDetectionMemory {
  last_partial_match: Option<String>,
  partial_match_count: u8,
}

impl VoskApi {
  fn load(search_dirs: &[PathBuf]) -> Result<Arc<Self>, String> {
    let library_names: Vec<PathBuf> = if cfg!(target_os = "windows") {
      vec![PathBuf::from("libvosk.dll"), PathBuf::from("vosk.dll")]
    } else if cfg!(target_os = "macos") {
      vec![PathBuf::from("libvosk.dylib")]
    } else {
      vec![PathBuf::from("libvosk.so")]
    };

    let mut candidates = Vec::<PathBuf>::new();
    for dir in search_dirs {
      for name in &library_names {
        candidates.push(dir.join(name));
      }
    }
    candidates.extend(library_names);

    let mut last_error = String::new();
    let mut checked = Vec::<String>::new();
    for candidate in candidates {
      checked.push(candidate.display().to_string());
      let library = unsafe { Library::new(&candidate) };
      match library {
        Ok(lib) => {
          let api = unsafe {
            Self {
              model_new: *lib.get(b"vosk_model_new\0").map_err(|error| error.to_string())?,
              model_free: *lib.get(b"vosk_model_free\0").map_err(|error| error.to_string())?,
              recognizer_new_grm: *lib.get(b"vosk_recognizer_new_grm\0").map_err(|error| error.to_string())?,
              recognizer_set_max_alternatives: *lib.get(b"vosk_recognizer_set_max_alternatives\0").map_err(|error| error.to_string())?,
              recognizer_set_words: *lib.get(b"vosk_recognizer_set_words\0").map_err(|error| error.to_string())?,
              recognizer_set_partial_words: *lib.get(b"vosk_recognizer_set_partial_words\0").map_err(|error| error.to_string())?,
              recognizer_accept_waveform_s: *lib.get(b"vosk_recognizer_accept_waveform_s\0").map_err(|error| error.to_string())?,
              recognizer_result: *lib.get(b"vosk_recognizer_result\0").map_err(|error| error.to_string())?,
              recognizer_partial_result: *lib.get(b"vosk_recognizer_partial_result\0").map_err(|error| error.to_string())?,
              recognizer_reset: *lib.get(b"vosk_recognizer_reset\0").map_err(|error| error.to_string())?,
              recognizer_free: *lib.get(b"vosk_recognizer_free\0").map_err(|error| error.to_string())?,
              _lib: lib,
            }
          };
          return Ok(Arc::new(api));
        }
        Err(error) => last_error = format!("{}: {}", candidate.display(), error),
      }
    }

    Err(format!(
      "Smart Wake Vosk could not load libvosk.dll at runtime. Checked: {}. Last error: {last_error}",
      checked.join(" | ")
    ))
  }

  fn c_string_result(&self, ptr: *const c_char) -> String {
    if ptr.is_null() {
      return String::new();
    }
    unsafe { CStr::from_ptr(ptr).to_string_lossy().into_owned() }
  }
}

#[tauri::command]
pub fn wake_word_is_available() -> Result<bool, String> {
  let host = cpal::default_host();
  Ok(host.default_input_device().is_some())
}

#[tauri::command]
pub fn wake_word_status(state: tauri::State<'_, WakeWordState>) -> Result<WakeWordStatus, String> {
  let runtime = state.lock().map_err(|_| "Wake word state lock failed.".to_string())?;
  Ok(runtime.status.clone())
}

#[tauri::command]
pub fn wake_word_stop(state: tauri::State<'_, WakeWordState>) -> Result<(), String> {
  let mut runtime = state.lock().map_err(|_| "Wake word state lock failed.".to_string())?;
  if let Some(stop_tx) = runtime.stop_tx.take() {
    let _ = stop_tx.send(());
  }
  runtime.status.state = WakeWordNativeState::Off;
  runtime.status.message = Some("Wake Word Off".to_string());
  Ok(())
}

#[tauri::command]
pub fn wake_word_pause(state: tauri::State<'_, WakeWordState>) -> Result<(), String> {
  let mut runtime = state.lock().map_err(|_| "Wake word state lock failed.".to_string())?;
  if let Some(stop_tx) = runtime.stop_tx.take() {
    let _ = stop_tx.send(());
  }
  runtime.status.state = WakeWordNativeState::Paused;
  runtime.status.message = Some("Wake word paused.".to_string());
  Ok(())
}

#[tauri::command]
pub fn wake_word_start(
  app: AppHandle,
  state: tauri::State<'_, WakeWordState>,
  config: WakeWordStartConfig,
) -> Result<(), String> {
  if config.engine != "openwakeword_builtin" {
    if config.engine == "smart_vosk" {
      return start_vosk_wake_word(app, state, config);
    }
    return Err("Real wake word detection is unavailable for this engine. Use Smart Wake Vosk, OpenWakeWord Built-in, or Push-to-Talk.".to_string());
  }

  let wake_model = keyword_to_model(&config.keyword)?;
  {
    let mut runtime = state.lock().map_err(|_| "Wake word state lock failed.".to_string())?;
    if let Some(stop_tx) = runtime.stop_tx.take() {
      let _ = stop_tx.send(());
    }
    runtime.status.state = WakeWordNativeState::Off;
  }

  let (stop_tx, stop_rx) = mpsc::channel::<()>();
  let (audio_tx, audio_rx) = mpsc::sync_channel::<Vec<f32>>(32);
  let app_for_worker = app.clone();
  let app_for_status = app.clone();
  let keyword = config.keyword.trim().to_string();
  let threshold = threshold_from_sensitivity(config.sensitivity);

  {
    let mut runtime = state.lock().map_err(|_| "Wake word state lock failed.".to_string())?;
    runtime.stop_tx = Some(stop_tx);
    runtime.status = WakeWordStatus {
      state: WakeWordNativeState::Initializing,
      engine: config.engine.clone(),
      microphone_level: 0.0,
      detection_confidence: 0.0,
      last_detection_time: None,
      false_trigger_count: runtime.status.false_trigger_count,
      cpu_warning: None,
      message: Some("Initializing OpenWakeWord.".to_string()),
    };
    emit_status(&app_for_status, &runtime.status);
  }

  thread::spawn(move || {
    let mut model = match OwwModel::new(wake_model, threshold) {
      Ok(model) => model,
      Err(error) => {
        let _ = app_for_worker.emit("wake_word_status", WakeWordStatus {
          state: WakeWordNativeState::Error,
          engine: "openwakeword_builtin".to_string(),
          microphone_level: 0.0,
          detection_confidence: 0.0,
          last_detection_time: None,
          false_trigger_count: 0,
          cpu_warning: None,
          message: Some(format!("OpenWakeWord model failed: {error}")),
        });
        return;
      }
    };

    let mut last_status_emit = Instant::now();
    while let Ok(chunk) = audio_rx.recv() {
      let rms = (chunk.iter().map(|sample| sample * sample).sum::<f32>() / chunk.len().max(1) as f32).sqrt();
      let detection = model.detection(chunk);

      if last_status_emit.elapsed() > Duration::from_millis(500) {
        let _ = app_for_worker.emit("wake_word_status", WakeWordStatus {
          state: WakeWordNativeState::ListeningForWakeWord,
          engine: "openwakeword_builtin".to_string(),
          microphone_level: rms,
          detection_confidence: detection.probability,
          last_detection_time: None,
          false_trigger_count: 0,
          cpu_warning: None,
          message: Some("Wake Word Active".to_string()),
        });
        last_status_emit = Instant::now();
      }

      if detection.detected {
        let detected_at = chrono_like_now();
        let payload = WakeWordDetectedPayload {
          engine: "openwakeword_builtin".to_string(),
          keyword: keyword.clone(),
          confidence: detection.probability,
          detected_at: detected_at.clone(),
        };
        let _ = app_for_worker.emit("wake_word_detected", payload);
        let _ = app_for_worker.emit("wake_word_status", WakeWordStatus {
          state: WakeWordNativeState::WakeDetected,
          engine: "openwakeword_builtin".to_string(),
          microphone_level: rms,
          detection_confidence: detection.probability,
          last_detection_time: Some(detected_at),
          false_trigger_count: 0,
          cpu_warning: None,
          message: Some("Wake word detected.".to_string()),
        });
        break;
      }
    }
  });

  thread::spawn(move || {
    let host = cpal::default_host();
    let Some(device) = host.default_input_device() else {
      let _ = app.emit("wake_word_status", WakeWordStatus {
        state: WakeWordNativeState::Error,
        engine: "openwakeword_builtin".to_string(),
        microphone_level: 0.0,
        detection_confidence: 0.0,
        last_detection_time: None,
        false_trigger_count: 0,
        cpu_warning: None,
        message: Some("No input microphone is available.".to_string()),
      });
      return;
    };

    let Ok((stream_config, sample_format)) = find_best_config(&device, false) else {
      let _ = app.emit("wake_word_status", WakeWordStatus {
        state: WakeWordNativeState::Error,
        engine: "openwakeword_builtin".to_string(),
        microphone_level: 0.0,
        detection_confidence: 0.0,
        last_detection_time: None,
        false_trigger_count: 0,
        cpu_warning: None,
        message: Some("Microphone format is not compatible with wake word detection.".to_string()),
      });
      return;
    };

    let buffer = Arc::new(Mutex::new(Vec::<f32>::new()));
    let buffer_clone = buffer.clone();
    let channels = stream_config.channels as usize;
    let Ok(mut resampler) = make_resampler(stream_config.sample_rate, OWW_MODEL_CHUNK_SIZE as _, channels) else {
      let _ = app.emit("wake_word_status", WakeWordStatus {
        state: WakeWordNativeState::Error,
        engine: "openwakeword_builtin".to_string(),
        microphone_level: 0.0,
        detection_confidence: 0.0,
        last_detection_time: None,
        false_trigger_count: 0,
        cpu_warning: None,
        message: Some("Could not initialize wake word audio resampler.".to_string()),
      });
      return;
    };

    let err_fn = |error| {
      eprintln!("Wake word input stream error: {error}");
    };

    let tx = audio_tx.clone();
    let stream = build_input_stream(
      &device,
      &stream_config,
      sample_format,
      move |data| {
        let chunks = resample_into_chunks(data, &buffer_clone, channels, &mut resampler);
        for chunk in chunks {
          let _ = tx.try_send(chunk.data_f32.first().clone());
        }
      },
      err_fn,
      Some(Duration::from_millis(80)),
    );

    let Ok(stream) = stream else {
      let _ = app.emit("wake_word_status", WakeWordStatus {
        state: WakeWordNativeState::Error,
        engine: "openwakeword_builtin".to_string(),
        microphone_level: 0.0,
        detection_confidence: 0.0,
        last_detection_time: None,
        false_trigger_count: 0,
        cpu_warning: None,
        message: Some("Could not open microphone stream for wake word detection.".to_string()),
      });
      return;
    };

    if stream.play().is_err() {
      let _ = app.emit("wake_word_status", WakeWordStatus {
        state: WakeWordNativeState::Error,
        engine: "openwakeword_builtin".to_string(),
        microphone_level: 0.0,
        detection_confidence: 0.0,
        last_detection_time: None,
        false_trigger_count: 0,
        cpu_warning: None,
        message: Some("Could not start microphone stream for wake word detection.".to_string()),
      });
      return;
    }

    let _ = app.emit("wake_word_status", WakeWordStatus {
      state: WakeWordNativeState::ListeningForWakeWord,
      engine: "openwakeword_builtin".to_string(),
      microphone_level: 0.0,
      detection_confidence: 0.0,
      last_detection_time: None,
      false_trigger_count: 0,
      cpu_warning: None,
      message: Some("Wake Word Active".to_string()),
    });

    loop {
      if stop_rx.try_recv().is_ok() {
        break;
      }
      thread::sleep(Duration::from_millis(100));
    }
  });

  Ok(())
}

fn start_vosk_wake_word(
  app: AppHandle,
  state: tauri::State<'_, WakeWordState>,
  config: WakeWordStartConfig,
) -> Result<(), String> {
  let (model_path, vosk_search_dirs, using_bundled_model) = resolve_vosk_model_path(&app, config.vosk_model_path.as_deref())?;

  let phrases = build_vosk_wake_phrases(&config);
  if phrases.is_empty() {
    return Err("Smart Wake Vosk needs at least one wake word or variant.".to_string());
  }

  {
    let mut runtime = state.lock().map_err(|_| "Wake word state lock failed.".to_string())?;
    if let Some(stop_tx) = runtime.stop_tx.take() {
      let _ = stop_tx.send(());
    }
    runtime.status.state = WakeWordNativeState::Off;
  }

  let (stop_tx, stop_rx) = mpsc::channel::<()>();
  let app_for_status = app.clone();
  let engine = "smart_vosk".to_string();

  {
    let mut runtime = state.lock().map_err(|_| "Wake word state lock failed.".to_string())?;
    runtime.stop_tx = Some(stop_tx);
    runtime.status = WakeWordStatus {
      state: WakeWordNativeState::Initializing,
      engine: engine.clone(),
      microphone_level: 0.0,
      detection_confidence: 0.0,
      last_detection_time: None,
      false_trigger_count: runtime.status.false_trigger_count,
      cpu_warning: None,
      message: Some(if using_bundled_model {
        "Initializing Smart Wake Vosk with bundled model.".to_string()
      } else {
        "Initializing Smart Wake Vosk with custom model.".to_string()
      }),
    };
    emit_status(&app_for_status, &runtime.status);
  }

  thread::spawn(move || {
    if let Err(error) = run_vosk_wake_loop(app.clone(), stop_rx, model_path, vosk_search_dirs, phrases, config.sensitivity) {
      let _ = app.emit("wake_word_status", WakeWordStatus {
        state: WakeWordNativeState::Error,
        engine: "smart_vosk".to_string(),
        microphone_level: 0.0,
        detection_confidence: 0.0,
        last_detection_time: None,
        false_trigger_count: 0,
        cpu_warning: None,
        message: Some(error),
      });
    }
  });

  Ok(())
}

fn run_vosk_wake_loop(
  app: AppHandle,
  stop_rx: mpsc::Receiver<()>,
  model_path: String,
  mut vosk_search_dirs: Vec<PathBuf>,
  phrases: Vec<String>,
  sensitivity: f32,
) -> Result<(), String> {
  let host = cpal::default_host();
  let device = host
    .default_input_device()
    .ok_or_else(|| "No input microphone is available.".to_string())?;
  let supported_config = device
    .default_input_config()
    .map_err(|error| format!("Could not read microphone default config: {error}"))?;
  let sample_format = supported_config.sample_format();
  let stream_config: StreamConfig = supported_config.clone().into();
  let channels = stream_config.channels as usize;
  let sample_rate = stream_config.sample_rate as f32;

  let model_dir = Path::new(&model_path);
  vosk_search_dirs.push(model_dir.to_path_buf());
  if let Some(parent) = model_dir.parent() {
    vosk_search_dirs.push(parent.to_path_buf());
  }
  vosk_search_dirs.push(PathBuf::from("."));

  let api = VoskApi::load(&vosk_search_dirs)?;
  let model_path_c = CString::new(model_path)
    .map_err(|_| "Vosk model path contains an invalid null byte.".to_string())?;
  let model = unsafe { (api.model_new)(model_path_c.as_ptr()) };
  if model.is_null() {
    return Err("Could not load Vosk model. Check the model folder path.".to_string());
  }

  let mut grammar = phrases.clone();
  grammar.push("[unk]".to_string());
  let grammar_json = format!(
    "[{}]",
    grammar
      .iter()
      .map(|phrase| format!("\"{}\"", phrase.replace('"', "")))
      .collect::<Vec<_>>()
      .join(", ")
  );
  let grammar_c = CString::new(grammar_json)
    .map_err(|_| "Vosk grammar contains an invalid null byte.".to_string())?;
  let recognizer_ptr = unsafe { (api.recognizer_new_grm)(model, sample_rate, grammar_c.as_ptr()) };
  if recognizer_ptr.is_null() {
    unsafe { (api.model_free)(model) };
    return Err("Could not create Vosk grammar recognizer for Smart Wake.".to_string());
  }
  unsafe {
    (api.recognizer_set_max_alternatives)(recognizer_ptr, 1);
    (api.recognizer_set_words)(recognizer_ptr, 0);
    (api.recognizer_set_partial_words)(recognizer_ptr, 0);
  }
  let model_handle = VoskModelHandle(model);
  let recognizer_handle = VoskRecognizerHandle(recognizer_ptr);
  let recognizer = Arc::new(Mutex::new(recognizer_handle));
  let detected = Arc::new(AtomicBool::new(false));
  let last_status_emit = Arc::new(Mutex::new(Instant::now()));
  let detection_memory = Arc::new(Mutex::new(VoskDetectionMemory::default()));

  let _ = app.emit("wake_word_status", WakeWordStatus {
    state: WakeWordNativeState::ListeningForWakeWord,
    engine: "smart_vosk".to_string(),
    microphone_level: 0.0,
    detection_confidence: 0.0,
    last_detection_time: None,
    false_trigger_count: 0,
    cpu_warning: None,
    message: Some("Smart Wake Vosk Active".to_string()),
  });

  let err_fn = |error| {
    eprintln!("Smart Wake Vosk input stream error: {error}");
  };

  let stream = match sample_format {
    SampleFormat::I8 => {
      let callback = make_vosk_callback::<i8>(app.clone(), api.clone(), recognizer.clone(), detected.clone(), last_status_emit.clone(), detection_memory.clone(), phrases.clone(), channels, sensitivity);
      device.build_input_stream(&stream_config, callback, err_fn, Some(Duration::from_millis(80)))
    }
    SampleFormat::I16 => {
      let callback = make_vosk_callback::<i16>(app.clone(), api.clone(), recognizer.clone(), detected.clone(), last_status_emit.clone(), detection_memory.clone(), phrases.clone(), channels, sensitivity);
      device.build_input_stream(&stream_config, callback, err_fn, Some(Duration::from_millis(80)))
    }
    SampleFormat::I32 => {
      let callback = make_vosk_callback::<i32>(app.clone(), api.clone(), recognizer.clone(), detected.clone(), last_status_emit.clone(), detection_memory.clone(), phrases.clone(), channels, sensitivity);
      device.build_input_stream(&stream_config, callback, err_fn, Some(Duration::from_millis(80)))
    }
    SampleFormat::U8 => {
      let callback = make_vosk_callback::<u8>(app.clone(), api.clone(), recognizer.clone(), detected.clone(), last_status_emit.clone(), detection_memory.clone(), phrases.clone(), channels, sensitivity);
      device.build_input_stream(&stream_config, callback, err_fn, Some(Duration::from_millis(80)))
    }
    SampleFormat::U16 => {
      let callback = make_vosk_callback::<u16>(app.clone(), api.clone(), recognizer.clone(), detected.clone(), last_status_emit.clone(), detection_memory.clone(), phrases.clone(), channels, sensitivity);
      device.build_input_stream(&stream_config, callback, err_fn, Some(Duration::from_millis(80)))
    }
    SampleFormat::U32 => {
      let callback = make_vosk_callback::<u32>(app.clone(), api.clone(), recognizer.clone(), detected.clone(), last_status_emit.clone(), detection_memory.clone(), phrases.clone(), channels, sensitivity);
      device.build_input_stream(&stream_config, callback, err_fn, Some(Duration::from_millis(80)))
    }
    SampleFormat::F32 => {
      let callback = make_vosk_callback::<f32>(app.clone(), api.clone(), recognizer.clone(), detected.clone(), last_status_emit.clone(), detection_memory.clone(), phrases.clone(), channels, sensitivity);
      device.build_input_stream(&stream_config, callback, err_fn, Some(Duration::from_millis(80)))
    }
    SampleFormat::F64 => {
      let callback = make_vosk_callback::<f64>(app.clone(), api.clone(), recognizer.clone(), detected.clone(), last_status_emit.clone(), detection_memory.clone(), phrases.clone(), channels, sensitivity);
      device.build_input_stream(&stream_config, callback, err_fn, Some(Duration::from_millis(80)))
    }
    sample_format => {
      return Err(format!("Unsupported microphone sample format for Smart Wake Vosk: {sample_format:?}"));
    }
  }
  .map_err(|error| format!("Could not open microphone stream for Smart Wake Vosk: {error}"))?;

  stream
    .play()
    .map_err(|error| format!("Could not start microphone stream for Smart Wake Vosk: {error}"))?;

  loop {
    if stop_rx.try_recv().is_ok() || detected.load(Ordering::SeqCst) {
      break;
    }
    thread::sleep(Duration::from_millis(100));
  }

  drop(stream);
  unsafe {
    (api.recognizer_free)(recognizer_handle.0);
    (api.model_free)(model_handle.0);
  }

  Ok(())
}

fn make_vosk_callback<T>(
  app: AppHandle,
  api: Arc<VoskApi>,
  recognizer: Arc<Mutex<VoskRecognizerHandle>>,
  detected: Arc<AtomicBool>,
  last_status_emit: Arc<Mutex<Instant>>,
  detection_memory: Arc<Mutex<VoskDetectionMemory>>,
  phrases: Vec<String>,
  channels: usize,
  sensitivity: f32,
) -> impl Fn(&[T], &cpal::InputCallbackInfo) + Send + 'static
where
  T: VoskSample,
{
  move |data, _| {
    if detected.load(Ordering::SeqCst) {
      return;
    }

    let samples = samples_to_mono_i16(data, channels);
    if samples.is_empty() {
      return;
    }

    let rms = rms_i16(&samples);
    let Ok(recognizer) = recognizer.lock() else {
      return;
    };

    let state = unsafe {
      (api.recognizer_accept_waveform_s)(
        recognizer.0,
        samples.as_ptr(),
        samples.len().min(c_int::MAX as usize) as c_int,
      )
    };
    let (transcript, confidence, is_final) = match state {
      1 => {
        let result_json = api.c_string_result(unsafe { (api.recognizer_result)(recognizer.0) });
        let (text, confidence) = extract_vosk_final_text_confidence(&result_json);
        unsafe { (api.recognizer_reset)(recognizer.0) };
        (text, confidence, true)
      }
      0 => (
        extract_vosk_text(&api.c_string_result(unsafe { (api.recognizer_partial_result)(recognizer.0) }), "partial"),
        None,
        false,
      ),
      _ => (String::new(), None, false),
    };

    let decision = evaluate_vosk_detection(
      &transcript,
      confidence,
      is_final,
      &phrases,
      sensitivity,
      &detection_memory,
    );

    emit_vosk_debug(
      &app,
      if is_final { None } else { Some(transcript.clone()) },
      if is_final { Some(transcript.clone()) } else { None },
      decision.matched_variant.clone(),
      confidence.unwrap_or(0.0),
      decision.trigger_reason.clone(),
      decision.ignored_reason.clone(),
    );

    if let Some(matched) = decision.should_trigger.then_some(decision.matched_variant.unwrap_or_default()) {
      if detected
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_ok()
      {
        let detected_at = chrono_like_now();
        let confidence = confidence.unwrap_or_else(|| sensitivity.clamp(0.0, 1.0));
        let _ = app.emit("wake_word_detected", WakeWordDetectedPayload {
          engine: "smart_vosk".to_string(),
          keyword: matched,
          confidence,
          detected_at: detected_at.clone(),
        });
        let _ = app.emit("wake_word_status", WakeWordStatus {
          state: WakeWordNativeState::WakeDetected,
          engine: "smart_vosk".to_string(),
          microphone_level: rms,
          detection_confidence: confidence,
          last_detection_time: Some(detected_at),
          false_trigger_count: 0,
          cpu_warning: None,
          message: Some("Smart Wake word detected.".to_string()),
        });
      }
      return;
    }

    if let Ok(mut last_emit) = last_status_emit.lock() {
      if last_emit.elapsed() > Duration::from_millis(650) {
        let _ = app.emit("wake_word_status", WakeWordStatus {
          state: WakeWordNativeState::ListeningForWakeWord,
          engine: "smart_vosk".to_string(),
          microphone_level: rms,
          detection_confidence: confidence.unwrap_or(0.0),
          last_detection_time: None,
          false_trigger_count: 0,
          cpu_warning: None,
          message: Some("Smart Wake Vosk Active".to_string()),
        });
        *last_emit = Instant::now();
      }
    }
  }
}

trait VoskSample: Copy + Send + 'static {
  fn to_i16(self) -> i16;
}

impl VoskSample for i8 {
  fn to_i16(self) -> i16 {
    (self as i16) << 8
  }
}

impl VoskSample for i16 {
  fn to_i16(self) -> i16 {
    self
  }
}

impl VoskSample for i32 {
  fn to_i16(self) -> i16 {
    (self >> 16).clamp(i16::MIN as i32, i16::MAX as i32) as i16
  }
}

impl VoskSample for u8 {
  fn to_i16(self) -> i16 {
    ((self as i16) - 128) << 8
  }
}

impl VoskSample for u16 {
  fn to_i16(self) -> i16 {
    (self as i32 - 32768).clamp(i16::MIN as i32, i16::MAX as i32) as i16
  }
}

impl VoskSample for u32 {
  fn to_i16(self) -> i16 {
    ((self as i64 - 2_147_483_648) >> 16).clamp(i16::MIN as i64, i16::MAX as i64) as i16
  }
}

impl VoskSample for f32 {
  fn to_i16(self) -> i16 {
    (self.clamp(-1.0, 1.0) * i16::MAX as f32) as i16
  }
}

impl VoskSample for f64 {
  fn to_i16(self) -> i16 {
    (self.clamp(-1.0, 1.0) * i16::MAX as f64) as i16
  }
}

fn samples_to_mono_i16<T: VoskSample>(data: &[T], channels: usize) -> Vec<i16> {
  if channels <= 1 {
    return data.iter().map(|sample| sample.to_i16()).collect();
  }

  data
    .chunks_exact(channels)
    .map(|frame| {
      let sum: i32 = frame.iter().map(|sample| sample.to_i16() as i32).sum();
      (sum / channels as i32).clamp(i16::MIN as i32, i16::MAX as i32) as i16
    })
    .collect()
}

fn rms_i16(samples: &[i16]) -> f32 {
  let sum = samples
    .iter()
    .map(|sample| {
      let normalized = *sample as f32 / i16::MAX as f32;
      normalized * normalized
    })
    .sum::<f32>();
  (sum / samples.len().max(1) as f32).sqrt()
}

struct VoskDetectionDecision {
  should_trigger: bool,
  matched_variant: Option<String>,
  trigger_reason: Option<String>,
  ignored_reason: Option<String>,
}

fn evaluate_vosk_detection(
  transcript: &str,
  confidence: Option<f32>,
  is_final: bool,
  phrases: &[String],
  sensitivity: f32,
  memory: &Arc<Mutex<VoskDetectionMemory>>,
) -> VoskDetectionDecision {
  let normalized = normalize_vosk_phrase(transcript);
  if normalized.is_empty() {
    reset_partial_memory(memory);
    return ignored("empty transcript");
  }

  let min_variant_len = phrases
    .iter()
    .map(|phrase| phrase.replace(' ', "").len())
    .min()
    .unwrap_or(3);
  if normalized.replace(' ', "").len() < min_variant_len {
    reset_partial_memory(memory);
    return ignored("transcript shorter than wake variant");
  }

  let Some(matched) = detect_vosk_phrase(&normalized, phrases) else {
    reset_partial_memory(memory);
    return ignored("transcript did not match wake variants");
  };

  if is_final {
    if let Some(confidence) = confidence {
      let min_confidence = min_vosk_confidence(sensitivity);
      if confidence < min_confidence {
        reset_partial_memory(memory);
        return VoskDetectionDecision {
          should_trigger: false,
          matched_variant: Some(matched),
          trigger_reason: None,
          ignored_reason: Some(format!("confidence {confidence:.2} below {min_confidence:.2}")),
        };
      }
      reset_partial_memory(memory);
      return VoskDetectionDecision {
        should_trigger: true,
        matched_variant: Some(matched),
        trigger_reason: Some(format!("final transcript confidence {confidence:.2}")),
        ignored_reason: None,
      };
    }

    reset_partial_memory(memory);
    return VoskDetectionDecision {
      should_trigger: true,
      matched_variant: Some(matched),
      trigger_reason: Some("final transcript matched wake variant".to_string()),
      ignored_reason: None,
    };
  }

  let Ok(mut memory) = memory.lock() else {
    return ignored("detection memory unavailable");
  };
  if memory.last_partial_match.as_deref() == Some(matched.as_str()) {
    memory.partial_match_count = memory.partial_match_count.saturating_add(1);
  } else {
    memory.last_partial_match = Some(matched.clone());
    memory.partial_match_count = 1;
  }

  if memory.partial_match_count >= 2 {
    memory.partial_match_count = 0;
    memory.last_partial_match = None;
    VoskDetectionDecision {
      should_trigger: true,
      matched_variant: Some(matched),
      trigger_reason: Some("stable partial transcript matched twice".to_string()),
      ignored_reason: None,
    }
  } else {
    VoskDetectionDecision {
      should_trigger: false,
      matched_variant: Some(matched),
      trigger_reason: None,
      ignored_reason: Some("waiting for stable second partial match".to_string()),
    }
  }
}

fn ignored(reason: &str) -> VoskDetectionDecision {
  VoskDetectionDecision {
    should_trigger: false,
    matched_variant: None,
    trigger_reason: None,
    ignored_reason: Some(reason.to_string()),
  }
}

fn reset_partial_memory(memory: &Arc<Mutex<VoskDetectionMemory>>) {
  if let Ok(mut memory) = memory.lock() {
    memory.last_partial_match = None;
    memory.partial_match_count = 0;
  }
}

fn min_vosk_confidence(sensitivity: f32) -> f32 {
  (0.52 + sensitivity.clamp(0.0, 1.0) * 0.28).clamp(0.55, 0.82)
}

fn emit_vosk_debug(
  app: &AppHandle,
  partial: Option<String>,
  final_text: Option<String>,
  matched_variant: Option<String>,
  confidence: f32,
  trigger_reason: Option<String>,
  ignored_reason: Option<String>,
) {
  let _ = app.emit("wake_word_debug", WakeWordDebugPayload {
    engine: "smart_vosk".to_string(),
    last_partial_transcript: partial,
    last_final_transcript: final_text,
    matched_variant,
    detection_confidence: confidence,
    trigger_reason,
    ignored_reason,
  });
}

fn build_vosk_wake_phrases(config: &WakeWordStartConfig) -> Vec<String> {
  let mut phrases = vec![config.keyword.clone()];
  if let Some(variants) = &config.variants {
    phrases.extend(variants.iter().cloned());
  }

  phrases
    .into_iter()
    .map(|phrase| normalize_vosk_phrase(&phrase))
    .filter(|phrase| !phrase.is_empty())
    .fold(Vec::<String>::new(), |mut acc, phrase| {
      if !acc.iter().any(|item| item == &phrase) {
        acc.push(phrase);
      }
      acc
    })
}

fn detect_vosk_phrase(transcript: &str, phrases: &[String]) -> Option<String> {
  let normalized = normalize_vosk_phrase(transcript);
  if normalized.is_empty() || normalized == "unk" {
    return None;
  }

  phrases.iter().find_map(|phrase| {
    let exact_or_word_match = normalized == *phrase
      || normalized.starts_with(&format!("{phrase} "))
      || normalized.ends_with(&format!(" {phrase}"))
      || normalized.contains(&format!(" {phrase} "));

    if exact_or_word_match {
      Some(phrase.clone())
    } else {
      None
    }
  })
}

fn extract_vosk_text(json: &str, key: &str) -> String {
  serde_json::from_str::<Value>(json)
    .ok()
    .and_then(|value| value.get(key).and_then(Value::as_str).map(str::to_string))
    .unwrap_or_default()
}

fn extract_vosk_final_text_confidence(json: &str) -> (String, Option<f32>) {
  let Ok(value) = serde_json::from_str::<Value>(json) else {
    return (String::new(), None);
  };

  if let Some(alternative) = value
    .get("alternatives")
    .and_then(Value::as_array)
    .and_then(|items| items.first())
  {
    return (
      alternative
        .get("text")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string(),
      alternative
        .get("confidence")
        .and_then(Value::as_f64)
        .map(|confidence| confidence as f32),
    );
  }

  (
    value
      .get("text")
      .and_then(Value::as_str)
      .unwrap_or_default()
      .to_string(),
    value
      .get("confidence")
      .and_then(Value::as_f64)
      .map(|confidence| confidence as f32),
  )
}

fn normalize_vosk_phrase(phrase: &str) -> String {
  phrase
    .to_lowercase()
    .chars()
    .map(|ch| if ch.is_alphanumeric() || ch.is_whitespace() { ch } else { ' ' })
    .collect::<String>()
    .split_whitespace()
    .collect::<Vec<_>>()
    .join(" ")
}

fn chrono_like_now() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  let millis = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis())
    .unwrap_or_default();
  millis.to_string()
}
