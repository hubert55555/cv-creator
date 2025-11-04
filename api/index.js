// Backend API Server dla Generator CV
// Tokeny są bezpieczne - tylko na serwerze!

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Upewnij się że fetch jest dostępny (Node.js 18+ ma natywny fetch)
// Jeśli nie, użyj node-fetch jako fallback
const ensureFetch = async () => {
  if (typeof fetch === 'undefined') {
    console.log('⚠️ fetch nie jest dostępny natywnie, ładuję node-fetch');
    try {
      const nodeFetch = await import('node-fetch');
      global.fetch = nodeFetch.default;
      console.log('✅ node-fetch załadowany pomyślnie');
    } catch (e) {
      console.error('❌ Nie można załadować node-fetch:', e);
    }
  } else {
    console.log('✅ fetch dostępny natywnie');
  }
};

// Wywołaj przy starcie
ensureFetch().catch(e => console.error('Błąd podczas ładowania fetch:', e));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS - konfiguracja dla localhost i Vercel
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  // Vercel automatycznie ustawia VERCEL_URL i VERCEL_BRANCH_URL
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
  // Główna domena projektu Vercel (cv-creator-roan.vercel.app)
  'https://cv-creator-roan.vercel.app',
  // Wszystkie możliwe domeny Vercel dla tego projektu
  /^https:\/\/cv-creator.*\.vercel\.app$/,
  // Możesz dodać własną domenę jako zmienną środowiskową
  process.env.CUSTOM_DOMAIN ? `https://${process.env.CUSTOM_DOMAIN}` : null
].filter(item => item !== null && item !== undefined); // Usuń tylko null/undefined wartości, zachowaj regex

app.use(cors({
  origin: function (origin, callback) {
    // Pozwól na żądania bez origin (mobile apps, Postman, itp.)
    if (!origin) return callback(null, true);
    
    // Sprawdź czy origin jest w liście dozwolonych (string)
    if (allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    })) {
      callback(null, true);
      return;
    }
    
    // W trybie deweloperskim na localhost, pozwól na wszystko
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      // W produkcji - loguj próby dostępu z nieznanych originów
      console.log('[CORS] Odrzucono żądanie z origin:', origin);
      console.log('[CORS] Dozwolone origins:', allowedOrigins.filter(o => typeof o === 'string'));
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Parsuj JSON z limitem rozmiaru

// Serwuj pliki statyczne z katalogu public (jedna lokalizacja dla localhost i Vercel)
// __dirname wskazuje na api/, więc musimy wyjść o jeden poziom wyżej
// Na Vercel może być inna struktura, więc sprawdzamy różne możliwości
let publicDir = path.resolve(__dirname, '..', 'public');

// Na Vercel, pliki mogą być w różnych lokalizacjach
// Sprawdź czy katalog istnieje (tylko lokalnie, na Vercel może nie być fs dostępny)
try {
  const fs = require('fs');
  
  // Na Vercel, spróbuj różnych ścieżek w kolejności
  const possiblePaths = [
    path.resolve(__dirname, '..', 'public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd()),
    // Na Vercel pliki mogą być w .vercel/output/static lub w root deploymentu
    path.resolve('/var/task/public'),
    path.resolve('/var/task'),
  ];
  
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync && fs.existsSync(possiblePath)) {
      // Sprawdź czy to jest katalog public lub zawiera pliki HTML
      try {
        const files = fs.readdirSync(possiblePath);
        if (files.includes('form.html') || files.includes('index.html')) {
          publicDir = possiblePath;
          console.log('Znaleziono publicDir:', publicDir);
          break;
        }
      } catch (e) {
        // Kontynuuj sprawdzanie
      }
    }
  }
  
  // Jeśli nadal nie znaleziono, użyj domyślnej
  if (!fs.existsSync || !fs.existsSync(publicDir)) {
    console.warn('Nie znaleziono katalogu public, używam domyślnej ścieżki:', publicDir);
  }
} catch (e) {
  // Na Vercel fs może nie być dostępny, użyj domyślnej ścieżki
  console.log('Używam domyślnej ścieżki publicDir (błąd fs):', publicDir);
}

console.log('Public directory:', publicDir);
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());
console.log('VERCEL:', process.env.VERCEL);

