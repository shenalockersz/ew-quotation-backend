import pool from '../config/db.js';
import { HTTP } from '../utils/httpStatus.js';

// GET /v1/quotations/weekly-count
export async function weeklyQuotationCount(req, res, next) {
  try {
    const sql = `
      SELECT 
        s.sales_p_name,
        q.sp_code,
        COUNT(*) AS quotation_count
      FROM 
        pro_inv.quotations q
      JOIN 
        pro_inv.sales_p_master s ON q.sp_code = s.sales_p_code
      WHERE 
        YEARWEEK(q.quotation_date, 1) = YEARWEEK(CURDATE(), 1)
      GROUP BY 
        q.sp_code, s.sales_p_name;
    `;
    const [rows] = await pool.query(sql);
    res.status(HTTP.OK).json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /v1/quotations?cp_code=...
export async function listQuotations(req, res, next) {
  try {
    const { cp_code } = req.query;

    const [typeRows] = await pool.query(
      'SELECT sales_p_type FROM sales_p_master WHERE sales_p_code = ?',
      [cp_code]
    );
    const sales_p_type = typeRows.length > 0 ? typeRows[0].sales_p_type : null;

    let sql = `
      SELECT 
        q.*, 
        c.*,       
        s.*,
        sp.sales_p_name AS approved_by,
        p.sales_p_name AS created_by,
        CASE
            WHEN q.quotation_status = '1' THEN 'Saved'
            WHEN q.quotation_status = '2' THEN 'Pending Approval'
            WHEN q.quotation_status = '3' THEN 'Approved'
            WHEN q.quotation_status = '4' THEN 'Not Approved'
            ELSE q.quotation_status
        END AS quotation_status_display,
        SUM(qi.item_quantity * COALESCE(qi.quotation_unit_price, im.unit_price)* qi.quotation_item_vat/100 
            + qi.item_quantity * COALESCE(qi.quotation_unit_price, im.unit_price)) AS total_quotation_amount
      FROM quotations q
      JOIN sales_p_master p ON q.quotation_created_by = p.sales_p_code  
      LEFT JOIN sales_p_master sp ON q.quotation_approved_by = sp.sales_p_code      
      JOIN customer_master c ON q.c_code = c.cus_code        
      JOIN sales_p_master s ON q.sp_code = s.sales_p_code
      LEFT JOIN quotation_items qi ON q.quotation_code = qi.quotation_id_items
      LEFT JOIN item_master im ON qi.item_id = im.item_code
    `;
    const params = [];

    if (sales_p_type === 'M' && cp_code) {
      sql += ' WHERE (q.quotation_created_by = ? OR q.sp_code = ?) ';
      params.push(cp_code, cp_code);
    }

    sql += `
      GROUP BY 
        q.quotation_code, 
        q.quotation_date, 
        q.quotation_status, 
        c.cus_name, 
        s.sales_p_name, 
        sp.sales_p_name, 
        p.sales_p_name
      ORDER BY q.quotation_code DESC
    `;

    const [rows] = await pool.query(sql, params);
    res.status(HTTP.OK).json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /v1/quotations/by-month?cp_code=...
export async function listQuotationsByMonth(req, res, next) {
  try {
    const { cp_code } = req.query;
    if (!cp_code) {
      return res
        .status(HTTP.BAD_REQUEST)
        .json({ error: 'cp_code is required' });
    }

    const [typeRows] = await pool.query(
      'SELECT sales_p_type FROM sales_p_master WHERE sales_p_code = ?',
      [cp_code]
    );
    if (typeRows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: 'User not found.' });
    }
    const sales_p_type = typeRows[0].sales_p_type;

    let sql = `
      SELECT 
        q.*, 
        c.*,       
        s.*,
        sp.sales_p_name AS approved_by,
        p.sales_p_name AS created_by,
        CASE
          WHEN q.quotation_status = '1' THEN 'Saved'
          WHEN q.quotation_status = '2' THEN 'Pending Approval'
          WHEN q.quotation_status = '3' THEN 'Approved'
          WHEN q.quotation_status = '4' THEN 'Not Approved'
          ELSE q.quotation_status
        END AS quotation_status_display
      FROM quotations q
      JOIN sales_p_master p ON q.quotation_created_by = p.sales_p_code  
      LEFT JOIN sales_p_master sp ON q.quotation_approved_by = sp.sales_p_code      
      JOIN customer_master c ON q.c_code = c.cus_code        
      JOIN sales_p_master s ON q.sp_code = s.sales_p_code
      WHERE 
        MONTH(q.quotation_date) = MONTH(CURRENT_DATE) 
        AND YEAR(q.quotation_date) = YEAR(CURRENT_DATE)
    `;
    const params = [];

    if (sales_p_type === 'M') {
      sql += ' AND (q.quotation_created_by = ? OR q.sp_code = ?)';
      params.push(cp_code, cp_code);
    }

    sql += ' ORDER BY q.quotation_code DESC';

    const [rows] = await pool.query(sql, params);
    res.status(HTTP.OK).json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /v1/quotations/:quotationCode   (filters by quotation_id as in original)
export async function getQuotationByCode(req, res, next) {
  try {
    const { quotationCode } = req.params;

    const sql = `
      SELECT 
        q.*, 
        c.*, 
        i.*, 
        s.*,
        co.*,
        sp.sales_p_name AS approved_by_salesp_name,
        sp.sales_p_contact_no AS approved_by_salesp_contact_no,
        sp.sales_p_designation AS approved_by_salesp_designation,
        asig.approver_sig_image AS approver_signature,
        im.item_name,
        CASE
            WHEN q.quotation_status = '1' THEN 'Saved'
            WHEN q.quotation_status = '2' THEN 'Pending Approval'
            WHEN q.quotation_status = '3' THEN 'Approved'
            WHEN q.quotation_status = '4' THEN 'Not Approved'
            ELSE q.quotation_status
        END AS quotation_status_display,
        (i.quotation_item_vat * i.quotation_unit_price / 100) + i.quotation_unit_price AS price_with_vat,
        (i.quotation_item_vat * i.quotation_unit_price / 100) AS vat_price
      FROM 
        quotations q
      JOIN 
        customer_master c ON q.c_code = c.cus_code
      JOIN 
        company_master co ON q.comp_code = co.idcompany
      JOIN 
        quotation_items i ON q.quotation_code = i.quotation_id_items
      JOIN 
        item_master im ON i.item_id = im.item_code
      JOIN 
        sales_p_master s ON q.sp_code = s.sales_p_code
      LEFT JOIN 
        sales_p_master sp ON q.quotation_approved_by = sp.sales_p_code
      LEFT JOIN 
        approver_sig asig ON q.quotation_approved_by = asig.approver_id
      WHERE 
        q.quotation_id = ?;
    `;

    const [rows] = await pool.query(sql, [quotationCode]);
    if (rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: 'Quotation not found.' });
    }
    res.status(HTTP.OK).json(rows);
  } catch (err) {
    next(err);
  }
}

// POST /v1/quotations  (stored proc: CreateQuotation)
export async function createQuotation(req, res, next) {
  try {
    const dataToSend = req.body;
    const sql = 'CALL CreateQuotation(?, ?, ?, ?, ?, ?, ?)';
    const params = [
      dataToSend.customer,
      dataToSend.salesperson,
      dataToSend.quotationName,
      dataToSend.quotationCreated,
      dataToSend.quoationNote,
      dataToSend.company,
      JSON.stringify(dataToSend.items),
    ];
    const [result] = await pool.query(sql, params);
    res
      .status(HTTP.OK)
      .json({ message: 'Quotation created successfully', result });
  } catch (err) {
    next(err);
  }
}

// PUT /v1/quotations  (stored proc: UpdateQuotation)
export async function updateQuotation(req, res, next) {
  try {
    const dataToSend = req.body;
    const sql = 'CALL UpdateQuotation(?, ?, ?)';
    const params = [
      dataToSend.quotationCode,
      dataToSend.quotationName,
      JSON.stringify(dataToSend.items),
    ];
    const [result] = await pool.query(sql, params);
    res
      .status(HTTP.OK)
      .json({ message: 'Quotation created successfully', result });
  } catch (err) {
    next(err);
  }
}

// DELETE /v1/quotations (expects ?qcode=...; deletes items then quotation)
export async function deleteQuotation(req, res, next) {
  try {
    const quotation_code = req.query.qcode;
    if (!quotation_code) {
      return res
        .status(HTTP.BAD_REQUEST)
        .json({ error: 'quotation_code is required' });
    }

    const deleteItemsQuery = `
      DELETE FROM quotation_items
      WHERE quotation_id_items = ?;
    `;
    const deleteQuotationQuery = `
      DELETE FROM quotations
      WHERE quotation_code = ?;
    `;

    const [delItems] = await pool.query(deleteItemsQuery, [quotation_code]);
    if (delItems.affectedRows > 0) {
      const [delQuo] = await pool.query(deleteQuotationQuery, [quotation_code]);
      return res.status(HTTP.OK).json({
        message: 'Deletion successful',
        affectedRows: delQuo.affectedRows,
      });
    } else {
      return res.status(HTTP.NOT_FOUND).json({
        error: 'No quotation items found for the given quotation code.',
      });
    }
  } catch (err) {
    next(err);
  }
}

// PUT /v1/quotations/update/:quotationId  (approve/reject update)
export async function approveOrRejectQuotation(req, res, next) {
  try {
    const { quotationId } = req.params;
    const updatedData = req.body;

    const selectRejectedReasonSQL = `
      SELECT quotation_rejected_reason
      FROM quotations
      WHERE quotation_id = ?;
    `;
    const [sel] = await pool.query(selectRejectedReasonSQL, [quotationId]);
    if (sel.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: '' });
    }
    const existingRejectedReason = sel[0].quotation_rejected_reason;

    const sql = `
      UPDATE quotations
      SET
        quotation_status = ?,
        quotation_approved_date = CURDATE(),
        quotation_approved_by = ?,
        quotation_approved_reason = ?,
        quotation_rejected_reason = ?
      WHERE
        quotation_id = ?;
    `;
    const params = [
      updatedData.quotation_status,
      updatedData.approved_by,
      updatedData.approval_reason,
      updatedData.rejected_reason || existingRejectedReason,
      quotationId,
    ];
    const [upd] = await pool.query(sql, params);
    if (upd.affectedRows === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: 'Quotation not found.' });
    }
    res.status(HTTP.OK).json({ message: 'Data updated successfully' });
  } catch (err) {
    next(err);
  }
}

