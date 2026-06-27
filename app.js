// ========================================================
//                    AI书伴 — 核心应用逻辑 V3
// ========================================================

// ========== 全局状态 ==========
const state = {
    page: 'shelf',
    bookId: null,
    chIndex: 0,
    selText: '',
    character: 'author',  // author | professor | critic | partner
    shelf: [],
    progress: {},
    chatAll: {},
    loading: false,
};

const CHARS = {
    author:    { e: '📚', n: '作者本人', d: '温和、深刻，像作者在聊天' },
    professor: { e: '🎓', n: '文学教授', d: '学术角度，严谨但有启发性' },
    critic:    { e: '🔥', n: '毒舌书评人', d: '幽默犀利，一针见血' },
    partner:   { e: '🤝', n: '同读伙伴', d: '像一个一起读书的朋友' },
};

// ========== 数据层 ==========
function load() {
    try {
        state.shelf = JSON.parse(localStorage.getItem('ab_shelf') || '[]');
        state.progress = JSON.parse(localStorage.getItem('ab_prog') || '{}');
        state.character = localStorage.getItem('ab_char') || 'author';
        // chatAll 按需加载
        const keys = Object.keys(localStorage).filter(k => k.startsWith('ab_chat_'));
        state.chatAll = {};
        keys.forEach(k => {
            const bid = k.replace('ab_chat_', '');
            try { state.chatAll[bid] = JSON.parse(localStorage.getItem(k)); }
            catch(e) { state.chatAll[bid] = []; }
        });
    } catch(e) { console.warn('load fail', e); }
}

function saveShelf()     { localStorage.setItem('ab_shelf', JSON.stringify(state.shelf)); }
function saveProgress()  { localStorage.setItem('ab_prog', JSON.stringify(state.progress)); }
function saveChar()      { localStorage.setItem('ab_char', state.character); }

function getChat(bid) {
    if (!state.chatAll[bid]) {
        const key = 'ab_chat_' + bid;
        try { state.chatAll[bid] = JSON.parse(localStorage.getItem(key) || '[]'); }
        catch(e) { state.chatAll[bid] = []; }
    }
    return state.chatAll[bid];
}
function saveChat(bid) {
    localStorage.setItem('ab_chat_' + bid, JSON.stringify(state.chatAll[bid] || []));
}

function toast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

function go(p) {
    state.page = p;
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const tgt = document.getElementById('page-' + p);
    if (tgt) tgt.classList.add('active');
}

function getBook(id) { return BOOKS.find(b => b.id === id); }

// ==================== 书架 ====================

function initShelf() {
    renderShelf();
    const si = document.getElementById('search-input');
    si.value = '';
    document.getElementById('search-results').classList.remove('visible');
    document.getElementById('search-clear').classList.remove('visible');
}

function searchBooks(q) {
    const kw = q.trim().toLowerCase();
    if (!kw) {
        document.getElementById('search-results').classList.remove('visible');
        document.getElementById('search-clear').classList.remove('visible');
        return;
    }
    document.getElementById('search-clear').classList.add('visible');
    const res = BOOKS.filter(b => b.title.includes(kw) || b.author.includes(kw) || b.description.includes(kw) || b.dynasty.includes(kw));
    const list = document.getElementById('search-results-list');
    if (!res.length) {
        list.innerHTML = '<div style="text-align:center;color:var(--text-mid);padding:20px;font-size:14px;">没找到 📭</div>';
    } else {
        list.innerHTML = res.map(b => {
            const on = state.shelf.includes(b.id);
            return `<div class="book-card" onclick="addShelf('${b.id}')" style="${on?'opacity:0.5':''}">
                ${on?'<span class="book-badge">已加入</span>':''}
                <span class="book-cover">${b.emoji}</span>
                <div class="book-title">${b.title}</div>
                <div class="book-author">${b.author}</div>
            </div>`;
        }).join('');
    }
    document.getElementById('search-results').classList.add('visible');
}

function addShelf(bid) {
    if (state.shelf.includes(bid)) { toast('已在书架上 📚'); return; }
    state.shelf.push(bid);
    saveShelf();
    renderShelf();
    const q = document.getElementById('search-input').value.trim();
    if (q) searchBooks(q);
    toast('已加入：' + getBook(bid).title + ' ✨');
}

