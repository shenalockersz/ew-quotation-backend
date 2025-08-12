import pool from '../config/db.js';
import { HTTP } from '../utils/httpStatus.js';

// POST /v1/salespersons  (stored proc: InsertSPWithCustomCode)
export async function insertSalesperson(req, res, next) {
  try {
    const {
      sales_p_name,
      sales_p_email,
      sales_p_contact_no,
      sales_p_designation,
      sales_p_type,
    } = req.body;

    const sql = 'CALL InsertSPWithCustomCode(?, ?, ?, ?, ?)';
    await pool.query(sql, [
      sales_p_name,
      sales_p_email,
      sales_p_contact_no,
      sales_p_designation,
      sales_p_type,
    ]);

    res.status(HTTP.OK).json({ message: 'Data inserted successfully.' });
  } catch (err) {
    next(err);
  }
}

// GET /v1/salespersons
export async function listSalespersons(req, res, next) {
  try {
    const sql = `
      SELECT
        sales_p_code,
        sales_p_name,
        sales_p_email,
        sales_p_contact_no,
        sales_p_designation,
        CASE
          WHEN sales_p_type = 'A' THEN 'Approver'
          WHEN sales_p_type = 'M' THEN 'Member'
          ELSE sales_p_type
        END AS sales_p_type_display
      FROM pro_inv.sales_p_master
    `;
    const [rows] = await pool.query(sql);
    res.status(HTTP.OK).json(rows);
  } catch (err) {
    next(err);
  }
}

// PUT /v1/salespersons/:id  (by sales_p_code)
export async function updateSalesperson(req, res, next) {
  try {
    const { id } = req.params;
    const updatedSalesperson = req.body;
    const [result] = await pool.query(
      'UPDATE pro_inv.sales_p_master SET ? WHERE sales_p_code = ?',
      [updatedSalesperson, id]
    );
    if (result.affectedRows === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: 'Not found' });
    }
    res.status(HTTP.OK).json({ message: 'Salesperson updated successfully' });
  } catch (err) {
    next(err);
  }
}

// DELETE /v1/salespersons/:id  (blocks if quotations exist with sp_code)
export async function deleteSalesperson(req, res, next) {
  try {
    const { id } = req.params;

    const [ref] = await pool.query(
      'SELECT COUNT(*) AS count FROM quotations WHERE sp_code = ?',
      [id]
    );
    if (ref[0].count > 0) {
      return res
        .status(HTTP.CONFLICT)
        .json({ message: 'Cannot delete salesperson with related records' });
    }

    const [del] = await pool.query(
      'DELETE FROM pro_inv.sales_p_master WHERE sales_p_code = ?',
      [id]
    );
    if (del.affectedRows === 0) {
      return res
        .status(HTTP.NOT_FOUND)
        .json({ message: 'Salesperson not found' });
    }

    res.status(HTTP.OK).json({ message: 'Salesperson deleted successfully' });
  } catch (err) {
    next(err);
  }
}
