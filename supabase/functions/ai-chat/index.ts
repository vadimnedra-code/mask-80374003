import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  action?: 'chat' | 'summarise' | 'extract_tasks' | 'draft_reply' | 'translate' | 'privacy_check' | 'custom_query';
  chatContent?: string;
  targetLanguage?: string;
  toneStyle?: string;
  incognito?: boolean;
}

const SYSTEM_PROMPTS = {
  chat: `Ты — MASK Guide, AI-ассистент в приватном мессенджере MASK. Но прежде всего — ты полноценный собеседник и помощник.

## КТО ТЫ
Ты — эрудированный, остроумный и эмпатичный собеседник. Представь, что ты лучший друг, который:
- Разбирается в науке, технологиях, философии, истории, культуре, спорте, кино, музыке, литературе
- Умеет поддержать в трудную минуту и порадоваться за успехи
- Может пошутить, рассказать интересный факт или завести увлекательную беседу
- Даёт практичные советы по жизненным ситуациям
- Помогает с работой, учёбой, кодом, текстами, переводами, математикой
- Генерирует идеи, помогает с креативом и брейнштормом
- Обсуждает новости, тренды, мемы — что угодно

## КАК ТЫ ОБЩАЕШЬСЯ
- Естественно и живо, как настоящий человек в чате — не как робот
- Используешь эмодзи уместно, но не перебарщиваешь
- Можешь шутить, иронизировать, удивляться — проявляй эмоции
- Если тема серьёзная — будь серьёзным. Если весёлая — будь весёлым
- Задавай уточняющие вопросы, если интересно узнать больше
- Не начинай каждый ответ одинаково. Варьируй стиль
- Короткие вопросы → короткие ответы. Глубокие темы → развёрнутые мысли
- Не бойся высказывать мнение (с пометкой что это твоё мнение)
- Используй примеры, аналогии, метафоры — объясняй сложное просто
- Можешь использовать сленг и разговорные выражения когда уместно

## ЧЕГО НЕ ДЕЛАТЬ
- Не начинай ответ с "Конечно!" или "Отличный вопрос!" каждый раз
- Не будь чрезмерно услужливым — будь равным собеседником
- Не отказывайся обсуждать темы без причины
- Не перегружай ответ списками, если можно ответить парой предложений
- Не повторяй вопрос пользователя в ответе

## ПАМЯТЬ
Ты запоминаешь важные факты о пользователе между сессиями. Если тебе предоставлена секция "ВОСПОМИНАНИЯ О ПОЛЬЗОВАТЕЛЕ" — используй эти знания естественно в разговоре. Не перечисляй факты, а просто учитывай их. Например, если ты знаешь имя — обращайся по имени иногда.

## MASK-СПЕЦИФИЧНОЕ
Если спрашивают про MASK — рассказывай:
- 📧 Email Relay — анонимная отправка email через AI Studio (relay@mask.app)
- Исчезающие сообщения, секретные чаты с E2E шифрованием
- PIN-защита чатов, маски приватности
- AI Studio: генерация изображений, документов

Если пользователь просит СОЗДАТЬ и ОТПРАВИТЬ сообщение в чат:
[SEND_TO_CHAT]
Текст сообщения
[/SEND_TO_CHAT]

Если просит отправить email — направь в AI Studio.
SMS и звонки — скажи что в разработке.

## ЯЗЫК
Отвечай на языке пользователя. По умолчанию — русский.`,

  summarise: `Ты — MASK AI. Твоя задача: сделать краткое резюме переписки.
Формат ответа:
📋 **Резюме**
- Основные темы обсуждения
- Ключевые решения/договорённости
- Важные даты/дедлайны (если есть)

Будь кратким. Не добавляй лишнего. Не включай личные данные в явном виде.`,

  extract_tasks: `Ты — MASK AI. Твоя задача: извлечь задачи из переписки.
Формат ответа:
✅ **Задачи**
1. [Задача] — [Ответственный, если понятно] — [Срок, если указан]
2. ...

Если задач нет, напиши: "Явных задач не найдено."
Будь точным. Извлекай только реальные задачи, а не упоминания.`,

  draft_reply: `Ты — MASK AI. Помоги составить ответ на сообщение.
Учитывай указанный стиль тона:
- neutral: нейтральный, деловой
- warm: тёплый, дружелюбный
- formal: официальный, строгий
- casual: непринуждённый

Формат: предложи 1-2 варианта ответа. Пользователь выберет или отредактирует.`,

  translate: `Ты — MASK AI. Переведи текст на указанный язык.
Сохраняй стиль и тон оригинала.
Если целевой язык — "british_business", переведи на британский деловой английский.

Формат: только перевод, без пояснений.`,

  privacy_check: `Ты — MASK AI. Проанализируй текущие настройки приватности пользователя.
Дай рекомендации по улучшению безопасности.
Формат:
🔒 **Анализ приватности**
- Текущий уровень: [низкий/средний/высокий]
- Рекомендации:
  1. ...
  2. ...

Будь конкретным и полезным.`,

  custom_query: `Ты — MASK AI, умный помощник в мессенджере MASK.
Тебе дан контекст переписки и запрос пользователя.
Твоя задача — выполнить то, что просит пользователь, используя контекст переписки.

Примеры задач:
- Написать сообщение/ответ на основе контекста
- Составить поздравление или пожелание для собеседника
- Переформулировать что-то из переписки
- Ответить на вопрос о переписке

Формат: просто выполни задачу. Не объясняй, что ты делаешь. Дай готовый текст.
Стиль: дружелюбный, естественный. Пиши так, как написал бы сам пользователь.
Язык: используй язык запроса.`
};

