// Backend API Server dla Generator CV
// Tokeny są bezpieczne - tylko na serwerze!

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS - w produkcji ustaw origin na swoją domenę!
// Dla lokalnego developmentu: app.use(cors())
// Dla produkcji: app.use(cors({ origin: 'https://twoja-domena.pl' }))
app.use(cors()); // Zezwól na żądania z frontendu (TODO: ogranicz w produkcji!)
app.use(express.json({ limit: '10mb' })); // Parsuj JSON z limitem rozmiaru
app.use(express.static('.')); // Serwuj pliki statyczne (index.html, CSS, JS)

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
  try {
    const { provider, prompt, templateHtml, cvData } = req.body;

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
    if (!providerConfig || !providerConfig.apiToken) {
      return res.status(400).json({ 
        error: `Token API dla ${provider} nie jest skonfigurowany. Sprawdź zmienne środowiskowe.` 
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
    return res.status(500).json({ 
      error: 'Wewnętrzny błąd serwera: ' + error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API działa poprawnie' });
});

// Uruchom serwer
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

