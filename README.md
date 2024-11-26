# IOUs - Personal Debt Tracking App

A Progressive Web Application (PWA) for tracking personal debts and IOUs with offline capabilities and multi-language support.

## Features

### Authentication
- Multiple sign-in methods:
  - Google Authentication
  - Email/Password Authentication
- Password reset functionality
- Secure user profile management

### Core Functionality
- Track debts you owe and are owed
- Manage contacts and their associated debts
- View total balance and financial summary
- Mark debts as paid
- Add due dates and track overdue payments
- Export data to CSV format

### Progressive Web App Features
- Works offline
- Installable on mobile devices
- Background sync when back online
- Push notifications support
- Responsive design for all devices

### Data Management
- Local-first architecture with IndexedDB
- Automatic background synchronization
- Conflict resolution for offline changes
- Secure data storage and transmission

### Internationalization
- Multi-language support:
  - English
  - French
- Dynamic language switching
- Localized date and currency formatting

## Technical Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **API**: Cloudflare Workers
- **Storage**: IndexedDB for offline data
- **PWA**: Service Workers for offline functionality

## Setup

1. **Firebase Configuration**
   Create a `.env` file with your Firebase configuration:
   ```
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_auth_domain
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   FIREBASE_APP_ID=your_app_id
   ```

2. **Cloudflare Worker**
   - Deploy the worker code to Cloudflare
   - Update the worker URL in `app.js`

3. **Local Development**
   - Serve the files using a local web server
   - CORS is configured for:
     - `localhost`
     - `127.0.0.1`
     - Local network IPs

## Project Structure

```
public/
├── index.html      # Main HTML file
├── app.js          # Core application logic
├── db.js           # IndexedDB and data management
├── sw.js           # Service Worker for PWA
├── translations.js # Internationalization
├── styles.css      # Application styles
└── manifest.json   # PWA manifest
```

## Security Features

- Secure token-based authentication
- CORS protection
- Data encryption in transit
- Secure offline data storage
- Protected API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact the development team.
