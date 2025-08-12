import pool from '../config/db.js';
import { HTTP } from '../utils/httpStatus.js';

export async function listItems(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM item_master ORDER BY item_name ASC'
    );
    res.status(HTTP.OK).json(rows);
  } catch (err) {
    next(err);
  }
}

export async function createItem(req, res, next) {
  try {
    // You can switch to stored procedures if needed; keeping simple insert stub for scaffold
    const { itemInfo, createdby } = req.body;
    console.log(req.body);

    const sql = `
     CALL InsertItemWithCustomCode(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      itemInfo.itemName,
      itemInfo.itemDescription,
      itemInfo.unitPrice,
      itemInfo.itemVatNo,
      itemInfo.itemPriceValidity,
      itemInfo.itemDelivery,
      itemInfo.itemPayTerms,
      itemInfo.itemRemarks,
      itemInfo.itemWarranty,
      itemInfo.itemWarrantyVoid,
      itemInfo.itemTaxesAndDuties,
      itemInfo.itemStockAvailability,
      createdby,
    ];

    const [result] = await pool.query(sql, params);
    res.status(HTTP.CREATED).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req, res, next) {
  try {
    const { id } = req.params; // item_code or numeric PK—confirm and keep consistent
    const patch = req.body;

    if (!Object.keys(patch).length) {
      return res
        .status(HTTP.BAD_REQUEST)
        .json({ error: 'No fields to update' });
    }

    const [result] = await pool.query(
      'UPDATE item_master SET ? WHERE item_code = ?',
      [patch, id]
    );

    if (result.affectedRows === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: 'Item not found' });
    }
    res.status(HTTP.OK).json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
}

export async function deleteItem(req, res, next) {
  try {
    const { id } = req.params;

    // Enforce FK safety by checking references (adjust column names to your schema)
    const [ref] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM quotation_items WHERE item_id = ?',
      [id]
    );
    if (ref[0].cnt > 0) {
      return res
        .status(HTTP.CONFLICT)
        .json({ error: 'Item is referenced in quotations' });
    }

    const [result] = await pool.query(
      'DELETE FROM item_master WHERE item_code = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: 'Item not found' });
    }
    res.status(HTTP.NO_CONTENT).send();
  } catch (err) {
    next(err);
  }
}
