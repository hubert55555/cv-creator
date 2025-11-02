// Automatyczne dopasowanie CV do jednej strony A4
// Ten skrypt automatycznie skaluje zawartość CV, aby mieściła się na jednej stronie A4
(function() {
  'use strict';
  
  // Zmienne do śledzenia stanu skalowania
  let lastContentHash = null;
  let lastWindowSize = null;
  let isScaling = false;
  
  function fitToPage() {
    // Zapobiegaj równoległym wywołaniom
    if (isScaling) {
      return;
    }
    
    const page = document.querySelector('.page');
    const cvColumns = document.querySelector('.cv-columns');
    const root = document.documentElement;
    
    if (!page || !cvColumns) {
      // Spróbuj ponownie za chwilę, jeśli elementy jeszcze nie istnieją
      if (document.readyState === 'loading') {
        setTimeout(fitToPage, 100);
      }
      return;
    }
    
    // Sprawdź czy zawartość się zmieniła (uproszczony hash)
    const currentContentHash = cvColumns.textContent.length + '-' + cvColumns.innerHTML.length;
    const currentWindowSize = window.innerWidth + 'x' + window.innerHeight;
    
    // Jeśli zawartość i rozmiar okna się nie zmieniły, pomiń skalowanie
    if (lastContentHash === currentContentHash && lastWindowSize === currentWindowSize) {
      // Sprawdź czy obecne skalowanie jest nadal poprawne
      const currentTransform = cvColumns.style.transform || '';
      const currentScaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
      const currentScale = currentScaleMatch ? parseFloat(currentScaleMatch[1]) : 1;
      
      // Jeśli już jest skalowanie, sprawdź czy nadal jest potrzebne
      if (currentScale < 1) {
        // Sprawdź szybko czy treść nadal się nie mieści
        const quickCheck = cvColumns.scrollHeight;
        const availableHeightPx = (297 - 12 - 15) * 3.779527559;
        if (quickCheck * currentScale <= availableHeightPx * 1.1) {
          // Skalowanie wydaje się być OK, nie przekształcaj ponownie
          return;
        }
      } else {
        // Brak skalowania, sprawdź szybko czy jest potrzebne
        const quickCheck = cvColumns.scrollHeight;
        const availableHeightPx = (297 - 12 - 15) * 3.779527559;
        if (quickCheck <= availableHeightPx * 1.1) {
          // Treść mieści się, nie trzeba skalać
          return;
        }
      }
    }
    
    // Zaktualizuj hash i rozmiar okna
    lastContentHash = currentContentHash;
    lastWindowSize = currentWindowSize;
    isScaling = true;
    
    // Funkcja konwersji mm na px (dokładna konwersja dla ekranu)
    function mmToPx(mm) {
      // 1mm = 3.779527559px przy 96 DPI
      return mm * 3.779527559;
    }
    
    // Oblicz dostępną wysokość (297mm - marginesy)
    const pageHeight = 297; // mm
    const marginTop = 12; // mm (z CSS: --page-margin-top)
    const marginBottom = 15; // mm (z CSS: --page-margin-bottom)
    const availableHeight = pageHeight - marginTop - marginBottom; // 270mm
    
    function checkAndScale() {
      // Najpierw resetuj skalowanie, aby zmierzyć rzeczywiste wymiary
      root.style.setProperty('--content-scale', '1');
      cvColumns.style.transform = '';
      
      // Ukryj przyciski dodawania/usuwania przed pomiarem (są ukrywane przy druku, więc nie powinny wpływać na skalowanie)
      const addButtons = page.querySelectorAll('.cv-add-btn, .cv-delete-btn, .cv-delete-section-btn');
      const addButtonsData = [];
      addButtons.forEach((btn) => {
        // Zapisz aktualny stan tylko jeśli ma inline style display
        const hasDisplay = btn.style.display !== '';
        addButtonsData.push({
          element: btn,
          originalDisplay: hasDisplay ? btn.style.display : null
        });
        // Ukryj przycisk (użyj inline style, aby mieć priorytet nad CSS)
        btn.style.display = 'none';
      });
      
      // Poczekaj na przełączenie layoutu (force reflow) - daj czas przeglądarce na przeliczenie
      void cvColumns.offsetHeight;
      // Dodatkowe małe opóźnienie, aby upewnić się że layout się zaktualizował
      setTimeout(() => {
        // Zmierz rzeczywistą wysokość zawartości (przed skalowaniem, bez przycisków)
        const contentHeight = cvColumns.scrollHeight;
        const contentWidth = cvColumns.scrollWidth;
        const availableHeightPx = mmToPx(availableHeight);
        const pageWidthPx = mmToPx(210);
        const marginSidesPx = mmToPx(12) * 2; // oba boki
        const maxWidthPx = pageWidthPx - marginSidesPx;
        
        // Oblicz potrzebną skalę dla wysokości i szerokości
        const heightScale = contentHeight > availableHeightPx 
          ? (availableHeightPx / contentHeight) * 0.98 // 2% zapasu
          : 1;
        
        const widthScale = contentWidth > maxWidthPx
          ? (maxWidthPx / contentWidth) * 0.98 // 2% zapasu
          : 1;
        
        // Użyj mniejszej skali, aby zmieścić się w obu wymiarach
        let finalScale = Math.min(heightScale, widthScale);
        
        // Minimalna skala - nie mniejsza niż 0.5 (50%)
        finalScale = Math.max(finalScale, 0.5);
        
        // Jeśli skalowanie jest potrzebne, zastosuj je
        if (finalScale < 1) {
          // Zastosuj skalowanie przez CSS variable (opcjonalnie)
          root.style.setProperty('--content-scale', finalScale);
          
          // Użyj transform scale dla lepszej kompatybilności i wydajności
          cvColumns.style.transform = `scale(${finalScale})`;
          cvColumns.style.transformOrigin = 'top left';
        } else {
          // Jeśli treść mieści się, usuń skalowanie
          root.style.setProperty('--content-scale', '1');
          cvColumns.style.transform = '';
        }
        
        // Przywróć widoczność przycisków
        addButtonsData.forEach(item => {
          if (item.originalDisplay !== null) {
            item.element.style.display = item.originalDisplay;
          } else {
            item.element.style.display = ''; // Usuń inline style, pozwól CSS działać
          }
        });
        
        // Zakończ skalowanie
        isScaling = false;
      }, 10);
    }
    
    // Poczekaj na pełne załadowanie wszystkich elementów (obrazy itp.)
    const images = page.querySelectorAll('img');
    let imagesLoaded = 0;
    const totalImages = images.length;
    
    if (totalImages > 0) {
      images.forEach(img => {
        if (img.complete) {
          imagesLoaded++;
        } else {
          img.onload = function() {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
              setTimeout(checkAndScale, 150);
            }
          };
          img.onerror = function() {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
              setTimeout(checkAndScale, 150);
            }
          };
        }
      });
      
      if (imagesLoaded === totalImages) {
        setTimeout(checkAndScale, 150);
      }
    } else {
      // Brak obrazów, sprawdź od razu
      setTimeout(checkAndScale, 150);
    }
    
    // Sprawdź ponownie po pełnym załadowaniu strony (tylko raz)
    if (document.readyState === 'complete') {
      setTimeout(checkAndScale, 500);
    } else {
      // Użyj once: true aby dodać listener tylko raz
      const loadHandler = function() {
        setTimeout(checkAndScale, 500);
        window.removeEventListener('load', loadHandler);
      };
      window.addEventListener('load', loadHandler);
    }
  }
  
  // Uruchom po załadowaniu DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fitToPage);
  } else {
    fitToPage();
  }
  
  // Ponowne sprawdzenie po zmianach rozmiaru okna (zwiększony debouncing)
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    // Zwiększ debouncing do 800ms, aby uniknąć zbyt częstego skalowania
    resizeTimeout = setTimeout(fitToPage, 800);
  });
  
  // Udostępnij funkcję globalnie, aby inne skrypty mogły ją wywołać
  window.cvFitToPage = fitToPage;
})();

