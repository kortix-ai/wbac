#!/bin/bash

# Start the server and UI
echo "Starting Stagehand server..."
npm run dev &
SERVER_PID=$!

echo "Starting Streamlit UI..."
streamlit run streamlit_ui.py

# Cleanup on exit
trap "kill $SERVER_PID" EXIT