// EPICKIE ROZWIĄZANIE: Wczytaj pliki HTML do pamięci przy starcie
// To gwarantuje, że pliki będą dostępne nawet jeśli ścieżki są nieprawidłowe
let cachedHtmlFiles = {};

function loadHtmlFiles() {
  try {
    const fs = require('fs');
    
    // Więcej możliwych ścieżek na Vercel
    const possiblePaths = [
      path.resolve(__dirname, '..', 'public'),
      path.resolve(process.cwd(), 'public'),
      path.resolve(process.cwd()),
      '/var/task/public',
      '/var/task',
      path.resolve(__dirname, '..', '..', 'public'),
      // Nowe ścieżki dla Vercel
      path.resolve(__dirname, '..'),
      path.resolve('/var/task/.vercel/output/static'),
      path.resolve('/var/task/.vercel/output/static/public'),
    ];
    
    console.log('🔍 Szukam plików HTML...');
    console.log('  __dirname:', __dirname);
    console.log('  process.cwd():', process.cwd());
    console.log('  VERCEL:', process.env.VERCEL);
    
    let foundAny = false;
    
    for (const basePath of possiblePaths) {
      try {
        const formPath = path.join(basePath, 'form.html');
        const indexPath = path.join(basePath, 'index.html');
        
        console.log('  Sprawdzam:', basePath);
        
        // Ładuj pliki NIEZALEŻNIE - jeśli jeden istnieje, wczytaj go
        if (fs.existsSync && fs.existsSync(formPath)) {
          if (!cachedHtmlFiles['form.html']) {
            console.log('  ✅ Znaleziono form.html w:', formPath);
            cachedHtmlFiles['form.html'] = fs.readFileSync(formPath, 'utf8');
            publicDir = basePath;
            foundAny = true;
          }
        }
        
        if (fs.existsSync && fs.existsSync(indexPath)) {
          if (!cachedHtmlFiles['index.html']) {
            console.log('  ✅ Znaleziono index.html w:', indexPath);
            cachedHtmlFiles['index.html'] = fs.readFileSync(indexPath, 'utf8');
            publicDir = basePath;
            foundAny = true;
          }
        }
        
        // Jeśli znaleźliśmy oba, możemy przerwać
        if (cachedHtmlFiles['form.html'] && cachedHtmlFiles['index.html']) {
          console.log('✅ ✅ ✅ Oba pliki HTML wczytane do pamięci!');
          console.log('  form.html rozmiar:', cachedHtmlFiles['form.html']?.length || 0, 'znaków');
          console.log('  index.html rozmiar:', cachedHtmlFiles['index.html']?.length || 0, 'znaków');
          return true;
        }
      } catch (e) {
        console.log('  ❌ Błąd przy sprawdzaniu:', basePath, e.message);
      }
    }
    
    if (foundAny) {
      console.log('✅ Wczytano niektóre pliki HTML:');
      if (cachedHtmlFiles['form.html']) console.log('  ✅ form.html:', cachedHtmlFiles['form.html'].length, 'znaków');
      if (cachedHtmlFiles['index.html']) console.log('  ✅ index.html:', cachedHtmlFiles['index.html'].length, 'znaków');
      return true;
    }
    
    // Debug - lista wszystkich plików w różnych lokalizacjach
    console.error('⚠️ ⚠️ ⚠️ NIE UDAŁO SIĘ WCZYTAĆ PLIKÓW HTML!');
    console.error('📂 Próbuję wylistować pliki w różnych lokalizacjach:');
    for (const debugPath of [process.cwd(), __dirname, '/var/task']) {
      try {
        if (fs.existsSync(debugPath)) {
          const files = fs.readdirSync(debugPath);
          console.error(`  ${debugPath}:`, files.join(', '));
        }
      } catch (e) {
        console.error(`  Nie można odczytać ${debugPath}`);
      }
    }
    
    return false;
  } catch (e) {
    console.error('🚨 Krytyczny błąd w loadHtmlFiles:', e.message);
    console.error('Stack:', e.stack);
    return false;
  }
}