// PUT /v1/quotations/submit/:quotationId  (status only)
export async function submitQuotation(req, res, next) {
  try {
    const { quotationId } = req.params;
    const updatedData = req.body;

    const sql = `
      UPDATE quotations
      SET quotation_status = ?
      WHERE quotation_id = ?;
    `;
    const [upd] = await pool.query(sql, [
      updatedData.quotation_status,
      quotationId,
    ]);
    if (upd.affectedRows === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: 'Quotation not found' });
    }
    res.status(HTTP.OK).json({ message: 'Data updated successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /v1/quotations/counts?cp_code=...
export async function quotationCounts(req, res, next) {
  try {
    const { cp_code } = req.query;
    //console.log(req.query);

    const sqlQuery = `
       SELECT
    SUM(CASE WHEN quotation_status = 1 THEN 1 ELSE 0 END) AS status_1_count,
    SUM(CASE WHEN quotation_status = 2 THEN 1 ELSE 0 END) AS status_2_count,
    SUM(CASE WHEN quotation_status = 3 THEN 1 ELSE 0 END) AS status_3_count,
    SUM(CASE WHEN quotation_status = 4 THEN 1 ELSE 0 END) AS status_4_count,
    SUM(CASE WHEN quotation_status = 5 THEN 1 ELSE 0 END) AS status_5_count,
    SUM(CASE WHEN quotation_status = 6 THEN 1 ELSE 0 END) AS status_6_count,
    COUNT(*) AS total_count
FROM
    quotations
WHERE
    MONTH(quotation_date) = MONTH(CURRENT_DATE)
    AND YEAR(quotation_date) = YEAR(CURRENT_DATE)
    AND (
        (SELECT sales_p_type FROM sales_p_master WHERE sales_p_code = ?) = 'A'
        OR quotation_created_by = ?
        OR sp_code = ?
    );
    `;
    const [rows] = await pool.query(sqlQuery, [cp_code, cp_code, cp_code]);
    res.status(HTTP.OK).json(rows[0]);
  } catch (err) {
    next(err);
  }
}
