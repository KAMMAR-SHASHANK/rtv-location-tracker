require('dotenv').config(); // Import dotenv to access environment variables
const { Sequelize } = require('sequelize');

// Create a Sequelize instance and connect to the MySQL database
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'gltdb',
  process.env.MYSQL_USER || 'dfs',
  process.env.MYSQL_PASSWORD || 'password',
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,  // ← add this line
    dialect: 'mysql',
    logging: false,
  }
);

// Function to test the database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected successfully with Sequelize');
  } catch (error) {
    console.error('Error connecting to MySQL:', error);
    process.exit(1); // Exit if connection fails
  }
};

module.exports = { sequelize, connectDB };
