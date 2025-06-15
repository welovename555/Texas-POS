document.addEventListener('DOMContentLoaded', () => {
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));

    // Security check: if not logged in, redirect to login page
    if (!currentEmployee) {
        window.location.href = 'index.html';
        return;
    }

    // --- State ---
    let products = [];
    let categories = [];
    let cart = []; // { productId, name, price, quantity }

    // --- Elements ---
    const employeeInfoEl = document.getElementById('employee-info');
    const adminMenuLink = document.getElementById('admin-menu-link');
    const logoutBtn = document.getElementById('logout-btn');
    const datetimeEl = document.getElementById('datetime');
    const productListEl = document.getElementById('product-list');
    const categoryFiltersEl = document.getElementById('category-filters');
    const searchInput = document.getElementById('search-product');
    const orderItemsEl = document.getElementById('order-items');
    const emptyCartEl = document.getElementById('empty-cart');
    const totalPriceEl = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    // Payment Modal Elements
    const paymentModal = document.getElementById('payment-modal');
    const modalTotalEl = document.getElementById('modal-total');
    const paymentMethodButtons = document.querySelectorAll('.payment-method-btn');
    const cashPaymentSection = document.getElementById('cash-payment-section');
    const receivedAmountInput = document.getElementById('received-amount');
    const changeAmountEl = document.getElementById('change-amount');
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
    const cancelPaymentBtn = document.getElementById('cancel-payment-btn');
    const successModal = document.getElementById('success-modal');
    const successChangeInfo = document.getElementById('success-change-info');

    // --- Functions ---
    
    const init = async () => {
        setupUserUI();
        startDateTime();
        await Promise.all([fetchCategories(), fetchProducts()]);
        renderCategories();
        renderProducts();
        updateCartView();
        setupEventListeners();
    };

    const setupUserUI = () => {
        employeeInfoEl.textContent = `พนักงาน: ${currentEmployee.name} (ID: ${currentEmployee.id})`;
        if (currentEmployee.role === 'admin') {
            adminMenuLink.classList.remove('hidden');
            adminMenuLink.classList.add('flex');
        }
    };

    const startDateTime = () => {
        const update = () => {
            const now = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            datetimeEl.textContent = now.toLocaleDateString('th-TH', options);
        };
        update();
        setInterval(update, 1000);
    };

    const fetchCategories = async () => {
        const { data, error } = await supabase.from('categories').select('*').order('id');
        if (error) { console.error('Error fetching categories:', error); return; }
        categories = data;
    };

    const fetchProducts = async () => {
        const { data, error } = await supabase.from('products').select(`*, categories(name)`).order('name');
        if (error) { console.error('Error fetching products:', error); return; }
        products = data.map(p => ({...p, category_name: p.categories.name}));
    };

    const renderCategories = () => {
        categoryFiltersEl.innerHTML = '';
        const allBtn = createCategoryButton({ id: 'all', name: 'ทั้งหมด' }, true);
        categoryFiltersEl.appendChild(allBtn);
        categories.forEach(cat => categoryFiltersEl.appendChild(createCategoryButton(cat)));
    };

    const createCategoryButton = (category, isActive = false) => {
        const button = document.createElement('button');
        button.textContent = category.name;
        button.dataset.categoryId = category.id;
        button.className = `flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isActive ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
        button.onclick = () => filterProducts(category.id);
        return button;
    };
    
    const filterProducts = (categoryId) => {
        document.querySelectorAll('#category-filters button').forEach(btn => {
            const isTarget = btn.dataset.categoryId == categoryId;
            btn.classList.toggle('bg-purple-600', isTarget);
            btn.classList.toggle('text-white', isTarget);
            btn.classList.toggle('bg-gray-200', !isTarget);
            btn.classList.toggle('text-gray-700', !isTarget);
        });
        renderProducts(categoryId, searchInput.value);
    };

    const renderProducts = (categoryId = 'all', searchTerm = '') => {
        productListEl.innerHTML = '';
        let filteredProducts = products.filter(p => 
            (categoryId === 'all' || p.category_id === categoryId) && 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredProducts.length === 0) {
            productListEl.innerHTML = `<p class="col-span-full text-center text-gray-500 mt-8">ไม่พบสินค้า</p>`;
            return;
        }

        filteredProducts.forEach(product => {
            const card = document.createElement('div');
            const isOutOfStock = product.stock <= 0;
            card.className = `border rounded-lg p-2 flex flex-col text-center transition-all ${isOutOfStock ? 'bg-gray-200 opacity-50 cursor-not-allowed' : 'bg-white hover:shadow-md hover:border-purple-400 cursor-pointer'}`;
            if (!isOutOfStock) card.onclick = () => addToCart(product.id);
            card.innerHTML = `<div class="h-20 bg-gray-100 rounded-md flex items-center justify-center mb-2 overflow-hidden">${product.image_url ? `<img src="${product.image_url}" class="h-full w-full object-cover">` : `<span class="text-gray-400 text-sm">${product.name.substring(0, 10)}</span>`}</div><h3 class="font-semibold text-gray-800 text-sm flex-1 leading-tight">${product.name}</h3><p class="text-xs text-gray-500">เหลือ: ${product.stock}</p><p class="font-bold text-purple-600 mt-1">฿${parseFloat(product.price).toFixed(2)}</p>`;
            productListEl.appendChild(card);
        });
    };

    const addToCart = (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product || product.stock <= 0) return;
        const cartItem = cart.find(item => item.productId === productId);
        if (cartItem) {
            if (cartItem.quantity < product.stock) cartItem.quantity++;
            else alert(`สินค้า ${product.name} มีในสต็อกไม่เพียงพอ`);
        } else {
            cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
        }
        updateCartView();
    };
    
    const updateCartQuantity = (productId, change) => {
        const cartItemIndex = cart.findIndex(item => item.productId === productId);
        if (cartItemIndex === -1) return;
        const product = products.find(p => p.id === productId);
        const newQuantity = cart[cartItemIndex].quantity + change;
        if (newQuantity > product.stock) {
             alert(`สินค้า ${product.name} มีในสต็อกไม่เพียงพอ`);
             return;
        }
        if (newQuantity <= 0) cart.splice(cartItemIndex, 1);
        else cart[cartItemIndex].quantity = newQuantity;
        updateCartView();
    };
    
    const updateCartView = () => {
        orderItemsEl.innerHTML = '';
        emptyCartEl.style.display = cart.length === 0 ? 'block' : 'none';
        cart.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'flex items-center space-x-2 p-1 bg-white rounded-md';
            itemEl.innerHTML = `<div class="flex-1"><p class="font-semibold text-gray-800 text-sm">${item.name}</p><p class="text-gray-500 text-xs">฿${parseFloat(item.price).toFixed(2)}</p></div><div class="flex items-center space-x-1"><button class="quantity-btn h-6 w-6 rounded-full bg-gray-200 text-lg flex items-center justify-center" data-product-id="${item.productId}" data-change="-1">-</button><span class="font-bold text-sm w-6 text-center">${item.quantity}</span><button class="quantity-btn h-6 w-6 rounded-full bg-gray-200 text-lg flex items-center justify-center" data-product-id="${item.productId}" data-change="1">+</button></div>`;
            orderItemsEl.appendChild(itemEl);
        });
        const total = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
        totalPriceEl.textContent = `฿${total.toFixed(2)}`;
        checkoutBtn.disabled = cart.length === 0;
    };
    
    const processPayment = async (method, receivedAmount = null) => {
        confirmPaymentBtn.disabled = true;
        const total = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
        let change = 0;
        if (method === 'เงินสด') {
            if (receivedAmount === null || receivedAmount < total) {
                alert('จำนวนเงินที่รับไม่ถูกต้อง');
                confirmPaymentBtn.disabled = false;
                return;
            }
            change = receivedAmount - total;
        }
        
        try {
            // Transaction-like process
            const saleItemsData = cart.map(item => ({ product_id: item.productId, quantity: item.quantity, price_per_unit: item.price, product_name: item.name }));
            const { data: sale, error: saleError } = await supabase.from('sales').insert({ employee_id: currentEmployee.id, payment_method: method, total_amount: total, received_amount: receivedAmount, change_amount: change }).select().single();
            if (saleError) throw saleError;
            
            const saleItemsWithSaleId = saleItemsData.map(item => ({...item, sale_id: sale.id }));
            const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsWithSaleId);
            if (itemsError) {
                await supabase.from('sales').delete().eq('id', sale.id); // Rollback sale
                throw itemsError;
            }

            for (const item of cart) {
                await supabase.rpc('decrease_stock', { product_uuid: item.productId, qty: item.quantity });
            }

            // Success
            paymentModal.classList.add('hidden');
            successChangeInfo.textContent = method === 'เงินสด' ? `เงินทอน: ฿${change.toFixed(2)}` : 'ชำระด้วยการโอนสำเร็จ';
            successModal.classList.remove('hidden');
            cart = [];
            await fetchProducts();
            renderProducts();
            updateCartView();
            setTimeout(() => successModal.classList.add('hidden'), 2500);
        } catch (error) {
            console.error('Payment processing error:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกการขาย: ' + error.message);
        } finally {
            confirmPaymentBtn.disabled = false;
        }
    };

    const setupEventListeners = () => {
        logoutBtn.onclick = () => { localStorage.removeItem('currentEmployee'); window.location.href = 'index.html'; };
        searchInput.oninput = (e) => { const activeCategory = document.querySelector('#category-filters button.bg-purple-600').dataset.categoryId; renderProducts(activeCategory, e.target.value); };
        orderItemsEl.addEventListener('click', e => { const btn = e.target.closest('.quantity-btn'); if (btn) { const productId = btn.dataset.productId; const change = parseInt(btn.dataset.change); updateCartQuantity(productId, change); } });
        checkoutBtn.onclick = () => { if (cart.length > 0) { const total = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0); modalTotalEl.textContent = `฿${total.toFixed(2)}`; paymentModal.classList.remove('hidden'); confirmPaymentBtn.disabled = true; } };
        cancelPaymentBtn.onclick = () => { paymentModal.classList.add('hidden'); cashPaymentSection.classList.add('hidden'); receivedAmountInput.value = ''; paymentMethodButtons.forEach(b => b.classList.remove('border-purple-500', 'bg-purple-50')); };
        
        let selectedPaymentMethod = null;
        paymentMethodButtons.forEach(btn => {
            btn.onclick = () => {
                selectedPaymentMethod = btn.dataset.method;
                paymentMethodButtons.forEach(b => b.classList.remove('border-purple-500', 'bg-purple-50'));
                btn.classList.add('border-purple-500', 'bg-purple-50');
                if (selectedPaymentMethod === 'เงินสด') { cashPaymentSection.classList.remove('hidden'); confirmPaymentBtn.disabled = receivedAmountInput.value === ''; }
                else { cashPaymentSection.classList.add('hidden'); confirmPaymentBtn.disabled = false; }
            };
        });

        receivedAmountInput.oninput = () => { const total = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0); const received = parseFloat(receivedAmountInput.value) || 0; const change = received - total; changeAmountEl.textContent = `฿${change >= 0 ? change.toFixed(2) : '0.00'}`; confirmPaymentBtn.disabled = received < total; };
        confirmPaymentBtn.onclick = () => { const received = parseFloat(receivedAmountInput.value) || null; processPayment(selectedPaymentMethod, received); };
    };

    init();
});