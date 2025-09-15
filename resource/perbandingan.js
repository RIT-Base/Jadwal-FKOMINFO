document.addEventListener('DOMContentLoaded', async () => {
    const tsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7JM3GPuEhSQgyZVGrgpMDu11J8JE5RcATgG33CTh1xwPd46W2Q83lK2W_aq7vDRCT7LXwZSKoZ-qf/pub?gid=1414529007&single=true&output=tsv';

    let allData = [];
    let activeCourses = [];

    const jurusanFilter = document.getElementById('jurusanFilter');
    const semesterFilter = document.getElementById('semesterFilter');
    const kelasFilter = document.getElementById('kelasFilter');
    const searchInput = document.getElementById('search-input');
    const searchResultsList = document.getElementById('search-results-list');
    const timelineView = document.getElementById('timeline-view');
    const controlPanel = document.getElementById('control-panel');
    const fab = document.getElementById('fab-open-controls');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const overlay = document.querySelector('.overlay');
    const popover = document.getElementById('overlap-popover');
    
    async function init() {
        try {
            const response = await fetch(tsvUrl);
            const tsvText = await response.text();
            allData = tsvText.trim().split('\n').slice(1).map((row, index) => {
                const values = row.split('\t');
                return { id: index, Jurusan: values[0].trim(), Hari: values[1].trim(), Mulai: values[2].trim(), Selesai: values[3].trim(), Ruang: values[4].trim(), Matakuliah: values[6].trim(), Kelas: values[7].trim(), Semester: values[10].trim() };
            });
            
            populateInitialFilters();
            setupEventListeners();
            renderTimeline();
            updateSearchResults();
        } catch (error) { console.error('Error fetching data:', error); }
    }

    function populateInitialFilters() {
        const populate = (key, selectEl) => {
            const items = ['Semua', ...[...new Set(allData.map(item => item[key]))].sort()];
            selectEl.innerHTML = items.map(item => `<option value="${item}">${item}</option>`).join('');
        };
        populate('Jurusan', jurusanFilter);
        populate('Semester', semesterFilter);
        populate('Kelas', kelasFilter);
    }

    function setupEventListeners() {
        [jurusanFilter, semesterFilter, kelasFilter, searchInput].forEach(el => el.addEventListener('input', updateSearchResults));
        searchResultsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-add-single')) addCourseById(parseInt(e.target.dataset.id, 10));
        });
        fab.addEventListener('click', () => togglePanel(true));
        closePanelBtn.addEventListener('click', () => togglePanel(false));
        overlay.addEventListener('click', () => togglePanel(false));
        timelineView.addEventListener('click', handleTimelineClick);
        document.addEventListener('click', (e) => {
            if (!popover.contains(e.target) && !e.target.classList.contains('overlap-indicator')) popover.style.display = 'none';
        });
        popover.addEventListener('click', handlePopoverClick);
    }

    function updateSearchResults() {
        const filtered = allData.filter(course => {
            const j = jurusanFilter.value, s = semesterFilter.value, k = kelasFilter.value;
            const searchTerm = searchInput.value.toLowerCase();
            return (j === 'Semua' || course.Jurusan === j) && (s === 'Semua' || course.Semester === s) && (k === 'Semua' || course.Kelas === k) && (course.Matakuliah.toLowerCase().includes(searchTerm));
        });
        searchResultsList.innerHTML = filtered.map(course => `<li><div class="info"><strong>${course.Matakuliah}</strong><small>${course.Jurusan} - Kls ${course.Kelas} | ${course.Hari}, ${course.Mulai.slice(0,5)} - ${course.Selesai.slice(0,5)}</small></div><button class="btn-add-single" data-id="${course.id}">+</button></li>`).join('');
    }
    
    function addCourseById(id) {
        if (!activeCourses.some(c => c.id === id)) {
            const courseToAdd = allData.find(c => c.id === id);
            if (courseToAdd) {
                activeCourses.push(courseToAdd);
                renderTimeline();
            }
        }
    }

    // === FUNGSI RENDER DIROMBAK TOTAL ===
    function renderTimeline() {
        const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const startTime = 7, endTime = 19;
        
        // 1. Gambar grid statis
        let gridHTML = '';
        gridHTML += '<div class="timeline-time">Waktu</div>';
        days.forEach(day => gridHTML += `<div class="timeline-header">${day}</div>`);
        for (let hour = startTime; hour < endTime; hour++) {
            ['00', '30'].forEach(min => {
                gridHTML += `<div class="timeline-time">${String(hour).padStart(2,'0')}:${min}</div>`;
                days.forEach(() => gridHTML += '<div class="timeline-cell"></div>');
            });
        }
        timelineView.style.gridTemplateRows = `40px repeat(${(endTime - startTime) * 2}, 1fr)`;
        timelineView.innerHTML = gridHTML;
        
        if (activeCourses.length === 0) return;

        // 2. Petakan jadwal ke grid virtual & identifikasi yang bentrok
        const grid = {};
        const timeToRow = (timeStr) => (parseInt(timeStr.slice(0, 2)) - startTime) * 2 + (parseInt(timeStr.slice(3, 5)) >= 30 ? 1 : 0);
        const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        
        const overlappedCourseIds = new Set();
        activeCourses.forEach(course => {
            const formattedDay = capitalize(course.Hari);
            const dayIndex = days.indexOf(formattedDay);
            if (dayIndex === -1) return;
            const startRow = timeToRow(course.Mulai), duration = timeToRow(course.Selesai) - startRow;
            if (duration <= 0) return;
            const col = dayIndex + 2;
            for (let i = 0; i < duration; i++) {
                const key = `${startRow + i}-${col}`;
                if (!grid[key]) grid[key] = [];
                grid[key].push(course);
                if (grid[key].length > 1) {
                    grid[key].forEach(c => overlappedCourseIds.add(c.id));
                }
            }
        });

        // 3. Render jadwal yang TIDAK bentrok
        activeCourses.forEach(course => {
            if (!overlappedCourseIds.has(course.id)) {
                const formattedDay = capitalize(course.Hari);
                const dayIndex = days.indexOf(formattedDay);
                const startRow = timeToRow(course.Mulai), duration = timeToRow(course.Selesai) - startRow;
                const col = dayIndex + 2;

                const scheduleEl = document.createElement('div');
                scheduleEl.className = 'schedule-item';
                scheduleEl.style.gridRow = `${startRow + 2} / span ${duration}`;
                scheduleEl.style.gridColumn = `${col} / span 1`;
                scheduleEl.innerHTML = `<div class="item-content"><strong>${course.Matakuliah}</strong><small>${course.Jurusan} - Kls ${course.Kelas} | ${course.Ruang}</small></div><button class="btn-remove-item" data-id="${course.id}">&times;</button>`;
                timelineView.appendChild(scheduleEl);
            }
        });

        // 4. Render INDIKATOR untuk grup yang bentrok
        const renderedOverlapGroups = new Set();
        Object.values(grid).forEach(coursesInCell => {
            if (coursesInCell.length > 1) {
                const groupSignature = coursesInCell.map(c => c.id).sort().join('-');
                if (renderedOverlapGroups.has(groupSignature)) return;

                const day = capitalize(coursesInCell[0].Hari);
                const col = days.indexOf(day) + 2;
                const groupStartRow = Math.min(...coursesInCell.map(c => timeToRow(c.Mulai)));
                const groupEndRow = Math.max(...coursesInCell.map(c => timeToRow(c.Selesai)));
                const duration = groupEndRow - groupStartRow;

                const indicator = document.createElement('div');
                indicator.className = 'overlap-indicator';
                indicator.textContent = `+${coursesInCell.length} Bentrok`;
                indicator.style.gridRow = `${groupStartRow + 2} / span ${duration}`;
                indicator.style.gridColumn = `${col} / span 1`;
                indicator.dataset.courses = JSON.stringify(coursesInCell);
                timelineView.appendChild(indicator);
                renderedOverlapGroups.add(groupSignature);
            }
        });
    }

    function togglePanel(show) {
        controlPanel.classList.toggle('is-open', show);
        overlay.classList.toggle('is-active', show);
    }
    
    function handleTimelineClick(e) {
        if (e.target.classList.contains('btn-remove-item')) {
            const idToRemove = parseInt(e.target.dataset.id, 10);
            activeCourses = activeCourses.filter(c => c.id !== idToRemove);
            renderTimeline();
            return;
        }
        if (e.target.classList.contains('overlap-indicator')) {
            const courses = JSON.parse(e.target.dataset.courses);
            // Konten popover sekarang menyertakan tombol hapus
            popover.innerHTML = `<h4>Jadwal Bentrok</h4><ul>` + 
                courses.map(c => `
                    <li>
                        <div class="popover-item-info">
                            <span class="popover-color-dot" style="background-color: #fff;"></span>
                            ${c.Matakuliah} (${c.Kelas})
                        </div>
                        <button class="btn-remove-popover" data-id="${c.id}">&times;</button>
                    </li>
                `).join('') + `</ul>`;
            
            popover.style.display = 'block';
            const rect = e.target.getBoundingClientRect();
            // Posisi popover disesuaikan agar tidak keluar layar
            popover.style.left = `${Math.min(rect.left, window.innerWidth - popover.offsetWidth - 20)}px`;
            popover.style.top = `${rect.bottom + 5}px`;
        }
    }

    // TAMBAHKAN FUNGSI BARU INI
    function handlePopoverClick(e) {
        if (e.target.classList.contains('btn-remove-popover')) {
            const idToRemove = parseInt(e.target.dataset.id, 10);
            // Hapus mata kuliah dari daftar utama
            activeCourses = activeCourses.filter(c => c.id !== idToRemove);
            // Sembunyikan popover
            popover.style.display = 'none';
            // Gambar ulang timeline
            renderTimeline();
        }
    }

    init();
});