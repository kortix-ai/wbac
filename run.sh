#!/bin/bash

# Start the server and UI
echo "Starting Stagehand server..."
nodemon index.js &
SERVER_PID=$!

echo "Starting Streamlit UI..."
streamlit run streamlit_ui.py

# Cleanup on exit
trap "kill $SERVER_PID" EXIT