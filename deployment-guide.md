# Deployment Guide for Random Video Chat Website

## Overview
This guide outlines the steps to deploy the random video chat website (similar to Omegle) to production. The application consists of a Node.js/Express backend with Socket.IO for real-time communication, MongoDB for data storage, and a static frontend using WebRTC for video chat.

## Hosting Platform Recommendations

### Backend Hosting Options
1. **Heroku** (Recommended for simplicity)
   - Easy deployment with Git integration
   - Built-in SSL certificates
   - Supports WebSockets/Socket.IO
   - Free tier available, paid plans start at $7/month

2. **DigitalOcean App Platform**
   - $12/month minimum
   - Good performance for real-time apps
   - Automatic SSL

3. **AWS EC2/VPS**
   - More control, scalable
   - Use with PM2 for process management
   - Cost: $5-50/month depending on instance size

### Frontend Hosting Options
1. **Netlify** (Recommended)
   - Free tier for static sites
   - Automatic deployments from Git
   - Built-in CDN and SSL
   - Good for SPA deployment

2. **Vercel**
   - Similar to Netlify
   - Free tier available

3. **Same server as backend** (for simplicity)
   - Host static files on the same VPS/EC2 instance

## Database Setup (MongoDB Atlas)

1. Create a MongoDB Atlas account at mongodb.com
2. Create a new cluster (M0 free tier available)
3. Set up database user with read/write permissions
4. Whitelist IP addresses (0.0.0.0/0 for development, specific IPs for production)
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/database`

**Cost**: Free tier available, paid plans start at $9/month for basic cluster

## Environment Variables

Create a `.env` file in the backend root directory:

```
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/random-video-chat
NODE_ENV=production
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_SERVER_USERNAME=your-username
TURN_SERVER_CREDENTIAL=your-credential
```

For Heroku: Set these as config vars in dashboard.

## SSL Certificates

### Automatic SSL (Recommended)
- **Heroku/Netlify**: Automatic SSL certificates included
- **Let's Encrypt**: For VPS deployments, use Certbot
  - Install: `sudo apt install certbot`
  - Get certificate: `sudo certbot --nginx` (if using Nginx)

### Manual SSL
- Purchase from providers like Namecheap or use Cloudflare for free

## Code Changes for Production

### 1. CORS Configuration
Add to `backend/server.js`:

```javascript
const cors = require('cors');
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
  credentials: true
}));
```

Add `cors` to dependencies in `package.json`.

### 2. Security Headers
Add helmet middleware:

```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      mediaSrc: ["'self'", "blob:"],
    },
  },
}));
```

Add `helmet` to dependencies.

### 3. Environment Variable Usage
Update `backend/server.js` MongoDB connection:

```javascript
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/random-video-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

### 4. Process Management
For production, use PM2:
- Install: `npm install -g pm2`
- Start: `pm2 start backend/server.js --name "video-chat"`
- Configure ecosystem file for zero-downtime restarts

### 5. Logging
Add Winston or Morgan for production logging.

## WebRTC Requirements (STUN/TURN Servers)

### STUN Server
- Currently using Google's public STUN: `stun:stun.l.google.com:19302`
- For production, consider using your own or a service

### TURN Server (Required for NAT traversal)
- Essential for users behind strict firewalls
- Options:
  1. **Twilio TURN** (Paid): $0.004/minute
  2. **Xirsys**: $5/month for basic plan
  3. **Self-hosted**: Use Coturn on your VPS
     - Install: `sudo apt install coturn`
     - Configure with SSL and authentication

Update `public/script.js` configuration:

```javascript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: process.env.TURN_SERVER_USERNAME,
      credential: process.env.TURN_SERVER_CREDENTIAL
    }
  ]
};
```

## Deployment Checklist

- [ ] Set up domain name and DNS
- [ ] Choose and set up hosting platforms (backend + frontend)
- [ ] Create MongoDB Atlas cluster and get connection string
- [ ] Set up environment variables
- [ ] Configure SSL certificates
- [ ] Update code for production (CORS, security headers, env vars)
- [ ] Set up TURN server for WebRTC
- [ ] Test WebRTC functionality with TURN server
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Configure reverse proxy (if using VPS with Nginx)
- [ ] Set up monitoring and logging
- [ ] Test full application functionality
- [ ] Configure backups for database
- [ ] Set up auto-scaling if needed

## Potential Costs

### Minimum Cost Setup (Free/Basic Tiers)
- MongoDB Atlas: $0 (M0 free tier)
- Heroku Backend: $0 (free tier, limited hours)
- Netlify Frontend: $0 (free tier)
- Domain: $10-15/year
- **Total**: $10-15/year

### Basic Production Setup
- MongoDB Atlas: $9/month (M2 cluster)
- Heroku Backend: $7/month (eco dyno)
- Netlify Frontend: $0
- TURN Server (Xirsys): $5/month
- Domain: $10-15/year
- **Total**: ~$25/month + domain

### Scalable Setup
- MongoDB Atlas: $57/month (M10 cluster)
- DigitalOcean VPS: $12/month (App Platform)
- TURN Server (Twilio): Variable, ~$10-50/month depending on usage
- Domain: $10-15/year
- **Total**: ~$100+/month + domain

### Additional Costs
- SSL certificates: $0 (automatic) or $10-100/year (custom)
- CDN: $0-50/month (Cloudflare free tier available)
- Monitoring: $0-30/month (free tiers available)

## Post-Deployment Considerations
- Monitor server resources and scale as needed
- Implement rate limiting to prevent abuse
- Set up automated backups
- Consider implementing user authentication for better moderation
- Monitor WebRTC connection success rates
- Plan for GDPR/CCPA compliance if collecting user data