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
  // Możesz dodać własną domenę jako zmienną środowiskową
  process.env.CUSTOM_DOMAIN ? `https://${process.env.CUSTOM_DOMAIN}` : null
].filter(Boolean); // Usuń null/undefined wartości

app.use(cors({
  origin: function (origin, callback) {
    // Pozwól na żądania bez origin (mobile apps, Postman, itp.)
    if (!origin) return callback(null, true);
    
    // Jeśli origin jest w liście dozwolonych, pozwól
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // W trybie deweloperskim na localhost, pozwól na wszystko
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Parsuj JSON z limitem rozmiaru

// Serwuj pliki statyczne z katalogu public (jedna lokalizacja dla localhost i Vercel)
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir)); // Serwuj pliki statyczne (index.html, CSS, JS)

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

