// ========================================================
//                    AI书伴 — 核心应用逻辑
// ========================================================
// 模块：全局状态 | 书架 | 阅读器 | 聊天室 | DeepSeek API
// 存储：localStorage (aibook_shelf / aibook_progress / aibook_chat_*)
// ========================================================

// ========== 全局状态 ==========
const state = {
    currentPage: 'shelf',          // 'shelf' | 'reader' | 'chat'
    currentBookId: null,
    currentChapterIndex: 0,
    selectedText: '',              // 从阅读器选中的文字
    currentCharacter: 'author',    // 'author' | 'professor' | 'critic' | 'partner'
    shelf: [],                     // 书架上的书ID
    progress: {},                  // { bookId: { chapterIndex, scrollPos } }
    chatHistory: {},               // { bookId: [ {role, content, character, timestamp} ] }
    isLoadingAI: false,
};

// ========== AI 角色配置 ==========
const CHARACTERS = {
    author:     { emoji: '📚', name: '作者本人', desc: '温和、深刻，像作者在和你聊天' },
    professor:  { emoji: '🎓', name: '文学教授', desc: '学术角度，严谨但有启发性' },
    critic:     { emoji: '🔥', name: '毒舌书评人', desc: '幽默犀利，一针见血' },
    partner:    { emoji: '🤝', name: '同读伙伴', desc: '像一个和你一起读书的朋友' },
};

// ========== 数据层 ==========
function loadData() {
    try {
        const shelfData = localStorage.getItem('aibook_shelf');
        state.shelf = shelfData ? JSON.parse(shelfData) : [];

        const progressData = localStorage.getItem('aibook_progress');
        state.progress = progressData ? JSON.parse(progressData) : {};

        const charData = localStorage.getItem('aibook_character');
        state.currentCharacter = charData || 'author';

        // 聊天记录按需加载（getChatHistory）
        const keys = Object.keys(localStorage).filter(k => k.startsWith('aibook_chat_'));
        state.chatHistory = {};
        keys.forEach(k => {
            const bookId = k.replace('aibook_chat_', '');
            try { state.chatHistory[bookId] = JSON.parse(localStorage.getItem(k)); }
            catch(e) { state.chatHistory[bookId] = []; }
        });
    } catch(e) {
        console.warn('数据加载失败，使用默认值', e);
    }
}

function saveShelf() {
    localStorage.setItem('aibook_shelf', JSON.stringify(state.shelf));
}

function saveProgress() {
    localStorage.setItem('aibook_progress', JSON.stringify(state.progress));
}

function saveCharacter() {
    localStorage.setItem('aibook_character', state.currentCharacter);
}

function getChatHistory(bookId) {
    if (!state.chatHistory[bookId]) {
        const key = `aibook_chat_${bookId}`;
        try {
            const data = localStorage.getItem(key);
            state.chatHistory[bookId] = data ? JSON.parse(data) : [];
        } catch(e) {
            state.chatHistory[bookId] = [];
        }
    }
    return state.chatHistory[bookId];
}

function saveChatHistory(bookId) {
    const key = `aibook_chat_${bookId}`;
    localStorage.setItem(key, JSON.stringify(state.chatHistory[bookId] || []));
}

// ========== Toast 提示 ==========
function showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2200);
}

// ========== 页面切换 ==========
function goTo(page) {
    state.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
}

// ========== 书籍查询 ==========
function getBookById(id) {
    return BOOKS.find(b => b.id === id);
}

function getBooksOnShelf() {
    return state.shelf.map(id => getBookById(id)).filter(Boolean);
}

// ==================== 书架模块 ====================

function initShelf() {
    renderShelf();
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').classList.remove('visible');
    document.getElementById('search-clear').classList.remove('visible');
}

function searchBooks(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
        document.getElementById('search-results').classList.remove('visible');
        document.getElementById('search-clear').classList.remove('visible');
        return;
    }
    document.getElementById('search-clear').classList.add('visible');

    const results = BOOKS.filter(b => {
        return b.title.includes(q) || b.author.includes(q) || b.description.includes(q) || b.dynasty.includes(q);
    });

    renderSearchResults(results);
}

