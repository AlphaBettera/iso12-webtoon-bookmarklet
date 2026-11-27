# iOS 12 条漫逐屏翻页书签 / Webtoon Pager

> 让老 iPad / iPhone 上的 Safari 把条漫变成「点一下翻一屏」的阅读器——无需越狱、无需 App、无需换新系统。
> Turn an old iPad / iPhone Safari into a tap-to-page webtoon reader — no jailbreak, no app, no OS upgrade.

**语言 / Language**: [中文](#中文版) · [English](#english)

> **版本说明**：当前为 **V2.11** = V2.10 + 修复「非全屏定位后进全屏漂移到旧画面」（只改步骤3），**2026-11-27 真机验证通过，定为稳定版**。V2.10 = V2.8 + 彻底修复「下滑误退出、上滑不退出」。V2.8 在 V2.0 稳定内核上增加真全屏末尾轻点自动退出，但退出判断有**两处**触点坐标依赖：`c>H*.75` 和由 `c` 派生的 `y=scrollY-(c<H*.25?h:-h)`。下滑终点 `c` 偏大 → `y` 前进 → 末尾越界误退出；上滑则回退不越界——这就是方向不对称的真正根源。V2.9 只删了 `c>H*.75`，小幅下滑仍退出；**V2.10 把 `c` 和 `y` 全部从退出判断拿掉**：末尾改用 `scrollY>=可滚范围-2`（滚动位置，非坐标派生），滑动改用 `!sw`（`touchmove` 触发，或相对位移 `|t.clientY-sC|>8px`，差值不依赖失真的绝对坐标）。四条件：`!sw` + 轻点(<500ms) + scrollY 到最后 + 真全屏。`sw` 只用于退出判断、绝不并入翻页分支。翻页内核逐字未动，`mgr` 仍用目标位置 y（`y / 可滚范围`）计算。详见主文档的回归分析与结论。
> **Version note**: This is **V2.11** = V2.10 + a fix for "entering fullscreen drifts back to the old exit position after re-positioning in non-fullscreen" (Step 3 only), **device-verified on 2026-11-27 and marked stable**. V2.10 = V2.8 + a complete fix for "swipe-down wrongly exits fullscreen, swipe-up doesn't". V2.8 added tap-to-exit at the end on the stable V2.0 core, but its exit check had **two** tap-coordinate dependencies: `c>H*.75` and `y=scrollY-(c<H*.25?h:-h)` derived from `c`. A downward swipe ends with a larger `c` → `y` moves forward → past-the-end at the bottom → false exit; an upward swipe moves back and stays in range — the true source of the asymmetry. V2.9 removed only `c>H*.75`, so small swipes still exited. **V2.10 removes both `c` and `y` from the exit check**: end-of-strip now uses `scrollY>=scroll-range-2` (scroll position, not coordinate-derived), and swipe uses `!sw` (`touchmove` fired, or relative displacement `|t.clientY-sC|>8px` — a difference that doesn't depend on distorted absolute coordinates). Four conditions: `!sw` + quick tap (<500 ms) + scrollY at the end + true fullscreen. `sw` is used only in the exit check, never merged into the paging branch. The paging core is byte-for-byte unchanged, with `mgr` still computed from the target position y (`y / scroll range`). See the regression analysis and conclusion in the main document.

---

<a id="中文版"></a>

## 中文版

用三个 Safari 书签脚本（bookmarklet）解决 iOS 12 Safari 上看条漫的三个痛点：

| 痛点 | 解决 |
|---|---|
| 图片被网站容器限制，两侧留白 | 步骤1 拆掉容器，图片按原比例铺满 |
| 长图要一直滑，一屏看不完 | 步骤2 把触点分区，点一下翻一屏 |
| 想全屏看，但系统全屏有坑 | 步骤3 提供真全屏备用方案 |

**核心交互**（步骤2 生效后）：

- 轻点屏幕 **下侧 25%** → 下一屏
- 轻点屏幕 **上侧 25%** → 上一屏
- **真全屏下翻到所有图最后，轻点** → 自动退出全屏（长按/任意方向、任意幅度滑动都不触发）
- 轻点 **中间 50%** → 点链接、菜单全部照常（**网站交互统一在中间区**）

### 适用环境

| 项 | 要求 |
|---|---|
| 设备 | iPad mini 2 及同代 iOS 设备（实测 iPad mini 2 / iOS 12.5.8） |
| 系统 | iOS 12.x（代码只用 ES5 语法，无依赖） |
| 浏览器 | **Safari 本体**（夸克等 iOS 第三方浏览器的全屏 API 大概率无效，见文末说明） |
| 设置 | 设置 → Safari → 高级 → JavaScript 必须开启 |

### 快速开始

#### 第 0 步：创建书签

iOS Safari 的「添加书签」对话框里 URL 字段是只读的，必须「先保存、再编辑」：

1. Safari 打开任意网页 → 分享按钮 →「添加书签」→ 直接保存
2. 点底部书签图标 → 进入书签列表 → 点「编辑」
3. 点进刚存的书签 → URL 字段全选删除 → 粘贴代码
4. 点「完成」→ **再进一次编辑**，确认 URL 开头真的写着 `javascript:`

三个书签各自独立创建，**不要合并**——合并后长度超过 iOS 12 书签上限，会保存失败或执行中断。代码必须保持一行。

也可以打开 [**一键复制页面**](index.html)（GitHub Pages 启用后可直接用）点按钮复制，省去手工选中长代码。

#### 三个书签

**步骤1 — 宽度适配**

```
javascript:(function(){function fix(im){if(im.getAttribute('data-mmfix'))return;im.setAttribute('data-mmfix','1');var p=im;while(p&&p!==document.documentElement){p.style.maxWidth='none';p.style.width='100%';p.style.paddingLeft='0';p.style.paddingRight='0';p.style.marginLeft='0';p.style.marginRight='0';p=p.parentElement}im.style.width='100vw';im.style.maxWidth='none';im.style.height='auto';im.style.display='block';im.style.margin='0'}document.querySelectorAll('img').forEach(fix);new MutationObserver(function(){document.querySelectorAll('img:not([data-mmfix])').forEach(fix)}).observe(document.documentElement,{childList:true,subtree:true});var s=document.createElement('style');s.textContent='html,body{margin:0!important;padding:0!important;background:#000!important}';document.head.appendChild(s)})()
```

逐层把每个 `<img>` 的祖先容器 `maxWidth/width/左右 padding/左右 margin` 清零，拆掉站点写死的固定宽度（解决画面右移、左侧留白）；图片本身 `width:100vw` 铺满视口。`data-mmfix` 标记防重复处理，`MutationObserver` 让懒加载追加的图片自动适配。

**步骤2 — 逐屏翻页**

```
javascript:(function(){var ts=0,sC=0,moved=0;addEventListener('touchstart',function(e){ts=Date.now();sC=e.touches[0].clientY;moved=0},true);addEventListener('touchmove',function(){moved=1},true);addEventListener('touchend',function(e){var t=e.changedTouches[0],c=t.clientY,H=innerHeight,h=H-80,y=Math.max(0,scrollY-(c<H*.25?h:-h)),MX=Math.max(1,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-H),sw=moved||Math.abs(t.clientY-sC)>8;if(!sw&&Date.now()-ts<500&&scrollY>=MX-2&&(document.webkitFullscreenElement||document.fullscreenElement)){e.preventDefault();e.stopPropagation();var E=document.webkitExitFullscreen||document.exitFullscreen;if(E)E.call(document);return}var o=document.elementFromPoint(t.clientX,t.clientY);if(o&&o.closest&&o.closest('a,button,[onclick]'))return;if(c>=H*.25&&c<=H*.75)return;e.preventDefault();e.stopPropagation();scrollTo(0,y);try{sessionStorage.setItem('mgy',y);sessionStorage.setItem('mgr',y/Math.max(1,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-H))}catch(x){}},true)})()
```

**当前 V2.10 逻辑**：轻点上侧 25% 回看一屏、下侧 25% 前进一屏，中间 50% 放行网站交互（链接、菜单）。**末尾退出**：真全屏下翻到所有图最后，**轻点**（未滑动 `!sw` + 时长 <500ms + `scrollY` 已到可滚范围-2）自动退出全屏；退出判断在 `elementFromPoint` 链接放行之前，不会跳下一话。退出判断一个触点坐标都不用（`c` 和由它派生的 `y` 全部拿掉），这是彻底修掉「下滑退出、上滑不退出」的关键；`sw = touchmove触发 || 相对位移>8px`，任意方向、任意幅度滑动都绝不退出。★ `sw` 只用于退出判断，不并入翻页分支，点击翻页不受影响。翻页用 `scrollY ± (innerHeight-80)` 相对滚动；**同时写 `mgy` 与 `mgr`，且 `mgr` 必须用目标位置 y 计算，不能读 `scrollY`**（原因见主文档回归分析）。步骤3 在 1.5 秒内拉回 15 次，`15` 是拉回次数，不是点击上限。

**步骤3 — 全屏 + 进出双向位置同步（备用）**

```
javascript:(function(){var e=document.documentElement,x=e.webkitRequestFullScreen||e.webkitRequestfullscreen,D=document.body,F=function(){return document.webkitFullscreenElement||document.fullscreenElement},H=function(){return Math.max(1,Math.max(D.scrollHeight,e.scrollHeight)-innerHeight)},P=function(){try{var y=sessionStorage.getItem('mgr');if(y)scrollTo(0,y*H())}catch(z){}},Q=function(){if(F())P()};try{sessionStorage.setItem('mgr',scrollY/H())}catch(z){}if(x)x.call(e);P();var n=0,t=setInterval(function(){Q();if(++n>15)clearInterval(t)},100);if(!window.rz){window.rz=1;addEventListener('webkitfullscreenchange',function(){if(F())P();else{setTimeout(P,200);setTimeout(P,300)}});addEventListener('resize',Q)}})()
```

进入真全屏并按比例同步位置：进全屏前把当前 `scrollY` 换算成比例写入 `mgr`，调用全屏 API 后 `P()` 立即按比例定位；因 Safari 进全屏是异步重排，`setInterval` 在 1.5 秒内拉回 15 次。Safari 进全屏会清零 `scrollY` 并重排布局（实测文档高 29379→23096、`innerHeight` 1253→1024），所以必须用比例而非绝对像素。

**★ V2.11 关键改动（修复「非全屏定位后进全屏漂移到旧画面」）**：**触发因在步骤2、缺陷在步骤3**——步骤3 从 V2.0 到 V2.10 代码一字未改，唯一变化是 V2.8 步骤2 新增「末尾轻点 → JS 调用 `exitFullscreen()`」，退出时机落在 `touchend` 事件栈内，撞上步骤3 的旧假设才暴露。V2.10 及以前的 `webkitfullscreenchange`/`resize` 监听器无条件 `fix()`，**退出全屏后在非全屏态仍按旧 `mgr` 拉回，覆盖用户在非全屏翻到的新位置**，下次进全屏就漂回旧画面。V2.11 把拉回拆成 `P()`（纯拉回）和 `Q()`（带全屏态门卫 `F()`，只在真全屏时拉回）：永久监听器在非全屏态走 `Q()` 不拉回，新位置得以保留。退出全屏走 `change` 的 else 分支，延迟 200ms + 300ms 两次 `P()`，等 Safari 重排稳定后恢复退出前画面；退出只读 `mgr` 不写，避免 `scrollY` 清零污染比例。`window.rz` 防监听器重复绑定。**只改步骤3，步骤1/2 翻页内核未动。**

#### 附：清空位置记录（可选书签）

`sessionStorage`（`mgy`/`mgr`）刷新后仍保留，重新走流程时步骤3 会跳回上次位置。想从头看就先点一次这个极短书签：

```
javascript:sessionStorage.clear()
```

#### 执行顺序

进入漫画页后依次点 **步骤1 → 步骤2**。日常这样就够了。

步骤3 留作备用：想要最大画面时最后点它。全屏后工具栏消失、没法再点书签，所以顺序不能变。

刷新页面后需要重新走一遍。

### 设计要点

| 设计 | 原因 |
|---|---|
| `touchend` + 捕获阶段 | 漫画站在 touchend 阶段就执行跳图逻辑，捕获阶段 `stopPropagation` 才能抢在前面 |
| 三段分区（上 25% / 中 50% / 下 25%） | 边缘负责翻页，中间放行原生滑动和菜单点击 |
| **末尾退出四条件**（V2.8，V2.10 彻底修） | `!sw` + 轻点(<500ms) + `scrollY>=可滚范围-2` + 真全屏，同时满足才退出；一个触点坐标都不用 |
| **退出判断不碰 `c` 与由它派生的 `y`**（V2.10） | V2.8 有 `c>H*.75` + `y=scrollY-(c<H*.25?h:-h)` 两处坐标依赖：下滑 c 偏大 → y 前进 → 末尾越界误退出，上滑反之。V2.9 只删前者，V2.10 把 c 和 y 全拿掉，末尾改用滚动位置 `scrollY` |
| 滑动用 `sw = moved \|\| 相对位移>8px` | `touchmove` 触发，或 touchend 相对 touchstart 的**差值**>8px（不依赖失真的绝对坐标，小幅滑动也拦得住）。★ `sw` 只用于退出判断，**绝不并入翻页放行分支**——V2.6 并进 `mv` 才毁掉点击翻页 |
| `touchstart` 记录时间戳 `ts` 与起点 `sC` | 用时长(<500ms)区分轻点、`sC` 供相对位移计算；不 `preventDefault` |
| 退出判断在链接放行之前 | 末尾「下一话」是链接，先放行会跳章；退出必须先截断 |
| 相对滚动 `scrollY ± h` | 手动微调后能从新位置接着翻，不会跳回旧网格 |
| `h = innerHeight - 80` | 扣掉 iOS 12 全屏页眉 5mm + 页脚 7mm 的遮挡（约 77px），末尾字不被压住 |
| `sessionStorage` 双写 + 比例定位 | 步骤2 翻页同时存 `mgy`（绝对）和 `mgr`（用目标 y 算的比例，不读 `scrollY`）；步骤3 反复拉回读持续更新的 `mgr`，停在原位且不吃掉翻页 |
| **全屏态门卫 `Q()`**（V2.11） | 拉回只在真全屏态执行；退出后非全屏态不拉回，用户新定位不被旧 `mgr` 覆盖，进全屏不再漂移到旧画面 |

**80 这个数**：12mm × 约 6.4 CSS px/mm ≈ 77px，取 80 留余量。每屏末尾仍被页脚盖住就调大（90/100），相邻屏重叠太多就调小（70/60）。

### 其他浏览器

| 浏览器 | 能否用这套代码 |
|---|---|
| Safari 本体 | ✅ 完整支持三个步骤，本方案就是为它写的 |
| 夸克等 iOS 第三方浏览器 | ⚠️ 步骤1、2 的 DOM/touch API 可用，但步骤3 的全屏 API 大概率无效（iOS 第三方浏览器用 WKWebView，`webkitRequestFullScreen` 通常不暴露）；能否执行 `javascript:` 书签需实测 |

### 已知问题

只用步骤1 + 步骤2 时一切正常。步骤3 的真全屏在 iOS 12 上有两个系统层限制，JS 无法根治：

| 问题 | 现象 | 处理 |
|---|---|---|
| 点页脚菜单死机 | 点「首页/上一话/下一话/目录」后 Safari 卡死 | 退出全屏再点（系统层 bug） |
| 中间小幅下滑退出全屏、上滑不会 | V2.8 退出判断两处触点坐标依赖（`c>H*.75` + 由 c 派生的 y）；V2.9 只删了前者 | 换 V2.10 步骤2（退出判断一个 c 都不用，`scrollY>=可滚范围-2` + `!sw`） |
| 从屏幕边缘起滑退出全屏 | **iOS 系统级边缘手势**（JS 拦不住） | 从中间起滑避开边缘，或点左上角 ✕ |
| 真全屏里直接下滑就退出 | 系统手势的边界/橡皮筋状态，不是步骤2 的代码误判（V2.10 已移除全部坐标依赖） | **先轻上滑一次，再下滑**就不退出（2026-11-27 真机实测）；或点左上角 ✕ |
| 末尾轻点没退出 / 跳下一话 | 未满足四条件（非真全屏 / 滑动中 / scrollY 未到最后），或用了旧步骤2 | 确认真全屏 + 轻点（未滑动）+ 已翻到所有图最后；V2.10 退出判断在链接放行前，不会跳章 |
| 退出后翻到新画面，再进全屏却漂回旧画面 | V2.10 及以前：步骤3 永久监听器在非全屏态仍按旧 `mgr` 拉回，覆盖新位置 | 换 **V2.11 步骤3**（`Q()` 门卫只在全屏态拉回）；若仍漂移，刷新后重走步骤1→2→3 |

退出全屏有两种方式：**翻到所有图最后轻点自动退出**（V2.8 新增、V2.10 彻底修，代码可控），或中途直接点左上角系统 ✕ 按钮。**仍然不要点页脚菜单**（系统层 bug）。

另外：只跑步骤1 + 步骤2 时，翻页产生的向下滚动会让 Safari 自动收起工具栏，看起来像全屏但没有打叉——点屏幕最顶部即可恢复工具栏。这其实是日常最舒服的阅读形态。

### 文件说明

| 文件 | 内容 |
|---|---|
| `README.md` | 本文档（中英双语） |
| `bookmarklets.js` | 三个书签代码，带详细注释 |
| `index.html` | 一键复制页面，可开启 GitHub Pages 后在 iPad 上直接访问 |

### 许可

MIT — 随便用，改了也行。如果这套东西帮你把老 iPad 救活了，点个 star 就行。

### 致谢

这套方案的调试过程比较曲折：从书签脚本长度限制、全屏 API 的手势限制，到 `touchend` 捕获阶段拦截、全屏态 `e.target` 失真、三元方向反转等一系列问题，由 WorkBuddy AI 助手协助逐轮定位并修复。代码注释中保留了关键决策的依据，方便后来者接手。

---

<a id="english"></a>

## English Version

Three Safari bookmarklets that fix three pain points of reading webtoons in iOS 12 Safari:

| Pain point | Fix |
|---|---|
| Images constrained by the site container, leaving side margins | Step 1 removes the container; images fill the viewport at native aspect ratio |
| Long strips require constant scrolling | Step 2 splits the screen into tap zones — one tap, one screen |
| Native fullscreen is buggy on iOS 12 | Step 3 offers optional true fullscreen |

**Core interaction** (after Step 2 is active):

- Tap the **bottom 25%** → next screen
- Tap the **top 25%** → previous screen
- **In true fullscreen, once you reach the very last image, tap** → exit fullscreen automatically (a long press or any swipe, in any direction or size, does not trigger it)
- Tap the **middle 50%** → links and site menus work normally (**all site interactions belong here**)

### Compatibility

| Item | Requirement |
|---|---|
| Device | iPad mini 2 and same-generation iOS devices (tested on iPad mini 2 / iOS 12.5.8) |
| OS | iOS 12.x (ES5 syntax only, no dependencies) |
| Browser | **Safari itself** (iOS third-party browsers such as Quark likely lack the fullscreen API — see notes below) |
| Settings | Settings → Safari → Advanced → JavaScript must be enabled |

### Quick Start

#### Step 0: Create the bookmarks

In iOS Safari, the URL field in the "Add Bookmark" dialog is read-only. You must **save first, then edit**:

1. Open any page in Safari → Share → Add Bookmark → save it as-is
2. Tap the bookmarks icon → enter the bookmark list → tap Edit
3. Open the bookmark you just saved → select all in the URL field → paste the code
4. Tap Done → **enter Edit again** and confirm the URL really starts with `javascript:`

Create the three bookmarks separately. **Do not merge them** — a merged URL exceeds the iOS 12 bookmark length limit and will fail to save or execute. Keep each code on a single line.

You can also open the [**one-click copy page**](index.html) (works once GitHub Pages is enabled) and tap a button to copy, instead of selecting long code by hand.

#### The three bookmarks

**Step 1 — Width fix**

```
javascript:(function(){function fix(im){if(im.getAttribute('data-mmfix'))return;im.setAttribute('data-mmfix','1');var p=im;while(p&&p!==document.documentElement){p.style.maxWidth='none';p.style.width='100%';p.style.paddingLeft='0';p.style.paddingRight='0';p.style.marginLeft='0';p.style.marginRight='0';p=p.parentElement}im.style.width='100vw';im.style.maxWidth='none';im.style.height='auto';im.style.display='block';im.style.margin='0'}document.querySelectorAll('img').forEach(fix);new MutationObserver(function(){document.querySelectorAll('img:not([data-mmfix])').forEach(fix)}).observe(document.documentElement,{childList:true,subtree:true});var s=document.createElement('style');s.textContent='html,body{margin:0!important;padding:0!important;background:#000!important}';document.head.appendChild(s)})()
```

Walks up every `<img>`'s ancestor containers, clearing `maxWidth/width/left-right padding/left-right margin` to remove hard-coded widths (fixing right-shifted pages and left margins); the image itself uses `width:100vw` to fill the viewport. A `data-mmfix` flag prevents reprocessing, and `MutationObserver` auto-adapts lazy-loaded images.

**Step 2 — Screen-by-screen paging**

```
javascript:(function(){var ts=0,sC=0,moved=0;addEventListener('touchstart',function(e){ts=Date.now();sC=e.touches[0].clientY;moved=0},true);addEventListener('touchmove',function(){moved=1},true);addEventListener('touchend',function(e){var t=e.changedTouches[0],c=t.clientY,H=innerHeight,h=H-80,y=Math.max(0,scrollY-(c<H*.25?h:-h)),MX=Math.max(1,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-H),sw=moved||Math.abs(t.clientY-sC)>8;if(!sw&&Date.now()-ts<500&&scrollY>=MX-2&&(document.webkitFullscreenElement||document.fullscreenElement)){e.preventDefault();e.stopPropagation();var E=document.webkitExitFullscreen||document.exitFullscreen;if(E)E.call(document);return}var o=document.elementFromPoint(t.clientX,t.clientY);if(o&&o.closest&&o.closest('a,button,[onclick]'))return;if(c>=H*.25&&c<=H*.75)return;e.preventDefault();e.stopPropagation();scrollTo(0,y);try{sessionStorage.setItem('mgy',y);sessionStorage.setItem('mgr',y/Math.max(1,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-H))}catch(x){}},true)})()
```

**Current V2.10 logic**: tap the top 25% to page back, bottom 25% to page forward, middle 50% passes site interactions through. **End-of-strip exit**: in true fullscreen, once you reach the very last image, a quick tap (not swiping `!sw` + <500 ms) exits fullscreen — `scrollY` must already be at the scroll range. The exit check uses no tap coordinates at all (`c` and the `y` derived from it are both removed — that was the true cause of "swipe-down exits, swipe-up doesn't"); `sw = touchmove fired || relative displacement >8px` so any swipe, any direction, any size, never exits. The exit check runs before `elementFromPoint` link pass-through, so it never jumps to the next chapter. ★ `sw` is used only in the exit check, never in the paging branch — tap-to-page is unaffected. Paging uses relative scroll `scrollY ± (innerHeight-80)`; **write both `mgy` and `mgr`, and `mgr` must be computed from the target position y, never from `scrollY`** (see the regression analysis in the main document). Step 3 re-restores 15 times over 1.5 s; `15` is the restore count, not a tap limit.

**Step 3 — Fullscreen with bidirectional position sync (optional)**

```
javascript:(function(){var e=document.documentElement,x=e.webkitRequestFullScreen||e.webkitRequestfullscreen,D=document.body,F=function(){return document.webkitFullscreenElement||document.fullscreenElement},H=function(){return Math.max(1,Math.max(D.scrollHeight,e.scrollHeight)-innerHeight)},P=function(){try{var y=sessionStorage.getItem('mgr');if(y)scrollTo(0,y*H())}catch(z){}},Q=function(){if(F())P()};try{sessionStorage.setItem('mgr',scrollY/H())}catch(z){}if(x)x.call(e);P();var n=0,t=setInterval(function(){Q();if(++n>15)clearInterval(t)},100);if(!window.rz){window.rz=1;addEventListener('webkitfullscreenchange',function(){if(F())P();else{setTimeout(P,200);setTimeout(P,300)}});addEventListener('resize',Q)}})()
```

Enters true fullscreen with proportional position sync: before entering, the current `scrollY` is converted to a ratio and stored in `mgr`; `P()` restores proportionally right after the fullscreen call. Because Safari's fullscreen reflow is asynchronous, a `setInterval` re-restores 15 times over 1.5 s. Safari zeroes `scrollY` and reflows on fullscreen (measured doc height 29379→23096, `innerHeight` 1253→1024), so ratios are required instead of absolute pixels.

**★ V2.11 key change (fixes "entering fullscreen drifts back to the old exit position after re-positioning in non-fullscreen")**: **the trigger is in Step 2, the defect is in Step 3** — Step 3 was byte-identical from V2.0 to V2.10; the only change was V2.8 Step 2 adding "tap at end → JS `exitFullscreen()`", which exits inside the `touchend` handler and collided with Step 3's old assumption. In V2.10 and earlier, the `webkitfullscreenchange`/`resize` listeners restored unconditionally — **after exiting fullscreen they kept restoring to the old `mgr` even in non-fullscreen, overwriting the new position the user paged to**, so the next fullscreen entry drifted back. V2.11 splits restore into `P()` (pure restore) and `Q()` (guarded by fullscreen-state check `F()`, restores only while truly fullscreen); in non-fullscreen the permanent listeners take the `Q()` path and do not restore, preserving the new position. Exiting fullscreen runs the `else` branch of the change event, delaying 200 ms + 300 ms for two `P()` calls so Safari's reflow settles before restoring. Exit only reads `mgr`, never rewrites it, so the zeroed `scrollY` cannot corrupt the ratio. A one-shot `window.rz` flag prevents duplicate listener binding. **Only Step 3 changed; the Step 1/2 paging core is untouched.**

#### Optional: clear the saved position

`sessionStorage` (`mgy`/`mgr`) survives a refresh, so Step 3 will jump back to the last position when you restart the flow. To start from the beginning, tap this very short bookmark first:

```
javascript:sessionStorage.clear()
```

#### Execution order

On a manga page, tap **Step 1 → Step 2**. That is enough for daily reading.

Keep Step 3 as a backup: tap it last when you want the largest possible picture. Fullscreen hides the toolbar, so no more bookmarks can be tapped — the order cannot change.

After refreshing the page, run the flow again.

### Design notes

| Design | Reason |
|---|---|
| `touchend` + capture phase | Manga sites bind "tap to jump to next image" on touchend; capture-phase `stopPropagation` wins the race |
| Three zones (top 25% / middle 50% / bottom 25%) | Edges handle paging; the middle passes through native scrolling and menu taps |
| **Four-condition end exit** (V2.8, fully fixed in V2.10) | `!sw` + quick tap (<500 ms) + `scrollY>=scroll-range-2` + true fullscreen, all required; no tap coordinate at all |
| **Exit test uses neither `c` nor the `y` derived from it** (V2.10) | V2.8 had `c>H*.75` + `y=scrollY-(c<H*.25?h:-h)`: a downward swipe ends with larger `c` → `y` forward → past-end false exit; up-swipe the opposite. V2.9 removed only the former; V2.10 removes both, using scroll position `scrollY` for the end test |
| Swipe detected by `sw = moved \|\| relative displacement>8px` | `touchmove` fired, or the touchend-minus-touchstart **difference** >8px (independent of distorted absolute coordinates, so small swipes are caught too). ★ `sw` is used **only in the exit check, never merged into the paging pass-through** — V2.6 merged it into `mv` and broke tap-to-page |
| `touchstart` records timestamp `ts` and start `sC` | Tap duration (<500 ms) distinguishes tap; `sC` feeds the relative-displacement check; no `preventDefault` |
| Exit check before link pass-through | The "next chapter" link at the end would be passed through first and jump chapters; exit must intercept first |
| Relative scroll `scrollY ± h` | Manual fine-tuning then continues from the new position instead of snapping back to an old grid |
| `h = innerHeight - 80` | Deducts the iOS 12 fullscreen header (~5mm) and footer (~7mm), about 77 CSS px, so the last line is not covered |
| `sessionStorage` dual write + proportional positioning | Step 2 saves both `mgy` (absolute) and `mgr` (ratio from the target y, never from `scrollY`) on each turn; Step 3 restores repeatedly on enter and exit, reading the continuously updated `mgr` to stay in place without overriding paging |
| **Fullscreen-state guard `Q()`** (V2.11) | Restore runs only while truly fullscreen; after exit, non-fullscreen restores stop so the user's new position is not overwritten by the old `mgr` — fullscreen entry no longer drifts back |

**Why 80**: 12mm × ~6.4 CSS px/mm ≈ 77px; 80 leaves a small margin. If the last line is still covered by the footer, increase it (90/100); if consecutive screens overlap too much, decrease it (70/60).

### Other browsers

| Browser | Does this work? |
|---|---|
| Safari itself | ✅ Full support for all three steps — this project is built for it |
| Quark and other iOS third-party browsers | ⚠️ Steps 1 and 2 use standard DOM/touch APIs and may work, but Step 3's fullscreen API likely won't (iOS third-party browsers use WKWebView, which typically does not expose `webkitRequestFullScreen`); whether `javascript:` bookmarks execute must be tested |

### Known issues

Steps 1 + 2 alone work fine. True fullscreen via Step 3 has two system-level limitations on iOS 12 that JavaScript cannot fix:

| Issue | Symptom | Workaround |
|---|---|---|
| Footer menu freezes Safari | Tapping Home / Previous / Next / Contents kills Safari | Exit fullscreen first (OS-level bug) |
| Small swipe-down in the middle exits fullscreen but swipe-up doesn't | V2.8's exit check had two tap-coordinate dependencies (`c>H*.75` + `y` derived from `c`); V2.9 removed only the former | Use V2.10 Step 2 (exit check uses no `c` at all: `scrollY>=scroll-range-2` + `!sw`) |
| Swipe from the screen edge exits fullscreen | **OS-level edge gesture** (JS cannot block it) | Swipe from the middle, avoid edges, or tap the ✕ top-left |
| Swiping down in fullscreen still exits | System-level boundary/rubber-band gesture, not Step 2 (V2.10 has no tap-coordinate dependency) | **Swipe up once first, then swipe down** — the down-swipe will not exit (tested on device, 2026-11-27); or tap the ✕ top-left |
| End tap does not exit / jumps chapter | One of the four conditions unmet (not true fullscreen / swiping / scrollY not at end), or an old Step 2 is in use | Use true fullscreen + a quick tap (not swiping) + reach the very last image; V2.10 checks exit before link pass-through, so it never jumps chapters |
| After exiting and paging to a new position, re-entering fullscreen drifts back to the old one | V2.10 and earlier: Step 3's permanent listeners kept restoring to the old `mgr` in non-fullscreen, overwriting the new position | Use **V2.11 Step 3** (`Q()` guard restores only while fullscreen); if it still drifts, refresh and rerun Steps 1→2→3 |

Exit fullscreen in two ways: **quick-tap at the very last image to exit automatically** (added in V2.8, fully fixed in V2.10, code-controlled), or tap the system ✕ button at the top-left mid-strip. **Still do not tap footer menus** (system-level bug).

Also: with Steps 1 + 2 only, the downward scroll from paging makes Safari auto-hide its toolbars. It looks like fullscreen but has no close button — tap the very top of the screen to bring the toolbars back. This is actually the most comfortable everyday reading mode.

### Files

| File | Contents |
|---|---|
| `README.md` | This document (Chinese + English) |
| `bookmarklets.js` | The three bookmarklets, heavily commented |
| `index.html` | One-click copy page; enable GitHub Pages to open it directly on iPad |

### License

MIT — use it, modify it, whatever. If this revived your old iPad, a star is enough.

### Acknowledgments

Debugging this was a winding road: bookmarklet length limits, fullscreen gesture restrictions, touchend capture-phase interception, distorted `e.target` in fullscreen, and a reversed ternary branch — all located and fixed iteratively with assistance from the WorkBuddy AI assistant. Code comments preserve the reasoning behind each decision so others can pick it up.
