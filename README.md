# 🤖 Task Event Organizer Bot

> An AI-powered task management application with real-time chat, event scheduling, and intelligent automation.

**[Live Demo](#) • [Features](#features) • [Quick Start](#quick-start) • [Development](#development)**

---

## What is Task Event Organizer Bot?

Task Event Organizer Bot is a full-stack web application that helps you manage tasks and events through natural conversation with an AI assistant. Instead of clicking through forms, just tell the bot what you need to do, and it will:

- ✅ Create and manage tasks
- 📅 Schedule events and meetings
- 💬 Have intelligent conversations about your work
- 🔄 Remember your conversation history
- ⚡ Stream real-time responses

---

## ✨ Key Features

### 🎯 Smart Task Management
- Create tasks by typing naturally ("Create a task to finish the report")
- Set priority levels, due dates, and descriptions
- Track task status (pending, in progress, completed)
- Organize with tags and categories

### 📅 Event Scheduling
- Schedule meetings and events in seconds
- Set locations, attendees, and reminders
- View upcoming events in a calendar
- Natural language like "Schedule a meeting tomorrow at 2 PM"

### 🔍 Research & Analysis
- Conduct comprehensive research on various topics
- Web search integration with citation-backed responses
- Multi-step research analysis and synthesis
- Extract key insights and patterns from findings
- Quick research for definitions and explanations

### 🤖 AI Assistant
- Powered by OpenAI's GPT models (including o3/o4 for deep research)
- Understands natural language requests
- Intelligent message routing to the right agent
- Contextual responses based on conversation history

### 💬 Real-Time Chat
- Live streaming responses
- Message history
- Conversation memory (remembers previous context)
- Beautiful, responsive UI

### 📊 Dashboard
- Overview of all tasks and events
- Quick stats (completed, pending, upcoming)
- Visual calendar view
- Search and filter options

---

## 🚀 Quick Start

Choose one of the following methods:

### 🐳 Option 1: Docker (Recommended - Easiest)

**Perfect for:** Production deployment, quick testing, or if you don't want to install PostgreSQL manually.

```bash
# 1. Clone the repository
git clone <repository-url>
cd TaskEventChatBot

# 2. Run the interactive setup (creates .env and starts everything)
# On macOS/Linux:
cd docker && chmod +x setup.sh && ./setup.sh

# On Windows (PowerShell):
cd docker
.\setup.ps1

# OR manually:
# Create .env file
cp docker/.env.example .env
# Edit .env with your OPENAI_API_KEY

# Start all services
docker-compose up -d
```

**Access your application:**
- 🌐 **Frontend**: http://localhost
- 🔌 **Backend API**: http://localhost:3001
- ❤️ **Health Check**: http://localhost:3001/health

**What you get:**
- ✅ PostgreSQL with pgvector (auto-configured)
- ✅ Backend API (production build)
- ✅ Frontend (production build with Nginx)
- ✅ All networking handled automatically
- ✅ Data persists between restarts

**Useful commands:**
```bash
docker-compose logs -f          # View logs
docker-compose down             # Stop services
docker-compose restart backend  # Restart a service
docker-compose down -v          # Remove everything including data
```

📚 **Full Docker documentation**: See [docker/README.md](docker/README.md) or [docker/QUICKSTART.md](docker/QUICKSTART.md)

---

### 💻 Option 2: Local Development

**Perfect for:** Active development, debugging, or learning the codebase.

#### Prerequisites
- **Node.js** v18+ (LTS recommended)
- **npm** or **yarn**
- **PostgreSQL** (with pgvector extension)

#### Installation (5 minutes)

```bash
# 1. Clone the repository
git clone <repository-url>
cd TaskEventChatBot

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your PostgreSQL credentials and OpenAI API key

# 4. Start PostgreSQL (if not running)
# Make sure PostgreSQL is installed and running on port 5432

# 5. Start the development servers
# Terminal 1: Start the backend (with hot reload)
cd server && npm run dev:watch

# Terminal 2: Start the frontend (with hot reload)
npm run dev
```

**Access your application:**
- 🌐 **Frontend**: http://localhost:5173
- 🔌 **Backend API**: http://localhost:3001

---

## 📖 How to Use

### For Users

#### Creating a Task
1. Open the chat interface
2. Type: `"Create a task to finish the project by Friday"`
3. The bot will create the task automatically

#### Scheduling an Event
1. Type: `"Schedule a meeting with John tomorrow at 2 PM"`
2. The bot will add it to your calendar

#### Asking Questions
1. Type: `"How many tasks do I have this week?"`
2. Get instant stats and summaries

#### Conducting Research
1. Type: `"Research the latest AI trends in 2025"`
2. The bot will conduct comprehensive research and provide citation-backed insights
3. Ask follow-up questions for deeper analysis

### For Developers

#### Understanding the Project Structure

```
task-track-bot/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and helpers
│   └── pages/              # Main pages
│
├── server/                 # Express backend
│   ├── src/
│   │   ├── mastra/         # AI agents and workflows
│   │   ├── routes/         # API endpoints
│   │   ├── config/         # Database config
│   │   └── types/          # TypeScript types
│   └── package.json
│
└── tests/                  # Integration tests
```

#### AI Agents Architecture

The system uses multiple specialized agents coordinated through an intelligent routing workflow:

- **Task Agent**: Handles task creation, updates, and management
- **Event Agent**: Manages event scheduling and calendar operations
- **Research Agent**: Conducts comprehensive research with web search integration
  - Uses OpenAI's Deep Research API (o3-deep-research/o4-mini-deep-research)
  - Provides `webResearchTool` for complex, multi-faceted research
  - Provides `quickResearchTool` for definitions, explanations, and single-topic queries
  - Returns citation-backed, structured responses
- **Routing Agent**: Intelligently routes user messages to the appropriate agent

See `server/src/mastra/agents/` for implementation details.

#### Building for Production

```bash
# Build frontend
npm run build

# Build backend (in server/)
cd server && npm run build

# Run production server
cd server && npm start
```

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Vitest** - Testing

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **OpenAI API** - LLM integration (including Deep Research models for o3/o4)
- **Mastra** - AI orchestration with multi-agent support
- **Socket.io** - Real-time communication

### Infrastructure
- **Node.js** - Runtime
- **npm** - Package manager

---

## 📚 API Endpoints

### Health Check
```bash
GET /health
```
Returns server status.

### Chat Endpoints
```bash
POST /api/agent/general       # General questions
POST /api/agent/task          # Task-specific requests
POST /api/agent/event         # Event scheduling
POST /api/agent/stream        # Streaming responses
```

### Task Management
```bash
GET    /api/tasks             # List all tasks
GET    /api/tasks/:id         # Get specific task
POST   /api/tasks             # Create task
PUT    /api/tasks/:id         # Update task
DELETE /api/tasks/:id         # Delete task
```

### Event Management
```bash
GET    /api/events            # List all events
GET    /api/events/:id        # Get specific event
POST   /api/events            # Create event
PUT    /api/events/:id        # Update event
DELETE /api/events/:id        # Delete event
```

### Summaries & Insights
```bash
GET    /api/summary/daily     # Daily summary
POST   /api/search            # Search tasks/events
```

---

## 🔧 Development

### Available Commands

```bash
# Frontend
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run linter
npm test                 # Run tests

# Backend (cd server/)
npm run dev              # Start dev server with auto-reload
npm run build            # Build TypeScript
npm start                # Run production server
npm run dev:watch        # Watch mode
```

### Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Server
PORT=3001
NODE_ENV=development

# Database (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/task_track_bot

# OpenAI
OPENAI_API_KEY=sk_your_key_here

# Other services
# Add as needed
```

### Making Changes

1. **Create a branch**: `git checkout -b feature/your-feature`
2. **Make changes**: Edit files as needed
3. **Test locally**: Run `npm run dev` (both frontend and backend)
4. **Commit**: `git commit -m "Add your feature"`
5. **Push**: `git push origin feature/your-feature`
6. **Create PR**: Open a pull request

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit (`git commit -m 'Add amazing feature'`)
5. Push (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 📝 Code Standards

- **Style Guide**: Follow ESLint rules
- **TypeScript**: Full type coverage required
- **Components**: Keep them small and reusable
- **Comments**: Add comments for complex logic
- **Commits**: Use clear, descriptive messages

---

## 🎨 Project Philosophy

- **User-First**: Design for real users, not just developers
- **Simple**: Easy to understand and use
- **Reliable**: Robust error handling
- **Maintainable**: Clean, well-organized code
- **Scalable**: Built to grow

---

## ❓ FAQ

**Q: Do I need a database to run this locally?**  
A: No, it works with in-memory storage for development. PostgreSQL is optional.

**Q: Can I use this without OpenAI?**  
A: The AI features require OpenAI, but the task management works without it.

**Q: Is this production-ready?**  
A: Yes! It's fully functional. Make sure to set up proper environment variables.

**Q: How do I customize the AI responses?**  
A: Edit the agent prompts in `server/src/mastra/agents/`.

**Q: Can I add more AI agents?**  
A: Absolutely! See `server/src/mastra/agents/` for examples.

---

## 📞 Support

- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions
- **Docs**: Check `/docs` folder
- **Email**: Support contact here

---

## 📄 License

MIT License - feel free to use this project however you like!

---

## 🌟 Show Your Support

If you find this project helpful, please:
- ⭐ Star the repository
- 🍴 Fork it
- 📤 Share it with others

