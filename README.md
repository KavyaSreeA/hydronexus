# HydroNexus - Smart Flood Prediction & Drainage Monitoring System

HydroNexus is a comprehensive smart flood prediction and drainage monitoring system that provides real-time alerts and helps authorities detect blockage-prone areas to prevent urban flooding.

## Features

🌊 **Real-time Flood Prediction**
- Advanced monitoring of drainage nodes
- Siltation level detection
- Predictive analytics for flood risks

🚨 **Dual Interface System**
- **Citizen Interface**: Emergency alerts, reporting, and community updates
- **Administrative Dashboard**: Infrastructure management, analytics, and control

📊 **Smart Analytics**
- Historical data analysis
- Trend identification
- Preventative maintenance scheduling

🛡️ **Proactive Management**
- Transition from reactive disaster relief to preventative maintenance
- Cost-effective infrastructure monitoring
- Regional resilience enhancement

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript, Leaflet.js, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: In-memory (no MongoDB required)
- **Real-time**: Socket.IO
- **Authentication**: JWT with bcryptjs

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd hydroNexus

# Install dependencies
npm install

# Start the server
npm start
```

Open http://localhost:3000 in your browser.

### Default Login Credentials
- **Email**: admin@hydronexus.com
- **Password**: admin123

## Project Structure

```
hydroNexus/
├── public/                 # Static files
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side JavaScript
│   └── images/            # Static images
├── views/                 # HTML pages
├── models/                # Data models
├── routes/                # API routes
├── controllers/           # Route handlers
├── middleware/            # Auth & error handling
├── utils/                 # Database & utilities
├── server.js              # Main server file
└── package.json           # Dependencies
```

## Deployment

### Deploy to Vercel
```bash
npm i -g vercel
vercel
```

### Deploy to Render
1. Push code to GitHub
2. Connect repo to Render
3. Use `npm start` as start command

### Deploy to Heroku
```bash
heroku create
git push heroku main
```

### Environment Variables
Copy `.env.example` to `.env` and set:
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - development or production
- `CORS_ORIGIN` - Allowed origins (* for all)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/drainage` | GET | Get drainage nodes |
| `/api/alerts/active` | GET | Get active alerts |
| `/api/citizen/reports` | POST | Submit citizen report |
| `/api/admin/stats` | GET | Admin statistics |

## Usage

1. **Citizen Interface** (`/citizen`)
   - View flood alerts
   - Report drainage issues
   - Access emergency information

2. **Admin Dashboard** (`/admin`)
   - Monitor drainage nodes
   - Manage alerts
   - View analytics and reports

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

Built with ❤️ for urban flood resilience