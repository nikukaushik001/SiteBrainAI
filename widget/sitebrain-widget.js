(function() {
    // Read dataset options from current script element
    const currentScript = document.currentScript || document.querySelector('script[src*="sitebrain-widget.js"]');
    const botName = (currentScript && currentScript.dataset.botName) || "BrainDesk AI";
    const widgetId = (currentScript && currentScript.dataset.widgetId) || "default";
    const primaryColor = (currentScript && currentScript.dataset.color) || "#6366f1";
    const greetingMsg = (currentScript && currentScript.dataset.greeting) || "Hi there! How can I help you today?";
    const position = (currentScript && currentScript.dataset.position) || "bottom-right";
    const requireLead = (currentScript && currentScript.dataset.requireLead === "true");
    const starterPromptsRaw = (currentScript && currentScript.dataset.starterPrompts) || "";
    const starterChips = starterPromptsRaw ? starterPromptsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Backend endpoints
    const API_URL = "http://127.0.0.1:8001/chat";
    const LEAD_API_URL = "http://127.0.0.1:8001/api/leads";
    const CSS_URL = "http://127.0.0.1:8001/static/sitebrain-widget.css";

    // Check if lead was already captured for this session
    let leadSubmitted = !requireLead || (sessionStorage.getItem(`sb_lead_${widgetId}`) === "true");

    // Persistent Chat Session ID
    const sessionKey = `sb_session_${widgetId}`;
    let sessionId = localStorage.getItem(sessionKey);
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(sessionKey, sessionId);
    }


    // 1. Inject the CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_URL;
    document.head.appendChild(link);

    // 2. Create HTML Structure
    const existingContainer = document.getElementById("sitebrain-widget-container");
    if (existingContainer) {
        existingContainer.remove();
    }
    
    const container = document.createElement("div");
    container.id = "sitebrain-widget-container";
    if (position === "bottom-left") {
        container.style.right = "auto";
        container.style.left = "20px";
    }
    
    container.innerHTML = `
        <div id="sitebrain-chat-window" class="${position === 'bottom-left' ? 'sb-pos-left' : ''}">
            <div class="sb-header" style="background: ${primaryColor};">
                <h3>${botName}</h3>
                <button class="sb-close-btn" id="sb-close">&times;</button>
            </div>

            <!-- Lead Capture Form View -->
            <div id="sb-lead-screen" class="sb-lead-screen" style="display: ${leadSubmitted ? 'none' : 'flex'};">
                <h4>Welcome! Please introduce yourself to start chatting.</h4>
                <div class="sb-lead-form">
                    <input type="text" id="sb-lead-name" placeholder="Your Name *" required />
                    <input type="email" id="sb-lead-email" placeholder="Your Email *" required />
                    <button id="sb-lead-submit" style="background: ${primaryColor};">Start Chatting</button>
                    <div id="sb-lead-error" class="sb-lead-error"></div>
                </div>
            </div>

            <!-- Main Chat View -->
            <div id="sb-chat-screen" style="display: ${leadSubmitted ? 'flex' : 'none'}; flex-direction: column; height: 100%;">
                <div class="sb-messages" id="sb-messages">
                    <div class="sb-message sb-ai">${greetingMsg}</div>
                    <div class="sb-loading" id="sb-loading">AI is thinking...</div>
                </div>
                ${starterChips.length > 0 ? `
                <div class="sb-chips-container" id="sb-chips">
                    ${starterChips.map(chip => `<button class="sb-chip" style="border-color: ${primaryColor}; color: ${primaryColor};" data-prompt="${chip}">${chip}</button>`).join('')}
                </div>` : ''}
                <div class="sb-input-area">
                    <button id="sb-mic" style="background: transparent; color: ${primaryColor}; border: 1px solid ${primaryColor}; padding: 0 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Use Voice">🎙️</button>
                    <input type="text" id="sb-input" placeholder="Ask a question..." autocomplete="off" />
                    <button id="sb-send" style="background: ${primaryColor};">Send</button>
                </div>
            </div>
        </div>
        <button id="sitebrain-chat-btn" style="background: ${primaryColor};">
            <svg viewBox="0 0 24 24">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" />
            </svg>
        </button>
    `;
    
    document.body.appendChild(container);

    // 3. Elements and Event Listeners
    const chatBtn = document.getElementById("sitebrain-chat-btn");
    const closeBtn = document.getElementById("sb-close");
    const chatWindow = document.getElementById("sitebrain-chat-window");
    const sendBtn = document.getElementById("sb-send");
    const micBtn = document.getElementById("sb-mic");
    const input = document.getElementById("sb-input");
    const messagesArea = document.getElementById("sb-messages");
    let loading = document.getElementById("sb-loading");

    const leadScreen = document.getElementById("sb-lead-screen");
    const chatScreen = document.getElementById("sb-chat-screen");
    const leadSubmitBtn = document.getElementById("sb-lead-submit");
    const leadNameInput = document.getElementById("sb-lead-name");
    const leadEmailInput = document.getElementById("sb-lead-email");
    const leadError = document.getElementById("sb-lead-error");

    // Toggle Chat Window
    chatBtn.addEventListener("click", () => {
        chatWindow.classList.toggle("sb-active");
        if(chatWindow.classList.contains("sb-active")) {
            if (leadSubmitted) {
                input.focus();
            } else {
                leadNameInput.focus();
            }
        }
    });

    closeBtn.addEventListener("click", () => {
        chatWindow.classList.remove("sb-active");
    });

    // Handle Lead Submission
    leadSubmitBtn.addEventListener("click", async () => {
        const name = leadNameInput.value.trim();
        const email = leadEmailInput.value.trim();

        if (!name || !email) {
            leadError.textContent = "Please provide both name and email.";
            return;
        }

        leadSubmitBtn.disabled = true;
        leadSubmitBtn.textContent = "Connecting...";
        leadError.textContent = "";

        try {
            await fetch(LEAD_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, widget_id: widgetId })
            });

            sessionStorage.setItem(`sb_lead_${widgetId}`, "true");
            leadSubmitted = true;
            leadScreen.style.display = "none";
            chatScreen.style.display = "flex";
            input.focus();
        } catch (err) {
            console.error("Lead submission error:", err);
            // Even if server error, allow user to chat
            leadScreen.style.display = "none";
            chatScreen.style.display = "flex";
            input.focus();
        }
    });

    // Handle Sending Messages
    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;

        // Add user message to UI
        addMessage(text, "sb-user");
        input.value = "";
        
        // Show loading
        loading.style.display = "block";
        messagesArea.scrollTop = messagesArea.scrollHeight;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: text, widget_id: widgetId, session_id: sessionId })
            });

            if (!response.ok) throw new Error("API Error");

            const data = await response.json();
            
            // Hide loading and add AI message with optional sources
            loading.style.display = "none";
            addMessage(data.answer, "sb-ai", data.sources);
            
            // Optional: Synthesize Speech
            speakText(data.answer);

        } catch (error) {
            loading.style.display = "none";
            addMessage("Sorry, I'm having trouble connecting to the server.", "sb-ai");
            console.error("BrainDesk Error:", error);
        }
    };

    function addMessage(text, className, sources = []) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `sb-message ${className}`;
        
        let contentHtml = `<div>${escapeHtml(text)}</div>`;
        
        if (sources && sources.length > 0) {
            contentHtml += `<div class="sb-sources-container">
                <span class="sb-sources-label">Sources:</span>
                ${sources.map(src => `<span class="sb-source-badge" title="${escapeHtml(src)}">${escapeHtml(getBasename(src))}</span>`).join("")}
            </div>`;
        }

        msgDiv.innerHTML = contentHtml;
        messagesArea.insertBefore(msgDiv, loading);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function getBasename(pathStr) {
        try {
            if (pathStr.startsWith("http")) {
                const u = new URL(pathStr);
                return u.hostname + u.pathname;
            }
            return pathStr.split(/[\\/]/).pop();
        } catch {
            return pathStr;
        }
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // Starter chip click: populate input and send
    if (starterChips.length > 0) {
        const chipsContainer = document.getElementById("sb-chips");
        if (chipsContainer) {
            chipsContainer.querySelectorAll(".sb-chip").forEach(chip => {
                chip.addEventListener("click", () => {
                    input.value = chip.dataset.prompt;
                    // Hide chips after one is clicked
                    chipsContainer.style.display = "none";
                    sendMessage();
                });
            });
        }
    }

    // --- Voice AI Logic ---
    let isRecording = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            isRecording = true;
            micBtn.style.background = 'rgba(239, 68, 68, 0.2)'; // Light red
            micBtn.innerText = '🔴';
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
            sendMessage();
        };
        
        recognition.onerror = (e) => {
            console.error("Speech Recognition Error", e);
            stopRecording();
        };
        
        recognition.onend = () => {
            stopRecording();
        };
    } else {
        micBtn.style.display = 'none'; // Hide if browser doesn't support
    }
    
    function stopRecording() {
        isRecording = false;
        micBtn.style.background = 'transparent';
        micBtn.innerText = '🎙️';
        if (recognition) recognition.stop();
    }
    
    micBtn.addEventListener("click", () => {
        if (!recognition) return alert("Your browser does not support Voice AI.");
        if (isRecording) {
            stopRecording();
        } else {
            recognition.start();
        }
    });

    function speakText(text) {
        if ('speechSynthesis' in window) {
            // Very simple text cleanup for speech
            const cleanText = text.replace(/[*#]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1'); 
            const utterance = new SpeechSynthesisUtterance(cleanText);
            // Optionally select a nice voice here, skipping for simple implementation
            window.speechSynthesis.speak(utterance);
        }
    }
    // -----------------------

    // Fetch chat history on load
    async function loadChatHistory() {
        if (!sessionId) return;
        try {
            const res = await fetch(`http://127.0.0.1:8001/chat/history/${sessionId}`);
            if (res.ok) {
                const history = await res.json();
                if (history && history.length > 0) {
                    // Remove default greeting
                    messagesArea.innerHTML = `<div class="sb-loading" id="sb-loading" style="display:none;">AI is thinking...</div>`;
                    
                    // Re-assign loading element BEFORE adding messages
                    loading = document.getElementById("sb-loading");

                    history.forEach(msg => {
                        addMessage(msg.content, msg.role === 'user' ? 'sb-user' : 'sb-ai');
                    });
                }
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }
    loadChatHistory();

})();
