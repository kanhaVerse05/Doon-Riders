'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/adminApi';
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Package,
  Wrench,
  Zap,
  BatteryCharging,
  DollarSign,
  Download,
  Edit,
  Trash2,
  X,
  Upload,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers,
  MapPin,
  Building,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  Minus,
  ArrowUpDown,
  Tag
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryItem {
  id: number;
  part_code: string;
  part_name: string;
  category: string;
  image_url?: string;
  quantity: number;
  min_threshold: number;
  unit_price: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Discontinued';
  location?: string;
  supplier?: string;
  description?: string;
  created_at: string;
}

const CATEGORY_PRESETS = [
  'Battery & Electricals',
  'Motor & Drive',
  'Brakes & Suspension',
  'Tires & Wheels',
  'Chargers & Power',
  'Body & Lights',
  'IoT & Electronics',
  'Handlebar & Controls',
  'Accessories',
  'Tools & Equipment'
];

export default function InventoryAdminPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.roleName === 'SUPER_ADMIN';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalQty: 0,
    totalValuation: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });
  const [categories, setCategories] = useState<string[]>(CATEGORY_PRESETS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct' | 'set'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Bulk Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedUploadItems, setParsedUploadItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Battery & Electricals');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formQuantity, setFormQuantity] = useState<number>(10);
  const [formThreshold, setFormThreshold] = useState<number>(5);
  const [formPrice, setFormPrice] = useState<number>(1500);
  const [formLocation, setFormLocation] = useState('Main Hub Workshop - Rack A1');
  const [formSupplier, setFormSupplier] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'In Stock' | 'Low Stock' | 'Out of Stock' | 'Discontinued'>('In Stock');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Inventory
  const fetchInventory = async () => {
    setLoading(true);
    try {
      let query = `/admin/inventory?status=${statusFilter}&category=${categoryFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await adminApi.get(query);
      if (res && res.success && res.data) {
        setItems(res.data);
        if (res.stats) setStats(res.stats);
        if (res.categories && res.categories.length > 0) {
          const merged = Array.from(new Set([...CATEGORY_PRESETS, ...res.categories]));
          setCategories(merged);
        }
      } else {
        // Local Fallback list
        let list: InventoryItem[] = [
          {
            id: 1,
            part_code: 'DR-INV-1001',
            part_name: 'Lithium Battery Pack 60V 30Ah (LFP)',
            category: 'Battery & Electricals',
            image_url: '/images/battery-pack.png',
            quantity: 28,
            min_threshold: 5,
            unit_price: 18500,
            status: 'In Stock',
            location: 'Main Hub Workshop - Rack A1',
            supplier: 'Exicom Energy Systems',
            description: 'High-density 60V 30Ah smart swappable lithium battery pack with built-in thermal BMS.',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            part_code: 'DR-INV-1002',
            part_name: 'Brushless BLDC Hub Motor 1500W',
            category: 'Motor & Drive',
            image_url: '',
            quantity: 14,
            min_threshold: 4,
            unit_price: 6800,
            status: 'In Stock',
            location: 'Main Hub Workshop - Rack A2',
            supplier: 'Bosch EV Drive',
            description: 'Waterproof IP67 rated 1500W peak brushless rear hub motor for DOON Electro Pro.',
            created_at: new Date().toISOString()
          },
          {
            id: 3,
            part_code: 'DR-INV-1003',
            part_name: 'Smart Sine-Wave Controller 60V 35A',
            category: 'Battery & Electricals',
            image_url: '',
            quantity: 3,
            min_threshold: 5,
            unit_price: 3200,
            status: 'Low Stock',
            location: 'Main Hub Workshop - Rack B1',
            supplier: 'Kelly Controls',
            description: 'Regenerative braking supported 60V intelligent brushless sine-wave controller.',
            created_at: new Date().toISOString()
          },
          {
            id: 4,
            part_code: 'DR-INV-1004',
            part_name: 'Dual-Piston Hydraulic Disc Brake Kit',
            category: 'Brakes & Suspension',
            image_url: '',
            quantity: 22,
            min_threshold: 6,
            unit_price: 1450,
            status: 'In Stock',
            location: 'Main Hub Workshop - Rack B2',
            supplier: 'ByBre Brembo India',
            description: 'Front & Rear 220mm stainless steel ventilated disc with dual-piston ceramic caliper.',
            created_at: new Date().toISOString()
          },
          {
            id: 5,
            part_code: 'DR-INV-1005',
            part_name: 'All-Weather Tubeless Tyre 90/90-12',
            category: 'Tires & Wheels',
            image_url: '',
            quantity: 40,
            min_threshold: 10,
            unit_price: 1250,
            status: 'In Stock',
            location: 'Tyre Bay - Section C',
            supplier: 'MRF Nylogrip Zapper',
            description: 'Puncture-resistant high traction compound tyre built for wet mountain roads.',
            created_at: new Date().toISOString()
          },
          {
            id: 6,
            part_code: 'DR-INV-1006',
            part_name: 'Fast Charger 60V 10A Aluminum Shell',
            category: 'Chargers & Power',
            image_url: '',
            quantity: 0,
            min_threshold: 5,
            unit_price: 2900,
            status: 'Out of Stock',
            location: 'Charging Hub Store',
            supplier: 'Delta Electronics',
            description: 'Quick DC wall charger with intelligent auto-cutoff and overcharge protection.',
            created_at: new Date().toISOString()
          }
        ];

        if (statusFilter !== 'All') {
          list = list.filter(it => it.status === statusFilter);
        }
        if (categoryFilter !== 'All') {
          list = list.filter(it => it.category === categoryFilter);
        }
        if (search) {
          const s = search.toLowerCase();
          list = list.filter(it => it.part_name.toLowerCase().includes(s) || it.part_code.toLowerCase().includes(s));
        }

        setItems(list);
        setStats({
          totalItems: list.length,
          totalQty: list.reduce((s, it) => s + it.quantity, 0),
          totalValuation: list.reduce((s, it) => s + (it.quantity * it.unit_price), 0),
          inStockCount: list.filter(it => it.status === 'In Stock').length,
          lowStockCount: list.filter(it => it.status === 'Low Stock').length,
          outOfStockCount: list.filter(it => it.status === 'Out of Stock').length
        });
      }
    } catch (err) {
      console.warn('Inventory fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [statusFilter, categoryFilter, search, sortBy, sortOrder]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormCode(`DR-INV-${1001 + items.length}`);
    setFormName('');
    setFormCategory('Battery & Electricals');
    setFormCustomCategory('');
    setFormImageUrl('');
    setFormQuantity(10);
    setFormThreshold(5);
    setFormPrice(1500);
    setFormLocation('Main Hub Workshop - Rack A1');
    setFormSupplier('');
    setFormDescription('');
    setFormStatus('In Stock');
    setShowItemModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormCode(item.part_code);
    setFormName(item.part_name);
    setFormCategory(CATEGORY_PRESETS.includes(item.category) ? item.category : 'Other');
    setFormCustomCategory(CATEGORY_PRESETS.includes(item.category) ? '' : item.category);
    setFormImageUrl(item.image_url || '');
    setFormQuantity(item.quantity);
    setFormThreshold(item.min_threshold);
    setFormPrice(item.unit_price);
    setFormLocation(item.location || 'Main Hub Workshop');
    setFormSupplier(item.supplier || '');
    setFormDescription(item.description || '');
    setFormStatus(item.status);
    setShowItemModal(true);
  };

  // Image File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setFormImageUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter Part Name');
      return;
    }

    const finalCategory = formCategory === 'Other' && formCustomCategory.trim()
      ? formCustomCategory.trim()
      : formCategory;

    setSubmitting(true);
    try {
      const payload = {
        part_code: formCode.trim(),
        part_name: formName.trim(),
        category: finalCategory,
        image_url: formImageUrl,
        quantity: Number(formQuantity) || 0,
        min_threshold: Number(formThreshold) || 5,
        unit_price: Number(formPrice) || 0,
        location: formLocation.trim(),
        supplier: formSupplier.trim(),
        description: formDescription.trim(),
        status: formStatus
      };

      if (editingItem) {
        // UPDATE
        const res = await adminApi.put(`/admin/inventory/${editingItem.id}`, payload);
        if (res && res.success) {
          setToastMessage(`Part "${payload.part_name}" updated successfully!`);
          setShowItemModal(false);
          fetchInventory();
        } else {
          // Local update
          setItems(prev => prev.map(it => it.id === editingItem.id ? { ...it, ...payload, id: editingItem.id } : it));
          setToastMessage(`Part "${payload.part_name}" updated!`);
          setShowItemModal(false);
        }
      } else {
        // CREATE
        const res = await adminApi.post('/admin/inventory', payload);
        if (res && res.success) {
          setToastMessage(`New Part "${payload.part_name}" added to inventory!`);
          setShowItemModal(false);
          fetchInventory();
        } else {
          // Local add
          const newItem: InventoryItem = {
            id: Date.now(),
            ...payload,
            created_at: new Date().toISOString()
          };
          setItems(prev => [newItem, ...prev]);
          setToastMessage(`New Part "${payload.part_name}" added!`);
          setShowItemModal(false);
        }
      }
    } catch (err: any) {
      alert('Error saving inventory: ' + err.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Quick Inline Quantity Change
  const handleQuickQtyChange = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    try {
      await adminApi.patch(`/admin/inventory/${item.id}/adjust-stock`, { delta });
      setItems(prev => prev.map(it => {
        if (it.id === item.id) {
          const newStatus = newQty === 0 ? 'Out of Stock' : (newQty <= it.min_threshold ? 'Low Stock' : 'In Stock');
          return { ...it, quantity: newQty, status: newStatus };
        }
        return it;
      }));
      setToastMessage(`Stock for ${item.part_name} updated to ${newQty}`);
      setTimeout(() => setToastMessage(null), 2500);
    } catch (e) {
      console.warn('Adjust notice:', e);
    }
  };

  // Open Detailed Stock Adjustment Modal
  const handleOpenAdjustModal = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustType('add');
    setAdjustAmount(5);
    setShowAdjustModal(true);
  };

  // Save Stock Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    let delta = 0;
    let newQuantity: number | undefined = undefined;

    if (adjustType === 'add') {
      delta = Number(adjustAmount);
    } else if (adjustType === 'deduct') {
      delta = -Number(adjustAmount);
    } else {
      newQuantity = Math.max(0, Number(adjustAmount));
    }

    try {
      const payload = newQuantity !== undefined ? { newQuantity } : { delta };
      const res = await adminApi.patch(`/admin/inventory/${adjustingItem.id}/adjust-stock`, payload);
      if (res && res.success && res.data) {
        setItems(prev => prev.map(it => it.id === adjustingItem.id ? res.data : it));
        setToastMessage(`Stock updated for ${adjustingItem.part_name}!`);
      } else {
        const finalQty = newQuantity !== undefined ? newQuantity : Math.max(0, adjustingItem.quantity + delta);
        const finalStatus = finalQty === 0 ? 'Out of Stock' : (finalQty <= adjustingItem.min_threshold ? 'Low Stock' : 'In Stock');
        setItems(prev => prev.map(it => it.id === adjustingItem.id ? { ...it, quantity: finalQty, status: finalStatus } : it));
        setToastMessage(`Stock updated for ${adjustingItem.part_name}!`);
      }
      setShowAdjustModal(false);
      fetchInventory();
    } catch (e: any) {
      alert('Error updating stock: ' + e.message);
    } finally {
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;
    try {
      await adminApi.delete(`/admin/inventory/${id}`);
      setItems(prev => prev.filter(it => it.id !== id));
      setToastMessage(`Item "${name}" removed from inventory.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.warn('Delete notice:', e);
    }
  };

  // Download Template (Excel or CSV)
  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    const templateData = [
      {
        'Part Code': 'DR-INV-1006',
        'Part Name': 'LED Headlight Matrix Assembly',
        'Category': 'Body & Lights',
        'Quantity': 25,
        'Min Threshold': 5,
        'Unit Price': 1450,
        'Location': 'Main Hub Workshop - Rack B3',
        'Supplier': 'Minda Auto',
        'Description': 'High-illumination LED matrix headlight for DOON Electro Pro'
      },
      {
        'Part Code': 'DR-INV-1007',
        'Part Name': 'Rear Shock Absorber Damper',
        'Category': 'Brakes & Suspension',
        'Quantity': 18,
        'Min Threshold': 4,
        'Unit Price': 980,
        'Location': 'Main Hub Workshop - Rack C2',
        'Supplier': 'Gabriel India',
        'Description': 'Dual spring hydraulic rear suspension shock absorber'
      },
      {
        'Part Code': 'DR-INV-1008',
        'Part Name': 'Digital LCD Smart Speedometer',
        'Category': 'Handlebar & Controls',
        'Quantity': 12,
        'Min Threshold': 3,
        'Unit Price': 2200,
        'Location': 'Main Hub Workshop - Rack A4',
        'Supplier': 'Pricol Electronics',
        'Description': 'CAN-bus compatible digital speedometer console'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'DOON_Riders_Inventory_Template.xlsx');
    } else {
      XLSX.writeFile(wb, 'DOON_Riders_Inventory_Template.csv', { bookType: 'csv' });
    }
  };

  // Handle Bulk File Selection (XLSX, XLS, CSV)
  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setUploadError(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheetName];
      const rawData: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rawData.length === 0) {
        setUploadError('The uploaded file is empty or formatted incorrectly.');
        setParsedUploadItems([]);
        return;
      }

      const normalized = rawData.map((row: any) => ({
        part_code: String(row['Part Code'] || row['part_code'] || row['PartCode'] || row['partCode'] || '').trim(),
        part_name: String(row['Part Name'] || row['part_name'] || row['PartName'] || row['partName'] || row['Name'] || row['name'] || '').trim(),
        category: String(row['Category'] || row['category'] || 'Spare Parts').trim(),
        quantity: Number(row['Quantity'] || row['quantity'] || row['Stock'] || row['stock'] || 0),
        min_threshold: Number(row['Min Threshold'] || row['min_threshold'] || row['Threshold'] || row['threshold'] || 5),
        unit_price: Number(row['Unit Price'] || row['unit_price'] || row['Price'] || row['price'] || 0),
        location: String(row['Location'] || row['location'] || 'Main Hub Workshop').trim(),
        supplier: String(row['Supplier'] || row['supplier'] || '').trim(),
        description: String(row['Description'] || row['description'] || '').trim()
      })).filter(it => it.part_name.length > 0);

      if (normalized.length === 0) {
        setUploadError('No valid items found. Please ensure "Part Name" column exists.');
        setParsedUploadItems([]);
        return;
      }

      setParsedUploadItems(normalized);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setUploadError(`Failed to parse file: ${err.message}`);
      setParsedUploadItems([]);
    }
  };

  // Submit Bulk Upload
  const handleConfirmBulkUpload = async () => {
    if (parsedUploadItems.length === 0) return;

    setUploading(true);
    setUploadError(null);
    try {
      const res = await adminApi.post('/admin/inventory/bulk-upload', {
        items: parsedUploadItems
      });

      if (res && res.success) {
        setToastMessage(`Successfully imported ${res.count || parsedUploadItems.length} inventory items!`);
        setShowUploadModal(false);
        setUploadFile(null);
        setParsedUploadItems([]);
        fetchInventory();
      } else {
        setUploadError(res?.message || 'Failed to upload inventory items.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error occurred during bulk upload.');
    } finally {
      setUploading(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = 'S.No,Part Code,Part Name,Category,Quantity,Min Threshold,Unit Price,Total Valuation,Status,Location,Supplier';
    const rows = items.map((it, idx) =>
      `${idx + 1},"${it.part_code}","${it.part_name}","${it.category}",${it.quantity},${it.min_threshold},${it.unit_price},${it.quantity * it.unit_price},"${it.status}","${it.location || ''}","${it.supplier || ''}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `doon_riders_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* ========================================================================= */}
        {/* PAGE HEADER */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D96B] animate-pulse" />
              <h1 className="text-2xl font-black text-[#111827] tracking-tight uppercase">
                DOON RIDERS INVENTORY
              </h1>
              <span className="bg-[#EAFBF2] text-[#00A854] text-[11px] font-black px-3 py-1 rounded-full border border-[#00D96B]/30 flex items-center gap-1.5 shadow-xs">
                <Boxes className="w-3.5 h-3.5" />
                <span>SPARE PARTS &amp; STOCKS</span>
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-1">
              Real-time EV parts inventory management, stock threshold monitoring &amp; workshop logistics.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setShowUploadModal(true);
                setUploadFile(null);
                setParsedUploadItems([]);
                setUploadError(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              <span>BULK UPLOAD (EXCEL/CSV)</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F7F9FA] transition shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#00A854]" />
              <span>EXPORT CSV</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] text-[#070D18] font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ ADD NEW PART</span>
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-[#EAFBF2] border border-[#00D96B] text-[#00A854] p-3.5 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-sm animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* KPI SUMMARY CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* TOTAL INVENTORY VALUATION */}
          <div className="bg-gradient-to-br from-[#0B1528] to-[#070D18] text-white border border-white/10 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Inventory Valuation</span>
              <div className="w-8 h-8 rounded-xl bg-[#00D96B]/20 border border-[#00D96B]/40 flex items-center justify-center text-[#00D96B]">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#00D96B]">
                ₹{stats.totalValuation.toLocaleString()}
              </span>
              <span className="text-[11px] text-gray-400">INR</span>
            </div>
            <p className="text-[11px] text-gray-400">Total value of all stocked parts</p>
          </div>

          {/* TOTAL STOCK UNITS */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Total Stock Count</span>
              <div className="w-8 h-8 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854]">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#111827]">{stats.totalQty}</span>
              <span className="text-xs font-bold text-[#00A854]">Units In Stock</span>
            </div>
            <p className="text-[11px] text-[#98A2B3]">Across {stats.totalItems} distinct catalog items</p>
          </div>

          {/* IN STOCK ITEMS */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Healthy Stock</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#111827]">{stats.inStockCount}</span>
              <span className="text-xs font-bold text-blue-600">Items Available</span>
            </div>
            <p className="text-[11px] text-[#98A2B3]">Sufficient stock levels</p>
          </div>

          {/* REORDER / LOW STOCK ALERTS */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'Low Stock' ? 'All' : 'Low Stock')}
            className={`border rounded-2xl p-5 shadow-sm space-y-2 cursor-pointer transition ${
              stats.lowStockCount + stats.outOfStockCount > 0
                ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
                : 'bg-white border-[#E5E7EB]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Reorder Alerts</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-950">
                {stats.lowStockCount + stats.outOfStockCount}
              </span>
              <span className="text-xs font-bold text-amber-700">
                ({stats.outOfStockCount} Out of stock)
              </span>
            </div>
            <p className="text-[11px] text-amber-800">
              {stats.lowStockCount + stats.outOfStockCount > 0 ? 'Click to filter reorder items' : 'All stocks healthy'}
            </p>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* TOOLBAR & FILTERS */}
        {/* ========================================================================= */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search part name, code, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 flex-wrap">
            
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#F7F9FA] p-1 rounded-xl border border-[#E5E7EB]">
              {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-[#00A854] shadow-sm font-extrabold'
                      : 'text-[#667085] hover:text-[#111827]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#00D96B]"
            >
              <option value="All">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Sort Options */}
            <div className="flex items-center gap-1 bg-[#F7F9FA] px-2.5 py-1.5 rounded-xl border border-[#E5E7EB]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#98A2B3]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs text-[#111827] font-medium focus:outline-none cursor-pointer"
              >
                <option value="created_at">Sort: Newest</option>
                <option value="quantity">Sort: Quantity</option>
                <option value="price">Sort: Price</option>
                <option value="name">Sort: Name (A-Z)</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                className="text-[10px] font-bold text-[#00A854] ml-1 uppercase hover:underline"
              >
                {sortOrder}
              </button>
            </div>

            {(statusFilter !== 'All' || categoryFilter !== 'All' || search) && (
              <button
                onClick={() => {
                  setStatusFilter('All');
                  setCategoryFilter('All');
                  setSearch('');
                }}
                className="text-xs font-bold text-[#667085] hover:text-red-600 px-2 py-1 rounded-lg border border-[#E5E7EB] hover:border-red-200"
              >
                Clear
              </button>
            )}

          </div>
        </div>

        {/* ========================================================================= */}
        {/* INVENTORY TABLE */}
        {/* ========================================================================= */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F9FA] text-[#667085] uppercase text-[11px] font-bold">
                  <th className="p-3.5 px-4 w-12 text-center">S.No</th>
                  <th className="p-3.5 px-4 w-16 text-center">Image / Icon</th>
                  <th className="p-3.5 px-4">Part Details</th>
                  <th className="p-3.5 px-4">Category &amp; Location</th>
                  <th className="p-3.5 px-4 text-center">Quantity</th>
                  <th className="p-3.5 px-4 text-right">Unit Price</th>
                  <th className="p-3.5 px-4 text-right">Total Valuation</th>
                  <th className="p-3.5 px-4 text-center">Status</th>
                  <th className="p-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] font-medium bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#98A2B3]">
                      Loading inventory items...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-[#98A2B3]">
                      <Boxes className="w-8 h-8 text-[#D0D5DD] mx-auto mb-2" />
                      <p className="font-bold text-sm text-[#475467]">No Inventory Parts Found</p>
                      <p className="text-xs text-[#98A2B3] mt-1">Click "+ Add New Part" to add spare parts to stock.</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-[#F7F9FA] transition">
                      
                      {/* 1. S.NO */}
                      <td className="p-3.5 px-4 text-center font-bold text-[#667085] font-mono">
                        {idx + 1}
                      </td>

                      {/* 2. IMAGE / ICON */}
                      <td className="p-3.5 px-4 text-center">
                        <div
                          onClick={() => item.image_url && setPreviewImage(item.image_url)}
                          className="w-10 h-10 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/30 mx-auto flex items-center justify-center text-[#00A854] overflow-hidden shadow-xs cursor-pointer hover:border-[#00D96B] transition"
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.part_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Wrench className="w-5 h-5" />
                          )}
                        </div>
                      </td>

                      {/* 3. PART NAME & CODE */}
                      <td className="p-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#111827] text-sm">
                            {item.part_name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-[#EAFBF2] text-[#00A854] px-2 py-0.5 rounded border border-[#00D96B]/30 font-bold">
                              {item.part_code}
                            </span>
                            {item.supplier && (
                              <span className="text-[10px] text-[#667085]">
                                Supplier: {item.supplier}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. CATEGORY & LOCATION */}
                      <td className="p-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="inline-block bg-[#F2F4F7] text-[#344054] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            {item.category}
                          </span>
                          {item.location && (
                            <p className="text-[10px] text-[#98A2B3] flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#00A854]" />
                              <span>{item.location}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 5. QUANTITY (WITH QUICK INLINE +/-) */}
                      <td className="p-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-[#F7F9FA] border border-[#E5E7EB] p-1 rounded-xl shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleQuickQtyChange(item, -1)}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-red-50 text-[#667085] hover:text-red-600 border border-[#E5E7EB] flex items-center justify-center font-bold text-xs transition cursor-pointer"
                            title="Deduct 1 unit"
                          >
                            -
                          </button>
                          
                          <span className={`px-2 font-mono font-black text-xs ${
                            item.quantity === 0
                              ? 'text-red-600'
                              : item.quantity <= item.min_threshold
                              ? 'text-amber-600'
                              : 'text-[#111827]'
                          }`}>
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQuickQtyChange(item, 1)}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-[#EAFBF2] text-[#667085] hover:text-[#00A854] border border-[#E5E7EB] flex items-center justify-center font-bold text-xs transition cursor-pointer"
                            title="Add 1 unit"
                          >
                            +
                          </button>
                        </div>

                        {item.quantity <= item.min_threshold && item.quantity > 0 && (
                          <span className="block text-[9px] font-extrabold text-amber-700 mt-0.5">
                            Min: {item.min_threshold}
                          </span>
                        )}
                      </td>

                      {/* 6. PRICE */}
                      <td className="p-3.5 px-4 text-right font-bold text-[#111827]">
                        ₹{Number(item.unit_price).toLocaleString()}
                      </td>

                      {/* 7. TOTAL VALUATION */}
                      <td className="p-3.5 px-4 text-right font-black text-[#00A854] font-mono">
                        ₹{(item.quantity * item.unit_price).toLocaleString()}
                      </td>

                      {/* 8. STATUS */}
                      <td className="p-3.5 px-4 text-center">
                        {item.status === 'In Stock' ? (
                          <span className="inline-flex items-center gap-1 bg-[#EAFBF2] text-[#00A854] border border-[#00D96B]/30 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>In Stock</span>
                          </span>
                        ) : item.status === 'Low Stock' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Low Stock</span>
                          </span>
                        ) : item.status === 'Out of Stock' ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                            <XCircle className="w-3 h-3" />
                            <span>Out of Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <span>Discontinued</span>
                          </span>
                        )}
                      </td>

                      {/* 9. ACTIONS */}
                      <td className="p-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stock Adjust Modal Button */}
                          <button
                            onClick={() => handleOpenAdjustModal(item)}
                            title="Stock Intake / Adjustment"
                            className="p-1.5 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#111827] hover:text-[#00A854] border border-[#E5E7EB] hover:border-[#00D96B]/40 rounded-lg transition cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Item */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit Part Details"
                            className="p-1.5 bg-[#F7F9FA] hover:bg-blue-50 text-[#111827] hover:text-blue-600 border border-[#E5E7EB] hover:border-blue-200 rounded-lg transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => handleDeleteItem(item.id, item.part_name)}
                            title="Delete Part"
                            className="p-1.5 bg-[#F7F9FA] hover:bg-red-50 text-[#98A2B3] hover:text-red-600 border border-[#E5E7EB] hover:border-red-200 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT INVENTORY ITEM MODAL */}
      {/* ========================================================================= */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[32px] border border-[#E5E7EB] w-full max-w-xl p-6 sm:p-8 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/40 flex items-center justify-center text-[#00A854]">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#111827] uppercase tracking-tight">
                    {editingItem ? 'Edit Inventory Part' : 'Add New Inventory Part'}
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    {editingItem ? `Updating ${editingItem.part_code}` : 'Enter new EV spare part or accessories'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-1.5 text-[#98A2B3] hover:text-[#111827] rounded-full hover:bg-[#F2F4F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              
              {/* Part Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Part Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lithium Battery Pack 60V 30Ah"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Part Code / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="DR-INV-1001"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#00A854] focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              </div>

              {/* Category & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#00D96B]"
                  >
                    {CATEGORY_PRESETS.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                    <option value="Other">+ Custom Category</option>
                  </select>

                  {formCategory === 'Other' && (
                    <input
                      type="text"
                      placeholder="Enter custom category name"
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      className="w-full bg-white border border-[#00D96B] rounded-xl px-3 py-1.5 text-xs text-[#111827] mt-1.5 focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Workshop Location / Rack</label>
                  <input
                    type="text"
                    placeholder="e.g. Rack A1, Tyre Bay, Hub Store"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              </div>

              {/* Stock Quantity, Min Threshold & Price */}
              <div className="grid grid-cols-3 gap-3 bg-[#F7F9FA] p-3.5 rounded-2xl border border-[#E5E7EB]">
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#00D96B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">
                    Min Alert Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-700 focus:outline-none focus:border-[#00D96B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#00A854] focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              </div>

              {/* Supplier & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Supplier / Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Exicom, Bosch, MRF"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Status Override</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#00D96B]"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              {/* Image Upload / Preview */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#111827]">Part Image (Optional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#00D96B]/50 bg-[#EAFBF2]/20 hover:bg-[#EAFBF2]/40 rounded-2xl p-3 text-center cursor-pointer transition flex items-center justify-center gap-3"
                >
                  {formImageUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={formImageUrl} alt="Part" className="w-12 h-12 object-cover rounded-xl border border-[#00D96B]/40" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-[#00A854]">Custom image uploaded</p>
                        <p className="text-[10px] text-[#667085]">Click to change image</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-[#00A854]" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-[#111827]">Click to upload part image</p>
                        <p className="text-[10px] text-[#667085]">PNG, JPG, WebP up to 5MB</p>
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {formImageUrl && (
                  <button
                    type="button"
                    onClick={() => setFormImageUrl('')}
                    className="text-[10px] font-bold text-red-600 hover:underline"
                  >
                    Remove custom image
                  </button>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Specifications / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Compatible with DOON Electro Pro & City Cruise..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F2F4F7] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#00D96B] hover:bg-[#00A854] text-[#070D18] font-black text-xs uppercase px-6 py-2.5 rounded-xl shadow-md cursor-pointer transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingItem ? 'Update Part' : 'Add to Inventory')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK STOCK ADJUSTMENT MODAL */}
      {/* ========================================================================= */}
      {showAdjustModal && adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[32px] border border-[#E5E7EB] w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-5 relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/40 flex items-center justify-center text-[#00A854]">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#111827] uppercase tracking-tight">
                    Stock Intake / Adjustment
                  </h3>
                  <p className="text-[11px] text-[#667085] font-mono">
                    {adjustingItem.part_code} • {adjustingItem.part_name}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 text-[#98A2B3]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              
              <div className="bg-[#F7F9FA] p-3 rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                <span className="text-xs text-[#667085] font-medium">Current Stock Level:</span>
                <span className="text-lg font-black text-[#111827] font-mono">{adjustingItem.quantity} Units</span>
              </div>

              {/* Adjustment Mode Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    adjustType === 'add'
                      ? 'bg-[#EAFBF2] border-[#00D96B] text-[#00A854] shadow-xs'
                      : 'bg-white border-[#E5E7EB] text-[#667085]'
                  }`}
                >
                  + Add Stock
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustType('deduct')}
                  className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    adjustType === 'deduct'
                      ? 'bg-red-50 border-red-400 text-red-700 shadow-xs'
                      : 'bg-white border-[#E5E7EB] text-[#667085]'
                  }`}
                >
                  - Deduct / Used
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustType('set')}
                  className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    adjustType === 'set'
                      ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                      : 'bg-white border-[#E5E7EB] text-[#667085]'
                  }`}
                >
                  Set Direct
                </button>
              </div>

              {/* Units Input */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  {adjustType === 'add' ? 'Units Received from Supplier' : adjustType === 'deduct' ? 'Units Consumed in Repair / Replacement' : 'New Exact Stock Count'}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm font-mono font-bold text-[#111827] focus:outline-none focus:border-[#00D96B]"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                {[5, 10, 20, 50].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAdjustAmount(val)}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#EAFBF2] text-[11px] font-bold text-[#475467] hover:text-[#00A854]"
                  >
                    +{val}
                  </button>
                ))}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#00D96B] hover:bg-[#00A854] text-[#070D18] font-black text-xs uppercase px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
                >
                  Apply Stock Update
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK UPLOAD MODAL (EXCEL / CSV) */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-5 my-6 max-h-[92vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-gray-900">
                    Bulk Upload Inventory
                  </h3>
                  <p className="text-xs text-gray-500">
                    Upload parts data using Excel (.xlsx, .xls) or CSV (.csv)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Section */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-gray-900 block">Download Template</span>
                <span className="text-[11px] text-gray-500 block">Sample file with required column headers</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadTemplate('xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadTemplate('csv')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample CSV (.csv)</span>
                </button>
              </div>
            </div>

            {/* Upload Dropzone */}
            <div>
              <input
                type="file"
                ref={bulkFileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleBulkFileChange}
                className="hidden"
              />
              <div
                onClick={() => bulkFileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-[#00D96B] bg-[#F9FAFB] hover:bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-[#00A854] shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">
                    {uploadFile ? uploadFile.name : 'Click to select Excel (.xlsx) or CSV (.csv) file'}
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Supports .xlsx, .xls, .csv formats
                  </span>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {uploadError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Preview Table */}
            {parsedUploadItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 uppercase">
                    Preview ({parsedUploadItems.length} items ready to import)
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">Code</th>
                        <th className="p-2">Part Name</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedUploadItems.slice(0, 10).map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 font-mono font-bold text-gray-900">{it.part_code || 'Auto-generated'}</td>
                          <td className="p-2 font-bold text-gray-900">{it.part_name}</td>
                          <td className="p-2 text-gray-600">{it.category}</td>
                          <td className="p-2 font-bold text-[#00A854]">{it.quantity}</td>
                          <td className="p-2 font-bold text-gray-900">₹{it.unit_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedUploadItems.length === 0 || uploading}
                onClick={handleConfirmBulkUpload}
                className="inline-flex items-center gap-2 bg-[#00A854] hover:bg-[#008744] text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{uploading ? 'Importing...' : `Import ${parsedUploadItems.length} Parts`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IMAGE PREVIEW LIGHTBOX */}
      {/* ========================================================================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn cursor-pointer"
        >
          <div className="relative max-w-xl max-h-[85vh] bg-white p-2 rounded-3xl overflow-hidden shadow-2xl">
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-2xl max-h-[80vh]" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
