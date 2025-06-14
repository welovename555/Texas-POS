// *** กรุณาแก้ไขข้อมูลส่วนนี้เป็นของคุณ ***
const SUPABASE_URL = 'https://vqmrdpewlxmodpsibkff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXJkcGV3bHhtb2Rwc2lia2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4ODg1NjUsImV4cCI6MjA2NTQ2NDU2NX0.jTKLkppvZGpGCrmQRezbOZEfpSL4c5Cp8CBRphuBgWg';

// สร้างการเชื่อมต่อกับ Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// อ้างอิงถึง Element ในหน้า HTML
const productForm = document.getElementById('product-form');
const productListDiv = document.getElementById('product-list');

/**
 * ฟังก์ชันสำหรับดึงข้อมูลสินค้าทั้งหมดมาแสดงผล
 */
async function fetchProducts() {
    // 1. ดึงข้อมูลจากตาราง 'products'
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false }); // เรียงตามวันที่สร้างล่าสุดก่อน

    if (error) {
        console.error('Error fetching products:', error);
        alert('เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า');
        return;
    }

    // 2. เคลียร์รายการสินค้าเก่าทิ้งก่อน
    productListDiv.innerHTML = '';

    // 3. ตรวจสอบว่ามีสินค้าหรือไม่
    if (products.length === 0) {
        productListDiv.innerHTML = '<p>ยังไม่มีสินค้าในระบบ กรุณาเพิ่มสินค้าใหม่</p>';
        return;
    }

    // 4. วนลูปสร้างการ์ดสินค้าแต่ละชิ้น
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');

        productCard.innerHTML = `
            <img src="${product.image_url || 'https://via.placeholder.com/220x160?text=No+Image'}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>หมวดหมู่: ${product.category || 'ไม่มี'}</p>
                <p class="price">ราคา: ${product.price.toFixed(2)} บาท</p>
                <p>สต็อก: ${product.stock}</p>
            </div>
        `;
        productListDiv.appendChild(productCard);
    });
}

/**
 * ฟังก์ชันสำหรับจัดการการ submit ฟอร์มเพิ่มสินค้า
 */
async function handleFormSubmit(event) {
    event.preventDefault(); // ป้องกันการรีเฟรชหน้าเว็บ

    // ดึงข้อมูลจากฟอร์ม
    const name = document.getElementById('product-name').value;
    const category = document.getElementById('product-category').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value);
    const imageUrl = document.getElementById('product-image').value;

    // เตรียมข้อมูลที่จะส่งไป Supabase
    const newProduct = {
        name: name,
        category: category,
        price: price,
        stock: stock,
        image_url: imageUrl
    };

    // ส่งข้อมูลไปที่ตาราง 'products'
    const { data, error } = await supabase
        .from('products')
        .insert([newProduct]);

    if (error) {
        console.error('Error inserting product:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกสินค้า: ' + error.message);
    } else {
        alert('บันทึกสินค้าสำเร็จ!');
        productForm.reset(); // เคลียร์ฟอร์ม
        fetchProducts(); // ดึงข้อมูลมาแสดงผลใหม่ทันที
    }
}

// ---- จุดเริ่มต้นการทำงานของโปรแกรม ----

// 1. ผูก Event Listener ให้กับฟอร์ม
productForm.addEventListener('submit', handleFormSubmit);

// 2. เรียกใช้ฟังก์ชันเพื่อดึงข้อมูลสินค้ามาแสดงผลครั้งแรกเมื่อหน้าเว็บโหลดเสร็จ
fetchProducts();
