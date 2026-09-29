import { Request, Response } from 'express';
import { pool, memoryStore, getDbStatus } from '../../config/db';

// Helper to calculate stock status based on quantity and threshold
const calculateStatus = (qty: number, threshold: number, explicitStatus?: string) => {
  if (explicitStatus && ['Discontinued'].includes(explicitStatus)) {
    return explicitStatus;
  }
  if (qty <= 0) return 'Out of Stock';
  if (qty <= threshold) return 'Low Stock';
  return 'In Stock';
};

export const getAllInventory = async (req: Request, res: Response) => {
  try {
    const { search, status, category, sortBy, sortOrder } = req.query;

    if (getDbStatus()) {
      let sql = 'SELECT * FROM inventory WHERE 1=1';
      const params: any[] = [];

      if (status && status !== 'All') {
        sql += ' AND status = ?';
        params.push(status);
      }

      if (category && category !== 'All') {
        sql += ' AND category = ?';
        params.push(category);
      }

      if (search) {
        sql += ' AND (part_name LIKE ? OR part_code LIKE ? OR category LIKE ? OR supplier LIKE ? OR location LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      // Sorting
      const validSortColumns: Record<string, string> = {
        quantity: 'quantity',
        price: 'unit_price',
        name: 'part_name',
        code: 'part_code',
        created_at: 'created_at'
      };
      const sortCol = validSortColumns[String(sortBy)] || 'created_at';
      const order = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      sql += ` ORDER BY ${sortCol} ${order}`;

      const result = await pool.query(sql, params);
      const items = result.rows || [];

      // Calculate stats on all items (independent of filter for top summary cards)
      const allResult = await pool.query('SELECT * FROM inventory');
      const allItems = allResult.rows || [];

      const totalItems = allItems.length;
      const totalQty = allItems.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);
      const totalValuation = allItems.reduce(
        (sum: number, it: any) => sum + (Number(it.quantity || 0) * Number(it.unit_price || 0)),
        0
      );
      const inStockCount = allItems.filter((it: any) => it.status === 'In Stock').length;
      const lowStockCount = allItems.filter((it: any) => it.status === 'Low Stock').length;
      const outOfStockCount = allItems.filter((it: any) => it.status === 'Out of Stock').length;

      // Extract unique categories for filter dropdowns
      const categories = Array.from(new Set(allItems.map((it: any) => it.category).filter(Boolean)));

      return res.json({
        success: true,
        data: items,
        categories,
        stats: {
          totalItems,
          totalQty,
          totalValuation,
          inStockCount,
          lowStockCount,
          outOfStockCount
        }
      });
    }

    // In-Memory Fallback
    let list = [...(memoryStore.inventory || [])];

    if (status && status !== 'All') {
      list = list.filter(it => it.status === status);
    }

    if (category && category !== 'All') {
      list = list.filter(it => it.category === category);
    }

    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter(
        it =>
          it.part_name?.toLowerCase().includes(s) ||
          it.part_code?.toLowerCase().includes(s) ||
          it.category?.toLowerCase().includes(s) ||
          it.supplier?.toLowerCase().includes(s) ||
          it.location?.toLowerCase().includes(s)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'quantity') {
        return sortOrder === 'ASC' ? a.quantity - b.quantity : b.quantity - a.quantity;
      }
      if (sortBy === 'price') {
        return sortOrder === 'ASC' ? a.unit_price - b.unit_price : b.unit_price - a.unit_price;
      }
      if (sortBy === 'name') {
        return sortOrder === 'ASC' ? a.part_name.localeCompare(b.part_name) : b.part_name.localeCompare(a.part_name);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const allItems = memoryStore.inventory || [];
    const totalItems = allItems.length;
    const totalQty = allItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
    const totalValuation = allItems.reduce(
      (sum, it) => sum + (Number(it.quantity || 0) * Number(it.unit_price || 0)),
      0
    );
    const inStockCount = allItems.filter(it => it.status === 'In Stock').length;
    const lowStockCount = allItems.filter(it => it.status === 'Low Stock').length;
    const outOfStockCount = allItems.filter(it => it.status === 'Out of Stock').length;
    const categories = Array.from(new Set(allItems.map(it => it.category).filter(Boolean)));

    return res.json({
      success: true,
      data: list,
      categories,
      stats: {
        totalItems,
        totalQty,
        totalValuation,
        inStockCount,
        lowStockCount,
        outOfStockCount
      }
    });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
};

export const getInventoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (getDbStatus()) {
      const [item] = (await pool.query('SELECT * FROM inventory WHERE id = ?', [id])).rows;
      if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
      return res.json({ success: true, data: item });
    }

    const item = (memoryStore.inventory || []).find(it => String(it.id) === String(id));
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    return res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Error fetching inventory item:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory item' });
  }
};

