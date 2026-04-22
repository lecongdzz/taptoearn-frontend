import React, { useState, useEffect } from 'react';

// ĐIỀN ĐƯỜNG DẪN CLOUDFLARE WORKER CỦA SẾP VÀO ĐÂY
const API_URL = "https://taptoearn-backend.congle4443.workers.dev/api";

export default function App() {
  const [tab, setTab] = useState('tap');
  const [user, setUser] = useState<any>(null);
  const [tgData, setTgData] = useState({ id: "test_123", name: "Người Dùng", init: "" });
  const [isFull, setIsFull] = useState(false);
  const [idleAmount, setIdleAmount] = useState(0);
  const [displayBal, setDisplayBal] = useState(0);
  const [snow, setSnow] = useState<any[]>([]);
  const [topList, setTopList] = useState<any>(null);

  const tg = (window as any).Telegram?.WebApp;

  useEffect(() => {
    if (tg) {
      tg.expand(); tg.enableClosingConfirmation();
      if (tg.initDataUnsafe?.user) {
        setTgData({ id: tg.initDataUnsafe.user.id.toString(), name: tg.initDataUnsafe.user.first_name, init: tg.initData });
      }
    }
    const snowInt = setInterval(() => setSnow(prev => [...prev.slice(-15), { id: Math.random(), left: Math.random() * 100, dur: Math.random() * 3 + 2 }]), 500);
    return () => clearInterval(snowInt);
  }, []);

  const fetchAPI = async (action: string, data: any = {}) => {
    try {
      const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, tg_id: tgData.id, tg_name: tgData.name, initData: tgData.init, data }) });
      const json = await res.json();
      if (action === 'sync' && json.is_full) { setIsFull(true); setIdleAmount(json.idle_amount); }
      if (json.error && json.error.includes("24h")) { alert(json.error); setTab('task'); setIsFull(false); return; }
      if (json.success) { setUser(json.user); if (action === 'get_top') setTopList(json); if (json.msg && action !== 'sync') alert("✅ " + json.msg); }
      else if (json.error) { alert("❌ " + json.error); }
    } catch (e) { console.error("Network Error"); }
  };

  useEffect(() => { fetchAPI('sync'); const syncInt = setInterval(() => fetchAPI('sync'), 60000); return () => clearInterval(syncInt); }, [tgData.id]);

  useEffect(() => {
    if (user && !user.needs_job) {
      setDisplayBal(user.balance);
      const tick = setInterval(() => setDisplayBal(prev => prev + (user.rate / 21600)), 1000);
      return () => clearInterval(tick);
    }
  }, [user]);

  const openLink = (url: string) => { if (tg?.openLink) tg.openLink(url); else window.open(url, '_blank'); };
  const copyRef = () => { navigator.clipboard.writeText(`https://t.me/BotCuaSep_bot?start=ref_${tgData.id}`); alert("✅ Đã copy link!"); };
  
  const handleWithdraw = (type: 'withdraw' | 'withdraw_ref') => {
    const p = type === 'withdraw' ? 'w' : 'r';
    const b = (document.getElementById(`${p}b`) as HTMLInputElement).value; const s = (document.getElementById(`${p}s`) as HTMLInputElement).value;
    const n = (document.getElementById(`${p}n`) as HTMLInputElement).value; const a = (document.getElementById(`${p}a`) as HTMLInputElement).value;
    if (!b || !s || !n || !a) return alert("❌ Vui lòng điền đủ thông tin!");
    fetchAPI(type, { bank: b, stk: s, name: n, amount: a });
  };

  if (!user) return <div className="flex h-screen items-center justify-center bg-slate-900 text-amber-400 font-bold animate-pulse">ĐANG TẢI DỮ LIỆU MÁY CHỦ...</div>;

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center bg-slate-900 text-white font-sans overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        {snow.map(s => (<div key={s.id} className="absolute text-xl snow-fall" style={{ left: `${s.left}vw`, animationDuration: `${s.dur}s` }}>🪙</div>))}
      </div>

      <div className="w-full flex-1 overflow-y-auto pb-[130px] z-10 px-4 pt-6">
        
        {/* --- TAB 1: ĐÀO XU --- */}
        {tab === 'tap' && (
          <div className="flex flex-col items-center animate-in fade-in duration-300">
            <div className="w-full flex justify-between mb-6">
               <div className="bg-slate-800/80 border border-slate-700 py-2 px-4 rounded-full shadow"><span className="text-xs text-slate-400 block">User</span><span className="font-bold text-amber-400">👤 {tgData.name}</span></div>
               <div className="bg-slate-800/80 border border-slate-700 py-2 px-4 rounded-full text-right shadow"><span className="text-xs text-slate-400 block">Level</span><span className="font-bold text-amber-400">Lv {user.machine_lvl}</span></div>
            </div>
            <div className="text-5xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)] mb-8">{Math.floor(displayBal).toLocaleString('vi-VN')}</div>
            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <div className="bg-slate-800/50 border border-white/5 p-4 rounded-2xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">Vàng</p><p className="text-xl font-black text-amber-500">🪙 {user.gold}</p></div>
              <div className="bg-slate-800/50 border border-white/5 p-4 rounded-2xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">VNĐ Thực</p><p className="text-xl font-black text-emerald-400">{user.vnd.toLocaleString('vi-VN')}đ</p></div>
            </div>
            <div className="w-56 h-56 rounded-full shadow-[0_0_50px_rgba(245,158,11,0.4)] flex items-center justify-center text-8xl font-black text-amber-950 border-[8px] border-amber-300/30 mb-8 active:scale-95 transition-transform bg-gradient-to-br from-amber-300 to-amber-600" onClick={() => { try{(window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy')}catch(e){} }}>$</div>
            <div className="w-full bg-slate-800/80 border border-slate-700 p-5 rounded-3xl shadow-xl">
              <div className="flex justify-between items-center mb-3"><span className="text-slate-300 font-bold">🚀 Công suất:</span><span className="text-emerald-400 font-black">{user.rate.toLocaleString('vi-VN')} Xu/6h</span></div>
              {user.needs_job && <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl text-red-400 text-xs font-bold text-center mb-4">⚠️ MÁY BỊ KHÓA QUÁ 24H! HÃY LÀM 1 JOB ĐỂ TIẾP TỤC.</div>}
              <div className="space-y-1">
                <div className="flex justify-between text-[0.7rem] font-black uppercase text-slate-500"><span>Tiến độ rút Đào (3.000đ)</span><span className="text-amber-400">{Math.min((user.balance / 6000000) * 100, 100).toFixed(1)}%</span></div>
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-600 to-amber-300" style={{ width: `${Math.min((user.balance / 6000000) * 100, 100)}%` }}></div></div>
              </div>
            </div>
            <button className="w-full mt-6 py-4 bg-emerald-600 text-white font-black rounded-xl shadow-lg active:scale-95" onClick={() => { setIsFull(false); fetchAPI('claim_idle'); }}>📦 LẤY XU VÀO KHO</button>
          </div>
        )}

        {/* --- TAB 2: BẠN BÈ --- */}
        {tab === 'ref' && (
          <div className="animate-in slide-in-from-right duration-300">
            <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-3xl mb-6">
              <h3 className="text-blue-400 font-black text-xl mb-2">🤝 MỜI TÂN THỦ</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">Đàn em hoàn thành Nhiệm vụ Tân thủ và được duyệt, bạn nhận thưởng nóng.</p>
              <div className="bg-slate-900/50 p-4 rounded-2xl flex justify-between items-center mb-4 border border-white/5">
                <div><p className="text-[0.6rem] text-slate-500 uppercase font-black">Thưởng / Lượt</p><p className="text-lg font-black text-amber-400">+200k Xu</p></div>
                <div className="text-right"><p className="text-[0.6rem] text-slate-500 uppercase font-black">Đã mời</p><p className="text-xl font-black text-emerald-400">{user.ref_count}</p></div>
              </div>
              <input type="text" readOnly value={`https://t.me/BotCuaSep_bot?start=ref_${tgData.id}`} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs text-center text-slate-400 outline-none mb-3"/>
              <button className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg active:scale-95" onClick={copyRef}>📋 COPY LINK GIỚI THIỆU</button>
            </div>
          </div>
        )}

        {/* --- TAB 3: NHIỆM VỤ --- */}
        {tab === 'task' && (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
             <div className="text-center mb-4"><h3 className="text-xl font-black text-amber-400">🎯 NHIỆM VỤ HẰNG NGÀY</h3><p className="text-xs text-slate-400">Làm xong đóng App ra Bot báo cáo nhé!</p></div>
             {[
               { t: "Nhiệm vụ link đối tác", v: "100đ + 50k Xu", url: "https://linktot.net/20254tl_tr.tr" },
               { t: "Khảo sát nội bộ", v: "150đ + 80k Xu", url: "https://linktot.net/rv/20254tl_tm.key" },
               { t: "Tải App / Phản hồi", v: "500đ", url: "https://linktot.net/20254tl_tr.ap" },
               { t: "Đánh giá Map Tân Thủ", v: "100đ + 100k Xu", url: "https://sanlink247.com/s/danh-gia-5-saoz1u1cuzmnycu9ka" }
             ].map((j, i) => (
               <div key={i} className="bg-slate-800/80 p-4 rounded-2xl flex flex-col border border-slate-700 shadow">
                  <h4 className="font-bold text-sm mb-2">{j.t}</h4><div className="text-xs text-amber-400 mb-3">💰 {j.v}</div>
                  <button className="w-full py-3 bg-blue-600 text-white font-black rounded-xl text-xs active:scale-95" onClick={() => openLink(j.url)}>🔗 MỞ LINK NHIỆM VỤ</button>
               </div>
             ))}
             <button className="w-full py-4 bg-purple-600 font-black rounded-xl text-sm" onClick={() => alert('ĐỂ BÁO CÁO NHẬN TIỀN:\n1. Tắt Ứng dụng này.\n2. Ở ngoài Bot gõ: /baocao [Tên nhiệm vụ]')}>📝 HƯỚNG DẪN BÁO CÁO TẠI BOT</button>
          </div>
        )}

        {/* --- TAB 4: SHOP --- */}
        {tab === 'shop' && (
          <div className="space-y-4 animate-in zoom-in duration-300">
             <div className="bg-purple-500/10 border border-purple-500/30 p-5 rounded-2xl">
                <h3 className="text-purple-400 font-black text-sm mb-3">🎁 NHẬP GIFTCODE</h3>
                <input id="gc" type="text" placeholder="Dán mã tại đây..." className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-center text-sm focus:border-purple-500 outline-none" />
                <button className="w-full mt-2 py-3 bg-purple-600 font-black rounded-xl active:scale-95 text-sm" onClick={() => fetchAPI('giftcode', (document.getElementById('gc') as HTMLInputElement).value)}>XÁC NHẬN MÃ</button>
             </div>
             <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-2xl">
                <h3 className="text-emerald-400 font-black text-sm mb-1 uppercase">🚀 NÂNG CẤP MÁY ĐÀO</h3>
                <p className="text-[0.65rem] text-slate-500 font-bold mb-4">*Tăng 50.000 Xu công suất mỗi cấp.</p>
                <div className="flex justify-between items-center mb-5 bg-slate-900/50 p-3 rounded-xl">
                  <div><p className="text-[0.6rem] text-slate-500 uppercase font-black">Giá nâng cấp</p><p className="text-lg font-black text-amber-400">100 VÀNG</p></div>
                  <button className="px-5 py-3 bg-emerald-600 font-black rounded-xl active:scale-95 text-sm" onClick={() => fetchAPI('buy_machine')}>MUA NGAY</button>
                </div>
                <div className="pt-4 border-t border-slate-700">
                  <h3 className="text-amber-500 font-black text-sm mb-3 uppercase">🔄 SÀN ĐỔI VÀNG</h3>
                  <button className="w-full py-3 bg-slate-700 font-black rounded-xl active:scale-95 text-xs" onClick={() => fetchAPI('exchange', 'c2g')}>100.000 XU ➡️ 100 VÀNG</button>
                </div>
             </div>
          </div>
        )}

        {/* --- TAB 5: ĐUA TOP --- */}
        {tab === 'top' && (
          <div className="animate-in fade-in duration-500">
            <h3 className="text-center text-xl font-black text-amber-400 mb-4">🏆 BẢNG VÀNG ĐẠI GIA</h3>
            <div className="space-y-2">
              {topList?.top?.map((u: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full font-black text-xs ${i===0?'bg-amber-400 text-amber-950':i===1?'bg-slate-300 text-slate-900':i===2?'bg-orange-400 text-orange-950':'bg-slate-700'}`}>{i+1}</span>
                    <div><p className="font-bold text-sm text-slate-200">{u.tg_name}</p><p className="text-[0.6rem] text-slate-500 font-black uppercase">Level {u.machine_lvl}</p></div>
                  </div>
                  <p className="font-black text-emerald-400 text-sm">{u.balance.toLocaleString('vi-VN')} <span className="text-[0.6rem] text-slate-500">Xu</span></p>
                </div>
              ))}
              <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex justify-between items-center text-amber-400 font-black text-sm">
                <span>HẠNG CỦA BẠN:</span><span>Top {topList?.my_rank} (Lv {topList?.my_lvl})</span>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 6: RÚT TIỀN --- */}
        {tab === 'bank' && (
          <div className="space-y-4 animate-in slide-in-from-left duration-300">
             <div className="bg-slate-800 p-5 rounded-2xl border border-amber-500/30">
                <h3 className="text-amber-400 font-black mb-3">🏦 RÚT XU ĐÀO TỰ ĐỘNG</h3>
                <p className="text-xs text-amber-200 mb-4 bg-amber-500/10 p-2 rounded">Min rút: 6.000.000 Xu = 3.000đ</p>
                <input id="wb" placeholder="Ngân hàng/MoMo" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-2 text-sm" />
                <input id="ws" placeholder="STK/SĐT" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-2 text-sm" />
                <input id="wn" placeholder="Chủ TK (IN HOA)" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-2 text-sm" />
                <input id="wa" type="number" placeholder="Số Xu rút" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-3 text-sm" onChange={(e) => { document.getElementById('we')!.innerText = Math.floor(Number(e.target.value)/2000).toLocaleString('vi-VN') + 'đ' }} />
                <div className="text-center text-sm mb-3">Thực nhận: <span id="we" className="text-emerald-400 font-bold">0đ</span></div>
                <button className="w-full py-3 bg-amber-600 font-black rounded-xl" onClick={() => handleWithdraw('withdraw')}>GỬI LỆNH RÚT XU</button>
             </div>
             
             <div className="bg-slate-800 p-5 rounded-2xl border border-emerald-500/30">
                <h3 className="text-emerald-400 font-black mb-3">💸 RÚT TIỀN NHIỆM VỤ (VND)</h3>
                <p className="text-xs text-emerald-200 mb-4 bg-emerald-500/10 p-2 rounded">Min rút: 3.000đ VNĐ Thực</p>
                <input id="rb" placeholder="Ngân hàng/MoMo" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-2 text-sm" />
                <input id="rs" placeholder="STK/SĐT" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-2 text-sm" />
                <input id="rn" placeholder="Chủ TK (IN HOA)" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-2 text-sm" />
                <input id="ra" type="number" placeholder="Số VNĐ rút" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-3 text-sm" />
                <button className="w-full py-3 bg-emerald-600 font-black rounded-xl" onClick={() => handleWithdraw('withdraw_ref')}>GỬI LỆNH RÚT VNĐ</button>
             </div>

             <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                <h3 className="text-slate-400 font-black text-xs mb-3 uppercase">📜 LỊCH SỬ GIAO DỊCH</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                   {user.history ? user.history.split('|').filter((i:any)=>i.trim()).reverse().map((h:any, i:number)=>(
                     <div key={i} className="bg-slate-900/50 p-2 rounded-lg text-[0.7rem] font-bold border-l-2 border-amber-500 text-slate-300">{h}</div>
                   )) : <p className="text-center text-slate-600 text-xs py-4">Chưa có giao dịch.</p>}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* FULL MODAL KHO ĐẦY */}
      {isFull && (
        <div className="fixed inset-0 bg-slate-900/98 z-[1000] flex flex-col items-center justify-center px-6">
          <div className="bg-slate-800 border-2 border-emerald-500 rounded-3xl p-8 text-center shadow-[0_0_40px_rgba(16,185,129,0.3)] w-full max-w-sm">
            <h3 className="text-2xl font-black text-emerald-400 mb-2">KHO XU ĐÃ ĐẦY!</h3>
            <div className="text-5xl font-black text-amber-400 mb-8">+{idleAmount.toLocaleString('vi-VN')}</div>
            <button className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl active:scale-95" onClick={handleClaim}>LẤY XU VÀ ĐÀO TIẾP</button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV CỐ ĐỊNH */}
      <div className="fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex justify-around py-3 pb-5 z-[100]">
        {[{ id: 'tap', i: '⛏', l: 'Đào Xu' }, { id: 'ref', i: '🤝', l: 'Bạn Bè' }, { id: 'task', i: '🎯', l: 'Nhiệm Vụ' }, { id: 'top', i: '🏆', l: 'Đua Top' }, { id: 'shop', i: '🛒', l: 'Shop' }, { id: 'bank', i: '🏦', l: 'Rút Tiền' }].map(n => (
          <div key={n.id} className={`flex flex-col items-center w-1/6 transition-all duration-200 cursor-pointer ${tab === n.id ? 'text-amber-400 scale-110' : 'text-slate-500'}`} onClick={() => { setTab(n.id); if(n.id==='top') fetchAPI('get_top'); }}>
            <div className="text-2xl mb-1">{n.i}</div><span className="text-[0.55rem] font-black uppercase">{n.l}</span>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes fall { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(115vh) rotate(720deg); } } .snow-fall { position: absolute; top: -10%; animation: fall linear forwards; }`}} />
    </div>
  );
}
