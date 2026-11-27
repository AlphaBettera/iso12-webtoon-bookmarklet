/**
 * iOS 12 条漫逐屏翻页书签  —  V2.11（V2.10 + 修复「非全屏定位后进全屏漂移到旧画面」）
 * ------------------------------------------------------------------
 * 把老 iPad / iPhone 的 Safari 变成「点一下翻一屏」的条漫阅读器。
 * 实测设备：iPad mini 2 / iOS 12.5.8
 *
 * 用法：三个书签各自独立创建，按顺序点 步骤1 → 步骤2（→ 步骤3 备用）。
 * iOS Safari 的「添加书签」对话框里 URL 字段是只读的，
 * 必须「先保存、再编辑」才能把 javascript: 代码粘进去。
 * 代码必须是一行，不要换行；三个不要合并，合并会超过 iOS 12 书签长度上限。
 *
 * 协作说明：本方案的关键问题定位（书签长度上限、全屏 API 手势限制、
 * touchend 捕获阶段拦截、全屏态 e.target 失真、三元方向反转、父容器
 * 固定宽度导致居右、全屏比例定位）由 WorkBuddy AI 助手协助逐轮排查。
 * ------------------------------------------------------------------
 *
 * ⚠️ 关于「全屏滑动误退出」的历史尝试（V2.4~V2.6，均已回退）：
 *   用户反馈 V2.3 全屏时滑动会误触发退出。先后试过三种基于坐标的修法：
 *   V2.4 加 touchmove 位移判定、V2.5 加起点坐标、V2.6 改为事件触发判定，
 *   结果方向来回翻转（上滑退出↔下滑退出），V2.6 甚至破坏了点击翻页。
 *   ★ 确证：退回 V2.0 后步骤2 里根本没有 exitFullscreen 调用，但滑动仍会
 *   退出全屏——退出并非来自书签代码，而是 iOS Safari 的系统级边缘手势
 *   （WKWebView 层处理，DOM 的 JS 拦不住）。V2.4~V2.6 改的「主动退出判断」
 *   在 V2.0 里根本不存在，所以怎么调都不会对。
 *   处理：退出全屏直接点全屏左上角的系统 ✕ 按钮；滑动时从屏幕中间起滑、
 *         避开上下边缘以减少误退出。三个核心书签均不改动。
 *
 * ★ 真机技巧（2026-11-27，牛牛实测）：真全屏下先向上滑一次、再向下滑，
 *   下滑就不会退出全屏。首次上滑让滚动离开边界（橡皮筋状态解除），后续
 *   下滑被系统当作普通滚动消费，不再触发退出手势。JS 无法合成可信的
 *   前置触摸序列，因此不改代码、版本仍 V2.10；文档已记录该技巧。
 * ------------------------------------------------------------------
 *
 * ★ V2.11 改动（本次）：修复 V2.8 起发现的「非全屏定位的画面，转全屏时
 *   漂移到上次退出全屏时的画面」。根因：步骤3 的监听器（webkitfullscreenchange
 *   / resize）永久绑定，且每次执行步骤3 都会绑一次；退出全屏后这些遗留监听器
 *   仍会调用 fix() 按 mgr 拉回，把用户在非全屏态翻到的新位置覆盖掉。下次进
 *   全屏时 F() 用被拉回的 scrollY 重算 mgr，于是回到旧画面。
 *   三处改动（都在步骤3，步骤1/2 翻页内核一个字不动）：
 *   ① P() 进全屏拉回加全屏态门卫 F()：非全屏态的定时器/监听器不再拉回，
 *      用户在非全屏翻页/滑动的位置不会被覆盖；退出后翻页才准。
 *   ② 退出全屏的一次性拉回走 change 事件的 else 分支，延迟 200ms + 300ms
 *      两次 P()，等 Safari 重排稳定，保证退出停在同一画面（V2.3 意图恢复）。
 *   ③ window.rz 保留：监听器只绑一次，避免每次点步骤3 累加监听器。
 *   try/catch 兜底不变；mgr 仍用目标 y 计算（步骤2），F() 用 scrollY 属
 *   进全屏瞬间的正确读数，不受 scrollTo 延迟影响（延迟只影响步骤2 翻页）。
 * ------------------------------------------------------------------
 *
 * ★ V2.8 改动：在 V2.0 稳定内核上增加「全屏翻到所有图最后，
 *   轻点下侧自动退出全屏」。翻页内核逐字未动：h=H-80、y=scrollY±h、
 *   mgr=y/可滚范围（目标 y 双写）。
 *
 * ★ V2.9 改动：删除退出判断里的 c>H*.75（第一个触点坐标依赖），加
 *   !moved（touchmove 触发即滑动，不退出）。但真机反馈「屏幕中间小幅
 *   下滑仍退出」——V2.9 只修了一半。
 *
 * ★ V2.10 改动（本次）：彻底修掉 V2.8/V2.9「下滑退出、上滑不退出」。
 *   完整根因：V2.8 退出判断里有两处触点坐标依赖——
 *     ① c>H*.75（V2.9 已删）；
 *     ② y>=可滚范围，而 y=scrollY-(c<H*.25?h:-h) 仍由 c 派生！
 *        下滑终点 c 偏大 -> y=scrollY+h(前进) -> 末尾附近越界 -> 退出；
 *        上滑终点 c 偏小 -> y=scrollY-h(回退) -> 不越界 -> 不退出。
 *        这就是方向不对称的真正源头，且小幅滑动时 touchmove 可能不触发，
 *        V2.9 的 !moved 也拦不住。
 *   两处改动（都在退出判断里，翻页分支一个字不碰）：
 *   ① 退出判断不再用 y，改用 scrollY>=MX-2（MX=可滚范围，滚动系统自身
 *      的量，非触点坐标）。翻到末尾时浏览器会把 scrollY 钳制到 MX，
 *      条件成立；中间下滑时 scrollY 未到末尾，条件不成立 -> 不退出。
 *   ② 滑动判定 sw = moved || |t.clientY - sC|>8：touchmove 触发 或
 *      touchend 相对 touchstart 的位移>8px（差值不依赖全屏下失真的绝对
 *      坐标值）。小幅滑动即使不触发 touchmove 也能被相对位移拦住。
 *      退出条件：!sw && 时长<500ms && scrollY>=MX-2 && 全屏。
 *      ★ sw 只用于退出判断，绝不并入翻页放行分支 —— V2.6 教训。
 *   翻页内核（h=H-80、y=scrollY±h、mgr 目标 y 双写）逐字未动。
 * ------------------------------------------------------------------
 *
 * 历史（已回退，仅备查）：V2.1 曾加 touchstart/touchend 位移判定解决全屏
 * 中间无法滑动；因 mgr 改读 scrollY 造成随机翻页失灵，已全部回退到 V2.0。
 * 基础机制：步骤2 每次翻页同时写 mgy 和 mgr，步骤3 拉回读 mgr。
 */

