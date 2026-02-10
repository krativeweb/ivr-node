import mysql from "mysql2/promise";

export const conn = mysql.createPool({
  host: "193.203.184.86",
  user: "u174778840_ivrai",
  password: "s6:N/D!>^>H",
  database: "u174778840_ivrai",
  waitForConnections: true,
  connectionLimit: 10
});

(async () => {
  try {
    const connection = await conn.getConnection();
    console.log("✅ MySQL connected successfully");
    connection.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    process.exit(1);
  }
})();

