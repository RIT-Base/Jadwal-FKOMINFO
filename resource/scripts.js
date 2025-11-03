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
    let activeDropdown = null;

    // --- Referensi Elemen DOM ---
    const searchInput = document.getElementById('searchInput');
    const jadwalContainer = document.getElementById('jadwal-container');
    const loadingDiv = document.getElementById('loading');
    
    // Dropdown & Trigger Buttons
    const openFilterBtn = document.getElementById('openFilterBtn');
    const openTampilanBtn = document.getElementById('openTampilanBtn');
    const filterDropdown = document.getElementById('filterDropdown');
    const tampilanDropdown = document.getElementById('tampilanDropdown');
    
    // Close & Reset Buttons
    const closeFilterBtn = document.getElementById('closeFilterBtn');
    const closeTampilanBtn = document.getElementById('closeTampilanBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');

    // Filter Containers
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
            let data = csvText.trim().split('\n').slice(1).map(row => {
                const values = row.split('\t');
                return { Jurusan: values[0].trim(), Hari: values[1].trim(), Mulai: values[2].trim(), Selesai: values[3].trim(), Ruang: values[4].trim(), Kode: values[5].trim(), Matakuliah: values[6].trim(), Kelas: values[7].trim(), SKS: values[8].trim(), Dosen: values[9].trim(), Semester: values[10].trim() };
            });
            
            // --- TAMBAHAN: Filter untuk mengabaikan data dengan hari "NA" ---
            allData = data.filter(item => item.Hari.toUpperCase() !== 'NA');
            // -----------------------------------------------------------------

            populateFilters(allData);
            renderJadwal(allData);
        } catch (error) {
            loadingDiv.textContent = 'Gagal memuat data.';
            console.error('Error fetching data:', error);
        }
    }

    // --- 2. Fungsi untuk Mengisi Opsi Filter ---
    function populateFilters(data) {
        const populate = (key, container) => {
            const items = [...new Set(data.map(item => item[key]))].sort();
            container.innerHTML = '';
            items.forEach(item => {
                const button = document.createElement('button');
                button.dataset.key = key.toLowerCase();
                button.dataset.value = item;
                button.textContent = item;
                container.appendChild(button);
            });
        };
        populate('Jurusan', jurusanContainer);
        populate('Semester', semesterContainer);
        populate('Kelas', kelasContainer);
    }
    
    // --- 3. Fungsi Render Jadwal ---
    function renderJadwal(data) {
        loadingDiv.style.display = 'none';
        jadwalContainer.innerHTML = '';
        const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        const groupedByDay = days.reduce((acc, day) => {
            // Filter tambahan di sini tidak lagi diperlukan karena allData sudah bersih
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

    // --- 4. Fungsi Filter Gabungan ---
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
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
    
    // --- 5. Fungsi Tampilan Kolom ---
    function applyColumnVisibility() {
        const checkedCols = new Set();
        columnToggles.forEach(toggle => {
            if (toggle.checked) checkedCols.add(toggle.value);
        });
        document.querySelectorAll('[data-col]').forEach(el => {
            el.style.display = checkedCols.has(el.dataset.col) ? '' : 'none';
        });
    }

    // --- 6. Logika Dropdown BARU ---
    function closeAllDropdowns() {
        [openFilterBtn, openTampilanBtn].forEach(btn => btn.classList.remove('active'));
        [filterDropdown, tampilanDropdown].forEach(dd => dd.parentElement.classList.remove('active'));
        document.body.classList.remove('modal-open');
        activeDropdown = null;
    }

    function toggleDropdown(dropdown) {
        const wasActive = dropdown.parentElement.classList.contains('active');
        closeAllDropdowns();
        if (!wasActive) {
            dropdown.parentElement.classList.add('active');
            dropdown.parentElement.querySelector('.control-btn').classList.add('active');
            document.body.classList.add('modal-open');
            activeDropdown = dropdown;
        }
    }

    openFilterBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(filterDropdown); });
    openTampilanBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(tampilanDropdown); });
    closeFilterBtn.addEventListener('click', closeAllDropdowns);
    closeTampilanBtn.addEventListener('click', closeAllDropdowns);
    document.addEventListener('click', (e) => {
        if (activeDropdown && !activeDropdown.contains(e.target) && !e.target.closest('.control-btn')) {
            closeAllDropdowns();
        }
    });

    [filterDropdown, tampilanDropdown].forEach(dd => dd.addEventListener('click', e => e.stopPropagation()));
    
    [jurusanContainer, semesterContainer, kelasContainer].forEach(container => {
        container.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            const btn = e.target;
            const key = btn.dataset.key;
            const value = btn.dataset.value;
            const filterArray = activeFilters[key];
            const index = filterArray.indexOf(value);
            if (index > -1) filterArray.splice(index, 1);
            else filterArray.push(value);
            btn.classList.toggle('active');
            applyFilters();
        });
    });

    resetFilterBtn.addEventListener('click', () => {
        activeFilters.jurusan = [];
        activeFilters.semester = [];
        activeFilters.kelas = [];
        document.querySelectorAll('.filter-options button.active').forEach(btn => btn.classList.remove('active'));
        applyFilters();
        closeAllDropdowns();
    });

    // --- 7. Event Listeners Lainnya ---
    searchInput.addEventListener('input', applyFilters);
    columnToggles.forEach(toggle => toggle.addEventListener('change', applyColumnVisibility));
    presetBiasa.addEventListener('click', () => {
        const biasaCols = ['Jurusan', 'Jam', 'Ruang', 'Matakuliah', 'Semester', 'Kelas'];
        columnToggles.forEach(t => t.checked = biasaCols.includes(t.value));
        applyColumnVisibility();
    });
    presetLengkap.addEventListener('click', () => {
        columnToggles.forEach(t => t.checked = true);
        applyColumnVisibility();
    });

    // --- Inisialisasi ---
    fetchData();
}