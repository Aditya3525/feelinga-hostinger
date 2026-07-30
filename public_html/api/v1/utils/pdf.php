<?php
declare(strict_types=1);

/**
 * PDF Invoice Generator — TCPDF
 * Reference: backend/src/modules/orders/controller.ts:354-426 (PDFKit)
 * Both user invoice and admin invoice share this.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use TCPDF;

function generate_invoice_pdf(array $order, ?array $user): void
{
    $doc = new TCPDF('P', 'mm', 'A4', true, 'UTF-8');

    // Page setup
    $doc->SetCreator('Feelinga');
    $doc->SetAuthor('Feelinga Tea');
    $doc->SetTitle('Invoice ' . ($order['order_number'] ?? ''));
    $doc->setPrintHeader(false);
    $doc->setPrintFooter(false);
    $doc->SetMargins(15, 15, 15);
    $doc->AddPage();

    $y = 15;

    // Company header
    $doc->SetFont('helvetica', 'B', 20);
    $doc->SetTextColor(26, 26, 26);
    $doc->SetXY(15, $y);
    $doc->Cell(0, 10, 'Feelinga', 0, 1);
    $y += 8;

    $doc->SetFont('helvetica', '', 8);
    $doc->SetTextColor(136, 136, 136);
    $doc->SetXY(15, $y);
    $doc->Cell(0, 4, 'happiness is here', 0, 1);
    $y += 5;

    $doc->SetTextColor(85, 85, 85);
    $doc->SetXY(15, $y);
    $doc->Cell(0, 4, 'Vithubadayaji Industries Private Limited', 0, 1);
    $y += 4;
    $doc->SetXY(15, $y);
    $doc->Cell(0, 4, 'At Sulewadi, Post Piliv, Tal. Malshiras, Solapur, Maharashtra - 413310', 0, 1);
    $y += 4;
    $doc->SetXY(15, $y);
    $doc->Cell(0, 4, 'Shop Est. No. 2531100320058917 | MSME Registered', 0, 1);

    // Tax Invoice title
    $doc->SetFont('helvetica', 'B', 16);
    $doc->SetTextColor(0, 0, 0);
    $doc->SetXY(130, 15);
    $doc->Cell(65, 10, 'TAX INVOICE', 0, 1, 'R');

    $doc->SetFont('helvetica', '', 10);
    $orderNum = $order['order_number'] ?? 'N/A';
    $createdAt = $order['created_at'] ?? date('Y-m-d');
    $doc->SetXY(130, 27);
    $doc->Cell(65, 5, "Invoice #: {$orderNum}", 0, 1, 'R');
    $doc->SetXY(130, 33);
    $doc->Cell(65, 5, 'Date: ' . date('d/m/Y', strtotime($createdAt)), 0, 1, 'R');

    $y = 52;
    $doc->SetDrawColor(220, 220, 220);
    $doc->Line(15, $y, 195, $y);
    $y += 5;

    // Bill To
    $doc->SetFont('helvetica', 'B', 11);
    $doc->SetXY(15, $y);
    $doc->Cell(0, 5, 'Bill To:', 0, 1);
    $y += 6;

    $doc->SetFont('helvetica', '', 10);
    $name = ($order['ship_first_name'] ?? '') . ' ' . ($order['ship_last_name'] ?? '');
    $addr = array_filter([$order['ship_line1'] ?? '', $order['ship_line2'] ?? '', $order['ship_city'] ?? '', $order['ship_state'] ?? '', $order['ship_pincode'] ?? '']);
    $email = $user['email'] ?? 'N/A';

    $doc->SetXY(15, $y);
    $doc->Cell(0, 5, trim($name), 0, 1);
    $y += 5;
    $doc->SetXY(15, $y);
    $doc->Cell(0, 5, implode(', ', $addr), 0, 1);
    $y += 5;
    $doc->SetXY(15, $y);
    $doc->Cell(0, 5, 'Phone: ' . ($order['ship_phone'] ?? 'N/A'), 0, 1);
    $y += 5;
    $doc->SetXY(15, $y);
    $doc->Cell(0, 5, 'Email: ' . $email, 0, 1);
    $y += 8;

    $doc->Line(15, $y, 195, $y);
    $y += 4;

    // Table header
    $doc->SetFont('helvetica', 'B', 9);
    $doc->SetXY(15, $y);
    $doc->Cell(75, 5, 'Item', 0, 0);
    $doc->Cell(25, 5, 'Size', 0, 0, 'C');
    $doc->Cell(15, 5, 'Qty', 0, 0, 'C');
    $doc->Cell(30, 5, 'Price', 0, 0, 'R');
    $doc->Cell(30, 5, 'Total', 0, 1, 'R');
    $y += 5;
    $doc->Line(15, $y, 195, $y);
    $y += 3;

    // Items
    $doc->SetFont('helvetica', '', 9);
    $items = $order['items'] ?? [];
    foreach ($items as $item) {
        $itemTotal = (float)($item['price'] ?? 0) * (int)($item['qty'] ?? 1);
        $doc->SetXY(15, $y);
        $doc->Cell(75, 5, $item['name'] ?? '', 0, 0);
        $doc->Cell(25, 5, $item['size'] ?? '', 0, 0, 'C');
        $doc->Cell(15, 5, (string)($item['qty'] ?? ''), 0, 0, 'C');
        $doc->Cell(30, 5, '₹' . number_format((float)$item['price'], 0), 0, 0, 'R');
        $doc->Cell(30, 5, '₹' . number_format($itemTotal, 0), 0, 1, 'R');
        $y += 6;
    }

    $y += 4;
    $doc->Line(130, $y, 195, $y);
    $y += 5;

    // Totals
    $doc->SetXY(130, $y);
    $doc->Cell(30, 5, 'Subtotal', 0, 0);
    $doc->Cell(30, 5, '₹' . number_format((float)($order['subtotal'] ?? 0), 0), 0, 1, 'R');
    $y += 6;

    $doc->SetXY(130, $y);
    $doc->Cell(30, 5, 'Shipping', 0, 0);
    $shipText = ($order['shipping'] ?? 0) == 0 ? 'FREE' : '₹' . number_format((float)$order['shipping'], 0);
    $doc->Cell(30, 5, $shipText, 0, 1, 'R');
    $y += 6;

    $doc->SetXY(130, $y);
    $doc->Cell(30, 5, 'Tax (GST 5%)', 0, 0);
    $doc->Cell(30, 5, '₹' . number_format((float)($order['tax'] ?? 0), 0), 0, 1, 'R');
    $y += 8;

    $doc->Line(130, $y, 195, $y);
    $y += 5;

    $doc->SetFont('helvetica', 'B', 11);
    $doc->SetXY(130, $y);
    $doc->Cell(30, 5, 'Total', 0, 0);
    $doc->Cell(30, 5, '₹' . number_format((float)($order['total'] ?? 0), 0), 0, 1, 'R');

    $y += 15;
    $doc->SetFont('helvetica', '', 9);
    $doc->SetTextColor(102, 102, 102);
    $doc->SetXY(15, $y);
    $doc->Cell(0, 5, 'Payment: ' . strtoupper($order['payment_method'] ?? 'N/A') . ' | Status: ' . ($order['payment_status'] ?? 'pending'), 0, 1);

    // Footer
    $doc->SetFont('helvetica', '', 7.5);
    $doc->SetTextColor(170, 170, 170);
    $doc->SetXY(15, 270);
    $doc->Cell(180, 5, 'Feelinga (Vithubadayaji Industries Pvt. Ltd.) - Shop Est. No. 2531100320058917 - www.feelinga.com', 0, 1, 'C');

    // Output
    $doc->Output("invoice-{$orderNum}.pdf", 'D');
}