function rmShelf(bid) {
    const b = getBook(bid);
    document.getElementById('modal-text').innerHTML = '移除<br><b>《'+b.title+'》</b>？';
    document.getElementById('modal-overlay').dataset.bookId = bid;
    document.getElementById('modal-overlay').classList.add('visible');
}
function confirmDelete() {
    const bid = document.getElementById('modal-overlay').dataset.bookId;
    state.shelf = state.shelf.filter(id => id !== bid);
    saveShelf();
    renderShelf();
    const q = document.getElementById('search-input').value.trim();
    if (q) searchBooks(q);
    document.getElementById('modal-overlay').classList.remove('visible');
    toast('已移除 🗑️');
}
function cancelDelete() { document.getElementById('modal-overlay').classList.remove('visible'); }

function renderShelf() {
    var books = [];
    for (var i = 0; i < state.shelf.length; i++) {
        var b = getBook(state.shelf[i]);
        if (b) books.push(b);
    }
    var ct = document.getElementById('shelf-books');
    var em = document.getElementById('empty-shelf');
    var countEl = document.getElementById('shelf-count');
    if (countEl) countEl.textContent = books.length + '本';
    if (!ct) return;
    if (!books.length) {
        ct.innerHTML = '';
        if (em) em.style.display = 'block';
    } else {
        if (em) em.style.display = 'none';
        var html = '';
        for (var j = 0; j < books.length; j++) {
            var bk = books[j];
            html += '<div class="book-card" onclick="openBook(\''+bk.id+'\')" ontouchstart="st(event,\''+bk.id+'\')" ontouchend="et()" ontouchmove="et()"><span class="book-cover">'+bk.emoji+'</span><div class="book-title">'+bk.title+'</div><div class="book-author">'+bk.author+'</div></div>';
        }
        ct.innerHTML = html;
    }
}

// 长按
let _timer, _bid;
function st(e, bid) { _bid = bid; _timer = setTimeout(() => { rmShelf(bid); if(navigator.vibrate)navigator.vibrate(15); }, 600); }
function et() { clearTimeout(_timer); }

// ==================== 阅读器 ====================

function openBook(bid) {
    const b = getBook(bid);
    if (!b) return;
    state.bookId = bid; state.selText = '';
    const saved = state.progress[bid];
    state.chIndex = saved ? saved.chIndex : 0;
    document.getElementById('reader-book-title').textContent = b.title;
    loadChapter();
    go('reader');
    setTimeout(() => {
        if (saved && saved.scroll) {
            document.getElementById('reader-content').scrollTop = saved.scroll * document.getElementById('reader-content').scrollHeight;
        }
    }, 150);
}

function loadChapter() {
    const b = getBook(state.bookId);
    if (!b) return;
    const ch = b.chapters[state.chIndex];
    if (!ch) return;

    document.getElementById('reader-chapter-title').textContent = ch.title;
    document.getElementById('reader-body').innerHTML = fmtText(ch.content);

    const pb = document.getElementById('ch-prev'), nb = document.getElementById('ch-next');
    document.getElementById('ch-ind').textContent = (state.chIndex + 1) + ' / ' + b.chapters.length;
    pb.disabled = state.chIndex === 0;
    nb.disabled = state.chIndex >= b.chapters.length - 1;

    document.getElementById('reader-content').scrollTop = 0;
    saveCurrProgress();
}