function renderSearchResults(results) {
    const container = document.getElementById('search-results');
    const list = document.getElementById('search-results-list');

    if (results.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:var(--text-mid);padding:20px;font-size:14px;">没有找到匹配的书 📭</div>';
    } else {
        list.innerHTML = results.map(b => {
            const onShelf = state.shelf.includes(b.id);
            return `
                <div class="book-card" onclick="addToShelf('${b.id}')" style="${onShelf ? 'opacity:0.6;' : ''}">
                    ${onShelf ? '<span class="book-badge">已加入</span>' : ''}
                    <span class="book-cover">${b.emoji}</span>
                    <div class="book-title">${b.title}</div>
                    <div class="book-author">${b.author}</div>
                    <div class="book-dynasty">${b.dynasty}</div>
                </div>
            `;
        }).join('');
    }

    container.classList.add('visible');
}

function addToShelf(bookId) {
    if (state.shelf.includes(bookId)) {
        showToast('这本书已经在书架上了 📚');
        return;
    }
    state.shelf.push(bookId);
    saveShelf();
    renderShelf();

    // 更新搜索结果状态
    const q = document.getElementById('search-input').value.trim();
    if (q) searchBooks(q);

    const book = getBookById(bookId);
    showToast(`已加入书架：${book.title} ✨`);
}

function removeFromShelf(bookId) {
    const book = getBookById(bookId);
    showDeleteConfirm(bookId, book.title);
}

function showDeleteConfirm(bookId, title) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-text').innerHTML = `确定要将<br><b>《${title}》</b><br>从书架移除吗？`;
    document.getElementById('modal-overlay').dataset.bookId = bookId;
    overlay.classList.add('visible');
}

function confirmDelete() {
    const bookId = document.getElementById('modal-overlay').dataset.bookId;
    state.shelf = state.shelf.filter(id => id !== bookId);
    saveShelf();
    renderShelf();

    const q = document.getElementById('search-input').value.trim();
    if (q) searchBooks(q);

    document.getElementById('modal-overlay').classList.remove('visible');
    showToast('已从书架移除 🗑️');
}

function cancelDelete() {
    document.getElementById('modal-overlay').classList.remove('visible');
}

function renderShelf() {
    const shelfBooks = getBooksOnShelf();
    const container = document.getElementById('shelf-books');
    const emptyHint = document.getElementById('empty-shelf');
    const countEl = document.getElementById('shelf-count');

    countEl.textContent = shelfBooks.length + '本';

    if (shelfBooks.length === 0) {
        container.innerHTML = '';
        emptyHint.style.display = 'block';
    } else {
        emptyHint.style.display = 'none';
        container.innerHTML = shelfBooks.map(b => `
            <div class="book-card"
                 onclick="openBook('${b.id}')"
                 oncontextmenu="event.preventDefault(); removeFromShelf('${b.id}');"
                 ontouchstart="handleShelfTouchStart(event, '${b.id}')"
                 ontouchend="handleShelfTouchEnd(event)"
                 ontouchmove="handleShelfTouchMove(event)">
                <span class="book-cover">${b.emoji}</span>
                <div class="book-title">${b.title}</div>
                <div class="book-author">${b.author}</div>
            </div>
        `).join('');
    }
}

// ========== 长按检测 ==========
let longPressTimer = null;
let longPressBookId = null;
let longPressTriggered = false;

function handleShelfTouchStart(e, bookId) {
    longPressTriggered = false;
    longPressBookId = bookId;
    longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        removeFromShelf(bookId);
        // 触觉反馈（如果支持）
        if (navigator.vibrate) navigator.vibrate(15);
    }, 600);
}

function handleShelfTouchEnd(e) {
    clearTimeout(longPressTimer);
}

function handleShelfTouchMove(e) {
    clearTimeout(longPressTimer);
}

// ==================== 阅读器模块 ====================

