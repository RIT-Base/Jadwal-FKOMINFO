document.addEventListener('DOMContentLoaded', async () => {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7JM3GPuEhSQgyZVGrgpMDu11J8JE5RcATgG33CTh1xwPd46W2Q83lK2W_aq7vDRCT7LXwZSKoZ-qf/pub?gid=1414529007&single=true&output=csv';

    const searchInput = document.getElementById('ruanganSearch');
    const loadingDiv = document.getElementById('loading');
    const container = document.getElementById('ruangan-container');
    const dayFilterContainer = document.querySelector('.day-filter');

    let allDataByRoom = {};
    const operationalHours = { start: 7, end: 19 };

    const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    async function loadAndProcessData() {
        try {
            const response = await fetch(csvUrl);
            const csvText = await response.text();
            const data = csvText.trim().split('\n').slice(1).map(row => {
                const values = row.split(',');
                return {
                    Ruang: values[4].trim(),
                    Hari: values[1].trim(),
                    Mulai: values[2].trim(),
                    Selesai: values[3].trim(),
                    Matakuliah: values[6].trim(),
                    Kelas: values[7].trim() // <-- Data Kelas ditambahkan di sini
                };
            });
            allDataByRoom = data.reduce((acc, item) => {
                if (!acc[item.Ruang]) acc[item.Ruang] = [];
                acc[item.Ruang].push(item);
                return acc;
            }, {});
            loadingDiv.style.display = 'none';
        } catch (error) {
            loadingDiv.textContent = 'Gagal memuat data.';
            console.error('Error fetching data:', error);
        }
    }

    function renderRuangan(day, searchTerm = '') {
        container.innerHTML = '';
        let sortedRooms = Object.keys(allDataByRoom).sort();

        if (searchTerm) {
            sortedRooms = sortedRooms.filter(ruang =>
                ruang.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortedRooms.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Ruangan tidak ditemukan.</p>';
        }

        sortedRooms.forEach(ruang => {
            const schedulesToday = allDataByRoom[ruang]
                .filter(s => s.Hari === day)
                .sort((a, b) => a.Mulai.localeCompare(b.Mulai));
            const card = document.createElement('div');
            card.className = 'ruang-card';
            let contentHTML = `<h3>${ruang}</h3>`;

            // Logika Tampilan Teks (Jam Kosong)
            const startMinutes = operationalHours.start * 60;
            const endMinutes = operationalHours.end * 60;
            let lastEndTime = startMinutes;
            let emptySlots = [];
            schedulesToday.forEach(schedule => {
                const currentStartTime = timeToMinutes(schedule.Mulai);
                if (currentStartTime > lastEndTime) {
                    emptySlots.push({ start: lastEndTime, end: currentStartTime });
                }
                lastEndTime = Math.max(lastEndTime, timeToMinutes(schedule.Selesai));
            });
            if (endMinutes > lastEndTime) {
                emptySlots.push({ start: lastEndTime, end: endMinutes });
            }
            const formatMinutes = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
            const emptySlotsText = emptySlots.map(slot => `${formatMinutes(slot.start)} - ${formatMinutes(slot.end)}`).join(', ');
            if (emptySlotsText) {
                contentHTML += `<p class="info-kosong"><span>Kosong:</span> ${emptySlotsText}</p>`;
            } else {
                contentHTML += `<p class="info-kosong penuh"><span>Status:</span> Penuh sepanjang hari</p>`;
            }

            // Logika Tampilan Visual (Timeline)
            const totalDurationMinutes = (operationalHours.end - operationalHours.start) * 60;
            let scheduleBlocksHTML = '';
            schedulesToday.forEach(schedule => {
                const start = timeToMinutes(schedule.Mulai);
                const end = timeToMinutes(schedule.Selesai);
                const left = ((start - startMinutes) / totalDurationMinutes) * 100;
                const width = ((end - start) / totalDurationMinutes) * 100;

                scheduleBlocksHTML += `<div class="schedule-block" 
                    style="left: ${left}%; width: ${width}%;"
                    data-matkul="${schedule.Matakuliah}"
                    data-jam="${schedule.Mulai.slice(0,5)} - ${schedule.Selesai.slice(0,5)}"
                    data-kelas="${schedule.Kelas}"> 
                </div>`; // <-- Atribut data-kelas ditambahkan
            });
            
            let timeMarkersHTML = '';
            for (let hour = operationalHours.start; hour <= operationalHours.end; hour++) {
                timeMarkersHTML += `<span>${String(hour).padStart(2, '0')}:00</span>`;
            }

            contentHTML += `
                <div class="timeline-container">
                    <div class="timeline-bar">${scheduleBlocksHTML}</div>
                    <div class="time-markers">${timeMarkersHTML}</div>
                </div>
            `;
            card.innerHTML = contentHTML;
            container.appendChild(card);
        });
    }

    searchInput.addEventListener('input', () => {
        const activeDayButton = document.querySelector('.day-filter button.active');
        if (activeDayButton) {
            renderRuangan(activeDayButton.dataset.day, searchInput.value);
        }
    });

    dayFilterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('.day-filter button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            renderRuangan(e.target.dataset.day, searchInput.value);
        }
    });
    
    let tooltip = null;
    container.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('schedule-block')) {
            tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            const matkul = e.target.dataset.matkul;
            const jam = e.target.dataset.jam;
            const kelas = e.target.dataset.kelas; // <-- Ambil data kelas
            tooltip.innerHTML = `<strong>${matkul} (Kelas ${kelas})</strong><br>${jam}`; // <-- Tampilkan kelas
            document.body.appendChild(tooltip);
        }
    });

    container.addEventListener('mousemove', (e) => {
        if (tooltip) {
            const offsetY = 20;
            const tooltipWidth = tooltip.offsetWidth;
            const pageWidth = window.innerWidth;

            // Default: center on cursor
            let left = e.pageX - tooltipWidth / 2;

            // Prevent going beyond the left edge
            if (left < 0) {
                left = 0;
            }

            // Prevent going beyond the right edge
            if (left + tooltipWidth > pageWidth) {
                left = pageWidth - tooltipWidth;
            }

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${e.pageY + offsetY}px`;
        }
    });

    container.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('schedule-block')) {
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        }
    });

    // Inisialisasi
    await loadAndProcessData();
    const todayIndex = new Date().getDay(); // Minggu=0, Senin=1, ..., Sabtu=6
    // Jika hari Minggu, pilih Senin (indeks 0). Jika hari lain, pilih hari itu (indeks: hari - 1).
    const buttonIndex = todayIndex === 0 ? 0 : todayIndex - 1;
    const activeDayButton = dayFilterContainer.children[buttonIndex];
    if (activeDayButton) {
        activeDayButton.click();
    }
});