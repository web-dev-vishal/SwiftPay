# SwiftPay - Instant Payout System

A production-ready instant payout system built with Node.js, Express, MongoDB, RabbitMQ, Redis, and WebSockets.

## Architecture

SwiftPay is a microservices-based payment processing system with the following components:

- **API Gateway**: RESTful API for payout requests
- **Worker Service**: Background processing of payout transactions
- **MongoDB**: Persistent storage for transactions and users
- **Redis**: Distributed locking, caching, and rate limiting
- **RabbitMQ**: Message queue for reliable async processing
- **WebSocket**: Real-time notifications to clients

## Features

- ✅ Distributed locking to prevent concurrent requests
- ✅ Double-entry balance validation
- ✅ Manual message acknowledgment for reliability
- ✅ Idempotency handling
- ✅ Real-time WebSocket notifications
- ✅ Rate limiting (global and per-user)
- ✅ Comprehensive error handling
- ✅ Audit logging
- ✅ Health check endpoints
- ✅ Graceful shutdown
- ✅ Docker containerization
- ✅ Horizontal scalability

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- npm 10+

## Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/web-dev-vishal/SwiftPay
cd swiftpay
```

### 2. Create environment file
```bash
cp .env.example .env
```

### 3. Start all services
```bash
docker-compose up -d
```

### 4. Check service health
```bash
docker-compose ps
```

### 5. Access the services

- **API Gateway**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (swiftpay / SwiftPay@RabbitMQ2024)
- **Mongo Express**: http://localhost:8081 (admin / admin123)

## API Endpoints

### Health Check
```bash
GET /api/health
GET /api/health/detailed
GET /api/health/ready
GET /api/health/live
```

### Create Payout
```bash
POST /api/payout
Content-Type: application/json

{
  "userId": "user_001",
  "amount": 100.50,
  "currency": "USD",
  "description": "Payout for services"
}
```

Response:
```json
{
  "success": true,
  "transactionId": "TXN_LX3Z8K9_A1B2C3D4E5F6G7H8",
  "status": "initiated",
  "amount": 100.5,
  "currency": "USD",
  "message": "Payout request initiated successfully"
}
```

### Get Transaction Status
```bash
GET /api/payout/:transactionId
```

### Get User Balance
```bash
GET /api/payout/user/:userId/balance
```

### Get Transaction History
```bash
GET /api/payout/user/:userId/history?limit=50&status=completed
```

## WebSocket Events

Connect to WebSocket server:
```javascript
const socket = io('http://localhost:3000');

// Authenticate
socket.emit('authenticate', {
  userId: 'user_001',
  token: 'your-token'
});

// Listen for events
socket.on('PAYOUT_INITIATED', (data) => {
  console.log('Payout initiated:', data);
});

socket.on('PAYOUT_PROCESSING', (data) => {
  console.log('Payout processing:', data);
});

socket.on('PAYOUT_COMPLETED', (data) => {
  console.log('Payout completed:', data);
});