function openBook(bookId) {
    const book = getBookById(bookId);
    if (!book) return;

    state.currentBookId = bookId;
    state.selectedText = '';

    // 恢复阅读进度
    const saved = state.progress[bookId];
    state.currentChapterIndex = saved ? saved.chapterIndex : 0;

    // 设置导航栏
    document.getElementById('reader-book-title').textContent = book.title;

    loadChapter();
    goTo('reader');

    // 恢复滚动位置
    if (saved && saved.scrollPos) {
        setTimeout(() => {
            const el = document.getElementById('reader-content');
            el.scrollTop = saved.scrollPos * el.scrollHeight;
        }, 150);
    }
}

function loadChapter() {
    const book = getBookById(state.currentBookId);
    if (!book) return;

    const ch = book.chapters[state.currentChapterIndex];
    if (!ch) return;

    document.getElementById('reader-chapter-title').textContent = ch.title;
    document.getElementById('reader-body').innerHTML = formatContent(ch.content);

    // 章节导航
    const prevBtn = document.getElementById('chapter-prev');
    const nextBtn = document.getElementById('chapter-next');
    const indicator = document.getElementById('chapter-indicator');
    const moreHint = document.getElementById('more-hint');

    prevBtn.disabled = state.currentChapterIndex === 0;
    nextBtn.disabled = state.currentChapterIndex >= book.chapters.length - 1;

    indicator.textContent = `${state.currentChapterIndex + 1} / ${book.totalChapters || book.chapters.length}`;

    // 长篇书的提示
    if (book.type === 'long' && state.currentChapterIndex >= book.chapters.length - 1) {
        moreHint.style.display = 'block';
        nextBtn.style.display = 'none';
    } else {
        moreHint.style.display = 'none';
        nextBtn.style.display = '';
    }

    // 滚动到顶部
    document.getElementById('reader-content').scrollTop = 0;
}

function formatContent(text) {
    // 按双换行分段，按单换行分行
    return text.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '<br>';
        return `<p>${escapeHtml(trimmed)}</p>`;
    }).join('');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function prevChapter() {
    if (state.currentChapterIndex > 0) {
        state.currentChapterIndex--;
        loadChapter();
        saveCurrentProgress();
    }
}

function nextChapter() {
    const book = getBookById(state.currentBookId);
    if (book && state.currentChapterIndex < book.chapters.length - 1) {
        state.currentChapterIndex++;
        loadChapter();
        saveCurrentProgress();
    }
}

function saveCurrentProgress() {
    if (!state.currentBookId) return;
    const el = document.getElementById('reader-content');
    const scrollPos = el.scrollHeight > 0 ? el.scrollTop / el.scrollHeight : 0;

    state.progress[state.currentBookId] = {
        chapterIndex: state.currentChapterIndex,
        scrollPos: scrollPos,
    };
    saveProgress();
}

// ========== 选中文字检测 ==========
let selectionCheckTimer = null;

function initSelectionHandler() {
    document.addEventListener('selectionchange', () => {
        if (state.currentPage !== 'reader') return;

        clearTimeout(selectionCheckTimer);
        selectionCheckTimer = setTimeout(() => {
            handleSelection();
        }, 300);
    });

    // 点击其他地方隐藏弹出按钮
    document.addEventListener('click', (e) => {
        if (e.target.closest('.ask-ai-popup')) return;
        hideAskAiPopup();
    });
}

function handleSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (!text || text.length < 2) {
        hideAskAiPopup();
        return;
    }

    // 确保选中内容在阅读器内
    const readerContent = document.getElementById('reader-body');
    if (!readerContent || !readerContent.contains(selection.anchorNode)) {
        hideAskAiPopup();
        return;
    }

    state.selectedText = text;

    // 获取选中位置
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const popup = document.getElementById('ask-ai-popup');
    popup.style.top = (rect.top - 50) + 'px';
    popup.style.left = (rect.left + rect.width / 2) + 'px';
    popup.classList.add('visible');
}

function hideAskAiPopup() {
    document.getElementById('ask-ai-popup').classList.remove('visible');
}

function askAI() {
    const text = state.selectedText;
    hideAskAiPopup();
    window.getSelection().removeAllRanges();
    openChat(text);
}

