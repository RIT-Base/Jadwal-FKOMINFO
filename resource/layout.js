document.addEventListener('DOMContentLoaded', () => {
    const METADATA_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7JM3GPuEhSQgyZVGrgpMDu11J8JE5RcATgG33CTh1xwPd46W2Q83lK2W_aq7vDRCT7LXwZSKoZ-qf/pub?gid=1162279961&single=true&output=csv'; 
    const REPO_BASE_PATH = '/Jadwal-FKOMINFO';

    loadHeaderAndTimestamp(METADATA_CSV_URL, REPO_BASE_PATH);
    loadFooter(REPO_BASE_PATH);
});

async function loadHeaderAndTimestamp(metadataUrl) {
    try {
        // 1. Ambil file _header.html
        const headerResponse = await fetch('_header.html');
        if (!headerResponse.ok) throw new Error('File _header.html tidak ditemukan');
        const headerHTML = await headerResponse.text();
        // Masukkan header ke bagian atas <body>
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
        
        // 2. Tandai link navigasi yang aktif
        setActiveNavLink();

        // 3. Ambil timestamp dari Google Sheet
        const timestampSpan = document.getElementById('last-updated-timestamp');
        if (timestampSpan) {
            try {
                // Tambahkan parameter cache-busting ( unik) agar browser selalu mengambil data baru
                const metaResponse = await fetch(metadataUrl + '&_cache=' + new Date().getTime());
                if (!metaResponse.ok) throw new Error('Gagal mengambil metadata timestamp');
                
                // Teks dari sel A1 akan menjadi isi dari file .csv
                const timestampText = await metaResponse.text();
                
                // Set teks timestamp di header
                timestampSpan.textContent = timestampText.trim(); 
            } catch (error) {
                console.error('Gagal memuat timestamp:', error);
                timestampSpan.textContent = 'Info update tidak tersedia';
            }
        }
    } catch (error) {
        console.error('Gagal memuat header:', error);
    }
}

async function loadFooter() {
     try {
        const response = await fetch('_footer.html');
        if (!response.ok) throw new Error('File _footer.html tidak ditemukan');
        const footerHTML = await response.text();
        // Masukkan footer ke bagian akhir <body>
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    } catch (error) {
        console.error('Gagal memuat footer:', error);
    }
}

function setActiveNavLink() {
    // Dapatkan nama file halaman saat ini (mis: "index.html" atau "ruangan.html")
    const currentPage = window.location.pathname.split('/').pop();
    // Jika halaman root (mis: "/"), anggap sebagai "index.html"
    const pageName = currentPage === '' ? 'index.html' : currentPage;
    
    const navLinks = document.querySelectorAll('header nav a');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === pageName) {
            link.classList.add('active');
        }
    });
}