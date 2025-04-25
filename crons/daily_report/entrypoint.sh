#!/bin/bash
# daily_reports.sh

# Config
DAILY_REPORTS_DIR="/tnt-rwanda/crons/daily_report"
# DAILY_REPORTS_DIR="/Users/leogaudin/Downloads/daily_report"
VENV_PATH="$DAILY_REPORTS_DIR/.venv"
PYTHON_SCRIPT="$DAILY_REPORTS_DIR/script.py"
STDOUT_LOG="$DAILY_REPORTS_DIR/stdout.log"
STDERR_LOG="$DAILY_REPORTS_DIR/stderr.log"

# Exit immediately if a command exits with a non-zero status
set -e

if [ ! -d "$DAILY_REPORTS_DIR" ]; then
  echo "$(date) - ERROR: Daily reports directory not found at $DAILY_REPORTS_DIR" >> "$STDERR_LOG"
  exit 1
fi

if [ ! -d "$VENV_PATH" ]; then
  echo "$(date) - INFO: Creating virtual environment at $VENV_PATH" >> "$STDOUT_LOG"
  python3 -m venv "$VENV_PATH" >> "$STDOUT_LOG" 2>> "$STDERR_LOG"
  if [ $? -ne 0 ]; then
    echo "$(date) - ERROR: Failed to create virtual environment" >> "$STDERR_LOG"
    exit 1
  fi
else
  echo "$(date) - INFO: Using existing virtual environment at $VENV_PATH" >> "$STDOUT_LOG"
fi

source "$VENV_PATH/bin/activate"

pip install --quiet --no-cache-dir -r "$DAILY_REPORTS_DIR/requirements.txt"
if [ $? -ne 0 ]; then
  echo "$(date) - ERROR: Failed to install requirements" >> "$STDERR_LOG"
  exit 1
fi

if [ ! -f "$PYTHON_SCRIPT" ]; then
  echo "$(date) - ERROR: Python script not found at $PYTHON_SCRIPT" >> "$STDERR_LOG"
  exit 1
fi

cd "$DAILY_REPORTS_DIR"

python3 "$PYTHON_SCRIPT" >> "$STDOUT_LOG" 2>> "$STDERR_LOG"
