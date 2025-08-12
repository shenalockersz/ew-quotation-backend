import pool from '../config/db.js';
import { HTTP } from '../utils/httpStatus.js';

export async function hello(req, res) {
  res.status(HTTP.OK).json({ message: 'Hello World!!' });
}

export async function health(req, res) {
  res.status(HTTP.OK).json({ status: 'ok', uptime: process.uptime() });
}

// GET /v1/api/company
export async function getCompany(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM pro_inv.company_master;');
    res.status(HTTP.OK).json(rows);
  } catch (err) {
    next(err);
  }
}

// POST /v1/api/login  (plaintext as in original; no changes yet)
export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const sql = `
      SELECT u.* , s.* 
      FROM users u 
      JOIN sales_p_master s ON u.user_salesp_code = s.sales_p_code 
      WHERE user_username = ? AND user_password = ?
    `;
    const [rows] = await pool.query(sql, [username, password]);
    if (rows.length === 0) {
      return res
        .status(HTTP.OK)
        .json({ message: 'Login Failed', success: false });
    }
    const userData = rows[0];
    res
      .status(HTTP.OK)
      .json({ message: 'Login successful', success: true, user: userData });
  } catch (err) {
    next(err);
  }
}

// POST /v1/api/change-password  (plaintext as in original; no changes yet)
export async function changePassword(req, res, next) {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    const [rows] = await pool.query(
      'SELECT user_password FROM pro_inv.users WHERE user_id = ?',
      [userId]
    );
    if (rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ message: 'User not found.' });
    }

    const storedPassword = rows[0].user_password;
    if (storedPassword !== currentPassword) {
      return res
        .status(HTTP.OK)
        .json({ message: 'Current password is incorrect.' });
    }

    await pool.query(
      'UPDATE pro_inv.users SET user_password = ? WHERE user_id = ?',
      [newPassword, userId]
    );

    res
      .status(HTTP.OK)
      .json({ message: 'Password changed successfully.', success: true });
  } catch (err) {
    next(err);
  }
}
