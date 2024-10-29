const Order = require("../../model/orderModel");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const salesPage = async (req, res) => {
  try {
    const { filterBy, startDate, endDate } = req.query;
    let query = { isDelivered: true };
    let dateQuery = {};

    if (startDate && endDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      dateQuery = {
        deliveredDate: {
          $gte: startDateTime,
          $lte: endDateTime,
        },
      };
    }

    query = { ...query, ...dateQuery };

    const deliveredOrders = await Order.find(query)
      .populate("userId")
      .populate("orderItem.productId")
      .populate("orderItem.variantId")
      .sort({ deliveredDate: -1 });

    let totalSales = 0;
    let salesData = [];

    deliveredOrders.forEach((order) => {
      order.orderItem.forEach((item) => {
        totalSales += item.totalPrice;
        salesData.push({
          orderId: order.orderId,
          deliveredDate: order.deliveredDate || null,
          productName: item.productName,
          variant: item.color,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        });
      });
    });

    res.render("admin/salesReport", {
      salesData,
      totalSales,
      deliveredCount: deliveredOrders.length,
      startDate: startDate || "",
      endDate: endDate || "",
      filterBy: filterBy || "",
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    res.status(500).render("error", { message: "Error fetching sales data" });
  }
};

const downloadSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { isDelivered: true };

    if (startDate && endDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      query.deliveredDate = {
        $gte: startDateTime,
        $lte: endDateTime,
      };
    }

    const deliveredOrders = await Order.find(query)
      .populate("userId")
      .populate("orderItem.productId")
      .populate("orderItem.variantId")
      .sort({ deliveredDate: -1 });

    const doc = new PDFDocument({
      margins: {
        top: 50,
        bottom: 50,
        left: 40,
        right: 40,
      },
      size: "A4",
      bufferPages: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    const fileName =
      startDate && endDate
        ? `sales_report_${startDate}_to_${endDate}.pdf`
        : "sales_report.pdf";
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    doc.pipe(res);

    let pageNumber = 1;

    const addPageNumber = () => {
      const bottom = doc.page.height - 30;
      doc.text(`Page ${pageNumber}`, {
        width: doc.page.width,
        align: "center",
        y: bottom,
      });
      pageNumber++;
    };

    doc.on("pageAdded", addPageNumber);

    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Sales Report", { align: "center" });
    doc.moveDown(0.5);

    if (startDate && endDate) {
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(
          `Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(
            endDate
          ).toLocaleDateString()}`,
          { align: "center" }
        );
    }
    doc.moveDown(1);

    let totalSales = 0;
    let totalItems = 0;
    deliveredOrders.forEach((order) => {
      order.orderItem.forEach((item) => {
        totalSales += item.totalPrice;
        totalItems += item.quantity;
      });
    });

    const summaryBoxY = doc.y;
    doc
      .rect(40, summaryBoxY, doc.page.width - 80, 70)
      .fillAndStroke("#f6f6f6", "#cccccc");

    doc.fillColor("#333333").fontSize(14).font("Helvetica-Bold");
    doc.text("Summary", 60, summaryBoxY + 15);

    doc.fontSize(12).font("Helvetica");
    doc.text(`Total Orders: ${deliveredOrders.length}`, 60, summaryBoxY + 35);
    doc.text(`Total Items Sold: ${totalItems}`, 250, summaryBoxY + 35);
    doc.text(`Total Sales: $${totalSales.toFixed(2)}`, 440, summaryBoxY + 35);

    doc.moveDown(3);

    const columns = {
      orderId: { x: 40, width: 120 },
      date: { x: 160, width: 100 },
      product: { x: 260, width: 160 },
      variant: { x: 420, width: 80 },
      quantity: { x: 500, width: 40 },
      price: { x: 540, width: 100 },
    };

    const headerY = doc.y;
    doc
      .rect(40, headerY - 5, doc.page.width - 80, 25)
      .fillAndStroke("#e6e6e6", "#cccccc");

    doc.fillColor("#333333").fontSize(10).font("Helvetica-Bold");
    doc.text("Order ID", columns.orderId.x, headerY, {
      width: columns.orderId.width,
    });
    doc.text("Delivery Date", columns.date.x, headerY, {
      width: columns.date.width,
    });
    doc.text("Product Name", columns.product.x, headerY, {
      width: columns.product.width,
    });
    doc.text("Variant", columns.variant.x, headerY, {
      width: columns.variant.width,
    });
    doc.text("Qty", columns.quantity.x, headerY, {
      width: columns.quantity.width,
    });
    doc.text("Price", columns.price.x, headerY, { width: columns.price.width });

    let y = headerY + 30;
    doc.font("Helvetica").fontSize(9);

    for (const order of deliveredOrders) {
      for (const item of order.orderItem) {
        if (y > 700) {
          doc.addPage();
          y = 50;

          doc
            .rect(40, y - 5, doc.page.width - 80, 25)
            .fillAndStroke("#e6e6e6", "#cccccc");

          doc.fillColor("#333333").fontSize(10).font("Helvetica-Bold");
          doc.text("Order ID", columns.orderId.x, y, {
            width: columns.orderId.width,
          });
          doc.text("Delivery Date", columns.date.x, y, {
            width: columns.date.width,
          });
          doc.text("Product Name", columns.product.x, y, {
            width: columns.product.width,
          });
          doc.text("Variant", columns.variant.x, y, {
            width: columns.variant.width,
          });
          doc.text("Qty", columns.quantity.x, y, {
            width: columns.quantity.width,
          });
          doc.text("Price", columns.price.x, y, { width: columns.price.width });

          y += 30;
          doc.font("Helvetica").fontSize(9);
        }

        doc
          .rect(40, y - 5, doc.page.width - 80, 20)
          .fillAndStroke("#f9f9f9", "#f0f0f0");

        doc.fillColor("#333333");
        doc.text(order.orderId, columns.orderId.x, y, {
          width: columns.orderId.width,
        });
        doc.text(
          order.deliveredDate
            ? new Date(order.deliveredDate).toLocaleDateString()
            : "N/A",
          columns.date.x,
          y,
          { width: columns.date.width }
        );
        doc.text(item.productName || "N/A", columns.product.x, y, {
          width: columns.product.width,
        });
        doc.text(item.color || "N/A", columns.variant.x, y, {
          width: columns.variant.width,
        });
        doc.text(item.quantity.toString(), columns.quantity.x, y, {
          width: columns.quantity.width,
        });
        doc.text(`$${item.totalPrice.toFixed(2)}`, columns.price.x, y, {
          width: columns.price.width,
        });

        y += 25;
      }
    }

    doc.moveDown();
    const totalBoxY = Math.min(y + 20, doc.page.height - 100);
    doc
      .rect(40, totalBoxY, doc.page.width - 80, 30)
      .fillAndStroke("#e6e6e6", "#cccccc");

    doc
      .fillColor("#333333")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(
        `Total Sales: $${totalSales.toFixed(2)}`,
        doc.page.width - 200,
        totalBoxY + 8,
        { align: "right" }
      );

    addPageNumber();

    doc.end();
  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).json({
      success: false,
      message: "Error generating sales report",
      error: error.message,
    });
  }
};

const downloadSalesReportExcel = async (req, res) => {
  try {
    // Extract startDate and endDate from the query parameters
    const { startDate, endDate } = req.query;

    // Define the base query: finding only delivered orders
    let query = { isDelivered: true };

    // If startDate and endDate are provided, filter by delivery date range
    if (startDate && endDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      query.deliveredDate = {
        $gte: startDateTime,
        $lte: endDateTime,
      };
    }

    // Fetch delivered orders with population of necessary fields (userId, productId, variantId)
    const deliveredOrders = await Order.find(query)
      .populate("userId")
      .populate("orderItem.productId")
      .populate("orderItem.variantId")
      .sort({ deliveredDate: -1 });

    // Create Excel Sheet or handle data here (ExcelJS or other library)
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    // Define columns for Excel file
    sheet.columns = [
      { header: "Order ID", key: "orderId", width: 20 },
      { header: "Delivery Date", key: "deliveredDate", width: 20 },
      { header: "Product Name", key: "productName", width: 30 },
      { header: "Variant", key: "variant", width: 15 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Price", key: "price", width: 15 },
    ];

    // Loop through orders and items to populate rows in the Excel file
    deliveredOrders.forEach((order) => {
      order.orderItem.forEach((item) => {
        sheet.addRow({
          orderId: order.orderId,
          deliveredDate: order.deliveredDate
            ? new Date(order.deliveredDate).toLocaleDateString()
            : "N/A",
          productName: item.productName || "N/A",
          variant: item.color || "N/A",
          quantity: item.quantity,
          price: `$${item.totalPrice.toFixed(2)}`,
        });
      });
    });

    // Set response headers for download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    const fileName =
      startDate && endDate
        ? `sales_report_${startDate}_to_${endDate}.xlsx`
        : "sales_report.xlsx";
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    // Send Excel file as a response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating sales report Excel:", error);
    res.status(500).json({
      success: false,
      message: "Error generating sales report Excel",
      error: error.message,
    });
  }
};

module.exports = { salesPage, downloadSalesReport, downloadSalesReportExcel };
