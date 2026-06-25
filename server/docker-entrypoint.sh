#!/bin/sh
# Starts a virtual display for Playwright's headed Chromium (used by the
# Naukri anti-bot-detection flow), then execs into node so it becomes PID 1
# and receives SIGTERM/SIGINT directly for the graceful-shutdown logic in
# server.js. (xvfb-run was tried first but never exec's the wrapped command
# and doesn't reliably forward signals to it — exec here avoids both issues.)
set -e

Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp &
export DISPLAY=:99

# Brief wait for the X socket to come up rather than a fixed sleep guess.
for i in $(seq 1 20); do
  [ -e /tmp/.X11-unix/X99 ] && break
  sleep 0.25
done

exec node server.js
