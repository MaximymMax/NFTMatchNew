const SERVER_BASE_URL = 'https://nftmatchbot20250730152328.azurewebsites.net/';
const API_PHOTO_MODEL_URL = 'https://cdn.changes.tg/gifts/models'; 
const API_SIMILAR_MODELS = '/api/MonoCoof/SimilarNFT'; 
const BYPASS_KEY_STORAGE = 'apiBypassKey';

export function initNftDetailsModal() {
    
    const modalOverlay = document.getElementById('nftDetailsModalOverlay');
    const closeBtn = document.getElementById('closeNftDetailsModalBtn');
    
    const modalTitle = document.getElementById('nftDetailsModalTitle');
    const targetModelPhotoContainer = document.getElementById('targetModelPhoto'); 
    const selectedModelPhotoContainer = document.getElementById('selectedModelPhoto'); 
    const similarModelsList = document.getElementById('similarModelsList');
    const listWrapper = document.getElementById('similarModelsListWrapper'); 

    let currentSimilarModels = [];
    let selectedModelName = null; 
    
    let targetGiftName = ''; 
    let targetModelName = ''; 
    let cardGiftName = '';
    let apiColors = [];

    function getApiAuthHeader() {
        try {
            const bypassKey = sessionStorage.getItem(BYPASS_KEY_STORAGE);
            if (bypassKey) return `Tma ${bypassKey}`;
        } catch (e) { }

        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
            return `Tma ${window.Telegram.WebApp.initData}`;
        }
        return '';
    }
    
    function formatPrice(price) {
        if (price === 0 || price === null || price === undefined) {
            return 'нет в продаже';
        }
        const formattedPrice = parseFloat(price).toFixed(2);
        const tonIcon = '<img src="./ton_symbol.png" alt="TON" class="ton-icon-small">'; 
        return `<span class="price-value">${formattedPrice}</span> ${tonIcon}`;
    }
    
    function updateScrollShadows() {
        if (!similarModelsList || !listWrapper) return;
        
        const isAtTop = similarModelsList.scrollTop === 0;
        const isAtBottom = similarModelsList.scrollHeight - similarModelsList.clientHeight <= similarModelsList.scrollTop + 1;
        
        const isScrollable = similarModelsList.scrollHeight > similarModelsList.clientHeight;

        listWrapper.classList.toggle('can-scroll-up', isScrollable && !isAtTop);
        listWrapper.classList.toggle('can-scroll-down', isScrollable && !isAtBottom);

        if (!isScrollable) {
            listWrapper.classList.remove('can-scroll-up', 'can-scroll-down');
        }
    }
    
    function updatePhotoContainers() {

        if (targetModelName && targetGiftName) {
            const targetUrl = `${API_PHOTO_MODEL_URL}/${encodeURIComponent(targetGiftName)}/png/${encodeURIComponent(targetModelName)}.png`;
            targetModelPhotoContainer.innerHTML = `<img src="${targetUrl}" alt="${targetModelName}" class="model-photo">`;
        } else {
            targetModelPhotoContainer.innerHTML = '<p class="placeholder-text">Нет целевой модели</p>';
        }
        
        const displayModelName = selectedModelName || (currentSimilarModels.length > 0 ? currentSimilarModels[0].name : null);
        
        if (displayModelName && cardGiftName) {
            const selectedUrl = `${API_PHOTO_MODEL_URL}/${encodeURIComponent(cardGiftName)}/png/${encodeURIComponent(displayModelName)}.png`;
            selectedModelPhotoContainer.innerHTML = `<img src="${selectedUrl}" alt="${displayModelName}" class="model-photo">`;
        } else {
            selectedModelPhotoContainer.innerHTML = '<p class="placeholder-text">Выберите модель</p>';
        }
    }
    
    function renderSimilarModelsList() {
        similarModelsList.innerHTML = '';
        
        if (currentSimilarModels.length === 0) {
            similarModelsList.innerHTML = '<p class="list-placeholder">Не удалось загрузить похожие модели для данного подарка.</p>';
            updatePhotoContainers();
            updateScrollShadows(); 
            return;
        }

        currentSimilarModels.slice(0, 6).forEach(model => {
            const modelName = model.name;
            const coefficient = (model.coof * 100).toFixed(2);
            const priceHtml = formatPrice(model.floorPrice);
            
            const photoUrl = `${API_PHOTO_MODEL_URL}/${encodeURIComponent(cardGiftName)}/png/${encodeURIComponent(modelName)}.png`;

            const modelItem = document.createElement('div');
            modelItem.className = 'model-item';
            modelItem.dataset.modelName = modelName;
            
            const modelToHighlight = selectedModelName || (currentSimilarModels.length > 0 ? currentSimilarModels[0].name : null);
            if (modelToHighlight === modelName) {
                 modelItem.classList.add('selected');
                 if (selectedModelName === null) {
                     selectedModelName = modelName;
                 }
            }

            modelItem.innerHTML = `
                <div class="model-photo-mini">
                    <img src="${photoUrl}" alt="${modelName}" class="model-photo-mini-img">
                </div>
                <div class="model-info">
                    <div class="model-name-coof">
                        <span class="model-name-text">${modelName}</span>
                        <span class="model-coof-text">${coefficient}%</span>
                    </div>
                    <div class="model-price">
                        ${priceHtml}
                    </div>
                </div>
            `;
            
            modelItem.addEventListener('click', (e) => {
                e.stopPropagation();
                
                document.querySelectorAll('.model-item').forEach(item => item.classList.remove('selected'));
                modelItem.classList.add('selected');
                
                selectedModelName = modelName;
                updatePhotoContainers(); 
            });

            similarModelsList.appendChild(modelItem);
        });
        
        updatePhotoContainers();
        
        setTimeout(updateScrollShadows, 50);
    }

    async function fetchSimilarModels() {
        similarModelsList.innerHTML = '<div class="list-loading"><span class="spinner-small"></span> Загрузка моделей...</div>';
        
        try {
            const requestBody = {
                "Colors": apiColors, 
                "NameTargetGift": null,
                "NameTargetModel": null,
                "NameGift": cardGiftName, 
                "MonohromeModelsOnly": true 
            };
            
            const authHeader = getApiAuthHeader();
            
            const response = await fetch(`${SERVER_BASE_URL}${API_SIMILAR_MODELS}?top=10`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': authHeader // <--- Ключ/InitData здесь
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
            }

            const data = await response.json(); 

            console.log('Похожие модели загружены:', data);
            
            currentSimilarModels = data.map(item => ({
                name: item.Name,
                coof: item.Coof,
                floorPrice: item.FloorPrice
            }));
            
            selectedModelName = null;
            
            renderSimilarModelsList();
            
        } catch (error) {
            console.error('Ошибка при загрузке похожих моделей:', error);
            similarModelsList.innerHTML = `<p class="list-placeholder">Ошибка загрузки: ${error.message}</p>`;
            updatePhotoContainers(); 
            updateScrollShadows(); 
        }
    }

    function openNftDetailsModal(giftNameFromCard, targetGiftNameFromMain, targetModelNameFromMain, colors) {
        if (!giftNameFromCard || !targetGiftNameFromMain || !targetModelNameFromMain) {
             console.error("Не все необходимые данные указаны для модального окна.");
             return;
        }
        modalTitle.textContent = giftNameFromCard;

        
        cardGiftName = giftNameFromCard; 
        targetGiftName = targetGiftNameFromMain; 
        targetModelName = targetModelNameFromMain; 
        apiColors = colors || []; 

        selectedModelName = null; 
        currentSimilarModels = []; 

        modalOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; 
        
        if (similarModelsList) {
             similarModelsList.addEventListener('scroll', updateScrollShadows);
        }
        
        updateScrollShadows(); 
        updatePhotoContainers(); 
        
        fetchSimilarModels();
    }
    
    function closeNftDetailsModal() {
        modalOverlay.classList.add('hidden');
        document.body.style.overflow = ''; 
        
        if (similarModelsList) {
            similarModelsList.removeEventListener('scroll', updateScrollShadows);
        }
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeNftDetailsModal);
    }
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeNftDetailsModal();
            }
        });
    }

    return {
        openNftDetailsModal: openNftDetailsModal,
        closeNftDetailsModal: closeNftDetailsModal
    };
}

