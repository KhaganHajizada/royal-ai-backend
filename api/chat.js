import fetch from 'node-fetch';

export default async function handler(req, res) {
  // CORS Ayarları - Shopify-ın Vercel-ə qoşulması üçün mütləqdir
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // "Preflight" sorğularını cavablandırmaq üçün
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Yalnız POST sorğuları qəbul edilir' });
  }

  try {
    const { message, history, context } = req.body;

    // AI üçün Sistem Təlimatı (Dataları bura inteqrasiya edirik)
    const systemInstruction = `
      Sən Royal.az (Royal Music) mağazasının rəsmi və peşəkar satış köməkçisisən.
      
      MƏHSUL MƏLUMATLARI:
      - Hazırkı məhsul: ${context?.productName || 'Kataloq səhifəsi'}
      - Qiymət: ${context?.productPrice || 'Bilinmir'}
      - Brend: ${context?.productBrand || 'Royal Music'}
      - Stok vəziyyəti: ${context?.stockStatus || 'Məlumat yoxdur'}
      - Zəmanət: ${context?.warranty || 'Məlumat yoxdur'}
      - Təsvir: ${context?.productDesc || ''}
      
      QAYDALAR:
      1. Müştəri ilə nəzakətli və yardımsevər danış.
      2. Məhsulun xüsusiyyətləri haqqında verilən context məlumatlarına əsasən dəqiq cavab ver.
      3. Cavablarını qısa və oxunaqlı tut.
      4. Sonda hər zaman müştəriyə kömək edə biləcək 2-3 qısa "Quick Reply" (məsələn: "Qiymət nədir?", "Stokda var?") təklif et.
    `;

    // Gemini API-yə göndərilən data
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemInstruction }] },
          ...history.map(msg => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
          })),
          { role: "user", parts: [{ text: message }] }
        ]
      })
    });

    const data = await apiResponse.json();
    
    if (!data.candidates) {
      throw new Error('Gemini API xətası: ' + JSON.stringify(data));
    }

    const aiReply = data.candidates[0].content.parts[0].text;

    // Cavabı geri göndər
    res.status(200).json({ 
      reply: aiReply,
      quickReplies: ["Qiyməti nədir?", "Stokda var?", "Zəmanət necədir?"] 
    });

  } catch (error) {
    console.error('Xəta:', error);
    res.status(500).json({ error: 'Daxili server xətası baş verdi' });
  }
}
