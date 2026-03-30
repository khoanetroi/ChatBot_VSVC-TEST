document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chatBox');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const micBtn = document.getElementById('micBtn');

    // Danh sách câu hỏi gợi ý theo lĩnh vực tuyển sinh
    const SUGGESTED_QUESTIONS = [
        "Cho mình biết các ngành nghề đang đào tạo tại trường?",
        "Thời gian đào tạo cho mỗi ngành nghề là bao lâu?",
        "Điều kiện xét tuyển vào trường được quy định như thế nào?",
        "Trường có hỗ trợ thực tập, việc làm cho sinh viên sau khi tốt nghiệp không?",
        "Ngành Công nghệ Ô tô học những gì và cơ hội việc làm ra sao?",
        "Hồ sơ đăng ký xét tuyển bao gồm những giấy tờ gì?",
        "Trường có ký túc xá cho sinh viên ở xa hay không?",
        "Sinh viên tốt nghiệp tại trường sẽ được cấp bằng cấp gì?",
        "Học ngành Cơ điện tử sau này sẽ làm những công việc chuyên môn gì?",
        "Trường đào tạo những ngành nào thuộc khối Công nghệ thông tin?"
    ];

    function getRandomSuggestions(count) {
        const shuffled = [...SUGGESTED_QUESTIONS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    function showSuggestions(dynamicQuestions = null) {
        removeSuggestions(); // Xóa gợi ý cũ

        const container = document.createElement('div');
        container.className = 'suggestions-container';
        container.id = 'suggestionsContainer';

        let questions = [];
        if (dynamicQuestions && dynamicQuestions.length > 0) {
            questions = dynamicQuestions.slice(0, 3);
        } else {
            questions = getRandomSuggestions(3);
        }

        questions.forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.textContent = q;
            btn.onclick = () => {
                messageInput.value = q;
                handleSendMessage();
            };
            container.appendChild(btn);
        });

        chatBox.appendChild(container);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function removeSuggestions() {
        const container = document.getElementById('suggestionsContainer');
        if (container) {
            container.remove();
        }
    }

    // Tự động thay đổi chiều cao của textarea
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    // Enter để gửi tin nhắn
    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    sendBtn.addEventListener('click', handleSendMessage);
    clearChatBtn.addEventListener('click', clearChat);

    // Xử lý gửi tin nhắn
    async function handleSendMessage() {
        // Mở khóa Audio (Autoplay Policy) ngay khi user tương tác đồng bộ
        if (!window.audioUnlocked) {
            window.currentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
            window.currentAudio.play().then(() => {
                window.audioUnlocked = true;
            }).catch(() => { });
        }

        const text = messageInput.value.trim();
        if (!text) return;

        // Ẩn bảng gợi ý ngay khi người dùng bắt đầu gửi tin
        removeSuggestions();

        // Tắt mic nếu đang bật
        if (window.isRecordingMic) {
            window.isExplicitlyStopped = true;
            try { window.recognitionObj.stop(); } catch (e) { }
        }
        window.finalTranscript = '';

        // Reset input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        // Hiển thị tin nhắn người dùng
        appendMessage('user', text);

        // Hiển thị trạng thái "đang gõ..."
        const typingId = showTypingIndicator();

        // Chờ kết quả từ API
        try {
            const result = await callBotAPI(text);
            removeTypingIndicator(typingId);
            appendMessage('bot', result.reply);

            // Đọc tin nhắn bằng giọng nói (Text To Speech)
            speakText(result.reply);

            // Ưu tiên hiện các câu hỏi do bot tự nghĩ ra, nếu không có thì fallback hiện random mặc định
            if (result.suggestions && result.suggestions.length > 0) {
                showSuggestions(result.suggestions);
            } else {
                showSuggestions();
            }
        } catch (error) {
            removeTypingIndicator(typingId);
            appendMessage('bot', 'Lỗi kết nối API. Vui lòng thử lại sau.');
            console.error('API Error:', error);
            showSuggestions();
        }
    }

    // ==========================================
    // KHU VỰC DÀNH CHO BẠN (Tích hợp API ở đây)
    // ==========================================
    async function callBotAPI(userMessage) {
        const BOT_ID = '7622802208627703813';
        const PAT = 'pat_Pwd7a9XcMpZqhXjt4knYM1gT0xbTvEMOgHRK6HzV9eS8x3pl6t7ATeG22VO50Q4Z';

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
                        // Trộn "lệnh ẩn" vào tin nhắn của người dùng để ép Bot phải tự nghĩ ra câu hỏi
                        content: userMessage + "\n\n[LỆNH ẨN DÀNH CHO BOT: Ở cuối câu trả lời của bạn, hãy tạo ra 3 câu hỏi gợi ý ngắn gọn, sát với ngữ cảnh cuộc trò chuyện để người dùng có thể ấn hỏi tiếp. Format bắt buộc mỗi câu hỏi nằm trên 1 dòng mới và bắt đầu bằng chính xác chuỗi '///SUGGESTION: ']",
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

            // Xử lý tách câu hỏi gợi ý ra khỏi câu trả lời chung
            let finalReply = fullText;
            let dynamicSuggestions = [];

            if (finalReply.includes('///SUGGESTION:')) {
                const parts = finalReply.split('///SUGGESTION:');
                finalReply = parts[0].trim(); // Phần đầu tiên là nội dung trả lời thật của bot

                // Lấy ra các câu hỏi
                for (let i = 1; i < parts.length; i++) {
                    const sug = parts[i].split('\n')[0].trim(); // Lấy đúng 1 dòng
                    if (sug) dynamicSuggestions.push(sug);
                }
            }

            return {
                reply: finalReply || "Bot không có phản hồi nội dung chữ.",
                suggestions: dynamicSuggestions
            };

        } catch (error) {
            console.error("Coze API Error:", error);
            if (error.message === 'Failed to fetch') {
                return { reply: "Lỗi cấu hình mạng (CORS). Bạn hãy cài Plugin 'Moesif Origin & CORS Changer' trên Chrome, bật ON lên để test ở máy tính nhé!", suggestions: [] };
            }
            return { reply: "Lỗi: " + error.message, suggestions: [] };
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
        if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử cuộc trò chuyện?")) {
            const defaultMsg = chatBox.querySelector('.message:first-child').outerHTML;
            chatBox.innerHTML = defaultMsg;
            lucide.createIcons();
            showSuggestions(); // Khởi tạo lại gợi ý
        }
    }

    // Khởi tạo trạng thái nút send
    sendBtn.setAttribute('disabled', 'true');

    // ==========================================
    // TÍCH HỢP GIỌNG NÓI (VOICE INPUT)
    // ==========================================

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    window.isRecordingMic = false;
    window.isExplicitlyStopped = false;
    window.finalTranscript = '';

    if (SpeechRecognition) {
        window.recognitionObj = new SpeechRecognition();
        const recognition = window.recognitionObj;
        recognition.lang = 'vi-VN';
        recognition.interimResults = true;
        recognition.continuous = false; // False để tránh lỗi trên một số trình duyệt (Android)

        recognition.onstart = () => {
            window.isRecordingMic = true;
            micBtn.classList.add('recording');
            messageInput.placeholder = "Đang nghe... (Nhấn vào Mic để dừng)";
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    window.finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            messageInput.value = window.finalTranscript + interimTranscript;
            messageInput.style.height = 'auto';
            messageInput.style.height = (messageInput.scrollHeight) + 'px';

            if (messageInput.value.trim().length > 0) {
                sendBtn.removeAttribute('disabled');
            }
        };

        recognition.onend = () => {
            if (!window.isExplicitlyStopped) {
                // Tự động bật lại nếu chưa bấm dừng mic (do continuous=false tự ngắt khi ngập ngừng)
                try {
                    recognition.start();
                } catch (e) {
                    window.isRecordingMic = false;
                    micBtn.classList.remove('recording');
                    messageInput.placeholder = "Nhập tin nhắn hoặc dùng giọng nói...";
                }
            } else {
                window.isRecordingMic = false;
                micBtn.classList.remove('recording');
                messageInput.placeholder = "Nhập tin nhắn hoặc dùng giọng nói...";
            }
        };

        recognition.onerror = (event) => {
            console.error("Lỗi nhận diện giọng nói:", event.error);
            if (event.error === 'no-speech') {
                return; // Bỏ qua lỗi no-speech, onend sẽ tự restart
            }
            window.isExplicitlyStopped = true;
            window.isRecordingMic = false;
            micBtn.classList.remove('recording');

            if (event.error === 'not-allowed') {
                alert("Bạn cần cấp quyền truy cập Mic trong biểu tượng ổ khóa trình duyệt!");
            } else if (event.error !== 'aborted') {
                alert("Lỗi Micro API: " + event.error);
            }
            messageInput.placeholder = "Nhập tin nhắn hoặc dùng giọng nói...";
        };

        micBtn.addEventListener('click', () => {
            if (window.isRecordingMic) {
                window.isExplicitlyStopped = true;
                try { recognition.stop(); } catch (e) { }
            } else {
                window.isExplicitlyStopped = false;
                // Giữ lại nội dung đang gõ thay vì xóa sạch
                window.finalTranscript = messageInput.value;
                if (window.finalTranscript.length > 0 && !window.finalTranscript.endsWith(' ')) {
                    window.finalTranscript += ' ';
                }
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Lỗi khi bật mic:", e);
                    alert("System Error khi bật Mic: " + e.message);
                }
            }
        });
    } else {
        micBtn.addEventListener('click', () => {
            alert("Trình duyệt của bạn (hoặc ứng dụng đang mở link) KHÔNG hỗ trợ chức năng nhận diện giọng nói. Vui lòng copy link ra mở bằng Google Chrome hoặc Safari nhé!");
        });
        console.warn("Trình duyệt không hỗ trợ nhận diện giọng nói.");
    }

    // ==========================================
    // TÍCH HỢP ĐỌC VĂN BẢN (TEXT TO SPEECH) QUA J2TEAM API
    // ==========================================
    window.audioQueue = [];
    window.currentAudio = null;

    function splitTextToChunks(text, maxLength) {
        // Tách câu theo dấu ngắt câu hoặc dòng mới
        const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
        let chunks = [];
        let currentChunk = "";

        sentences.forEach(sentence => {
            if (sentence.length > maxLength) {
                let words = sentence.split(' ');
                words.forEach(word => {
                    if (currentChunk.length + word.length + 1 > maxLength) {
                        if (currentChunk.trim()) chunks.push(currentChunk.trim());
                        currentChunk = word + " ";
                    } else {
                        currentChunk += word + " ";
                    }
                });
            } else if (currentChunk.length + sentence.length > maxLength) {
                if (currentChunk.trim()) chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                currentChunk += sentence;
            }
        });
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        return chunks;
    }

    function speakText(text) {
        // Dừng âm thanh cũ
        if (window.currentAudio) {
            window.currentAudio.pause();
            window.currentAudio.currentTime = 0;
        }
        window.audioQueue = []; // Xóa hàng đợi cũ

        // Xóa bỏ các ký tự markdown như *, _ để đọc tự nhiên hơn
        const cleanText = text.replace(/[*_#`]/g, '').trim();

        // Chia nhỏ để API chạy mượt (giới hạn 500 ký tự cho an toàn)
        const chunks = splitTextToChunks(cleanText, 500);
        window.audioQueue = chunks;
        playNextAudio();
    }

    function playNextAudio() {
        if (!window.audioQueue || window.audioQueue.length === 0) return;

        const chunk = window.audioQueue.shift();

        // Tự động nhận diện môi trường: Nếu chạy local thì qua cổng 3000, nếu trên Vercel thì dùng đường dẫn tương đối
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        const baseUrl = isLocal ? 'http://localhost:3000' : '';
        const url = `${baseUrl}/api/tts?text=${encodeURIComponent(chunk)}&voice=vi-VN-HoaiMyNeural`;

        window.currentAudio = new Audio(url);
        window.currentAudio.onended = playNextAudio;
        window.currentAudio.play().catch(e => {
            console.error("Lỗi phát audio:", e);
            // Thử tiếp đoạn kế tiếp nếu lỗi
            playNextAudio();
        });
    }

    // Khởi tạo các gợi ý ngay lần đầu tiên mở trang
    setTimeout(() => {
        showSuggestions();
    }, 600);
});

