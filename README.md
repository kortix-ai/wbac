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

For complete API documentation, visit [wbac-api-docs.netlify.app](https://wbac-api-docs.netlify.app/)

### Session Management

- `POST /api/sessions/create-session` - Create new browser session
- `POST /api/sessions/stop-session/:sessionId` - Stop session
- `GET /api/sessions/running-sessions` - List active sessions
- `GET /api/sessions/session/:sessionId` - Get session information
- `GET /api/sessions/debug/:sessionId` - Get session debug URLs

### Browser Control

- `POST /api/browser/navigate/:sessionId` - Navigate to URL
- `POST /api/browser/act/:sessionId` - Perform action via natural language
- `POST /api/browser/extract/:sessionId` - Extract structured data
- `POST /api/browser/observe/:sessionId` - Get possible actions

### Monitoring

- `GET /api/browser/console-logs/:sessionId` - Get console logs
- `GET /api/browser/network-logs/:sessionId` - Get network logs
- `GET /api/browser/dom-state/:sessionId` - Get DOM state
- `POST /api/browser/screenshot/:sessionId` - Take screenshot
- `POST /api/browser/clear-logs/:sessionId` - Clear logs

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
