// --- КОНФИГУРАЦИЯ ---
// Список моделей. 
// folder: название папки
// ext: расширение файла (jpg или png)
// name: красивое имя для отображения
const MODELS = [
    { id: 'flux', name: 'Flux 2 Pro', folder: 'flux2pro', ext: 'jpg' },
    { id: 'banana', name: 'Banana Pro', folder: 'banana_images', ext: 'png' },
    { id: 'qwen', name: 'Qwen Image', folder: 'qwen_images_cgf25', ext: 'png' },
    { id: 'seedream', name: 'Seedream 4', folder: 'seedream_images', ext: 'png' },
    { id: 'wan', name: 'Wan 2.5', folder: 'wan_25', ext: 'png' },
    { id: 'zimage', name: 'Z-Image Turbo', folder: 'z_image_turbo', ext: 'png' }
];

const CSV_FILE = 'prompts_test_suite.csv';

// Функция запуска
document.addEventListener('DOMContentLoaded', () => {
    loadCSV();
});

function loadCSV() {
    Papa.parse(CSV_FILE, {
        download: true,
        header: true, // Первая строка CSV считается заголовками
        skipEmptyLines: true,
        complete: function(results) {
            renderGallery(results.data);
        },
        error: function(err) {
            console.error("Ошибка CSV:", err);
            document.getElementById('gallery-container').innerHTML = `<p style="color:red">Ошибка загрузки CSV файла. Проверьте консоль.</p>`;
        }
    });
}

function renderGallery(data) {
    const container = document.getElementById('gallery-container');
    container.innerHTML = ''; // Очистить "Загрузку..."

    data.forEach((row, index) => {
        // Пропускаем строки без промта
        if (!row.prompt) return;

        // 1. Определяем ID и Category для имени файла
        // Если ID в CSV нет, используем номер строки
        let id = row.id ? row.id.trim() : (index + 1).toString();
        // В CSV id может быть "1.0", скрипт питона мог сохранить как "1.0" или "1"
        // Обычно pandas читает как float (1.0). Давайте приведем к безопасному виду.
        // Если у вас файлы называются 1.0_Realism.jpg, оставляем как есть.
        
        let category = row.category ? row.category.trim() : "Uncategorized";
        
        // Очистка имени файла (так же, как в Python скрипте)
        const safeId = id; 
        const safeCategory = category.replace(/\//g, "_").replace(/\\/g, "_").replace(/ /g, "_");
        
        // Базовое имя файла без расширения: "1.0_Realism"
        const filenameBase = `${safeId}_${safeCategory}`;

        // 2. Создаем HTML для строки
        const rowDiv = document.createElement('div');
        rowDiv.className = 'comparison-row';

        // Блок с промтом
        // We'll create a floating prompt overlay at the bottom of the row
        // (created after the images so it overlays them)

        // Блок с картинками (DOM-элементы чтобы можно было переключать src при ошибке)
        const modelsGrid = document.createElement('div');
        modelsGrid.className = 'models-grid';

        MODELS.forEach(model => {
            const modelCard = document.createElement('div');
            modelCard.className = 'model-card';

            const header = document.createElement('div');
            header.className = 'model-header';
            header.textContent = model.name;
            modelCard.appendChild(header);

            // Кандидаты путей: сначала без .0, затем с .0 (поддержка файлов типа 1.0_Name.jpg)
            const candidates = [];
            candidates.push(`${model.folder}/${filenameBase}.${model.ext}`);
            // если id не содержит точки, попробуем вариант с ".0"
            if (!/\./.test(safeId)) {
                candidates.push(`${model.folder}/${safeId}.0_${safeCategory}.${model.ext}`);
            }

            const img = document.createElement('img');
            img.loading = 'lazy';
            img.alt = model.name;
            // Request layout size so images are displayed as 1110x1110 by default
            img.width = 950;
            img.height = 950;
            // Функция-обработчик ошибок: пробуем следующий кандидат или показываем заглушку
            img.onerror = function() {
                if (candidates.length > 0) {
                    // Попробовать следующий путь
                    this.src = candidates.shift();
                } else {
                    // Ничего не подошло — показать заглушку
                    const fallback = document.createElement('div');
                    fallback.style.padding = '20px';
                    fallback.style.textAlign = 'center';
                    fallback.style.color = '#555';
                    fallback.textContent = 'No Image';
                    // Заменяем img на заглушку
                    if (this.parentNode) this.parentNode.replaceChild(fallback, this);
                }
            };

            // Устанавливаем начальный src (первый кандидат) и удаляем его из списка
            if (candidates.length > 0) {
                img.src = candidates.shift();
            }

            modelCard.appendChild(img);
            modelsGrid.appendChild(modelCard);
        });

        // Enable faster horizontal scroll with vertical mouse wheel over this grid.
        // If the user scrolls further when the grid is already at the right edge,
        // smoothly scroll the page to the next comparison row (next image set).
        const H_SCROLL_SPEED = 5; // tweak this number to increase/decrease speed
        const RIGHT_EDGE_THRESHOLD = 8; // px, tolerance for end detection
        const LEFT_EDGE_THRESHOLD = 8; // px, tolerance for left edge
        modelsGrid.addEventListener('wheel', function(e) {
            // Prevent the default page scroll while we handle horizontal movement
            e.preventDefault();
            e.stopPropagation();

            // Prefer vertical delta (mouse wheel) but fall back to deltaX (touchpad)
            const delta = Math.abs(e.deltaY) > 0 ? e.deltaY : e.deltaX;
            // Multiply to increase horizontal scroll speed
            this.scrollLeft += delta * H_SCROLL_SPEED;

            // Check edges
            const atRight = this.scrollLeft + this.clientWidth >= this.scrollWidth - RIGHT_EDGE_THRESHOLD;
            const atLeft = this.scrollLeft <= LEFT_EDGE_THRESHOLD;

            // If user is scrolling right (positive delta) and we're at the right end,
            // advance to the next comparison row.
            if (atRight && delta > 0) {
                const nextRow = rowDiv.nextElementSibling;
                if (nextRow) {
                    nextRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }

            // If user is scrolling up (negative delta) and we're at the left end,
            // move to the previous comparison row.
            if (atLeft && delta < 0) {
                const prevRow = rowDiv.previousElementSibling;
                if (prevRow) {
                    prevRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }, { passive: false });

        rowDiv.appendChild(modelsGrid);

        // Create prompt overlay and append after the grid so it overlays images
        const promptOverlay = document.createElement('div');
        promptOverlay.className = 'prompt-overlay';
        promptOverlay.innerHTML = `
            <span class="prompt-label">Prompt #${id} [${category}]</span>
            <div class="prompt-body">${row.prompt}</div>
        `;
        rowDiv.appendChild(promptOverlay);

        container.appendChild(rowDiv);
    });
}