export const createInventoryItem = async (req: Request, res: Response) => {
  try {
    const {
      part_code,
      part_name,
      category = 'Spare Parts',
      image_url = '',
      quantity = 0,
      min_threshold = 5,
      unit_price = 0,
      status: explicitStatus,
      location = 'Main Hub Workshop',
      supplier = '',
      description = ''
    } = req.body;

    if (!part_name) {
      return res.status(400).json({ success: false, message: 'Part name is required' });
    }

    const qty = Math.max(0, Number(quantity) || 0);
    const threshold = Math.max(0, Number(min_threshold) || 5);
    const price = Math.max(0, Number(unit_price) || 0);
    const computedStatus = calculateStatus(qty, threshold, explicitStatus);

    if (getDbStatus()) {
      // Auto-generate code if empty
      let code = part_code?.trim();
      if (!code) {
        const countRes = (await pool.query('SELECT COUNT(*) as cnt FROM inventory')).rows;
        const total = countRes[0]?.cnt || 0;
        code = `DR-INV-${1001 + total}`;
      }

      const sql = `
        INSERT INTO inventory (
          part_code, part_name, category, image_url, quantity, min_threshold,
          unit_price, status, location, supplier, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await pool.query(sql, [
        code,
        part_name.trim(),
        category.trim() || 'Spare Parts',
        image_url?.trim() || '',
        qty,
        threshold,
        price,
        computedStatus,
        location?.trim() || 'Main Hub Workshop',
        supplier?.trim() || '',
        description?.trim() || ''
      ]);

      const [newRow] = (await pool.query('SELECT * FROM inventory WHERE id = ?', [result.insertId])).rows;
      return res.status(201).json({
        success: true,
        data: newRow,
        message: 'Inventory item added successfully!'
      });
    }

    // In-memory
    const allItems = memoryStore.inventory || [];
    let code = part_code?.trim() || `DR-INV-${1001 + allItems.length}`;

    const newItem = {
      id: Date.now(),
      part_code: code,
      part_name: part_name.trim(),
      category: category.trim() || 'Spare Parts',
      image_url: image_url?.trim() || '',
      quantity: qty,
      min_threshold: threshold,
      unit_price: price,
      status: computedStatus as 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Discontinued',
      location: location?.trim() || 'Main Hub Workshop',
      supplier: supplier?.trim() || '',
      description: description?.trim() || '',
      created_at: new Date().toISOString()
    };

    if (!memoryStore.inventory) memoryStore.inventory = [];
    memoryStore.inventory.unshift(newItem);

    return res.status(201).json({
      success: true,
      data: newItem,
      message: 'Inventory item added successfully!'
    });
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    return res.status(500).json({ success: false, message: 'Failed to create inventory item' });
  }
};

export const updateInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      part_code,
      part_name,
      category,
      image_url,
      quantity,
      min_threshold,
      unit_price,
      status: explicitStatus,
      location,
      supplier,
      description
    } = req.body;

    if (getDbStatus()) {
      const [existing] = (await pool.query('SELECT * FROM inventory WHERE id = ?', [id])).rows;
      if (!existing) return res.status(404).json({ success: false, message: 'Item not found' });

      const newQty = quantity !== undefined ? Math.max(0, Number(quantity)) : existing.quantity;
      const newThreshold = min_threshold !== undefined ? Math.max(0, Number(min_threshold)) : existing.min_threshold;
      const newPrice = unit_price !== undefined ? Math.max(0, Number(unit_price)) : existing.unit_price;
      const computedStatus = calculateStatus(newQty, newThreshold, explicitStatus || existing.status);

      const sql = `
        UPDATE inventory SET
          part_code = COALESCE(?, part_code),
          part_name = COALESCE(?, part_name),
          category = COALESCE(?, category),
          image_url = COALESCE(?, image_url),
          quantity = ?,
          min_threshold = ?,
          unit_price = ?,
          status = ?,
          location = COALESCE(?, location),
          supplier = COALESCE(?, supplier),
          description = COALESCE(?, description)
        WHERE id = ?
      `;

      await pool.query(sql, [
        part_code ? part_code.trim() : null,
        part_name ? part_name.trim() : null,
        category ? category.trim() : null,
        image_url !== undefined ? image_url : null,
        newQty,
        newThreshold,
        newPrice,
        computedStatus,
        location !== undefined ? location.trim() : null,
        supplier !== undefined ? supplier.trim() : null,
        description !== undefined ? description.trim() : null,
        id
      ]);

      const [updated] = (await pool.query('SELECT * FROM inventory WHERE id = ?', [id])).rows;
      return res.json({
        success: true,
        data: updated,
        message: 'Inventory item updated successfully!'
      });
    }

    // In-memory
    const idx = (memoryStore.inventory || []).findIndex(it => String(it.id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Item not found' });

    const current = memoryStore.inventory[idx];
    const newQty = quantity !== undefined ? Math.max(0, Number(quantity)) : current.quantity;
    const newThreshold = min_threshold !== undefined ? Math.max(0, Number(min_threshold)) : current.min_threshold;
    const newPrice = unit_price !== undefined ? Math.max(0, Number(unit_price)) : current.unit_price;
    const computedStatus = calculateStatus(newQty, newThreshold, explicitStatus || current.status);

    memoryStore.inventory[idx] = {
      ...current,
      part_code: part_code ? part_code.trim() : current.part_code,
      part_name: part_name ? part_name.trim() : current.part_name,
      category: category ? category.trim() : current.category,
      image_url: image_url !== undefined ? image_url : current.image_url,
      quantity: newQty,
      min_threshold: newThreshold,
      unit_price: newPrice,
      status: computedStatus as any,
      location: location !== undefined ? location.trim() : current.location,
      supplier: supplier !== undefined ? supplier.trim() : current.supplier,
      description: description !== undefined ? description.trim() : current.description
    };

    return res.json({
      success: true,
      data: memoryStore.inventory[idx],
      message: 'Inventory item updated successfully!'
    });
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    return res.status(500).json({ success: false, message: 'Failed to update inventory item' });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { delta, newQuantity } = req.body;

    if (getDbStatus()) {
      const [existing] = (await pool.query('SELECT * FROM inventory WHERE id = ?', [id])).rows;
      if (!existing) return res.status(404).json({ success: false, message: 'Item not found' });

      let qty = existing.quantity;
      if (newQuantity !== undefined) {
        qty = Math.max(0, Number(newQuantity));
      } else if (delta !== undefined) {
        qty = Math.max(0, qty + Number(delta));
      }

      const status = calculateStatus(qty, existing.min_threshold, existing.status);

      await pool.query('UPDATE inventory SET quantity = ?, status = ? WHERE id = ?', [qty, status, id]);
      const [updated] = (await pool.query('SELECT * FROM inventory WHERE id = ?', [id])).rows;

      return res.json({
        success: true,
        data: updated,
        message: `Stock updated to ${qty} units`
      });
    }

    // In-memory
    const idx = (memoryStore.inventory || []).findIndex(it => String(it.id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Item not found' });

    let qty = memoryStore.inventory[idx].quantity;
    if (newQuantity !== undefined) {
      qty = Math.max(0, Number(newQuantity));
    } else if (delta !== undefined) {
      qty = Math.max(0, qty + Number(delta));
    }

    const status = calculateStatus(qty, memoryStore.inventory[idx].min_threshold, memoryStore.inventory[idx].status);
    memoryStore.inventory[idx].quantity = qty;
    memoryStore.inventory[idx].status = status as any;

    return res.json({
      success: true,
      data: memoryStore.inventory[idx],
      message: `Stock updated to ${qty} units`
    });
  } catch (error: any) {
    console.error('Error adjusting stock:', error);
    return res.status(500).json({ success: false, message: 'Failed to adjust stock' });
  }
};

export const deleteInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (getDbStatus()) {
      await pool.query('DELETE FROM inventory WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Inventory item deleted successfully!' });
    }

    if (memoryStore.inventory) {
      memoryStore.inventory = memoryStore.inventory.filter(it => String(it.id) !== String(id));
    }

    return res.json({ success: true, message: 'Inventory item deleted successfully!' });
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete inventory item' });
  }
};
