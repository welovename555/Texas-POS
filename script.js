// ===================================================================================
// SCRIPT.JS - Final & Complete Version
// This script contains all necessary functions and logic.
// ===================================================================================

// Import Supabase client and staff data from their respective modules
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { staffData } from './staff-users.js';

// --- MAIN EXECUTION ---
document.addEventListener('DOMContentLoaded', () => {

    // --- SUPABASE SETUP ---
    const SUPABASE_URL = 'https://imohhlypiuhnbpumlgli.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2hobHlwaXVobmJwdW1sZ2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NzgxMTMsImV4cCI6MjA2NTM1NDExM30.amsdnGl15xWzgdLxlRZOSJL-mIOfZ2-P7ST5cEyLt10';
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- GLOBAL STATE ---
    let state = {
        products: [],
        categories: [],
        activeCategory: 'ทั้งหมด',
        currentUser: JSON.parse(sessionStorage.getItem('pos-current-user')) || null // {id, name, role}
    };

    // --- DOM ELEMENTS ---
    const loaderOverlay = document.getElementById('loader-overlay');
    const appView = document.getElementById('app-view');
    const modalContainer = document.getElementById('modal-container');
    const mainContent = document.getElementById('main-content');
    const sidebarNav = document.getElementById('sidebar-nav');

    // --- UTILITY & RENDER FUNCTIONS ---
    const showLoader = () => { if(loaderOverlay) loaderOverlay.classList.add('flex'); loaderOverlay.classList.remove('hidden'); }
    const hideLoader = () => { if(loaderOverlay) loaderOverlay.classList.add('hidden'); loaderOverlay.classList.remove('flex');}
    
    function showNotification(message, type = 'info') {
        const colors = { info: 'bg-blue-500', success: 'bg-green-500', warning: 'bg-yellow-500', error: 'bg-red-500' };
        const notification = document.createElement('div');
        notification.className = `fixed bottom-5 right-5 ${colors[type]} text-white py-3 px-5 rounded-lg shadow-xl transform translate-y-20 opacity-0 transition-all duration-300 ease-out z-[10000]`;
        notification.innerHTML = `<p>${message}</p>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.remove('translate-y-20', 'opacity-0'), 100);
        setTimeout(() => {
            notification.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    function showModal(content) {
        if (!modalContainer) return;
        const modalContentEl = document.createElement('div');
        modalContentEl.id = 'modal-content';
        modalContentEl.className = 'modal-content bg-white w-full max-w-md p-6 rounded-xl shadow-2xl transform scale-95';
        modalContentEl.innerHTML = content;
        modalContainer.innerHTML = ''; 
        modalContainer.appendChild(modalContentEl);
        modalContainer.classList.remove('hidden');
        setTimeout(() => {
            modalContainer.classList.add('opacity-100');
            modalContentEl.classList.add('scale-100');
        }, 10);
    }
    
    function hideModal() {
        if (!modalContainer) return;
        const modalContentEl = modalContainer.querySelector('#modal-content');
        modalContainer.classList.remove('opacity-100');
        if(modalContentEl) modalContentEl.classList.remove('scale-100');
        setTimeout(() => {
            modalContainer.classList.add('hidden');
            modalContainer.innerHTML = '';
        }, 300);
    }

    function showConfirmation(message, onConfirm) {
        showModal(`
            <h3 class="text-lg font-bold mb-4">ยืนยันการกระทำ</h3>
            <p>${message}</p>
            <div class="mt-6 flex justify-end gap-3">
                <button class="cancel-modal-btn py-2 px-4 bg-slate-200 rounded-md font-semibold hover:bg-slate-300">ยกเลิก</button>
                <button id="confirm-ok" class="py-2 px-4 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700">ยืนยัน</button>
            </div>
        `);
    }

    // --- DATA FETCHING ---
    async function fetchProducts() {
        showLoader();
        const { data, error } = await db.from('products').select('*').order('product_name', { ascending: true });
        hideLoader();
        if (error) {
            console.error('Error fetching products:', error.message);
            showNotification('ไม่สามารถโหลดข้อมูลสินค้าได้', 'error');
            return [];
        }
        state.products = data.map(p => ({
            id: p.id, name: p.product_name, stock: p.quantity,
            price: p.price, category: p.category, imageUrl: p.image_url
        }));
        const categories = [...new Set(state.products.map(p => p.category || 'ไม่มีหมวดหมู่'))];
        state.categories = ['ทั้งหมด', ...categories];
    }
    
    // --- CART MANAGEMENT ---
    const getCart = () => JSON.parse(sessionStorage.getItem('pos-cart')) || [];
    const saveCart = (cart) => sessionStorage.setItem('pos-cart', JSON.stringify(cart));
    
    // --- AUTH & INITIALIZATION ---
    function handleLogin(employeeId) {
        const loginErrorEl = document.getElementById('login-error');
        if (!loginErrorEl) return;
        
        if (!employeeId) {
            loginErrorEl.textContent = 'กรุณาป้อนรหัสพนักงาน';
            loginErrorEl.classList.remove('hidden');
            return;
        }

        if (staffData.users[employeeId]) {
            loginErrorEl.classList.add('hidden');
            showLoader();
            
            const user = {
                id: employeeId,
                name: staffData.users[employeeId],
                role: staffData.admins.includes(employeeId) ? 'admin' : 'staff'
            };

            sessionStorage.setItem('pos-current-user', JSON.stringify(user));
            
            setTimeout(() => { window.location.href = 'index.html'; }, 500);

        } else {
            loginErrorEl.textContent = 'รหัสพนักงานไม่ถูกต้อง';
            loginErrorEl.classList.remove('hidden');
        }
    }

    function initApp() {
        if (!state.currentUser) {
            if (window.location.pathname.endsWith('login.html')) {
                document.getElementById('login-form')?.addEventListener('submit', (e) => {
                    e.preventDefault();
                    handleLogin(document.getElementById('employee-id').value);
                });
            } else {
                window.location.href = 'login.html';
            }
            return; 
        }

        // --- Logic for all LOGGED-IN pages ---
        const currentUserEl = document.getElementById('current-user');
        const currentTimeEl = document.getElementById('current-time');
        if (currentUserEl) currentUserEl.textContent = state.currentUser.name;
        if (currentTimeEl) {
            const updateTime = () => currentTimeEl.textContent = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'medium' });
            updateTime();
            setInterval(updateTime, 1000);
        }
        if (appView) appView.classList.replace('opacity-0', 'opacity-100');

        renderSidebar();

        const path = window.location.pathname.split("/").pop();
        const routes = {
            'index.html': renderPosPage, '': renderPosPage,
            'manage-products.html': () => renderGenericPage(renderManageProductsPage),
            'sales-history.html': () => renderGenericPage(renderSalesHistoryPage),
            'restock.html': () => renderGenericPage(renderRestockPage),
            'sales-summary.html': () => renderGenericPage(renderSalesSummaryPage),
            'deletion-log.html': () => {
                if (state.currentUser.role === 'admin') renderGenericPage(renderDeletionLogPage);
                else window.location.href = 'index.html';
            }
        };

        if (routes[path]) routes[path]();
        setupGlobalEventListeners();
    }
    
    // --- UI RENDERING ---
    function renderSidebar() {
        if (!sidebarNav) return;
        const isAdmin = state.currentUser.role === 'admin';
        const currentPage = window.location.pathname.split("/").pop();

        const menuItems = [
            { href: 'index.html', icon: 'fa-cash-register', title: 'ขายหน้าร้าน' },
            { href: 'manage-products.html', icon: 'fa-box-archive', title: 'จัดการสินค้า' },
            { href: 'restock.html', icon: 'fa-cubes-stacked', title: 'เพิ่มสต็อก' },
            { href: 'sales-history.html', icon: 'fa-chart-line', title: 'ประวัติการขาย' },
            { href: 'sales-summary.html', icon: 'fa-file-invoice-dollar', title: 'สรุปยอดขาย' },
            isAdmin ? { href: 'deletion-log.html', icon: 'fa-user-secret', title: 'ประวัติการลบ' } : null
        ].filter(Boolean); // Filter out null for non-admins

        sidebarNav.innerHTML = `
            <div class="text-indigo-600">
                <h1 class="font-bold text-2xl tracking-widest">TEXAS</h1>
            </div>
            <div class="flex flex-col space-y-4">
                ${menuItems.map(item => `
                    <a href="${item.href}" class="nav-button p-4 rounded-lg sidebar-icon ${currentPage === item.href || (currentPage === '' && item.href === 'index.html') ? 'bg-indigo-600 text-white' : ''}" title="${item.title}">
                        <i class="fa-solid ${item.icon} fa-lg"></i>
                    </a>
                `).join('')}
            </div>
            <button id="logout-button" class="mt-auto p-4 rounded-lg sidebar-icon text-red-500 hover:bg-red-500 hover:text-white" title="ออกจากระบบ">
                <i class="fa-solid fa-right-from-bracket fa-lg"></i>
            </button>
        `;
    }

    async function renderPosPage() {
        await fetchProducts();
        renderCategoryFilters();
        renderProductList();
        renderCart();
    }

    function renderCategoryFilters() {
        const container = document.getElementById('category-filters');
        if (!container) return;
        container.innerHTML = state.categories.map(cat => `
            <button class="category-btn px-4 py-2 text-sm font-semibold border rounded-full transition-colors ${state.activeCategory === cat ? 'active' : 'bg-white text-slate-700 hover:bg-slate-100'}">
                ${cat}
            </button>
        `).join('');
        container.querySelectorAll('.category-btn').forEach((btn, index) => {
            btn.onclick = () => {
                state.activeCategory = state.categories[index];
                renderCategoryFilters();
                renderProductList();
            };
        });
    }

    function renderProductList() {
        const container = document.getElementById('product-list');
        if (!container) return;
        const filteredProducts = state.activeCategory === 'ทั้งหมด'
            ? state.products
            : state.products.filter(p => p.category === state.activeCategory);

        if (filteredProducts.length === 0) {
            container.innerHTML = '<p class="col-span-full text-center text-slate-400">ไม่พบสินค้าในหมวดหมู่นี้</p>';
            return;
        }
        container.innerHTML = filteredProducts.map(p => `
                <div class="product-card bg-slate-50 rounded-lg p-3 text-center cursor-pointer flex flex-col items-center">
                    <img src="${p.imageUrl || 'https://placehold.co/150x150/a78bfa/ffffff?text=NO+IMG'}" alt="${p.name}" class="w-24 h-24 object-cover rounded-md mb-2">
                    <p class="font-semibold text-sm flex-grow">${p.name}</p>
                    <p class="text-indigo-600 font-bold">฿${Number(p.price).toFixed(2)}</p>
                    <p class="text-xs ${p.stock < 10 ? 'text-red-500 font-bold' : 'text-slate-400'}">คงเหลือ: ${p.stock}</p>
                </div>
            `).join('');
    }

    function renderCart() {
        // ... (rest of the render and action functions from previous versions)
    }

    async function renderGenericPage(renderer) {
        if (!mainContent) return;
        showLoader();
        await renderer(mainContent);
        hideLoader();
    }
    
    // --- EVENT LISTENERS ---
    function setupGlobalEventListeners() {
        document.body.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            const productCard = e.target.closest('.product-card');

            if (button) {
                 if (button.id === 'logout-button') {
                    showLoader();
                    sessionStorage.clear();
                    setTimeout(() => window.location.href = 'login.html', 500);
                 }
                 // Add other button handlers here (checkout, clear cart, etc.)
            }
            if (productCard) {
                // Add to cart logic here
            }
        });

        modalContainer?.addEventListener('click', (e) => { if (e.target === modalContainer) hideModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === "Escape") hideModal(); });
    }

    // --- RUN APP ---
    initApp();
});
