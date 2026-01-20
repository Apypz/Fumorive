```mermaid
graph TB
    subgraph "Client (Browser/Frontend)"
        A[React App]
        B[WebSocket Client]
        C[HTTP Client]
    end
    
    subgraph "FastAPI Backend - /api/v1"
        subgraph "Authentication Routes"
            D[POST /auth/register]
            E[POST /auth/login]
            F[POST /auth/refresh]
        end
        
        subgraph "Session Routes"
            G[POST /sessions]
            H[GET /sessions]
            I[PATCH /sessions/:id]
            J[DELETE /sessions/:id]
        end
        
        subgraph "WebSocket Routes"
            K[WS /ws/session/:id]
            L[WS /ws/monitor]
        end
        
        subgraph "Core Services"
            M[JWT Manager]
            N[Password Hash]
            O[WebSocket Manager]
        end
        
        subgraph "Dependencies"
            P[get_current_user]
            Q[require_admin]
        end
    end
    
    subgraph "Database - PostgreSQL + TimescaleDB"
        R[(users)]
        S[(sessions)]
        T[(eeg_data - Hypertable)]
        U[(face_events - Hypertable)]
        V[(game_events - Hypertable)]
        W[(alerts - Hypertable)]
    end
    
    subgraph "Pydantic Schemas"
        X[Auth Schemas]
        Y[User Schemas]
        Z[Session Schemas]
        AA[EEG Schemas]
    end
    
    %% Client to Backend
    A -->|HTTP POST/GET| C
    C -->|Auth| D
    C -->|Auth| E
    C -->|Auth| F
    C -->|Sessions| G
    C -->|Sessions| H
    C -->|Sessions| I
    C -->|Sessions| J
    
    A -->|WebSocket| B
    B -->|Real-time| K
    B -->|Monitor| L
    
    %% Authentication Flow
    D --> M
    E --> M
    E --> N
    F --> M
    M --> R
    N --> R
    
    %% Session Routes to DB
    G --> P
    H --> P
    I --> P
    J --> P
    P --> R
    G --> S
    H --> S
    I --> S
    J --> S
    
    %% WebSocket to Manager
    K --> O
    L --> O
    O --> T
    O --> U
    O --> V
    O --> W
    K --> S
    
    %% Schemas validation
    X -.validates.-> D
    X -.validates.-> E
    X -.validates.-> F
    Y -.validates.-> D
    Z -.validates.-> G
    Z -.validates.-> I
    AA -.validates.-> K
    
    %% Database relationships
    R -->|1:N| S
    S -->|1:N| T
    S -->|1:N| U
    S -->|1:N| V
    S -->|1:N| W
    
    style A fill:#4A90E2
    style K fill:#E24A4A
    style L fill:#E24A4A
    style O fill:#E2A24A
    style T fill:#50C878
    style U fill:#50C878
    style V fill:#50C878
    style W fill:#50C878
```

# System Architecture - Week 2 Tuesday Implementation

## Components Overview

### 1. Client Layer
- **React App**: Main frontend application
- **HTTP Client**: REST API calls for CRUD operations
- **WebSocket Client**: Real-time bidirectional communication

### 2. API Routes Layer (`/api/v1`)

#### Authentication Routes
- `POST /auth/register`: User registration
- `POST /auth/login`: OAuth2 login
- `POST /auth/refresh`: Token refresh

#### Session Routes
- `POST /sessions`: Create session
- `GET /sessions`: List sessions (paginated)
- `PATCH /sessions/:id`: Update session
- `DELETE /sessions/:id`: Delete session

#### WebSocket Routes
- `WS /ws/session/:id`: Session-specific streaming
- `WS /ws/monitor`: Global monitoring

### 3. Core Services
- **JWT Manager**: Token creation & verification
- **Password Hash**: Bcrypt password hashing
- **WebSocket Manager**: Connection lifecycle & broadcasting

### 4. Security & Dependencies
- **get_current_user**: Extract authenticated user from JWT
- **require_admin**: Role-based access control

### 5. Database Layer (PostgreSQL + TimescaleDB)
- **users**: User accounts
- **sessions**: Driving sessions
- **eeg_data**: Time-series EEG measurements (Hypertable)
- **face_events**: Face detection events (Hypertable)
- **game_events**: Game events (Hypertable)
- **alerts**: Fatigue alerts (Hypertable)

### 6. Data Validation (Pydantic Schemas)
- **Auth Schemas**: Token, Login, Register
- **User Schemas**: UserCreate, UserUpdate, UserResponse
- **Session Schemas**: SessionCreate, SessionUpdate, SessionResponse
- **EEG Schemas**: EEGDataPoint, FaceDetectionData, AlertData

## Data Flow

### Authentication Flow
1. Client sends credentials to `/auth/login`
2. Backend validates with Password Hash
3. JWT Manager creates access + refresh tokens
4. Tokens stored in database (users table)
5. Client receives tokens for future requests

### Session Management Flow
1. Client creates session via `/sessions`
2. Pydantic validates request data
3. Dependency extracts user from JWT token
4. Session stored in database
5. Response sent back with session ID

### Real-time Streaming Flow
1. Client connects to WebSocket `/ws/session/:id`
2. WebSocket Manager accepts connection
3. Client sends EEG/face/game data
4. Data validated and stored in TimescaleDB
5. Data broadcast to all session clients
6. Database persists for later analysis

## Security Layers

1. **JWT Authentication**: All protected routes require valid access token
2. **Password Hashing**: Bcrypt with automatic salt generation
3. **Role-Based Access**: Admin, Researcher, Student roles
4. **CORS Protection**: Configured allowed origins
5. **Input Validation**: Pydantic schemas validate all inputs
6. **SQL Injection Prevention**: SQLAlchemy ORM

## Performance Optimizations

1. **Batch EEG Insertion**: Multiple data points inserted in single transaction
2. **TimescaleDB Hypertables**: Optimized for time-series data
3. **WebSocket Connection Pooling**: Multiple clients per session
4. **Dead Connection Cleanup**: Automatic removal of disconnected clients
5. **Async Operations**: FastAPI async/await for concurrent requests

## Scalability Considerations

- Ready for Redis caching (session data, token blacklist)
- WebSocket manager supports multiple concurrent sessions
- Database indexing on critical fields (user_id, timestamp)
- Pagination for large dataset queries
- Automatic hypertable chunking (TimescaleDB)

---

**Status**: ✅ COMPLETE
**Next**: Week 2 Wednesday - Frontend State Management
