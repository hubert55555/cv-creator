// Funkcjonalność edycji inline w CV
// Podwójne kliknięcie na element pozwala na edycję jego zawartości
(function() {
  'use strict';
  
  // Śledzenie czy były faktyczne zmiany w CV
  let hasUnsavedChanges = false;
  
  // Debouncing dla wywołań skalowania - aby uniknąć zbyt częstego skalowania
  let fitToPageTimeout = null;
  function requestFitToPage() {
    if (fitToPageTimeout) {
      clearTimeout(fitToPageTimeout);
    }
    // Skaluj tylko po 1 sekundzie od ostatniej zmiany (debouncing) - pozwala na wiele akcji bez częstego skalowania
    fitToPageTimeout = setTimeout(() => {
      if (window.cvFitToPage && typeof window.cvFitToPage === 'function') {
        window.cvFitToPage();
      }
      fitToPageTimeout = null;
    }, 1000);
  }

  // Elementy, które NIE powinny być edytowalne
  const nonEditableSelectors = [
    'script',
    'style',
    'meta',
    'title',
    'head',
    'html',
    'body',
    '.avatar img', // obrazy avatara
    '.underline', // elementy dekoracyjne
    '.rule', // linie dekoracyjne
    '[role="banner"]', // nagłówek strukturalny
    'aside', // cały sidebar jako jeden element
    'section', // sekcje jako kontenery
    'article' // artykuły jako kontenery
  ];

  // Czy element powinien być edytowalny
  function isEditable(element) {
    // Sprawdź czy element jest bezpośrednio na liście nieedytowalnych
    for (let selector of nonEditableSelectors) {
      if (element.matches && element.matches(selector)) {
        return false;
      }
    }
    
    // Elementy dekoracyjne bez zawartości tekstowej
    if (element.tagName === 'IMG' || element.tagName === 'BR' || element.tagName === 'HR') {
      return false;
    }
    
    // Jeśli element nie jest na liście wykluczonych i ma potencjalnie edytowalną zawartość,
    // pozwól na edycję (nawet jeśli jest w kontenerze typu section/article)
    return hasTextContent(element);
  }

  // Sprawdź czy element ma zawartość tekstową do edycji
  function hasTextContent(element) {
    // Pomiń elementy czysto dekoracyjne
    if (element.tagName === 'IMG' || element.tagName === 'BR' || element.tagName === 'HR') {
      return false;
    }
    
    // Sprawdź czy element ma tekst lub może go zawierać
    const text = element.textContent || element.innerText || '';
    const trimmedText = text.trim();
    
    // Jeśli to element kontenerowy z samymi elementami podrzędnymi bez własnego tekstu,
    // znajdź pierwszy potomek z tekstem
    if (trimmedText.length > 0) {
      return true;
    }
    
    // Sprawdź czy element może zawierać tekst (np. div, p, span, h1-h6, li)
    const textContainers = ['DIV', 'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'DT', 'DD', 'TD', 'TH', 'A'];
    if (textContainers.includes(element.tagName)) {
      return true;
    }
    
    return false;
  }

  // Znajdź najbliższy edytowalny element
  function findEditableElement(element) {
    // Jeśli kliknięto bezpośrednio w edytowalny element, użyj go
    if (isEditable(element)) {
      return element;
    }
    
    // Jeśli nie, szukaj w rodzicach (ale nie dalej niż 5 poziomów)
    let current = element.parentElement;
    let depth = 0;
    const maxDepth = 5;
    
    while (current && depth < maxDepth) {
      if (isEditable(current)) {
        return current;
      }
      current = current.parentElement;
      depth++;
    }
    
    return null;
  }

  // Ustaw edytowalność elementu
  function makeEditable(element) {
    // Zapisz oryginalną zawartość na wypadek anulowania
    if (!element.dataset.originalContent) {
      element.dataset.originalContent = element.innerHTML;
    }
    
    element.contentEditable = 'true';
    element.classList.add('editing');
    
    // Zaznacz całą zawartość
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Fokus na elemencie
    element.focus();
    
    // Zapobiegaj edycji struktury HTML (tylko tekst)
    element.addEventListener('keydown', handleKeydown);
    element.addEventListener('blur', handleBlur);
    element.addEventListener('paste', handlePaste);
    
    // Pokazuj powiadomienie o edycji
    showEditNotification(element);
  }

  // Obsługa klawiszy podczas edycji
  function handleKeydown(e) {
    // Enter - zakończ edycję
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishEditing(e.target);
    }
    
    // Escape - anuluj edycję
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // Zapobiegaj propagacji do globalnego listenera
      cancelEditing(e.target);
    }
    
    // Tab - zakończ edycję i pozwól na normalną nawigację
    if (e.key === 'Tab') {
      finishEditing(e.target);
    }
  }

  // Obsługa wklejania - usuń formatowanie
  function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  // Zakończ edycję
  function finishEditing(element) {
    element.contentEditable = 'false';
    element.classList.remove('editing');
    
    // Sprawdź czy zawartość się faktycznie zmieniła
    const originalContent = element.dataset.originalContent || '';
    const currentContent = element.innerHTML;
    const contentChanged = originalContent !== currentContent;
    
      if (contentChanged) {
        hasUnsavedChanges = true;
        showDownloadButton();
        
        // Automatyczne zapisywanie do localStorage (ciche, bez powiadomienia)
        try {
          const htmlContent = document.documentElement.outerHTML;
          localStorage.setItem('cv-edited-content', htmlContent);
        } catch (e) {
          console.warn('Nie można zapisać zmian:', e);
        }
        
        // Przeskaluj CV po zmianie zawartości tekstowej (może zmienić wysokość)
        // Użyj debouncing aby uniknąć zbyt częstego skalowania
        requestFitToPage();
      }
    
    // Usuń event listenery
    element.removeEventListener('keydown', handleKeydown);
    element.removeEventListener('blur', handleBlur);
    element.removeEventListener('paste', handlePaste);
    
    // Zapisz zmiany do localStorage (ciche zapisywanie przy każdej zmianie)
    try {
      const htmlContent = document.documentElement.outerHTML;
      localStorage.setItem('cv-edited-content', htmlContent);
    } catch (e) {
      console.warn('Nie można zapisać zmian:', e);
    }
    
    // Usuń oryginalną zawartość z dataset (już nie potrzebna)
    delete element.dataset.originalContent;
    
    // Ukryj powiadomienie
    hideEditNotification();
  }

  // Anuluj edycję
  function cancelEditing(element) {
    element.innerHTML = element.dataset.originalContent || element.innerHTML;
    element.contentEditable = 'false';
    element.classList.remove('editing');
    
    // Usuń event listenery
    element.removeEventListener('keydown', handleKeydown);
    element.removeEventListener('blur', handleBlur);
    element.removeEventListener('paste', handlePaste);
    
    // Usuń oryginalną zawartość z dataset (już nie potrzebna)
    delete element.dataset.originalContent;
    
    // Ukryj powiadomienie
    hideEditNotification();
    
    // Nie zmieniamy hasUnsavedChanges - anulowanie nie oznacza zmian
  }

  // Dezaktywuj wszystkie aktywne edycje
  function deactivateAllEdits() {
    const editingElements = document.querySelectorAll('.editing');
    editingElements.forEach(element => {
      // Jeśli element jest contentEditable, sprawdź czy były zmiany
      if (element.contentEditable === 'true') {
        const originalContent = element.dataset.originalContent || '';
        const currentContent = element.innerHTML;
        
        // Jeśli zawartość się zmieniła, zapisz; jeśli nie, anuluj
        if (originalContent !== currentContent) {
          finishEditing(element);
        } else {
          // Brak zmian - anuluj edycję
          cancelEditing(element);
        }
      } else {
        // Jeśli już nie jest edytowalny, po prostu usuń klasę
        element.classList.remove('editing');
        delete element.dataset.originalContent;
      }
    });
    
    // Ukryj powiadomienie
    hideEditNotification();
    
    // Usuń focus z wszystkich elementów
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  }

  // Obsługa utraty fokusa
  function handleBlur(e) {
    // Opóźnij, żeby pozwolić na kliknięcie w przyciski powiadomienia
    setTimeout(() => {
      if (document.activeElement !== e.target && !e.target.classList.contains('editing')) {
        // Sprawdź czy były faktyczne zmiany przed zapisaniem
        const originalContent = e.target.dataset.originalContent || '';
        const currentContent = e.target.innerHTML;
        
        if (originalContent !== currentContent) {
          // Były zmiany - zapisz
          finishEditing(e.target);
        } else {
          // Brak zmian - anuluj (bez pokazywania przycisku)
          cancelEditing(e.target);
        }
      }
    }, 100);
  }

  // Powiadomienie o edycji
  let notificationElement = null;

  function showEditNotification(element) {
    hideEditNotification();
    
    notificationElement = document.createElement('div');
    notificationElement.className = 'edit-notification';
    notificationElement.innerHTML = `
      <div class="edit-notification-content">
        <span>✏️ Edytujesz element. Naciśnij <kbd>Enter</kbd> aby zapisać, <kbd>Esc</kbd> aby anulować.</span>
        <button class="edit-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    document.body.appendChild(notificationElement);
    
    // Auto-ukryj po 5 sekundach
    setTimeout(() => {
      if (notificationElement && document.body.contains(notificationElement)) {
        notificationElement.classList.add('fade-out');
        setTimeout(() => hideEditNotification(), 300);
      }
    }, 5000);
  }

  function hideEditNotification() {
    if (notificationElement && document.body.contains(notificationElement)) {
      notificationElement.remove();
      notificationElement = null;
    }
  }

  // Zapisz zmiany do localStorage
  function saveChanges() {
    try {
      const htmlContent = document.documentElement.outerHTML;
      localStorage.setItem('cv-edited-content', htmlContent);
      
      // Pokaż informację o zapisaniu
      showSaveIndicator();
    } catch (e) {
      console.warn('Nie można zapisać zmian do localStorage:', e);
    }
  }

  // Wskaźnik zapisania
  function showSaveIndicator(message = '✓ Zmiany zapisane lokalnie') {
    const indicator = document.createElement('div');
    indicator.className = 'save-indicator';
    indicator.textContent = message;
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      indicator.classList.add('fade-out');
      setTimeout(() => indicator.remove(), 300);
    }, 3000);
  }

  // Załaduj zapisane zmiany (jeśli istnieją)
  function loadSavedChanges() {
    // Funkcja została wyłączona - komunikat o przywróceniu stanu został usunięty
    // Użytkownik może ręcznie przywrócić stan przez przycisk "Moje zapisy"
    return;
  }

  // Zapisz stan CV do localStorage z możliwością wielu wersji
  function saveCVState(saveName = null) {
    try {
      const htmlContent = document.documentElement.outerHTML;
      const timestamp = new Date().toISOString();
      const saveKey = saveName ? `cv-state-${saveName}` : `cv-state-${timestamp}`;
      
      // Pobierz listę istniejących zapisów
      const saves = getSavedStates();
      
      // Jeśli nie podano nazwy, użyj automatycznej nazwy z datą
      if (!saveName) {
        const dateStr = new Date().toLocaleString('pl-PL', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        saveName = `Zapis z ${dateStr}`;
      }
      
      // Zapisz stan
      const stateData = {
        html: htmlContent,
        timestamp: timestamp,
        name: saveName,
        key: saveKey
      };
      
      localStorage.setItem(saveKey, JSON.stringify(stateData));
      
      // Zaktualizuj listę zapisów
      saves[saveKey] = {
        timestamp: timestamp,
        name: saveName
      };
      localStorage.setItem('cv-saves-list', JSON.stringify(saves));
      
      // Zaktualizuj ostatni zapisany stan
      localStorage.setItem('cv-last-save', saveKey);
      
      showSaveIndicator(`✓ Stan zapisany: "${saveName}"`);
      updateSavesPanel();
      
      // Nie ukrywaj przycisku po zapisaniu - pozwól na kolejne zapisy
      // Przycisk jest teraz zawsze widoczny
      
      return true;
    } catch (e) {
      console.error('Błąd zapisywania stanu:', e);
      alert('Nie można zapisać stanu. Sprawdź czy localStorage jest dostępne.');
      return false;
    }
  }

  // Pobierz listę zapisanych stanów
  function getSavedStates() {
    try {
      const savesStr = localStorage.getItem('cv-saves-list');
      return savesStr ? JSON.parse(savesStr) : {};
    } catch (e) {
      return {};
    }
  }

  // Przywróć zapisany stan CV
  function restoreCVState(saveKey) {
    try {
      const stateDataStr = localStorage.getItem(saveKey);
      if (!stateDataStr) {
        alert('Nie znaleziono zapisanego stanu.');
        return false;
      }
      
      const stateData = JSON.parse(stateDataStr);
      
      if (confirm(`Czy na pewno chcesz przywrócić stan "${stateData.name}"? Obecne zmiany zostaną utracone.`)) {
        // Zastąp zawartość strony zapisanym HTML
        document.open();
        document.write(stateData.html);
        document.close();
        
        // Po document.write() wszystkie skrypty są ponownie wykonane, więc event listenery są już ustawione
        // Tylko musimy dodać przyciski funkcjonalne (które mogą nie być w zapisanym HTML)
        // Funkcja próbująca zainicjalizować z wieloma próbami
        function tryInitWithRetry(attempt = 0, maxAttempts = 15) {
          // Reset flagi aby umożliwić ponowną inicjalizację
          window.__cvInitCalled = false;
          if (document.body) {
            document.body.removeAttribute('data-cv-initialized');
          }
          
          // Sprawdź czy window.cvInit jest dostępne
          const hasCvInit = window.cvInit && typeof window.cvInit === 'function';
          
          if (hasCvInit) {
            try {
              // Wywołaj pełną inicjalizację z force=true aby pominąć sprawdzanie flagi
              // po document.write() wszystko jest świeże i trzeba dodać wszystkie listenery
              window.cvInit(true);
              showSaveIndicator(`✓ Przywrócono stan: "${stateData.name}"`);
              return;
            } catch (e) {
              console.error('Błąd cvInit, próba', attempt + 1, ':', e);
            }
          }
          
          // Jeśli nie udało się i są jeszcze próby, spróbuj ponownie
          if (attempt < maxAttempts) {
            setTimeout(() => tryInitWithRetry(attempt + 1, maxAttempts), 200);
          } else {
            console.error('Nie udało się zainicjalizować po przywróceniu stanu po', maxAttempts, 'próbach');
            showSaveIndicator(`✓ Przywrócono stan: "${stateData.name}"`);
          }
        }
        
        // Rozpocznij próby inicjalizacji - daj czas na wykonanie skryptów po document.write()
        setTimeout(() => tryInitWithRetry(), 500);
        
        return true;
      }
      return false;
    } catch (e) {
      console.error('Błąd przywracania stanu:', e);
      alert('Nie można przywrócić stanu. ' + e.message);
      return false;
    }
  }

  // Usuń zapisany stan
  function deleteCVState(saveKey) {
    try {
      const saves = getSavedStates();
      delete saves[saveKey];
      localStorage.removeItem(saveKey);
      localStorage.setItem('cv-saves-list', JSON.stringify(saves));
      
      // Jeśli usunięto ostatni zapis, wyczyść również
      const lastSave = localStorage.getItem('cv-last-save');
      if (lastSave === saveKey) {
        localStorage.removeItem('cv-last-save');
      }
      
      updateSavesPanel();
      showSaveIndicator('✓ Stan został usunięty');
      return true;
    } catch (e) {
      console.error('Błąd usuwania stanu:', e);
      return false;
    }
  }

  // Funkcja drukowania z automatycznym wyłączeniem edycji i skalowaniem
  function printCV() {
    // Dezaktywuj wszystkie aktywne edycje przed drukowaniem
    deactivateAllEdits();
    
    // Najpierw przeskaluj dokument - wywołaj bezpośrednio (bez debouncing)
    if (window.cvFitToPage && typeof window.cvFitToPage === 'function') {
      window.cvFitToPage();
    }
    
    // Poczekaj na zakończenie skalowania przed otwarciem okna druku
    // fitToPage() ma różne opóźnienia (10ms, 150ms, 500ms), więc dajemy więcej czasu
    setTimeout(() => {
      // Wywołaj dialog drukowania po przeskalowaniu
      window.print();
    }, 800);
  }

  // Dodaj przycisk zapisywania stanu do headera
  function addDownloadButton() {
    // Usuń istniejący przycisk jeśli jest (aby ponownie przypisać event listenery)
    const existingBtn = document.getElementById('cv-download-btn');
    if (existingBtn) {
      existingBtn.remove();
    }
    
    // Znajdź kontener przycisków w headerze
    const headerButtons = document.getElementById('editor-header-buttons');
    if (!headerButtons) {
      console.warn('Nie znaleziono kontenera przycisków w headerze');
      return;
    }
    
    const button = document.createElement('button');
    button.id = 'cv-download-btn';
    button.className = 'editor-header-btn editor-header-btn-secondary';
    button.innerHTML = '💾 Zapisz stan CV';
    button.title = 'Zapisz aktualny stan CV w przeglądarce (bez pobierania pliku)';
    button.onclick = () => {
      const saveName = prompt('Wprowadź nazwę dla tego zapisu (lub zostaw puste dla automatycznej):', '');
      if (saveName !== null) { // Sprawdź czy użytkownik nie anulował prompta
        saveCVState(saveName || null);
        // Po zapisaniu nie ukrywaj przycisku - pozwól na kolejne zapisy
        hasUnsavedChanges = false;
      }
    };
    headerButtons.appendChild(button);
    
    // Dodaj przycisk zarządzania zapisami
    addSavesManagerButton();
  }
  
  // Dodaj przycisk zarządzania zapisanymi stanami do headera
  function addSavesManagerButton() {
    // Usuń istniejący przycisk jeśli jest (aby ponownie przypisać event listenery)
    const existingBtn = document.getElementById('cv-saves-manager-btn');
    if (existingBtn) {
      existingBtn.remove();
    }
    
    // Znajdź kontener przycisków w headerze
    const headerButtons = document.getElementById('editor-header-buttons');
    if (!headerButtons) {
      console.warn('Nie znaleziono kontenera przycisków w headerze');
      return;
    }
    
    const button = document.createElement('button');
    button.id = 'cv-saves-manager-btn';
    button.className = 'editor-header-btn editor-header-btn-secondary';
    button.innerHTML = '📚 Moje zapisy';
    button.title = 'Zarządzaj zapisanymi stanami CV';
    button.onclick = toggleSavesPanel;
    headerButtons.appendChild(button);
    
    // Utwórz panel zapisów
    createSavesPanel();
  }
  
  // Utwórz panel zarządzania zapisami
  function createSavesPanel() {
    if (document.getElementById('cv-saves-panel')) {
      return;
    }
    
    const panel = document.createElement('div');
    panel.id = 'cv-saves-panel';
    panel.className = 'cv-saves-panel';
    panel.innerHTML = `
      <div class="cv-saves-panel-header">
        <h3>📚 Zapisane stany CV</h3>
        <button class="cv-saves-panel-close" onclick="this.closest('.cv-saves-panel').style.display='none'">×</button>
      </div>
      <div class="cv-saves-panel-content" id="cv-saves-list">
        <p style="text-align: center; color: #666; padding: 20px;">Ładowanie...</p>
      </div>
    `;
    panel.style.display = 'none';
    document.body.appendChild(panel);
    
    // Załaduj listę zapisów
    updateSavesPanel();
  }
  
  // Pokaż/ukryj panel zapisów
  function toggleSavesPanel() {
    const panel = document.getElementById('cv-saves-panel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      if (panel.style.display === 'block') {
        updateSavesPanel();
      }
    }
  }
  
  // Zaktualizuj panel zapisów
  function updateSavesPanel() {
    const listContainer = document.getElementById('cv-saves-list');
    if (!listContainer) return;
    
    const saves = getSavedStates();
    const saveKeys = Object.keys(saves).sort((a, b) => {
      return saves[b].timestamp.localeCompare(saves[a].timestamp);
    });
    
    if (saveKeys.length === 0) {
      listContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Brak zapisanych stanów.</p>';
      return;
    }
    
    let html = '<div class="cv-saves-list">';
    saveKeys.forEach(saveKey => {
      const save = saves[saveKey];
      const date = new Date(save.timestamp).toLocaleString('pl-PL');
      html += `
        <div class="cv-save-item">
          <div class="cv-save-item-info">
            <strong>${save.name || 'Bez nazwy'}</strong>
            <small>${date}</small>
          </div>
          <div class="cv-save-item-actions">
            <button class="cv-restore-btn" onclick="window.cvRestoreState('${saveKey}')" title="Przywróć ten stan">↻ Przywróć</button>
            <button class="cv-delete-btn-small" onclick="window.cvDeleteState('${saveKey}')" title="Usuń ten stan">🗑️</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    listContainer.innerHTML = html;
  }
  
  // Udostępnij funkcje globalnie
  window.cvRestoreState = restoreCVState;
  window.cvDeleteState = deleteCVState;
  window.cvInit = init;
  window.printCV = printCV;

  // Dodaj przycisk drukowania - NIE DODAWAJ, bo już jest w headerze
  function addPrintButton() {
    // Przycisk drukowania jest już w headerze template1.html, więc nie dodajemy go tutaj
    // Funkcja pozostaje dla kompatybilności, ale nie robi nic
  }

  // Pokaż przycisk pobierania - przyciski są zawsze widoczne w headerze
  function showDownloadButton() {
    // Przyciski w headerze są zawsze widoczne, nie trzeba nic robić
  }

  // Ukryj przycisk pobierania - przyciski są zawsze widoczne w headerze
  function hideDownloadButton() {
    // Przyciski w headerze są zawsze widoczne, nie trzeba nic robić
    hasUnsavedChanges = false;
  }

  // Inicjalizacja
  // Używamy window aby flaga była dostępna globalnie i mogła być resetowana po document.write()
  if (!window.__cvInitCalled) {
    window.__cvInitCalled = false;
  }
  
  function init(force = false) {
    // Jeśli force=true, usuń istniejące elementy i listenery przed ponowną inicjalizacją
    if (force) {
      // Usuń wszystkie przyciski funkcjonalne (oprócz tych w headerze)
      document.querySelectorAll('.cv-add-btn, .cv-delete-btn, .cv-delete-section-btn').forEach(el => el.remove());
      // Usuń style jeśli istnieją
      const existingStyle = document.querySelector('style[data-cv-inline-edit]');
      if (existingStyle) existingStyle.remove();
    }
    
    // Jeśli force=false, sprawdź czy init już był wywołany
    if (!force && window.__cvInitCalled && document.body && document.body.hasAttribute('data-cv-initialized')) {
      // Jeśli już był wywołany i strona nie jest świeża, tylko dodaj przyciski funkcjonalne
      addDownloadButton();
      addPrintButton();
      addAddButtons();
      return;
    }
    window.__cvInitCalled = true;
    
    // Załaduj zapisane zmiany
    loadSavedChanges();
    
    // Dodaj przycisk pobierania
    addDownloadButton();
    
    // Dodaj przycisk drukowania
    addPrintButton();
    
    // Dodaj przyciski dodawania/usuwania elementów
    addAddButtons();
    
    // Dodaj obsługę podwójnego kliknięcia na całej stronie
    document.addEventListener('dblclick', function(e) {
      // Nie obsługuj jeśli kliknięto w przyciski lub powiadomienie
      if (          e.target.closest('.editor-header') || 
          e.target.closest('.cv-saves-panel') ||
          e.target.closest('.cv-add-btn') ||
          e.target.closest('.cv-delete-btn') ||
          e.target.closest('.cv-delete-section-btn') ||
          e.target.closest('.edit-notification') ||
          e.target.classList.contains('editing')) {
        return;
      }
      
      const editableElement = findEditableElement(e.target);
      if (editableElement) {
        e.preventDefault();
        e.stopPropagation();
        makeEditable(editableElement);
      }
    });
    
    // Dezaktywuj edycje po kliknięciu w tło (body, ale nie w .page)
    document.addEventListener('click', function(e) {
      // Sprawdź czy kliknięto w tło (body lub element poza .page)
      const clickedElement = e.target;
      const isPageElement = clickedElement.closest('.page');
      const isButton = clickedElement.closest('.editor-header') || 
                       clickedElement.closest('.cv-saves-panel') ||
                       clickedElement.closest('.cv-add-btn') ||
                       clickedElement.closest('.cv-delete-btn') ||
                       clickedElement.closest('.cv-delete-section-btn') ||
                       clickedElement.closest('.edit-notification') ||
                       clickedElement.closest('.edit-notification-content');
      
      // Jeśli kliknięto w tło (nie w .page) i nie w przycisk/powiadomienie, dezaktywuj edycje
      if (!isPageElement && !isButton) {
        // Sprawdź czy to faktycznie tło (body lub html)
        if (clickedElement === document.body || 
            clickedElement === document.documentElement ||
            clickedElement.tagName === 'HTML' ||
            clickedElement.tagName === 'BODY') {
          deactivateAllEdits();
        }
      }
    });
    
    // Globalny listener na Esc - dezaktywuj wszystkie edycje (tylko gdy nie jesteśmy w trybie edycji)
    document.addEventListener('keydown', function(e) {
      // Jeśli naciśnięto Esc
      if (e.key === 'Escape') {
        const activeElement = document.activeElement;
        // Sprawdź czy są jakieś aktywne edycje (klasa .editing)
        const hasActiveEdits = document.querySelectorAll('.editing').length > 0;
        
        // Jeśli nie jesteśmy w trybie edycji (contentEditable !== 'true') ale są aktywne bordery
        if (hasActiveEdits && 
            (!activeElement || 
             activeElement === document.body || 
             activeElement === document.documentElement ||
             activeElement.contentEditable !== 'true')) {
          e.preventDefault();
          e.stopPropagation();
          deactivateAllEdits();
        }
      }
    });
    
    // Dodaj wizualne wskazówki (hover effect)
    const style = document.createElement('style');
    style.setAttribute('data-cv-inline-edit', 'true');
    style.textContent = `
      /* Wskaźnik, że element jest edytowalny */
      .cv-columns *:not(.editor-header):not(.editor-header *):not(.cv-add-btn):not(.cv-delete-btn):not(.cv-delete-section-btn):not(.edit-notification):not(.edit-notification *) {
        cursor: text;
        position: relative;
      }
      
      /* Elementy nieedytowalne */
      .avatar img,
      .underline,
      .rule,
      .editor-header,
      .editor-header *,
      .cv-add-btn,
      .cv-delete-btn,
      .cv-delete-section-btn,
      .edit-notification,
      .edit-notification * {
        cursor: default !important;
      }
      
      /* Hover effect - subtelna ramka */
      .cv-columns *:not(.editor-header):not(.editor-header *):not(.cv-add-btn):not(.cv-delete-btn):not(.cv-delete-section-btn):not(.edit-notification):not(.edit-notification *):hover {
        outline: 1px dashed rgba(0, 123, 255, 0.3);
        outline-offset: 2px;
      }
      
      /* Stan edycji */
      .editing {
        outline: 2px solid #007bff !important;
        outline-offset: 2px;
        background-color: rgba(0, 123, 255, 0.05) !important;
        border-radius: 2px;
      }
      
      /* Przyciski są teraz w headerze - nie potrzebują fixed positioning */
      
      /* Panel zarządzania zapisami */
      .cv-saves-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        z-index: 2000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .cv-saves-panel-header {
        padding: 20px;
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
      }
      
      .cv-saves-panel-header h3 {
        margin: 0;
        font-size: 18px;
        color: #333;
      }
      
      .cv-saves-panel-close {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
      }
      
      .cv-saves-panel-close:hover {
        background: #e9ecef;
        color: #333;
      }
      
      .cv-saves-panel-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }
      
      .cv-saves-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .cv-save-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        transition: all 0.2s;
      }
      
      .cv-save-item:hover {
        background: #e9ecef;
        border-color: #dee2e6;
      }
      
      .cv-save-item-info {
        flex: 1;
      }
      
      .cv-save-item-info strong {
        display: block;
        margin-bottom: 4px;
        color: #333;
      }
      
      .cv-save-item-info small {
        color: #666;
        font-size: 12px;
      }
      
      .cv-save-item-actions {
        display: flex;
        gap: 8px;
      }
      
      .cv-restore-btn {
        padding: 8px 16px;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s;
      }
      
      .cv-restore-btn:hover {
        background: #218838;
        transform: translateY(-1px);
      }
      
      .cv-delete-btn-small {
        padding: 8px 12px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
      }
      
      .cv-delete-btn-small:hover {
        background: #c82333;
        transform: translateY(-1px);
      }
      
      /* Przycisk drukowania */
      /* Przycisk drukowania jest w headerze - nie potrzebuje fixed positioning */
      
      /* Powiadomienie o edycji */
      .edit-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1001;
        animation: slideDown 0.3s ease;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translate(-50%, -20px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }
      
      .edit-notification.fade-out {
        animation: fadeOut 0.3s ease forwards;
      }
      
      @keyframes fadeOut {
        to {
          opacity: 0;
          transform: translate(-50%, -20px);
        }
      }
      
      .edit-notification-content {
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
      }
      
      .edit-notification-content kbd {
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 12px;
      }
      
      .edit-notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
      }
      
      .edit-notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      /* Wskaźnik zapisania */
      .save-indicator {
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 10px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        z-index: 1000;
        font-size: 13px;
        animation: slideUp 0.3s ease;
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .save-indicator.fade-out {
        animation: fadeOutUp 0.3s ease forwards;
      }
      
      @keyframes fadeOutUp {
        to {
          opacity: 0;
          transform: translateY(-10px);
        }
      }
      
      /* Przyciski dodawania elementów */
      .cv-add-btn {
        margin-top: 8px;
        padding: 8px 16px;
        background: #17a2b8;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .cv-add-btn:hover {
        background: #138496;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }
      
      .cv-add-btn:active {
        transform: translateY(0);
      }
      
      .cv-add-side-btn {
        margin-left: 8px;
        padding: 2px 8px;
        font-size: 16px;
        vertical-align: middle;
        display: inline-block;
      }
      
      /* Przyciski usuwania elementów */
      .cv-delete-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        padding: 0;
        background: rgba(220, 53, 69, 0.9);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 12px;
        line-height: 24px;
        text-align: center;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .cv-delete-btn:hover {
        background: #dc3545;
        opacity: 1 !important;
      }
      
      /* Pokaż przycisk usuwania przy najechaniu na element */
      .timeline-item:hover .cv-delete-btn,
      .ref-card:hover .cv-delete-btn,
      .side-list > div:hover .cv-delete-btn {
        opacity: 0.7;
      }
      
      .cv-delete-btn:active {
        transform: scale(0.95);
      }
      
      /* Przycisk usuwania sekcji */
      .cv-delete-section-btn {
        display: inline-block;
        margin-left: 8px;
        width: 20px;
        height: 20px;
        padding: 0;
        background: rgba(220, 53, 69, 0.8);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 11px;
        line-height: 20px;
        text-align: center;
        vertical-align: middle;
        opacity: 0.6;
        transition: all 0.2s ease;
        z-index: 10;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      
      .cv-delete-section-btn:hover {
        background: #dc3545;
        opacity: 1 !important;
        transform: scale(1.1);
      }
      
      .cv-delete-section-btn:active {
        transform: scale(0.95);
      }
      
      /* Pokaż przycisk usuwania sekcji przy najechaniu na tytuł */
      .side-title:hover .cv-delete-section-btn,
      .section .title:hover .cv-delete-section-btn {
        opacity: 0.8;
      }
      
      /* Poprawki dla nowo dodanych elementów */
      /* Wyłącz domyślne bullet points listy w timeline-item (CSS tworzy własne przez ::before) */
      .timeline ul,
      .timeline-item ul,
      article.timeline-item ul {
        list-style: none !important;
        list-style-type: none !important;
      }
      
      .timeline-item ul li {
        list-style: none !important;
        list-style-type: none !important;
      }
      
      /* Upewnij się, że ref-card ma tylko jedną linię z CSS (bez dodatkowych borderów) */
      .references .ref-card,
      div.ref-card {
        border-top: 3px solid var(--c-accent-2) !important;
        border-bottom: none !important;
        border-left: none !important;
        border-right: none !important;
        border-width: 3px 0 0 0 !important;
      }
      
      /* Pozwól na przewijanie gdy zawartość wychodzi poza stronę A4 w trybie edycji */
      @media screen {
        .page {
          overflow-y: visible !important;
          overflow-x: hidden !important;
          min-height: var(--page-height) !important;
          height: auto !important;
        }
        
        /* Zmień referencje na jedną kolumnę gdy jest za dużo elementów, aby były widoczne */
        .references {
          max-height: none !important;
          overflow: visible !important;
        }
        
        /* Ostrzeżenia o przepełnieniu */
        .cv-page-warning {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(255, 193, 7, 0.15);
          border-bottom: 2px solid #ffc107;
          padding: 8px 12px;
          z-index: 100;
          font-size: 12px;
          color: #856404;
        }
        
        .cv-page-warning-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .cv-section-warning {
          background: rgba(255, 193, 7, 0.1);
          border-left: 3px solid #ffc107;
          padding: 6px 10px;
          margin: 4px 0;
          font-size: 11px;
          color: #856404;
          border-radius: 3px;
          transition: opacity 0.3s ease;
        }
      }
      
      /* Ukryj przyciski i ostrzeżenia podczas drukowania */
      @media print {
        .editor-header,
        .cv-saves-panel,
        .cv-add-btn,
        .cv-delete-btn,
        .cv-delete-section-btn,
        .edit-notification,
        .save-indicator,
        .cv-page-warning,
        .cv-section-warning {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Oznacz że inicjalizacja została wykonana
    if (document.body) {
      document.body.setAttribute('data-cv-initialized', 'true');
    }
  }

  // ==================== FUNKCJE DODAWANIA ELEMENTÓW ====================
  
  // Szablony dla nowych elementów (bez zewnętrznych kontenerów - są dodawane przez funkcje)
  const templates = {
    timelineItem: `
        <div class="meta"><div><strong>Nowa firma</strong><br />Nowe stanowisko</div><div>2024</div></div>
        <ul>
          <li>Opis obowiązków 1</li>
          <li>Opis obowiązków 2</li>
        </ul>
    `,
    refCard: `
        <div class="name">Nowy projekt</div>
        <div class="small">Opis projektu</div>
    `,
    sideListItem: `<div>Nowy element</div>`,
    educationItem: `
      <div>
        <strong>2024 – 2025</strong><br />
        Nowa szkoła<br />
        Opis
      </div>
    `
  };

  // Dodaj nowy element doświadczenia (timeline-item)
  function addTimelineItem(container) {
    const newItem = document.createElement('article');
    newItem.className = 'timeline-item';
    newItem.innerHTML = templates.timelineItem.trim();
    
    // Dodaj przycisk usuwania do całego timeline-item
    addDeleteButton(newItem);
    
    // Dodaj przyciski usuwania do wszystkich <li> w <ul>
    const listItems = newItem.querySelectorAll('ul li');
    listItems.forEach(li => {
      addDeleteButtonToListItem(li);
    });
    
    // Dodaj przycisk dodawania nowych <li> do listy <ul>
    const ul = newItem.querySelector('ul');
    if (ul) {
      const addBtn = document.createElement('button');
      addBtn.className = 'cv-add-btn cv-add-li-btn';
      addBtn.innerHTML = '+ Dodaj punkt';
      addBtn.title = 'Dodaj nowy punkt do listy';
      addBtn.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        addListItem(ul);
      };
      // Dodaj przycisk po liście
      ul.style.position = 'relative';
      ul.parentElement.insertBefore(addBtn, ul.nextSibling);
    }
    
    container.appendChild(newItem);
    
    // Sprawdź czy zawartość nie wychodzi poza stronę i dostosuj układ
    checkAndAdjustLayout(container);
    
    // Przeskaluj CV po dodaniu elementu (z debouncing)
    requestFitToPage();
    
    // Oznacz jako zmienione
    hasUnsavedChanges = true;
    showDownloadButton();
    
    // Automatycznie włącz edycję pierwszego elementu
    const firstElement = newItem.querySelector('strong');
    if (firstElement) {
      setTimeout(() => makeEditable(firstElement.parentElement), 100);
    }
  }

  // Dodaj nowy projekt/referencję (ref-card)
  function addRefCard(container) {
    const newCard = document.createElement('div');
    newCard.className = 'ref-card';
    newCard.innerHTML = templates.refCard.trim();
    
    // Dodaj przycisk usuwania
    addDeleteButton(newCard);
    
    container.appendChild(newCard);
    
    // Sprawdź czy zawartość nie wychodzi poza stronę i dostosuj układ
    checkAndAdjustLayout(container);
    
    // Przeskaluj CV po dodaniu elementu (z debouncing)
    requestFitToPage();
    
    // Oznacz jako zmienione
    hasUnsavedChanges = true;
    showDownloadButton();
    
    // Automatycznie włącz edycję nazwy projektu
    const nameElement = newCard.querySelector('.name');
    if (nameElement) {
      setTimeout(() => makeEditable(nameElement), 100);
    }
  }

  // Sprawdź i dostosuj układ gdy zawartość wychodzi poza stronę
  function checkAndAdjustLayout(element) {
    // Poczekaj na przełączenie layoutu
    setTimeout(() => {
      const page = element.closest('.page');
      if (!page) return;
      
      // Jeśli to sekcja referencji, sprawdź czy nie ma za dużo elementów
      const references = element.closest('.references');
      if (references) {
        const refCards = references.querySelectorAll('.ref-card');
        const refCardsCount = refCards.length;
        
        // Jeśli jest więcej niż 6 projektów, przełącz na jedną kolumnę dla lepszej czytelności
        if (refCardsCount > 6) {
          references.style.gridTemplateColumns = '1fr';
        } else if (refCardsCount > 4) {
          // Ostrzeżenie wizualne - żółte tło
          const section = references.closest('.section');
          if (section && !section.dataset.warningShown) {
            showLayoutWarning(section, 'Dużo projektów - rozważ usunięcie niektórych lub utworzenie osobnej strony');
            section.dataset.warningShown = 'true';
          }
        }
      }
      
      // Jeśli to sekcja timeline (doświadczenie), sprawdź czy nie ma za dużo elementów
      const timeline = element.closest('.timeline');
      if (timeline) {
        const timelineItems = timeline.querySelectorAll('.timeline-item');
        const timelineItemsCount = timelineItems.length;
        
        // Jeśli jest więcej niż 4 doświadczenia, pokaż ostrzeżenie
        if (timelineItemsCount > 4) {
          const section = timeline.closest('.section');
          if (section && !section.dataset.warningShown) {
            showLayoutWarning(section, 'Dużo doświadczeń - rozważ usunięcie niektórych lub utworzenie osobnej strony');
            section.dataset.warningShown = 'true';
          }
        }
      }
      
      // Sprawdź wysokość zawartości strony
      const cvColumns = page.querySelector('.cv-columns');
      if (cvColumns) {
        const pageHeight = parseFloat(getComputedStyle(page).getPropertyValue('--page-height').replace('mm', '')) * 3.779527559; // mm to px
        const contentHeight = cvColumns.scrollHeight;
        
        // Jeśli zawartość jest znacznie większa niż strona, pokaż ostrzeżenie
        if (contentHeight > pageHeight * 1.3) {
          const warning = page.querySelector('.cv-page-warning');
          if (!warning) {
            showPageOverflowWarning(page);
          }
        } else {
          // Usuń ostrzeżenie jeśli zawartość zmieściła się
          const warning = page.querySelector('.cv-page-warning');
          if (warning) {
            warning.remove();
          }
        }
      }
    }, 100);
  }

  // Pokaż ostrzeżenie o przepełnieniu strony
  function showPageOverflowWarning(page) {
    const warning = document.createElement('div');
    warning.className = 'cv-page-warning';
    warning.innerHTML = `
      <div class="cv-page-warning-content">
        <span>⚠️ Zawartość przekracza rozmiar strony A4. Wszystkie elementy są widoczne i edytowalne podczas edycji, ale przy druku część może zostać przycięta. Rozważ usunięcie niektórych elementów lub utworzenie kolejnej strony.</span>
        <button onclick="this.parentElement.parentElement.remove()" style="margin-left: 8px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: none; border-radius: 4px; color: inherit; cursor: pointer;">✕</button>
      </div>
    `;
    page.insertBefore(warning, page.firstChild);
  }

  // Pokaż ostrzeżenie o układzie dla sekcji
  function showLayoutWarning(section, message) {
    const warning = document.createElement('div');
    warning.className = 'cv-section-warning';
    warning.textContent = message;
    const rule = section.querySelector('.rule');
    if (rule) {
      rule.insertAdjacentElement('afterend', warning);
    } else {
      section.insertBefore(warning, section.firstChild);
    }
    
    // Auto-usuń po 5 sekundach
    setTimeout(() => {
      if (warning.parentElement) {
        warning.style.opacity = '0';
        setTimeout(() => warning.remove(), 300);
      }
    }, 5000);
  }

  // Dodaj nowy element do listy w sidebarze (umiejętności, języki)
  function addSideListItem(container) {
    const newItem = document.createElement('div');
    newItem.innerHTML = templates.sideListItem.trim();
    
    // Dodaj przycisk usuwania
    addDeleteButton(newItem);
    
    container.appendChild(newItem);
    
    // Przeskaluj CV po dodaniu elementu (z debouncing)
    requestFitToPage();
    
    // Oznacz jako zmienione
    hasUnsavedChanges = true;
    showDownloadButton();
    
    // Automatycznie włącz edycję
    setTimeout(() => makeEditable(newItem), 100);
  }

  // Dodaj nowy element edukacji w sidebarze
  function addEducationItem(container) {
    const newItem = document.createElement('div');
    newItem.innerHTML = templates.educationItem.trim();
    
    // Dodaj przycisk usuwania
    addDeleteButton(newItem);
    
    container.appendChild(newItem);
    
    // Przeskaluj CV po dodaniu elementu (z debouncing)
    requestFitToPage();
    
    // Oznacz jako zmienione
    hasUnsavedChanges = true;
    showDownloadButton();
    
    // Automatycznie włącz edycję
    setTimeout(() => makeEditable(newItem), 100);
  }

  // Dodaj przycisk usuwania do elementu
  function addDeleteButton(element) {
    // Sprawdź czy przycisk już istnieje
    if (element.querySelector('.cv-delete-btn')) {
      return;
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'cv-delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Usuń element';
    deleteBtn.onclick = function(e) {
      e.stopPropagation();
      e.preventDefault();
      if (confirm('Czy na pewno chcesz usunąć ten element?')) {
        const container = element.parentElement;
        element.remove();
        
        // Sprawdź i dostosuj układ po usunięciu
        if (container) {
          checkAndAdjustLayout(container);
        }
        
        hasUnsavedChanges = true;
        showDownloadButton();
        saveChanges();
        
        // Przeskaluj CV po usunięciu elementu (z debouncing)
        requestFitToPage();
      }
    };
    
    element.style.position = 'relative';
    element.appendChild(deleteBtn);
  }

  // Dodaj przycisk usuwania do pojedynczego elementu <li> w liście
  function addDeleteButtonToListItem(li) {
    // Sprawdź czy przycisk już istnieje
    if (li.querySelector('.cv-delete-btn')) {
      return;
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'cv-delete-btn cv-delete-li-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Usuń ten punkt z listy';
    deleteBtn.onclick = function(e) {
      e.stopPropagation();
      e.preventDefault();
      if (confirm('Czy na pewno chcesz usunąć ten punkt z listy?')) {
        const ul = li.parentElement;
        li.remove();
        
        // Jeśli lista jest teraz pusta, możemy pozostawić ją pustą lub usunąć
        // (zostawiamy pustą, użytkownik może dodać nowe elementy)
        
        // Sprawdź i dostosuj układ po usunięciu
        const timelineItem = ul.closest('.timeline-item');
        if (timelineItem) {
          checkAndAdjustLayout(timelineItem);
        }
        
        hasUnsavedChanges = true;
        showDownloadButton();
        saveChanges();
        
        // Przeskaluj CV po usunięciu elementu (z debouncing)
        requestFitToPage();
      }
    };
    
    li.style.position = 'relative';
    li.appendChild(deleteBtn);
  }

  // Dodaj nowy element <li> do istniejącej listy <ul>
  function addListItem(ul) {
    const newLi = document.createElement('li');
    newLi.textContent = 'Nowy punkt listy'; // Domyślna treść
    
    // Dodaj do listy
    ul.appendChild(newLi);
    
    // Dodaj przycisk usuwania do nowego elementu
    addDeleteButtonToListItem(newLi);
    
    // Automatycznie włącz edycję nowego elementu
    setTimeout(() => makeEditable(newLi), 100);
    
    // Oznacz jako zmienione
    hasUnsavedChanges = true;
    showDownloadButton();
    saveChanges();
    
    // Przeskaluj CV po dodaniu elementu (z debouncing)
    requestFitToPage();
  }

  // Dodaj przyciski dodawania do odpowiednich sekcji
  function addAddButtons() {
    // Przycisk dodawania doświadczenia
    const timelines = document.querySelectorAll('.timeline');
    timelines.forEach(timeline => {
      const section = timeline.closest('.section');
      if (!section || section.querySelector('.cv-add-timeline-btn')) {
        return;
      }
      
      const addBtn = document.createElement('button');
      addBtn.className = 'cv-add-btn cv-add-timeline-btn';
      addBtn.innerHTML = '+ Dodaj doświadczenie';
      addBtn.title = 'Dodaj nowe doświadczenie zawodowe';
      addBtn.onclick = () => addTimelineItem(timeline);
      
      // Dodaj przycisk na końcu sekcji timeline (po wszystkich itemach)
      timeline.parentNode.insertBefore(addBtn, timeline.nextSibling);
    });

    // Przycisk dodawania projektu
    const references = document.querySelectorAll('.references');
    references.forEach(refs => {
      if (!refs.parentElement.querySelector('.cv-add-ref-btn')) {
        const addBtn = document.createElement('button');
        addBtn.className = 'cv-add-btn cv-add-ref-btn';
        addBtn.innerHTML = '+ Dodaj projekt';
        addBtn.title = 'Dodaj nowy projekt';
        addBtn.onclick = () => addRefCard(refs);
        
        const section = refs.closest('.section');
        if (section) {
          section.appendChild(addBtn);
        }
      }
    });

    // Przyciski dodawania w sidebarze
    const sideSections = document.querySelectorAll('.side-section');
    sideSections.forEach(section => {
      const title = section.querySelector('.side-title');
      if (!title) return;
      
      const titleText = title.textContent.trim();
      const sideList = section.querySelector('.side-list');
      if (!sideList) return;
      
      // Sprawdź czy przyciski już istnieją
      if (section.querySelector('.cv-add-side-btn')) {
        // Sprawdź czy nie ma przycisku usuwania sekcji
        if (!section.querySelector('.cv-delete-section-btn')) {
          addSectionDeleteButton(section, title);
        }
        return;
      }
      
      const addBtn = document.createElement('button');
      addBtn.className = 'cv-add-btn cv-add-side-btn';
      addBtn.innerHTML = '+';
      addBtn.title = `Dodaj do ${titleText}`;
      
      // Różne akcje w zależności od sekcji
      if (titleText.toLowerCase().includes('edukacja') || titleText.toLowerCase().includes('education')) {
        addBtn.onclick = () => addEducationItem(sideList);
      } else {
        addBtn.onclick = () => addSideListItem(sideList);
      }
      
      // Dodaj przycisk przy tytule
      title.style.position = 'relative';
      title.appendChild(addBtn);
      
      // Dodaj przycisk usuwania sekcji
      addSectionDeleteButton(section, title);
    });

    // Dodaj przyciski usuwania do istniejących elementów
    document.querySelectorAll('.timeline-item, .ref-card').forEach(item => {
      if (!item.querySelector('.cv-delete-btn')) {
        addDeleteButton(item);
      }
    });
    
    // Dodaj przyciski usuwania do pojedynczych <li> w listach <ul> (np. w timeline-item)
    document.querySelectorAll('.timeline-item ul li, ul li').forEach(li => {
      // Sprawdź czy to li jest w timeline-item (główne listy doświadczeń) lub w innych listach CV
      // Pomiń jeśli to nie jest lista w CV (np. w innych kontekstach)
      const isInCV = li.closest('.page') || li.closest('.cv-columns');
      if (isInCV && !li.querySelector('.cv-delete-btn')) {
        addDeleteButtonToListItem(li);
      }
    });
    
    // Dodaj przyciski dodawania nowych <li> do list <ul> w timeline-item
    document.querySelectorAll('.timeline-item ul, .cv-columns ul').forEach(ul => {
      // Sprawdź czy lista jest w CV i czy przycisk nie istnieje już
      const isInCV = ul.closest('.page') || ul.closest('.cv-columns');
      if (isInCV && !ul.querySelector('.cv-add-li-btn')) {
        const addBtn = document.createElement('button');
        addBtn.className = 'cv-add-btn cv-add-li-btn';
        addBtn.innerHTML = '+ Dodaj punkt';
        addBtn.title = 'Dodaj nowy punkt do listy';
        addBtn.onclick = function(e) {
          e.stopPropagation();
          e.preventDefault();
          addListItem(ul);
        };
        
        // Dodaj przycisk po liście (przed zamknięciem kontenera)
        ul.style.position = 'relative';
        ul.parentElement.insertBefore(addBtn, ul.nextSibling);
      }
    });
    
    // Dodaj przyciski usuwania do elementów w side-list
    document.querySelectorAll('.side-list > div').forEach(item => {
      if (!item.querySelector('.cv-delete-btn')) {
        addDeleteButton(item);
      }
    });
    
    // Dodaj przyciski usuwania sekcji w głównej części (Profil, Doświadczenie, Projekty)
    const mainSections = document.querySelectorAll('.section');
    mainSections.forEach(section => {
      const title = section.querySelector('.title');
      if (title && !section.querySelector('.cv-delete-section-btn')) {
        addSectionDeleteButton(section, title);
      }
    });
  }

  // Dodaj przycisk usuwania sekcji
  function addSectionDeleteButton(section, titleElement) {
    // Sprawdź czy przycisk już istnieje
    if (section.querySelector('.cv-delete-section-btn')) {
      return;
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'cv-delete-section-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Usuń całą sekcję';
    
    deleteBtn.onclick = function(e) {
      e.stopPropagation();
      e.preventDefault();
      
      const sectionTitle = titleElement.textContent.trim() || 'tę sekcję';
      if (confirm(`Czy na pewno chcesz usunąć całą sekcję "${sectionTitle}" wraz z wszystkimi jej elementami?`)) {
        // Sprawdź kontener przed usunięciem (dla przeskalowania)
        const page = section.closest('.page');
        const container = section.parentElement;
        
        section.remove();
        
        // Sprawdź i dostosuj układ po usunięciu sekcji
        if (container) {
          checkAndAdjustLayout(container);
        }
        
        // Przeskaluj CV po usunięciu sekcji (z debouncing)
        requestFitToPage();
        
        hasUnsavedChanges = true;
        showDownloadButton();
        saveChanges();
      }
    };
    
    // Umieść przycisk przy tytule
    if (!titleElement.style.position || titleElement.style.position === 'static') {
      titleElement.style.position = 'relative';
    }
    titleElement.appendChild(deleteBtn);
  }

  // Uruchom po załadowaniu DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

