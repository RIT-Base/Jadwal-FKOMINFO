document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('jadwal-container')) {
        initJadwalPage();
    }
});

async function initJadwalPage() {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7JM3GPuEhSQgyZVGrgpMDu11J8JE5RcATgG33CTh1xwPd46W2Q83lK2W_aq7vDRCT7LXwZSKoZ-qf/pub?gid=1414529007&single=true&output=tsv';

    // --- State Management ---
    let allData = [];
    let activeFilters = {
        jurusan: [],
        semester: [],
        kelas: []
    };

    // --- Referensi Elemen DOM ---
    const searchInput = document.getElementById('searchInput');
    const jadwalContainer = document.getElementById('jadwal-container');
    const loadingDiv = document.getElementById('loading');
    
    // Modal Elements
    const openFilterBtn = document.getElementById('openFilterBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const modalOverlay = document.querySelector('.modal-overlay');
    const filterDropdown = document.getElementById('filterDropdown');

    // Filter Containers in Modal
    const jurusanContainer = document.getElementById('jurusanFilterContainer');
    const semesterContainer = document.getElementById('semesterFilterContainer');
    const kelasContainer = document.getElementById('kelasFilterContainer');
    
    // Column Toggles
    const columnToggles = document.querySelectorAll('input[name="kolom"]');
    const presetBiasa = document.getElementById('presetBiasa');
    const presetLengkap = document.getElementById('presetLengkap');

    // --- 1. Fungsi Fetch dan Parse Data ---
    async function fetchData() {
        try {
            const response = await fetch(csvUrl);
            const csvText = await response.text();
            // Ganti .split(',') dengan .split('\t') jika sudah beralih ke TSV
            const data = csvText.trim().split('\n').slice(1).map(row => {
                const values = row.split('\t');
                return { Jurusan: values[0].trim(), Hari: values[1].trim(), Mulai: values[2].trim(), Selesai: values[3].trim(), Ruang: values[4].trim(), Kode: values[5].trim(), Matakuliah: values[6].trim(), Kelas: values[7].trim(), SKS: values[8].trim(), Dosen: values[9].trim(), Semester: values[10].trim() };
            });
            allData = data;
            populateFilters(allData);
            renderJadwal(allData);
        } catch (error) {
            loadingDiv.textContent = 'Gagal memuat data.';
            console.error('Error fetching data:', error);
        }
    }

    // --- 2. Fungsi untuk Mengisi Opsi Filter di Modal ---
    function populateFilters(data) {
        const populate = (key, container) => {
            const items = [...new Set(data.map(item => item[key]))].sort();
            container.innerHTML = '';
            items.forEach(item => {
                const button = document.createElement('button');
                button.dataset.key = key.toLowerCase(); // 'jurusan', 'semester', 'kelas'
                button.dataset.value = item;
                button.textContent = item;
                container.appendChild(button);
            });
        };
        populate('Jurusan', jurusanContainer);
        populate('Semester', semesterContainer);
        populate('Kelas', kelasContainer);
    }
    
    // --- 3. Fungsi Render Jadwal (Tetap Sama) ---
    function renderJadwal(data) {
        loadingDiv.style.display = 'none';
        jadwalContainer.innerHTML = '';
        // ... (Isi fungsi ini sama persis seperti kode sebelumnya)
        const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        const groupedByDay = days.reduce((acc, day) => {
            const schedules = data.filter(item => item.Hari.toLowerCase() === day.toLowerCase());
            if (schedules.length > 0) acc[day] = schedules.sort((a, b) => a.Mulai.localeCompare(b.Mulai));
            return acc;
        }, {});
        if (Object.keys(groupedByDay).length === 0) {
            jadwalContainer.innerHTML = '<p style="text-align: center;">Tidak ada jadwal yang sesuai dengan filter Anda.</p>';
            return;
        }
        for (const day in groupedByDay) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-schedule';
            let tableHTML = `<h2>${day}</h2><div class="table-container"><table><thead><tr>
                <th data-col="Jurusan">Jurusan</th> <th data-col="Jam">Jam</th> <th data-col="Ruang">Ruang</th>
                <th data-col="Matakuliah">Matakuliah</th> <th data-col="Semester">Semester</th> <th data-col="Kode">Kode</th>
                <th data-col="SKS">SKS</th> <th data-col="Dosen">Dosen</th> <th data-col="Kelas">Kelas</th>
            </tr></thead><tbody>`;
            groupedByDay[day].forEach(item => {
                tableHTML += `<tr>
                    <td data-col="Jurusan">${item.Jurusan}</td>
                    <td data-col="Jam">${item.Mulai.slice(0, 5)} - ${item.Selesai.slice(0, 5)}</td>
                    <td data-col="Ruang">${item.Ruang}</td> <td data-col="Matakuliah">${item.Matakuliah}</td>
                    <td data-col="Semester">${item.Semester}</td> <td data-col="Kode">${item.Kode}</td>
                    <td data-col="SKS">${item.SKS}</td> <td data-col="Dosen">${item.Dosen}</td>
                    <td data-col="Kelas">${item.Kelas}</td>
                </tr>`;
            });
            tableHTML += '</tbody></table></div>';
            dayDiv.innerHTML = tableHTML;
            jadwalContainer.appendChild(dayDiv);
        }
        applyColumnVisibility();
    }


    // --- 4. Fungsi Filter Gabungan (Tetap Sama) ---
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        // ... (Isi fungsi ini sama persis seperti kode sebelumnya)
        const filteredData = allData.filter(item => {
            const searchMatch = searchTerm === '' ||
                item.Matakuliah.toLowerCase().includes(searchTerm) ||
                item.Dosen.toLowerCase().includes(searchTerm) ||
                item.Ruang.toLowerCase().includes(searchTerm);
            const jurusanMatch = activeFilters.jurusan.length === 0 || activeFilters.jurusan.includes(item.Jurusan);
            const semesterMatch = activeFilters.semester.length === 0 || activeFilters.semester.includes(item.Semester);
            const kelasMatch = activeFilters.kelas.length === 0 || activeFilters.kelas.includes(item.Kelas);
            return searchMatch && jurusanMatch && semesterMatch && kelasMatch;
        });
        renderJadwal(filteredData);
    }
    
    // --- 5. Fungsi Tampilan Kolom (Tetap Sama) ---
    function applyColumnVisibility() {
        // ... (Isi fungsi ini sama persis seperti kode sebelumnya)
        const allTh = document.querySelectorAll('th[data-col]');
        const allTd = document.querySelectorAll('td[data-col]');
        let checkedCols = new Set();
        columnToggles.forEach(toggle => {
            if (toggle.checked) checkedCols.add(toggle.value);
        });
        allTh.forEach(th => th.style.display = checkedCols.has(th.dataset.col) ? '' : 'none');
        allTd.forEach(td => td.style.display = checkedCols.has(td.dataset.col) ? '' : 'none');
    }

    // --- 6. Logika Modal dan Event Listeners (BARU) ---
    function toggleModal(show) {
        document.body.classList.toggle('modal-open', show);
        openFilterBtn.classList.toggle('active', show);
    }

    openFilterBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Mencegah event sampai ke document
        const isOpen = document.body.classList.contains('modal-open');
        toggleModal(!isOpen);
    });

    closeModalBtn.addEventListener('click', () => toggleModal(false));
    modalOverlay.addEventListener('click', () => toggleModal(false));
    document.addEventListener('click', (e) => {
        if (!filterDropdown.contains(e.target) && !openFilterBtn.contains(e.target)) {
            toggleModal(false);
        }
    });

    // Event delegation untuk semua tombol filter
    [jurusanContainer, semesterContainer, kelasContainer].forEach(container => {
        container.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            
            const btn = e.target;
            const key = btn.dataset.key; // 'jurusan', 'semester', 'kelas'
            const value = btn.dataset.value;

            // Update state filter
            const filterArray = activeFilters[key];
            const index = filterArray.indexOf(value);

            if (index > -1) {
                filterArray.splice(index, 1); // Hapus jika sudah ada
            } else {
                filterArray.push(value); // Tambah jika belum ada
            }

            // Update tampilan tombol dan terapkan filter
            btn.classList.toggle('active');
            applyFilters();
        });
    });

    resetFilterBtn.addEventListener('click', () => {
        // Reset state
        activeFilters.jurusan = [];
        activeFilters.semester = [];
        activeFilters.kelas = [];

        // Hapus kelas 'active' dari semua tombol
        document.querySelectorAll('.filter-options button.active').forEach(btn => {
            btn.classList.remove('active');
        });

        // Terapkan filter yang sudah kosong
        applyFilters();
    });

    // Listeners lainnya
    searchInput.addEventListener('input', applyFilters);
    columnToggles.forEach(toggle => toggle.addEventListener('change', applyColumnVisibility));
    presetBiasa.addEventListener('click', () => { /* ... sama seperti sebelumnya ... */ const biasaCols = ['Jurusan', 'Jam', 'Ruang', 'Matakuliah', 'Semester']; columnToggles.forEach(t => t.checked = biasaCols.includes(t.value)); applyColumnVisibility(); });
    presetLengkap.addEventListener('click', () => { /* ... sama seperti sebelumnya ... */ columnToggles.forEach(t => t.checked = true); applyColumnVisibility(); });

    // Inisialisasi
    fetchData();
}