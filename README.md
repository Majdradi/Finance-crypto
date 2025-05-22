# Financial Research & Portfolio Monitor

A mobile application that combines financial research and portfolio monitoring capabilities, built with React Native and FastAPI.

## Features

- **Market Research Dashboard**: Real-time market data, quotes, and news aggregation
- **Portfolio Tracking**: Track your investments and visualize performance
- **AI-Powered Insights**: Summarized news and pattern detection
- **User Authentication**: Secure login and registration system
- **Alerts and Notifications**: Set price alerts for your tracked assets

## Tech Stack

- **Frontend**: React Native (for cross-platform mobile app)
- **Backend**: FastAPI (Python) for server-side logic
- **Database**: MongoDB for data storage
- **Authentication**: JWT-based authentication
- **Visualization**: Chart.js for data visualization

## Installation

### Prerequisites

- Node.js and npm/yarn
- Python 3.8+
- MongoDB

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Start the server:
   ```
   uvicorn server:app --host 0.0.0.0 --port 8001
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   yarn install
   ```

3. Start the development server:
   ```
   yarn start
   ```

## Building for Android

To build the Android APK:

1. Make sure you have the Android SDK and Gradle installed
2. Run the build script:
   ```
   ./build-android.sh
   ```

Alternatively, you can use Expo EAS Build:

1. Install EAS CLI:
   ```
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```
   eas login
   ```

3. Build for Android:
   ```
   eas build -p android --profile preview
   ```

## API Documentation

The backend API includes endpoints for:

- User authentication (login/register)
- Market data retrieval
- Portfolio management
- News aggregation
- Alerts and notifications

API documentation is available at `/docs` when the backend server is running.
