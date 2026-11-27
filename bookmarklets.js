/**
 * iOS 12 条漫逐屏翻页书签  —  V2.3（退出全屏定位修正版）
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
 * ⚠️ V2.1 改动来源：用户反馈 V2.0 全屏时中间无法滑动。
 * 步骤2 增加 touchstart/touchend 位移判定：>15px 视为滑动放行原生滚动，
 * 只有轻点才按上下 17.5% 翻页；滑动后更新 mgr 并置 window.sliding。
 * 步骤3 的 fix() 开头 if(window.sliding)return 暂停拉回，避免把手动
 * 调整的位置覆盖回旧 mgr。步骤1 完全不动。
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
// V2.1 先判手势、再判位置：
//   位移 >15px（任意位置）-> 滑动：放行原生滚动，500ms 后更新 mgr，
//                             期间置 window.sliding=1 让步骤3 暂停拉回
//   轻点上侧 17.5%        -> 回看一屏
//   轻点中间 65%          -> 放行：点链接、网站自身交互
//   轻点下侧 17.5%        -> 前进一屏；全屏且距末尾<20%屏高时 -> 退出全屏
//
// 两个关键设计：
// 1) 用 touchend + 捕获阶段(true) + stopPropagation：
//    漫画站在 touchend 阶段就绑定了「点击跳下一张图」的逻辑，
//    捕获阶段先执行并截断事件，才能按屏幕高度翻页而不是按图片翻页。
// 2) V2.1 位移判定：全屏态 innerHeight 失真，纯坐标中间区会错位，
//    滑动被误判成翻页拦截。改用位移判定后滑动一律放行，与坐标无关。
//    act 标志确保 touchstart 未记录时（act=0）不会误判为滑动。
// 3) V2.2 全屏到底退出：c>H*.825 且全屏且 scrollY>=MX-H*.2 时
//    调 webkitExitFullscreen/exitFullscreen 退出全屏，preventDefault+return。
//    必须放在 elementFromPoint 链接放行之前 —— 否则末尾「下一话」<a>
//    会先被放行，点下侧直接跳到新话。
// 4) 用 elementFromPoint(clientX, clientY) 而不是 e.target 检测菜单：
//    真全屏下 e.target 会退化成全屏根元素，基于它的判断会失效，
//    导致点底部「首页/上一话/下一话/目录」被误判成翻页（甚至卡死）。
//    按触点坐标取实际元素，全屏下依然准确。
//
// 翻页步长 h = innerHeight - 80：
//    iOS 12 全屏时顶部约 5mm 页眉、底部约 7mm 页脚，合计约 77 CSS px，
//    取 80 留余量，保证上一屏末尾接下一屏开头、末尾字不被页脚压住。
//    每屏末尾仍被遮 -> 调大到 90/100；相邻屏重叠太多 -> 调小到 70/60。
//
// 相对滚动 scrollY ± h：
//    从当前实际位置翻，不吸附固定网格。手动滑动微调后能从新位置接着翻。
//
// ★ 位置双写（V2.0 关键，V2.1 保留）：
//    每次翻页同时写 mgy（绝对位置）和 mgr（位置/可滚范围 的比例）。
//    步骤3 的 setInterval / 事件监听反复拉回时读的是 mgr —— 因为翻页
//    持续更新它，拉回的永远是「最后翻到的位置」，不会把翻页吃掉。
//    这正是这套代码「全屏翻页不出错」的核心，改动时务必保留。
// ===================================================================
javascript:(function(){var sY=0,sC=0,act=0;function R(){try{sessionStorage.setItem('mgr',scrollY/Math.max(1,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-innerHeight))}catch(x){}}addEventListener('touchstart',function(e){act=1;sY=scrollY;sC=e.touches[0].clientY},true);addEventListener('touchend',function(e){var t=e.changedTouches[0],mv=act&&(Math.abs(t.clientY-sC)>15||Math.abs(scrollY-sY)>15);act=0;if(mv){window.sliding=1;setTimeout(function(){R();window.sliding=0},500);return}var c=t.clientY,H=innerHeight,MX=Math.max(1,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-H);if(c>H*.825&&(document.webkitFullscreenElement||document.fullscreenElement)&&scrollY>=MX-H*.2){e.preventDefault();e.stopPropagation();var E=document.webkitExitFullscreen||document.exitFullscreen;if(E)E.call(document);return}var o=document.elementFromPoint(t.clientX,t.clientY);if(o&&o.closest&&o.closest('a,button,[onclick]'))return;if(c>=H*.175&&c<=H*.825)return;e.preventDefault();e.stopPropagation();var h=H-80,y=Math.max(0,scrollY-(c<H*.175?h:-h));scrollTo(0,y);try{sessionStorage.setItem('mgy',y);R()}catch(x){}},true)})()


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
// 三个关键设计：
// 1) 进全屏前 F() 存当前比例 mgr；调用全屏 API 后 fix() 立即按新 H() 定位。
// 2) setInterval 15 次 ×100ms —— Safari 进全屏是异步重排，单次 scrollTo
//    会被随后的布局覆盖，需在 1.5 秒内反复拉回；因为步骤2 每次翻页都
//    更新 mgr，这里的 fix() 读到的始终是最新位置，不会吃掉翻页。
// 5) V2.1 if(window.sliding)return：手动滑动期间暂停拉回。否则
//    setInterval / resize / fullscreenchange 会把滑到的位置覆盖回旧 mgr，
//    表现就是「全屏中间滑不动」。
// 6) window.rz 一次性标志 + fullscreenchange / resize 双监听：
//    退出全屏时两个事件都会触发，fix() 用最新 mgr × 新 H() 定位；
//    重复触发只是幂等地滚到同一处，不会累积偏移。
//
// 三个方法名里用了 webkitRequestFullScreen / webkitRequestfullscreen，
// 兼容 iOS 12 Safari 两种大小写实现。全屏 API 必须在用户手势栈内同步调用。
// try/catch 兜底：存储被禁时全屏仍生效。
//
// ⚠️ 已知限制（iOS 12 WebKit 系统层 bug，JS 无法根治）：
//   - 真全屏下点 position:fixed 的页脚菜单会导致 Safari 卡死
//   - 真全屏下 innerHeight 失真，步骤2 的中间判断区错位、无法滑动
// 用步骤3 时请只用上下 17.5% 翻页，换话或微调前先退出全屏。
// ===================================================================
javascript:(function(){var e=document.documentElement,x=e.webkitRequestFullScreen||e.webkitRequestfullscreen,D=document.body,H=function(){return Math.max(1,Math.max(D.scrollHeight,e.scrollHeight)-innerHeight)},S=sessionStorage,F=function(){try{S.setItem('mgr',scrollY/H())}catch(z){}},P=function(){var n=0,t=setInterval(function(){if(window.sliding)return;try{var y=S.getItem('mgr');if(y)scrollTo(0,y*H())}catch(z){}if(++n>15)clearInterval(t)},100)},O=function(){if(document.webkitFullscreenElement||document.fullscreenElement)return;setTimeout(P,200)};F();if(x)x.call(e);P();if(!window.rz){window.rz=1;addEventListener('webkitfullscreenchange',O);addEventListener('resize',O)}})()


// ===================================================================
// 附：清空位置记录（可选书签）
// -------------------------------------------------------------------
// sessionStorage(mgy/mgr) 刷新后仍保留，重新走流程时步骤3 会跳回
// 上次位置。想从头看就先点一次这个极短书签，再走完整流程。
// ===================================================================
javascript:sessionStorage.clear()
