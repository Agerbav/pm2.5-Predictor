const GEMINI_API_KEY = "AIzaSyD0KkoWDtI2FVXyi9B-EDgB4lHUoUJ3hQs";
const BACKEND_URL = "http://localhost:8000/predict";

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

function appendMessage(sender, text) {
    let div = document.createElement("div");
    div.classList.add("message", sender);

    // Convert newline → <br>
    const formatted = text
        .replace(/\n/g, "<br>")       // garis baru
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"); // bold markdown

    div.innerHTML = formatted;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}


async function callGemini(prompt) {
    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            })
        }
    );

    const data = await response.json();

    if (data.error) {
        console.error("Gemini API Error:", data.error);
        throw new Error(data.error.message);
    }

    return data.candidates[0].content.parts[0].text;
}



async function handleUserMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    const currentDate = new Date();

    appendMessage("user", text);
    userInput.value = "";

    // STEP 1:
    // -------------------------------------------
    // Minta Gemini mengekstrak info menjadi format backend
    // -------------------------------------------
    const extractionPrompt = `
        Extract the following user message into JSON ONLY.
        Do NOT add explanation, backticks, or text outside JSON.
        Return STRICT VALID JSON.

        User message:
        "${text}"

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

        Location mapping:
        - "jagakarsa": 1
        - "depok": 2
        - "kebon jeruk": 3
        - "bekasi": 4
        - "fatmawati": 5

        Default rule:
        - If pollutant values are missing: set values to 
            pm10: 40,
            so2: 5,
            co: 0.5,
            o3: 10,
            no2: 15,
            max_val: 60
        - If Date is missing: Set default value to 
            year = ${currentDate.getFullYear()},
            month = ${currentDate.getMonth() + 1},
            day = ${currentDate.getDate()}
        - If station missing: set stasiun_code = 1
    `;

    appendMessage("bot", "Memproses pertanyaan...");

    let extractedText = await callGemini(extractionPrompt);

    extractedText = extractedText.replace(/```json|```/g, "").trim();

    let extracted;
    try {
        extracted = JSON.parse(extractedText);

        // Normalisasi nilai yang harus angka → ubah string ke number
        extracted.pm10 = Number(extracted.pm10 || 0);
        extracted.so2 = Number(extracted.so2 || 0);
        extracted.co = Number(extracted.co || 0);
        extracted.o3 = Number(extracted.o3 || 0);
        extracted.no2 = Number(extracted.no2 || 0);
        extracted.max_val = Number(extracted.max_val || 0);

        extracted.year = Number(extracted.year || 0);
        extracted.month = Number(extracted.month || 0);
        extracted.day = Number(extracted.day || 0);

        extracted.stasiun_code = Number(extracted.stasiun_code || 0);

    } catch {
        appendMessage("bot", "Gagal memproses permintaan.");
        return;
    }

    console.log("Extracted text:" + extractedText)
    console.log("Extracted JSON:" + JSON.stringify(extracted));

    // STEP 2:
    // -------------------------------------------
    // Kirim ke backend FastAPI
    // -------------------------------------------
    const predictionRes = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extracted)
    });

    const predictionData = await predictionRes.json();
    const pm25 = predictionData.pm25_prediction;

    // STEP 3:
    // -------------------------------------------
    // Minta Gemini membuat rekomendasi dari PM2.5
    // -------------------------------------------
    const explanationPrompt = `
        Prediksi Nilai PM2.5 = ${pm25}.
        Pada tanggal = ${extracted.year} / ${extracted.month} / ${extracted.date} (Year/Month/Date)
        Dengan ringkas jelaskan arti dari nilai PM2.5 tersebut dan rekomendasi yang perlu dilakukan.
        Dan rekomendasi kegiatan yang dapat dilakukan untuk mengurangi nilai pm2.5 tersebut dalam konteks transportasi.
        Dalam beberapa kalimat tidak melebihi 3 kalimat
        Tampilkan dalam gaya percakapan chatbot ramah.
    `;  

    const finalAnswer = await callGemini(explanationPrompt);

    appendMessage("bot", finalAnswer);
}

sendBtn.addEventListener("click", handleUserMessage);

userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserMessage();
});
