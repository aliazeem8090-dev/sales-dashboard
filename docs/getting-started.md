# Getting Started

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key

## Installation

1. **Clone and setup the project:**
   ```bash
   cd sales-dashboard
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure your environment variables
   npm run build
   ```

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env.local  # Configure your environment variables
   npm run build
   ```

4. **Setup Database:**
   ```bash
   cd ../database
   npm install
   npx prisma generate
   npx prisma db push
   ```

## Environment Configuration

### Backend (.env)
```
DATABASE_URL="postgresql://username:password@localhost:5432/sales_dashboard"
JWT_SECRET="your-jwt-secret"
OPENAI_API_KEY="your-openai-api-key"
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=sales_dashboard
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## Running the Application

1. **Start the Backend:**
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Development Workflow

### Phase 1: Tracking MVP
- [ ] User authentication
- [ ] Daily activity logging
- [ ] Proposal submission
- [ ] Basic dashboard
- [ ] Connect tracking

### Phase 2: Proposal Intelligence
- [ ] AI proposal review
- [ ] Scoring system
- [ ] Feedback generation
- [ ] Manager overrides

### Phase 3: Advanced Insights
- [ ] Chat assistant
- [ ] Automated insights
- [ ] Performance analytics
- [ ] Template library

## Team Profiles Setup

The system supports these specialized profiles:
- **Waqas**: PHP Laravel + MERN
- **Abdullah**: MERN
- **Shayan Abbasi**: AI/ML Python
- **Anum**: AI/ML, Laravel, PHP, MERN, WordPress
- **Nammrah**: AI/ML Python
- **Aleem**: PHP Laravel
- **Zainab**: MERN

Each profile has customized scoring rubrics and AI prompts.