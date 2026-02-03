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
├── src/
│   ├── config/             # Database, Redis, RabbitMQ, WebSocket configs
│   ├── models/             # MongoDB models
│   ├── services/           # Business logic services
│   ├── middleware/         # Express middleware
│   ├── validators/         # Request validation schemas
│   ├── controllers/        # Route controllers
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   ├── gateway/            # API Gateway entry point
│   └── worker/             # Worker service entry point
├── logs/                   # Application logs
├── tests/                  # Test files
├── .env.example            # Environment variables template
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

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/swiftpay/issues
- Email: support@swiftpay.com

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Authors

- SwiftPay Team

## Acknowledgments

- Built with Node.js and Express
- Powered by MongoDB, Redis, and RabbitMQ
- Real-time updates with Socket.IO