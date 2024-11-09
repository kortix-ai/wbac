# Web Browser AI-Control API Server

A hosted API server for AI agents to control web browsers in the cloud using [Browserbase](https://www.browserbase.com/), [Stagehand](https://github.com/browserbase/stagehand), and [Playwright](https://playwright.dev/).

## Overview

This server provides a REST API for AI agents to:
- Create and manage browser sessions in the cloud
- Control browsers using natural language commands
- Extract structured data from web pages
- Monitor browser activity and errors
- Take screenshots and inspect DOM state
- Execute custom Playwright automation scripts

Built on top of:
- [Browserbase](https://www.browserbase.com/) for cloud browser infrastructure
- [Stagehand](https://github.com/browserbase/stagehand) for AI-powered browser control
- [Playwright](https://playwright.dev/) for low-level browser automation
- Express.js for the API server

## API Reference

### Session Management

- `POST /api/sessions/create-session` - Create new browser session
  - Returns session ID for the created browser instance
  - No request body required

- `POST /api/sessions/stop-session/:sessionId` - Stop and cleanup session
  - Stops browser session and cleans up resources
  - Requires session ID in URL

- `GET /api/sessions/running-sessions` - List active sessions
  - Returns array of running session objects with ID, creation time, region and status

- `GET /api/sessions/session/:sessionId` - Get session information
  - Returns detailed information about specific session

- `GET /api/sessions/debug/:sessionId` - Get session debug URLs
  - Returns debugger URLs, WebSocket URL and page information

### Browser Control

- `POST /api/browser/navigate/:sessionId` - Navigate to URL
  - Body: `{ url: string }`
  - Navigates browser to specified URL with network idle waiting

- `POST /api/browser/act/:sessionId` - Perform action via natural language
  - Body: 
    ```js
    {
      action: string,          // Natural language action to perform
      useVision?: string,      // Vision mode ('fallback' by default)
      modelName?: string,      // Optional AI model name
      includeLogs?: boolean,   // Include execution logs
      logFilters?: {          // Optional log filtering
        console?: {...},       // Console log filters
        network?: {...}        // Network log filters
      }
    }
    ```

- `POST /api/browser/extract/:sessionId` - Extract structured data
  - Body:
    ```js
    {
      instruction: string,   // Natural language instruction
      schema: object,       // Zod schema definition
      modelName?: string    // Optional AI model name
    }
    ```

- `POST /api/browser/observe/:sessionId` - Get possible actions
  - Body:
    ```js
    {
      instruction?: string,  // Optional guidance instruction
      useVision?: string,   // Vision mode ('fallback' by default)
      modelName?: string    // Optional AI model name
    }
    ```

### Monitoring & Debugging

- `POST /api/browser/screenshot/:sessionId` - Take screenshot
  - Returns JPEG image of current page state
  - No request body required

- `GET /api/browser/dom-state/:sessionId` - Get DOM state
  - Returns current page HTML structure
  - No request body required

- `GET /api/browser/console-logs/:sessionId` - Get console logs
  - Query parameters:
    ```js
    {
      levels?: {              // Log level filters
        error?: boolean,      // Include errors (default: true)
        warning?: boolean,    // Include warnings (default: false)
        info?: boolean,       // Include info (default: false)
        trace?: boolean       // Include trace (default: false)
      },
      includeStringFilters?: string[],  // Strings to include
      excludeStringFilters?: string[],  // Strings to exclude
      startTime?: string,               // ISO timestamp start
      endTime?: string,                 // ISO timestamp end
      truncateLength?: number           // Max message length
    }
    ```

- `GET /api/browser/network-logs/:sessionId` - Get network logs
  - Query parameters:
    ```js
    {
      includeHeaders?: boolean,     // Include headers (default: false)
      includeBody?: boolean,        // Include bodies (default: true)
      includeInfo?: boolean,        // 1xx responses (default: true)
      includeSuccess?: boolean,     // 2xx responses (default: true)
      includeRedirect?: boolean,    // 3xx responses (default: true)
      includeClientError?: boolean, // 4xx responses (default: true)
      includeServerError?: boolean, // 5xx responses (default: true)
      includeStringFilters?: string[],
      excludeStringFilters?: string[],
      startTime?: string,
      endTime?: string,
      truncateLength?: number
    }
    ```

- `POST /api/browser/clear-logs/:sessionId` - Clear logs
  - Clears all console and network logs for session
  - No request body required

## Key Features

### Browser Session Management
- Create new browser sessions
- Resume existing sessions
- List running sessions
- Stop/cleanup sessions

### AI-Powered Browser Control 
- Natural language actions via `act()` 
- Structured data extraction via `extract()`
- Page observation via `observe()`
- Vision-based interaction support


### Monitoring & Debugging
- Console log monitoring
- Network request/response logging
- Error tracking
- Screenshot capture
- DOM state inspection

## Getting Started

### Prerequisites

- Node.js 16+
- Browserbase account and credentials
- OpenAI or Anthropic API key for AI features

### Installation

```
git clone https://github.com/kortix-ai/wbac
cd wbac
npm i
```

### Configuration

Create a `.env` file with:

```
BROWSERBASE_API_KEY=your_api_key
BROWSERBASE_PROJECT_ID=your_project_id
OPENAI_API_KEY=your_openai_key 
ANTHROPIC_API_KEY=your_anthropic_key
```

### Running the Server

```
npm start
```

## UI Interface

A Streamlit-based UI is included for testing and debugging:

```
pip install streamlit
streamlit run streamlit_ui.py
```

## Use Cases

- AI agents that need web browsing capabilities
- Automated web testing with AI assistance
- Web scraping with natural language commands
- Browser automation monitoring and debugging

## Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests.

## License

MIT License - see LICENSE file for details

## Acknowledgements

- [Browserbase](https://www.browserbase.com/) for cloud browser infrastructure
- [Stagehand](https://github.com/browserbase/stagehand) for AI browser control capabilities
- [Playwright](https://playwright.dev/) for powerful browser automation
