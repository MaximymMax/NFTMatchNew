// main-page.js
document.addEventListener('DOMContentLoaded', () => {
    
    const SERVER_BASE_URL = 'https://nftmatchbot20250730152328.azurewebsites.net';
    const CACHE_KEY = 'giftNamesCache';
    const TG_USER_KEY = 'tgUser'; // Используем константу

    const tgGateOverlay = document.getElementById('tg-gate-overlay');
    const body = document.body;

    const preloadGiftNames = async () => {
        try {
            const cachedData = sessionStorage.getItem(CACHE_KEY);
            if (cachedData) {
                console.log('Gift names already in cache. App is ready.');
                return; // .ready() уже был вызван, просто выходим
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

        } catch (error) {
            console.error('Failed to preload gift names:', error);
        }
    };

    //
    // --- НОВАЯ ЛОГИКА ЗАПУСКА ---
    //
    const initializeApp = () => {
    
        // 1. СНАЧАЛА сообщаем Telegram, что мы готовы.
        // Это делает initDataUnsafe доступным.
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('Signaling Telegram: WebApp is ready.');
            window.Telegram.WebApp.ready();
        }

        // 2. ТЕПЕРЬ проверяем initData, он должен быть доступен
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            
            console.log('Running inside Telegram WebApp. Initializing app...');
            
            // --- "РОУТЕР" ---
            // 3. Проверяем start_param СРАЗУ
            const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
            
            if (startParam) {
                console.log("Найден start_param на главной странице:", startParam);
                
                // Проверяем, для какого инструмента эта ссылка
                if (startParam.startsWith('findModels_') || startParam.startsWith('findBgs_')) {
                    
                    // Это ссылка для твоего background-finder.
                    // Немедленно перенаправляем на него.
                    console.log("Перенаправление на /Monohrome/background-finder.html");
                    
                    window.location.href = './Monohrome/background-finder.html';
                    
                    // ВАЖНО: Завершаем выполнение функции,
                    // чтобы не выполнять preloadGiftNames и т.д.
                    return; 
                }
                
                // Сюда можно будет добавить `else if` для других ссылок
            }
            // --- КОНЕЦ РОУТЕРА ---

            // 4. Если редиректа НЕ БЫЛО, сохраняем данные пользователя
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
            // 4b. Если мы НЕ в Telegram, сохраняем фейковые данные
            console.log('Not in Telegram WebApp. Saving FAKE user data for testing.');
            try {
                 // Проверяем, чтобы не перезаписать, если уже есть
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

        // 5. Если мы НЕ ушли на редирект, запускаем предзагрузку
        preloadGiftNames();
    };

    // Запускаем одну главную функцию
    initializeApp();
    
});
