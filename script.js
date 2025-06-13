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
        const { error } = await db.from('products').delete().eq('id', productId);
        hideLoader();
        if (error) return showNotification(`เกิดข้อผิดพลาดในการลบสินค้า`, 'error');
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

// --- APP INITIALIZATION & ROUTING ---
function initApp() {
    if (!state.currentUser) {
        window.location.href = 'login.html';
        return;
    }
    // Setup common UI elements
    const currentUserEl = document.getElementById('current-user');
    const currentTimeEl = document.getElementById('current-time');
    const appView = document.getElementById('app-view');

    if(currentUserEl) currentUserEl.textContent = state.currentUser;
    if(currentTimeEl) {
        const updateTime = () => currentTimeEl.textContent = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'medium' });
        updateTime();
        setInterval(updateTime, 1000);
    }
    if (appView) appView.classList.replace('opacity-0', 'opacity-100');

    // Simple router based on filename
    const path = window.location.pathname.split("/").pop();
    switch (path) {
        case 'index.html':
        case '':
            renderPosPage();
            break;
        case 'manage-products.html':
            renderManageProductsPage();
            break;

        case 'sales-history.html':
            renderSalesHistoryPage();
            break;
        
        case 'restock.html':
            renderRestockPage();
            break;
    }

    // Add general event listeners
    document.getElementById('logout-button')?.addEventListener('click', () => {
        sessionStorage.removeItem('pos-user');
        sessionStorage.removeItem('pos-cart');
        window.location.href = 'login.html';
    });
    
    // Event Delegation for dynamic content
    document.body.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        // POS Page Actions
        if (button.id === 'clear-cart-btn') clearCart();
        if (button.id === 'checkout-btn') showCheckoutModal();
        if (button.closest('#cart-items')) handleCartActions(e);

        // Manage/Restock Page Actions
        if (button.id === 'add-product-btn') showProductForm();
        if (button.classList.contains('edit-product-btn')) showProductForm(button.dataset.productId);
        if (button.classList.contains('delete-product-btn')) deleteProduct(button.dataset.productId);
        if (button.classList.contains('restock-btn')) {
            const id = button.dataset.productId;
            const input = document.querySelector(`.restock-amount-input[data-product-id="${id}"]`);
            handleRestock(parseInt(id), parseInt(input.value));
        }

        // Modal Actions
        if(button.classList.contains('cancel-modal-btn')) hideModal();
    });

    modalContainer?.addEventListener('click', (e) => { if (e.target === modalContainer) hideModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === "Escape") hideModal(); });
}

// --- RUN APP ---
document.addEventListener('DOMContentLoaded', initApp);
