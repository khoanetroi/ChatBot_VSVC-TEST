document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chatBox');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');

    // Tự động thay đổi chiều cao của textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if(this.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    // Enter để gửi tin nhắn
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    sendBtn.addEventListener('click', handleSendMessage);
    clearChatBtn.addEventListener('click', clearChat);

    // Xử lý gửi tin nhắn
    async function handleSendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        // Reset input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        // Hiển thị tin nhắn người dùng
        appendMessage('user', text);

        // Hiển thị trạng thái "đang gõ..."
        const typingId = showTypingIndicator();

        // Chờ kết quả từ API (Gọi hàm giả lập)
        try {
            const apiResponse = await callBotAPI(text);
            removeTypingIndicator(typingId);
            appendMessage('bot', apiResponse);
        } catch (error) {
            removeTypingIndicator(typingId);
            appendMessage('bot', 'Lỗi kết nối API. Vui lòng thử lại sau.');
            console.error('API Error:', error);
        }
    }

    // ==========================================
    // KHU VỰC DÀNH CHO BẠN (Tích hợp API ở đây)
    // ==========================================
    async function callBotAPI(userMessage) {
        const BOT_ID = '7622191921179820085';
        const PAT = 'pat_GsZ8bzC5SvFzrcqorzGBkwZl2lbxnKeBhlLLEpptBBcppqrA7Oevaplgp5s5vCnU';
        
        try {
            // Sử dụng chế độ Streaming (stream: true) để nhận kết quả trực tiếp 
            // và tránh lỗi phân quyền (4100 invalid authentication) khi gọi API kiểm tra trạng thái
            const chatRes = await fetch('https://api.coze.com/v3/chat', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${PAT}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bot_id: BOT_ID,
                    user_id: "user_web_" + Math.floor(Math.random() * 100000), 
                    stream: true,
                    auto_save_history: true,
                    additional_messages: [{
                        role: 'user',
                        content: userMessage,
                        content_type: 'text'
                    }]
                })
            });
            
            if (!chatRes.ok) {
                throw new Error("Lỗi HTTP: " + chatRes.status);
            }
            
            // Đọc dữ liệu stream từ bot trả về
            const reader = chatRes.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullText = "";
            let chunkBuffer = "";
            let currentEvent = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                chunkBuffer += decoder.decode(value, { stream: true });
                const lines = chunkBuffer.split('\n');
                
                // Giữ lại dòng cuối cùng chưa hoàn thiện vào buffer
                chunkBuffer = lines.pop(); 
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    
                    if (line.startsWith('event:')) {
                        currentEvent = line.substring(6).trim();
                    } else if (line.startsWith('data:')) {
                        if (currentEvent === 'conversation.message.delta') {
                            try {
                                const dataStr = line.substring(5).trim();
                                if (dataStr === '[DONE]') continue;
                                
                                const dataObj = JSON.parse(dataStr);
                                // Chỉ cộng nối các đoạn text thuộc phần trả lời chính của bot (answer)
                                if (dataObj.type === 'answer') {
                                    fullText += dataObj.content;
                                }
                            } catch (e) {
                                console.error("Parse data error:", e, line);
                            }
                        }
                    }
                }
            }
            
            return fullText || "Bot không có phản hồi nội dung chữ.";
            
        } catch (error) {
            console.error("Coze API Error:", error);
            if (error.message === 'Failed to fetch') {
                return "Lỗi cấu hình mạng (CORS). Bạn hãy cài Plugin 'Moesif Origin & CORS Changer' trên Chrome, bật ON lên để test ở máy tính nhé!";
            }
            return "Lỗi: " + error.message;
        }
    }

    // Hàm hiển thị tin nhắn lên UI
    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'bot' ? '<i data-lucide="bot"></i>' : '<i data-lucide="user"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const textP = document.createElement('p');
        // Xử lý Markdown cơ bản từ bot (In đậm, in nghiêng, xuống dòng)
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // In đậm
            .replace(/\*(.*?)\*/g, '<em>$1</em>')             // In nghiêng
            .replace(/\n/g, '<br>');                          // Xuống dòng
            
        // Sử dụng innerHTML để render các thẻ <strong>, <br> thay vì in ra text raw
        textP.innerHTML = formattedText;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.innerHTML = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        contentDiv.appendChild(textP);
        contentDiv.appendChild(timeSpan);

        if (sender === 'user') {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(avatarDiv); // User thì avatar bên phải
        } else {
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(contentDiv); // Bot thì avatar bên trái
        }

        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        
        // Cập nhật lại icon cho bubble mới add
        lucide.createIcons();
    }

    // Hàm hiển thị Typing indicator
    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.id = id;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i data-lucide="bot"></i>
            </div>
            <div class="message-content typing-indicator" style="display: flex;">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        lucide.createIcons();
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // Nút dọn dẹp chat
    function clearChat() {
        if(confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử cuộc trò chuyện?")) {
            const defaultMsg = chatBox.querySelector('.message:first-child').outerHTML;
            chatBox.innerHTML = defaultMsg;
            lucide.createIcons();
        }
    }

    // Khởi tạo trạng thái nút send
    sendBtn.setAttribute('disabled', 'true');
});