function fmtText(t) {
    return t.split('\n').map(l => {
        const tl = l.trim();
        return tl ? '<p>'+esc(tl)+'</p>' : '<br>';
    }).join('');
}
function esc(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function prevCh() { if(state.chIndex>0){state.chIndex--;loadChapter();} }
function nextCh() { const b=getBook(state.bookId); if(b&&state.chIndex<b.chapters.length-1){state.chIndex++;loadChapter();} }

function saveCurrProgress() {
    if (!state.bookId) return;
    const el = document.getElementById('reader-content');
    const sp = el.scrollHeight > 0 ? el.scrollTop / el.scrollHeight : 0;
    state.progress[state.bookId] = { chIndex: state.chIndex, scroll: sp };
    saveProgress();
}

// ========== 选中文字 → 问AI ==========
let _selTimer;
function initSelection() {
    document.addEventListener('selectionchange', () => {
        if (state.page !== 'reader') return;
        clearTimeout(_selTimer);
        _selTimer = setTimeout(handleSel, 350);
    });
    document.addEventListener('click', e => {
        if (e.target.closest('.ask-ai-popup')) return;
        hidePopup();
    });
}
function handleSel() {
    const sel = window.getSelection();
    const txt = sel.toString().trim();
    if (!txt || txt.length < 2) { hidePopup(); return; }
    const body = document.getElementById('reader-body');
    if (!body || !body.contains(sel.anchorNode)) { hidePopup(); return; }
    state.selText = txt;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    const p = document.getElementById('ask-ai-popup');
    p.style.top = (r.top - 48) + 'px';
    p.style.left = (r.left + r.width/2) + 'px';
    p.classList.add('visible');
}
function hidePopup() { document.getElementById('ask-ai-popup').classList.remove('visible'); }
function askAI() {
    const txt = state.selText;
    hidePopup();
    window.getSelection().removeAllRanges();
    enterChat(txt);
}

// ==================== 聊天室 ====================

function enterChat(selText) {
    if (!state.bookId) return;
    var b = getBook(state.bookId);
    document.getElementById('chat-book-title').textContent = b.title;

    var hist = getChat(state.bookId);
    if (selText && selText.trim() && hist.length === 0) {
        hist.push({ role: 'quote', content: selText.trim(), ts: Date.now() });
        saveChat(state.bookId);
    }

    go('chat');
    // 延迟渲染确保页面已切换到可见
    setTimeout(function() {
        renderChat();
        scrollBot();
    }, 80);
}

function renderChat() {
    var hist = getChat(state.bookId);
    var ct = document.getElementById('chat-messages');
    var em = document.getElementById('chat-empty');

    if (!ct) return;

    if (!hist || !hist.length) {
        ct.innerHTML = '';
        if (em) em.style.display = 'block';
        ct.style.display = 'none';
        return;
    }

    if (em) em.style.display = 'none';
    ct.style.display = 'block';
    var h = '';
    for (var i = 0; i < hist.length; i++) {
        var msg = hist[i];
        if (!msg || !msg.content) continue;
        try {
            if (msg.role === 'quote') {
                h += '<div class="chat-quote"><span class="quote-label">📖 书中原文</span>'+esc(msg.content)+'</div>';
            } else if (msg.role === 'user') {
                h += '<div class="chat-bubble chat-bubble-user">'+esc(msg.content)+'</div>';
            } else if (msg.role === 'ai') {
                var ci = (msg.character && CHARS[msg.character]) ? CHARS[msg.character] : CHARS.author;
                var body = esc(msg.content).replace(/\n/g, '<br>');
                h += '<div class="chat-bubble chat-bubble-ai"><span style="font-size:12px;color:var(--text-mid);">'+ci.e+' '+ci.n+'</span><br>'+body+'</div>';
            }
        } catch(e) {}
    }
    ct.innerHTML = h;
}

function scrollBot() {
    var ct = document.getElementById('chat-messages');
    if (ct) {
        setTimeout(function() { ct.scrollTop = ct.scrollHeight; }, 60);
    }
}

async function sendMsg() {
    if (state.loading) return;
    var inp = document.getElementById('chat-input');
    var msg = inp.value.trim();
    if (!msg) return;

    var bid = state.bookId;
    var b = getBook(bid);
    if (!b) { toast('请先打开一本书'); return; }

    var hist = getChat(bid);

    // 1. 立即添加并显示用户消息
    hist.push({ role: 'user', content: msg, ts: Date.now() });
    saveChat(bid);
    inp.value = '';
    renderChat();
    scrollBot();

    // 2. loading 状态
    state.loading = true;
    var typing = document.getElementById('typing-indicator');
    if (typing) typing.classList.add('visible');
    var sendBtn = document.getElementById('btn-send');
    if (sendBtn) sendBtn.disabled = true;
    scrollBot();

    // 3. 调用 AI
    var reply;
    try {
        reply = await callAI(b, hist, msg);
    } catch(e) {
        reply = 'AI 调用失败：' + (e.message || '未知错误');
    }

    // 4. 显示 AI 回复
    hist.push({ role: 'ai', content: reply, character: state.character, ts: Date.now() });
    saveChat(bid);

    state.loading = false;
    if (typing) typing.classList.remove('visible');
    if (sendBtn) sendBtn.disabled = false;
    renderChat();
    scrollBot();
}

// ========== DeepSeek API ==========

async function callAI(b, hist, curMsg) {
    // 检查 Key
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.length < 20 || DEEPSEEK_API_KEY.indexOf('你的') !== -1) {
        throw new Error('请先在 config.js 中填入 DeepSeek API Key');
    }

    // 构建消息
    var msgs = [
        { role: 'system', content: buildPrompt(b) },
    ];

    var recent = hist.slice(-20);
    for (var i = 0; i < recent.length; i++) {
        var m = recent[i];
        if (m.role === 'quote') continue;
        if (m.role === 'user') msgs.push({ role: 'user', content: m.content });
        if (m.role === 'ai') msgs.push({ role: 'assistant', content: m.content });
    }

    // 引用原文
    for (var j = recent.length - 1; j >= 0; j--) {
        if (recent[j].role === 'quote') {
            if (msgs.length > 0) {
                var last = msgs[msgs.length - 1];
                if (last.role === 'user') {
                    last.content = '我正在读《'+b.title+'》：\n\n「'+recent[j].content+'」\n\n'+last.content;
                }
            }
            break;
        }
    }

    var body = JSON.stringify({
        model: 'deepseek-chat',
        messages: msgs,
        temperature: 0.8,
        max_tokens: 800,
    });
    var headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
    };

    // 尝试调用 (先直连，失败走代理)
    var urls = [
        'https://api.deepseek.com/chat/completions',
        'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent('https://api.deepseek.com/chat/completions'),
    ];
    var resp = null;
    for (var k = 0; k < urls.length; k++) {
        try {
            resp = await fetch(urls[k], { method: 'POST', headers: headers, body: body });
            if (resp.ok) break;
            var sc = resp.status;
            if (sc === 401) throw new Error('API Key 无效，请在 config.js 中检查');
            if (sc === 429) throw new Error('请求太频繁，请稍后');
            resp = null; // 其他错误，试下一个代理
        } catch(e) {
            if (e.message && e.message.indexOf('API Key') === 0) throw e;
            if (e.message && e.message.indexOf('请求太频繁') === 0) throw e;
            resp = null;
        }
    }
    if (!resp) {
        throw new Error('网络连接失败，请确认网络正常后重试');
    }

    if (!resp.ok) {
        var code = resp.status;
        if (code === 401) throw new Error('API Key 无效，请检查 config.js 中的 Key 是否正确');
        if (code === 429) throw new Error('请求太频繁，请稍后再试');
        var text = '';
        try { text = await resp.text(); } catch(e) {}
        throw new Error('服务器错误('+code+'): ' + (text.slice(0, 80) || ''));
    }

    var data = await resp.json();
    var content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('AI 返回为空，请重试');
    return content;
}

