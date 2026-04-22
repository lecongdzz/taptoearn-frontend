export interface Env { DB: D1Database; }

const BOT_TOKEN = "8739892302:AAG1kA6C6LEMxCEexEGgqA5t8K8OCOtheYA"; // Token Bot của sếp
const ADMIN_ID = "8526421796"; // ID Admin của sếp

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

const ECO = {
  RATE_BASE: 200000, RATE_STEP: 50000, MAX_TIME: 21600, LOCK_TIME: 86400,
  MIN_WD_XU: 6000000, MIN_WD_VND: 3000, XU_TO_VND: 2000,
  UPGRADE_COST: 100, XU_TO_GOLD: 100000, GOLD_RECV: 100
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);

    try {
      // ==========================================
      // 1. WEBHOOK TELEGRAM BOT
      // ==========================================
      if (url.pathname === "/webhook" && request.method === "POST") {
        const body: any = await request.json();

        const sM = async (cid: string, txt: string, kb: any = null) => {
          let p: any = { chat_id: cid, text: txt, parse_mode: "HTML" }; if (kb) p.reply_markup = kb;
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        };
        const eM = async (cid: string, mid: number, txt: string, kb: any = null) => {
          let p: any = { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML" }; if (kb) p.reply_markup = kb;
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        };
        const aCb = async (cb_id: string, txt: string) => {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: cb_id, text: txt, show_alert: true }) });
        };

        // --- XỬ LÝ NÚT BẤM (CALLBACK) ---
        if (body.callback_query) {
          const cb = body.callback_query; const dat = cb.data; const cid = cb.message.chat.id.toString(); const mid = cb.message.message_id;
          
          if (cid === ADMIN_ID) {
            if (dat === "adm_main") {
              const kb = { inline_keyboard: [
                [{text:"📊 Tổng quan", callback_data:"sub_stat"}, {text:"👥 Người dùng", callback_data:"sub_usr"}],
                [{text:"🤝 Ref giới thiệu", callback_data:"sub_ref"}, {text:"🧩 Nhiệm vụ", callback_data:"sub_tsk"}],
                [{text:"💸 Rút tiền", callback_data:"sub_wd"}, {text:"🎁 Giftcode", callback_data:"sub_gif"}],
                [{text:"📣 Thông báo", callback_data:"sub_not"}, {text:"🛡 Gian lận", callback_data:"sub_cht"}],
                [{text:"💰 Doanh thu", callback_data:"sub_rev"}, {text:"⚙️ Cài đặt", callback_data:"sub_set"}],
                [{text:"🏠 Đóng Bảng", callback_data:"adm_close"}]
              ]};
              await eM(cid, mid, "👑 <b>BẢNG ĐIỀU KHIỂN ADMIN</b>", kb);
            }
            else if (dat === "sub_stat") {
              let {results: t} = await env.DB.prepare("SELECT COUNT(*) as c, SUM(balance) as b, SUM(vnd) as v FROM users").all();
              const kb = { inline_keyboard: [[{text:"🔄 Làm mới", callback_data:"sub_stat"}], [{text:"◀️ Quay lại", callback_data:"adm_main"}]] };
              await eM(cid, mid, `📊 <b>TỔNG QUAN HỆ THỐNG</b>\n👥 Tổng User: <b>${t[0].c}</b>\n💰 Kho Xu: <b>${(t[0].b||0).toLocaleString()}</b>\n💵 Kho VNĐ: <b>${(t[0].v||0).toLocaleString()}đ</b>`, kb);
            }
            else if (["sub_usr", "sub_ref", "sub_tsk", "sub_wd", "sub_gif", "sub_not", "sub_cht", "sub_rev", "sub_set"].includes(dat)) {
               const kb = { inline_keyboard: [[{text:"◀️ Quay lại", callback_data:"adm_main"}]] };
               let title = dat.replace("sub_", "").toUpperCase();
               await eM(cid, mid, `🛠 <b>MODULE ${title}</b>\n\nĐể đảm bảo Server không nghẽn, hãy dùng Lệnh Bot (/helpadm).\nCác Đơn Rút Tiền và Báo Cáo Nhiệm Vụ sẽ được đẩy tự động lên đây để Sếp duyệt 1 chạm.`, kb);
            }
            else if (dat === "adm_close") { await eM(cid, mid, "✅ Đã đóng Admin Panel."); }

            // --- DUYỆT BÁO CÁO NHIỆM VỤ TỪ USER ---
            else if (dat.startsWith("dref_")) {
              let p = dat.split("_"); let idA = p[1]; let idB = p[2]; let nowTime = Math.floor(Date.now() / 1000);
              if (idA !== "0" && idA !== "Không có") {
                await env.DB.prepare("UPDATE users SET balance=balance+200000, ref_count=ref_count+1 WHERE tg_id=?").bind(idA).run();
                await sM(idA, `🎉 <b>THƯỞNG REF!</b> Đàn em <code>${idB}</code> đã làm xong nhiệm vụ. Bạn nhận +200.000 Xu!`);
              }
              await env.DB.prepare("UPDATE users SET balance=balance+100000, vnd=vnd+100, status='ĐÃ DUYỆT', history=history||?, last_job_time=? WHERE tg_id=?").bind('|✅ Thưởng Tân Thủ: +100đ', nowTime, idB).run();
              await sM(idB, `✅ <b>ADMIN ĐÃ DUYỆT!</b> Thưởng Tân Thủ: +100.000 Xu & 100đ. (Đã mở khóa máy đào 24h)`);
              await eM(cid, mid, cb.message.text + "\n\n✅ <b>ĐÃ DUYỆT THƯỞNG CHO A & B</b>");
            }
            else if (dat.startsWith("djob_")) {
              let p = dat.split("_"); let idU = p[1]; let jVnd = parseInt(p[2]); let jXu = parseInt(p[3]); let nowTime = Math.floor(Date.now() / 1000);
              await env.DB.prepare("UPDATE users SET balance=balance+?, vnd=vnd+?, status='ĐÃ DUYỆT', history=history||?, last_job_time=? WHERE tg_id=?").bind(jXu, jVnd, `|✅ Duyệt Job: +${jVnd}đ`, nowTime, idU).run();
              await sM(idU, `✅ <b>NHIỆM VỤ ĐÃ DUYỆT!</b> Thưởng: +${jVnd}đ & +${jXu} Xu. (Đã mở khóa máy đào 24h)`);
              await eM(cid, mid, cb.message.text + `\n\n✅ <b>ĐÃ DUYỆT JOB (+${jVnd}đ)</b>`);
            }
            else if (dat.startsWith("rej_")) {
              let idU = dat.split("_")[1]; await env.DB.prepare("UPDATE users SET status='TỪ CHỐI' WHERE tg_id=?").bind(idU).run();
              await sM(idU, `❌ <b>TỪ CHỐI BÁO CÁO!</b> Nhiệm vụ không hợp lệ, hãy trung thực.`); await eM(cid, mid, cb.message.text + "\n\n❌ <b>ĐÃ TỪ CHỐI</b>");
            }

            // --- DUYỆT RÚT TIỀN ---
            else if (dat.startsWith("wdy_")) { let p = dat.split("_"); await sM(p[1], `🎉 Lệnh rút ĐÀO XU của bạn đã được chuyển khoản thành công!`); await eM(cid, mid, cb.message.text + "\n\n✅ <b>ĐÃ CHUYỂN KHOẢN XU ĐÀO</b>"); }
            else if (dat.startsWith("wdn_")) { let p = dat.split("_"); let amt = parseInt(p[2]); await env.DB.prepare("UPDATE users SET balance=balance+?, history=history||? WHERE tg_id=?").bind(amt, `|❌ Lỗi rút hoàn ${amt} Xu`, p[1]).run(); await sM(p[1], `❌ Lệnh rút Xu bị lỗi. Đã hoàn ${amt} Xu.`); await eM(cid, mid, cb.message.text + "\n\n❌ <b>TỪ CHỐI & HOÀN XU</b>"); }
            else if (dat.startsWith("refy_")) { let p = dat.split("_"); await sM(p[1], `🎉 Lệnh rút VNĐ THỰC của bạn đã được chuyển khoản thành công!`); await eM(cid, mid, cb.message.text + "\n\n✅ <b>ĐÃ CHUYỂN KHOẢN VNĐ</b>"); }
            else if (dat.startsWith("refn_")) { let p = dat.split("_"); let amt = parseInt(p[2]); await env.DB.prepare("UPDATE users SET vnd=vnd+?, history=history||? WHERE tg_id=?").bind(amt, `|❌ Lỗi rút hoàn ${amt}đ`, p[1]).run(); await sM(p[1], `❌ Lệnh rút VNĐ bị lỗi. Đã hoàn ${amt}đ.`); await eM(cid, mid, cb.message.text + "\n\n❌ <b>TỪ CHỐI & HOÀN VNĐ</b>"); }
          }
          await aCb(cb.id, ""); // Bắt buộc gọi để tắt icon loading trên nút
          return new Response("OK");
        }

        // --- XỬ LÝ LỆNH CHAT ---
        if (body.message && body.message.text) {
          const msg = body.message.text; const cid = body.message.chat.id.toString(); const isAdm = (cid === ADMIN_ID);
          const safeName = (body.message.from.first_name || "User").replace(/[<>&]/g, "");
          const nowTime = Math.floor(Date.now() / 1000);

          // Tạo user nếu chưa có
          let { results: uCheck } = await env.DB.prepare("SELECT * FROM users WHERE tg_id=?").bind(cid).all();
          if (uCheck.length === 0) { await env.DB.prepare("INSERT INTO users (tg_id, tg_name, last_login, last_job_time) VALUES (?, ?, ?, ?)").bind(cid, safeName, nowTime, nowTime).run(); }

          const kbUser = { keyboard: [
            [{text:"🎮 MỞ GAME MINING"}],
            [{text:"💰 SỐ DƯ"}, {text:"🤝 MỜI BẠN BÈ"}],
            [{text:"📝 BÁO CÁO HOÀN THÀNH"}],
            [{text:"🏦 RÚT TIỀN"}, {text:"📜 LỊCH SỬ"}],
            [{text:"ℹ️ HƯỚNG DẪN"}]
          ], resize_keyboard: true };
          if (isAdm) kbUser.keyboard.push([{text:"👑 BẢNG ADMIN"}]);

          // LỆNH ADMIN DỰ PHÒNG
          if (isAdm && msg.startsWith("/")) {
            const args = msg.split(" "); const cmd = args[0];
            if (cmd === "/helpadm") return sM(cid, "🛠 <b>LỆNH ADMIN:</b>\n/stats\n/cong [id] [xu]\n/tru [id] [xu]\n/congv [id] [vàng]\n/setlv [id] [level]\n/taocode [mã] [xu] [lượt]\n/ban [id]\n/unban [id]\n/sendall [nội dung]");
            if (cmd === "/stats") { let {results: t} = await env.DB.prepare("SELECT COUNT(*) as c, SUM(balance) as b, SUM(vnd) as v FROM users").all(); return sM(cid, `📊 User: ${t[0].c} | Xu: ${(t[0].b||0).toLocaleString()} | VNĐ: ${(t[0].v||0).toLocaleString()}đ`); }
            if (cmd === "/cong" && args[2]) { await env.DB.prepare("UPDATE users SET balance=balance+? WHERE tg_id=?").bind(parseInt(args[2]), args[1]).run(); return sM(cid, "✅ Đã cộng Xu"); }
            if (cmd === "/tru" && args[2]) { await env.DB.prepare("UPDATE users SET balance=balance-? WHERE tg_id=?").bind(parseInt(args[2]), args[1]).run(); return sM(cid, "✅ Đã trừ Xu"); }
            if (cmd === "/congv" && args[2]) { await env.DB.prepare("UPDATE users SET gold=gold+? WHERE tg_id=?").bind(parseInt(args[2]), args[1]).run(); return sM(cid, "✅ Đã cộng Vàng"); }
            if (cmd === "/setlv" && args[2]) { await env.DB.prepare("UPDATE users SET machine_lvl=? WHERE tg_id=?").bind(parseInt(args[2]), args[1]).run(); return sM(cid, "✅ Đã set Level"); }
            if (cmd === "/taocode" && args[3]) { await env.DB.prepare("INSERT INTO giftcodes (code, coin, max_use) VALUES (?, ?, ?)").bind(args[1], parseInt(args[2]), parseInt(args[3])).run(); return sM(cid, "✅ Đã tạo Code"); }
            if (cmd === "/sendall" && args[1]) { 
              let msgStr = msg.replace("/sendall ", ""); let {results: allU} = await env.DB.prepare("SELECT tg_id FROM users").all();
              allU.forEach((u:any) => sM(u.tg_id, `📣 <b>THÔNG BÁO TỪ ADMIN:</b>\n${msgStr}`)); return sM(cid, "✅ Đã gửi toàn hệ thống."); 
            }
          }

          // BOT ĐIỀU HƯỚNG VÀ BÁO CÁO
          if (msg.startsWith("/start")) {
            let refMatch = msg.match(/\/start ref_(\d+)/);
            if (refMatch && refMatch[1] !== cid) {
              try { await env.DB.prepare("UPDATE users SET ref_by=?, status='ĐÃ START' WHERE tg_id=? AND ref_by='0'").bind(refMatch[1], cid).run(); } catch(e){}
              await sM(cid, `🎯 <b>NHIỆM VỤ TÂN THỦ</b>\nHoàn thành đánh giá Map để nhận <b>100.000 Xu + 100đ</b>.\n👉 <a href="https://sanlink247.com/s/danh-gia-5-saoz1u1cuzmnycu9ka">Bấm làm nhiệm vụ</a>\nLàm xong ra Bot gõ: <code>/baocao [Bình luận của bạn]</code>.`, kbUser);
            } else { await sM(cid, "🌟 <b>HỆ THỐNG ĐÀO COIN PRO V18</b>\n👇 Chọn chức năng trên bàn phím:", kbUser); }
            return new Response("OK");
          }

          if (msg === "👑 BẢNG ADMIN" && isAdm) return sM(cid, "👑 MỞ BẢNG ĐIỀU KHIỂN", {inline_keyboard: [[{text:"VÀO BẢNG ADMIN", callback_data:"adm_main"}]]});
          
          if (msg === "📝 BÁO CÁO HOÀN THÀNH") return sM(cid, "📝 <b>BÁO CÁO:</b>\nGõ lệnh: <code>/baocao [Nội dung nhiệm vụ đã làm]</code>");

          if (msg.startsWith("/baocao")) {
            let txt = msg.replace("/baocao", "").trim().replace(/[<>&]/g, "");
            if (!txt) return sM(cid, "⚠️ Bạn chưa nhập nội dung báo cáo.");
            let {results} = await env.DB.prepare("SELECT ref_by, status FROM users WHERE tg_id=?").bind(cid).all();
            let refBy = (results[0] && results[0].ref_by !== "0") ? results[0].ref_by : "Không có";
            if (results[0] && results[0].status === 'CHỜ DUYỆT') return sM(cid, "⏳ Báo cáo đang chờ Admin duyệt.");
            
            await env.DB.prepare("UPDATE users SET status='CHỜ DUYỆT' WHERE tg_id=?").bind(cid).run();
            let aKb = {inline_keyboard: [
              [{text: "✅ Duyệt Tân Thủ (A+200k, B+100k+100đ)", callback_data: `dref_${refBy}_${cid}`}],
              [{text: "✅ Duyệt Khảo Sát (150đ+80k Xu)", callback_data: `djob_${cid}_150_80000`}],
              [{text: "✅ Duyệt Link Đối Tác (100đ+50k Xu)", callback_data: `djob_${cid}_100_50000`}],
              [{text: "✅ Duyệt Cài App (500đ)", callback_data: `djob_${cid}_500_0`}],
              [{text: "❌ Từ chối", callback_data: `rej_${cid}`}]
            ]};
            await sM(ADMIN_ID, `👥 <b>BÁO CÁO NHIỆM VỤ</b>\nRef: <code>${refBy}</code>\nUser: ${safeName} (<code>${cid}</code>)\nNội dung: "<i>${txt}</i>"`, aKb);
            return sM(cid, "✅ Đã gửi báo cáo cho Admin!");
          }

          // CÁC NÚT ĐIỀU HƯỚNG VÀO MINI APP
          const inAppMsg = "👉 Tính năng này được bảo mật trong <b>[🎮 MỞ GAME MINING]</b>.";
          if (msg === "🎮 MỞ GAME MINING") return sM(cid, "🚀 <b>Khởi chạy ứng dụng:</b>", {inline_keyboard:[[{text:"⚡ VÀO MINI APP", web_app:{url:"https://lecongdzz.github.io/taptoearn-frontend/"}}]]});
          if (msg === "💰 SỐ DƯ") { let {results} = await env.DB.prepare("SELECT balance, gold, vnd, machine_lvl FROM users WHERE tg_id=?").bind(cid).all(); let u:any = results[0]||{}; return sM(cid, `💳 <b>SỐ DƯ CỦA BẠN</b>\n👤 ID: ${cid}\n🪙 Xu: ${(u.balance||0).toLocaleString()}\n🟡 Vàng: ${u.gold||0}\n💵 VNĐ: ${(u.vnd||0).toLocaleString()}đ\n⚙️ Level: ${u.machine_lvl||1}\n⛏ Tốc độ: ${(ECO.RATE_BASE + ((u.machine_lvl||1)-1)*ECO.RATE_STEP).toLocaleString()} Xu/6h`); }
          if (msg === "🤝 MỜI BẠN BÈ") { let {results} = await env.DB.prepare("SELECT ref_count FROM users WHERE tg_id=?").bind(cid).all(); return sM(cid, `🤝 <b>MỜI BẠN BÈ</b>\n🔗 Link: <code>https://t.me/BotCuaSep_bot?start=ref_${cid}</code>\n👥 Đã mời: ${(results[0]||{}).ref_count||0}\n🎁 Thưởng: +200k Xu/Ref thành công.`); }
          if (["🏦 RÚT TIỀN", "📜 LỊCH SỬ"].includes(msg)) return sM(cid, inAppMsg);
          if (msg === "ℹ️ HƯỚNG DẪN") return sM(cid, "📖 <b>HƯỚNG DẪN</b>\n- Rút Đào: 6 Triệu Xu = 3000đ\n- Rút Job: 3000đ VNĐ Thực\n- Máy đào sẽ Khóa sau 24h nếu không làm nhiệm vụ hằng ngày.");
          
          return new Response("OK");
        }

      // ==========================================
      // 2. API ENDPOINTS (CHẠY MINI APP)
      // ==========================================
      } else if (url.pathname === "/api" && request.method === "POST") {
        const body: any = await request.json();
        const { action, tg_id, tg_name, data } = body;
        if (!tg_id) return new Response(JSON.stringify({error: "Thiếu ID"}), {headers: cors});

        const sM = async (cid: string, txt: string, kb: any = null) => {
          let p: any = { chat_id: cid, text: txt, parse_mode: "HTML" }; if(kb) p.reply_markup = kb;
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(p) });
        };

        if (action === "get_top") {
          let {results: top10} = await env.DB.prepare("SELECT tg_name, machine_lvl, balance FROM users WHERE banned=0 ORDER BY machine_lvl DESC, balance DESC LIMIT 10").all();
          let {results: myD} = await env.DB.prepare("SELECT machine_lvl, balance FROM users WHERE tg_id=?").bind(tg_id).all();
          let mLvl = myD[0]?(myD[0].machine_lvl||1):1; let mBal = myD[0]?(myD[0].balance||0):0;
          let {results: rankData} = await env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE machine_lvl>? OR (machine_lvl=? AND balance>?)").bind(mLvl, mLvl, mBal).all();
          return new Response(JSON.stringify({ success: true, top: top10, my_rank: (rankData[0].c||0)+1, my_lvl: mLvl }), { headers: cors });
        }

        let { results } = await env.DB.prepare("SELECT * FROM users WHERE tg_id=?").bind(tg_id).all();
        let user:any = results[0]; const now = Math.floor(Date.now()/1000);
        if (!user) { await env.DB.prepare("INSERT INTO users (tg_id, tg_name, last_login, last_job_time) VALUES (?, ?, ?, ?)").bind(tg_id, tg_name, now, now).run(); let r2 = await env.DB.prepare("SELECT * FROM users WHERE tg_id=?").bind(tg_id).all(); user = r2.results[0]; }
        
        let dt = Math.min(now - user.last_login, ECO.MAX_TIME); let isFull = (now - user.last_login >= ECO.MAX_TIME); 
        let lastJobTime = user.last_job_time === 0 ? now : user.last_job_time; let needsJob = (now - lastJobTime) > ECO.LOCK_TIME; 
        
        let lvl = user.machine_lvl || 1; let rate_6h = ECO.RATE_BASE + (lvl - 1) * ECO.RATE_STEP; let rate_sec = rate_6h / ECO.MAX_TIME;
        let idle = needsJob ? 0 : Math.floor(dt * rate_sec); 
        let nB = user.balance + idle; let nG = user.gold || 0; let nVnd = user.vnd || 0;

        if (action === "claim_idle") {
          if (needsJob) return new Response(JSON.stringify({ error: "❌ Đã 24h chưa làm Nhiệm vụ. Máy đào bị khóa!" }), { headers: cors });
          await env.DB.prepare("UPDATE users SET balance=?, last_login=? WHERE tg_id=?").bind(nB, now, tg_id).run();
          return new Response(JSON.stringify({ success: true, msg: `Gom ${idle.toLocaleString('vi-VN')} Xu!`, user: { balance: nB, vnd: nVnd, gold: nG, history: user.history, machine_lvl: lvl, rate: rate_6h, ref_count: user.ref_count, needs_job: false } }), { headers: cors });
        }

        if (action === "withdraw" || action === "withdraw_ref") {
          let amt = parseInt(data.amount); let isXu = action === "withdraw";
          let min = isXu ? ECO.MIN_WD_XU : ECO.MIN_WD_VND; let current = isXu ? nB : nVnd;
          if (isNaN(amt) || amt < min) return new Response(JSON.stringify({ error: `Min rút là ${min.toLocaleString('vi-VN')}!` }), { headers: cors });
          if (current < amt) return new Response(JSON.stringify({ error: "Không đủ số dư!" }), { headers: cors });
          
          let expVnd = isXu ? Math.floor(amt / ECO.XU_TO_VND) : amt;
          let newHist = `|⏳ Rút: ${expVnd.toLocaleString('vi-VN')}đ` + (user.history || "");
          
          await env.DB.prepare(`UPDATE users SET ${isXu?'balance=balance-?':'vnd=vnd-?'}, history=? WHERE tg_id=?`).bind(amt, newHist, tg_id).run();
          
          let kb = {inline_keyboard: [[{text:"✅ ĐÃ CHUYỂN KHOẢN", callback_data:`${isXu ? 'wdy' : 'refy'}_${tg_id}`}], [{text:"❌ TỪ CHỐI & HOÀN TIỀN", callback_data:`${isXu ? 'wdn' : 'refn'}_${tg_id}_${amt}`}]]};
          await sM(ADMIN_ID, `🚨 <b>YÊU CẦU RÚT TIỀN TỪ APP</b>\n👤 User: ${tg_name} (<code>${tg_id}</code>)\nLoại: ${isXu ? 'XU ĐÀO' : 'VNĐ THỰC'}\n🏦 NH/Ví: ${data.bank}\n💳 STK: ${data.stk}\n🪪 Tên: ${data.name}\n💵 Cần chuyển: <b>${expVnd.toLocaleString('vi-VN')}đ</b>`, kb);
          
          return new Response(JSON.stringify({ success: true, msg: "Đã gửi lệnh rút tiền!", user: { balance: isXu?nB-amt:nB, vnd: isXu?nVnd:nVnd-amt, gold: nG, history: newHist, machine_lvl: lvl, rate: rate_6h, ref_count: user.ref_count, needs_job: needsJob } }), { headers: cors });
        }

        if (action === "buy_machine") { 
          if (nG >= ECO.UPGRADE_COST) { let nlvl = lvl + 1; await env.DB.prepare("UPDATE users SET gold=gold-?, machine_lvl=? WHERE tg_id=?").bind(ECO.UPGRADE_COST, nlvl, tg_id).run(); return new Response(JSON.stringify({ success: true, msg: `Lên Lv ${nlvl}!`, user: { balance: nB, vnd: nVnd, gold: nG-ECO.UPGRADE_COST, machine_lvl: nlvl, rate: ECO.RATE_BASE+(nlvl-1)*ECO.RATE_STEP, history: user.history, ref_count: user.ref_count, needs_job: needsJob } }), { headers: cors }); } 
          return new Response(JSON.stringify({ error: "Cần 100 Vàng!" }), { headers: cors }); 
        }

        if (action === "exchange") { 
          if (data === "c2g" && nB >= ECO.XU_TO_GOLD) { await env.DB.prepare("UPDATE users SET balance=balance-?, gold=gold+? WHERE tg_id=?").bind(ECO.XU_TO_GOLD, ECO.GOLD_RECV, tg_id).run(); return new Response(JSON.stringify({ success: true, msg: "Đổi thành công!", user: { balance: nB-ECO.XU_TO_GOLD, vnd: nVnd, gold: nG+ECO.GOLD_RECV, machine_lvl: lvl, rate: rate_6h, history: user.history, ref_count: user.ref_count, needs_job: needsJob } }), { headers: cors }); } 
          return new Response(JSON.stringify({ error: `Cần ${ECO.XU_TO_GOLD.toLocaleString('vi-VN')} Xu!` }), { headers: cors }); 
        }

        if (action === "giftcode") { 
          let {results: codes} = await env.DB.prepare("SELECT * FROM giftcodes WHERE code=?").bind(data).all(); 
          if (codes.length===0 || codes[0].used >= codes[0].max_use || codes[0].status === 0) return new Response(JSON.stringify({ error: "Mã sai hoặc hết hạn!" }), { headers: cors }); 
          await env.DB.prepare("UPDATE giftcodes SET used=used+1 WHERE code=?").bind(data).run(); await env.DB.prepare("UPDATE users SET balance=balance+?, history=history||? WHERE tg_id=?").bind(codes[0].coin, `|✅ Giftcode: +${codes[0].coin} Xu`, tg_id).run(); 
          return new Response(JSON.stringify({ success: true, msg:`Nhận ${codes[0].coin.toLocaleString('vi-VN')} Xu!`, user: { balance: nB+codes[0].coin, vnd: nVnd, gold: nG, machine_lvl: lvl, rate: rate_6h, history: user.history, ref_count: user.ref_count, needs_job: needsJob } }), { headers: cors }); 
        }
        
        if (action === "sync") { return new Response(JSON.stringify({ success: true, idle_amount: idle, is_full: isFull, user: { balance: nB, vnd: nVnd, gold: nG, machine_lvl: lvl, history: user.history, rate: rate_6h, ref_count: user.ref_count, needs_job: needsJob } }), { headers: cors }); }
        
        return new Response(JSON.stringify({error: "Lỗi Endpoint"}), { headers: cors });
      }

      return new Response("OK");
    } catch (e) {
      console.log(e);
      return new Response("OK", { status: 200, headers: cors }); // LƯỚI BẢO VỆ CUỐI CÙNG CHỐNG SPAM
    }
  }
};
