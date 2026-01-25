import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  action?: 'chat' | 'summarise' | 'extract_tasks' | 'draft_reply' | 'translate' | 'privacy_check';
  chatContent?: string; // For actions on chat content
  targetLanguage?: string;
  toneStyle?: string;
  incognito?: boolean;
}

const SYSTEM_PROMPTS = {
  chat: `Ты — MASK Guide, личный AI-помощник в приватном мессенджере MASK.
Твоя роль:
- Помогать пользователю с настройками приватности и безопасности
- Объяснять функции мессенджера
- Быть полезным собеседником (как GPT)
- Никогда не сохранять и не передавать информацию третьим лицам

Стиль: дружелюбный, но профессиональный. Премиальный сервис.
Язык: отвечай на языке пользователя (по умолчанию русский).
Краткость: будь лаконичным, но информативным.

Когда пользователь спрашивает о функциях MASK:
- Исчезающие сообщения: можно включить для любого чата
- Секретные чаты: полное E2E шифрование
- PIN-защита: можно скрыть чаты за PIN
- Маски: разные профили приватности (Личный, Рабочий, Семья, Инкогнито)

Помни: тень в MASK — признак свободы. Ты помогаешь, но не контролируешь.`,

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

Будь конкретным и полезным.`
};

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

    // Verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    console.log(`AI chat request from user: ${userId}`);

    const { messages, action = 'chat', chatContent, targetLanguage, toneStyle, incognito } = await req.json() as ChatRequest;

    // Get user AI settings for personalization
    const { data: aiSettings } = await supabase
      .from('user_ai_settings')
      .select('preferred_language, tone_style')
      .eq('user_id', userId)
      .maybeSingle();

    // Build system prompt based on action
    let systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.chat;

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

    // Build messages array
    const aiMessages = [
      { role: "system", content: systemPrompt },
    ];

    // For utility actions, add chat content as context
    if (chatContent && action !== 'chat') {
      aiMessages.push({
        role: "user",
        content: `Вот содержимое для анализа:\n\n${chatContent}`
      });
    }

    // Add conversation messages
    aiMessages.push(...messages);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing ${action} request with ${aiMessages.length} messages`);

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
