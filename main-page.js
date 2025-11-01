// main-page.js
document.addEventListener('DOMContentLoaded', () => {
    
    const SERVER_BASE_URL = 'https://nftmatchbot20250730152328.azurewebsites.net';
    const CACHE_KEY = 'giftNamesCache';
    const TG_USER_KEY = 'tgUser';

    // --- Функции нормализации (без изменений) ---
    const normalize = (str) => {
        if (typeof str !== 'string') return '';
        return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const findNormalized = (rawParam, list, key = null) => {
        if (!rawParam || !list || list.length === 0) return null;
        const normalizedParam = normalize(rawParam);
        if (!normalizedParam) return null;

        return list.find(item => {
            const correctName = key ? item[key] : item;
            return normalize(correctName) === normalizedParam;
        });
    };

    // --- API Функции ---

    /**
     * Загружает (или берет из кеша) список имен подарков
     * Добавлена логика повторных попыток для "холодного старта"
     * @returns {Promise<string[]|null>} - Массив имен или null в случае ошибки
     */
    const fetchAllGiftNames = async (retries = 3, delay = 2500) => {
        try {
            const cachedData = sessionStorage.getItem(CACHE_KEY);
            if (cachedData) {
                console.log('Gift names found in cache.');
                return JSON.parse(cachedData);
            }
        } catch (error) {
            console.error('Failed to read from sessionStorage:', error);
        }

        console.log('Cache is empty. Fetching gift names from server...');
        const url = `${SERVER_BASE_URL}/api/ListGifts/AllGiftNames`;

        // --- ЛОГИКА ПОВТОРНЫХ ПОПЫТОК ---
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`[Router] Fetching gifts, attempt ${i + 1}/${retries}...`);
                const response = await fetch(url);
                if (!response.ok) {
                    // Повторяем только при 5xx (ошибки сервера / холодный старт)
                    if (response.status >= 500 && response.status < 600) {
                         throw new Error(`Server cold start? Status: ${response.status}`);
                    }
                    console.error(`[Router] Non-retriable HTTP error: ${response.status}`);
                    return null; // Фатальная ошибка (напр. 404)
                }
                const giftNames = await response.json();
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(giftNames));
                console.log('Successfully fetched and cached gift names.');
                return giftNames; // УСПЕХ
            } catch (error) {
                console.warn(`[Router] Attempt ${i + 1} failed: ${error.message}`);
                if (i === retries - 1) {
                    console.error('Failed to preload gift names after all retries.');
                    return null; // Все попытки провалены
                }
                // Увеличиваем задержку
                await new Promise(res => setTimeout(res, delay * (i + 1))); 
            }
        }
        return null;
    };

    /**
     * Загружает список моделей для ОДНОГО подарка
     * Добавлена логика повторных попыток
     * @returns {Promise<object[]|null>} - Массив объектов моделей или null
     */
    async function fetchAllModelNames(giftName, retries = 3, delay = 2500) {
        if (!giftName) return null;
        
        const url = `${SERVER_BASE_URL}/api/ListGifts/${encodeURIComponent(giftName)}/AllModelNames`;
        
        // --- ЛОГИКА ПОВТОРНЫХ ПОПЫТОК ---
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`[Router] Fetching models for "${giftName}", attempt ${i + 1}/${retries}...`);
                const response = await fetch(url);
                if (!response.ok) {
                    if (response.status >= 500 && response.status < 600) {
                        throw new Error(`Server cold start? Status: ${response.status}`);
                    }
                    console.error(`[Router] Non-retriable HTTP error: ${response.status}`);
                    return null; 
                }
                const modelsList = await response.json();
                console.log(`[API Success] Loaded models for "${giftName}":`, modelsList);
                return modelsList; // УСПЕХ
            } catch (error) {
                console.warn(`[Router] Attempt ${i + 1} failed: ${error.message}`);
                if (i === retries - 1) {
                    console.error(`Failed to load models for ${giftName} after all retries.`);
                    return null;
                }
                await new Promise(res => setTimeout(res, delay * (i + 1))); 
            }
        }
        return null;
    }


    /**
     * ГЛАВНЫЙ РОУТЕР
     * Обрабатывает start_param, загружает данные и перенаправляет
     */
    const handleStartParam = async (startParam) => {
        console.log(`[Router] Processing start_param: ${startParam}`);
        
        try {
            //
            // ------------------ ✅ ИСПРАВЛЕНИЕ 1 ------------------
            //
            // Ссылка: findModels_Santa-Hat_Amber
            const parts = startParam.split('_'); // ⬅️ БЫЛО '-'
            // parts[0] = "findModels"
            // parts[1] = "Santa-Hat"
            // parts[2] = "Amber"
            //
            // ---------------------------------------------------
            //
            
            if (parts.length < 2) { // 2 части минимум (findBgs_Santa-Hat)
                throw new Error("Неверный формат start_param. Ожидалось 2-3 части.");
            }

            const paramMode = parts[0]; // findModels
            const rawGift = parts[1]; // Santa-Hat

            // 1. Загружаем и ищем подарок (теперь с ретраями)
            const allGiftNames = await fetchAllGiftNames();
            if (!allGiftNames) {
                throw new Error("Не удалось загрузить список подарков.");
            }

            // findNormalized("Santa-Hat", ["Santa Hat", ...]) -> "Santa Hat"
            const correctGiftName = findNormalized(rawGift, allGiftNames);
            if (!correctGiftName) {
                throw new Error(`Подарок не найден. Искали: "${rawGift}"`);
            }
            console.log(`[Router] Gift found: "${rawGift}" -> "${correctGiftName}"`);

            // 2. Готовим параметры
            let newParams = new URLSearchParams();
            let targetPage = './Monohrome/background-finder.html';
            newParams.set('mode', paramMode);
            newParams.set('gift', correctGiftName); // Кладём "Santa Hat"

            // 3. Обрабатываем в зависимости от режима
            if (paramMode === 'findModels') {
                if (parts.length < 3) throw new Error("Неверный формат для findModels.");
                
                const rawColor = parts[2]; // "Amber"
                // Просто передаем "Amber". background-finder.js сам его найдет.
                newParams.set('color', rawColor); 
                console.log(`[Router] Mode: findModels. Color: "${rawColor}"`);

            } else if (paramMode === 'findBgs') {
                if (parts.length < 3) throw new Error("Неверный формат для findBgs.");
                
                const rawModel = parts[2]; // "Pepe"
                
                // Нужно загрузить модели (с ретраями)
                const allModelNames = await fetchAllModelNames(correctGiftName);
                if (!allModelNames) {
                    throw new Error(`Не удалось загрузить модели для "${correctGiftName}"`);
                }

                // Ищем "Pepe" среди [ { NameModel: "Pepe" }, ... ]
                const correctModel = findNormalized(rawModel, allModelNames, 'NameModel');
                if (!correctModel) {
                    throw new Error(`Модель не найдена. Искали: "${rawModel}" в "${correctGiftName}"`);
                }

                console.log(`[Router] Mode: findBgs. Model found: "${rawModel}" -> "${correctModel.NameModel}"`);
                newParams.set('model', correctModel.NameModel); // Кладём "Pepe"
            
            } else {
                throw new Error(`Неизвестный режим: "${paramMode}"`);
            }

            // 4. Перенаправление
            const newUrl = `${targetPage}?${newParams.toString()}`;
            console.log(`[Router] Redirecting to: ${newUrl}`);
            
            // 5. Сообщаем, что готовы (ready() уже был вызван)
            window.location.href = newUrl;

        } catch (e) {
            console.error("[Router] Ошибка обработки start_param:", e);
            // Если произошла ошибка, просто запускаем обычное приложение
            // (ready() уже был вызван, просто загружаем данные)
            preloadDataForMainPage();
        }
    };

    /**
     * Обычная инициализация (для тех, кто зашел без start_param)
     */
    const initializeNormalApp = () => {
        console.log('Running normal app initialization (no start_param).');
        
        // 1. Сохраняем данные пользователя
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            try {
                const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
                if (tgUser) {
                    const userData = {
                        telegramId: parseInt(tgUser.id, 10), 
                        username: tgUser.username || null,
                        firstName: tgUser.first_name || null,
                        lastName: tgUser.last_name || null,
                    };
                    sessionStorage.setItem(TG_USER_KEY, JSON.stringify(userData));
                    console.log('REAL User data SAVED to sessionStorage:', userData);
                } else {
                    sessionStorage.removeItem(TG_USER_KEY);
                    console.warn('tgUser object not found in initDataUnsafe, clearing cache.');
                }
            } catch (e) {
                console.error('Failed to save REAL user data to sessionStorage:', e);
                sessionStorage.removeItem(TG_USER_KEY);
            }
        } else {
            // 1b. Если мы НЕ в Telegram, сохраняем фейковые данные
            console.log('Not in Telegram WebApp. Saving FAKE user data for testing.');
            try {
                if (!sessionStorage.getItem(TG_USER_KEY)) {
                    const testUserData = {
                        telegramId: 7593322, 
                        username: "UserOwner583",
                        firstName: "Test",
                        lastName: "Test",
                    };
                    sessionStorage.setItem(TG_USER_KEY, JSON.stringify(testUserData));
                    console.log('FAKE User data SAVED to sessionStorage:', testUserData);
                }
            } catch (e) {
                console.error('Failed to save FAKE user data to sessionStorage:', e);
            }
        }

        // 2. Запускаем предзагрузку
        preloadDataForMainPage();
    };

    /**
     * Просто загружает данные для главной страницы в фон
     */
    const preloadDataForMainPage = () => {
        console.log('Preloading gift names for main page cache...');
        // Просто запускаем для кеша, не ждем (без ретраев, не критично)
        fetch(SERVER_BASE_URL + '/api/ListGifts/AllGiftNames')
            .then(res => res.json())
            .then(giftNames => {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(giftNames));
                console.log('Main page preloading complete.');
            })
            .catch(e => console.warn('Main page preloading failed.', e));
    };


    //
    // ------------------ ✅ ИСПРАВЛЕНИЕ 2 ------------------
    // --- ГЛАВНАЯ ЛОГИКА ЗАПУСКА (ИСПРАВЛЕНА) ---
    //
    const initializeApp = () => {
    
        // 1. СНАЧАЛА сообщаем Telegram, что мы готовы.
        // Это делает initDataUnsafe 100% доступным.
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('Signaling Telegram: WebApp is ready.');
            window.Telegram.WebApp.ready();
        }

        // 2. ТЕПЕРЬ читаем start_param.
        // Он 100% будет (или undefined, если его нет)
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        
        if (startParam) {
            // Если есть start_param, запускаем "РОУТЕР"
            handleStartParam(startParam);
        } else {
            // Если start_param нет, запускаем обычную инициализацию
            initializeNormalApp();
        }
    };
    // ---------------------------------------------------

    // Запускаем одну главную функцию
    initializeApp();
    
});
