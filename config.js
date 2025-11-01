// Configuration file for API settings
// Tokeny API są w .env (tylko na serwerze)

const config = {
  // AI API Configuration
  // Dostępne providery: 'gemini', 'huggingFace'
  
  provider: 'gemini', // Domyślnie Gemini
  
  // Google Gemini (darmowy tier)
  gemini: {
    modelName: 'gemini-2.0-flash-exp', // lub 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models' // URL będzie budowany dynamicznie z modelName
  },
  
  // Hugging Face
  huggingFace: {
    modelName: 'deepseek-ai/DeepSeek-R1:novita',
    apiUrl: 'https://router.huggingface.co/v1/chat/completions'
  },
  
  // Domyślny klucz promptu używany w przypadku braku wyboru w UI
  defaultPromptKey: 'verbose',

  // CV Generation Prompt (legacy) – teraz jako getter używający getFullPrompt
  get cvPrompt() {
    if (this.getFullPrompt) {
      return this.getFullPrompt(this.defaultPromptKey || 'verbose');
    }
    // Fallback dla kompatybilności wstecznej
    const key = this.defaultPromptKey || 'verbose';
    const p = this.prompts && this.prompts[key];
    return (p && p.text) || (p && p.specificInstructions) || '';
  },

  // Domyślny motyw
  defaultTheme: 'modernBlue',

  // Szablony HTML dla różnych motywów
  templates: {
    modernBlue: `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CV – Szablon A4 (Export do PDF)</title>
    <link rel="stylesheet" href="cv-scaling.css" />
    <link rel="stylesheet" href="style.css" />
    <script src="cv-auto-fit.js"></script>
    <script src="cv-inline-edit.js"></script>
  </head>
  <body>
    <!--
      Instrukcja użycia (skrót):
      - Duplikuj <section class="page">, aby tworzyć kolejne strony A4.
      - Wypełniaj sekcje: .cv-header, .cv-sidebar, .cv-main, .cv-footer.
      - Używaj klas .avoid-break dla bloków, których nie chcesz dzielić między strony,
        oraz .page-break do ręcznego wymuszenia nowej strony.
      - Cały wygląd/typografia będą dopracowane później – tutaj tylko struktura i rozmiar A4.
    -->

    <section class="page" role="document" aria-label="Strona CV A4">
      <div class="cv-columns" role="main">
        <aside class="cv-sidebar" aria-label="Panel boczny">
          <div class="avatar">
            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop" alt="Zdjęcie profilowe" />
          </div>

          <section class="side-section">
            <h3 class="side-title">Contact</h3>
            <div class="side-list">
              <div>+123-456-7890</div>
              <div>hello@reallygreatsite.com</div>
              <div>123 Anywhere St., Any City</div>
              <div>www.reallygreatsite.com</div>
            </div>
          </section>

          <section class="side-section">
            <h3 class="side-title">Education</h3>
            <div class="side-list">
              <div>
                <strong>2029 – 2030</strong><br />
                Wardiere University<br />
                Master of Business Management
              </div>
              <div>
                <strong>2025 – 2029</strong><br />
                Wardiere University<br />
                Bachelor of Business<br />
                GPA: 3.8 / 4.0
              </div>
            </div>
          </section>

          <section class="side-section">
            <h3 class="side-title">Skills</h3>
            <div class="side-list">
              <div>Project Management</div>
              <div>Public Relations</div>
              <div>Teamwork</div>
              <div>Time Management</div>
              <div>Leadership</div>
              <div>Effective Communication</div>
              <div>Critical Thinking</div>
            </div>
          </section>

          <section class="side-section">
            <h3 class="side-title">Languages</h3>
            <div class="side-list">
              <div>English (Fluent)</div>
              <div>French (Fluent)</div>
              <div>German (Basics)</div>
              <div>Spanish (Intermediate)</div>
            </div>
          </section>
        </aside>

        <main class="cv-main" aria-label="Treść główna">
          <header class="name-title" role="banner" aria-label="Nagłówek CV">
            <h1><span class="light">RICHARD</span> SANCHEZ</h1>
            <div class="role">MARKETING MANAGER</div>
            <div class="underline"></div>
          </header>

          <section class="section">
            <div class="title">Profile</div>
            <div class="rule"></div>
            <p class="text">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation.</p>
          </section>

          <section class="section">
            <div class="title">Work Experience</div>
            <div class="rule"></div>
            <div class="timeline">
              <article class="timeline-item">
                <div class="meta"><div><strong>Borcelle Studio</strong><br />Marketing Manager & Specialist</div><div>2030 – PRESENT</div></div>
                <ul>
                  <li>Develop and execute comprehensive marketing strategies and campaigns.</li>
                  <li>Lead and mentor a high-performing marketing team.</li>
                  <li>Monitor brand consistency across channels and materials.</li>
                </ul>
              </article>
              <article class="timeline-item">
                <div class="meta"><div><strong>Fauget Studio</strong><br />Marketing Manager & Specialist</div><div>2025 – 2029</div></div>
                <ul>
                  <li>Create and manage the marketing budget, ensuring efficient allocation.</li>
                  <li>Oversee market research to identify trends and strategies.</li>
                  <li>Monitor brand consistency across channels and materials.</li>
                </ul>
              </article>
              <article class="timeline-item">
                <div class="meta"><div><strong>Studio Shodwe</strong><br />Marketing Manager & Specialist</div><div>2024 – 2025</div></div>
                <ul>
                  <li>Develop and maintain strong relationships with partners and vendors.</li>
                  <li>Support marketing initiatives and maintain branding standards.</li>
                </ul>
              </article>
            </div>
          </section>

          <section class="section">
            <div class="title">Reference</div>
            <div class="rule"></div>
            <div class="references">
              <div class="ref-card">
                <div class="name">Estelle Darcy</div>
                <div class="small">Wardiere Inc. / CTO</div>
                <div class="small">Phone: 123-456-7890</div>
                <div class="small">Email: hello@reallygreatsite.com</div>
              </div>
              <div class="ref-card">
                <div class="name">Harper Richard</div>
                <div class="small">Wardiere Inc. / CEO</div>
                <div class="small">Phone: 123-456-7890</div>
                <div class="small">Email: hello@reallygreatsite.com</div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </section>
  </body>
  </html>`,
    classic: `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CV – Szablon A4 (Export do PDF)</title>
    <link rel="stylesheet" href="cv-scaling.css" />
    <link rel="stylesheet" href="style1.css" />
    <script src="cv-auto-fit.js"></script>
    <script src="cv-inline-edit.js"></script>
  </head>
  <body>
    <!--
      Instrukcja użycia (skrót):
      - Duplikuj <section class="page">, aby tworzyć kolejne strony A4.
      - Wypełniaj sekcje: .cv-header, .cv-sidebar, .cv-main, .cv-footer.
      - Używaj klas .avoid-break dla bloków, których nie chcesz dzielić między strony,
        oraz .page-break do ręcznego wymuszenia nowej strony.
      - Cały wygląd/typografia będą dopracowane później – tutaj tylko struktura i rozmiar A4.
    -->

    <section class="page" role="document" aria-label="Strona CV A4">
      <div class="cv-columns" role="main">
        <aside class="cv-sidebar" aria-label="Panel boczny">
          <div class="avatar">
            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop" alt="Zdjęcie profilowe" />
          </div>

          <section class="side-section">
            <h3 class="side-title">Contact</h3>
            <div class="side-list">
              <div>+123-456-7890</div>
              <div>hello@reallygreatsite.com</div>
              <div>123 Anywhere St., Any City</div>
              <div>www.reallygreatsite.com</div>
            </div>
          </section>

          <section class="side-section">
            <h3 class="side-title">Education</h3>
            <div class="side-list">
              <div>
                <strong>2029 – 2030</strong><br />
                Wardiere University<br />
                Master of Business Management
              </div>
              <div>
                <strong>2025 – 2029</strong><br />
                Wardiere University<br />
                Bachelor of Business<br />
                GPA: 3.8 / 4.0
              </div>
            </div>
          </section>

          <section class="side-section">
            <h3 class="side-title">Skills</h3>
            <div class="side-list">
              <div>Project Management</div>
              <div>Public Relations</div>
              <div>Teamwork</div>
              <div>Time Management</div>
              <div>Leadership</div>
              <div>Effective Communication</div>
              <div>Critical Thinking</div>
            </div>
          </section>

          <section class="side-section">
            <h3 class="side-title">Languages</h3>
            <div class="side-list">
              <div>English (Fluent)</div>
              <div>French (Fluent)</div>
              <div>German (Basics)</div>
              <div>Spanish (Intermediate)</div>
            </div>
          </section>
        </aside>

        <main class="cv-main" aria-label="Treść główna">
          <header class="name-title" role="banner" aria-label="Nagłówek CV">
            <h1><span class="light">RICHARD</span> SANCHEZ</h1>
            <div class="role">MARKETING MANAGER</div>
            <div class="underline"></div>
          </header>

          <section class="section">
            <div class="title">Profile</div>
            <div class="rule"></div>
            <p class="text">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation.</p>
          </section>

          <section class="section">
            <div class="title">Work Experience</div>
            <div class="rule"></div>
            <div class="timeline">
              <article class="timeline-item">
                <div class="meta"><div><strong>Borcelle Studio</strong><br />Marketing Manager & Specialist</div><div>2030 – PRESENT</div></div>
                <ul>
                  <li>Develop and execute comprehensive marketing strategies and campaigns.</li>
                  <li>Lead and mentor a high-performing marketing team.</li>
                  <li>Monitor brand consistency across channels and materials.</li>
                </ul>
              </article>
              <article class="timeline-item">
                <div class="meta"><div><strong>Fauget Studio</strong><br />Marketing Manager & Specialist</div><div>2025 – 2029</div></div>
                <ul>
                  <li>Create and manage the marketing budget, ensuring efficient allocation.</li>
                  <li>Oversee market research to identify trends and strategies.</li>
                  <li>Monitor brand consistency across channels and materials.</li>
                </ul>
              </article>
              <article class="timeline-item">
                <div class="meta"><div><strong>Studio Shodwe</strong><br />Marketing Manager & Specialist</div><div>2024 – 2025</div></div>
                <ul>
                  <li>Develop and maintain strong relationships with partners and vendors.</li>
                  <li>Support marketing initiatives and maintain branding standards.</li>
                </ul>
              </article>
            </div>
          </section>

          <section class="section">
            <div class="title">Reference</div>
            <div class="rule"></div>
            <div class="references">
              <div class="ref-card">
                <div class="name">Estelle Darcy</div>
                <div class="small">Wardiere Inc. / CTO</div>
                <div class="small">Phone: 123-456-7890</div>
                <div class="small">Email: hello@reallygreatsite.com</div>
              </div>
              <div class="ref-card">
                <div class="name">Harper Richard</div>
                <div class="small">Wardiere Inc. / CEO</div>
                <div class="small">Phone: 123-456-7890</div>
                <div class="small">Email: hello@reallygreatsite.com</div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </section>
  </body>
  </html>`
  },

  // Getter zwracający template HTML na podstawie motywu
  getTemplateHtml(theme) {
    const themeKey = theme || this.defaultTheme || 'modernBlue';
    return this.templates[themeKey] || this.templates.modernBlue;
  },

  // Legacy - dla kompatybilności wstecznej
  get templateHtml() {
    return this.getTemplateHtml(this.defaultTheme);
  },

  // Wspólna część promptu dla wszystkich wariantów
  commonPrompt: `Jesteś ekspertem w tworzeniu profesjonalnych CV.

ZADANIE:
Na podstawie dostarczonych danych w formacie JSON wygeneruj kompletny kod HTML CV, używając dostarczonego szablonu HTML jako struktury bazowej.

WYMAGANIA OGÓLNE:
1. Dane z JSON musisz podstawić w odpowiednie miejsca w kodzie HTML zgodnie ze strukturą szablonu.
2. Nie zmieniaj struktury HTML szablonu - użyj go jako bazy i jedynie podstaw dane.
3. Wynik zwróć wyłącznie jako kompletny, działający kod HTML (bez dodatkowych komentarzy czy objaśnień).
4. Kod HTML powinien być zamknięty w bloku markdown: \`\`\`html ... \`\`\`
5. Jeśli zdjęcie nie zostanie podane w danych JSON, użyj zdjęcia z przykładu w szablonie.
6. Puste sekcje w danych JSON pomijaj w wynikowym CV.
7. Używaj polskich znaków i profesjonalnego języka.
8. Zachowaj przejrzystą strukturę i czytelność CV.
9. WAŻNE - NIE USUWAJ ani nie modyfikuj następujących elementów w sekcji <head>:
   - <link rel="stylesheet" href="cv-scaling.css" /> - wspólne style skalowania dla wszystkich motywów
   - <link rel="stylesheet" href="style.css" /> lub <link rel="stylesheet" href="style1.css" /> - style motywu
   - <script src="cv-auto-fit.js"></script> - skrypt automatycznie dopasowujący CV do jednej strony A4
   - <script src="cv-inline-edit.js"></script> - skrypt umożliwiający edycję inline elementów CV po podwójnym kliknięciu
   Te elementy są niezbędne do prawidłowego działania automatycznego skalowania CV i edycji inline.`,

  // Zestaw promptów do wyboru w formularzu
  // Każdy prompt zawiera tylko specyficzne instrukcje, wspólna część jest dodawana automatycznie
  prompts: {
    // 1) Minimalny: tylko korekta błędów językowych w treści
    basic: {
      label: 'Korekta ortograficzna (bez zmian treści)',
      specificInstructions: `INSTRUKCJE SPECYFICZNE:
- Popraw WYŁĄCZNIE błędy językowe, interpunkcyjne i literówki w treściach pochodzących z danych JSON.
- NIE dodawaj nowych informacji.
- NIE rozszerzaj treści poza korektę błędów.
- NIE zmieniaj sensu ani znaczenia treści.
- Zachowaj dokładnie taką samą długość i zakres informacji jak w danych wejściowych.`
    },
    // 2) Pośredni: delikatne wzbogacenie treści
    medium: {
      label: 'Delikatne wzbogacenie treści',
      specificInstructions: `INSTRUKCJE SPECYFICZNE:
- Delikatnie wzbogacaj treści pochodzące z danych JSON.
- Możesz doprecyzować 1-2 zdania w każdej sekcji, ale zachowuj fakty zgodne z danymi wejściowymi.
- Unikaj nadmiernego rozbudowywania ("lania wody").
- Zachowaj profesjonalny, zwięzły styl.
- Rozwinięcia powinny być logiczne i naturalne.`
    },
    // 3) Rozbudowany: kreatywne rozwinięcie (dotychczasowy cvPrompt)
    verbose: {
      label: 'Kreatywne rozwinięcie (maksymalna kreatywność)',
      specificInstructions: `INSTRUKCJE SPECYFICZNE:
- ROZWIJAJ informacje z danych JSON w kreatywny i szczegółowy sposób.
- Wzbogacaj treści, dodawaj szczegóły, które pasują do profilu kandydata.
- Możesz dopisać dodatkowe informacje, które logicznie wynikają z danych wejściowych.
- Bądź kreatywny - "lej wodę" w sposób profesjonalny i przekonujący.
- Jeśli jakieś dane są niepełne, możesz je uzupełnić w sposób realistyczny i spójny z resztą CV.
- Twórz przekonujące, szczegółowe opisy doświadczenia zawodowego, projektów i umiejętności.`
    }
  },
  
  // Funkcja zwracająca pełny prompt (wspólna część + specyficzne instrukcje)
  getFullPrompt(promptKey) {
    const key = promptKey || this.defaultPromptKey || 'verbose';
    const prompt = this.prompts[key];
    if (!prompt) return this.commonPrompt;
    
    const common = this.commonPrompt || '';
    const specific = prompt.specificInstructions || '';
    
    return [common, specific].filter(Boolean).join('\n\n');
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
} else {
  window.config = config;
}
