# Database Schema

## Core Entities

### Users
- Basic user information and authentication
- Role-based access control
- Profile assignment

### Upwork Profiles
- Skill-based profile definitions
- Niche specialization
- User assignments

### Reps
- Extended user information for sales reps
- Manager relationships
- Performance targets and goals

### Jobs
- Upwork job post details
- Categorization and tagging
- Fit analysis data

### Proposals
- Complete proposal lifecycle tracking
- AI and manual scoring
- Outcome tracking

### Reviews
- Detailed proposal analysis
- AI-generated feedback
- Improvement suggestions

### Activity Logs
- Daily activity tracking
- Challenge documentation
- Performance justification

### Coaching Insights
- Automated performance analysis
- Severity classification
- Actionable recommendations

### Benchmarks
- Scoring parameters
- Quality standards
- Profile-specific guidance

## Relationships

- User → Rep (one-to-one)
- User → UpworkProfile (many-to-one)
- Rep → Proposal (one-to-many)
- Job → Proposal (one-to-many)
- Proposal → ProposalReview (one-to-many)
- Rep → ActivityLog (one-to-many)
- User → CoachingInsight (one-to-many)