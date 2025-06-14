// ===================================================================================
// SCRIPT.JS - v8 (Validated Employee ID Login)
// ===================================================================================

// Import Supabase client directly as an ES Module.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- MAIN EXECUTION ---
document.addEventListener('DOMContentLoaded', () => {

    // --- SUPABASE SETUP ---
    const SUPABASE_URL = 'https://imohhlypiuhnbpumlgli.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2hobHlwaXVobmJwdW1sZ2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NzgxMTMsImV4cCI6MjA2NTM1NDExM30.amsdnGl15xWzgdLxlRZOSJL-mIOfZ2-P7ST5cEyLt10';
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    });

    // --- GLOBAL STATE ---
    let state = {
        products: [],
        categories: [],
        activeCategory: 'ทั้งหมด',
        currentUser: sessionStorage.getItem('pos-user-displayname') || null
    };

    // --- DOM ELEMENTS (COMMON) ---
    const loaderOverlay = document.getElementById('loader-overlay');
    const appView = document.getElementById('app-view');
    const modalContainer = document.getElementById('modal-container');
    const modalContent = document.getElementById('modal-content');

    // --- UTILITY FUNCTIONS ---
    const showLoader = () => loaderOverlay?.classList.remove('hidden');
    const hideLoader = () => loaderOverlay?.classList.add('hidden');

    const showNotification = (message, type = 'info') => {
        const colors = {
            info: 'bg-blue-500', success: 'bg-green-500',
            warning: 'bg-yellow-500', error: 'bg-red-500',
        };
        const notification = document.createElement('div');
        notification.className = `fixed bottom-5 right-5 ${colors[type]} text-white py-3 px-5 rounded-lg shadow-xl transform translate-y-20 opacity-0 transition-all duration-300 ease-out z-[10000]`;
        notification.innerHTML = `<p>${message}</p>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.remove('translate-y-20', 'opacity-0'), 100);
        setTimeout(() => {
            notification.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => notification.remove(), 3000);
        }, 3000);
    };

    const showModal = () => {
        if (!modalContainer) return;
        modalContainer.classList.remove('hidden');
        setTimeout(() => {
            modalContainer.classList.add('opacity-100');
            modalContent?.classList.add('scale-100');
        }, 10);
    };

    const hideModal = () => {
        if (!modalContainer) return;
        modalContainer.classList.remove('opacity-100');
        modalContent?.classList.remove('scale-100');
        setTimeout(() => {
            modalContainer.classList.add('hidden');
            if (modalContent) modalContent.innerHTML = '';
        }, 300);
    };

    const showConfirmation = (message, onConfirm) => {
        if (!modalContent) return;
        modalContent.innerHTML = `
            <h3 class="text-lg font-bold mb-4">ยืนยันการกระทำ</h3>
            <p>${message}</p>
            <div class="mt-6 flex justify-end gap-3">
                <button class="cancel-modal-btn py-2 px-4 bg-slate-200 rounded-md font-semibold hover:bg-slate-300">ยกเลิก</button>
                <button id="confirm-ok" class="py-2 px-4 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700">ยืนยัน</button>
            </div>
        `;
        showModal();
        document.getElementById('confirm-ok').onclick = () => {
            hideModal();
            onConfirm();
        };
        modalContent.querySelector('.cancel-modal-btn').onclick = hideModal;
    };

    // --- DATA FETCHING ---
    async function fetchProducts() {
        showLoader();
        const { data, error } = await db.from('products').select('*').order('product_name', { ascending: true });
        hideLoader();
        if (error) {
            console.error('Error fetching products:', error);
            showNotification('ไม่สามารถโหลดข้อมูลสินค้าได้', 'error');
            return;
        }
        state.products = data.map(p => ({
            id: p.id,
            name: p.product_name,
            stock: p.quantity,
            price: p.price,
            category: p.category
        }));
        const categories = [...new Set(state.products.map(p => p.category || 'ไม่มีหมวดหมู่'))];
        state.categories = ['ทั้งหมด', ...categories];
    }

    // --- CART MANAGEMENT ---
    const getCart = () => JSON.parse(sessionStorage.getItem('pos-cart')) || [];
    const saveCart = (cart) => sessionStorage.setItem('pos-cart', JSON.stringify(cart));

    // --- PAGE-SPECIFIC RENDER FUNCTIONS ---
    async function renderPosPage() {
        await fetchProducts();
        renderCategoryFilters();
        renderProductList();
        renderCart();
    }
    
    function renderCategoryFilters() {
        const container = document.getElementById('category-filters');
        if (!container) return;
        container.innerHTML = '';
        state.categories.forEach(cat => {
            const button = document.createElement('button');
            button.textContent = cat;
            button.className = `category-btn px-4 py-2 text-sm font-semibold border rounded-full transition-colors ${state.activeCategory === cat ? 'active' : 'bg-white text-slate-700 hover:bg-slate-100'}`;
            button.onclick = () => {
                state.activeCategory = cat;
                renderCategoryFilters();
                renderProductList();
            };
            container.appendChild(button);
        });
    }

    function renderProductList() {
        const container = document.getElementById('product-list');
        if (!container) return;
        container.innerHTML = '';
        const filteredProducts = state.activeCategory === 'ทั้งหมด'
            ? state.products
            : state.products.filter(p => p.category === state.activeCategory);

        if (filteredProducts.length === 0) {
            container.innerHTML = '<p class="col-span-full text-center text-slate-400">ไม่พบสินค้าในหมวดหมู่นี้</p>';
            return;
        }
        filteredProducts.forEach(p => {
            if (p.stock > 0) {
                const productCard = document.createElement('div');
                productCard.className = `product-card bg-slate-50 rounded-lg p-3 text-center cursor-pointer flex flex-col items-center`;
                productCard.dataset.productId = p.id;
                productCard.innerHTML = `
                    <img src="https://placehold.co/150x150/a78bfa/ffffff?text=${encodeURIComponent(p.name)}" alt="${p.name}" class="w-24 h-24 object-cover rounded-md mb-2">
                    <p class="font-semibold text-sm flex-grow">${p.name}</p>
                    <p class="text-indigo-600 font-bold">฿${Number(p.price).toFixed(2)}</p>
                    <p class="text-xs ${p.stock < 10 ? 'text-red-500 font-bold' : 'text-slate-400'}">คงเหลือ: ${p.stock}</p>
                `;
                productCard.addEventListener('click', () => addToCart(p.id));
                container.appendChild(productCard);
            }
        });
    }
    
    function renderCart() {
        const cartItemsEl = document.getElementById('cart-items');
        const cartTotalEl = document.getElementById('cart-total');
        if (!cartItemsEl || !cartTotalEl) return;

        const cart = getCart();
        cartItemsEl.innerHTML = cart.length === 0 
            ? '<p class="text-slate-400 text-center mt-8">ยังไม่มีสินค้าในตะกร้า</p>'
            : cart.map(item => `
                <div class="flex justify-between items-center mb-3 p-2 rounded-md hover:bg-slate-50">
                    <div><p class="font-semibold">${item.name}</p><p class="text-sm text-slate-500">฿${Number(item.price).toFixed(2)}</p></div>
                    <div class="flex items-center gap-2">
                        <button class="quantity-change-btn w-6 h-6 bg-slate-200 rounded-full" data-product-id="${item.productId}" data-change="-1">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-change-btn w-6 h-6 bg-slate-200 rounded-full" data-product-id="${item.productId}" data-change="1">+</button>
                        <button class="remove-item-btn text-red-500 hover:text-red-700 ml-2" data-product-id="${item.productId}"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>`).join('');
        
        const total = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
        cartTotalEl.textContent = `฿${total.toFixed(2)}`;
    }

    // Manage Products Page
    async function renderManageProductsPage() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        showLoader();
        await fetchProducts();
        hideLoader();
        mainContent.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-lg">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold">รายการสินค้าทั้งหมด</h2>
                    <button id="add-product-btn" class="py-2 px-4 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700"><i class="fa-solid fa-plus mr-2"></i>เพิ่มสินค้าใหม่</button>
                </div>
                <div class="overflow-x-auto"><table class="w-full text-left">
                    <thead><tr class="bg-slate-50 border-b">
                        <th class="p-4 font-semibold">รูป</th><th class="p-4 font-semibold">ชื่อสินค้า</th><th class="p-4 font-semibold">หมวดหมู่</th>
                        <th class="p-4 font-semibold">ราคา</th><th class="p-4 font-semibold">คงเหลือ</th><th class="p-4 font-semibold text-center">จัดการ</th>
                    </tr></thead>
                    <tbody>${state.products.map(p => `
                        <tr class="border-b hover:bg-slate-50">
                            <td class="p-4"><img src="https://placehold.co/150x150/cccccc/ffffff?text=${encodeURIComponent(p.name)}" class="w-12 h-12 rounded-md object-cover"></td>
                            <td class="p-4 font-medium">${p.name}</td>
                            <td class="p-4">${p.category || 'N/A'}</td>
                            <td class="p-4">฿${Number(p.price).toFixed(2)}</td>
                            <td class="p-4">${p.stock}</td>
                            <td class="p-4 text-center">
                                <button class="edit-product-btn text-blue-600 hover:text-blue-800 mr-2" data-product-id="${p.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button class="delete-product-btn text-red-600 hover:text-red-800" data-product-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table></div>
            </div>`;
    }

    // Sales History Page
    async function renderSalesHistoryPage() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        showLoader();
        const { data, error } = await db.from('sales_log').select(`*, products(product_name)`).order('created_at', { ascending: false });
        hideLoader();
        if (error) {
            console.error("Error fetching sales history:", error);
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-xl shadow-lg text-center">
                <i class="fa-solid fa-circle-exclamation text-4xl text-red-500 mb-4"></i>
                <h2 class="text-xl font-semibold">เกิดข้อผิดพลาด</h2>
                <p class="text-slate-500 mt-2">ไม่สามารถโหลดประวัติการขายได้<br>กรุณาตรวจสอบการตั้งค่า RLS Policy ของคุณ</p>
            </div>`;
            return;
        }
        mainContent.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-lg">
                <h2 class="text-xl font-semibold mb-4">ประวัติการขาย</h2>
                <div class="overflow-x-auto"><table class="w-full text-left">
                    <thead><tr class="bg-slate-50 border-b">
                        <th class="p-4 font-semibold">วันที่/เวลา</th><th class="p-4 font-semibold">ชื่อสินค้า</th><th class="p-4 font-semibold">จำนวน</th>
                        <th class="p-4 font-semibold">การชำระเงิน</th><th class="p-4 font-semibold">พนักงานขาย</th>
                    </tr></thead>
                    <tbody>${data.map(sale => `
                         <tr class="border-b hover:bg-slate-50">
                            <td class="p-4">${new Date(sale.created_at).toLocaleString('th-TH')}</td>
                            <td class="p-4">${sale.products ? sale.products.product_name : '<span class="text-red-500">สินค้านี้ถูกลบไปแล้ว</span>'}</td>
                            <td class="p-4">${sale.quantity_sold}</td>
                            <td class="p-4">${sale.payment_method}</td>
                            <td class="p-4">${sale.salesperson_name}</td>
                        </tr>`).join('') || '<tr><td colspan="5" class="text-center p-8 text-slate-400">ยังไม่มีประวัติการขาย</td></tr>'}
                    </tbody>
                </table></div>
            </div>`;
    }

    // Restock Page
    async function renderRestockPage() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        showLoader();
        await fetchProducts();
        hideLoader();
        mainContent.innerHTML = `
           <div class="bg-white p-6 rounded-xl shadow-lg">
               <h2 class="text-xl font-semibold mb-4">สรุปและเติมสต็อกสินค้า</h2>
               <div class="overflow-x-auto"><table class="w-full text-left">
                   <thead><tr class="bg-slate-50 border-b">
                       <th class="p-4 font-semibold">รูป</th><th class="p-4 font-semibold">ชื่อสินค้า</th><th class="p-4 font-semibold">คงเหลือ</th>
                       <th class="p-4 font-semibold text-center">เพิ่มสต็อก</th>
                   </tr></thead>
                   <tbody>${state.products.map(p => `
                       <tr class="border-b hover:bg-slate-50">
                           <td class="p-4"><img src="https://placehold.co/150x150/cccccc/ffffff?text=${encodeURIComponent(p.name)}" class="w-12 h-12 rounded-md object-cover"></td>
                           <td class="p-4 font-medium">${p.name}</td>
                           <td class="p-4 font-bold ${p.stock < 10 ? 'text-red-500' : 'text-green-500'}">${p.stock}</td>
                           <td class="p-4 text-center">
                               <div class="flex justify-center items-center gap-2">
                                  <input type="number" min="1" class="restock-amount-input w-24 text-center border rounded-md p-1" data-product-id="${p.id}" placeholder="จำนวน">
                                  <button class="restock-btn bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600" data-product-id="${p.id}">ยืนยัน</button>
                               </div>
                           </td>
                       </tr>`).join('')}
                   </tbody>
               </table></div>
           </div>`;
    }

    // --- ACTION HANDLERS ---
    const addToCart = (productId) => {
        const product = state.products.find(p => p.id === productId);
        if (!product || product.stock <= 0) return showNotification('สินค้าหมด!', 'error');

        let cart = getCart();
        const cartItem = cart.find(item => item.productId === productId);
        if (cartItem) {
            if (cartItem.quantity < product.stock) cartItem.quantity++;
            else return showNotification('สินค้าในสต็อกไม่เพียงพอ!', 'warning');
        } else {
            cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock });
        }
        saveCart(cart);
        renderCart();
    };
    
    const handleCartActions = (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const productId = parseInt(target.dataset.productId);
        let cart = getCart();

        if (target.classList.contains('quantity-change-btn')) {
            const change = parseInt(target.dataset.change);
            const cartItem = cart.find(item => item.productId === productId);
            if (cartItem) {
                const newQuantity = cartItem.quantity + change;
                if (newQuantity > 0) {
                    if (newQuantity <= cartItem.stock) cartItem.quantity = newQuantity;
                    else showNotification('สินค้าในสต็อกไม่เพียงพอ!', 'warning');
                } else {
                    cart = cart.filter(item => item.productId !== productId);
                }
            }
        } else if (target.classList.contains('remove-item-btn')) {
            cart = cart.filter(item => item.productId !== productId);
        }
        saveCart(cart);
        renderCart();
    };

    const clearCart = () => {
        saveCart([]);
        renderCart();
    };
    
    async function checkout(paymentMethod) {
        const cart = getCart();
        if (cart.length === 0) return showNotification('กรุณาเพิ่มสินค้าลงในตะกร้าก่อน', 'warning');
        showLoader();
        const salesToLog = cart.map(item => ({ product_id: item.productId, quantity_sold: item.quantity, payment_method: paymentMethod, salesperson_name: state.currentUser }));
        const { error: salesError } = await db.from('sales_log').insert(salesToLog);
        if (salesError) {
            hideLoader();
            console.error('Checkout error:', salesError.message);
            return showNotification('เกิดข้อผิดพลาดในการบันทึกการขาย', 'error');
        }
        const stockUpdatePromises = cart.map(item => db.from('products').update({ quantity: item.stock - item.quantity }).eq('id', item.productId));
        await Promise.all(stockUpdatePromises);
        hideLoader();
        showNotification('ชำระเงินสำเร็จ!', 'success');
        clearCart();
        await fetchProducts();
        renderProductList();
    }
    
    const showCheckoutModal = () => {
        if (getCart().length === 0) return showNotification('ตะกร้าว่างเปล่า', 'warning');
        if (!modalContent) return;
        modalContent.innerHTML = `
            <h3 class="text-xl font-bold mb-4">เลือกช่องทางการชำระเงิน</h3>
            <div class="flex flex-col gap-4">
                <button id="pay-cash" class="w-full py-4 text-lg bg-green-500 text-white rounded-md font-semibold hover:bg-green-600"><i class="fa-solid fa-money-bill-wave mr-2"></i>เงินสด</button>
                <button id="pay-transfer" class="w-full py-4 text-lg bg-blue-500 text-white rounded-md font-semibold hover:bg-blue-600"><i class="fa-solid fa-mobile-screen-button mr-2"></i>โอนเงิน</button>
            </div>
            <div class="mt-6 flex justify-end"><button class="cancel-modal-btn py-2 px-4 bg-slate-200 rounded-md">ยกเลิก</button></div>`;
        showModal();
        document.getElementById('pay-cash').onclick = () => { hideModal(); checkout('เงินสด'); };
        document.getElementById('pay-transfer').onclick = () => { hideModal(); checkout('โอนเงิน'); };
    };

    const showProductForm = (productId = null) => {
        if (!modalContent) return;
        const isEditing = productId !== null;
        const product = isEditing ? state.products.find(p => p.id === parseInt(productId)) : {};
        const title = isEditing ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่';
        modalContent.innerHTML = `
            <form id="product-form">
                <h3 class="text-xl font-bold mb-4">${title}</h3><input type="hidden" name="id" value="${product.id || ''}">
                <div class="space-y-4">
                    <div><label class="text-sm font-medium">ชื่อสินค้า</label><input type="text" name="product_name" class="mt-1 block w-full px-3 py-2 bg-slate-50 border rounded-md" value="${product.name || ''}" required></div>
                    <div><label class="text-sm font-medium">หมวดหมู่</label><input type="text" name="category" class="mt-1 block w-full px-3 py-2 bg-slate-50 border rounded-md" value="${product.category || ''}" required></div>
                    <div><label class="text-sm font-medium">ราคา</label><input type="number" step="0.01" name="price" class="mt-1 block w-full px-3 py-2 bg-slate-50 border rounded-md" value="${product.price || ''}" required></div>
                    <div><label class="text-sm font-medium">จำนวนในสต็อก</label><input type="number" name="quantity" class="mt-1 block w-full px-3 py-2 bg-slate-50 border rounded-md" value="${product.stock || ''}" required></div>
                </div>
                <div class="mt-6 flex justify-end gap-3">
                    <button type="button" class="cancel-modal-btn py-2 px-4 bg-slate-200 rounded-md">ยกเลิก</button>
                    <button type="submit" class="py-2 px-4 bg-indigo-600 text-white rounded-md">บันทึก</button>
                </div>
            </form>`;
        showModal();
        document.getElementById('product-form').onsubmit = (e) => { e.preventDefault(); saveProduct(new FormData(e.target)); };
    };

    async function saveProduct(formData) {
        const productId = formData.get('id') ? parseInt(formData.get('id')) : null;
        const productData = Object.fromEntries(formData.entries());
        delete productData.id;
        showLoader();
        const { error } = productId ? await db.from('products').update(productData).eq('id', productId) : await db.from('products').insert([productData]);
        hideLoader();
        if (error) return showNotification('เกิดข้อผิดพลาดในการบันทึกสินค้า', 'error');
        showNotification('บันทึกข้อมูลสินค้าสำเร็จ!', 'success');
        hideModal();
        renderManageProductsPage();
    }

    async function deleteProduct(productId) {
        const product = state.products.find(p => p.id === parseInt(productId));
        showConfirmation(`ยืนยันการลบสินค้า "${product.name}"?`, async () => {
            showLoader();
            // Before deleting the product, delete related sales logs
            const { error: salesLogError } = await db.from('sales_log').delete().eq('product_id', productId);
            if (salesLogError) {
                 hideLoader();
                 return showNotification('เกิดข้อผิดพลาดในการลบประวัติการขายของสินค้า', 'error');
            }
            // Now delete the product
            const { error: productError } = await db.from('products').delete().eq('id', productId);
            hideLoader();
            if (productError) return showNotification(`เกิดข้อผิดพลาดในการลบสินค้า`, 'error');
            
            showNotification(`ลบสินค้าสำเร็จ!`, 'success');
            renderManageProductsPage();
        });
    }

    async function handleRestock(productId, amount) {
        if (isNaN(amount) || amount <= 0) return showNotification('กรุณาใส่จำนวนที่ถูกต้อง', 'warning');
        showLoader();
        const product = state.products.find(p => p.id === productId);
        const newStock = product.stock + amount;
        const { error } = await db.from('products').update({ quantity: newStock }).eq('id', productId);
        hideLoader();
        if (error) return showNotification('เกิดข้อผิดพลาดในการเติมสต็อก', 'error');
        showNotification(`เติมสต็อก "${product.name}" สำเร็จ!`, 'success');
        renderRestockPage();
    }
    
    // --- AUTHENTICATION & APP INITIALIZATION ---
    async function handleLogin(employeeId) {
        const loginErrorEl = document.getElementById('login-error');
        if (!loginErrorEl) return;
        
        // This object holds all valid employee IDs and their names.
        const validEmployees = {
            '2483': 'เนม (Admin)',
            '1516': 'ใหม่'
        };

        if (!employeeId) {
            loginErrorEl.textContent = 'กรุณาป้อนรหัสพนักงาน';
            loginErrorEl.classList.remove('hidden');
            return;
        }

        // Check if the entered ID is in our list of valid employees
        if (validEmployees[employeeId]) {
            // Correct ID, proceed with anonymous sign-in for RLS
            loginErrorEl.classList.add('hidden');
            showLoader();

            const { error } = await db.auth.signInAnonymously();
            if (error) {
                hideLoader();
                showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                return;
            }

            const username = validEmployees[employeeId];
            sessionStorage.setItem('pos-user-displayname', username);
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);

        } else {
            // Incorrect ID
            loginErrorEl.textContent = 'รหัสพนักงานไม่ถูกต้อง';
            loginErrorEl.classList.remove('hidden');
        }
    }

    async function initApp() {
        const { data: { session } } = await db.auth.getSession();
        
        if (!session && !window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
            return;
        }

        if (window.location.pathname.endsWith('login.html')) {
            document.getElementById('login-form')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const employeeId = document.getElementById('employee-id').value;
                handleLogin(employeeId);
            });
            return; 
        };

        const currentUserEl = document.getElementById('current-user');
        const currentTimeEl = document.getElementById('current-time');

        if (currentUserEl) currentUserEl.textContent = state.currentUser;
        if (currentTimeEl) {
            const updateTime = () => currentTimeEl.textContent = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'medium' });
            updateTime();
            setInterval(updateTime, 1000);
        }
        if (appView) appView.classList.replace('opacity-0', 'opacity-100');

        const path = window.location.pathname.split("/").pop();
        switch (path) {
            case 'index.html': case '': renderPosPage(); break;
            case 'manage-products.html': renderManageProductsPage(); break;
            case 'sales-history.html': renderSalesHistoryPage(); break;
            case 'restock.html': renderRestockPage(); break;
        }

        document.getElementById('logout-button')?.addEventListener('click', async () => {
            showLoader();
            await db.auth.signOut();
            sessionStorage.removeItem('pos-user-displayname');
            sessionStorage.removeItem('pos-cart');
            hideLoader();
            window.location.href = 'login.html';
        });

        document.body.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            if (button.id === 'clear-cart-btn') clearCart();
            if (button.id === 'checkout-btn') showCheckoutModal();
            if (button.closest('#cart-items')) handleCartActions(e);

            if (button.id === 'add-product-btn') showProductForm();
            if (button.classList.contains('edit-product-btn')) showProductForm(button.dataset.productId);
            if (button.classList.contains('delete-product-btn')) deleteProduct(button.dataset.productId);
            if (button.classList.contains('restock-btn')) {
                const id = button.dataset.productId;
                const input = document.querySelector(`.restock-amount-input[data-product-id="${id}"]`);
                if (input) handleRestock(parseInt(id), parseInt(input.value));
            }
            if (button.classList.contains('cancel-modal-btn')) hideModal();
        });

        modalContainer?.addEventListener('click', (e) => { if (e.target === modalContainer) hideModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === "Escape") hideModal(); });
    }

    // --- RUN APP ---
    initApp();
});
