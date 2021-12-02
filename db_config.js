const mysql = require("mysql2");
require("dotenv").config();

const connection = mysql.createPool({
  host: process.env.REACT_APP_MYSQL_HOST,
  user: process.env.REACT_APP_MYSQL_USER,
  password: process.env.REACT_APP_MYSQL_PWD,
  database: process.env.REACT_APP_MYSQL_DB,
});

module.exports = connection;
