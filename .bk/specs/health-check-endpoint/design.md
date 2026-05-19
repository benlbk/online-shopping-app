# Health Check Endpoint Design

## System Architecture

### Components
- Health Controller - Handles HTTP requests
- Health Service - Aggregates health data
- Database Health Checker - Validates database connectivity
- Uptime Tracker - Tracks service uptime

### Data Flow
1. Client requests GET /health
2. Health Controller receives request
3. Health Service collects status data
4. Database Health Checker performs connection test
5. Response assembled and returned

## API Contract

```
GET /health

Responses:
200 OK
{
  "status": "healthy",
  "uptime_seconds": number,
  "database_connected": boolean
}

503 Service Unavailable
{
  "status": "unhealthy",
  "uptime_seconds": number,
  "database_connected": false
}
```

## Technical Decisions

### Database Health Check
- Use connection pool ping/test query
- Implement with timeout (max 2 seconds)
- Cache result for 30 seconds to prevent excess load

### Uptime Tracking
- Store service start time in memory
- Calculate uptime on each request

## Error Handling
- Timeout for database checks
- Graceful handling of unexpected errors
- Logging of health check failures

## Security Considerations
- No authentication required
- Rate limiting to prevent DoS
- No sensitive information exposure

## Performance
- Caching of database status
- Lightweight checks
- Minimal processing overhead