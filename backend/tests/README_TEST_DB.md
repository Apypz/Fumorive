# Test Database Setup

## PostgreSQL Test Database

### 1. Create Test Database

Run this command in PostgreSQL (psql or pgAdmin):

```sql
CREATE DATABASE fumorive_test;
```

Or use the provided SQL script:

```bash
psql -U postgres -f tests/setup_test_db.sql
```

### 2. Test Database Configuration

**Database URL**: `postgresql://postgres:postgres@localhost:5432/fumorive_test`

Update credentials in `tests/conftest.py` if your PostgreSQL has different:
- Username (default: `postgres`)
- Password (default: `postgres`)  
- Port (default: `5432`)

### 3. Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=app --cov-report=html

# Run only unit tests (fast)
pytest -m unit

# Run only integration tests
pytest -m integration
```

### 4. Test Database Management

**Automatic**: Pytest handles table creation/cleanup
- Tables created once at session start
- Each test runs in isolated transaction (rollback after test)
- Tables dropped at session end

**Manual cleanup** (if needed):
```sql
DROP DATABASE fumorive_test;
CREATE DATABASE fumorive_test;
```

### 5. Environment Variables (Optional)

Create `.env.test` for test-specific config:

```env
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fumorive_test
```

Then update `conftest.py` to load from env:
```python
from dotenv import load_dotenv
load_dotenv('.env.test')
TEST_DATABASE_URL = os.getenv('TEST_DATABASE_URL')
```

## Troubleshooting

**Error: database "fumorive_test" does not exist**
→ Run setup_test_db.sql first

**Error: UUID type not found**
→ Enable uuid-ossp extension in test database

**Error: permission denied**
→ Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE fumorive_test TO postgres;`

**Slow tests**
→ Make sure PostgreSQL is running locally (not remote)
→ Consider using connection pooling
