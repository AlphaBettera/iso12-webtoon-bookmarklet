# iOS 12 条漫逐屏翻页书签 / Webtoon Pager

> 让老 iPad / iPhone 上的 Safari 把条漫变成「点一下翻一屏」的阅读器——无需越狱、无需 App、无需换新系统。
> Turn an old iPad / iPhone Safari into a tap-to-page webtoon reader — no jailbreak, no app, no OS upgrade.

**语言 / Language**: [中文](#中文版) · [English](#english)

> **版本说明**：当前为 **V2.1**（全屏可滑动版 · 17.5/65/17.5 分区微调）。在用户真机实测的 V2.0 基础上，只改了步骤2、3 以解决「全屏中间无法滑动」：步骤2 用触摸位移判定（>15px 视为滑动并放行原生滚动，轻点才翻页），步骤3 加 `window.sliding` 标志在滑动期间暂停拉回。步骤1 完全不动。
> **Version note**: This is **V2.1** (fullscreen-scrollable · 17.5/65/17.5 zone tweak). Based on the device-verified V2.0, only Steps 2 and 3 changed to fix "cannot scroll in fullscreen": Step 2 uses touch-displacement detection (>15px means scroll, passed through; only taps page), and Step 3 adds a `window.sliding` flag that pauses restores while scrolling. Step 1 is untouched.

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

- 点屏幕 **下侧 17.5%** → 下一屏
- 点屏幕 **上侧 17.5%** → 上一屏
- 在任意位置 **滑动**（手指移动 >15px）→ 原生滚动，全屏下也能调整位置
- 轻点 **中间 65%** → 点链接、菜单全部照常

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
javascript:(function(){var sY=0,sC=0,act=0;function R(){try{sessionStorage.setItem('mgr',scrollY/Math.max(1,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-innerHeight))}catch(x){}}addEventListener('touchstart',function(e){act=1;sY=scrollY;sC=e.touches[0].clientY},true);addEventListener('touchend',function(e){var t=e.changedTouches[0],mv=act&&(Math.abs(t.clientY-sC)>15||Math.abs(scrollY-sY)>15);act=0;if(mv){window.sliding=1;setTimeout(function(){R();window.sliding=0},500);return}var o=document.elementFromPoint(t.clientX,t.clientY);if(o&&o.closest&&o.closest('a,button,[onclick]'))return;var c=t.clientY,H=innerHeight;if(c>=H*.175&&c<=H*.825)return;e.preventDefault();e.stopPropagation();var h=H-80,y=Math.max(0,scrollY-(c<H*.175?h:-h));scrollTo(0,y);try{sessionStorage.setItem('mgy',y);R()}catch(x){}},true)})()
```

**先判手势，再判位置**：位移 >15px 是滑动，直接放行原生滚动；只有轻点才看位置——上侧 17.5% 回看、中间 65% 放行菜单、下侧 17.5% 前进。滑动后 500ms 更新 `mgr`，并把 `window.sliding` 置 1 让步骤3 暂停拉回，避免手动调整的位置被覆盖。用 `elementFromPoint` 按触点坐标检测交互元素，全屏下 `e.target` 退化也不影响菜单。**每次翻页同时写 `mgy` 和 `mgr`**，不要删掉。

**步骤3 — 全屏 + 进出双向位置同步（备用）**

```
javascript:(function(){var e=document.documentElement,x=e.webkitRequestFullScreen||e.webkitRequestfullscreen,D=document.body,H=function(){return Math.max(1,Math.max(D.scrollHeight,e.scrollHeight)-innerHeight)},F=function(){try{sessionStorage.setItem('mgr',scrollY/H())}catch(z){}};function fix(){if(window.sliding)return;try{var y=sessionStorage.getItem('mgr');if(y)scrollTo(0,y*H())}catch(z){}}F();if(x)x.call(e);fix();var n=0,t=setInterval(function(){fix();if(++n>15)clearInterval(t)},100);if(!window.rz){window.rz=1;addEventListener('webkitfullscreenchange',fix);addEventListener('resize',fix)}})()
```

进入真全屏并按比例同步位置：`F()` 在进全屏前存当前比例 `mgr`，调用全屏 API 后 `fix()` 立即按比例定位；因 Safari 进全屏是异步重排，`setInterval` 在 1.5 秒内拉回 15 次。**V2.1 关键改动**：`fix()` 开头有 `if(window.sliding)return`——手动滑动期间暂停所有拉回，否则滑动位置会被覆盖回旧 `mgr`，这正是原来「全屏中间滑不动」的根因。`webkitfullscreenchange` 和 `resize` 双监听保证退出全屏也停在原位；`window.rz` 防重复绑定。Safari 进全屏会清零 `scrollY` 并重排布局（实测文档高 29379→23096、`innerHeight` 1253→1024），所以必须用比例而非绝对像素。

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
| 三段分区（上 17.5% / 中 65% / 下 17.5%） | 边缘负责翻页，中间放行原生滑动和菜单点击 |
| `elementFromPoint` 取元素 | 全屏后 `e.target` 会变成根元素，按触点坐标取实际元素才可靠 |
| 位移 >15px 放行 | 全屏态 `innerHeight` 失真会让纯坐标分区错位；改用位移判定，滑动一律放行，与坐标无关 |
| `window.sliding` 暂停拉回 | 滑动期间步骤3 不拉回，500ms 后更新 `mgr` 再恢复，手动调整的位置不会被覆盖 |
| 相对滚动 `scrollY ± h` | 手动微调后能从新位置接着翻，不会跳回旧网格 |
| `h = innerHeight - 80` | 扣掉 iOS 12 全屏页眉 5mm + 页脚 7mm 的遮挡（约 77px），末尾字不被压住 |
| `sessionStorage` 双写 + 比例定位 | 步骤2 翻页同时存 `mgy`（绝对）和 `mgr`（比例）；步骤3 反复拉回读持续更新的 `mgr`，停在原位且不吃掉翻页；滑动期间用 `window.sliding` 暂停拉回 |

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
| 点页脚菜单死机 | 点「首页/上一话/下一话/目录」后 Safari 卡死 | 退出全屏再点，或换用带自动退出全屏的步骤2（见本地主文档） |
| 无法滑动页面 | V2.0 下全屏 `innerHeight` 失真 + 步骤3 反复拉回覆盖 | V2.1 已用位移判定 + `window.sliding` 修复，全屏内可直接滑动 |

用步骤3 时可以点上下 17.5% 翻页、也可以在中间滑动调整位置（V2.1 起支持）；**仍然不要点页脚菜单**（系统层 bug）。

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

- Tap the **bottom 17.5%** → next screen
- Tap the **top 17.5%** → previous screen
- **Swipe anywhere** (finger moves >15px) → native scrolling, works even in fullscreen
- Tap the **middle 65%** → links and site menus work normally

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
javascript:(function(){var sY=0,sC=0,act=0;function R(){try{sessionStorage.setItem('mgr',scrollY/Math.max(1,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-innerHeight))}catch(x){}}addEventListener('touchstart',function(e){act=1;sY=scrollY;sC=e.touches[0].clientY},true);addEventListener('touchend',function(e){var t=e.changedTouches[0],mv=act&&(Math.abs(t.clientY-sC)>15||Math.abs(scrollY-sY)>15);act=0;if(mv){window.sliding=1;setTimeout(function(){R();window.sliding=0},500);return}var o=document.elementFromPoint(t.clientX,t.clientY);if(o&&o.closest&&o.closest('a,button,[onclick]'))return;var c=t.clientY,H=innerHeight;if(c>=H*.175&&c<=H*.825)return;e.preventDefault();e.stopPropagation();var h=H-80,y=Math.max(0,scrollY-(c<H*.175?h:-h));scrollTo(0,y);try{sessionStorage.setItem('mgy',y);R()}catch(x){}},true)})()
```

**Gesture first, then position**: displacement >15px means scroll and is passed straight through; only taps use position — top 17.5% pages back, middle 65% passes menus through, bottom 17.5% pages forward. After a swipe it waits 500 ms, updates `mgr`, and sets `window.sliding` so Step 3 pauses its restores and won't overwrite your manual adjustment. `elementFromPoint` hit-tests by touch coordinates, so menus stay tappable even when `e.target` degrades in fullscreen. **Each turn writes both `mgy` and `mgr`** — do not remove them.

**Step 3 — Fullscreen with bidirectional position sync (optional)**

```
javascript:(function(){var e=document.documentElement,x=e.webkitRequestFullScreen||e.webkitRequestfullscreen,D=document.body,H=function(){return Math.max(1,Math.max(D.scrollHeight,e.scrollHeight)-innerHeight)},F=function(){try{sessionStorage.setItem('mgr',scrollY/H())}catch(z){}};function fix(){if(window.sliding)return;try{var y=sessionStorage.getItem('mgr');if(y)scrollTo(0,y*H())}catch(z){}}F();if(x)x.call(e);fix();var n=0,t=setInterval(function(){fix();if(++n>15)clearInterval(t)},100);if(!window.rz){window.rz=1;addEventListener('webkitfullscreenchange',fix);addEventListener('resize',fix)}})()
```

Enters true fullscreen with proportional position sync: `F()` saves the current ratio `mgr` before entering, and `fix()` restores proportionally right after the fullscreen call. Because Safari's fullscreen reflow is asynchronous, a `setInterval` re-restores 15 times over 1.5 s. **V2.1 key change**: `fix()` starts with `if(window.sliding)return` — all restores pause during a manual swipe; otherwise the swiped position is overwritten by the old `mgr`, which was the root cause of "cannot scroll in fullscreen". `webkitfullscreenchange` and `resize` listeners keep the exit position aligned; a one-shot `window.rz` flag prevents duplicate binding. Safari zeroes `scrollY` and reflows on fullscreen (measured doc height 29379→23096, `innerHeight` 1253→1024), so ratios are required instead of absolute pixels.

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
| Three zones (top 17.5% / middle 65% / bottom 17.5%) | Edges handle paging; the middle passes through native scrolling and menu taps |
| `elementFromPoint` for hit-testing | In fullscreen `e.target` degrades to the root element; hit-testing by touch coordinates stays accurate |
| Relative scroll `scrollY ± h` | Manual fine-tuning then continues from the new position instead of snapping back to an old grid |
| `h = innerHeight - 80` | Deducts the iOS 12 fullscreen header (~5mm) and footer (~7mm), about 77 CSS px, so the last line is not covered |
| `sessionStorage` dual write + proportional positioning | Step 2 saves both `mgy` (absolute) and `mgr` (ratio) on each turn; Step 3's repeat-restore reads the continuously updated `mgr` to stay in place without overriding paging; a `window.sliding` flag pauses restores during swipes |

**Why 80**: 12mm × ~6.4 CSS px/mm ≈ 77px; 80 leaves a small margin. If the last line is still covered by the footer, increase it (90/100); if consecutive screens overlap too much, decrease it (70/60).

### Other browsers

| Browser | Does this work? |
|---|---|
| Safari itself | ✅ Full support for all three steps — this project is built for it |
| Quark and other iOS third-party browsers | ⚠️ Steps 1 and 2 use standard DOM/touch APIs and may work, but Step 3's fullscreen API likely won't (iOS third-party browsers use WKWebView, which typically does not expose `webkitRequestFullScreen`); whether `javascript:` bookmarks execute at all needs testing on device |

### Known issues

Steps 1 + 2 alone work fine. True fullscreen via Step 3 has two system-level limitations on iOS 12 that JavaScript cannot fix:

| Issue | Symptom | Workaround |
|---|---|---|
| Footer menu freezes Safari | Tapping Home / Previous / Next / Contents kills Safari | Exit fullscreen first, or use the auto-exit variant of Step 2 (see the local main document) |
| Cannot scroll in fullscreen | `innerHeight` is distorted in fullscreen, so the middle zone is misaligned | Exit fullscreen before scrolling |

With Step 3 you can tap the top/bottom 17.5% zones and also swipe in the middle to adjust position (supported since V2.1); **still do not tap footer menus** (system-level bug).

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