// Wczytaj pliki przy starcie - ale NIE FAIL jeśli nie uda się (dla buildu na Vercel)
try {
  const loaded = loadHtmlFiles();
  if (!loaded) {
    console.warn('⚠️ UWAGA: Pliki HTML nie zostały wczytane podczas inicjalizacji.');
    console.warn('⚠️ Będą wczytane przy pierwszym żądaniu.');
  }
} catch (e) {
  console.warn('⚠️ Nie udało się wczytać plików HTML podczas inicjalizacji:', e.message);
  console.warn('⚠️ Pliki będą wczytane przy pierwszym żądaniu.');
}

// Credentials z zmiennych środowiskowych (BEZPIECZNE!)
const credentials = {
  gemini: {
    apiToken: process.env.GEMINI_API_TOKEN,
    modelName: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
  },
  huggingFace: {
    apiToken: process.env.HUGGINGFACE_API_TOKEN,
    modelName: process.env.HUGGINGFACE_MODEL || 'deepseek-ai/DeepSeek-R1:novita',
    apiUrl: 'https://router.huggingface.co/v1/chat/completions'
  }
};

// Ustaw routing API PRZED express.static, aby żądania POST/PUT/DELETE do API były obsługiwane
// Endpoint do generowania CV
app.post('/api/generate-cv', async (req, res) => {
  console.log('[API] Otrzymano żądanie do /api/generate-cv');
  console.log('[API] Provider:', req.body?.provider);
  console.log('[API] Fetch dostępny:', typeof fetch !== 'undefined');
  
  try {
    const { provider, prompt, templateHtml, cvData } = req.body;
    
    console.log('[API] Sprawdzanie wymaganych parametrów...');

    // Walidacja
    if (!provider || !prompt || !templateHtml) {
      return res.status(400).json({ 
        error: 'Brakuje wymaganych parametrów: provider, prompt, templateHtml' 
      });
    }
    
    // Walidacja długości (ochrona przed nadużyciami)
    if (prompt.length > 100000 || templateHtml.length > 500000) {
      return res.status(400).json({ 
        error: 'Zbyt długie dane wejściowe. Zmniejsz rozmiar promptu lub szablonu.' 
      });
    }

    // Pobierz konfigurację providera
    const providerConfig = credentials[provider];
    if (!providerConfig) {
      console.error(`[API] Nieznany provider: ${provider}`);
      return res.status(400).json({ 
        error: `Nieznany provider: ${provider}. Dostępne providery: gemini, huggingFace` 
      });
    }
    
    if (!providerConfig.apiToken) {
      console.error(`[API] Brak tokenu dla providera: ${provider}`);
      const envVarName = provider === 'gemini' ? 'GEMINI_API_TOKEN' : 'HUGGINGFACE_API_TOKEN';
      return res.status(400).json({ 
        error: `Token API dla ${provider} nie jest skonfigurowany. Sprawdź zmienną środowiskową: ${envVarName}` 
      });
    }

    const { apiToken, modelName, apiUrl } = providerConfig;

    // Przygotuj pełny prompt
    const fullPrompt = [
      prompt,
      '\n\nSzablon HTML:',
      templateHtml || '',
      '\n\nDane JSON:',
      JSON.stringify(cvData || {}, null, 2)
    ].join('\n');

    console.log(`[API] Generowanie CV - Provider: ${provider}, Model: ${modelName}`);

    let response;
    let data;

    // Obsługa Gemini API (ma inny format)
    if (provider === 'gemini') {
      const geminiModelUrl = `${apiUrl}/${modelName}:generateContent`;
      const geminiUrl = `${geminiModelUrl}?key=${apiToken}`;
      
      response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Błąd ${response.status}: ${response.statusText}`;
        try {
          const err = JSON.parse(errorText);
          errorMessage = err.error?.message || err.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        return res.status(response.status).json({ error: errorMessage });
      }

      data = await response.json();
      let generated = '';
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        generated = data.candidates[0].content.parts[0].text || '';
      } else {
        generated = 'Brak odpowiedzi od AI';
      }

      // Czyszczenie odpowiedzi
      let cleaned = (generated || '').replace(/<(think|redacted_reasoning)[\s\S]*?<\/(think|redacted_reasoning)>/gi, '');
      const htmlBlockMatch = cleaned.match(/`{3}\s*html\s*([\s\S]*?)`{3}/i);
      let cleanedHtml = htmlBlockMatch && htmlBlockMatch[1] ? htmlBlockMatch[1].trim() : cleaned.trim();

      return res.json({ html: cleanedHtml });
    }

                // Dla HuggingFace - standardowy format
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: fullPrompt
          }
        ],
        model: modelName
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Błąd ${response.status}: ${response.statusText}`;
      try {
        const err = JSON.parse(errorText);
        errorMessage = err.error?.message || err.error || err.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      return res.status(response.status).json({ error: errorMessage });
    }

    data = await response.json();

    // Obsługa odpowiedzi AI
    let generated = '';
    if (data.choices && data.choices[0] && data.choices[0].message) {
      generated = data.choices[0].message.content;
    } else if (data.content) {
      generated = data.content;
    } else {
      generated = 'Brak odpowiedzi od AI';
    }

    // Czyszczenie odpowiedzi
    let cleaned = (generated || '').replace(/<(think|redacted_reasoning)[\s\S]*?<\/(think|redacted_reasoning)>/gi, '');
    const htmlBlockMatch = cleaned.match(/```\s*html\s*([\s\S]*?)```/i);
    let cleanedHtml = htmlBlockMatch && htmlBlockMatch[1] ? htmlBlockMatch[1].trim() : cleaned.trim();

    return res.json({ html: cleanedHtml });

  } catch (error) {
    console.error('[API] 🚨 BŁĄD KRYTYCZNY:', error);
    console.error('[API] Typ błędu:', error.name);
    console.error('[API] Wiadomość:', error.message);
    console.error('[API] Stack trace:', error.stack);
    console.error('[API] Provider:', req.body?.provider);
    console.error('[API] Prompt length:', req.body?.prompt?.length || 0);
    console.error('[API] Template length:', req.body?.templateHtml?.length || 0);
    
    return res.status(500).json({ 
      error: 'Wewnętrzny błąd serwera: ' + error.message,
      errorType: error.name,
      details: error.stack,
      provider: req.body?.provider
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API działa poprawnie' });
});

// Debug endpoint - pomaga zdiagnozować problemy na Vercel
app.get('/api/debug', (req, res) => {
  const fs = require('fs');
  const debugInfo = {
    __dirname,
    'process.cwd()': process.cwd(),
    VERCEL: process.env.VERCEL,
    'cachedHtmlFiles keys': Object.keys(cachedHtmlFiles),
    'form.html cached': !!cachedHtmlFiles['form.html'],
    'index.html cached': !!cachedHtmlFiles['index.html'],
    publicDir,
    'fetch available': typeof fetch !== 'undefined',
    'Node version': process.version,
    'API tokens configured': {
      'GEMINI_API_TOKEN': !!process.env.GEMINI_API_TOKEN,
      'HUGGINGFACE_API_TOKEN': !!process.env.HUGGINGFACE_API_TOKEN
    },
    files: {}
  };
  
  // Lista plików w różnych lokalizacjach
  const pathsToCheck = [
    process.cwd(),
    __dirname,
    path.resolve(__dirname, '..'),
    '/var/task',
    '/var/task/public'
  ];
  
  for (const checkPath of pathsToCheck) {
    try {
      if (fs.existsSync(checkPath)) {
        debugInfo.files[checkPath] = fs.readdirSync(checkPath);
      } else {
        debugInfo.files[checkPath] = 'NOT_EXISTS';
      }
    } catch (e) {
      debugInfo.files[checkPath] = 'ERROR: ' + e.message;
    }
  }
  
  res.json(debugInfo);
});

// NAPRAWIAM TO KURWA RAZ NA ZAWSZE
// Routing dla plików HTML MUSI BYĆ PRZED WSZYSTKIM INNYM
// I MUSI BYĆ EXPLICIT - żadnych fallbacków, żadnych przekierowań

// FORM.HTML - PIERWSZY, BEZPOŚREDNIO, BEZ ŻADNYCH WARUNKÓW
app.get('/form.html', (req, res) => {
  console.log('🔥 OBSŁUGUJĘ /form.html');
  
  // Lazy loading - spróbuj wczytać jeśli nie ma w cache
  if (!cachedHtmlFiles['form.html']) {
    console.log('⚠️ form.html nie w cache, próbuję wczytać...');
    loadHtmlFiles();
  }
  
  if (cachedHtmlFiles['form.html']) {
    console.log('✅ Wysyłam form.html z cache');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(cachedHtmlFiles['form.html']);
  }
  
  console.error('❌ BRAK form.html w cache!');
  res.status(500).send('<h1>Błąd: form.html nie został wczytany do pamięci</h1>');
});

// INDEX.HTML - TYLKO DLA /index.html i /
app.get('/index.html', (req, res) => {
  console.log('🔥 OBSŁUGUJĘ /index.html');
  
  // Lazy loading
  if (!cachedHtmlFiles['index.html']) {
    console.log('⚠️ index.html nie w cache, próbuję wczytać...');
    loadHtmlFiles();
  }
  
  if (cachedHtmlFiles['index.html']) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(cachedHtmlFiles['index.html']);
  }
  res.status(500).send('<h1>Błąd: index.html nie został wczytany do pamięci</h1>');
});

app.get('/', (req, res) => {
  console.log('🔥 OBSŁUGUJĘ /');
  
  // Lazy loading
  if (!cachedHtmlFiles['index.html']) {
    console.log('⚠️ index.html nie w cache, próbuję wczytać...');
    loadHtmlFiles();
  }
  
  if (cachedHtmlFiles['index.html']) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(cachedHtmlFiles['index.html']);
  }
  res.status(500).send('<h1>Błąd: index.html nie został wczytany do pamięci</h1>');
});

// Serwuj TYLKO pliki statyczne (CSS, JS, obrazy) - NIE HTML!
// Pliki HTML są już obsłużone przez explicit routing powyżej
app.use((req, res, next) => {
  // ABSOLUTNIE NIE TOUCH plików HTML - już są obsłużone
  if (req.path.endsWith('.html')) {
    console.log('⚠️ Żądanie do .html które nie zostało obsłużone:', req.path);
    return res.status(404).send(`<h1>404</h1><p>Plik ${req.path} nie został znaleziony</p>`);
  }
  // Dla innych plików (CSS, JS, obrazy) przekaż dalej
  next();
});

// Middleware dla plików statycznych (CSS, JS, obrazy) - NIE HTML
// Inicjalizuj TYLKO jeśli publicDir jest zdefiniowany
if (publicDir) {
  const staticMiddleware = express.static(publicDir, {
    index: false,
    extensions: [],
    dotfiles: 'ignore',
    fallthrough: true
  });
  app.use(staticMiddleware);
} else {
  console.warn('⚠️ publicDir nie jest zdefiniowany - pomijam express.static');
}

// Eksport aplikacji dla Vercel (funkcja serverless)
// Vercel automatycznie wykryje i użyje tego eksportu
// Dla @vercel/node, eksportujemy app bezpośrednio
module.exports = app;

// Uruchom serwer lokalnie (tylko jeśli nie jesteśmy na Vercel)
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Serwer API działa na porcie ${PORT}`);
    console.log(`📝 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api/generate-cv`);
    
    // Sprawdź które providery są skonfigurowane
    const configured = Object.keys(credentials).filter(p => credentials[p].apiToken);
    if (configured.length > 0) {
      console.log(`✅ Skonfigurowane providery: ${configured.join(', ')}`);
    } else {
      console.log(`⚠️  UWAGA: Żaden provider nie jest skonfigurowany! Sprawdź plik .env`);
    }
  });
}

