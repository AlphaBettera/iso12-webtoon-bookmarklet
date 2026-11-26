/**
 * iOS 12 条漫逐屏翻页书签
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
 * touchend 捕获阶段拦截、全屏态 e.target 失真、三元方向反转）
 * 由 AI 助理「阿财」（WorkBuddy）协助逐轮排查修复。
 * ------------------------------------------------------------------
 */

// ===================================================================
// 步骤1：宽度适配
// -------------------------------------------------------------------
// 作用：拆掉网站给图片设的分页容器，让所有图片连成连续长流。
//   width:auto      不强行放大，保持条漫原始比例
//   display:block   去掉行内元素的间隙
//   margin:0        去掉网站预设的间距
//   overflow-x:hidden 切掉横向溢出
// 注意：不要改成 width:100vw，条漫会被拉得过高，一屏看不到多少内容。
// ===================================================================
javascript:document.head.insertAdjacentHTML('beforeend','<style>html,body{margin:0!important;padding:0!important;overflow-x:hidden!important;background:#000}img{width:auto!important;max-width:100%!important;height:auto!important;display:block!important;margin:0 auto!important}</style>')


// ===================================================================
// 步骤2：逐屏翻页（核心）
// -------------------------------------------------------------------
// 交互分区（仅对非交互元素生效）：
//   上侧 25%  -> 回看一屏
//   中间 50%  -> 完全放行：原生滑动、点链接、网站自身交互照常
//   下侧 25%  -> 前进一屏
//
// 两个关键设计：
// 1) 用 touchend + 捕获阶段(true) + stopPropagation：
//    漫画站在 touchend 阶段就绑定了「点击跳下一张图」的逻辑，
//    捕获阶段先执行并截断事件，才能按屏幕高度翻页而不是按图片翻页。
// 2) 用 elementFromPoint(clientX, clientY) 而不是 e.target 检测菜单：
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
//    （早期版本用 Math.round(scrollY/h)*h，滑动后会跳回旧网格节奏。）
//
// sessionStorage.mgy：
//    每次翻页记住位置，供步骤3 进全屏时恢复，重进全屏不回第一张。
// ===================================================================
javascript:addEventListener('touchend',function(e){var t=e.changedTouches[0],o=document.elementFromPoint(t.clientX,t.clientY);if(o&&o.closest&&o.closest('a,button,[onclick]'))return;var c=t.clientY,H=innerHeight;if(c>=H*.25&&c<=H*.75)return;e.preventDefault();e.stopPropagation();var h=H-80,y=Math.max(0,scrollY-(c<H*.25?h:-h));scrollTo(0,y);try{sessionStorage.setItem('mgy',y)}catch(x){}},true)


// ===================================================================
// 步骤3：全屏 + 位置恢复（备用）
// -------------------------------------------------------------------
// 作用：进入真全屏，并从 sessionStorage.mgy 恢复上次观看位置。
// 必须最后点：全屏后工具栏和书签栏消失，没法再点其他书签。
//
// 三个方法名都试一遍，兼容 webkitRequestFullScreen（大写 S）与
// webkitRequestFullscreen（小写 s）两种实现。
// 全屏 API 必须在用户手势栈内同步调用，放进回调会被 Safari 拒绝。
// try/catch 兜底：存储被禁时全屏仍生效。
//
// ⚠️ 已知限制（iOS 12 WebKit 系统层 bug，JS 无法根治）：
//   - 真全屏下点 position:fixed 的页脚菜单会导致 Safari 卡死
//   - 真全屏下 innerHeight 失真，步骤2 的中间判断区错位、无法滑动
// 用步骤3 时请只用上下 25% 翻页，换话或微调前先退出全屏。
// ===================================================================
javascript:(function(){var e=document.documentElement,x=e.webkitRequestFullScreen||e.webkitRequestFullscreen||e.requestFullscreen;if(x)x.call(e);try{var y=sessionStorage.getItem('mgy');if(y)setTimeout(function(){scrollTo(0,parseInt(y))},400)}catch(z){}})()


// ===================================================================
// 附：清空位置记录（可选书签）
// -------------------------------------------------------------------
// sessionStorage 刷新后仍保留，重新走流程时步骤3 会跳回上次位置。
// 想从头看就先点一次这个极短书签，再走完整流程。
// ===================================================================
javascript:sessionStorage.removeItem('mgy')