function buildPrompt(b) {
    const prompts = {
        author: '你是《'+b.title+'》的作者'+b.authorName+'。用作者口吻，温和深刻地与读者对话。可以分享创作故事和人物内心的想法。回复200字左右。',
        professor: '你是研究《'+b.title+'》的文学教授。从学术角度分析文本，谈文学手法、历史背景、主题思想。回复300字左右，有深度但不掉书袋。',
        critic: '你是毒舌书评人，解读《'+b.title+'》。一针见血，幽默犀利，不拐弯抹角。像豆瓣短评那样有趣又尖锐。回复200字左右。',
        partner: '你是和读者一起看《'+b.title+'》的书友。语气轻松真诚，分享感受和联想，不需要很专业但要让人有共鸣。回复200字左右。',
    };
    return prompts[state.character] || prompts.author;
}

// ========== 角色 ==========
function showChars() { document.getElementById('character-modal').classList.add('visible'); }
function hideChars()  { document.getElementById('character-modal').classList.remove('visible'); }
function pickChar(c) {
    state.character = c; saveChar(); hideChars();
    document.getElementById('cur-char').textContent = CHARS[c].e;
    document.querySelectorAll('.character-option').forEach(el => el.classList.toggle('selected', el.dataset.char === c));
    toast('已切换：'+CHARS[c].e+' '+CHARS[c].n);
}

// ========== 滚动保存 ==========
let _scrollTimer;
function initScroll() {
    const el = document.getElementById('reader-content');
    if (el) el.addEventListener('scroll', () => { clearTimeout(_scrollTimer); _scrollTimer = setTimeout(saveCurrProgress, 500); }, {passive:true});
}

// ========== 回车发送 ==========
function initKey() {
    document.getElementById('chat-input').addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
}

// ========== 启动 ==========
function initApp() {
    load();
    initShelf();
    initSelection();
    initScroll();
    initKey();

    document.getElementById('search-input').addEventListener('input', e => searchBooks(e.target.value));
    document.getElementById('search-clear').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        searchBooks('');
    });

    console.log('📚 AI书伴 V3 就绪 | 书架:', state.shelf.length, '本');
}

document.addEventListener('DOMContentLoaded', initApp);

// SW
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}
