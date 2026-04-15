'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAllPurchaseOrders,
  createPurchaseOrder,
  getOrdersByIds,
  getAllOrders,
  updatePurchaseOrderStatus,
  getAllProducts,
  updateOrderStatus,
  updatePurchaseOrderLoadingList,
} from '@/firebase/firestore';
import { getCurrentUser } from '@/firebase/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [billFile, setBillFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [linkedOrders, setLinkedOrders] = useState([]);
  const [loadingLinkedOrders, setLoadingLinkedOrders] = useState(false);
  const [selectedLinkedOrder, setSelectedLinkedOrder] = useState(null);
  const [showLinkedOrderModal, setShowLinkedOrderModal] = useState(false);
  const [collatedLoadingList, setCollatedLoadingList] = useState([]);
  const [updatingLoadingList, setUpdatingLoadingList] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [posResult, ordersResult, productsResult] = await Promise.all([
        getAllPurchaseOrders(),
        getAllOrders(),
        getAllProducts(),
      ]);

      if (posResult.success) {
        setPurchaseOrders(posResult.purchaseOrders);
      }
      if (ordersResult.success) {
        setAllOrders(ordersResult.orders);
      }
      if (productsResult.success) {
        setProducts(productsResult.products);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get pending orders that can be selected for PO
  const pendingOrders = useMemo(() => {
    return allOrders.filter((order) => order.status === 'pending');
  }, [allOrders]);

  // Filter POs by status
  const filteredPurchaseOrders = useMemo(() => {
    if (filterStatus === 'all') return purchaseOrders;
    return purchaseOrders.filter((po) => po.status === filterStatus);
  }, [purchaseOrders, filterStatus]);

  // Sync collatedLoadingList when selectedOrderIds change
  useEffect(() => {
    if (!showCreateModal) return;

    setCollatedLoadingList((prev) => {
      const selectedOrders = pendingOrders.filter((o) => selectedOrderIds.includes(o.id));
      
      // Preserve existing order if possible
      const newList = [];
      
      // 1. Keep existing ones that are still selected
      prev.forEach((group) => {
        if (selectedOrderIds.includes(group.id)) {
          newList.push(group);
        }
      });
      
      // 2. Add new ones
      const existingIds = prev.map((g) => g.id);
      selectedOrders.forEach((order) => {
        if (!existingIds.includes(order.id)) {
          newList.push({
            id: order.id,
            customerName: order.customerName,
            items: order.items.map((item) => ({
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
              productId: item.productId || item.productName
            }))
          });
        }
      });
      
      return newList;
    });
  }, [selectedOrderIds, pendingOrders, showCreateModal]);

  const moveGroup = (idx, direction) => {
    const newList = [...collatedLoadingList];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    
    [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
    setCollatedLoadingList(newList);
  };

  const moveItemInGroup = (groupIdx, itemIdx, direction) => {
    const newList = [...collatedLoadingList];
    const group = { ...newList[groupIdx] };
    const newItems = [...group.items];
    const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    
    [newItems[itemIdx], newItems[targetIdx]] = [newItems[targetIdx], newItems[itemIdx]];
    group.items = newItems;
    newList[groupIdx] = group;
    setCollatedLoadingList(newList);
  };

  const handleUpdateLoadingList = async () => {
    if (!selectedPO) return;
    setUpdatingLoadingList(true);
    try {
      const result = await updatePurchaseOrderLoadingList(selectedPO.id, collatedLoadingList);
      if (result.success) {
        setMessage('Loading list updated successfully!');
        // Update local PO state
        setPurchaseOrders(prev => prev.map(po => 
          po.id === selectedPO.id ? { ...po, loadingList: collatedLoadingList } : po
        ));
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to update loading list');
      }
    } catch (err) {
      setError('An error occurred while updating loading list');
    } finally {
      setUpdatingLoadingList(false);
    }
  };

  const handlePrintLoadingList = (po) => {
    const doc = new jsPDF();
    const list = po.loadingList || collatedLoadingList || [];
    
    // Header
    doc.setFillColor(80, 80, 80);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTORY LOADING LIST', 105, 17, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Purchase Order ID: #${po.id.substring(0, 8)}`, 15, 35);
    doc.text(`Generated On: ${new Date().toLocaleString('en-IN')}`, 15, 40);
    doc.text(`Total Customers: ${list.length}`, 15, 45);
    
    doc.setLineWidth(0.5);
    doc.line(15, 50, 195, 50);
    
    let yPos = 60;
    
    list.forEach((group, gIdx) => {
      // Customer Header
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPos - 5, 180, 8, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${gIdx + 1}. CUSTOMER: ${group.customerName.toUpperCase()}`, 20, yPos);
      yPos += 5;
      
      const body = group.items.map(item => [item.productName, `${item.quantity} Bags`]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['PRODUCT DESCRIPTION', 'QUANTITY']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: 20, right: 15 },
        columnStyles: {
          1: { halign: 'right', cellWidth: 40 }
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      
      // Page break check
      if (yPos > 270 && gIdx < list.length - 1) {
        doc.addPage();
        yPos = 25;
      }
    });
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Singla Traders - Loading Collation Document | Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }
    
    doc.save(`Loading-List-PO-${po.id.substring(0, 8)}.pdf`);
  };

  // Aggregate selected orders' items with standard prices
  const aggregatedItems = useMemo(() => {
    const itemMap = new Map();
    let totalRevenue = 0; // Sum of customer order totals (what customers paid)

    // Fetch details for selected orders
    const selectedOrders = pendingOrders.filter((order) => selectedOrderIds.includes(order.id));

    selectedOrders.forEach((order) => {
      // Add to total revenue
      totalRevenue += order.totalAmount || 0;

      order.items?.forEach((item) => {
        const productId = item.productId || item.productName; // fallback to name if no productId
        const existing = itemMap.get(productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.customerSubtotal += item.quantity * item.price;
        } else {
          itemMap.set(productId, {
            productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price, // Original price from order (could be custom)
            customerSubtotal: item.quantity * item.price,
            standardPrice: 0, // will be set below
            standardSubtotal: 0,
          });
        }
      });
    });

    // Replace with standard product prices and calculate profit
    const productMap = new Map();
    products.forEach((product) => {
      productMap.set(product.id, product.price);
    });

    const items = Array.from(itemMap.values()).map((item) => {
      const standardPrice = productMap.get(item.productId) || item.price;
      const standardSubtotal = item.quantity * standardPrice;
      const profit = item.customerSubtotal - standardSubtotal;

      return {
        ...item,
        price: standardPrice,
        standardPrice,
        standardSubtotal,
        customerSubtotal: item.customerSubtotal,
        profit,
        profitMargin: standardSubtotal > 0 ? (profit / standardSubtotal) * 100 : 0,
      };
    });

    // Recalculate totals
    const totalStandard = items.reduce((sum, item) => sum + item.standardSubtotal, 0);
    const totalCustomer = items.reduce((sum, item) => sum + item.customerSubtotal, 0);
    const totalProfit = totalCustomer - totalStandard;
    const totalProfitMargin = totalStandard > 0 ? (totalProfit / totalStandard) * 100 : 0;

    return {
      items,
      totals: {
        standard: totalStandard,
        customer: totalCustomer,
        profit: totalProfit,
        profitMargin: totalProfitMargin,
      },
    };
  }, [selectedOrderIds, pendingOrders, products]);

  const handleSelectOrder = (orderId) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter((id) => id !== orderId));
    } else {
      setSelectedOrderIds([...selectedOrderIds, orderId]);
    }
  };

  const handleCreatePO = async () => {
    if (selectedOrderIds.length === 0) {
      setError('Please select at least one order');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const user = getCurrentUser();
      if (!user) {
        setError('You must be logged in to create a purchase order');
        setSubmitting(false);
        return;
      }

      const result = await createPurchaseOrder(
        user.uid,
        selectedOrderIds,
        aggregatedItems.items,
        aggregatedItems.totals.standard,
        aggregatedItems.totals.customer,
        aggregatedItems.totals.profit,
        collatedLoadingList
      );

      if (result.success) {
        setMessage('Purchase order created successfully!');
        setSelectedOrderIds([]);
        setShowCreateModal(false);
        fetchData(); // Refresh PO list
      } else {
        setError('Failed to create purchase order: ' + result.error);
      }
    } catch (err) {
      setError('An error occurred while creating purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (po) => {
    setSelectedPO(po);
    setShowDetailsModal(true);
    setCollatedLoadingList(po.loadingList || []);

    // Fetch linked orders if we have order IDs
    if (po.selectedOrderIds && po.selectedOrderIds.length > 0) {
      setLoadingLinkedOrders(true);
      try {
        const result = await getOrdersByIds(po.selectedOrderIds);
        if (result.success) {
          setLinkedOrders(result.orders);
        } else {
          setLinkedOrders([]);
        }
      } catch (error) {
        console.error('Error fetching linked orders:', error);
        setLinkedOrders([]);
      } finally {
        setLoadingLinkedOrders(false);
      }
    } else {
      setLinkedOrders([]);
    }
  };

  const handleViewLinkedOrder = (order) => {
    setSelectedLinkedOrder(order);
    setShowLinkedOrderModal(true);
  };

  const handleBillUpload = async (purchaseOrderId) => {
    if (!billFile) {
      setError('Please select a bill file to upload');
      return;
    }

    setUploading(purchaseOrderId);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', billFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      const billUrl = data.url;

      // Update PO status to delivered with bill URL
      const poResult = await updatePurchaseOrderStatus(purchaseOrderId, 'delivered', billUrl);

      if (!poResult.success) {
        throw new Error(poResult.error);
      }

      // Get the PO to find linked orders
      const po = purchaseOrders.find((p) => p.id === purchaseOrderId);
      if (po && po.selectedOrderIds) {
        // Bulk update all linked customer orders to delivered
        await updatePurchaseOrderStatus(purchaseOrderId, 'delivered', billUrl);
        const ordersResult = await updateBulkOrderStatus(po.selectedOrderIds, 'delivered');
        if (!ordersResult.success) {
          console.error('Failed to update some orders:', ordersResult.error);
        }
      }

      setMessage('Bill uploaded and purchase order marked as delivered. Linked customer orders have been updated.');
      setBillFile(null);
      setShowDetailsModal(false);
      fetchData();
    } catch (error) {
      setError('Failed to upload bill: ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  const updateBulkOrderStatus = async (orderIds, status) => {
    try {
      const updatePromises = orderIds.map((orderId) => updateOrderStatus(orderId, status));
      await Promise.all(updatePromises);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#5d8a3c] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('purchaseOrders')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage purchase orders for suppliers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Purchase Order</span>
        </button>
      </div>

      {message && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="card">
        {purchaseOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="empty-state-title">No purchase orders yet</h3>
            <p className="empty-state-description">Create your first purchase order by selecting pending customer orders.</p>
          </div>
        ) : (
          <>
            {/* Filter */}
            <div className="mb-6">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-select w-auto"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th>PO ID</th>
                      <th>Date</th>
                      <th>Customer Orders</th>
                      <th>Items</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchaseOrders.map((po) => (
                      <tr key={po.id} className="table-row">
                        <td className="font-medium">
                          <button
                            onClick={() => handleViewDetails(po)}
                            className="text-[#10b981] hover:text-[#059669] font-semibold"
                          >
                            #{po.id.substring(0, 8)}
                          </button>
                        </td>
                        <td className="text-gray-600 dark:text-gray-300">{formatDate(po.createdAt)}</td>
                        <td className="text-gray-600 dark:text-gray-300">
                          {po.selectedOrderIds?.length || 0} orders
                        </td>
                        <td className="text-gray-600 dark:text-gray-300">
                          {po.items?.length || 0} items
                        </td>
                        <td className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(po.totalAmount)}
                        </td>
                        <td>
                          <span
                            className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                              po.status === 'delivered'
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400'
                                : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredPurchaseOrders.map((po) => (
                  <div key={po.id} className="card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <button
                        onClick={() => handleViewDetails(po)}
                        className="text-[#10b981] hover:text-[#059669] font-semibold text-lg"
                      >
                        #{po.id.substring(0, 8)}
                      </button>
                      <span
                        className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                          po.status === 'delivered'
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Date:</span>
                        <span className="text-gray-900 dark:text-gray-100">{formatDate(po.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Customer Orders:</span>
                        <span className="text-gray-900 dark:text-gray-100">{po.selectedOrderIds?.length || 0} orders</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Items:</span>
                        <span className="text-gray-900 dark:text-gray-100">{po.items?.length || 0} items</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Total:</span>
                        <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(po.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </>
        )}
      </div>

      {/* Create Purchase Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-[#10b981] dark:bg-green-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10 text-white">
              <h2 className="text-xl font-bold text-white">Create Purchase Order</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedOrderIds([]);
                  setError('');
                }}
                className="text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Select pending customer orders to include in this purchase order. Prices shown are standard product prices.
                </p>

                {/* Order Selection */}
                {pendingOrders.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400">No pending orders available.</p>
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden dark:border-gray-700 max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 w-12">
                            Select
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Order ID
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Items
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pendingOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(order.id)}
                                onChange={() => handleSelectOrder(order.id)}
                                className="w-4 h-4 text-[#10b981] focus:ring-[#10b981] border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              #{order.id.substring(0, 8)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {order.customerName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                              {order.items?.length || 0}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                              {formatCurrency(order.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Aggregated Items Preview */}
              {selectedOrderIds.length > 0 && (
                <div className="border-t pt-6 dark:border-gray-700">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
                    Aggregated Items (Standard Prices)
                  </h3>
                  <div className="border rounded-xl overflow-hidden dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Product
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Total Qty
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Std Price
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Std Total
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Revenue
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Profit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {aggregatedItems.items.map((item, idx) => (
                          <tr key={idx} className="dark:bg-gray-800">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.productName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                              {formatCurrency(item.standardPrice)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                              {formatCurrency(item.standardSubtotal)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                              {formatCurrency(item.customerSubtotal)}
                            </td>
                            <td className={`px-4 py-3 text-sm font-semibold text-right ${
                              item.profit >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatCurrency(item.profit)}
                              <div className="text-xs text-gray-500">
                                {item.profitMargin.toFixed(1)}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            TOTAL
                          </td>
                          <td className="px-4 py-3 text-lg font-bold text-gray-900 dark:text-gray-100 text-right">
                            {aggregatedItems.items.reduce((sum, item) => sum + item.quantity, 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">-</td>
                          <td className="px-4 py-3 text-lg font-bold text-[#10b981] dark:text-green-400 text-right">
                            {formatCurrency(aggregatedItems.totals.standard)}
                          </td>
                          <td className="px-4 py-3 text-lg font-bold text-blue-600 dark:text-blue-400 text-right">
                            {formatCurrency(aggregatedItems.totals.customer)}
                          </td>
                          <td className={`px-4 py-3 text-lg font-bold text-right ${
                            aggregatedItems.totals.profit >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(aggregatedItems.totals.profit)}
                            <div className="text-xs">
                              {aggregatedItems.totals.profitMargin.toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Cost:</strong> What you'll pay the supplier (standard prices) |
                      <strong> Revenue:</strong> What customers will pay |
                      <strong> Profit:</strong> Revenue - Cost (with margin percentage)
                    </p>
                  </div>
                </div>
              )}

              {/* Collated Loading List */}
              {selectedOrderIds.length > 0 && (
                <div className="border-t pt-6 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 italic">
                      Collated Loading List (For Factory Loading Sequence)
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {collatedLoadingList.map((group, gIdx) => (
                      <div key={group.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <span className="bg-[#10b981] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                              {gIdx + 1}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">
                              {group.customerName}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => moveGroup(gIdx, 'up')}
                              disabled={gIdx === 0}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                              title="Move Customer Up"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveGroup(gIdx, 'down')}
                              disabled={gIdx === collatedLoadingList.length - 1}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                              title="Move Customer Down"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {group.items.map((item, iIdx) => (
                              <tr key={iIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                                  {item.productName}
                                </td>
                                <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-gray-100 text-right w-24">
                                  {item.quantity} Bags
                                </td>
                                <td className="px-4 py-2 text-right w-20">
                                  <div className="flex justify-end space-x-1">
                                    <button
                                      onClick={() => moveItemInGroup(gIdx, iIdx, 'up')}
                                      disabled={iIdx === 0}
                                      className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => moveItemInGroup(gIdx, iIdx, 'down')}
                                      disabled={iIdx === group.items.length - 1}
                                      className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create Button */}
              <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                <button
                  onClick={handleCreatePO}
                  disabled={submitting || selectedOrderIds.length === 0}
                  className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Create Purchase Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order Details Modal */}
      {showDetailsModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-[#10b981] dark:bg-green-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10 text-white">
              <h2 className="text-xl font-bold text-white">
                Purchase Order #{selectedPO.id.substring(0, 8)}
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPO(null);
                  setBillFile(null);
                  setError('');
                  setLinkedOrders([]);
                }}
                className="text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(selectedPO.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        selectedPO.status === 'delivered'
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400'
                      }`}
                    >
                      {selectedPO.status}
                    </span>
                    <button
                      onClick={() => handlePrintLoadingList(selectedPO)}
                      className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-1 px-3 rounded flex items-center space-x-1 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H7" />
                      </svg>
                      <span>Print Loading List</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bill Preview if delivered */}
              {selectedPO.billUrl && (
                <div className="border-t pt-6 dark:border-gray-700">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Uploaded Bill</h3>
                  <div className="overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700">
                    <img
                      src={selectedPO.billUrl}
                      alt="Purchase Bill"
                      className="max-w-full h-auto object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Line Items */}
              <div className="border-t pt-6 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Line Items</h3>
                <div className="border rounded-xl overflow-hidden dark:border-gray-700 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Product
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Std Price
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Cost
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Revenue
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedPO.items?.map((item, idx) => {
                        // Calculate profit if we have both standard and customer totals
                        const hasRevenue = item.customerSubtotal !== undefined;
                        const profit = hasRevenue ? (item.customerSubtotal - item.standardSubtotal) : 0;
                        const profitMargin = item.standardSubtotal > 0 ? (profit / item.standardSubtotal) * 100 : 0;

                        return (
                          <tr key={idx} className="dark:bg-gray-800">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.productName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                              {formatCurrency(item.standardPrice || item.price)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-[#10b981] dark:text-green-400 text-right">
                              {formatCurrency(item.standardSubtotal || item.subtotal)}
                            </td>
                            {hasRevenue ? (
                              <>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                                  {formatCurrency(item.customerSubtotal)}
                                </td>
                                <td className={`px-4 py-3 text-sm font-semibold text-right ${
                                  profit >= 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {formatCurrency(profit)}
                                  <div className="text-xs text-gray-500">
                                    {profitMargin.toFixed(1)}%
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-sm text-gray-400 text-right">-</td>
                                <td className="px-4 py-3 text-sm text-gray-400 text-right">-</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-700">
                      {(() => {
                        const totalQty = selectedPO.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                        const totalAmount = selectedPO.totalAmount || 0;
                        // Check if we have revenue data
                        const hasRevenueData =
                          selectedPO.totalCustomerAmount !== undefined ||
                          (selectedPO.items.length > 0 && selectedPO.items[0].customerSubtotal !== undefined);
                        const totalRevenue =
                          selectedPO.totalCustomerAmount ||
                          (hasRevenueData
                            ? selectedPO.items.reduce((sum, item) => sum + (item.customerSubtotal || 0), 0)
                            : 0);
                        const totalProfit =
                          selectedPO.totalProfit ||
                          (hasRevenueData
                            ? selectedPO.items.reduce((sum, item) => {
                                const rev = item.customerSubtotal || 0;
                                const cost = item.standardSubtotal || item.subtotal;
                                return sum + (rev - cost);
                              }, 0)
                            : 0);
                        const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

                        return (
                          <tr>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                              TOTAL
                            </td>
                            <td className="px-4 py-3 text-lg font-bold text-gray-900 dark:text-gray-100 text-right">
                              {totalQty}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">-</td>
                            <td className="px-4 py-3 text-lg font-bold text-[#10b981] dark:text-green-400 text-right">
                              {formatCurrency(totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-lg font-bold text-blue-600 dark:text-blue-400 text-right">
                              {hasRevenueData ? formatCurrency(totalRevenue) : '-'}
                            </td>
                            <td className={`px-4 py-3 text-lg font-bold text-right ${
                              totalProfit >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {hasRevenueData ? (
                                <>
                                  {formatCurrency(totalProfit)}
                                  <div className="text-xs">
                                    ({profitMargin.toFixed(1)}%)
                                  </div>
                                </>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Collated Loading List (Details) */}
              <div className="border-t pt-6 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 italic">
                    Collated Loading List (Factory Sequence)
                  </h3>
                  <button
                    onClick={handleUpdateLoadingList}
                    disabled={updatingLoadingList}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1 transition-all shadow-sm"
                  >
                    {updatingLoadingList ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span>Save Loading Order</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {collatedLoadingList.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No loading list generated for this PO.</p>
                  ) : (
                    collatedLoadingList.map((group, gIdx) => (
                      <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-2 flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="bg-gray-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                              {gIdx + 1}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                              {group.customerName}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => moveGroup(gIdx, 'up')}
                              disabled={gIdx === 0}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-20"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveGroup(gIdx, 'down')}
                              disabled={gIdx === collatedLoadingList.length - 1}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-20"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {group.items.map((item, iIdx) => (
                              <tr key={iIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                <td className="px-4 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                                  {item.productName}
                                </td>
                                <td className="px-4 py-1.5 text-xs font-bold text-gray-900 dark:text-gray-100 text-right w-24">
                                  {item.quantity} Bags
                                </td>
                                <td className="px-4 py-1.5 text-right w-20">
                                  <div className="flex justify-end space-x-1">
                                    <button
                                      onClick={() => moveItemInGroup(gIdx, iIdx, 'up')}
                                      disabled={iIdx === 0}
                                      className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-20"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => moveItemInGroup(gIdx, iIdx, 'down')}
                                      disabled={iIdx === group.items.length - 1}
                                      className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-20"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Linked Customer Orders */}
              <div className="border-t pt-6 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
                  Linked Customer Orders ({linkedOrders.length})
                </h3>
                {loadingLinkedOrders ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981] mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading orders...</p>
                  </div>
                ) : linkedOrders.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400">No orders found</p>
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden dark:border-gray-700 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Order ID
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Date
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Items
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Payment
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {linkedOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                              onClick={() => handleViewLinkedOrder(order)}>
                            <td className="px-4 py-3 text-sm font-medium text-[#10b981] hover:text-[#059669]">
                              #{order.id.substring(0, 8)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {order.customerName || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(order.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                              {order.items?.length || 0}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                              {formatCurrency(order.totalAmount)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                                  order.paymentStatus === 'paid'
                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400'
                                    : order.paymentStatus === 'confirmation_pending'
                                    ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-400'
                                    : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400'
                                }`}
                              >
                                {order.paymentStatus === 'paid'
                                  ? t('paymentStatusPaid')
                                  : order.paymentStatus === 'confirmation_pending'
                                  ? t('paymentStatusConfirmationPending')
                                  : t('paymentStatusPending')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                                  order.status === 'delivered'
                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400'
                                    : order.status === 'pending'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400'
                                    : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400'
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Upload Bill Section (only if not delivered) */}
              {selectedPO.status !== 'delivered' && (
                <div className="border-t pt-6 dark:border-gray-700">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Upload Purchase Bill</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Upload the supplier bill to mark this purchase order as delivered. This will also mark all linked
                    customer orders as delivered.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Bill / Invoice
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setBillFile(e.target.files[0])}
                        className="w-full file:mr-4 file:py-2 file:px-4 file:border-2 file:border-[#10b981]/20 file:text-sm file:font-semibold file:bg-[#10b981]/5 file:text-[#10b981] hover:file:bg-[#10b981]/10 file:rounded-lg"
                      />
                      {billFile && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                          Selected: {billFile.name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleBillUpload(selectedPO.id)}
                      disabled={!billFile || uploading === selectedPO.id}
                      className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
                    >
                      {uploading === selectedPO.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                          </svg>
                          <span>Upload Bill & Mark Delivered</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {selectedPO.status === 'delivered' && selectedPO.deliveredAt && (
                <div className="border-t pt-6 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Delivered on: {formatDate(selectedPO.deliveredAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Linked Order Details Modal */}
      {showLinkedOrderModal && selectedLinkedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-[#10b981] dark:bg-green-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10 text-white">
              <h2 className="text-xl font-bold text-white">
                Order #{selectedLinkedOrder.id.substring(0, 8)}
              </h2>
              <button
                onClick={() => {
                  setShowLinkedOrderModal(false);
                  setSelectedLinkedOrder(null);
                }}
                className="text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedLinkedOrder.customerName || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                    {selectedLinkedOrder.customerId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Order Date</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatDate(selectedLinkedOrder.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Order Status</p>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      selectedLinkedOrder.status === 'delivered'
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400'
                        : selectedLinkedOrder.status === 'pending'
                        ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400'
                        : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400'
                    }`}
                  >
                    {selectedLinkedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Payment Status</p>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      selectedLinkedOrder.paymentStatus === 'paid'
                        ? 'badge-success'
                        : selectedLinkedOrder.paymentStatus === 'confirmation_pending'
                        ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-400'
                        : 'badge-warning'
                    }`}
                  >
                    {selectedLinkedOrder.paymentStatus === 'paid'
                      ? t('paymentStatusPaid')
                      : selectedLinkedOrder.paymentStatus === 'confirmation_pending'
                      ? t('paymentStatusConfirmationPending')
                      : t('paymentStatusPending')}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t pt-6 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Order Items</h3>
                <div className="border rounded-xl overflow-hidden dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Product
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Price
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedLinkedOrder.items?.map((item, idx) => (
                        <tr key={idx} className="dark:bg-gray-800">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.productName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                            {formatCurrency(item.quantity * item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-sm font-semibold text-right text-gray-700 dark:text-gray-300">
                          Total Amount
                        </td>
                        <td className="px-4 py-3 text-lg font-bold text-[#10b981] dark:text-green-400 text-right">
                          {formatCurrency(selectedLinkedOrder.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}