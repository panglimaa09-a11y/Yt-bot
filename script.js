// ================= KONFIGURASI SUPABASE & GEMINI =================
const SUPABASE_URL = "https://glpsvhnffonxbkp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Ccq1Re-OykljPEIJn3FI6g_oGNPHkWQ";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const GEMINI_API_KEY = "AQ.Ab8RN6Lt6duba1juQY_RnVrZXxYXzvrJ-XRw-6Mmg9mJGVjwmQ";
// ================================================================

let currentUser = null;
let currentProfile = null;
let authMode = "login";
let toastTimer = null;
let selectedTokenPackage = 0;
let selectedAmountPackage = 0;

function showToast(msg, type = 'emerald') {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.className = `toast fixed z-[100] bottom-5 right-5 max-w-sm px-5 py-3 rounded-xl shadow-2xl text-white font-medium transition-all duration-300 show bg-${type === 'error' ? 'red' : 'emerald'}-600`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast fixed z-[100] bottom-5 right-5 max-w-sm px-5 py-3 rounded-xl shadow-2xl text-white font-medium transition-all duration-300'; }, 3500);
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

function openView(viewId) {
  document.querySelectorAll('.appview').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + viewId).classList.add('active');
  document.querySelectorAll('#sidebar .nav').forEach(n => n.classList.replace('bg-slate-800', 'text-slate-400'));
  if(event && event.currentTarget) {
    event.currentTarget.classList.replace('text-slate-400', 'bg-slate-800');
    event.currentTarget.classList.add('text-white');
  }
  if(viewId === 'admin') loadAdminTopups();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

function toggleAuthMode() {
  authMode = authMode === "login" ? "signup" : "login";
  document.getElementById('auth-title').innerText = authMode === "login" ? 'Login' : 'Daftar';
  document.getElementById('auth-submit').innerText = authMode === "login" ? 'Login' : 'Daftar';
  document.getElementById('auth-switch').innerHTML = authMode === "login" ? 
    'Belum punya akun? <span class="text-brand-400 font-semibold">Daftar</span>' : 
    'Sudah punya akun? <span class="text-brand-400 font-semibold">Login</span>';
}

async function submitAuth(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;

  if (authMode === "login") {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if(error) { showToast(error.message, 'error'); return; }
    currentUser = data.user;
    showToast('Login berhasil!');
    await loadSession(data.session);
  } else {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if(error) { showToast(error.message, 'error'); return; }
    showToast('Registrasi berhasil! Silakan login.');
    toggleAuthMode();
  }
}

async function loadSession(session) {
  if(!session?.user) return;
  currentUser = session.user;

  let { data, error } = await supabaseClient
    .from("profiles")
    .select("id,email,role,trial,tokens")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (!data) {
    const defaultRole = (currentUser.email === 'panglimaa09@gmail.com') ? 'admin' : 'user';
    const defaultTokens = defaultRole === 'admin' ? 100 : 0;

    const { data: newProfile, error: insertError } = await supabaseClient
      .from("profiles")
      .insert([
        { id: currentUser.id, email: currentUser.email, role: defaultRole, trial: 3, tokens: defaultTokens }
      ])
      .select()
      .single();

    if (insertError) {
      showToast("Gagal membuat profil: " + insertError.message, "error");
      return;
    }
    data = newProfile;
  }

  currentProfile = data;
  renderDashboard();
  showPage("app");
  openView("dashboard");
}

function renderDashboard() {
  if(!currentProfile) return;
  const email = currentProfile.email || currentUser.email || "";
  document.getElementById('user-email').innerText = email;
  document.getElementById('welcome').innerText = 'Halo, ' + email.split('@')[0] + '!';
  document.getElementById('avatar').innerText = email[0].toUpperCase();

  const isAdm = currentProfile.role === 'admin';
  document.getElementById('trial').innerText = isAdm ? '∞' : currentProfile.trial;
  document.getElementById('tokens').innerText = isAdm ? '∞' : currentProfile.tokens;
  document.getElementById('dash-trial').innerText = isAdm ? 'Unlimited' : currentProfile.trial;
  document.getElementById('dash-tokens').innerText = isAdm ? 'Unlimited' : currentProfile.tokens;
  document.getElementById('dash-role').innerText = currentProfile.role;

  if(isAdm) {
    document.getElementById('admin-nav').classList.remove('hidden');
  }
}

async function generateAIContent() {
  if(!currentProfile) return;
  const mode = document.getElementById('ai-mode').value;
  const prompt = document.getElementById('ai-prompt').value.trim();
  const box = document.getElementById('ai-result-box');
  const output = document.getElementById('ai-output');

  if(!prompt) { showToast('Masukkan topik terlebih dahulu!', 'error'); return; }
  if(currentProfile.tokens < 1 && currentProfile.role !== 'admin') {
    return showToast('Token Anda tidak cukup! Silakan melakukan top-up.', 'error');
  }

  box.classList.remove('hidden');
  output.innerText = 'Memproses dengan Gemini AI...';

  const promptText = `Bertindaklah sebagai YouTube AI Assistant. Buatkan ${mode} untuk topik: ${prompt}. Buat secara menarik dan terstruktur rapi.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });
    const json = await res.json();
    
    if(json.candidates && json.candidates[0].content) {
      output.innerText = json.candidates[0].content.parts[0].text;
      
      if(currentProfile.role !== 'admin') {
        const newTokens = currentProfile.tokens - 1;
        await supabaseClient.from('profiles').update({ tokens: newTokens }).eq('id', currentUser.id);
        currentProfile.tokens = newTokens;
        renderDashboard();
      }
      showToast('Konten AI berhasil dibuat! (-1 Token)');
    } else {
      throw new Error('Gagal dari server AI');
    }
  } catch (err) {
    output.innerText = 'Gagal mendapatkan respons AI. Periksa kembali kunci API.';
  }
}

function orderTopup(tokens, amount) {
  selectedTokenPackage = tokens;
  selectedAmountPackage = amount;
  document.getElementById('selected-package-text').innerText = `Paket: ${tokens} Token (Rp${amount.toLocaleString()}). Transfer ke DANA: 082336939662 a/n Angga Bayu Setyawan`;
  document.getElementById('topup-modal').classList.remove('hidden');
}

function closeTopupModal() {
  document.getElementById('topup-modal').classList.add('hidden');
}

async function submitTopupOrder() {
  const fileInput = document.getElementById('proof-file');
  if(fileInput.files.length === 0) { showToast('Pilih file bukti transfer!', 'error'); return; }

  const file = fileInput.files[0];
  const fileName = `${currentUser.id}-${Date.now()}.${file.name.split('.').pop()}`;
  showToast('Mengunggah bukti pembayaran...');

  try {
    const { error: uploadErr } = await supabaseClient.storage.from('bukti').upload(fileName, file);
    if(uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabaseClient.storage.from('bukti').getPublicUrl(fileName);

    const { error: dbErr } = await supabaseClient.from('topup').insert({
      user_id: currentUser.id,
      email: currentUser.email,
      paket: `${selectedTokenPackage} Token (Rp${selectedAmountPackage.toLocaleString()})`,
      bukti_path: fileName,
      status: 'pending'
    });

    if(dbErr) throw dbErr;

    showToast('Bukti berhasil dikirim! Menunggu konfirmasi admin.');
    closeTopupModal();
    fileInput.value = '';
  } catch(err) {
    showToast(err.message || 'Gagal mengirim bukti.', 'error');
  }
}

async function loadAdminTopups() {
  if(!currentProfile || currentProfile.role !== 'admin') return;

  const tbody = document.getElementById('admin-topup-list');
  const { data, error } = await supabaseClient.from('topup').select('*').eq('status', 'pending');
  
  if(error || !data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="p-3 text-center text-slate-500">Tidak ada data pending.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  data.forEach(item => {
    tbody.innerHTML += `
      <tr class="border-b border-slate-800 text-sm">
        <td class="p-3">${item.email || 'User'}<br><span class="text-xs text-slate-400">${item.paket}</span></td>
        <td class="p-3"><a href="#" onclick="viewBukti('${item.bukti_path}')" class="text-brand-400 underline">Lihat Bukti</a></td>
        <td class="p-3"><button onclick="approveTopup('${item.id}', '${item.user_id}', ${parseInt(item.paket)})" class="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-xs font-bold text-white">Setujui</button></td>
      </tr>`;
  });
}

function viewBukti(path) {
  if(!path) { showToast('Path bukti tidak ada', 'error'); return; }
  const { data } = supabaseClient.storage.from('bukti').getPublicUrl(path);
  if(data && data.publicUrl) {
    document.getElementById('modalImg').src = data.publicUrl;
    document.getElementById('imageModal').classList.remove('hidden');
  }
}

function closeModal() {
  document.getElementById('imageModal').classList.add('hidden');
}

async function approveTopup(id, targetUserId, tokenCount) {
  try {
    const { data: targetUser } = await supabaseClient.from('profiles').select('tokens').eq('id', targetUserId).single();
    const newTokens = (targetUser?.tokens || 0) + tokenCount;

    await supabaseClient.from('profiles').update({ tokens: newTokens }).eq('id', targetUserId);
    await supabaseClient.from('topup').update({ status: 'approved' }).eq('id', id);

    showToast('Topup berhasil disetujui!');
    loadAdminTopups();
  } catch(err) {
    showToast('Gagal menyetujui topup.', 'error');
  }
}

async function adminSendFreeTokens() {
  if(!currentProfile || currentProfile.role !== 'admin') return;
  const targetEmail = document.getElementById('admin-target-email').value.trim().toLowerCase();
  const amount = parseInt(document.getElementById('admin-token-amount').value);

  if(!targetEmail || isNaN(amount) || amount <= 0) {
    showToast('Masukkan email dan jumlah token yang valid.', 'error');
    return;
  }

  try {
    const { data: targetUser } = await supabaseClient.from('profiles').select('id, tokens').eq('email', targetEmail).single();
    if(!targetUser) { showToast('Email user tidak ditemukan.', 'error'); return; }

    const newTokens = (targetUser.tokens || 0) + amount;
    await supabaseClient.from('profiles').update({ tokens: newTokens }).eq('id', targetUser.id);

    showToast(`Sukses! ${amount} token dikirim ke ${targetEmail}`);
    document.getElementById('admin-target-email').value = '';
    document.getElementById('admin-token-amount').value = '';
  } catch(err) {
    showToast('Gagal mengirim token.', 'error');
  }
}

function logout() {
  supabaseClient.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showPage('landing');
  showToast('Berhasil logout.');
}

async function boot() {
  const { data } = await supabaseClient.auth.getSession();
  if(data.session) { await loadSession(data.session); } 
  else { showPage('landing'); }
}

boot();
