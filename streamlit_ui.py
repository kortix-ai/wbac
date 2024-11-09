import streamlit as st
import requests
import json
from PIL import Image
from io import BytesIO
from datetime import datetime

API_URL = "http://localhost:3000/api"

# Add constants for default values
DEFAULT_NAVIGATION_TIMEOUT = 30000
DEFAULT_VISION_MODE = 'fallback'

# Default log filter values matching browser-routes.js
DEFAULT_LOG_FILTERS = {
    'console': {
        'levels': {
            'error': True,
            'warning': False,
            'info': False,
            'trace': False
        },
        'truncateLength': 500,
        'includeStringFilters': [],
        'excludeStringFilters': []
    },
    'network': {
        'statusCodes': {
            'info': True,
            'success': True,
            'redirect': True,
            'clientError': True,
            'serverError': True
        },
        'includeHeaders': False,
        'includeBody': True,
        'includeQueryParams': True,
        'truncateLength': 500,
        'includeStringFilters': [],
        'excludeStringFilters': []
    }
}

def create_session():
    response = requests.post(f"{API_URL}/sessions/create-session")
    return response.json()

def stop_session(session_id):
    response = requests.post(f"{API_URL}/sessions/stop-session/{session_id}")
    return response.json()

def navigate(session_id, url):
    """Navigate browser with default timeout"""
    response = requests.post(
        f"{API_URL}/browser/navigate/{session_id}", 
        json={
            "url": url,
            "timeout": DEFAULT_NAVIGATION_TIMEOUT
        }
    )
    return response.json()

def perform_action(session_id, action, use_vision=DEFAULT_VISION_MODE, model_name=None, include_logs=False, log_filters=None):
    """Perform browser action with default vision mode and log filters"""
    payload = {
        "action": action,
        "useVision": use_vision or DEFAULT_VISION_MODE,
        "modelName": model_name,
        "includeLogs": include_logs,
        "logFilters": log_filters or DEFAULT_LOG_FILTERS if include_logs else None
    }
    response = requests.post(f"{API_URL}/browser/act/{session_id}", json=payload)
    return response.json()

def extract_data(session_id, instruction, schema, model_name=None):
    response = requests.post(f"{API_URL}/browser/extract/{session_id}", json={
        "instruction": instruction,
        "schema": schema,
        "modelName": model_name
    })
    return response.json()

def observe_page(session_id, instruction=None, use_vision=DEFAULT_VISION_MODE, model_name=None):
    """Observe page with default vision mode"""
    payload = {
        "instruction": instruction,
        "useVision": use_vision or DEFAULT_VISION_MODE,
        "modelName": model_name
    }
    response = requests.post(f"{API_URL}/browser/observe/{session_id}", json=payload)
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
    """Get console logs with default filters"""
    params = {
        'error': str(filters.get('levels', {}).get('error', DEFAULT_LOG_FILTERS['console']['levels']['error'])).lower(),
        'warning': str(filters.get('levels', {}).get('warning', DEFAULT_LOG_FILTERS['console']['levels']['warning'])).lower(),
        'info': str(filters.get('levels', {}).get('info', DEFAULT_LOG_FILTERS['console']['levels']['info'])).lower(),
        'trace': str(filters.get('levels', {}).get('trace', DEFAULT_LOG_FILTERS['console']['levels']['trace'])).lower(),
        'truncateLength': filters.get('truncateLength', DEFAULT_LOG_FILTERS['console']['truncateLength'])
    }
    
    # Properly handle string filters as arrays
    if filters.get('includeStringFilters'):
        # Convert to list if it's a string
        if isinstance(filters['includeStringFilters'], str):
            filters['includeStringFilters'] = [f.strip() for f in filters['includeStringFilters'].split('\n') if f.strip()]
        params['includeStringFilters[]'] = filters['includeStringFilters']
        
    if filters.get('excludeStringFilters'):
        # Convert to list if it's a string
        if isinstance(filters['excludeStringFilters'], str):
            filters['excludeStringFilters'] = [f.strip() for f in filters['excludeStringFilters'].split('\n') if f.strip()]
        params['excludeStringFilters[]'] = filters['excludeStringFilters']
    
    response = requests.get(f"{API_URL}/browser/console-logs/{session_id}", params=params)
    return response.json()

