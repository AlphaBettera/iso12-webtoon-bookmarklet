# iOS 12 条漫逐屏翻页书签

> 让老 iPad / iPhone 上的 Safari 把条漫变成「点一下翻一屏」的阅读器——无需越狱、无需 App、无需越新系统。

用三个 Safari 书签脚本（bookmarklet）解决 iOS 12 Safari 上看条漫的三个痛点：

| 痛点 | 解决 |
|---|---|
| 图片被网站容器限制，两侧留白 | 步骤1 拆掉容器，图片按原比例铺满 |
| 长图要一直滑，一屏看不完 | 步骤2 把触点分区，点一下翻一屏 |
| 想全屏看，但系统全屏有坑 | 步骤3 提供真全屏备用方案 |

**核心交互**（步骤2 生效后）：

- 点屏幕 **下侧 25%** → 下一屏
- 点屏幕 **上侧 25%** → 上一屏
- 点 **中间 50%** → 网页原生滑动、点链接、菜单全部照常

---

## 适用环境

| 项 | 要求 |
|---|---|
| 设备 | iPad mini 2 及同代 iOS 设备（实测 iPad mini 2 / iOS 12.5.8） |
| 系统 | iOS 12.x（代码只用 ES5 语法，无依赖） |
| 浏览器 | **Safari 本体**（夸克等第三方浏览器不执行 bookmarklet） |
| 设置 | 设置 → Safari → 高级 → JavaScript 必须开启 |

---

## 快速开始

### 第 0 步：创建书签

iOS Safari 的「添加书签」对话框里 URL 字段是只读的，必须「先保存、再编辑」：

1. Safari 打开任意网页 → 分享按钮 →「添加书签」→ 直接保存
2. 点底部书签图标 → 进入书签列表 → 点「编辑」
3. 点进刚存的书签 → URL 字段全选删除 → 粘贴代码
4. 点「完成」→ **再进一次编辑**，确认 URL 开头真的写着 `javascript:`

三个书签各自独立创建，**不要合并**——合并后长度超过 iOS 12 书签上限，会保存失败或执行中断。代码必须保持一行。

也可以打开 [**一键复制页面**](index.html)（GitHub Pages 启用后可直接用）点按钮复制，省去手工选中长代码。

### 三个书签

**步骤1 — 宽度适配**

```
javascript:document.head.insertAdjacentHTML('beforeend','<style>html,body{margin:0!important;padding:0!important;overflow-x:hidden!important;background:#000}img{width:auto!important;max-width:100%!important;height:auto!important;display:block!important;margin:0 auto!important}</style>')
```

`width:auto` 不强行放大图片，`display:block` + `margin:0` 拆掉网站给图片设的分页容器，让所有图片连成连续长流——这是逐屏翻页的前提。

**步骤2 — 逐屏翻页**

```
javascript:addEventListener('touchend',function(e){var t=e.changedTouches[0],o=document.elementFromPoint(t.clientX,t.clientY);if(o&&o.closest&&o.closest('a,button,[onclick]'))return;var c=t.clientY,H=innerHeight;if(c>=H*.25&&c<=H*.75)return;e.preventDefault();e.stopPropagation();var h=H-80,y=Math.max(0,scrollY-(c<H*.25?h:-h));scrollTo(0,y);try{sessionStorage.setItem('mgy',y)}catch(x){}},true)
```

**步骤3 — 全屏 + 位置恢复（备用）**

```
javascript:(function(){var e=document.documentElement,x=e.webkitRequestFullScreen||e.webkitRequestFullscreen||e.requestFullscreen;if(x)x.call(e);try{var y=sessionStorage.getItem('mgy');if(y)setTimeout(function(){scrollTo(0,parseInt(y))},400)}catch(z){}})()
```

### 附：清空位置记录（可选书签）

`sessionStorage` 刷新后仍保留，重新走流程时步骤3 会跳回上次位置。想从头看就先点一次这个极短书签：

```
javascript:sessionStorage.removeItem('mgy')
```

### 执行顺序

进入漫画页后依次点 **步骤1 → 步骤2**。日常这样就够了。

步骤3 留作备用：想要最大画面时最后点它。全屏后工具栏消失、没法再点书签，所以顺序不能变。

刷新页面后需要重新走一遍。

---

## 设计要点

| 设计 | 原因 |
|---|---|
| `touchend` + 捕获阶段 | 漫画站在 touchend 阶段就执行跳图逻辑，捕获阶段 `stopPropagation` 才能抢在前面 |
| 三段分区（上 25% / 中 50% / 下 25%） | 边缘负责翻页，中间放行原生滑动和菜单点击 |
| `elementFromPoint` 取元素 | 全屏后 `e.target` 会变成根元素，按触点坐标取实际元素才可靠 |
| 相对滚动 `scrollY ± h` | 手动滑动微调后能从新位置接着翻，不会跳回旧网格 |
| `h = innerHeight - 80` | 扣掉 iOS 12 全屏页眉 5mm + 页脚 7mm 的遮挡（约 77px），末尾字不被压住 |
| `sessionStorage` | 步骤2 每次翻页存位置，步骤3 进全屏时读回，重进全屏不回第一张 |

**80 这个数**：12mm × 约 6.4 CSS px/mm ≈ 77px，取 80 留余量。每屏末尾仍被页脚盖住就调大（90/100），相邻屏重叠太多就调小（70/60）。

---

## 已知问题

只用步骤1 + 步骤2 时一切正常。步骤3 的真全屏在 iOS 12 上有两个系统层限制，JS 无法根治：

| 问题 | 现象 | 处理 |
|---|---|---|
| 点页脚菜单死机 | 点「首页/上一话/下一话/目录」后 Safari 卡死 | 退出全屏再点，或换用带自动退出全屏的步骤2 |
| 无法滑动页面 | 真全屏下 `innerHeight` 失真，中间判断区错位 | 退出全屏再滑动 |

用步骤3 时请只用上下 25% 翻页，不要点菜单、不要手动滑动。

另外：只跑步骤1 + 步骤2 时，翻页产生的向下滚动会让 Safari 自动收起工具栏，看起来像全屏但没有打叉——点屏幕最顶部即可恢复工具栏。这其实是日常最舒服的阅读形态。

---

## 文件说明

| 文件 | 内容 |
|---|---|
| `README.md` | 本文档 |
| `bookmarklets.js` | 三个书签代码，带详细注释 |
| `index.html` | 一键复制页面，可开启 GitHub Pages 后在 iPad 上直接访问 |

---

## 许可

MIT — 随便用，改了也行。如果这套东西帮你把老 iPad 救活了，点个 star 就行。

---

## 致谢

这套方案的调试过程比较曲折：从书签脚本长度限制、全屏 API 的手势限制，到 `touchend` 捕获阶段拦截、全屏态 `e.target` 失真、三元方向反转等一系列问题，是在 AI 助理 **阿财**（WorkBuddy）的协助下逐轮定位并修复的。代码注释中保留了关键决策的依据，方便后来者接手。