// ==================== 聊天模块 ====================

function openChat(selectedText) {
    if (!state.currentBookId) return;

    const book = getBookById(state.currentBookId);
    document.getElementById('chat-book-title').textContent = book.title;

    state.selectedText = selectedText || '';

    // 如果是首次打开且有选中文字，添加引用消息
    const history = getChatHistory(state.currentBookId);

    if (selectedText && history.length === 0) {
        history.push({
            role: 'quote',
            content: selectedText,
            timestamp: Date.now(),
        });
        saveChatHistory(state.currentBookId);
    }

    renderChat();
    updateCharacterUI();
    goTo('chat');

    // 滚动到底部
    setTimeout(scrollChatBottom, 200);
}

function renderChat() {
    const history = getChatHistory(state.currentBookId);
    const container = document.getElementById('chat-messages');
    const empty = document.getElementById('chat-empty');

    if (history.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        document.getElementById('typing-indicator').classList.remove('visible');
        return;
    }

    empty.style.display = 'none';

    let html = '';
    history.forEach(msg => {
        if (msg.role === 'quote') {
            html += `
                <div class="chat-quote">
                    <span class="quote-label">📖 书中原文</span>
                    ${escapeHtml(msg.content)}
                </div>
            `;
        } else if (msg.role === 'user') {
            html += `<div class="chat-bubble chat-bubble-user">${escapeHtml(msg.content)}</div>`;
        } else if (msg.role === 'ai') {
            const charInfo = CHARACTERS[msg.character] || CHARACTERS.author;
            html += `
                <div class="chat-bubble chat-bubble-ai">
                    <div style="font-size:12px;color:var(--text-mid);margin-bottom:4px;">${charInfo.emoji} ${charInfo.name}</div>
                    ${formatAIResponse(msg.content)}
                </div>
            `;
        }
    });

    container.innerHTML = html;
}

