'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a high-end, premium PDF invoice for Singla Traders.
 * Highlights: Modern grids, accent colors, full address details, and professional footer.
 */
export const generateOrderBill = async (order) => {
  const doc = jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor = [16, 185, 129]; // #10b981 (Emerald Green)
  const secondaryColor = [30, 41, 59]; // #1e293b (Slate Blue)

  // 1. Loader for Logo & Image Assets
  const getLogoDataUrl = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load logo'));
      img.src = url;
    });
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  // 2. Premium Background Elements
  // Top Accent Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Subtle angled decorative line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(0, 38, pageWidth, 32);

  try {
    const logoDataUrl = await getLogoDataUrl('/logo.png');
    // Circle Logo Frame
    doc.setFillColor(255, 255, 255);
    doc.circle(28, 22, 16, 'F');
    doc.addImage(logoDataUrl, 'PNG', 16, 10, 24, 24);
  } catch (error) {
    console.warn('Logo failed to load:', error);
  }

  // 3. Header Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('SINGLA TRADERS', 50, 22);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PREMIUM CATTLE FEED DISTRIBUTION', 50, 28);
  doc.text('Quality You Can Trust, Service You Can Count On', 50, 32);

  // 4. Invoice Title & Metadata
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 15, 65, { align: 'right' });
  
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.line(pageWidth - 45, 68, pageWidth - 15, 68);

  const metaX = pageWidth - 15;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice Number: #${order.id.substring(0, 10).toUpperCase()}`, metaX, 75, { align: 'right' });
  doc.text(`Invoice Date: ${formatDate(order.createdAt)}`, metaX, 80, { align: 'right' });
  const deliveryDate = order.deliveredAt ? formatDate(order.deliveredAt) : formatDate(order.createdAt);
  doc.text(`Delivery Date: ${deliveryDate}`, metaX, 85, { align: 'right' });

  // 5. Customer & Billing Info (Grid Style)
  const billingY = 95;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, billingY, pageWidth - 30, 45, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, billingY, pageWidth - 30, 45, 'D');

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BILL TO:', 20, billingY + 8);
  doc.text('SHIP TO:', pageWidth / 2 + 10, billingY + 8);

  doc.setTextColor(...secondaryColor);
  doc.setFontSize(10);
  doc.text(order.customerName || 'N/A', 20, billingY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Phone: ${order.customerPhone || order.phone || 'N/A'}`, 20, billingY + 20);

  // Address Formatting
  const addr = order.billingAddress || {};
  const formattedAddress = [
    addr.line1,
    addr.line2,
    `${addr.village || ''}, ${addr.city || ''}`,
    `Haryana, India - ${addr.pincode || ''}`
  ].filter(line => line && line.trim() !== '');

  formattedAddress.forEach((line, index) => {
    doc.text(line, pageWidth / 2 + 10, billingY + 15 + (index * 5));
  });

  // 6. Items Table
  autoTable(doc, {
    startY: billingY + 55,
    margin: { left: 15, right: 15 },
    head: [['#', 'Product Description', 'Qty', 'Unit Price', 'Total Amount']],
    body: order.items.map((item, index) => [
      index + 1,
      item.productName || 'Unknown Product', // Fixed: use productName
      item.quantity,
      `Rs. ${item.price.toLocaleString('en-IN')}`,
      `Rs. ${(item.quantity * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ]),
    headStyles: { 
      fillColor: primaryColor, 
      textColor: 255, 
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 },
    },
    alternateRowStyles: { fillColor: [250, 252, 255] },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.1,
  });

  let currentY = doc.lastAutoTable.finalY + 10;

  // 7. Totals & Payment Summary
  const totalPaid = (order.cashAmount || 0) + (order.onlineAmount || 0);
  const remaining = order.totalAmount - totalPaid;

  // Totals Box
  doc.setFillColor(248, 250, 252);
  doc.rect(pageWidth - 85, currentY - 5, 70, 32, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Order Subtotal:', pageWidth - 80, currentY + 3);
  doc.text('Total Received:', pageWidth - 80, currentY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${order.totalAmount.toLocaleString('en-IN')}`, pageWidth - 20, currentY + 3, { align: 'right' });
  doc.text(`Rs. ${totalPaid.toLocaleString('en-IN')}`, pageWidth - 20, currentY + 10, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(pageWidth - 80, currentY + 14, pageWidth - 20, currentY + 14);

  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('BALANCE DUE:', pageWidth - 80, currentY + 21);
  doc.text(`Rs. ${remaining.toLocaleString('en-IN')}`, pageWidth - 20, currentY + 21, { align: 'right' });

  // Payment History Mini Table
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT LOG', 15, currentY + 3);
  
  const paymentLogs = [];
  if (order.cashPayments) order.cashPayments.forEach(p => paymentLogs.push([formatDate(p.recordedAt), 'Cash', `Rs. ${p.amount}`]));
  if (order.onlinePayments) order.onlinePayments.forEach(p => paymentLogs.push([formatDate(p.confirmedAt), 'Online', `Rs. ${p.amount}`]));

  if (paymentLogs.length > 0) {
    autoTable(doc, {
      startY: currentY + 6,
      margin: { left: 15, right: 15 },
      tableWidth: 80,
      head: [['Date', 'Type', 'Amount']],
      body: paymentLogs,
      headStyles: { fillColor: [71, 85, 105], fontSize: 7, halign: 'center' },
      styles: { fontSize: 7 },
      columnStyles: { 2: { halign: 'right' } }
    });
    currentY = Math.max(currentY + 30, doc.lastAutoTable.finalY + 15);
  } else {
    currentY += 30;
  }

  // 8. Footer Section
  const footerY = pageHeight - 45;

  // Authorized Signatory
  doc.setDrawColor(226, 232, 240);
  doc.line(pageWidth - 75, footerY + 20, pageWidth - 15, footerY + 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTHORIZED SIGNATORY', pageWidth - 45, footerY + 25, { align: 'center' });
  
  // Stamp Placeholder
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.2);
  doc.rect(pageWidth - 65, footerY - 5, 40, 15, 'D');
  doc.setFontSize(7);
  doc.text('FOR SINGLA TRADERS', pageWidth - 45, footerY, { align: 'center' });

  // Thank You Message
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.text('THANK YOU FOR YOUR BUSINESS!', 15, footerY + 10);
  
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer-generated invoice and requires no physical signature.', 15, footerY + 18);

  // Decorative Bottom Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Customer Care: +91-9416944433 | Website: www.singlatraders.com', pageWidth / 2, pageHeight - 4, { align: 'center' });

  return doc;
};
