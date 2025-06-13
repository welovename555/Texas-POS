// ========== TEXAS STOCK MANAGEMENT v2.0 - SCRIPT ==========

// ========== SUPABASE & GLOBAL CONFIG ==========
const SUPABASE_URL = 'https://imohhlypiuhnbpumlgli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2hobHlwaXVobmJwdW1sZ2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NzgxMTMsImV4cCI6MjA2NTM1NDExM30.amsdnGl15xWzgdLxlRZOSJL-mIOfZ2-P7ST5cEyLt10';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ALLOWED_EMPLOYEE_IDS = ['101', '190343', '103', '2483'];
const ADMIN_ID = '2483';

// ========== GLOBAL STATE & CHART INSTANCES ==========
let state = {
    products: [],
    categories: [],
    salesLog: [],
    filteredProducts: [],
};
let charts = {
    dailySalesChart: null,
    topProductsChart: null,
};
let productUpdateChannel = null;


// ========== UTILITY & HELPER FUNCTIONS ==========
const utils = {
    getUser: () => JSON.parse(localStorage.getItem('texasUser')),
    checkAuth: () => {
        const user = utils.getUser();
        const onLoginPage = document.body.id === 'login-page';
        if (!user && !onLoginPage) window.location.href = 'login.html';
        if (user && onLoginPage) window.location.href = 'index.html';
        return user;
    },
    logout: () => {
        if (productUpdateChannel) supabase.removeChannel(productUpdateChannel);
        localStorage.removeItem('texasUser');
        window.location.href = 'login.html';
    },
    showLoader: () => document.getElementById('loader')?.classList.add('show'),
    hideLoader: () => document.getElementById('loader')?.classList.remove('show'),
    showToast: (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 5000);
    },
    createParticles: () => {
        const container = document.getElementById('particle-container');
        if (!container || container.children.length > 0) return;
        const count = 50;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = `${Math.random() * 100}vw`;
            p.style.animationDelay = `${Math.random() * 20}s`;
            p.style.animationDuration = `${10 + Math.random() * 10}s`;
            const size = `${2 + Math.random() * 3}px`;
            p.style.width = size;
            p.style.height = size;
            p.style.setProperty('--x-start', `${Math.random() * 10 - 5}vw`);
            p.style.setProperty('--x-end', `${Math.random() * 10 - 5}vw`);
            container.appendChild(p);
        }
    },
    setupNavbar: (user) => {
        if (!user) return;
        const nameEl = document.getElementById('salesperson-name-nav');
        const logoutBtn = document.getElementById('logout-btn');
        if (nameEl) nameEl.textContent = user.employee_id;
        if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            utils.logout();
        });
    },
    formatCurrency: (amount) => `฿${parseFloat(amount || 0).toFixed(2)}`,
};

// ========== PAGE INITIALIZATION ROUTER ==========
document.addEventListener('DOMContentLoaded', () => {
    utils.createParticles();
    const pageId = document.body.id;
    const user = utils.checkAuth();

    if (!user && pageId !== 'login-page') return;
    
    utils.setupNavbar(user);

    switch (pageId) {
        case 'login-page': pages.login(); break;
        case 'pos-page': pages.pos(); break;
        case 'manage-products-page': pages.manageProducts(); break;
        case 'restock-page': pages.restock(); break;
        case 'sales-history-page': pages.salesHistory(); break;
        case 'product-summary-page': pages.productSummary(); break;
    }
});


