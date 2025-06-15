document.addEventListener('DOMContentLoaded', () => {
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
    const adminContainer = document.getElementById('admin-container');

    if (!currentEmployee || currentEmployee.role !== 'admin') {
        adminContainer.innerHTML = `<div class="h-screen flex flex-col items-center justify-center bg-red-50 text-red-700 p-4"><h1 class="text-2xl font-bold">ไม่สามารถเข้าถึงได้</h1><p>คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p><a href="pos.html" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">กลับหน้าหลัก</a></div>`;
        return;
    }

    let products = [];
    let categories = [];
    
    const init = async () => {
        await fetchData();
        render();
    };

    const fetchData = async () => {
        const { data: pData, error: pError } = await supabase.from('products').select(`*, categories(name)`).order('name');
        const { data: cData, error: cError } = await supabase.from('categories').select('*').order('name');
        if (pError || cError) console.error(pError || cError);
        products = pData.map(p => ({...p, category_name: p.categories.name}));
        categories = cData;
    };
    
    const render = () => {
        adminContainer.innerHTML = `<div class="min-h-screen bg-gray-100"><nav class="bg-gray-800 text-white p-4 flex justify-between items-center"><h1 class="text-xl font-bold">ระบบหลังบ้าน</h1><a href="pos.html" class="text-sm hover:underline">← กลับหน้าขาย</a></nav><div class="p-4 sm:p-6 lg:p-8"><div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div id="product-form-container" class="bg-white p-6 rounded-lg shadow-md">${ProductFormComponent()}</div><div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold mb-4">รายการสินค้าคงคลัง</h2><div id="inventory-list" class="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">${InventoryListComponent()}</div></div></div></div></div>`;
        populateCategoryOptions();
        setupEventListeners();
    };

    const ProductFormComponent = (product = {}) => {
        const isEdit = !!product.id;
        return `<h2 class="text-2xl font-bold mb-4">${isEdit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2><form id="product-form" class="space-y-4"><input type="hidden" name="id" value="${product.id || ''}"><div><label class="block font-medium">ชื่อสินค้า</label><input type="text" name="name" class="w-full border p-2 rounded-lg" value="${product.name || ''}" required></div><div><label class="block font-medium">หมวดหมู่</label><select name="category_id" class="w-full border p-2 rounded-lg" required></select></div><div class="grid grid-cols-2 gap-4"><div><label class="block font-medium">ราคา</label><input type="number" name="price" step="0.01" class="w-full border p-2 rounded-lg" value="${product.price || ''}" required></div><div><label class="block font-medium">จำนวนในสต็อก</label><input type="number" name="stock" class="w-full border p-2 rounded-lg" value="${product.stock || ''}" required></div></div><div><label class="block font-medium">รูปภาพสินค้า (URL)</label><input type="text" name="image_url" class="w-full border p-2 rounded-lg" value="${product.image_url || ''}"></div><div class="flex gap-4"><button type="submit" class="w-full py-2 bg-green-500 text-white rounded-lg">${isEdit ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มสินค้า'}</button>${isEdit ? '<button type="button" id="cancel-edit-btn" class="w-full py-2 bg-gray-300 rounded-lg">ยกเลิก</button>' : ''}</div></form>`;
    };

    const InventoryListComponent = () => {
        if (products.length === 0) return `<p>ไม่มีสินค้า</p>`;
        return products.map(p => `<div class="flex justify-between items-center p-2 border-b"><div><p class="font-semibold">${p.name}</p><p class="text-sm text-gray-500">${p.category_name} - ฿${p.price}</p></div><div class="flex items-center gap-4"><span class="font-bold text-lg">${p.stock}</span><button data-id="${p.id}" class="edit-product-btn text-blue-500 hover:underline text-sm">แก้ไข</button></div></div>`).join('');
    };

    const populateCategoryOptions = (selectedId = null) => {
        const select = document.querySelector('select[name="category_id"]');
        if (!select) return;
        select.innerHTML = '<option value="">เลือกหมวดหมู่</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            if (cat.id == selectedId) option.selected = true;
            select.appendChild(option);
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const productData = Object.fromEntries(formData.entries());
        const productId = productData.id;
        try {
            const dataToSave = { name: productData.name, category_id: productData.category_id, price: productData.price, stock: productData.stock, image_url: productData.image_url };
            const { error } = productId ? await supabase.from('products').update(dataToSave).eq('id', productId) : await supabase.from('products').insert(dataToSave);
            if (error) throw error;
            alert('บันทึกข้อมูลสินค้าสำเร็จ!');
            await init();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };
    
    const setupEventListeners = () => {
        document.getElementById('product-form').addEventListener('submit', handleFormSubmit);
        document.querySelectorAll('.edit-product-btn').forEach(btn => btn.addEventListener('click', () => {
            const product = products.find(p => p.id === btn.dataset.id);
            document.getElementById('product-form-container').innerHTML = ProductFormComponent(product);
            populateCategoryOptions(product.category_id);
            setupEventListeners();
        }));
        const cancelBtn = document.getElementById('cancel-edit-btn');
        if(cancelBtn) cancelBtn.addEventListener('click', () => { document.getElementById('product-form-container').innerHTML = ProductFormComponent(); populateCategoryOptions(); setupEventListeners(); });
    };

    init();
});