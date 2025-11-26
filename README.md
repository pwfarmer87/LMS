# AI Faculty LMS

An AI-powered Learning Management System designed specifically for faculty to streamline course development and teaching.

## Features

### AI-Powered Course Development
- **AI Course Builder**: Generate complete course outlines, modules, and content with AI assistance
- **Smart Content Generation**: Create lecture notes, quizzes, and assignments automatically
- **Curriculum Suggestions**: AI-powered recommendations based on learning objectives

### AI Teaching Assistant
- **Automated Grading**: AI-assisted grading with detailed feedback
- **Student Q&A**: AI handles common student questions 24/7
- **Progress Analytics**: Smart insights into student performance
- **Content Recommendations**: Personalized learning paths for students

### Multi-Course Management
- **Unified Dashboard**: Manage all courses from a single interface
- **Template Library**: Reuse successful course materials
- **Bulk Operations**: Handle multiple courses efficiently

### Core LMS Features
- Course creation and management
- Assignment and quiz management
- Student enrollment and tracking
- Grade management
- Discussion forums
- Resource library

## Tech Stack

- **Frontend**: React 18 with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: SQLite (easily upgradeable to PostgreSQL)
- **AI Integration**: OpenAI API

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd LMS
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Configure environment variables:
```bash
cp server/.env.example server/.env
# Edit .env with your OpenAI API key and other settings
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`
The backend API will be available at `http://localhost:3001`

## Project Structure

```
LMS/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── hooks/         # Custom React hooks
│   │   └── types/         # TypeScript types
│   └── ...
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Express middleware
│   │   └── ai/            # AI integration
│   └── ...
└── ...
```

## License

MIT License
