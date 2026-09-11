/**
 * Reusable utility to print HTML content silently via a hidden iframe.
 * This completely avoids screen flashing, layout shifting, or reloading of the main application
 * when calling window.print(), especially useful under --kiosk-printing mode.
 */
export const printHtmlViaIframe = (htmlContent: string) => {
  // Remove existing print iframe if any to prevent clutter
  const existing = document.getElementById('printfood-silent-iframe') as HTMLIFrameElement;
  if (existing) {
    existing.remove();
  }

  // Create a new hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'printfood-silent-iframe';
  
  // Style it to be completely hidden offscreen and 0px dimensions
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  iframe.style.visibility = 'hidden';
  iframe.style.display = 'block'; // Must be block for some browsers to allow printing
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    console.error('Could not access iframe document for printing');
    return;
  }

  // Write content with exact thermal print optimizations and styling
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>PrintFood Print Job</title>
        <style>
          @page {
            margin: 0 !important;
            padding: 0 !important;
            size: auto;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          /* General thermal printer optimizations */
          * {
            color: black !important;
            background: transparent !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'Courier New', Courier, monospace !important;
            box-sizing: border-box !important;
          }

          /* Main Ticket Container Styling - REMOVED OUTER BORDERS PER USER REQUEST */
          .print-ticket-container {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 4px 0 !important;
            page-break-after: always !important;
            break-after: always !important;
            color: black !important;
            background: white !important;
            display: block !important;
          }

          /* Support for 58mm and wider papers */
          .w-full { width: 100% !important; }
          .max-w-\\[240px\\] { max-w: 240px !important; }
          .max-w-\\[320px\\] { max-w: 320px !important; }
          .max-w-\\[500px\\] { max-w: 500px !important; }

          /* Inverse styling colors for high contrast headers */
          .bg-black {
            background-color: black !important;
            color: white !important;
          }
          .text-white {
            color: white !important;
          }
          .text-white\\/80 {
            color: rgba(255, 255, 255, 0.8) !important;
          }

          /* Structure and Margins */
          .text-center { text-align: center !important; }
          .border-b-2 { border-bottom: 2px solid black !important; }
          .border-dashed { border-style: dashed !important; }
          .border-black { border-color: black !important; }
          
          .pb-2\\.5 { padding-bottom: 10px !important; }
          .pb-3 { padding-bottom: 12px !important; }
          .mb-1 { margin-bottom: 4px !important; }
          .mb-2 { margin-bottom: 8px !important; }
          .mb-3 { margin-bottom: 12px !important; }
          .mb-4 { margin-bottom: 16px !important; }
          .mt-0\\.5 { margin-top: 2px !important; }
          .mt-1\\.5 { margin-top: 6px !important; }
          
          .py-0\\.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .py-2\\.5 { padding-top: 10px !important; padding-bottom: 10px !important; }
          .px-1\\.5 { padding-left: 6px !important; padding-right: 6px !important; }
          .px-2\\.5 { padding-left: 10px !important; padding-right: 10px !important; }
          
          .rounded-md { border-radius: 6px !important; }
          .rounded-xl { border-radius: 12px !important; }

          /* Typography */
          .text-\\[9px\\] { font-size: 9px !important; }
          .text-\\[10px\\] { font-size: 10px !important; }
          .text-\\[11px\\] { font-size: 11px !important; }
          .text-\\[12px\\] { font-size: 12px !important; }
          .text-xs { font-size: 12px !important; }
          .text-sm { font-size: 14px !important; }
          .text-base { font-size: 16px !important; }
          .text-lg { font-size: 18px !important; }
          .text-xl { font-size: 20px !important; }
          .text-2xl { font-size: 24px !important; }
          .text-4xl { font-size: 36px !important; }
          
          .font-black { font-weight: 900 !important; }
          .font-semibold { font-weight: 600 !important; }
          .font-bold { font-weight: 700 !important; }
          
          .tracking-tighter { letter-spacing: -0.05em !important; }
          .tracking-wider { letter-spacing: 0.05em !important; }
          .tracking-widest { letter-spacing: 0.1em !important; }
          .leading-tight { line-height: 1.25 !important; }
          .uppercase { text-transform: uppercase !important; }

          /* Categories, Tables and Item Rows */
          .category-header {
            font-size: 13px !important;
            font-weight: 900 !important;
            border-bottom: 2px solid black !important;
            padding: 3px 0 !important;
            margin-bottom: 6px !important;
            background-color: #f0f0f0 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          
          .item-row {
            font-size: 14px !important;
            font-weight: 900 !important;
            margin-bottom: 3px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: start !important;
          }
          
          .flex { display: flex !important; }
          .justify-between { justify-content: space-between !important; }
          .items-center { align-items: center !important; }
          .items-start { align-items: flex-start !important; }
          .space-y-1\\.5 > * + * { margin-top: 6px !important; }
          .space-y-3 > * + * { margin-top: 12px !important; }
          .space-y-4 > * + * { margin-top: 16px !important; }
          .mr-1 { margin-right: 4px !important; }
          .pr-2 { padding-right: 8px !important; }
          .shrink-0 { flex-shrink: 0 !important; }
          
          /* Grayscale filters for printers */
          img, svg {
            filter: grayscale(100%) contrast(1000%) !important;
          }

          /* Dotted dividers */
          .border-b, .border-t, .border-dashed {
            border-color: black !important;
            border-style: dashed !important;
            height: auto !important;
            margin-top: 4px !important;
            margin-bottom: 4px !important;
          }
          .border-b-2 { border-bottom-width: 2px !important; border-bottom-style: dashed !important; }
          
          .w-\\[80mm\\] {
            width: 80mm !important;
            max-width: 80mm !important;
          }
          
          /* Admin Closure Styles */
          .grid {
            display: block !important; /* Stack columns vertically for thermal */
          }
          .grid-cols-2 {
            display: block !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
          ${htmlContent}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for iframe content to load and styles to apply, then print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Silent print failed, falling back to window.print', e);
      window.print();
    }
  }, 250);
};
