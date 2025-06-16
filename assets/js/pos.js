document.addEventListener('DOMContentLoaded', () => {
    // --- Security & Session Check ---
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
    if (!currentEmployee) {
        window.location.href = 'index.html';
        return;
    }

    // --- State ---
    let products = [];
    let categories = [];
    let cart = []; // { productId, name, price, quantity }
    let idleTimer; // For the auto-logout feature

    // --- Elements ---
    const employeeInfoEl = document.getElementById('employee-info');
    const adminMenuLink = document.getElementById('admin-menu-link');
    const logoutBtn = document.getElementById('logout-btn');
    const datetimeEl = document.getElementById('datetime');
    const categoryFiltersEl = document.getElementById('category-filters');
    const productListEl = document.getElementById('product-list');
    const orderItemsEl = document.getElementById('order-items');
    const emptyCartMessageEl = document.getElementById('empty-cart-message');
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
    
    // --- Core Functions ---

    /**
     * Initializes the entire POS page.
     */
    const init = async () => {
        setupUserUI();
        startDateTime();
        resetIdleTimer(); // Start the idle timer
        
        // Fetch initial data from Supabase
        await Promise.all([fetchCategories(), fetchProducts()]);
        
        // Render initial view
        renderCategories();
        renderProducts();
        updateCartView();

        // Setup all event listeners
        setupEventListeners();
    };

    /**
     * Sets up UI elements based on the logged-in employee's role.
     */
    const setupUserUI = () => {
        employeeInfoEl.textContent = `พนักงาน: ${currentEmployee.name} (ID: ${currentEmployee.id})`;
        if (currentEmployee.role === 'admin') {
            adminMenuLink.classList.remove('hidden');
        }
    };

    /**
     * Starts and updates the date and time display every second.
     */
    const startDateTime = () => {
        const update = () => {
            const now = new Date();
            // Use 'th-TH-u-ca-buddhist' for Buddhist calendar year
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
            const thaiDate = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', options).format(now);
            datetimeEl.textContent = `วันที่ ${thaiDate.replace(' ', ' เวลา ')}`;
        };
        update();
        setInterval(update, 1000);
    };

    /**
     * Fetches product categories from Supabase.
     */
    const fetchCategories = async () => {
        const { data, error } = await supabase.from('categories').select('*').order('id');
        if (error) {
            console.error('Error fetching categories:', error);
            return;
        }
        categories = data;
    };

    /**
     * Fetches all products from Supabase.
     */
    const fetchProducts = async () => {
        const { data, error } = await supabase.from('products').select(`*, categories(name)`).order('name');
        if (error) {
            console.error('Error fetching products:', error);
            return;
        }
        products = data.map(p => ({...p, category_name: p.categories.name}));
    };
    
    // --- UI Rendering Functions ---
    
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
        renderProducts(categoryId);
    };

    const renderProducts = (categoryId = 'all') => {
        productListEl.innerHTML = '';
        let filteredProducts = products.filter(p => categoryId === 'all' || p.category_id === categoryId);

        if (filteredProducts.length === 0) {
            productListEl.innerHTML = `<p class="col-span-full text-center text-gray-500 mt-8">ไม่พบสินค้าในหมวดหมู่นี้</p>`;
            return;
        }

        filteredProducts.forEach(product => {
            const card = document.createElement('div');
            const isOutOfStock = product.stock <= 0;
            card.className = `border border-gray-200 rounded-lg p-3 flex flex-col text-center transition-all ${isOutOfStock ? 'bg-gray-200 opacity-50 cursor-not-allowed' : 'bg-white hover:shadow-md hover:border-purple-400 cursor-pointer'}`;
            if (!isOutOfStock) card.onclick = () => addToCart(product.id);
            card.innerHTML = `<div class="bg-gray-100 h-24 rounded-md flex items-center justify-center mb-3 overflow-hidden text-purple-400 text-lg font-bold">${product.image_url ? `<img src="${product.image_url}" class="h-full w-full object-cover">` : `<span>${product.name.substring(0, 2)}</span>`}</div><h3 class="font-bold text-gray-800 text-sm flex-1">${product.name}</h3><p class="text-xs text-gray-500">คงเหลือ: ${product.stock}</p><p class="font-bold text-purple-600 text-lg">฿${parseFloat(product.price).toFixed(2)}</p>`;
            productListEl.appendChild(card);
        });
    };

    // --- Cart & Payment Functions ---

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
        emptyCartMessageEl.style.display = cart.length === 0 ? 'block' : 'none';
        if (cart.length > 0) orderItemsEl.appendChild(emptyCartMessageEl);

        cart.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'flex items-center space-x-3';
            itemEl.innerHTML = `<div class="flex-1"><p class="font-semibold text-gray-800 text-sm">${item.name}</p><p class="text-gray-500 text-xs">฿${parseFloat(item.price).toFixed(2)}</p></div><div class="flex items-center space-x-2 bg-gray-100 rounded-full"><button class="quantity-btn p-1 text-purple-600" data-product-id="${item.productId}" data-change="-1">-</button><span class="font-bold text-sm w-5 text-center">${item.quantity}</span><button class="quantity-btn p-1 text-purple-600" data-product-id="${item.productId}" data-change="1">+</button></div>`;
            orderItemsEl.appendChild(itemEl);
        });
        const total = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
        totalPriceEl.textContent = `฿${total.toFixed(2)}`;
        checkoutBtn.disabled = cart.length === 0;
    };
    
    const processPayment = async (method, receivedAmount = null) => {
        // This function remains largely the same, focusing on the transaction logic.
        // The implementation details are in the previous versions and are assumed to be correct.
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
            const saleItemsData = cart.map(item => ({ product_id: item.productId, quantity: item.quantity, price_per_unit: item.price, product_name: item.name }));
            const { data: sale, error: saleError } = await supabase.from('sales').insert({ employee_id: currentEmployee.id, payment_method: method, total_amount: total, received_amount: receivedAmount, change_amount: change }).select().single();
            if (saleError) throw saleError;
            
            const saleItemsWithSaleId = saleItemsData.map(item => ({...item, sale_id: sale.id }));
            const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsWithSaleId);
            if (itemsError) {
                await supabase.from('sales').delete().eq('id', sale.id);
                throw itemsError;
            }

            for (const item of cart) {
                await supabase.rpc('decrease_stock', { product_uuid: item.productId, qty: item.quantity });
            }

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
    
    // --- Idle Timeout & Logout Functions ---

    /**
     * Resets the idle timer. Called on user activity.
     */
    const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        // Set timeout to 1 hour (3600 * 1000 milliseconds)
        idleTimer = setTimeout(forceLogout, 3600 * 1000); 
    };

    /**
     * Logs the user out.
     */
    const forceLogout = () => {
        alert("คุณไม่ได้ใช้งานเป็นเวลานาน ระบบจะทำการออกจากระบบอัตโนมัติ");
        localStorage.removeItem('currentEmployee');
        window.location.href = 'index.html';
    };

    // --- Event Listeners ---

    const setupEventListeners = () => {
        // Logout button
        logoutBtn.onclick = forceLogout;

        // Reset idle timer on any user activity
        window.onload = resetIdleTimer;
        document.onmousemove = resetIdleTimer;
        document.onkeypress = resetIdleTimer;
        document.ontouchstart = resetIdleTimer;
        document.onclick = resetIdleTimer;

        // Cart quantity buttons (using event delegation)
        orderItemsEl.addEventListener('click', e => {
             const btn = e.target.closest('.quantity-btn');
             if (btn) {
                 const productId = btn.dataset.productId;
                 const change = parseInt(btn.dataset.change);
                 updateCartQuantity(productId, change);
             }
        });

        // Checkout button
        checkoutBtn.onclick = () => {
            if (cart.length > 0) {
                const total = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
                modalTotalEl.textContent = `฿${total.toFixed(2)}`;
                paymentModal.classList.remove('hidden');
                confirmPaymentBtn.disabled = true;
                // Reset modal state
                cashPaymentSection.classList.add('hidden');
                receivedAmountInput.value = '';
                paymentMethodButtons.forEach(b => b.classList.remove('border-purple-500', 'bg-purple-50'));
            }
        };
        
        // Payment modal listeners
        cancelPaymentBtn.onclick = () => paymentModal.classList.add('hidden');
        
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

        receivedAmountInput.oninput = () => {
            const total = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
            const received = parseFloat(receivedAmountInput.value) || 0;
            const change = received - total;
            changeAmountEl.textContent = `฿${change >= 0 ? change.toFixed(2) : '0.00'}`;
            confirmPaymentBtn.disabled = received < total;
        };
        
        confirmPaymentBtn.onclick = () => {
            const received = parseFloat(receivedAmountInput.value) || null;
            processPayment(selectedPaymentMethod, received);
        };
    };

    // --- Start the App ---
    init();
});