// ========== PAGE-SPECIFIC LOGIC & RENDERERS ==========
const pages = {
    // ===== LOGIN PAGE =====
    login: () => {
        const form = document.getElementById('login-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = e.target.elements['employee-id'].value.trim();
            if (ALLOWED_EMPLOYEE_IDS.includes(id)) {
                localStorage.setItem('texasUser', JSON.stringify({ employee_id: id, isAdmin: id === ADMIN_ID }));
                window.location.href = 'index.html';
            } else {
                document.getElementById('error-message').style.display = 'block';
            }
        });
    },

    // ===== POINT OF SALE (POS) PAGE =====
    pos: () => {
        const productGrid = document.getElementById('product-grid');
        const categoryTabsContainer = document.getElementById('category-tabs');
        const searchInput = document.getElementById('product-search');

        const renderProducts = (productsToRender = state.filteredProducts) => {
            productGrid.innerHTML = '';
            if (productsToRender.length === 0) {
                productGrid.innerHTML = `<p style="color: var(--text-secondary-muted);">ไม่พบสินค้าที่ตรงกัน</p>`;
                return;
            }
            productsToRender.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.dataset.productId = p.id;
                card.innerHTML = `
                    <div class="product-name">${p.product_name}</div>
                    <div class="product-price">${utils.formatCurrency(p.price)}</div>
                    <div class="product-quantity">คงเหลือ: ${p.quantity}</div>
                `;
                if (p.quantity > 0) {
                    card.addEventListener('click', () => pages.helpers.openSaleModal(p));
                } else {
                    card.style.cursor = 'not-allowed';
                    card.style.opacity = '0.5';
                }
                productGrid.appendChild(card);
            });
        };

        const renderCategories = () => {
            categoryTabsContainer.innerHTML = '';
            ['ทั้งหมด', ...state.categories].forEach((cat, index) => {
                const tab = document.createElement('div');
                tab.className = 'tab-item';
                if (index === 0) tab.classList.add('active');
                tab.textContent = cat;
                tab.dataset.category = cat;
                tab.addEventListener('click', () => {
                    document.querySelector('.tab-item.active')?.classList.remove('active');
                    tab.classList.add('active');
                    filterAndRender();
                });
                categoryTabsContainer.appendChild(tab);
            });
        };

        const filterAndRender = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const activeCategory = document.querySelector('.tab-item.active')?.dataset.category;
            
            state.filteredProducts = state.products.filter(p => {
                const matchesSearch = p.product_name.toLowerCase().includes(searchTerm);
                const matchesCategory = activeCategory === 'ทั้งหมด' || p.category === activeCategory;
                return matchesSearch && matchesCategory;
            });
            renderProducts();
        };

        searchInput.addEventListener('input', filterAndRender);

        const fetchAllProducts = async () => {
            utils.showLoader();
            const { data, error } = await supabase.from('products').select('*').order('product_name');
            if (error) {
                utils.showToast('เกิดข้อผิดพลาดในการโหลดสินค้า', 'error');
                console.error(error);
            } else {
                state.products = data;
                state.categories = [...new Set(data.map(p => p.category))].sort();
                renderCategories();
                filterAndRender();
            }
            utils.hideLoader();
        };
        
        fetchAllProducts();
        pages.helpers.listenToProductChanges(fetchAllProducts); // Real-time updates
        pages.helpers.setupSaleModal(); // Setup modal listeners
    },

    // ===== MANAGE PRODUCTS PAGE =====
    manageProducts: () => {
        const user = utils.getUser();
        const tableBody = document.querySelector('#product-table tbody');
        const searchInput = document.getElementById('manage-product-search');
        
        if (user.isAdmin) {
            document.getElementById('add-product-section').style.display = 'block';
            pages.helpers.setupAddProductForm();
        }

        const renderTable = (productsToRender = state.products) => {
            tableBody.innerHTML = '';
            productsToRender.forEach(p => {
                const row = document.createElement('tr');
                row.dataset.productId = p.id;
                row.innerHTML = `
                    <td>${p.id}</td>
                    <td>${p.product_name}</td>
                    <td>${p.quantity}</td>
                    <td>${utils.formatCurrency(p.price)}</td>
                    <td>${p.category || '-'}</td>
                    <td class="action-links">
                        <a href="#" class="delete-link" data-id="${p.id}">ลบ</a>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('.delete-link').forEach(btn => btn.addEventListener('click', pages.helpers.deleteProduct));
        };

        const filterAndRender = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filtered = state.products.filter(p => 
                p.product_name.toLowerCase().includes(searchTerm) ||
                p.category?.toLowerCase().includes(searchTerm)
            );
            renderTable(filtered);
        };
        
        searchInput.addEventListener('input', filterAndRender);
        
        const fetchAllProducts = async () => {
            utils.showLoader();
            const { data, error } = await supabase.from('products').select('*').order('id');
            if (error) {
                utils.showToast('โหลดข้อมูลสินค้าล้มเหลว', 'error');
            } else {
                state.products = data;
                renderTable();
            }
            utils.hideLoader();
        };

        fetchAllProducts();
        pages.helpers.listenToProductChanges(fetchAllProducts, (updatedRowId) => {
             // Highlight updated row
            const row = tableBody.querySelector(`tr[data-product-id='${updatedRowId}']`);
            if(row) {
                row.classList.add('row-updated');
                setTimeout(() => row.classList.remove('row-updated'), 1500);
            }
        });
    },
    
    // ===== RESTOCK PAGE =====
    restock: async () => {
        const select = document.getElementById('restock-product-select');
        const form = document.getElementById('restock-form');
        
        utils.showLoader();
        const { data: products, error } = await supabase.from('products').select('id, product_name').order('product_name');
        utils.hideLoader();
        
        if (error) return utils.showToast('ไม่สามารถโหลดรายการสินค้า', 'error');

        products.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.product_name;
            select.appendChild(option);
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = select.value;
            const quantityToAdd = parseInt(document.getElementById('restock-quantity').value);

            if (!productId || !quantityToAdd || quantityToAdd <= 0) {
                return utils.showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
            }
            
            utils.showLoader();
            const { error: rpcError } = await supabase.rpc('add_stock', {
                product_id_to_update: productId,
                quantity_to_add: quantityToAdd
            });
            utils.hideLoader();
            
            if (rpcError) {
                utils.showToast('เติมสต็อกล้มเหลว', 'error');
                console.error(rpcError);
            } else {
                utils.showToast('เติมสต็อกสินค้าสำเร็จ');
                form.reset();
            }
        });
    },
    
    // ===== SALES HISTORY PAGE =====
    salesHistory: async () => {
        utils.showLoader();
        const today = new Date();
        const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        document.getElementById('today-date').textContent = new Date().toLocaleDateString('th-TH');

        const { data, error } = await supabase.from('sales_log').select(`*, products (product_name)`)
            .gte('created_at', todayStart).lte('created_at', todayEnd).order('created_at', { ascending: false });
        utils.hideLoader();

        if (error) return utils.showToast('ไม่สามารถโหลดประวัติการขาย', 'error');
        
        const body = document.getElementById('sales-log-body');
        body.innerHTML = '';
        let totalCash = 0, totalTransfer = 0;

        data.forEach(sale => {
            const saleTotal = sale.total_amount;
            if (sale.payment_method === 'เงินสด') totalCash += saleTotal;
            else totalTransfer += saleTotal;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(sale.created_at).toLocaleTimeString('th-TH')}</td>
                <td>${sale.products.product_name}</td>
                <td style="text-align: center;">${sale.quantity_sold}</td>
                <td class="${sale.payment_method === 'เงินสด' ? 'cash' : 'transfer'}" style="text-align: center;">${sale.payment_method}</td>
                <td style="text-align: right;">${utils.formatCurrency(saleTotal)}</td>
                <td style="text-align: center;">${sale.salesperson_name}</td>
            `;
            body.appendChild(row);
        });

        document.getElementById('total-cash').textContent = utils.formatCurrency(totalCash);
        document.getElementById('total-transfer').textContent = utils.formatCurrency(totalTransfer);
        document.getElementById('total-sales').textContent = utils.formatCurrency(totalCash + totalTransfer);
    },

    // ===== PRODUCT SUMMARY PAGE =====
    productSummary: () => {
        const form = document.getElementById('date-filter-form');
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('start-date').value = today;
        document.getElementById('end-date').value = today;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            utils.showLoader();
            const startDate = new Date(document.getElementById('start-date').value);
            startDate.setHours(0,0,0,0);
            const endDate = new Date(document.getElementById('end-date').value);
            endDate.setHours(23,59,59,999);

            const { data, error } = await supabase.from('sales_log').select(`*, products (product_name)`)
                .gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
            utils.hideLoader();

            if (error) return utils.showToast('โหลดข้อมูลสรุปการขายล้มเหลว', 'error');
            if (data.length === 0) return utils.showToast('ไม่พบข้อมูลในช่วงวันที่ที่เลือก', 'error');
            
            document.getElementById('summary-content').style.display = 'block';
            pages.helpers.processSummaryData(data);
        });
    },

    // ===== HELPER FUNCTIONS FOR PAGES =====
    helpers: {
        openSaleModal: (product) => {
            const modal = document.getElementById('sale-modal');
            modal.style.display = 'block';
            document.getElementById('modal-product-name').textContent = `ขาย: ${product.product_name}`;
            document.getElementById('modal-product-id').value = product.id;
            const qtyInput = document.getElementById('modal-quantity-sold');
            qtyInput.value = 1;
            qtyInput.max = product.quantity;
            document.getElementById('modal-product-price').value = product.price;
        },

        setupSaleModal: () => {
            const modal = document.getElementById('sale-modal');
            document.getElementById('close-modal-btn').addEventListener('click', () => modal.style.display = 'none');
            document.getElementById('sale-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const productId = document.getElementById('modal-product-id').value;
                const product = state.products.find(p => p.id == productId);
                const quantitySold = parseInt(document.getElementById('modal-quantity-sold').value);

                if (quantitySold > product.quantity) return utils.showToast('สินค้าในสต็อกไม่เพียงพอ', 'error');
                
                utils.showLoader();
                // Use RPC to ensure atomic operation
                const { error } = await supabase.rpc('process_sale', {
                    p_id: productId,
                    q_sold: quantitySold,
                    p_method: document.getElementById('modal-payment-method').value,
                    s_name: utils.getUser().employee_id,
                    p_per_item: product.price
                });
                utils.hideLoader();

                if (error) {
                    utils.showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
                    console.error(error);
                } else {
                    utils.showToast('บันทึกการขายสำเร็จ');
                    modal.style.display = 'none';
                }
            });
        },
        
        setupAddProductForm: () => {
             document.getElementById('add-product-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                utils.showLoader();
                const newProduct = {
                    product_name: document.getElementById('product-name').value,
                    quantity: document.getElementById('quantity').value,
                    price: document.getElementById('price').value,
                    category: document.getElementById('category').value,
                };
                const { error } = await supabase.from('products').insert([newProduct]);
                utils.hideLoader();
                if (error) {
                    utils.showToast('เพิ่มสินค้าล้มเหลว', 'error');
                } else {
                    utils.showToast('เพิ่มสินค้าใหม่สำเร็จ');
                    e.target.reset();
                }
            });
        },

        deleteProduct: async (e) => {
            e.preventDefault();
            const id = e.target.dataset.id;
            if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;

            // Check for related sales records first
             const { data: sales, error: salesError } = await supabase
                .from('sales_log').select('sale_id').eq('product_id', id).limit(1);

            if (salesError) return utils.showToast('ตรวจสอบประวัติการขายล้มเหลว', 'error');
            if (sales.length > 0) return utils.showToast('ไม่สามารถลบได้ มีประวัติการขายอยู่', 'error');
            
            utils.showLoader();
            const { error } = await supabase.from('products').delete().eq('id', id);
            utils.hideLoader();

            if (error) utils.showToast('ลบสินค้าล้มเหลว', 'error');
            else utils.showToast('ลบสินค้าสำเร็จ');
        },
        
        listenToProductChanges: (callback, highlightCallback) => {
             if (productUpdateChannel) return; // Prevent multiple listeners
             productUpdateChannel = supabase.channel('product-updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
                    console.log('Realtime update received:', payload);
                    if (callback) callback(); // Refetch all data
                    if (highlightCallback && payload.eventType === 'UPDATE') {
                        highlightCallback(payload.new.id);
                    }
                })
                .subscribe();
        },
        
        processSummaryData: (salesData) => {
            const summary = salesData.reduce((acc, sale) => {
                const id = sale.product_id;
                if (!acc.products[id]) {
                    acc.products[id] = { name: sale.products.product_name, qty: 0, revenue: 0 };
                }
                acc.products[id].qty += sale.quantity_sold;
                acc.products[id].revenue += sale.total_amount;
                
                const date = new Date(sale.created_at).toLocaleDateString('en-CA'); // YYYY-MM-DD
                if (!acc.daily[date]) acc.daily[date] = 0;
                acc.daily[date] += sale.total_amount;

                return acc;
            }, { products: {}, daily: {} });

            // Render table
            const tableBody = document.getElementById('product-summary-body');
            tableBody.innerHTML = '';
            Object.values(summary.products).sort((a,b) => b.revenue - a.revenue).forEach(p => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${p.name}</td>
                    <td>${p.qty}</td>
                    <td>${utils.formatCurrency(p.revenue)}</td>
                `;
                tableBody.appendChild(row);
            });
            
            // Render charts
            pages.helpers.renderDailySalesChart(summary.daily);
            pages.helpers.renderTopProductsChart(summary.products);
        },

        renderDailySalesChart: (dailyData) => {
            const ctx = document.getElementById('daily-sales-chart').getContext('2d');
            const sortedDates = Object.keys(dailyData).sort();
            const labels = sortedDates.map(date => new Date(date).toLocaleDateString('th-TH'));
            const data = sortedDates.map(date => dailyData[date]);
            
            if(charts.dailySalesChart) charts.dailySalesChart.destroy();
            charts.dailySalesChart = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets: [{
                    label: 'ยอดขายรายวัน',
                    data: data,
                    borderColor: 'rgba(0, 224, 255, 1)',
                    backgroundColor: 'rgba(0, 224, 255, 0.2)',
                    fill: true,
                    tension: 0.3,
                }]},
                options: pages.helpers.getChartOptions('แนวโน้มยอดขายรายวัน'),
            });
        },
        
        renderTopProductsChart: (productData) => {
            const ctx = document.getElementById('top-products-chart').getContext('2d');
            const topProducts = Object.values(productData).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
            const labels = topProducts.map(p => p.name);
            const data = topProducts.map(p => p.revenue);

            if(charts.topProductsChart) charts.topProductsChart.destroy();
            charts.topProductsChart = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets: [{
                    label: 'ยอดขาย (บาท)',
                    data: data,
                    backgroundColor: [
                        'rgba(0, 224, 255, 0.7)',
                        'rgba(204, 0, 255, 0.7)',
                        'rgba(0, 255, 192, 0.7)',
                        'rgba(255, 215, 0, 0.7)',
                        'rgba(255, 69, 0, 0.7)',
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                }]},
                options: pages.helpers.getChartOptions('5 อันดับสินค้าขายดี (ตามยอดขาย)'),
            });
        },
        
        getChartOptions: (title) => ({
             responsive: true,
             maintainAspectRatio: false,
             plugins: {
                 legend: { labels: { color: 'rgba(240, 240, 255, 0.8)' } },
                 title: { display: true, text: title, color: 'rgba(240, 240, 255, 1)', font: { size: 16, family: "'Kanit', sans-serif" }}
             },
             scales: {
                 y: { ticks: { color: 'rgba(160, 160, 192, 0.8)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                 x: { ticks: { color: 'rgba(160, 160, 192, 0.8)' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
             }
        })
    }
};