function formatAIResponse(text) {
    // 简单格式化：换行转br
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function scrollChatBottom() {
    const container = document.getElementById('chat-messages');
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    if (state.isLoadingAI) return;

    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    const bookId = state.currentBookId;
    const book = getBookById(bookId);
    const history = getChatHistory(bookId);

    // 添加用户消息
    history.push({ role: 'user', content: msg, timestamp: Date.now() });
    saveChatHistory(bookId);
    input.value = '';
    renderChat();
    scrollChatBottom();

    // 显示加载
    state.isLoadingAI = true;
    document.getElementById('typing-indicator').classList.add('visible');
    document.getElementById('btn-send').disabled = true;
    scrollChatBottom();

    try {
        const aiReply = await callDeepSeek(bookId, book, history, msg);
        if (aiReply) {
            history.push({
                role: 'ai',
                content: aiReply,
                character: state.currentCharacter,
                timestamp: Date.now(),
            });
            saveChatHistory(bookId);
        }
    } catch (e) {
        history.push({
            role: 'ai',
            content: '抱歉，AI 暂时无法回复。请检查网络连接和 API Key 配置后重试。',
            character: state.currentCharacter,
            timestamp: Date.now(),
        });
        saveChatHistory(bookId);
    } finally {
        state.isLoadingAI = false;
        document.getElementById('typing-indicator').classList.remove('visible');
        document.getElementById('btn-send').disabled = false;
        renderChat();
        scrollChatBottom();
    }
}

// ========== DeepSeek API 调用 ==========

function buildSystemPrompt(book, character) {
    const charPrompts = {
        author: `你现在扮演《${book.title}》的作者${book.authorName}。请以作者的口吻，温和而深刻地回应读者。你了解自己作品的每一个细节和创作初衷。回答时像一个在书房里与读者促膝长谈的作家，可以分享创作时的想法、人物的内心世界。字数控制在200字以内。`,
        professor: `你是一位中国文学教授，专攻《${book.title}》的研究。请从学术角度严谨分析，引用文本细节，提供有启发性的解读。可以涉及文学手法、历史背景、主题思想等。回答要有深度但不要太学术腔。字数控制在300字以内。`,
        critic: `你是一个以毒舌著称的书评人，对《${book.title}》有着犀利甚至刻薄的见解。你的评论一针见血、幽默犀利，不拐弯抹角。但你并非无理取闹，你的批评背后是对文学的深刻理解。像一个在豆瓣写短评的人，有趣、尖锐、让人会心一笑。字数控制在200字以内。`,
        partner: `你是一个和用户一起读《${book.title}》的朋友。你的语气轻松、真诚，像一个坐在旁边的书友。你可以分享自己的阅读感受、联想到的生活经历、对人物的个人看法。不需要很专业，但要真诚、有共鸣。像一个在读书会上认识的朋友那样聊天。字数控制在200字以内。`,
    };

    return charPrompts[character] || charPrompts.author;
}

async function callDeepSeek(bookId, book, history, currentMsg) {
    // 构建消息列表
    const messages = [
        { role: 'system', content: buildSystemPrompt(book, state.currentCharacter) },
    ];

    // 添加最近的对话历史（最多10轮 = 20条消息）
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
        if (msg.role === 'quote') {
            // 引用：合并到下一条用户消息中
            continue;
        }
        if (msg.role === 'user' || msg.role === 'ai') {
            messages.push({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.content,
            });
        }
    }

    // 如果最近有引用消息，在最后一条用户消息前加上引用
    const lastQuote = recentHistory.filter(m => m.role === 'quote').pop();
    if (lastQuote && lastQuote.content) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'user') {
            lastMsg.content = `我正在读《${book.title}》，读到了这段话：\n\n「${lastQuote.content}」\n\n${lastMsg.content}`;
        }
    }

    // 调用 API
    const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
            model: CONFIG.model,
            messages: messages,
            temperature: CONFIG.temperature,
            max_tokens: CONFIG.maxTokens,
            stream: false,
        }),
    });

    if (!response.ok) {
        const status = response.status;
        if (status === 401) throw new Error('API Key 无效');
        if (status === 429) throw new Error('请求太频繁，请稍后再试');
        throw new Error(`API 错误: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('AI 返回为空');

    return content;
}

// ========== 角色切换 ==========
function showCharacterPicker() {
    document.getElementById('character-modal').classList.add('visible');
    updateCharacterUI();
}

function hideCharacterPicker() {
    document.getElementById('character-modal').classList.remove('visible');
}

function selectCharacter(charKey) {
    state.currentCharacter = charKey;
    saveCharacter();
    hideCharacterPicker();
    updateCharacterUI();

    const info = CHARACTERS[charKey];
    showToast(`已切换为：${info.emoji} ${info.name}`);
}

function updateCharacterUI() {
    const info = CHARACTERS[state.currentCharacter];
    document.getElementById('current-char-display').textContent = info.emoji;

    document.querySelectorAll('.character-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.char === state.currentCharacter);
    });
}

// ========== 阅读器滚动时保存进度 ==========
let scrollSaveTimer = null;
function initScrollSaver() {
    const readerContent = document.getElementById('reader-content');
    if (readerContent) {
        readerContent.addEventListener('scroll', () => {
            clearTimeout(scrollSaveTimer);
            scrollSaveTimer = setTimeout(saveCurrentProgress, 500);
        }, { passive: true });
    }
}

// ========== 键盘发送 ==========
function initKeyboardHandler() {
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// ========== 应用初始化 ==========
function initApp() {
    loadData();
    initShelf();
    initSelectionHandler();
    initScrollSaver();
    initKeyboardHandler();

    // 搜索框事件
    document.getElementById('search-input').addEventListener('input', (e) => {
        searchBooks(e.target.value);
    });

    document.getElementById('search-clear').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        document.getElementById('search-results').classList.remove('visible');
        document.getElementById('search-clear').classList.remove('visible');
    });

    console.log('📚 AI书伴 初始化完成');
    console.log('  书架：' + state.shelf.length + '本书');
    console.log('  角色：' + CHARACTERS[state.currentCharacter].name);
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);

// ========== Service Worker 注册 ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {
            // SW注册失败不影响主应用
        });
    });
}
