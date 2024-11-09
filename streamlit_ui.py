import streamlit as st
import requests
import json
from PIL import Image
from io import BytesIO
from datetime import datetime

API_URL = "http://localhost:3000/api"

def create_session():
    response = requests.post(f"{API_URL}/sessions/create-session")
    return response.json()

def stop_session(session_id):
    response = requests.post(f"{API_URL}/sessions/stop-session/{session_id}")
    return response.json()

def navigate(session_id, url):
    response = requests.post(f"{API_URL}/browser/navigate/{session_id}", json={"url": url})
    return response.json()

def perform_action(session_id, action, use_vision=False, model_name=None, include_logs=False, log_filters=None):
    response = requests.post(f"{API_URL}/browser/act/{session_id}", json={
        "action": action,
        "useVision": use_vision,
        "modelName": model_name,
        "includeLogs": include_logs,
        "logFilters": log_filters
    })
    return response.json()

def extract_data(session_id, instruction, schema, model_name=None):
    response = requests.post(f"{API_URL}/browser/extract/{session_id}", json={
        "instruction": instruction,
        "schema": schema,
        "modelName": model_name
    })
    return response.json()

def observe_page(session_id, instruction=None, use_vision=False, model_name=None):
    response = requests.post(f"{API_URL}/browser/observe/{session_id}", json={
        "instruction": instruction,
        "useVision": use_vision,
        "modelName": model_name
    })
    return response.json()

def get_screenshot(session_id):
    response = requests.post(f"{API_URL}/browser/screenshot/{session_id}")
    if response.status_code == 200:
        return Image.open(BytesIO(response.content))
    return None

def get_dom_state(session_id):
    response = requests.get(f"{API_URL}/browser/dom-state/{session_id}")
    return response.json()

def get_console_logs(session_id, filters=None):
    params = {}
    if filters:
        params.update({
            'includeErrors': str(filters.get('includeErrors', True)).lower(),
            'includeWarnings': str(filters.get('includeWarnings', False)).lower(),
            'includeInfo': str(filters.get('includeInfo', False)).lower(),
            'includeTrace': str(filters.get('includeTrace', False)).lower(),
            'truncateLength': str(filters.get('truncateLength', 0))
        })
        
        if filters.get('includeStringFilters'):
            params['includeStringFilters'] = filters['includeStringFilters']
        if filters.get('excludeStringFilters'):
            params['excludeStringFilters'] = filters['excludeStringFilters']
            
        if filters.get('startTime'):
            params['startTime'] = filters['startTime']
        if filters.get('endTime'):
            params['endTime'] = filters['endTime']
    
    response = requests.get(f"{API_URL}/browser/console-logs/{session_id}", params=params)
    return response.json()

def get_network_logs(session_id, filters=None):
    params = {}
    if filters:
        params.update({
            'includeInfo': str(filters.get('statusCodes', {}).get('info', False)).lower(),
            'includeSuccess': str(filters.get('statusCodes', {}).get('success', False)).lower(),
            'includeRedirect': str(filters.get('statusCodes', {}).get('redirect', False)).lower(),
            'includeClientError': str(filters.get('statusCodes', {}).get('clientError', True)).lower(),
            'includeServerError': str(filters.get('statusCodes', {}).get('serverError', True)).lower(),
            'includeHeaders': str(filters.get('includeHeaders', False)).lower(),
            'includeBody': str(filters.get('includeBody', False)).lower(),
            'includeQueryParams': str(filters.get('includeQueryParams', False)).lower(),
            'truncateLength': str(filters.get('truncateLength', 500))
        })
        
        if filters.get('includeStringFilters'):
            params['includeStringFilters'] = filters['includeStringFilters']
        if filters.get('excludeStringFilters'):
            params['excludeStringFilters'] = filters['excludeStringFilters']
            
        if filters.get('startTime'):
            params['startTime'] = filters['startTime']
        if filters.get('endTime'):
            params['endTime'] = filters['endTime']
    
    response = requests.get(f"{API_URL}/browser/network-logs/{session_id}", params=params)
    return response.json()

def clear_logs(session_id):
    response = requests.post(f"{API_URL}/browser/clear-logs/{session_id}")
    return response.json()



def get_running_sessions():
    response = requests.get(f"{API_URL}/sessions/running-sessions")
    return response.json()

def get_session_details(session_id):
    response = requests.get(f"{API_URL}/sessions/session/{session_id}")
    return response.json()

