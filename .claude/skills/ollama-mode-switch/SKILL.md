---
name: ollama-mode-switch
description: >
  Use this skill whenever the user wants to switch Claude Code between local Ollama models
  and the online Anthropic API. Triggers on phrases like: "switch to local", "use local model",
  "switch to online", "use Anthropic API", "turn on Ollama mode", "turn off Ollama mode",
  "use qwen locally", "go back to Claude API", "toggle local/online", "enable local mode",
  "disable local mode", or any mention of switching AI backends for Claude Code.
  Also trigger when the user asks which mode they're currently in, or wants to verify their setup.
---

# Ollama Mode Switch Skill

This skill helps the user toggle Claude Code between two backends:
- **LOCAL mode**: Routes Claude Code to a local Ollama instance (no API costs, private, offline-capable)
- **ONLINE mode**: Routes Claude Code to Anthropic's API (default behavior, uses real Claude models)

## User's Setup

- **OS**: Windows (use PowerShell syntax unless told otherwise)
- **Ollama version**: 0.23.0
- **Local models installed**: `qwen3-coder:latest`, `qwen3.6:latest`
- **Recommended coding model**: `qwen3-coder:latest`
- **Local Ollama endpoint**: `http://localhost:11434`

---

## How It Works

Claude Code respects two environment variables:
- `ANTHROPIC_BASE_URL` — where to send API requests (defaults to Anthropic's servers)
- `ANTHROPIC_AUTH_TOKEN` — the API key (Ollama doesn't validate this, but it must be set)
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` — stops telemetry/update pings (optional, for privacy)

Setting these redirects all Claude Code traffic to Ollama. Unsetting them sends it back to Anthropic.

---

## Switching to LOCAL Mode (Ollama)

### PowerShell (session only — resets when you close the terminal)
```powershell
$env:ANTHROPIC_BASE_URL = "http://localhost:11434"
$env:ANTHROPIC_AUTH_TOKEN = "ollama"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
```

Then launch Claude Code with your preferred model:
```powershell
claude --model qwen3-coder:latest
```

### PowerShell (permanent — survives terminal restarts)
```powershell
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "http://localhost:11434", "User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "ollama", "User")
[System.Environment]::SetEnvironmentVariable("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1", "User")
```
> Restart your terminal after running this for changes to take effect.

### Verify Ollama is running first
```powershell
ollama list
```
If you get a connection error, start Ollama manually:
```powershell
ollama serve
```

---

## Switching to ONLINE Mode (Anthropic API)

### PowerShell (session only)
```powershell
Remove-Item Env:\ANTHROPIC_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:\CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC -ErrorAction SilentlyContinue
```

Then launch Claude Code normally (it will use your saved Anthropic API key):
```powershell
claude
```

### PowerShell (permanent)
```powershell
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", $null, "User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", $null, "User")
[System.Environment]::SetEnvironmentVariable("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", $null, "User")
```
> Restart your terminal after running this.

---

## Check Current Mode

Run this to see which mode you're in:
```powershell
echo $env:ANTHROPIC_BASE_URL
```
- Returns `http://localhost:11434` → you're in **LOCAL mode**
- Returns nothing → you're in **ONLINE mode** (using Anthropic API)

---

## Model Reference

| Model | Use case | Speed |
|---|---|---|
| `qwen3-coder:latest` | Coding tasks, file edits, debugging | Medium |
| `qwen3.6:latest` | General reasoning, chat, planning | Medium |

Switch models mid-session by restarting Claude Code with `--model <model-name>`.

---

## Troubleshooting

**Claude Code isn't reading/writing files in local mode**
- This is a known issue with some Ollama versions. Make sure Ollama is >= 0.14.0 (yours is 0.23.0, so you're fine).
- If it still happens, check permissions inside Claude Code: type `/permissions` and ensure Bash and file access are set to Allow.

**Model not found error**
- Run `ollama list` to see exact model names installed.
- Use the exact string shown (e.g., `qwen3-coder:latest`).

**Slow responses in local mode**
- Expected on CPU. GPU acceleration is much faster if available.
- For lighter tasks, `qwen3.6:latest` may respond faster.

**Context window issues / thinking loops**
- Ollama defaults to a small context window. If Claude Code gets stuck, restart Ollama with:
  ```powershell
  $env:OLLAMA_NUM_CTX = "20000"
  ollama serve
  ```

---

## Response Format

When the user asks to switch modes, always:
1. State which mode they're switching to and what that means
2. Give them the copy-paste PowerShell commands (session-only first, permanent as an option)
3. Tell them how to launch Claude Code after
4. Remind them to check `ollama list` / `ollama serve` if switching to local