// ===================================================================
// 步骤1：宽度适配（MutationObserver 版）
// -------------------------------------------------------------------
// 作用：拆掉网站给图片设的分页容器，让所有图片连成连续长流。
//
// 与旧 CSS 版的区别（这是解决「父容器固定 1200px 导致画面右移」的关键）：
// 1) 逐层遍历每个 <img> 的祖先容器直到 documentElement，把 maxWidth 设 none、
//    width 设 100%、左右 padding/margin 清零 —— 站点的外层容器常写死宽度，
//    只改 img 本身无法让其居中，必须把父容器一起拆掉。
// 2) data-mmfix 标记防重复处理，避免 MutationObserver 反复触发同一张图。
// 3) MutationObserver 监听 childList/subtree，懒加载追加的图片自动适配 ——
//    条漫站普遍分批加载，这一步保证翻到后面的图也是满宽。
// 4) 图片本身 width:100vw / maxWidth:none / height:auto / display:block /
//    margin:0 —— 铺满视口且保持比例。
// 5) html,body 的 margin/padding 带 !important 归零，背景设黑。
// ===================================================================
javascript:(function(){function fix(im){if(im.getAttribute('data-mmfix'))return;im.setAttribute('data-mmfix','1');var p=im;while(p&&p!==document.documentElement){p.style.maxWidth='none';p.style.width='100%';p.style.paddingLeft='0';p.style.paddingRight='0';p.style.marginLeft='0';p.style.marginRight='0';p=p.parentElement}im.style.width='100vw';im.style.maxWidth='none';im.style.height='auto';im.style.display='block';im.style.margin='0'}document.querySelectorAll('img').forEach(fix);new MutationObserver(function(){document.querySelectorAll('img:not([data-mmfix])').forEach(fix)}).observe(document.documentElement,{childList:true,subtree:true});var s=document.createElement('style');s.textContent='html,body{margin:0!important;padding:0!important;background:#000!important}';document.head.appendChild(s)})()