def get_network_logs(session_id, filters=None):
    """Get network logs with default filters"""
    default_network = DEFAULT_LOG_FILTERS['network']
    params = {
        'includeInfo': str(filters.get('statusCodes', {}).get('info', default_network['statusCodes']['info'])).lower(),
        'includeSuccess': str(filters.get('statusCodes', {}).get('success', default_network['statusCodes']['success'])).lower(),
        'includeRedirect': str(filters.get('statusCodes', {}).get('redirect', default_network['statusCodes']['redirect'])).lower(),
        'includeClientError': str(filters.get('statusCodes', {}).get('clientError', default_network['statusCodes']['clientError'])).lower(),
        'includeServerError': str(filters.get('statusCodes', {}).get('serverError', default_network['statusCodes']['serverError'])).lower(),
        'includeHeaders': str(filters.get('includeHeaders', default_network['includeHeaders'])).lower(),
        'includeBody': str(filters.get('includeBody', default_network['includeBody'])).lower(),
        'includeQueryParams': str(filters.get('includeQueryParams', default_network['includeQueryParams'])).lower(),
        'truncateLength': filters.get('truncateLength', default_network['truncateLength'])
    }
    
    # Properly handle string filters as arrays
    if filters.get('includeStringFilters'):
        # Convert to list if it's a string
        if isinstance(filters['includeStringFilters'], str):
            filters['includeStringFilters'] = [f.strip() for f in filters['includeStringFilters'].split('\n') if f.strip()]
        params['includeStringFilters[]'] = filters['includeStringFilters']
        
    if filters.get('excludeStringFilters'):
        # Convert to list if it's a string
        if isinstance(filters['excludeStringFilters'], str):
            filters['excludeStringFilters'] = [f.strip() for f in filters['excludeStringFilters'].split('\n') if f.strip()]
        params['excludeStringFilters[]'] = filters['excludeStringFilters']
    
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

def render_network_log(log, parent_container):
    """Renders a single network log entry with expandable sections"""
    status = log.get('status', 0)
    status_color = {
        range(100, 200): 'blue',
        range(200, 300): 'green',
        range(300, 400): 'orange',
        range(400, 500): 'red',
        range(500, 600): 'purple'
    }
    log_color = next((color for range_obj, color in status_color.items() 
                    if status in range_obj), 'black')
    
    parent_container.markdown(f"""
    <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
        <span style="color: {log_color};">[{status}]</span> 
        <strong>{log.get('method', '')}</strong> {log.get('url', '')}<br/>
        <span style="color: #666;">({log.get('timestamp', '')})</span>
    </div>
    """, unsafe_allow_html=True)
    
    # Request Details
    cols = parent_container.columns([1, 1, 1])
    
    # Column 1: Request Details
    with cols[0]:
        st.markdown("**Request Details:**")
        if log.get('request', {}).get('queryParams'):
            st.markdown("*Query Parameters:*")
            st.code(log['request']['queryParams'])
        
        if log.get('request', {}).get('headers'):
            st.markdown("*Headers:*")
            st.json(log['request']['headers'])
        
        if log.get('request', {}).get('body'):
            st.markdown("*Body:*")
            try:
                st.json(json.loads(log['request']['body']))
            except:
                st.code(log['request']['body'])
    
    # Column 2: Response Details
    with cols[1]:
        st.markdown("**Response Details:**")
        if log.get('response', {}).get('headers'):
            st.markdown("*Headers:*")
            st.json(log['response']['headers'])
        
        if log.get('response', {}).get('body'):
            st.markdown("*Body:*")
            try:
                st.json(json.loads(log['response']['body']))
            except:
                st.code(log['response']['body'])
    
    # Column 3: Timing Information
    with cols[2]:
        if log.get('timing'):
            st.markdown("**Timing Information:**")
            st.json(log['timing'])
    
    parent_container.markdown("---")

