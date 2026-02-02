# MySQL Setup for SaaS Application

## Prerequisites

1. **Install MySQL Server**
   - Windows: Download from https://dev.mysql.com/downloads/mysql/
   - macOS: `brew install mysql`
   - Linux: `sudo apt-get install mysql-server`

2. **Start MySQL Service**
   - Windows: Start MySQL service from Services
   - macOS: `brew services start mysql`
   - Linux: `sudo systemctl start mysql`

## Database Setup

### Option 1: Quick Setup (Using Root User)

1. **Login to MySQL as root:**
   ```bash
   mysql -u root -p
   ```

2. **Run the setup script:**
   ```sql
   source setup-mysql.sql;
   ```

3. **Exit MySQL:**
   ```sql
   exit;
   ```

### Option 2: Create Dedicated User

1. **Login to MySQL as root:**
   ```bash
   mysql -u root -p
   ```

2. **Create database and user:**
   ```sql
   CREATE DATABASE saas_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'saas_user'@'localhost' IDENTIFIED BY 'saas_password';
   GRANT ALL PRIVILEGES ON saas_app.* TO 'saas_user'@'localhost';
   FLUSH PRIVILEGES;
   exit;
   ```

3. **Update .env file with your credentials:**
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=saas_user
   DB_PASSWORD=saas_password
   DB_NAME=saas_app
   ```

## Environment Configuration

Update your `.env` file with the correct database credentials:

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_NAME=saas_app

# Server Configuration
PORT=3001
NODE_ENV=development
```

## Initialize Database Schema

After setting up MySQL and configuring .env:

```bash
npm run init-db
```

This will create all tables and insert demo data.

## Start the Application

```bash
npm run dev
```

## Verify Setup

1. **Check database connection:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check demo data:**
   ```bash
   curl http://localhost:3001/api/v1/public/tenants
   ```

## Troubleshooting

### Connection Issues

1. **"Access denied" error:**
   - Check username/password in .env
   - Ensure MySQL user has proper permissions

2. **"Database doesn't exist" error:**
   - Run the setup-mysql.sql script
   - Or manually create the database

3. **"Connection refused" error:**
   - Ensure MySQL service is running
   - Check host/port in .env

### Common MySQL Commands

```sql
-- Show databases
SHOW DATABASES;

-- Use database
USE saas_app;

-- Show tables
SHOW TABLES;

-- Check table structure
DESCRIBE tenants;
DESCRIBE users;

-- View demo data
SELECT * FROM tenants;
SELECT * FROM users;
```

## Production Notes

- Change default passwords
- Use environment variables for sensitive data
- Enable SSL connections
- Set up proper backup strategy
- Configure connection pooling limits
- Monitor database performance