// ===================================================================
// 步骤2：逐屏翻页（核心）
// -------------------------------------------------------------------
// V2.0 内核 + V2.10 末尾退出（当前代码，逐项对应）：
//   轻点(<500ms) + 未滑动(!sw) + 全屏 + scrollY 已到可滚范围(MX-2)
//                    -> 退出全屏，return（末尾自动退出）
//   轻点上侧 25%     -> 回看一屏
//   轻点中间 50%     -> 放行：点链接、网站自身交互
//   轻点下侧 25%     -> 前进一屏（未到最后则照常翻页）
//   任意滑动(sw=1)   -> 绝不退出（V2.10 彻底修下滑误退出）
//
// 三个关键设计：
// 1) 用 touchend + 捕获阶段(true) + stopPropagation：
//    漫画站在 touchend 阶段就绑定了「点击跳下一张图」的逻辑，
//    捕获阶段先执行并截断事件，才能按屏幕高度翻页而不是按图片翻页。
// 2) V2.10 末尾退出：退出判断放在 elementFromPoint 链接放行之前 —— 否则
//    末尾「下一话」<a> 会先被放行，点下侧直接跳章。四条条件全部不依赖
//    触点坐标 c：末尾用 scrollY>=MX-2（滚动位置，非 c 派生的 y），
//    轻点用时间戳<500ms，滑动用 sw=moved||相对位移>8px（差值非绝对坐标）。
//    V2.8 用 c>H*.75 + y(由c派生)，下滑终点 c 偏大 -> y 前进 -> 末尾越界
//    误退出；V2.9 删了 c>H*.75 但 y 仍由 c 派生，故小幅下滑仍退出。
//    V2.10 把退出判断里的 c 和 y 全部拿掉，根治方向不对称。
//    ★ sw 只用在退出判断，绝不并入翻页放行 mv —— V2.6 的教训。
// 3) exitFullscreen 只在真全屏态调用（webkitFullscreenElement/fullscreenElement），
//    非全屏时这段完全不触发，行为与 V2.0 一字不差。
//
// 翻页步长 h = innerHeight - 80：
//    iOS 12 全屏时顶部约 5mm 页眉、底部约 7mm 页脚，合计约 77 CSS px，
//    取 80 留余量，保证上一屏末尾接下一屏开头、末尾字不被页脚压住。
//    每屏末尾仍被遮 -> 调大到 90/100；相邻屏重叠太多 -> 调小到 70/60。
//
// 相对滚动 scrollY ± h：
//    从当前实际位置翻，不吸附固定网格。手动滑动微调后能从新位置接着翻。
//
// ★ 位置双写（V2.0 关键，逐字未动）：
//    每次翻页同时写 mgy（绝对位置）和 mgr（用目标 y / 可滚范围 的比例，
//    不读 scrollY —— 读 scrollY 会造成随机翻页失灵，见主文档回归分析）。
//    步骤3 的 setInterval / 事件监听反复拉回时读的是 mgr —— 因为翻页
//    持续更新它，拉回的永远是「最后翻到的位置」，不会把翻页吃掉。
//    这正是这套代码「全屏翻页不出错」的核心，改动时务必保留。
// ===================================================================
javascript:(function(){var ts=0,sC=0,moved=0;addEventListener('touchstart',function(e){ts=Date.now();sC=e.touches[0].clientY;moved=0},true);addEventListener('touchmove',function(){moved=1},true);addEventListener('touchend',function(e){var t=e.changedTouches[0],c=t.clientY,H=innerHeight,h=H-80,y=Math.max(0,scrollY-(c<H*.25?h:-h)),MX=Math.max(1,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-H),sw=moved||Math.abs(t.clientY-sC)>8;if(!sw&&Date.now()-ts<500&&scrollY>=MX-2&&(document.webkitFullscreenElement||document.fullscreenElement)){e.preventDefault();e.stopPropagation();var E=document.webkitExitFullscreen||document.exitFullscreen;if(E)E.call(document);return}var o=document.elementFromPoint(t.clientX,t.clientY);if(o&&o.closest&&o.closest('a,button,[onclick]'))return;if(c>=H*.25&&c<=H*.75)return;e.preventDefault();e.stopPropagation();scrollTo(0,y);try{sessionStorage.setItem('mgy',y);sessionStorage.setItem('mgr',y/Math.max(1,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-H))}catch(x){}},true)})()


