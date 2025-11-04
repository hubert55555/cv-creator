// Backend API Server dla Generator CV
// Tokeny są bezpieczne - tylko na serwerze!

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
  const fs = require('fs');
  const possiblePaths = [
    path.resolve(__dirname, '..', 'public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd()),
    '/var/task/public',
    '/var/task',
  ];
  
  for (const basePath of possiblePaths) {
    try {
      const formPath = path.join(basePath, 'form.html');
      const indexPath = path.join(basePath, 'index.html');
      
      if (fs.existsSync && fs.existsSync(formPath) && fs.existsSync(indexPath)) {
        console.log('✅ Wczytuję pliki HTML z:', basePath);
        cachedHtmlFiles['form.html'] = fs.readFileSync(formPath, 'utf8');
        cachedHtmlFiles['index.html'] = fs.readFileSync(indexPath, 'utf8');
        publicDir = basePath; // Zaktualizuj publicDir
        console.log('✅ Pliki HTML wczytane do pamięci');
        return true;
      }
    } catch (e) {
      // Kontynuuj próbę następnej ścieżki
    }
  }
  
  console.warn('⚠️ Nie udało się wczytać plików HTML do pamięci');
  return false;
}

// Wczytaj pliki przy starcie
try {
  loadHtmlFiles();
} catch (e) {
  console.error('Błąd przy wczytywaniu plików HTML:', e);
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
    console.error('[API] Błąd:', error);
    console.error('[API] Stack trace:', error.stack);
    console.error('[API] Request body:', JSON.stringify(req.body).substring(0, 500)); // Pierwsze 500 znaków
    return res.status(500).json({ 
      error: 'Wewnętrzny błąd serwera: ' + error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API działa poprawnie' });
});

// Routing dla plików statycznych - działa zarówno lokalnie jak i na Vercel
// Na Vercel, pliki z public są kopiowane do build output, ale routing przez Express może być potrzebny
// gdy używasz rewrites lub gdy pliki nie są dostępne bezpośrednio

// EPICKIE ROZWIĄZANIE: Routing dla plików HTML - najpierw z cache, potem z dysku
app.get('/form.html', (req, res) => {
  // Jeśli mamy plik w cache, użyj go (NAJLEPSZE - zawsze działa)
  if (cachedHtmlFiles['form.html']) {
    console.log('✅ Serwuję form.html z cache');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(cachedHtmlFiles['form.html']);
  }
  
  // Fallback: spróbuj z dysku
  res.sendFile('form.html', { root: publicDir }, (err) => {
    if (err) {
      console.error('❌ Błąd przy wysyłaniu form.html:', err);
      console.error('publicDir:', publicDir);
      res.status(404).send('<h1>404 - Nie znaleziono form.html</h1><p>Sprawdź logi serwera.</p>');
    }
  });
});

app.get('/index.html', (req, res) => {
  // Jeśli mamy plik w cache, użyj go
  if (cachedHtmlFiles['index.html']) {
    console.log('✅ Serwuję index.html z cache');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(cachedHtmlFiles['index.html']);
  }
  
  // Fallback: spróbuj z dysku
  res.sendFile('index.html', { root: publicDir }, (err) => {
    if (err) {
      console.error('❌ Błąd przy wysyłaniu index.html:', err);
      res.status(404).send('<h1>404 - Nie znaleziono index.html</h1>');
    }
  });
});

// Serwuj pliki statyczne
app.use(express.static(publicDir, { 
  index: false, // Nie używaj automatycznego index.html - obsługujemy to ręcznie
  extensions: ['html', 'htm'],
  dotfiles: 'ignore',
  fallthrough: true
}));

// Fallback do index.html TYLKO dla root path (nie dla innych ścieżek)
app.get('/', (req, res) => {
  // Jeśli mamy plik w cache, użyj go
  if (cachedHtmlFiles['index.html']) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(cachedHtmlFiles['index.html']);
  }
  
  // Fallback: spróbuj z dysku
  res.sendFile('index.html', { root: publicDir }, (err) => {
    if (err) {
      console.error('❌ Błąd przy wysyłaniu index.html z root:', err);
      res.status(404).send('<h1>404 - Nie znaleziono index.html</h1>');
    }
  });
});

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