def render_console_log(log, parent_container):
    """Renders a single console log entry with proper formatting"""
    log_color = {
        'error': 'red',
        'warning': 'orange',
        'info': 'blue',
        'log': 'green',
        'trace': 'gray'
    }.get(log.get('type', 'log'), 'black')
    
    parent_container.markdown(f"""
    <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
        <span style="color: {log_color};">[{log.get('type', '').upper()}]</span>
        <span style="color: #666;">({log.get('timestamp', '')})</span><br/>
        <strong>Message:</strong> {log.get('message', '')}<br/>
        <small>Path: {log.get('path', '')}</small>
    </div>
    """, unsafe_allow_html=True)
    
    cols = parent_container.columns([1, 1])
    
    # Column 1: Stack Trace
    with cols[0]:
        if log.get('stackTrace'):
            st.markdown("**Stack Trace:**")
            st.code(log['stackTrace'])
    
    # Column 2: Arguments
    with cols[1]:
        if log.get('args'):
            st.markdown("**Arguments:**")
            st.json(log['args'])
    
    parent_container.markdown("---")

def render_action_result(result):
    """Renders an action result with associated logs"""
    # Main result
    st.success("Action completed successfully")
    st.json(result.get('result', {}))
    
    # Logs section
    if result.get('logs'):
        st.markdown("### Action Logs")
        
        # Console logs tab and Network logs tab
        log_tabs = st.tabs(["Console Logs", "Network Logs"])
        
        # Console logs
        with log_tabs[0]:
            if result['logs'].get('console'):
                for log in result['logs']['console']:
                    render_console_log(log, st)
            else:
                st.info("No console logs available")
        
        # Network logs
        with log_tabs[1]:
            if result['logs'].get('network'):
                for log in result['logs']['network']:
                    render_network_log(log, st)
            else:
                st.info("No network logs available")

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
                    step=10,
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
                network_include_info = st.checkbox("1xx (Informational)", value=False, key="action_network_include_info")
                network_include_success = st.checkbox("2xx (Success)", value=False, key="action_network_include_success")
                network_include_redirect = st.checkbox("3xx (Redirect)", value=False, key="action_network_include_redirect")
                network_include_client_error = st.checkbox("4xx (Client Error)", value=True, key="action_network_include_client_error")
                network_include_server_error = st.checkbox("5xx (Server Error)", value=True, key="action_network_include_server_error")
            
            with col2:
                st.write("Request Details:")
                network_include_request_headers = st.checkbox("Include Request Headers", value=False, key="action_network_include_request_headers")
                network_include_request_body = st.checkbox("Include Request Body", value=False, key="action_network_include_request_body")
                network_include_request_params = st.checkbox("Include Query Parameters", value=False, key="action_network_include_request_params")
                
                st.write("Response Details:")
                network_include_response_headers = st.checkbox("Include Response Headers", value=False, key="action_network_include_response_headers")
                network_include_response_body = st.checkbox("Include Response Body", value=False, key="action_network_include_response_body")
                
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
                    "request": {
                        "includeHeaders": network_include_request_headers,
                        "includeBody": network_include_request_body,
                        "includeQueryParams": network_include_request_params
                    },
                    "response": {
                        "includeHeaders": network_include_response_headers,
                        "includeBody": network_include_response_body
                    },
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
            render_action_result(result)
    
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
            if result.get("state"):
                with st.expander("DOM State", expanded=True):
                    st.code(result["state"], language="html")
    
    # Screenshot section
    st.subheader("Page Screenshot")
    if st.button("Take Screenshot"):
        with st.spinner("Taking screenshot..."):
            screenshot = get_screenshot(st.session_state.session_id)
            if screenshot:
                st.image(screenshot, use_column_width=True)
    
    # Logs section
    st.subheader("Logs")
    log_type = st.radio("Log Type", ["Console", "Network"])
    
    with st.expander("Log Filters", expanded=True):
        if log_type == "Console":
            col1, col2 = st.columns(2)
            with col1:
                truncate_length = st.number_input(
                    "Truncate Length", 
                    value=DEFAULT_LOG_FILTERS['console']['truncateLength'],
                    step=10,
                    help="Maximum length of log messages before truncation",
                    key="console_truncate_length"
                )
                include_errors = st.checkbox(
                    "Include Errors", 
                    value=DEFAULT_LOG_FILTERS['console']['levels']['error'], 
                    key="console_include_errors"
                )
                include_warnings = st.checkbox(
                    "Include Warnings", 
                    value=DEFAULT_LOG_FILTERS['console']['levels']['warning'], 
                    key="console_include_warnings"
                )
                include_info = st.checkbox(
                    "Include Info", 
                    value=DEFAULT_LOG_FILTERS['console']['levels']['info'], 
                    key="console_include_info"
                )
                include_trace = st.checkbox(
                    "Include Trace", 
                    value=DEFAULT_LOG_FILTERS['console']['levels']['trace'], 
                    key="console_include_trace"
                )
            
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
                'levels': {
                    'error': include_errors,
                    'warning': include_warnings,
                    'info': include_info,
                    'trace': include_trace
                },
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
                    value=DEFAULT_LOG_FILTERS['network']['truncateLength'],
                    step=10,
                    help="Maximum length of request/response bodies before truncation",
                    key="network_truncate_length"
                )
                st.write("Status Codes:")
                include_info = st.checkbox(
                    "1xx (Informational)", 
                    value=DEFAULT_LOG_FILTERS['network']['statusCodes']['info'], 
                    key="network_include_info"
                )
                include_success = st.checkbox(
                    "2xx (Success)", 
                    value=DEFAULT_LOG_FILTERS['network']['statusCodes']['success'], 
                    key="network_include_success"
                )
                include_redirect = st.checkbox(
                    "3xx (Redirect)", 
                    value=DEFAULT_LOG_FILTERS['network']['statusCodes']['redirect'], 
                    key="network_include_redirect"
                )
                include_client_error = st.checkbox(
                    "4xx (Client Error)", 
                    value=DEFAULT_LOG_FILTERS['network']['statusCodes']['clientError'], 
                    key="network_include_client_error"
                )
                include_server_error = st.checkbox(
                    "5xx (Server Error)", 
                    value=DEFAULT_LOG_FILTERS['network']['statusCodes']['serverError'], 
                    key="network_include_server_error"
                )
            
            with col2:
                st.write("Request Details:")
                include_request_headers = st.checkbox(
                    "Include Request Headers", 
                    value=DEFAULT_LOG_FILTERS['network']['includeHeaders'], 
                    key="network_include_request_headers"
                )
                include_request_body = st.checkbox(
                    "Include Request Body", 
                    value=DEFAULT_LOG_FILTERS['network']['includeBody'], 
                    key="network_include_request_body"
                )
                include_request_params = st.checkbox(
                    "Include Query Parameters", 
                    value=DEFAULT_LOG_FILTERS['network']['includeQueryParams'], 
                    key="network_include_request_params"
                )
                
                st.write("Response Details:")
                include_response_headers = st.checkbox(
                    "Include Response Headers", 
                    value=DEFAULT_LOG_FILTERS['network']['includeHeaders'], 
                    key="network_include_response_headers"
                )
                include_response_body = st.checkbox(
                    "Include Response Body", 
                    value=DEFAULT_LOG_FILTERS['network']['includeBody'], 
                    key="network_include_response_body"
                )
                
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

            filters = {
                'statusCodes': {
                    'info': include_info,
                    'success': include_success,
                    'redirect': include_redirect,
                    'clientError': include_client_error,
                    'serverError': include_server_error
                },
                'includeHeaders': include_request_headers or include_response_headers,
                'includeBody': include_request_body or include_response_body,
                'includeQueryParams': include_request_params,
                'truncateLength': truncate_length,
                'includeStringFilters': [f.strip() for f in include_string_filters.split('\n') if f.strip()],
                'excludeStringFilters': [f.strip() for f in exclude_string_filters.split('\n') if f.strip()]
            }

    if st.button("View Logs"):
        with st.spinner("Fetching logs..."):
            if log_type == "Console":
                result = get_console_logs(st.session_state.session_id, filters)
                if result.get('success') and result.get('logs'):
                    for log in result['logs']:
                        render_console_log(log, st)
                else:
                    st.info("No console logs found")
            else:
                result = get_network_logs(st.session_state.session_id, filters)
                if result.get('success') and result.get('logs'):
                    for log in result['logs']:
                        render_network_log(log, st)
                else:
                    st.info("No network logs found")
    
    if st.button("Clear Logs"):
        with st.spinner("Clearing logs..."):
            result = clear_logs(st.session_state.session_id)
            if result.get("success"):
                st.success("Logs cleared successfully")
            else:
                st.error("Failed to clear logs")

if __name__ == "__main__":
    main() 