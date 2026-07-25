(function() {
    // Read dataset options from current script element
    const currentScript = document.currentScript || document.querySelector('script[src*="sitebrain-widget.js"]');
    const botName = (currentScript && currentScript.dataset.botName) || "DocsAura AI";
    const widgetId = (currentScript && currentScript.dataset.widgetId) || "default";
    const primaryColor = (currentScript && currentScript.dataset.color) || "#6366f1";
    const greetingMsg = (currentScript && currentScript.dataset.greeting) || "Hi there! How can I help you today?";
    const position = (currentScript && currentScript.dataset.position) || "bottom-right";

    // Determine the host where the backend is running
    const API_URL = "http://127.0.0.1:8000/chat";
    const CSS_URL = "http://127.0.0.1:8000/static/sitebrain-widget.css";


    // 1. Inject the CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_URL;
    document.head.appendChild(link);

    // 2. Create the HTML Structure
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
            <div class="sb-messages" id="sb-messages">
                <div class="sb-message sb-ai">${greetingMsg}</div>
                <div class="sb-loading" id="sb-loading">AI is thinking...</div>
            </div>
            <div class="sb-input-area">
                <input type="text" id="sb-input" placeholder="Ask a question..." autocomplete="off" />
                <button id="sb-send" style="background: ${primaryColor};">Send</button>
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
    const input = document.getElementById("sb-input");
    const messagesArea = document.getElementById("sb-messages");
    const loading = document.getElementById("sb-loading");

    // Toggle Chat Window
    chatBtn.addEventListener("click", () => {
        chatWindow.classList.toggle("sb-active");
        if(chatWindow.classList.contains("sb-active")) {
            input.focus();
        }
    });

    closeBtn.addEventListener("click", () => {
        chatWindow.classList.remove("sb-active");
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
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ question: text, widget_id: widgetId })
            });


            if (!response.ok) throw new Error("API Error");

            const data = await response.json();
            
            // Hide loading and add AI message
            loading.style.display = "none";
            addMessage(data.answer, "sb-ai");

        } catch (error) {
            loading.style.display = "none";
            addMessage("Sorry, I'm having trouble connecting to the server.", "sb-ai");
            console.error("SiteBrainAI Error:", error);
        }
    };

    function addMessage(text, className) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `sb-message ${className}`;
        msgDiv.textContent = text;
        // Insert before the loading indicator
        messagesArea.insertBefore(msgDiv, loading);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

})();
