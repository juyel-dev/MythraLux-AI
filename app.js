import * as webllm from "./webllm.bundle.js";

const chatBox = document.getElementById("chatBox");
const loadBtn = document.getElementById("loadBtn");
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const modelSelect = document.getElementById("modelSelect");
const systemPromptInput = document.getElementById("systemPrompt");
const status = document.getElementById("status");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");

let engine = null;
let history = [];

function log(role, text) {
  const div = document.createElement("div");
  div.innerHTML = `<strong>${role}:</strong> ${text.replace(/\n/g,"<br>")}`;
  div.className = role === "User" ? "text-blue-300" : "text-green-300";
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

loadBtn.onclick = async () => {
  loadBtn.disabled = true;
  progressWrap.classList.remove("hidden");

  const model = modelSelect.value;

  try {
    status.textContent = "Preloading model…";

    await webllm.preloadModel({
      model,
      engineConfig: { device: "auto" }
    });

    engine = await webllm.CreateMLCEngine(model, {
      initProgressCallback: (r) => {
        status.textContent = r.text;
        const m = r.text.match(/\[(\d+)\/(\d+)\]/);
        if (m) {
          progressBar.style.width = (m[1]/m[2])*100 + "%";
        }
      }
    });

    status.textContent = "Model ready (offline)";
    sendBtn.disabled = false;
    loadBtn.textContent = "Loaded";

  } catch (e) {
    status.textContent = "Error: " + e.message;
    loadBtn.disabled = false;
  }
};

sendBtn.onclick = async () => {
  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = "";
  sendBtn.disabled = true;

  log("User", text);

  const aiDiv = log("AI", "Thinking…");
  let response = "";

  history.push({ role: "user", content: text });

  const messages = [];
  if (systemPromptInput.value) {
    messages.push({ role: "system", content: systemPromptInput.value });
  }
  messages.push(...history);

  const stream = await engine.chat.completions.create({
    messages,
    stream: true
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || "";
    response += token;
    aiDiv.innerHTML = `<strong>AI:</strong> ${response.replace(/\n/g,"<br>")}`;
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  history.push({ role: "assistant", content: response });
  sendBtn.disabled = false;
};
