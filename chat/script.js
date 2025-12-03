// ===============================
// KONFIGURASI API
// ===============================
const GEMINI_API_KEY = "AIzaSyBusQftxWYhAnkOrGE5JuyuJj1ZwRISr28";
const BACKEND_URL = "http://localhost:8000/predict";

const chatBox = document.getElementById("chat-box");
const pmForm = document.getElementById("pm-form");

// ===============================
// FUNGSI MENAMBAHKAN PESAN KE CHATBOX
// ===============================
function appendMessage(sender, text) {
    let div = document.createElement("div");
    div.classList.add("message");

    // Tambahkan bubble class
    div.classList.add(sender === "bot" ? "chat-bot" : "chat-user");

    const formatted = text
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    div.innerHTML = formatted;
    chatBox.appendChild(div);

    // Hide placeholder
    chatBox.classList.add("has-message");

    chatBox.scrollTop = chatBox.scrollHeight;
}

// ===============================
// FUNGSI MEMANGGIL API GEMINI
// ===============================
async function callGemini(prompt) {
    try {
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
                GEMINI_API_KEY,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ]
                })
            }
        );

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (err) {
        return "⚠️ Terjadi kesalahan saat menghubungi AI.";
    }
}

// ===============================
// FORM SUBMIT
// ===============================
pmForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Ambil data
    const rawInput = {
        pm10: document.getElementById("pm10").value,
        so2: document.getElementById("so2").value,
        co: document.getElementById("co").value,
        o3: document.getElementById("o3").value,
        no2: document.getElementById("no2").value,
        max_val: document.getElementById("max_val").value,
        year: document.getElementById("year").value,
        month: document.getElementById("month").value,
        day: document.getElementById("day").value,
        stasiun_code: document.getElementById("stasiun_code").value
    };

    // Prompt ekstraksi JSON
    const extractionPrompt = `
    Extract the following values into strict JSON ONLY.

    Form data:
    ${JSON.stringify(rawInput)}

    Format:
    {
        "pm10": number,
        "so2": number,
        "co": number,
        "o3": number,
        "no2": number,
        "max_val": number,
        "year": number,
        "month": number,
        "day": number,
        "stasiun_code": number
    }
    `;

    appendMessage("bot", "<em>Memproses data...</em>");

    // JSON extraction via Gemini
    let extractedText = await callGemini(extractionPrompt);
    extractedText = extractedText.replace(/```json|```/g, "").trim();

    let extracted;

    try {
        extracted = JSON.parse(extractedText);
    } catch (err) {
        appendMessage("bot", "AI gagal mengekstraksi data JSON.");
        return;
    }

    // Kirim ke backend
    let response;
    try {
        response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(extracted)
        });
    } catch (err) {
        appendMessage("bot", "❌ Tidak dapat terhubung ke backend.");
        return;
    }

    const predictionData = await response.json();
    const pm25 = predictionData.pm25_prediction;

    // Prompt penjelasan
    const explanationPrompt = `
    Prediksi PM2.5 adalah ${pm25}.
    Berikan arti besarnya, risiko kesehatan, dan rekomendasi.
    Maksimal 3 kalimat.
    Gaya chatbot ramah.
    `;

    const finalAnswer = await callGemini(explanationPrompt);
    appendMessage("bot", finalAnswer);
});

// ===============================
// TOOLTIP INPUT
// ===============================
document.querySelectorAll("#pm-form input").forEach(input => {
    const desc = document.getElementById("desc-" + input.id);

    input.addEventListener("focus", () => {
        if (desc) {
            desc.innerHTML = input.dataset.desc;
            desc.style.display = "block";
        }
    });

    input.addEventListener("blur", () => {
        if (desc) {
            desc.innerHTML = "";
            desc.style.display = "none";
        }
    });
});