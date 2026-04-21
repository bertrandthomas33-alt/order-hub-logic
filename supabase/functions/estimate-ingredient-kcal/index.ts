// Edge function : estime les calories (kcal) d'un ingrédient via Lovable AI.
// Retourne kcal pour 1 unité de base (1 kg, 1 litre ou 1 unité selon `unit`).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, unit } = await req.json();

    if (!name || typeof name !== "string") {
      return new Response(
        JSON.stringify({ error: "Le nom de l'ingrédient est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const u = (unit || "kg").toLowerCase();
    let unitDescription = "1 kilogramme";
    if (u === "g") unitDescription = "1 kilogramme";
    else if (u === "kg") unitDescription = "1 kilogramme";
    else if (u === "ml" || u === "litre" || u === "l") unitDescription = "1 litre";
    else if (u === "unite" || u === "u" || u === "piece" || u === "pièce") unitDescription = "1 pièce moyenne";

    const systemPrompt =
      "Tu es un nutritionniste expert. Tu dois estimer les calories (kcal) pour 1 unité d'un ingrédient alimentaire brut. Donne une estimation réaliste basée sur les tables nutritionnelles standards (Ciqual, USDA). Tu ne dois JAMAIS répondre en texte libre, uniquement appeler la fonction fournie.";

    const userPrompt = `Estime les calories (kcal) contenues dans ${unitDescription} de l'ingrédient suivant : "${name}".\n\nDonne une valeur numérique entière, basée sur l'ingrédient brut/non préparé sauf si le nom indique le contraire (ex: "poulet cuit", "huile d'olive").`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_kcal_estimate",
              description: "Retourne l'estimation calorique pour l'ingrédient",
              parameters: {
                type: "object",
                properties: {
                  kcal: {
                    type: "number",
                    description: `Nombre de kcal pour ${unitDescription} de l'ingrédient (entier)`,
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Confiance dans l'estimation",
                  },
                  notes: {
                    type: "string",
                    description: "Brève note (10 mots max) sur l'hypothèse retenue",
                  },
                },
                required: ["kcal", "confidence", "notes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_kcal_estimate" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans Lovable Cloud." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiRes.text();
      console.error("Erreur AI gateway:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("Réponse IA inattendue:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "L'IA n'a pas retourné d'estimation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(
      JSON.stringify({
        kcal: Number(parsed.kcal) || 0,
        confidence: parsed.confidence || "medium",
        notes: parsed.notes || "",
        unit_description: unitDescription,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("estimate-ingredient-kcal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
