// Wspólny header dla całej aplikacji CV Creator
// Ten plik zawiera logikę i style dla headera, aby uniknąć duplikacji kodu

window.CVCreatorHeader = (function() {
    'use strict';

    // Style CSS dla headera
    const headerStyles = `
      :root {
        --gradient-start: #667eea;
        --gradient-end: #764ba2;
        --text-dark: #212529;
        --text-light: #6c757d;
        --bg-light: #f8f9fa;
        --white: #ffffff;
        --border-color: #e0e0e0;
      }

      /* Header styling - ukryty przy druku */
      .cv-creator-header {
        background: var(--white);
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        padding: 1.5rem 0;
        position: sticky;
        top: 0;
        z-index: 1000;
      }
      
      .cv-creator-header.fixed {
        position: fixed;
        left: 0;
        right: 0;
        padding: 1rem 0;
      }
      
      body.has-fixed-header {
        padding-top: 65px;
      }
      
      @media (max-width: 768px) {
        body.has-fixed-header {
          padding-top: 56px;
        }
        
        .cv-creator-header.fixed {
          padding: 0.7rem 0;
        }
      }

      @media (max-width: 480px) {
        body.has-fixed-header {
          padding-top: 50px;
        }
        
        .cv-creator-header.fixed {
          padding: 0.6rem 0;
        }
      }

      @media (max-width: 380px) {
        body.has-fixed-header {
          padding-top: 46px;
        }
        
        .cv-creator-header.fixed {
          padding: 0.5rem 0;
        }
      }

      @media (max-width: 320px) {
        body.has-fixed-header {
          padding-top: 42px;
        }
        
        .cv-creator-header.fixed {
          padding: 0.4rem 0;
        }
      }

      .cv-creator-header-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .cv-creator-logo {
        font-size: 1.8rem;
        font-weight: 700;
        background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-decoration: none;
        cursor: pointer;
        transition: opacity 0.2s ease;
        white-space: nowrap;
      }
      
      .cv-creator-logo:hover {
        opacity: 0.8;
      }

      .cv-creator-logo .logo-text {
        display: inline;
      }

      .cv-creator-logo .logo-icon {
        display: none;
      }

      .cv-creator-header-buttons {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .cv-creator-header-btn {
        padding: 0.6rem 1.5rem;
        font-size: 0.95rem;
        font-weight: 600;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        display: inline-block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      .cv-creator-header-btn-primary {
        background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
        color: var(--white);
      }

      .cv-creator-header-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .cv-creator-header-btn-secondary {
        background: var(--bg-light);
        color: var(--text-dark);
        border: 1px solid rgba(0,0,0,0.1);
      }

      .cv-creator-header-btn-secondary:hover {
        background: #e9ecef;
        transform: translateY(-2px);
      }

      /* Ukryj/pokaż etykiety w zależności od rozmiaru ekranu */
      .btn-label-short {
        display: none;
      }

      .btn-label-full {
        display: inline;
      }

      @media (max-width: 768px) {
        .cv-creator-header-container {
          padding: 0 1rem;
        }

        .cv-creator-header-buttons {
          gap: 0.5rem;
        }

        .cv-creator-header-btn {
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
        }
        
        .cv-creator-logo {
          font-size: 1.4rem;
        }
      }

      @media (max-width: 480px) {
        .cv-creator-header-container {
          padding: 0 0.5rem;
        }

        .cv-creator-header-buttons {
          gap: 0.3rem;
        }

        .cv-creator-header-btn {
          padding: 0.35rem 0.5rem;
          font-size: 0.7rem;
          white-space: nowrap;
          min-width: 0;
        }
        
        .cv-creator-logo {
          font-size: 1.1rem;
        }

        /* Przełącz na krótkie etykiety */
        .btn-label-full {
          display: none;
        }

        .btn-label-short {
          display: inline;
        }
      }

      @media (max-width: 380px) {
        .cv-creator-header-container {
          padding: 0 0.4rem;
        }

        .cv-creator-header-buttons {
          gap: 0.2rem;
        }

        .cv-creator-header-btn {
          padding: 0.3rem 0.4rem;
          font-size: 0.65rem;
          border-radius: 4px;
        }
        
        .cv-creator-logo {
          font-size: 1rem;
        }

        /* Przełącz na samo emoji */
        .cv-creator-logo .logo-text {
          display: none;
        }

        .cv-creator-logo .logo-icon {
          display: inline;
        }
      }

      @media (max-width: 320px) {
        .cv-creator-header-container {
          padding: 0 0.3rem;
        }

        .cv-creator-header-buttons {
          gap: 0.15rem;
        }

        .cv-creator-header-btn {
          padding: 0.25rem 0.35rem;
          font-size: 0.6rem;
          border-radius: 3px;
        }
        
        .cv-creator-logo {
          font-size: 1.4rem;
        }
      }

      @media print {
        .cv-creator-header {
          display: none !important;
        }
        
        body.has-fixed-header {
          padding: 0 !important;
        }
      }
    `;

    // Funkcja tworząca HTML headera
    function createHeaderHTML(options) {
        options = options || {};
        const logoHref = options.logoHref || 'index.html';
        const buttons = options.buttons || [];
        const isFixed = options.fixed !== false; // domyślnie fixed

        let buttonsHTML = '';
        buttons.forEach(function(btn) {
            const tag = btn.href ? 'a' : 'button';
            const hrefAttr = btn.href ? ' href="' + btn.href + '"' : '';
            const onclickAttr = btn.onclick ? ' onclick="' + btn.onclick + '"' : '';
            const typeAttr = !btn.href && !btn.onclick ? ' type="button"' : '';
            const btnClass = 'cv-creator-header-btn cv-creator-header-btn-' + (btn.type || 'secondary');
            
            // Obsługa skróconych etykiet na małych ekranach
            let labelHTML = btn.label;
            if (btn.shortLabel) {
                labelHTML = '<span class="btn-label-full">' + btn.label + '</span>' +
                           '<span class="btn-label-short">' + btn.shortLabel + '</span>';
            }
            
            buttonsHTML += '<' + tag + hrefAttr + onclickAttr + typeAttr + ' class="' + btnClass + '">' + 
                           labelHTML + '</' + tag + '>';
        });

        const fixedClass = isFixed ? ' fixed' : '';
        
        return '<header class="cv-creator-header' + fixedClass + '">' +
               '  <nav class="cv-creator-header-container">' +
               '    <a href="' + logoHref + '" class="cv-creator-logo">' +
               '      <span class="logo-text">📄 CV Creator</span>' +
               '      <span class="logo-icon">📄</span>' +
               '    </a>' +
               '    <div class="cv-creator-header-buttons">' +
               buttonsHTML +
               '    </div>' +
               '  </nav>' +
               '</header>';
    }

    // Funkcja zwracająca style
    function getHeaderStyles() {
        return headerStyles;
    }

    // Funkcja inicjalizująca header na stronie
    function initHeader(options) {
        options = options || {};
        
        // Dodaj style do head
        if (!document.getElementById('cv-creator-header-styles')) {
            var style = document.createElement('style');
            style.id = 'cv-creator-header-styles';
            style.textContent = headerStyles;
            document.head.appendChild(style);
        }
        
        // Utwórz i wstaw header
        var headerHTML = createHeaderHTML(options);
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = headerHTML;
        var headerElement = tempDiv.firstElementChild;
        
        // Wstaw header jako pierwszy element body
        if (document.body.firstChild) {
            document.body.insertBefore(headerElement, document.body.firstChild);
        } else {
            document.body.appendChild(headerElement);
        }
        
        // Dodaj klasę do body jeśli header jest fixed
        if (options.fixed !== false) {
            document.body.classList.add('has-fixed-header');
        }
    }

    // Funkcja do wstawienia headera i stylów do HTML string (dla blob)
    function injectHeaderIntoHTML(htmlString, options) {
        options = options || {};
        let processedHtml = htmlString;
        
        // Sprawdź czy już ma header
        if (processedHtml.includes('cv-creator-header')) {
            return processedHtml;
        }
        
        var headerHTML = createHeaderHTML(options);
        var styles = '<style>' + headerStyles + '</style>';
        
        // Dodaj dodatkowe style dla wrapper i body jeśli potrzebne
        var wrapperStyles = `
      body {
        background: linear-gradient(135deg, var(--bg-light) 0%, #e9ecef 100%);
        min-height: 100vh;
        padding-bottom: 2rem;
        margin: 0;
      }

      .cv-wrapper {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
      }
      
      @media print {
        .cv-wrapper {
          padding: 0 !important;
          margin: 0 !important;
          max-width: 100% !important;
        }
        
        body {
          padding: 0 !important;
          margin: 0 !important;
          background: #fff !important;
        }
      }`;
        
        styles += '<style>' + wrapperStyles + '</style>';
        
        // Dodaj style do <head>
        if (processedHtml.includes('</head>')) {
            processedHtml = processedHtml.replace('</head>', styles + '</head>');
        } else if (processedHtml.includes('<head>')) {
            processedHtml = processedHtml.replace('<head>', '<head>' + styles);
        } else {
            // Jeśli nie ma <head>, dodaj przed <body>
            var headSection = '<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>CV – Edytor</title>' + styles + '</head>';
            processedHtml = headSection + processedHtml;
        }
        
        // Dodaj wrapper div otwierający po headerze
        var headerWithWrapper = headerHTML + '\n    <div class="cv-wrapper">';
        
        // Dodaj header i wrapper przed zawartością body
        if (processedHtml.includes('<body>')) {
            // Znajdź zawartość body
            var bodyMatch = processedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
                var bodyContent = bodyMatch[1];
                // Sprawdź czy zawartość nie jest już w wrapperze
                if (!bodyContent.includes('cv-wrapper') && !bodyContent.includes('cv-creator-header')) {
                    processedHtml = processedHtml.replace(
                        /<body[^>]*>([\s\S]*?)<\/body>/i,
                        '<body>' + headerWithWrapper + bodyContent + '</div></body>'
                    );
                }
            } else {
                // Jeśli nie ma </body>, dodaj na końcu
                processedHtml = processedHtml.replace('<body>', '<body>' + headerWithWrapper);
                if (!processedHtml.includes('</body>')) {
                    processedHtml += '</div></body>';
                }
            }
        } else {
            // Jeśli nie ma <body>, opakuj całą zawartość
            processedHtml = '<body>' + headerWithWrapper + processedHtml + '</div></body>';
        }
        
        // Dodaj klasę do body dla fixed header
        if (options.fixed !== false) {
            processedHtml = processedHtml.replace(/<body([^>]*)>/i, '<body$1 class="has-fixed-header">');
        }
        
        return processedHtml;
    }

    // Eksportuj publiczne funkcje
    return {
        createHeaderHTML: createHeaderHTML,
        getHeaderStyles: getHeaderStyles,
        initHeader: initHeader,
        injectHeaderIntoHTML: injectHeaderIntoHTML
    };
})();

