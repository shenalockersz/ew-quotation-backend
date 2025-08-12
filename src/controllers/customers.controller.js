import pool from '../config/db.js';
import { HTTP } from '../utils/httpStatus.js';

// POST /v1/customers  (stored proc: InsertCustomerWithCustomCode)
export async function insertCustomer(req, res, next) {
  try {
    const datatosend = req.body;
    const sql = 'CALL InsertCustomerWithCustomCode(?, ?, ?, ?, ?, ?, ?)';
    const params = [
      datatosend.customerInfo.customerName,
      datatosend.customerInfo.customerAddress,
      datatosend.customerInfo.vatNo,
      datatosend.customerInfo.contactPerson,
      datatosend.customerInfo.contactPersonNumber,
      datatosend.customerInfo.customerDetails,
      datatosend.createdby,
    ];
    await pool.query(sql, params);
    res.status(HTTP.OK).json({ message: 'Data inserted successfully.' });
  } catch (err) {
    next(err);
  }
}

// GET /v1/customers?cp_code=...
export async function listCustomers(req, res, next) {
  try {
    const { cp_code } = req.query;

    const [typeRows] = await pool.query(
      'SELECT sales_p_type FROM sales_p_master WHERE sales_p_code = ?',
      [cp_code]
    );
    const sales_p_type = typeRows.length > 0 ? typeRows[0].sales_p_type : null;

    let sql = `
      SELECT 
        c.*,     
        p.sales_p_name AS created_by
      FROM customer_master c
      JOIN sales_p_master p ON c.created_by = p.sales_p_code
    `;
    const params = [];

    if (sales_p_type === 'M' && cp_code) {
      sql += ' WHERE (c.created_by = ?) ';
      params.push(cp_code);
    }

    sql += ' ORDER BY c.cus_name ASC';

    const [rows] = await pool.query(sql, params);
    res.status(HTTP.OK).json(rows);
  } catch (err) {
    next(err);
  }
}

// PUT /v1/customers/:id   (updates by cus_id)
export async function updateCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const updatedCustomer = req.body;
    const [result] = await pool.query(
      'UPDATE customer_master SET ? WHERE cus_id = ?',
      [updatedCustomer, id]
    );
    if (result.affectedRows === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: 'Customer not found' });
    }
    res.status(HTTP.OK).json({ message: 'Customer updated successfully' });
  } catch (err) {
    next(err);
  }
}

// DELETE /v1/customers/:id  (checks quotations.c_code, deletes by cus_code)
export async function deleteCustomer(req, res, next) {
  try {
    const customerId = req.params.id;

    const [refRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM quotations WHERE c_code = ?',
      [customerId]
    );
    const referencesCount = refRows[0].count;

    if (referencesCount > 0) {
      return res.status(HTTP.CONFLICT).json({
        message: 'Customer is associated with other data, cannot delete',
      });
    }

    const [del] = await pool.query(
      'DELETE FROM customer_master WHERE cus_code = ?',
      [customerId]
    );

    if (del.affectedRows === 0) {
      return res.status(HTTP.NOT_FOUND).json({ message: 'Customer not found' });
    }

    res.status(HTTP.OK).json({ message: 'Customer deleted successfully' });
  } catch (err) {
    next(err);
  }
}