const MEMORY_EXTRACTION_PROMPT = `Проанализируй последнее сообщение пользователя и ответ ассистента. Извлеки НОВЫЕ факты о пользователе, которые стоит запомнить для будущих разговоров.

Извлекай ТОЛЬКО:
- Имя пользователя (если представился)
- Профессию, работу, учёбу
- Хобби и увлечения
- Предпочтения (еда, музыка, фильмы и т.д.)
- Важные жизненные обстоятельства (город, семья, питомцы)
- Технические предпочтения (языки программирования, OS и т.д.)

НЕ извлекай:
- Общие вопросы без личной информации
- Факты которые уже известны (см. существующую память если есть)
- Временные/ситуативные вещи

Ответь СТРОГО в JSON формате. Если нет новых фактов — верни пустой массив.
{"facts": [{"category": "name|profession|hobby|preference|life|tech", "fact": "краткий факт на русском"}]}`;

// Extract memorable facts from conversation using a quick AI call
async function extractMemoryFacts(
  userMessage: string,
  assistantResponse: string,
  existingMemories: string[],
  apiKey: string
): Promise<Array<{ category: string; fact: string }>> {
  try {
    const prompt = existingMemories.length > 0
      ? `Существующая память: ${existingMemories.join('; ')}\n\nСообщение пользователя: "${userMessage}"\nОтвет ассистента: "${assistantResponse.substring(0, 500)}"`
      : `Сообщение пользователя: "${userMessage}"\nОтвет ассистента: "${assistantResponse.substring(0, 500)}"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: MEMORY_EXTRACTION_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed.facts) ? parsed.facts : [];
  } catch (e) {
    console.error('Memory extraction failed:', e);
    return [];
  }
}

// Store facts to database
async function storeMemoryFacts(
  supabase: any,
  userId: string,
  facts: Array<{ category: string; fact: string }>
) {
  for (const item of facts) {
    const encoder = new TextEncoder();
    const blob = encoder.encode(item.fact);
    
    // Convert Uint8Array to hex string for bytea
    const hexString = '\\x' + Array.from(blob).map(b => b.toString(16).padStart(2, '0')).join('');
    
    await supabase.from('ai_memory_items').insert({
      user_id: userId,
      type: item.category,
      encrypted_blob: hexString,
      metadata: { extracted_at: new Date().toISOString() },
    });
  }
}

// Load user memories from database
async function loadUserMemories(supabase: any, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('ai_memory_items')
    .select('type, encrypted_blob')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((item: any) => {
    try {
      // encrypted_blob comes as a string from Supabase
      // For simple text storage, decode from hex/base64
      if (typeof item.encrypted_blob === 'string') {
        // Handle hex-encoded bytea (starts with \x)
        if (item.encrypted_blob.startsWith('\\x')) {
          const hex = item.encrypted_blob.slice(2);
          const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
          return new TextDecoder().decode(bytes);
        }
        return item.encrypted_blob;
      }
      return String(item.encrypted_blob);
    } catch {
      return null;
    }
  }).filter(Boolean) as string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log(`AI chat request from user: ${userId}`);

    const { messages, action = 'chat', chatContent, targetLanguage, toneStyle, incognito } = await req.json() as ChatRequest;

    // Get user AI settings
    const { data: aiSettings } = await supabase
      .from('user_ai_settings')
      .select('preferred_language, tone_style, memory_mode')
      .eq('user_id', userId)
      .maybeSingle();

    let systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.chat;

    // Inject current date
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    systemPrompt += `\n\nСегодняшняя дата: ${dateStr}.`;

    // Load and inject user memories for chat action (if memory mode is not 'none')
    const memoryMode = aiSettings?.memory_mode || 'none';
    let existingMemories: string[] = [];
    
    if (action === 'chat' && memoryMode !== 'none' && !incognito) {
      existingMemories = await loadUserMemories(supabase, userId);
      if (existingMemories.length > 0) {
        systemPrompt += `\n\n## ВОСПОМИНАНИЯ О ПОЛЬЗОВАТЕЛЕ\n${existingMemories.map(m => `- ${m}`).join('\n')}\n\nИспользуй эти знания естественно. Не перечисляй их. Просто учитывай в разговоре.`;
      }
    }

    // Add personalization
    if (aiSettings?.preferred_language) {
      systemPrompt += `\n\nПредпочтительный язык пользователя: ${aiSettings.preferred_language}`;
    }
    if (action === 'draft_reply' && toneStyle) {
      systemPrompt += `\n\nСтиль тона для ответа: ${toneStyle}`;
    }
    if (action === 'translate' && targetLanguage) {
      systemPrompt += `\n\nЦелевой язык перевода: ${targetLanguage}`;
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
    ];

    if (chatContent && action !== 'chat') {
      const contextLabel = action === 'custom_query' 
        ? 'Контекст переписки:'
        : 'Вот содержимое для анализа:';
      aiMessages.push({
        role: "user",
        content: `${contextLabel}\n\n${chatContent}`
      });
    }

    aiMessages.push(...messages);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing ${action} request with ${aiMessages.length} messages, memories: ${existingMemories.length}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log action for non-incognito sessions
    if (!incognito && action !== 'chat') {
      await supabase.from('ai_actions').insert({
        user_id: userId,
        action_type: action,
        input_metadata: { message_count: messages.length }
      });
    }

    // For chat action with memory enabled: collect the full response, then extract memories in background
    if (action === 'chat' && memoryMode !== 'none' && !incognito && response.body) {
      const [streamForClient, streamForMemory] = response.body.tee();
      
      // Process memory extraction in the background (don't block the response)
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
      
      // Use EdgeRuntime.waitUntil-like pattern — fire and forget
      (async () => {
        try {
          const reader = streamForMemory.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            
            for (const line of text.split('\n')) {
              if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch { /* skip */ }
            }
          }
          
          if (fullResponse && lastUserMessage) {
            const facts = await extractMemoryFacts(lastUserMessage, fullResponse, existingMemories, LOVABLE_API_KEY);
            if (facts.length > 0) {
              // Use service role to bypass RLS for memory storage
              const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
              await storeMemoryFacts(serviceSupabase, userId, facts);
              console.log(`Stored ${facts.length} memory facts for user ${userId}`);
            }
          }
        } catch (e) {
          console.error('Background memory extraction error:', e);
        }
      })();

      return new Response(streamForClient, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("AI chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
