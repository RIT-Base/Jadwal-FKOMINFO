document.addEventListener('DOMContentLoaded', () => {
    // URL metadata Anda (ini sudah benar)
    const METADATA_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7JM3GPuEhSQgyZVGrgpMDu11J8JE5RcATgG33CTh1xwPd46W2Q83lK2W_aq7vDRCT7LXwZSKoZ-qf/pub?gid=1162279961&single=true&output=csv'; 

    // Memuat header dan footer menggunakan path relatif
    loadHeaderAndTimestamp(METADATA_CSV_URL);
    loadFooter();
});

async function loadHeaderAndTimestamp(metadataUrl) {
    try {
        // 1. Ambil file _header.html
        // Path ini relatif terhadap file HTML (index.html, ruangan.html)
        const headerResponse = await fetch('_header.html');
        if (!headerResponse.ok) {
            console.error('Gagal mengambil _header.html. Status:', headerResponse.status);
            throw new Error('File _header.html tidak ditemukan. Pastikan ada di folder root proyek.');
        }
        const headerHTML = await headerResponse.text();
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
        
        // 2. Tandai link navigasi yang aktif
        setActiveNavLink();

        // 3. Ambil timestamp dari Google Sheet
        const timestampSpan = document.getElementById('last-updated-timestamp');
        if (timestampSpan) {
            try {
                const metaResponse = await fetch(metadataUrl + '&_cache=' + new Date().getTime());
                if (!metaResponse.ok) throw new Error('Gagal mengambil metadata timestamp');
                
                const timestampText = await metaResponse.text();
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
        // 1. Ambil file _footer.html
        // Path ini relatif terhadap file HTML
        const response = await fetch('_footer.html');
        if (!response.ok) {
             console.error('Gagal mengambil _footer.html. Status:', response.status);
            throw new Error('File _footer.html tidak ditemukan. Pastikan ada di folder root proyek.');
        }
        const footerHTML = await response.text();
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    } catch (error) {
        console.error('Gagal memuat footer:', error);
    }
}

function setActiveNavLink() {
    // Dapatkan path lengkap halaman saat ini (mis: "/Jadwal-FKOMINFO/ruangan.html")
    const currentPagePath = window.location.pathname;
    
    // Dapatkan nama filenya saja (mis: "ruangan.html" atau "" jika di root)
    const pageName = currentPagePath.split('/').pop();

    const navLinks = document.querySelectorAll('header nav a');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href'); // mis: "index.html" atau "ruangan.html"
        
        // Jika link adalah "index.html" dan halaman saat ini adalah root ("") atau "index.html"
        if (linkHref === 'index.html' && (pageName === '' || pageName === 'index.html')) {
            link.classList.add('active');
        }
        // Jika link lain cocok dengan nama halaman
        else if (linkHref === pageName) {
            link.classList.add('active');
        }
    });
}