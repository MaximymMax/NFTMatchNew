// main-page.js
document.addEventListener('DOMContentLoaded', () => {
    
    const SERVER_BASE_URL = 'https://nftmatchbot20250730152328.azurewebsites.net';
    const CACHE_KEY = 'giftNamesCache';
    const TG_USER_KEY = 'tgUser';

    // 1. Функция сохранения данных пользователя И ПРОВЕРКИ РЕДИРЕКТА
    const saveUserData = () => {
        // Сначала сообщаем Telegram, что мы готовы
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('Signaling Telegram: WebApp is ready.');
            window.Telegram.WebApp.ready(); // <--- ГЛАВНЫЙ ФИКС ЛОГИКИ
        }

        // Теперь, когда мы готовы, пытаемся прочитать данные
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            
            console.log('Running inside Telegram WebApp. Initializing app...');
            try {
                
                // --- НАЧАЛО ИЗМЕНЕНИЙ: "РОУТЕР" ---
                const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
                
                if (startParam) {
                    console.log("Найден start_param на главной странице:", startParam);
                    
                    // Проверяем, для какого инструмента эта ссылка
                    if (startParam.startsWith('findModels_') || startParam.startsWith('findBgs_')) {
                        
                        // Это ссылка для твоего background-finder.
                        // Немедленно перенаправляем на него.
                        console.log("Перенаправление на /Monohrome/background-finder.html");
                        
                        // Мы просто переходим на нужный HTML.
                        // `background-finder.js` (на той странице) сам
                        // прочитает start_param и все настроит.
                        window.location.href = './Monohrome/background-finder.html';
                        
                        // Возвращаем false, чтобы остановить 
                        // выполнение дальнейшего кода (например, preloadGiftNames)
                        return false; 
                    }
                    // Сюда можно будет добавить `else if` для других ссылок
                }
                // --- КОНЕЦ ИЗМЕНЕНИЙ ---


                const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
                
                if (tgUser && tgUser.id) {
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
                    console.warn('tgUser object not found or has no ID, clearing cache.');
                }
            } catch (e) {
                console.error('Failed to save REAL user data to sessionStorage:', e);
                sessionStorage.removeItem(TG_USER_KEY);
            }

        } else {
            // Этот блок теперь для тестов ВНЕ Telegram
            console.log('Not in Telegram WebApp. Saving FAKE user data for testing.');
            try {
                // Проверяем, может, фейковые данные уже есть (чтобы не перезатирать)
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
        
        // Если редиректа не было, возвращаем true
        return true;
    };

    // 2. Функция предзагрузки названий (убираем из нее .ready())
    const preloadGiftNames = async () => {
        try {
            const cachedData = sessionStorage.getItem(CACHE_KEY);
            if (cachedData) {
                console.log('Gift names already in cache.');
                return;
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

    // --- Запуск ---
    // Сначала сохраняем данные и ПРОВЕРЯЕМ, нужен ли редирект
    const shouldContinue = saveUserData();
    
    // Если shouldContinue = true (редиректа нет), то запускаем предзагрузку
    if (shouldContinue) {
        preloadGiftNames();
    }
});