def main():
    st.title("Web Browser AI-Control API Server")
    
    # Session Management
    if 'session_id' not in st.session_state:
        st.session_state.session_id = None
    
    # Sidebar for session management and configuration
    st.sidebar.subheader("Session Management")
    
    # Session creation/resumption options
    session_mode = st.sidebar.radio(
        "Session Mode",
        ["Create New Session", "Resume Existing Session"]
    )
    
    if session_mode == "Resume Existing Session":
        # Add this section to show running sessions
        try:
            running_sessions = get_running_sessions()
            if running_sessions.get('success') and running_sessions.get('sessions'):
                st.sidebar.subheader("Running Sessions")
                sessions = running_sessions['sessions']
                
                # Create a formatted selection for each session
                session_options = {
                    f"Session {s['id']} ({s['region']})": s['id'] 
                    for s in sessions
                }
                
                selected_session = st.sidebar.selectbox(
                    "Select Running Session",
                    options=list(session_options.keys()),
                    help="Select an existing running session"
                )
                
                if selected_session:
                    manual_session_id = session_options[selected_session]
            
        except Exception as e:
            st.sidebar.error(f"Error fetching running sessions: {str(e)}")
        
        # Keep the manual input as fallback
        manual_session_id = st.sidebar.text_input(
            "Or Enter Session ID Manually",
            value=manual_session_id if 'manual_session_id' in locals() else "",
            help="Enter an existing Browserbase session ID"
        )
        
        if st.sidebar.button("Resume Session"):
            try:
                st.session_state.session_id = manual_session_id
                st.sidebar.success(f"Resumed session: {manual_session_id}")
                
                # Display Browserbase session URL
                browserbase_url = f"https://www.browserbase.com/sessions/{manual_session_id}"
                st.sidebar.markdown("### Session URLs")
                st.sidebar.markdown(f"💻 [Browserbase Session]({browserbase_url})")
                
                
                st.rerun()
            except Exception as e:
                st.sidebar.error(f"Error resuming session: {str(e)}")
    else:
        if not st.session_state.session_id and st.sidebar.button("Create New Session"):
            try:
                result = create_session()
                if result.get('success'):
                    st.session_state.session_id = result['sessionId']
                    st.sidebar.success("Session created successfully")
                    
                    # Display Browserbase session URL
                    browserbase_url = f"https://www.browserbase.com/sessions/{result['sessionId']}"
                    st.sidebar.markdown("### Session URLs")
                    st.sidebar.markdown(f"💻 [Browserbase Session]({browserbase_url})")
                    
                    
                    st.rerun()
                else:
                    st.sidebar.error("Failed to create session")
            except Exception as e:
                st.sidebar.error(f"Error creating session: {str(e)}")
    
    # Display selected session info
    if st.session_state.session_id:
        st.sidebar.success(f"Selected Session: {st.session_state.session_id}")
        
        # Add session details
        try:
            session_details = get_session_details(st.session_state.session_id)
            if session_details.get('success'):
                session = session_details['session']
                st.sidebar.markdown("### Session Details")
                st.sidebar.markdown(f"""
                    - **Status**: {session.get('status')}
                    - **Region**: {session.get('region')}
                    - **Created**: {session.get('createdAt')}
                    - **Last Updated**: {session.get('updatedAt')}
                """)
        except Exception as e:
            st.sidebar.error(f"Error fetching session details: {str(e)}")
        
        # Display Browserbase and debug URLs in sidebar
        browserbase_url = f"https://www.browserbase.com/sessions/{st.session_state.session_id}"
        st.sidebar.markdown("### Session URLs")
        st.sidebar.markdown(f"💻 [Browserbase Session]({browserbase_url})")
        
        if st.sidebar.button("Stop Session"):
            try:
                # Always call the stop session API regardless of session mode
                result = stop_session(st.session_state.session_id)
                if result.get('success'):
                    st.session_state.session_id = None
                    st.sidebar.success("Session stopped successfully")
                    st.rerun()
                else:
                    st.sidebar.error("Failed to stop session")
            except Exception as e:
                st.sidebar.error(f"Error stopping session: {str(e)}")
                # Log the full error for debugging
                print(f"Session stop error: {str(e)}")
    
    # Model selection
    st.sidebar.subheader("Model Configuration")
    model_options = [
        "claude-3-5-sonnet-latest",
        "claude-3-5-sonnet-20240620",
        "claude-3-5-sonnet-20241022",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4o-2024-08-06",
    ]
    selected_model = st.sidebar.selectbox("Select Model", model_options)
    
    # Main content area - only show if we have an active session
    if not st.session_state.session_id:
        st.warning("Please select or create a browser session.")
        return
    
    # Navigation section
    st.subheader("Navigation")
    url = st.text_input("Enter URL")
    if st.button("Navigate"):
        with st.spinner("Navigating..."):
            result = navigate(st.session_state.session_id, url)
            if result.get("success"):
                st.success("Navigation successful!")
            else:
                st.error(f"Navigation failed: {result.get('error', 'Unknown error')}")
    
    # Enhanced Action section
    st.subheader("Perform Action")
    
    action = st.text_input("Enter action to perform")
    col1, col2 = st.columns(2)
    with col1:
        use_vision = st.checkbox("Use Vision", key="action_use_vision")
    with col2:
        include_logs = st.checkbox("Include Action Logs", 
            help="Include logs generated during the action execution",
            key="action_include_logs"
        )
    
    # Add log filters when including logs
    log_filters = None
    if include_logs:
        with st.expander("Log Filters", expanded=True):
            st.subheader("Console Log Filters")
            col1, col2 = st.columns(2)
            with col1:
                console_truncate_length = st.number_input(
                    "Console Truncate Length", 
                    value=500,
                    step=100,
                    help="Maximum length of console messages before truncation",
                    key="action_console_truncate_length"
                )
                console_include_errors = st.checkbox("Include Errors", value=True, key="action_console_include_errors")
                console_include_warnings = st.checkbox("Include Warnings", key="action_console_include_warnings")
                console_include_info = st.checkbox("Include Info", key="action_console_include_info")
                console_include_trace = st.checkbox("Include Trace", key="action_console_include_trace")
            
            with col2:
                console_include_string_filters = st.text_area(
                    "Include Strings (one per line)", 
                    help="Enter strings to include in results. Logs matching any string will be shown.",
                    key="action_console_include_string_filters"
                )
                
                console_exclude_string_filters = st.text_area(
                    "Exclude Strings (one per line)",
                    help="Enter strings to exclude from results. Logs matching any string will be hidden.",
                    key="action_console_exclude_string_filters"
                )

            st.subheader("Network Log Filters")
            col1, col2 = st.columns(2)
            with col1:
                network_truncate_length = st.number_input(
                    "Network Truncate Length", 
                    value=500,
                    step=10,
                    help="Maximum length of request/response bodies before truncation",
                    key="action_network_truncate_length"
                )
                st.write("Status Codes:")
                network_include_info = st.checkbox("1xx (Informational)", key="action_network_include_info")
                network_include_success = st.checkbox("2xx (Success)", key="action_network_include_success")
                network_include_redirect = st.checkbox("3xx (Redirect)", key="action_network_include_redirect")
                network_include_client_error = st.checkbox("4xx (Client Error)", value=True, key="action_network_include_client_error")
                network_include_server_error = st.checkbox("5xx (Server Error)", value=True, key="action_network_include_server_error")
            
            with col2:
                network_include_headers = st.checkbox("Include Headers", key="action_network_include_headers")
                network_include_body = st.checkbox("Include Body", key="action_network_include_body")
                network_include_query_params = st.checkbox("Include Query Parameters", key="action_network_include_query_params")
                
                network_include_string_filters = st.text_area(
                    "Include Strings (one per line)", 
                    help="Enter strings to include in results. Requests matching any string will be shown.",
                    key="action_network_include_string_filters"
                )
                
                network_exclude_string_filters = st.text_area(
                    "Exclude Strings (one per line)",
                    help="Enter strings to exclude from results. Requests matching any string will be hidden.",
                    key="action_network_exclude_string_filters"
                )

            log_filters = {
                "console": {
                    "includeErrors": console_include_errors,
                    "includeWarnings": console_include_warnings,
                    "includeInfo": console_include_info,
                    "includeTrace": console_include_trace,
                    "truncateLength": console_truncate_length,
                    "includeStringFilters": [f.strip() for f in console_include_string_filters.split('\n') if f.strip()],
                    "excludeStringFilters": [f.strip() for f in console_exclude_string_filters.split('\n') if f.strip()]
                },
                "network": {
                    "statusCodes": {
                        "info": network_include_info,
                        "success": network_include_success,
                        "redirect": network_include_redirect,
                        "clientError": network_include_client_error,
                        "serverError": network_include_server_error
                    },
                    "includeHeaders": network_include_headers,
                    "includeBody": network_include_body,
                    "includeQueryParams": network_include_query_params,
                    "truncateLength": network_truncate_length,
                    "includeStringFilters": [f.strip() for f in network_include_string_filters.split('\n') if f.strip()],
                    "excludeStringFilters": [f.strip() for f in network_exclude_string_filters.split('\n') if f.strip()]
                }
            }
    
    if st.button("Execute Action"):
        with st.spinner("Executing action..."):
            result = perform_action(
                st.session_state.session_id,
                action, 
                use_vision, 
                selected_model,
                include_logs,
                log_filters
            )
            
            # Display the action result
            st.json(result.get('result', {}))
            
            # If logs were included, display them in an expander
            if include_logs and result.get('logs'):
                with st.expander("Action Logs", expanded=True):
                    # Display console logs
                    if result['logs'].get('console'):
                        st.subheader("Console Logs")
                        for log in result['logs']['console']:
                            log_color = {
                                'error': 'red',
                                'warning': 'orange',
                                'info': 'blue',
                                'log': 'green',
                                'trace': 'gray'
                            }.get(log['type'], 'black')
                            
                            st.markdown(f"""
                            <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                                <span style="color: {log_color};">[{log['type'].upper()}]</span>
                                <span style="color: #666;">({log['timestamp']})</span><br/>
                                <strong>Message:</strong> {log['message']}<br/>
                                <small>Path: {log['path']}</small>
                                {f"<details><summary>Stack Trace</summary><pre>{log['stackTrace']}</pre></details>" if log.get('stackTrace') else ""}
                            </div>
                            """, unsafe_allow_html=True)
                    
                    # Display network logs
                    if result['logs'].get('network'):
                        st.subheader("Network Logs")
                        for log in result['logs']['network']:
                            status_color = {
                                range(100, 200): 'blue',
                                range(200, 300): 'green',
                                range(300, 400): 'orange',
                                range(400, 500): 'red',
                                range(500, 600): 'purple'
                            }
                            log_color = next((color for range_obj, color in status_color.items() 
                                            if log['status'] in range_obj), 'black')
                            
                            st.markdown(f"""
                            <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                                <span style="color: {log_color};">[{log['status']}]</span> 
                                <strong>{log['method']}</strong> {log['url']}<br/>
                                <span style="color: #666;">({log['timestamp']})</span>
                            </div>
                            """, unsafe_allow_html=True)
    
    # Extract Data section
    st.subheader("Extract Data")
    instruction = st.text_input("Enter extraction instruction")
    schema = st.text_area("Enter schema (JSON)", value='{"example": "string"}')
    if st.button("Extract"):
        try:
            schema_dict = json.loads(schema)
            with st.spinner("Extracting data..."):
                result = extract_data(
                    st.session_state.session_id,
                    instruction, 
                    schema_dict, 
                    selected_model
                )
                st.json(result)
        except json.JSONDecodeError:
            st.error("Invalid JSON schema")
    
    # Observe Page section
    st.subheader("Observe Page")
    observe_instruction = st.text_input("Enter observation instruction (optional)")
    use_vision_observe = st.checkbox("Use Vision for Observation", key="observe_use_vision")
    if st.button("Observe"):
        with st.spinner("Observing page..."):
            result = observe_page(
                st.session_state.session_id,
                observe_instruction, 
                use_vision_observe, 
                selected_model
            )
            st.json(result)
    
    # DOM State section
    st.subheader("DOM State")
    if st.button("View DOM State"):
        with st.spinner("Fetching DOM state..."):
            result = get_dom_state(st.session_state.session_id)
            st.code(result.get("state", ""), language="html")
    
    # Screenshot section
    st.subheader("Page Screenshot")
    if st.button("Take Screenshot"):
        with st.spinner("Taking screenshot..."):
            screenshot = get_screenshot(st.session_state.session_id)
            if screenshot:
                st.image(screenshot, use_column_width=True)
    
    # Logs section
    st.subheader("Logs")
    log_type = st.radio("Log Type", ["Console", "Network"], key="log_type_radio")
    
    with st.expander("Log Filters", expanded=True):
        if log_type == "Console":
            col1, col2 = st.columns(2)
            with col1:
                truncate_length = st.number_input(
                    "Truncate Length", 
                    value=500,
                    step=100,
                    help="Maximum length of log messages before truncation",
                    key="console_truncate_length"
                )
                include_errors = st.checkbox("Include Errors", value=True, key="console_include_errors")
                include_warnings = st.checkbox("Include Warnings", value=False, key="console_include_warnings")
                include_info = st.checkbox("Include Info", value=False, key="console_include_info")
                include_trace = st.checkbox("Include Trace", value=False, key="console_include_trace")
            
            with col2:
                include_string_filters = st.text_area(
                    "Include Strings (one per line)", 
                    help="Enter strings to include in results. Logs matching any string will be shown.",
                    key="console_include_string_filters"
                )
                
                exclude_string_filters = st.text_area(
                    "Exclude Strings (one per line)",
                    help="Enter strings to exclude from results. Logs matching any string will be hidden.",
                    key="console_exclude_string_filters"
                )
                
                use_time_filter = st.checkbox("Filter by Time", value=False, key="console_use_time_filter")
                if use_time_filter:
                    start_time = st.time_input("Start Time", key="console_start_time")
                    end_time = st.time_input("End Time", key="console_end_time")
                    today = datetime.now().date()
                    start_datetime = datetime.combine(today, start_time).isoformat() if start_time else None
                    end_datetime = datetime.combine(today, end_time).isoformat() if end_time else None

            filters = {
                'includeErrors': include_errors,
                'includeWarnings': include_warnings,
                'includeInfo': include_info,
                'includeTrace': include_trace,
                'truncateLength': truncate_length,
                'includeStringFilters': [f.strip() for f in include_string_filters.split('\n') if f.strip()],
                'excludeStringFilters': [f.strip() for f in exclude_string_filters.split('\n') if f.strip()]
            }
            if use_time_filter:
                filters.update({
                    'startTime': start_datetime,
                    'endTime': end_datetime
                })

        else:  # Network logs
            col1, col2 = st.columns(2)
            with col1:
                truncate_length = st.number_input(
                    "Truncate Length", 
                    value=500,
                    step=10,
                    help="Maximum length of request/response bodies before truncation",
                    key="network_truncate_length"
                )
                st.write("Status Codes:")
                include_info = st.checkbox("1xx (Informational)", value=False, key="network_include_info")
                include_success = st.checkbox("2xx (Success)", value=False, key="network_include_success")
                include_redirect = st.checkbox("3xx (Redirect)", value=False, key="network_include_redirect")
                include_client_error = st.checkbox("4xx (Client Error)", value=True, key="network_include_client_error")
                include_server_error = st.checkbox("5xx (Server Error)", value=True, key="network_include_server_error")
            
            with col2:
                include_headers = st.checkbox("Include Headers", value=False, key="network_include_headers")
                include_body = st.checkbox("Include Body", value=False, key="network_include_body")
                include_query_params = st.checkbox("Include Query Parameters", value=False, key="network_include_query_params")
                
                include_string_filters = st.text_area(
                    "Include Strings (one per line)", 
                    help="Enter strings to include in results. Requests matching any string will be shown.",
                    key="logs_network_include_string_filters"
                )
                
                exclude_string_filters = st.text_area(
                    "Exclude Strings (one per line)",
                    help="Enter strings to exclude from results. Requests matching any string will be hidden.",
                    key="logs_network_exclude_string_filters"
                )
                
                use_time_filter = st.checkbox("Filter by Time", value=False, key="network_use_time_filter")
                if use_time_filter:
                    start_time = st.time_input("Start Time", key="network_start_time")
                    end_time = st.time_input("End Time", key="network_end_time")
                    today = datetime.now().date()
                    start_datetime = datetime.combine(today, start_time).isoformat() if start_time else None
                    end_datetime = datetime.combine(today, end_time).isoformat() if end_time else None

            filters = {
                'statusCodes': {
                    'info': include_info,
                    'success': include_success,
                    'redirect': include_redirect,
                    'clientError': include_client_error,
                    'serverError': include_server_error
                },
                'includeHeaders': include_headers,
                'includeBody': include_body,
                'includeQueryParams': include_query_params,
                'truncateLength': truncate_length,
                'includeStringFilters': [f.strip() for f in include_string_filters.split('\n') if f.strip()],
                'excludeStringFilters': [f.strip() for f in exclude_string_filters.split('\n') if f.strip()]
            }
            if use_time_filter:
                filters.update({
                    'startTime': start_datetime,
                    'endTime': end_datetime
                })

    if st.button("View Logs", key="view_logs_button"):
        with st.spinner("Fetching logs..."):
            if log_type == "Console":
                logs = get_console_logs(st.session_state.session_id, filters)
                
                # Enhanced console log display
                if logs.get('logs'):
                    for log in logs['logs']:
                        log_color = {
                            'error': 'red',
                            'warning': 'orange',
                            'info': 'blue',
                            'log': 'green',
                            'trace': 'gray'
                        }.get(log['type'], 'black')
                        
                        # Create expandable sections for full content
                        st.markdown(f"""
                        <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                            <span style="color: {log_color};">[{log['type'].upper()}]</span>
                            <span style="color: #666;">({log['timestamp']})</span><br/>
                            <strong>Message:</strong><br/>
                            <pre style="white-space: pre-wrap; word-wrap: break-word;">{log['message']}</pre>
                            <small>Path: {log['path']}</small>
                            {f'<details><summary>Stack Trace</summary><pre style="white-space: pre-wrap; word-wrap: break-word;">{log["stackTrace"]}</pre></details>' if log.get('stackTrace') else ''}
                            {f'<details><summary>Arguments</summary><pre style="white-space: pre-wrap; word-wrap: break-word;">{json.dumps(log.get("args", []), indent=2)}</pre></details>' if log.get('args') else ''}
                        </div>
                        """, unsafe_allow_html=True)
                else:
                    st.info("No console logs found")
            
            else:  # Network logs
                logs = get_network_logs(st.session_state.session_id, filters)
                
                # Enhanced network log display
                if logs.get('logs'):
                    for log in logs['logs']:
                        status_color = {
                            range(100, 200): 'blue',
                            range(200, 300): 'green',
                            range(300, 400): 'orange',
                            range(400, 500): 'red',
                            range(500, 600): 'purple'
                        }
                        log_color = next((color for range_obj, color in status_color.items() 
                                        if log['status'] in range_obj), 'black')
                        
                        st.markdown(f"""
                        <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                            <span style="color: {log_color};">[{log['status']}]</span> 
                            <strong>{log['method']}</strong> {log['url']}<br/>
                            <span style="color: #666;">({log['timestamp']})</span>
                            
                            <details>
                                <summary>Request Details</summary>
                                {f'<strong>Query Parameters:</strong><br/><pre style="white-space: pre-wrap; word-wrap: break-word;">{log["request"].get("queryParams", "")}</pre>' if log.get('request', {}).get('queryParams') else ''}
                                {f'<strong>Headers:</strong><br/><pre style="white-space: pre-wrap; word-wrap: break-word;">{json.dumps(log["request"].get("headers", {}), indent=2)}</pre>' if log.get('request', {}).get('headers') else ''}
                                {f'<strong>Body:</strong><br/><pre style="white-space: pre-wrap; word-wrap: break-word;">{log["request"].get("body", "")}</pre>' if log.get('request', {}).get('body') else ''}
                            </details>
                            
                            <details>
                                <summary>Response Details</summary>
                                {f'<strong>Headers:</strong><br/><pre style="white-space: pre-wrap; word-wrap: break-word;">{json.dumps(log["response"].get("headers", {}), indent=2)}</pre>' if log.get('response', {}).get('headers') else ''}
                                {f'<strong>Body:</strong><br/><pre style="white-space: pre-wrap; word-wrap: break-word;">{log["response"].get("body", "")}</pre>' if log.get('response', {}).get('body') else ''}
                            </details>
                            
                            {f'''
                            <details>
                                <summary>Timing Information</summary>
                                <pre style="white-space: pre-wrap; word-wrap: break-word;">{json.dumps(log["timing"], indent=2)}</pre>
                            </details>
                            ''' if log.get('timing') else ''}
                        </div>
                        """, unsafe_allow_html=True)
                else:
                    st.info("No network logs found")
    
    if st.button("Clear Logs", key="clear_logs_button"):
        with st.spinner("Clearing logs..."):
            result = clear_logs(st.session_state.session_id)
            if result.get("success"):
                st.success("Logs cleared successfully")
            else:
                st.error("Failed to clear logs")

if __name__ == "__main__":
    main() 