# RoadWatch: Road Maintenance Report & Monitoring System

&gt;&gt; A user-friendly platform for citizens to report road maintenance issues

&gt;&gt; with photos and exact locations, while enabling LGUs to monitor,

&gt;&gt; manage, and resolve reports in a timely manner.

---

## Features

&gt;&gt; Mapping and pinning of road issues using Leaflet and OpenStreetMap

&gt;&gt; Account management and email verification via PHPMailer

&gt;&gt; Role-based functionality for LGU and Citizen users

&gt;&gt; Responsive interface built with Bootstrap 5

&gt;&gt; Hybrid Android app for mobile access

---

## Tech Stack

| Layer | Technology | Logo |
|:-----:|------------|:----:|
| Frontend | Bootstrap 5 | <img src="https://kimi-web-img.moonshot.cn/img/www.thebayacompany.com/f620c4c23c60089c203e2329c76b15056f5c35a5.png" height="40"> |
| Frontend | Leaflet | <img src="https://cdn.brandfetch.io/idtZo-YYcC/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B" height="40"> |
| Frontend | OpenStreetMap | <img src="https://kimi-web-img.moonshot.cn/img/lh7-rt.googleusercontent.com/d1f0188b4bcbad8ab745af2e47371d023333236a" height="40"> |
| Backend | PHP | <img src="https://kimi-web-img.moonshot.cn/img/upload.wikimedia.org/524825e2aa312576b5a284a2e36291ef461e52d3.png" height="40"> |
| Backend | PHPMailer | <img src="https://kimi-web-img.moonshot.cn/img/avatars.githubusercontent.com/bfe1799e23a1d06ff800385d10cf01d8118afb15" height="40"> |
| Mobile | Hybrid Android App | <img src="https://cdn.brandfetch.io/idkTFaEAWt/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B" height="40"> |
| Database | MySQL | <img src="https://kimi-web-img.moonshot.cn/img/1000logos.net/cd7c2257df68f7e5e367e66c9ac01dbc386efc93.png" height="40"> |

---

## Installation

### Prerequisites

- PHP &gt;= 8.0
- MySQL &gt;= 8.0
- Apache or Nginx Web Server
- Composer
- Android Studio (for mobile app)

### Setup

1. Clone the repository
   git clone https://github.com/Ven-Core/Roadwatch-Mandaue.git
   cd roadwatch

2. Install dependencies
   composer install

3. Configure environment
   cp config/config.example.php config/config.php
   Edit config.php with your database and SMTP credentials

4. Import database
   mysql -u root -p roadwatch &lt; database/roadwatch.sql

5. Set permissions
   chmod 755 uploads/
   chmod 644 config/config.php

6. Configure PHPMailer
   Update SMTP settings in config/config.php

7. Access the application
   Web: http://localhost/roadwatch

---

## Usage

### For Citizens

1. Register and verify your email
2. Click "Report Issue" on the map
3. Drop a pin on the exact location
4. Upload photos and describe the issue
5. Track your report status in real-time

### For LGUs

1. Login with LGU credentials
2. View all reports on the admin dashboard
3. Filter by status: Pending, In Progress, Resolved
4. Update report status and add resolution notes
5. Generate maintenance analytics reports

---

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Team

Developed by Team NovateX

---

## Acknowledgments

- OpenStreetMap for map data
- Leaflet.js for interactive mapping
- Bootstrap for UI components
- PHPMailer for email services

---

RoadWatch - Empowering communities to build safer roads, one report at a time.

Contact: team@novatex.dev
Website: www.roadwatch.app
