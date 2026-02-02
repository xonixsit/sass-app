-- MySQL Database Setup for SaaS Application
-- Run this script to create the database and user

-- Create database
CREATE DATABASE IF NOT EXISTS saas_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional - you can use root)
-- CREATE USER IF NOT EXISTS 'saas_user'@'localhost' IDENTIFIED BY 'saas_password';
-- GRANT ALL PRIVILEGES ON saas_app.* TO 'saas_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Use the database
USE saas_app;

-- Show that database is ready
SELECT 'MySQL database saas_app is ready!' as status;