// ===================================================================
// 步骤3：全屏 + 进出位置同步（备用）
// -------------------------------------------------------------------
// 作用：进入真全屏，并让进、出两个方向都停在同一个画面。
// 必须最后点：全屏后工具栏和书签栏消失，没法再点其他书签。
//
// 为什么必须用「比例」而不是绝对像素：
//   实测 Safari 进全屏清零 scrollY，还重置缩放、导致布局重排：
//     切前 scrollY=7957 / innerHeight=1253 / 文档高=29379 (可滚 28126)
//     切后 scrollY=0    / innerHeight=1024 / 文档高=23096 (可滚 22072)
//   同一绝对像素在两个状态下对应不同内容，保存 scrollY 必然错位。
//   比例 = scrollY / 可滚范围；切前 28.3%，切后滚到 28.3%×22072≈6245 才对应。
//
// 四个关键设计：
// 1) 进全屏前把当前 scrollY 换算成比例写 mgr；调用全屏 API 后 P() 立即
//    按新 H() 定位。F() 用 scrollY 是进全屏瞬间的正确读数（用户已看到该
//    画面），不依赖旧的 sessionStorage 值 —— 这是修复非全屏手动滑动后
//    位置丢失的关键。
// 2) setInterval 15 次 ×100ms —— Safari 进全屏是异步重排，单次 scrollTo
//    会被随后的布局覆盖，需在 1.5 秒内反复拉回；定时器走 Q()（带全屏态
//    门卫），只在真全屏态拉回，避免非全屏态覆盖用户手动滑动的位置。
// 3) V2.11 门卫 F()/Q()：F() 返回当前是否真全屏；P() 是纯拉回，Q() 仅在
//    全屏态调 P()。永久绑定的 fullscreenchange / resize 监听器在非全屏态
//    一律走 Q()（不拉回），所以退出全屏后用户在非全屏翻页/滑动的新位置
//    不会被旧 mgr 覆盖；下次进全屏 F() 读到的是新位置，不再漂移到旧画面。
// 4) 退出全屏走 change 事件的 else 分支：延迟 200ms + 300ms 两次 P()，
//    等 Safari 重排稳定后按 mgr 恢复退出前画面（V2.3 意图恢复）；退出
//    只读 mgr 不重写，避免 scrollY 被清零污染比例。
//    window.rz 一次性标志：监听器只绑一次，避免每次点步骤3 累加监听器。
//
// 两个方法名用了 webkitRequestFullScreen / webkitRequestfullscreen，
// 兼容 iOS 12 Safari 两种大小写实现。全屏 API 必须在用户手势栈内同步调用。
// try/catch 兜底：存储被禁时全屏仍生效。
//
// ⚠️ 已知限制（iOS 12 WebKit 系统层 bug，JS 无法根治）：
//   - 真全屏下点 position:fixed 的页脚菜单会导致 Safari 卡死
//   - 真全屏下 innerHeight 失真，步骤2 的中间判断区错位、无法滑动
// 用步骤3 时请只用上下 17.5% 翻页，换话或微调前先退出全屏。
// ===================================================================
javascript:(function(){var e=document.documentElement,x=e.webkitRequestFullScreen||e.webkitRequestfullscreen,D=document.body,F=function(){return document.webkitFullscreenElement||document.fullscreenElement},H=function(){return Math.max(1,Math.max(D.scrollHeight,e.scrollHeight)-innerHeight)},P=function(){try{var y=sessionStorage.getItem('mgr');if(y)scrollTo(0,y*H())}catch(z){}},Q=function(){if(F())P()};try{sessionStorage.setItem('mgr',scrollY/H())}catch(z){}if(x)x.call(e);P();var n=0,t=setInterval(function(){Q();if(++n>15)clearInterval(t)},100);if(!window.rz){window.rz=1;addEventListener('webkitfullscreenchange',function(){if(F())P();else{setTimeout(P,200);setTimeout(P,300)}});addEventListener('resize',Q)}})()// ===================================================================
// 附：清空位置记录（可选书签）
// -------------------------------------------------------------------
// sessionStorage(mgy/mgr) 刷新后仍保留，重新走流程时步骤3 会跳回
// 上次位置。想从头看就先点一次这个极短书签，再走完整流程。
// ===================================================================
javascript:sessionStorage.clear()
