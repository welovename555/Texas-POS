document.addEventListener('DOMContentLoaded', () => {
    const { jsPDF } = window.jspdf;

    const tableBody = document.getElementById('report-table-body');
    const filterBtn = document.getElementById('filter-btn');
    const employeeFilter = document.getElementById('employee-filter');
    const summaryTotalSales = document.getElementById('summary-total-sales');
    const summaryTotalBills = document.getElementById('summary-total-bills');
    const summaryBestSeller = document.getElementById('summary-best-seller');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    let salesData = [];

    const init = async () => {
        await populateEmployeeFilter();
        await fetchAndRenderReports();
        setupEventListeners();
    };

    const populateEmployeeFilter = async () => {
        const { data, error } = await supabase.from('employees').select('id, name');
        if (error) { console.error('Error fetching employees:', error); return; }
        data.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.name} (${emp.id})`;
            employeeFilter.appendChild(option);
        });
    };
    
    const fetchAndRenderReports = async () => {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">กำลังโหลด...</td></tr>`;
        let query = supabase.from('sales').select(`id, created_at, total_amount, payment_method, employees (name), sale_items (product_name, quantity)`).order('created_at', { ascending: false });
        const dateStart = document.getElementById('date-start').value;
        const dateEnd = document.getElementById('date-end').value;
        const employeeId = employeeFilter.value;
        if(dateStart) query = query.gte('created_at', new Date(dateStart).toISOString());
        if(dateEnd) { const d = new Date(dateEnd); d.setDate(d.getDate() + 1); query = query.lte('created_at', d.toISOString()); }
        if(employeeId) query = query.eq('employee_id', employeeId);
        const { data, error } = await query;
        if (error) { console.error("Error fetching sales:", error); tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">เกิดข้อผิดพลาด</td></tr>`; return; }
        salesData = data;
        renderTable(data);
        updateSummary(data);
    };

    const renderTable = (data) => {
        if (data.length === 0) { tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">ไม่พบข้อมูล</td></tr>`; return; }
        tableBody.innerHTML = data.map(sale => `<tr class="hover:bg-gray-50"><td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">...${sale.id.slice(-6)}</td><td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${new Date(sale.created_at).toLocaleString('th-TH')}</td><td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${sale.employees.name}</td><td class="px-4 py-2 whitespace-nowrap text-sm text-right font-semibold text-green-600">฿${parseFloat(sale.total_amount).toFixed(2)}</td><td class="px-4 py-2 whitespace-nowrap text-sm text-center">${sale.payment_method}</td><td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-center"><details class="cursor-pointer"><summary>ดูรายการ</summary><ul class="text-left bg-gray-100 p-2 rounded-md mt-1">${sale.sale_items.map(item => `<li>${item.product_name} x ${item.quantity}</li>`).join('')}</ul></details></td></tr>`).join('');
    };
    
    const updateSummary = (data) => {
        summaryTotalSales.textContent = `฿${data.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0).toFixed(2)}`;
        summaryTotalBills.textContent = data.length;
        if (data.length > 0) {
            const productCounts = {};
            data.forEach(sale => sale.sale_items.forEach(item => { productCounts[item.product_name] = (productCounts[item.product_name] || 0) + item.quantity; }));
            summaryBestSeller.textContent = Object.keys(productCounts).reduce((a, b) => productCounts[a] > productCounts[b] ? a : b, '-');
        } else {
            summaryBestSeller.textContent = '-';
        }
    };
    
    const exportToCSV = () => {
        const csvData = salesData.flatMap(sale => sale.sale_items.map(item => ({ 'เลขที่บิล': sale.id, 'เวลา': new Date(sale.created_at).toLocaleString('th-TH'), 'พนักงาน': sale.employees.name, 'สินค้า': item.product_name, 'จำนวน': item.quantity, 'ยอดรวมบิล': sale.total_amount, 'ช่องทางชำระเงิน': sale.payment_method })));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };
    
    const exportToPDF = () => {
        alert("การ Export เป็น PDF พร้อมภาษาไทยยังไม่รองรับในเวอร์ชันนี้เนื่องจากความซับซ้อนของการฝังฟอนต์");
    };

    const setupEventListeners = () => {
        filterBtn.addEventListener('click', fetchAndRenderReports);
        exportCsvBtn.addEventListener('click', exportToCSV);
        exportPdfBtn.addEventListener('click', exportToPDF);
    };

    init();
});