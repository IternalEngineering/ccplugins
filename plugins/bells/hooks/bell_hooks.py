#!/usr/bin/env python3
"""
Bell Notification Hook for Claude Code
This hook plays a bell sound when todos are marked as completed.
"""

import json
import os
import subprocess
import sys


def play_bell_sound():
    """Play a bell notification sound."""
    try:
        # Try to play system bell sound on macOS
        if sys.platform == "darwin":
            # Use afplay to play the system beep sound
            subprocess.run(
                ["afplay", "/System/Library/Sounds/Glass.aiff"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=2
            )
    except Exception:
        pass

    # Always output terminal bell as fallback/additional notification
    print("\a", end="", flush=True)


def has_completed_todos(tool_input):
    """Check if TodoWrite input contains any completed todos."""
    if not tool_input:
        return False

    todos = tool_input.get("todos", [])
    if not todos:
        return False

    # Check if any todo has status "completed"
    return any(todo.get("status") == "completed" for todo in todos)


def main():
    """Main hook function."""
    # Check if bell notifications are enabled
    bell_enabled = os.environ.get("ENABLE_BELL_NOTIFICATION", "1")

    if bell_enabled == "0":
        sys.exit(0)

    # Read input from stdin (required for hook protocol)
    try:
        raw_input = sys.stdin.read()
        input_data = json.loads(raw_input)
    except (json.JSONDecodeError, Exception):
        # If we can't parse input, still allow tool to proceed
        sys.exit(0)

    # Extract tool information
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Only trigger bell for TodoWrite when todos are marked completed
    if tool_name == "TodoWrite" and has_completed_todos(tool_input):
        play_bell_sound()

    # Always allow tool to proceed (exit code 0)
    sys.exit(0)


if __name__ == "__main__":
    main()