socket.on('PAYOUT_FAILED', (data) => {
  console.log('Payout failed:', data);
});
```

## Development

### Local Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start infrastructure services:
```bash
docker-compose up -d mongodb redis rabbitmq mongo-express
```

3. Start API Gateway:
```bash
npm run dev:gateway
```

4. Start Worker Service (in another terminal):
```bash
npm run dev:worker
```

### Run Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Project Structure
```
swiftpay/
├── docker/                  # Docker configuration files
│   ├── Dockerfile.gateway   # API Gateway Dockerfile
│   ├── Dockerfile.worker    # Worker Service Dockerfile
│   └── mongo-init.js        # MongoDB initialization script
├── src/
│   ├── config/             # Database, Redis, RabbitMQ, WebSocket configs
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── rabbitmq.js
│   │   └── websocket.js
│   ├── models/             # MongoDB models
│   │   ├── Transaction.js
│   │   ├── User.js
│   │   └── AuditLog.js
│   ├── services/           # Business logic services
│   │   ├── lockService.js
│   │   ├── balanceService.js
│   │   ├── payoutService.js
│   │   └── notificationService.js
│   ├── middleware/         # Express middleware
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── validator.js
│   ├── validators/         # Request validation schemas
│   │   └── payoutValidator.js
│   ├── controllers/        # Route controllers
│   │   ├── payoutController.js
│   │   └── healthController.js
│   ├── routes/             # API routes
│   │   ├── payoutRoutes.js
│   │   └── healthRoutes.js
│   ├── utils/              # Utility functions
│   │   ├── logger.js
│   │   ├── idGenerator.js
│   │   └── constants.js
│   ├── gateway/            # API Gateway entry point
│   │   └── server.js
│   └── worker/             # Worker service entry point
│       └── worker.js
├── logs/                   # Application logs
├── tests/                  # Test files
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore file
├── docker-compose.yml      # Docker services configuration
├── package.json            # NPM dependencies
└── README.md              # This file
```

## Scaling

### Horizontal Scaling

Scale worker services:
```bash
docker-compose up -d --scale worker-service=5
```

Scale API Gateway (requires load balancer):
```bash
docker-compose up -d --scale api-gateway=3
```

### Production Deployment

1. Use environment-specific .env files
2. Enable TLS/SSL certificates
3. Configure proper firewall rules
4. Set up monitoring and alerting
5. Use managed services for MongoDB, Redis, RabbitMQ
6. Implement CI/CD pipeline
7. Use Kubernetes for orchestration

## Monitoring

### Logs

View API Gateway logs:
```bash
docker-compose logs -f api-gateway
```

View Worker Service logs:
```bash
docker-compose logs -f worker-service
```

View all logs:
```bash
docker-compose logs -f
```

### Metrics

Access Prometheus metrics (if enabled):
```bash
GET /metrics
```

## Troubleshooting

### Service won't start

Check service logs:
```bash
docker-compose logs [service-name]
```

### Connection errors

Verify all services are healthy:
```bash
docker-compose ps
curl http://localhost:3000/api/health/detailed
```

### Messages stuck in queue

Check RabbitMQ Management UI:
http://localhost:15672

### Balance inconsistencies

Check MongoDB and Redis data:
- Mongo Express: http://localhost:8081
- Redis CLI: `docker exec -it swiftpay_redis redis-cli -a SwiftPay@Redis2024`

## Security Considerations

- Change all default passwords in production
- Use JWT authentication for API endpoints
- Enable HTTPS/TLS
- Implement input sanitization
- Use environment variables for secrets
- Enable MongoDB authentication
- Configure RabbitMQ SSL
- Use Redis AUTH
- Implement rate limiting
- Add API key validation
- Enable CORS properly

## Environment Variables

### Application Settings
- `NODE_ENV`: Environment (development/production)
- `API_PORT`: API Gateway port (default: 3000)
- `WORKER_INSTANCES`: Number of worker instances

### MongoDB Settings
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_USER`: MongoDB username
- `MONGODB_PASSWORD`: MongoDB password

### Redis Settings
- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port
- `REDIS_PASSWORD`: Redis password
- `REDIS_DB`: Redis database number

### RabbitMQ Settings
- `RABBITMQ_URL`: RabbitMQ connection URL
- `RABBITMQ_USER`: RabbitMQ username
- `RABBITMQ_PASSWORD`: RabbitMQ password
- `RABBITMQ_QUEUE`: Queue name
- `RABBITMQ_EXCHANGE`: Exchange name
- `RABBITMQ_ROUTING_KEY`: Routing key

### Rate Limiting
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window
- `USER_RATE_LIMIT_MAX_REQUESTS`: Maximum requests per user

### Lock Settings
- `LOCK_TTL_MS`: Lock time-to-live in milliseconds
- `LOCK_RETRY_DELAY_MS`: Lock retry delay
- `LOCK_RETRY_COUNT`: Maximum lock retry attempts

### Payout Processing
- `PAYOUT_PROCESSING_DELAY_MS`: Simulated processing delay
- `MAX_PAYOUT_AMOUNT`: Maximum payout amount
- `MIN_PAYOUT_AMOUNT`: Minimum payout amount

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Coverage Report
```bash
npm run test:coverage
```

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/web-dev-vishal/SwiftPay/issues
- Email: support@swiftpay.com

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Keep commits atomic and descriptive

## Authors

- SwiftPay Team

## Acknowledgments

- Built with Node.js and Express
- Powered by MongoDB, Redis, and RabbitMQ
- Real-time updates with Socket.IO
- Inspired by modern payment processing systems

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Core payout processing functionality
- Distributed locking mechanism
- Real-time WebSocket notifications
- Rate limiting and security features
- Docker containerization
- Comprehensive error handling
- Audit logging

## Roadmap

- [ ] Add support for multiple currencies
- [ ] Implement webhook notifications
- [ ] Add advanced fraud detection
- [ ] Support scheduled payouts
- [ ] Implement batch processing
- [ ] Add GraphQL API
- [ ] Implement OAuth2 authentication
- [ ] Add Prometheus metrics
- [ ] Implement circuit breaker pattern
- [ ] Add support for refunds and reversals

I'll see you in the next one! 🚀