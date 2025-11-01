// main-page.js
document.addEventListener('DOMContentLoaded', () => {
    
    const SERVER_BASE_URL = 'https://nftmatchbot20250730152328.azurewebsites.net';
    const CACHE_KEY = 'giftNamesCache';
    const TG_USER_KEY = 'tgUser'; 

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
    // --- ОБНОВЛЕННАЯ ЛОГИКА ЗАПУСКА ---
    //
    const initializeApp = () => {
    
        // 1. СНАЧАЛА сообщаем Telegram, что мы готовы.
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('Signaling Telegram: WebApp is ready.');
            window.Telegram.WebApp.ready();
        }

        // 2. ТЕПЕРЬ проверяем initData
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            
            console.log('Running inside Telegram WebApp. Initializing app...');
            
            // --- "РОУТЕР" ---
            // 3. Проверяем start_param СРАЗУ
            const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
            
            if (startParam) {
                console.log("Найден start_param на главной странице:", startParam);
                
                //
                // --- НАЧАЛО ИЗМЕНЕНИЙ ---
                //
                try {
                    const parts = startParam.split('_');
                    const restoreSpaces = (str) => str.replace(/~/g, ' ');
                    let newParams = new URLSearchParams(); // Создаем объект для ?=...
                    let targetPage = null;

                    // Разбираем startParam "findModels_Santa-Hat_Amber"
                    if (parts.length >= 3 && (parts[0] === 'findModels' || parts[0] === 'findBgs')) {
                        const paramMode = parts[0];
                        const paramGift = restoreSpaces(parts[1]);
                        
                        newParams.set('mode', paramMode);
                        newParams.set('gift', paramGift);

                        if (paramMode === 'findModels') {
                            const paramColor = restoreSpaces(parts[2]);
                            newParams.set('color', paramColor);
                            targetPage = './Monohrome/background-finder.html';
                        } else if (paramMode === 'findBgs') {
                            const paramModel = restoreSpaces(parts[2]);
                            newParams.set('model', paramModel);
                            targetPage = './Monohrome/background-finder.html';
                        }
                    }

                    if (targetPage) {
                        // Собираем новую ссылку: ./Monohrome/background-finder.html?mode=findModels&gift=Santa Hat&color=Amber
                        const newUrl = `${targetPage}?${newParams.toString()}`;
                        console.log(`Перенаправление: ${startParam} -> ${newUrl}`);
                        
                        // Немедленно перенаправляем на нужную страницу с НОВЫМИ параметрами
                        window.location.href = newUrl;
                        
                        // ВАЖНО: Завершаем выполнение функции, чтобы не грузить главную
                        return;
                    } else {
                         console.warn("Не удалось разобрать start_param:", startParam);
                    }

                } catch (e) {
                    console.error("Ошибка разбора start_param:", e);
                }
                // --- КОНЕЦ ИЗМЕНЕНИЙ ---
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
