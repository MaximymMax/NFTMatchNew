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

    // --- API Функции (без изменений) ---

    const fetchAllGiftNames = async () => {
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
        try {
            const response = await fetch(`${SERVER_BASE_URL}/api/ListGifts/AllGiftNames`);
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            const giftNames = await response.json();
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(giftNames));
            console.log('Successfully fetched and cached gift names.');
            return giftNames; // Возвращаем данные
        } catch (error) {
            console.error('Failed to preload gift names:', error);
            return null; // Возвращаем null в случае ошибки
        }
    };

    async function fetchAllModelNames(giftName) {
        if (!giftName) return null;
        
        const url = `${SERVER_BASE_URL}/api/ListGifts/${encodeURIComponent(giftName)}/AllModelNames`;
        console.log(`%c[API Request] Fetching models for "${giftName}" from: ${url}`, 'color: dodgerblue');
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const modelsList = await response.json();
            console.log(`%c[API Success] Loaded models for "${giftName}":`, 'color: green', modelsList);
            return modelsList;
        } catch (error) {
            console.error(`[API Error] Ошибка при загрузке моделей для ${giftName}:`, error);
            return null;
        }
    }


    /**
     * ГЛАВНЫЙ РОУТЕР
     * (Без изменений, кроме удаления .ready())
     */
    const handleStartParam = async (startParam) => {
        console.log(`[Router] Processing start_param: ${startParam}`);
        
        try {
            // findModels-SantaHat-Amber
            const parts = startParam.split('-');
            if (parts.length < 3) {
                throw new Error("Неверный формат start_param. Ожидалось 3 части.");
            }

            const paramMode = parts[0]; // findModels
            const rawGift = parts[1]; // SantaHat
            const rawOther = parts[2]; // Amber (или Pepe)

            // 1. Загружаем и ищем подарок
            //    (Тут и есть твой await, который ждет "холодный старт")
            const allGiftNames = await fetchAllGiftNames();
            if (!allGiftNames) {
                throw new Error("Не удалось загрузить список подарков.");
            }

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
                const rawColor = rawOther;
                newParams.set('color', rawColor); 
                console.log(`[Router] Mode: findModels. Color: "${rawColor}"`);

            } else if (paramMode === 'findBgs') {
                const rawModel = rawOther;
                
                // (Тут второй await, который тоже ждет)
                const allModelNames = await fetchAllModelNames(correctGiftName);
                if (!allModelNames) {
                    throw new Error(`Не удалось загрузить модели для "${correctGiftName}"`);
                }

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
            
            // 5.
            // --- УДАЛЕНО: .ready() УЖЕ БЫЛ ВЫЗВАН ---
            //

            window.location.href = newUrl;

        } catch (e) {
            console.error("[Router] Ошибка обработки start_param:", e);
            // Если произошла ошибка, просто запускаем обычное приложение
            initializeNormalApp();
        }
    };

    /**
     * Обычная инициализация (для тех, кто зашел без start_param)
     * (Изменено: убран вызов .ready())
     */
    const initializeNormalApp = () => {
        
        //
        // --- УДАЛЕНО: .ready() УЖЕ БЫЛ ВЫЗВАН ---
        //
        console.log('Running normal app initialization (no start_param).');
        
        // 2. ТЕПЕРЬ проверяем initData
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            
            console.log('Running inside Telegram WebApp. Initializing app...');
            
            // 3. Сохраняем данные пользователя
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
            // 3b. Если мы НЕ в Telegram, сохраняем фейковые данные
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

        // 4. Запускаем предзагрузку (на случай, если пользователь останется на этой странице)
        fetchAllGiftNames(); // Просто запускаем для кеша, не ждем
    };


    //
    // --- ГЛАВНАЯ ЛОГИКА ЗАПУСКА (ИСПРАВЛЕНА) ---
    //
    const initializeApp = () => {
    
        // 1. СНАЧАЛА сообщаем Telegram, что мы готовы.
        // Это ГАРАНТИРУЕТ, что initDataUnsafe будет доступен.
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('Signaling Telegram: WebApp is ready.');
            window.Telegram.WebApp.ready();
        }

        // 2. ТЕПЕРЬ, после ready(), мы можем безопасно читать start_param
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        
        if (startParam) {
            // Если есть start_param, запускаем "РОУТЕР"
            // (Он сам будет ждать (await) загрузки API)
            handleStartParam(startParam);
        } else {
            // Если start_param нет, запускаем обычную инициализацию
            initializeNormalApp();
        }
    };

    // Запускаем одну главную функцию
    initializeApp();
    
});
