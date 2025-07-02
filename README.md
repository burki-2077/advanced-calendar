# atNorth Visits Calendar

A Jira Cloud Forge application that provides a comprehensive calendar view for managing client visits and site appointments.

## 🚀 Features

### Calendar Views
- **Monthly View**: Full month calendar with continuous multi-day visit bars
- **Weekly View**: Detailed week view with time slots and visit scheduling
- **Responsive Design**: Optimized for desktop and mobile devices

### Visit Management
- **Multi-day Visits**: Continuous bars spanning multiple days
- **Visit Types**: Color-coded icons for different visit categories:
  - 🔵 **IA** - Internal atNorth (Blue)
  - 🟢 **EA** - External atNorth (Green) 
  - 🟠 **IC** - Internal Customer (Orange)
  - 🔴 **EC** - External Customer (Red)
- **Status Tracking**: Visual status indicators for visit progress
- **Smart Layout**: Automatic row assignment prevents overlapping events

### Data Integration
- **Jira Integration**: Seamlessly connects with Jira project data
- **Custom Fields**: Supports custom visit fields including:
  - Visit type (customfield_10996)
  - Site location (customfield_10066)
  - Customer name (customfield_10255)
  - Contact information (customfield_10256)
  - Visit times (customfield_10119, customfield_10799)

## 📋 Prerequisites

- Atlassian Forge CLI installed
- Jira Cloud instance
- Node.js (v14 or higher)
- npm or yarn package manager

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://bitbucket.org/xalt/atnorth-visits-calendar.git
cd atnorth-visits-calendar
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd static
npm install
cd ..
```

### 3. Build the Frontend
```bash
cd static
npm run build
cd ..
```

### 4. Deploy to Development
```bash
./deploy-to-dev.sh
```

### 5. Deploy to Production
```bash
./deploy-to-prod.sh
```

## 🏗️ Project Structure

```
atnorth-visits-calendar/
├── src/
│   ├── index.js              # Main Forge resolver
│   ├── components/
│   │   └── (visits calendar components)
│   └── services/
│       └── jiraService.js    # Jira API integration
├── static/
│   ├── src/
│   │   ├── App.js           # Main React application
│   │   ├── components/
│   │   │   ├── MonthlyCalendarView.jsx
│   │   │   ├── WeeklyCalendarView.jsx
│   │   │   └── VisitDetailsModal.jsx
│   │   ├── styles/
│   │   │   └── calendar.css
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   └── package.json
├── manifest.yml             # Forge app configuration
├── deploy-to-dev.sh        # Development deployment script
├── deploy-to-prod.sh       # Production deployment script
└── README.md
```

## ⚙️ Configuration

### Jira Project Settings
The app is configured to work with:
- **Project**: SUPPORT
- **Issue Type**: Visit
- **Custom Fields**:
  - `customfield_10996` - Type of visit
  - `customfield_10066` - Site location
  - `customfield_10255` - Customer name
  - `customfield_10256` - Contact name
  - `customfield_10119` - Visit start time
  - `customfield_10799` - Visit end time

### Environment Variables
No additional environment variables required. The app uses Forge's built-in authentication and API access.

## 🎨 Calendar Features

### Monthly View
- **Grid Layout**: 7-day week grid with proper date cells
- **Multi-day Events**: Continuous bars spanning multiple days
- **Row Management**: Automatic row assignment prevents overlaps
- **Dynamic Height**: Calendar weeks expand based on content
- **Visit Icons**: Color-coded type indicators on each visit
- **Status Colors**: Visual status representation (Waiting for approval, Approved, Rejected, In progress, Done, Reopened)

### Weekly View  
- **Time Slots**: Hourly breakdown from 8AM to 6PM
- **Business Days**: Monday through Friday focus
- **Multi-day Support**: Events spanning multiple days in the week
- **Detailed Information**: Customer, site, and time details

### Visit Types
| Type | Icon | Color | Description |
|------|------|-------|-------------|
| Internal atNorth | IA | Blue | Internal team visits |
| External atNorth | EA | Green | External atNorth visits |
| Internal Customer | IC | Orange | Customer internal visits |
| External Customer | EC | Red | Customer external visits |

## 🚀 Deployment

### Development Deployment
```bash
./deploy-to-dev.sh
```
This script:
1. Installs dependencies
2. Builds the React frontend
3. Deploys to Forge development environment

### Production Deployment
```bash
./deploy-to-prod.sh
```
This script:
1. Installs dependencies
2. Builds the React frontend
3. Deploys to Forge production environment

### Manual Deployment
```bash
# Build frontend
cd static && npm run build && cd ..

# Deploy with Forge CLI
forge deploy --environment development
# or
forge deploy --environment production
```

## 🧪 Development

### Local Development
```bash
# Install dependencies
npm install
cd static && npm install && cd ..

# Start frontend development server (for UI testing)
cd static
npm start
```

### Building Frontend
```bash
cd static
npm run build
```

### Linting
```bash
cd static
npm run lint
```

## 📊 Data Flow

1. **Jira Integration**: App fetches visit data from SUPPORT project
2. **Data Processing**: Events are processed and categorized
3. **Calendar Rendering**: Events are displayed in appropriate calendar views
4. **User Interaction**: Click events open detailed visit information

## 🔧 Troubleshooting

### Common Issues

**Events not displaying:**
- Verify Jira project permissions
- Check custom field IDs in configuration
- Ensure issue type "Visit" exists

**Calendar layout issues:**
- Clear browser cache
- Rebuild frontend: `cd static && npm run build`
- Redeploy app

**Deployment failures:**
- Check Forge CLI authentication: `forge login`
- Verify app permissions in manifest.yml
- Check build logs for errors

### Debug Mode
Enable console logging by checking browser developer tools. The app provides detailed logging for:
- Event processing
- Calendar rendering
- API responses

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Build frontend: `cd static && npm run build`
5. Commit changes: `git commit -am 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Create a Pull Request

## 📄 License

This project is proprietary software developed for atNorth by XALT.

## 🏢 About atNorth

atNorth is a leading provider of data center and cloud services. This calendar application helps manage client visits and site appointments across our facilities.

## 🛠️ Technical Stack

- **Backend**: Atlassian Forge (Node.js)
- **Frontend**: React 18
- **Styling**: CSS3 with Flexbox and Grid
- **Build Tool**: Create React App
- **API**: Jira REST API v3
- **Deployment**: Atlassian Forge CLI

## 📞 Support

For technical support or questions:
- Create an issue in this repository
- Contact the development team at XALT
- Refer to Atlassian Forge documentation

---

**Version**: 6.53.0  
**Last Updated**: December 2024  
**Developed by**: XALT for atNorth
