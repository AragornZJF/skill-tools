#!/usr/bin/env node
'use strict';

// offline-bundle.js
// 把 knowledge-graph-map 生成的 HTML 变成可离线打开的产物。
//
// 两种模式：
//   默认（modular）—— 产出"文件夹"：JS 拆成独立文件，HTML 用经典 <script src> 引入。
//       经典脚本在 file:// 下可正常加载，双击 index.html 即离线打开、无需服务器。
//   --single        —— 旧的单文件模式：把 ECharts/FA 全部内联进一个 HTML（向后兼容）。
//
// 做法（modular）：
//   1. ECharts  → vendor/echarts.min.js，HTML 改 <script src>（外部文件无需 </script> 转义）
//   2. Tailwind Play CDN → 移除（模板用原生 CSS，Tailwind 未被使用）
//   3. Font Awesome → 内联 <style>（CSS + base64 solid 字体）—— CSS 保持内联，本次只外置 JS
//   4. 模板内联 <script> → js/graph.js，HTML 改 <script src>
//   5. 主题选择器 → js/theme-picker.js（pickerCSS 仍内联 <style>）
//
// 用法：
//   node offline-bundle.js <input.html>                 # 默认 modular：输出 <input去扩展名>/ 文件夹
//   node offline-bundle.js <input.html> <out>           # modular：输出 <out>/ 文件夹
//   node offline-bundle.js <input.html> --single        # 单文件：覆盖 input
//   node offline-bundle.js <input.html> <out.html> --single  # 单文件：写到 out.html
//
// 首次运行会从 CDN 下载库并缓存到 vendor-cache/；之后完全离线可用。

const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_DIR = path.join(__dirname, 'vendor-cache');

const ASSETS = {
  echarts: {
    url: 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js',
    file: 'echarts.min.js'
  },
  faCss: {
    url: 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/css/all.min.css',
    file: 'fontawesome-all.min.css'
  },
  faSolidWoff2: {
    url: 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/webfonts/fa-solid-900.woff2',
    file: 'fa-solid-900.woff2'
  }
};

function fetch(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirects > 5) return reject(new Error('too many redirects'));
        res.resume();
        return resolve(fetch(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function getAsset(key) {
  const a = ASSETS[key];
  const cachePath = path.join(CACHE_DIR, a.file);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.error('  下载 ' + a.url);
  const buf = await fetch(a.url);
  fs.writeFileSync(cachePath, buf);
  return buf;
}

// 内联用 FA CSS（solid woff2 转 base64 data URI，其它格式删除）。
// 两种模式共用：modular 里 FA 仍内联 <style>（本次只外置 JS）。
async function buildFaCss() {
  let faCss = (await getAsset('faCss')).toString('utf-8');
  const woff2 = (await getAsset('faSolidWoff2')).toString('base64');
  faCss = faCss.replace(/url\(\.\.\/webfonts\/fa-solid-900\.woff2\)/g, 'url(data:font/woff2;base64,' + woff2 + ')');
  faCss = faCss.replace(/,?\s*url\(\.\.\/webfonts\/fa-solid-900\.(?:ttf|woff|eot|svg)[^)]*\)\s*format\([^)]*\)/g, '');
  return faCss;
}

// 主题选择器：用"自定义主题化下拉"替换原生 <select>。
// 原生 <select> 的 option 列表在 Windows 上由系统渲染、无法主题化，故注入 div 下拉。
// 依赖模板约定：全局 themes(const)、全局 switchTheme(fn)。
// CSS 两种模式都内联 <style>；JS 在 modular 模式外置为 js/theme-picker.js。
const pickerCSS = `
.kg-picker{position:relative;display:inline-block;font-size:13px;font-family:inherit;}
.kg-picker__btn{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid #1e2250;border-radius:9px;cursor:pointer;font-weight:500;letter-spacing:.2px;outline:none;background:#1a1f4e;color:#e0e0ff;transition:transform .18s ease,box-shadow .18s ease;font-family:inherit;}
.kg-picker__btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.22);}
.kg-picker__btn.is-open,.kg-picker__btn:focus{box-shadow:0 0 0 2px rgba(120,160,255,.6);}
.kg-picker__sw{width:13px;height:13px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3);flex:none;}
.kg-picker__lbl{white-space:nowrap;}
.kg-picker__caret{flex:none;opacity:.85;transition:transform .2s ease;}
.kg-picker__btn.is-open .kg-picker__caret{transform:rotate(180deg);}
.kg-picker__panel{position:absolute;top:calc(100% + 6px);right:0;min-width:172px;margin:0;padding:6px;list-style:none;border:1px solid #1e2250;border-radius:11px;box-shadow:0 14px 34px rgba(0,0,0,.32);background:#111638;color:#e0e0ff;display:none;z-index:50;font-family:inherit;}
.kg-picker__panel.is-open{display:block;animation:kgFade .16s ease;}
@keyframes kgFade{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}
.kg-picker__item{display:flex;align-items:center;gap:9px;padding:8px 12px;border-radius:7px;cursor:pointer;font-weight:500;white-space:nowrap;}
.kg-picker__item:hover{background:color-mix(in srgb,currentColor 16%,transparent);}
.kg-picker__item.is-active{font-weight:700;}
.kg-picker__item.is-active::after{content:'✓';margin-left:auto;opacity:.85;}
.kg-picker__dot{width:11px;height:11px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);}
.toolbar,.footer-tips,.btn,.kg-picker__btn,.kg-picker__panel{transition:background-color .45s ease,color .45s ease,border-color .45s ease,transform .18s ease,box-shadow .18s ease;}
.kg-picker__item{transition:background-color .18s ease,color .45s ease;}
`;

const pickerJS = `
(function(){
  function init(){
    var sel=document.getElementById('themeSelect');
    if(!sel){return;}
    var THEMES=(typeof themes!=='undefined')?themes:null;
    if(!THEMES){return;}
    var opts=[];
    for(var i=0;i<sel.options.length;i++){opts.push({v:sel.options[i].value,t:sel.options[i].textContent});}
    sel.style.display='none';
    var wrap=document.createElement('div');
    wrap.className='kg-picker';
    wrap.innerHTML='<button type="button" class="kg-picker__btn"><span class="kg-picker__sw"></span><span class="kg-picker__lbl"></span><svg class="kg-picker__caret" viewBox="0 0 12 12" width="11" height="11"><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><ul class="kg-picker__panel"></ul>';
    sel.parentNode.insertBefore(wrap,sel.nextSibling);
    var btn=wrap.querySelector('.kg-picker__btn');
    var lbl=wrap.querySelector('.kg-picker__lbl');
    var sw=wrap.querySelector('.kg-picker__sw');
    var panel=wrap.querySelector('.kg-picker__panel');
    opts.forEach(function(o){
      var li=document.createElement('li');
      li.className='kg-picker__item';
      li.setAttribute('data-value',o.v);
      var tt=THEMES[o.v]||{};
      li.innerHTML='<span class="kg-picker__dot" style="background:'+((tt.colors&&tt.colors[0])||'#888')+'"></span>'+o.t;
      li.addEventListener('click',function(e){e.stopPropagation();if(typeof switchTheme==='function'){switchTheme(o.v);}paint(o.v);close();});
      panel.appendChild(li);
    });
    function paint(name){
      var t=THEMES[name]||{};
      lbl.textContent=t.name||name;
      btn.style.background=t.buttonBg||'';
      btn.style.color=t.textPrimary||'';
      btn.style.borderColor=t.borderColor||'';
      sw.style.background=((t.colors&&t.colors[0])||t.background||'');
      panel.style.background=t.toolbarBg||t.cardBg||'';
      panel.style.borderColor=t.borderColor||'';
      panel.style.color=t.textPrimary||'';
      var c=panel.children;
      for(var i=0;i<c.length;i++){c[i].classList.toggle('is-active',c[i].getAttribute('data-value')===name);c[i].style.color=t.textPrimary||'';}
    }
    function open(){panel.classList.add('is-open');btn.classList.add('is-open');}
    function close(){panel.classList.remove('is-open');btn.classList.remove('is-open');}
    btn.addEventListener('click',function(e){e.stopPropagation();panel.classList.contains('is-open')?close():open();});
    document.addEventListener('click',close);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){close();}});
    paint(sel.value||'dark-tech');
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
`;

// 注入点锚定：用 lastIndexOf 找"真正的"文档 </head>/</body>。
// （single 模式下 echarts 内联后其 saveAsImage 模板串里也含 </head>/</body>，replace 会误匹配首个；
//  modular 模式下 echarts/模板都是外部文件、HTML 无此问题，但 lastIndexOf 同样安全，统一用它。）
function injectBeforeLast(html, tag, snippet) {
  const idx = html.lastIndexOf(tag);
  if (idx === -1) return html;
  return html.slice(0, idx) + snippet + html.slice(idx);
}

// minify 工具（零依赖，仅 Node 内置）。
// 安全约束：minifyJs 不碰 // 行注释（避免误伤字符串/正则里的 //，如 echarts 里的 URL）、
//           保留换行（JS 依赖自动分号插入，删换行会断码）——故只对模板/picker JS 用，跳过 echarts。
//           minifyCss 是标准 CSS 压缩；对已压缩的 FA css 是 no-op。
// 注意：echarts(~1MB) 与 FA woff2(~210KB base64) 本就是压缩版、占大头，minify 只省模板/页面部分（<1%）。
function minifyCss(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([:;{}>,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}
function minifyJs(js) {
  return js.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((l) => l.trim())
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n')
    .trim() + '\n';
}

// ─────────────────────────────────────────────────────────
// modular 模式：产出文件夹（JS + CSS 全部外置，HTML 只剩 <script src>/<link>）
// ─────────────────────────────────────────────────────────
async function buildModular(input, outDir, noMinify) {
  let html = fs.readFileSync(input, 'utf-8');
  fs.mkdirSync(path.join(outDir, 'vendor'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'js'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'css'), { recursive: true });
  const report = [];
  const minJs = (s) => (noMinify ? s : minifyJs(s));
  const minCss = (s) => (noMinify ? s : minifyCss(s));

  // 1) ECharts → vendor/echarts.min.js + <script src>
  const echartsJs = (await getAsset('echarts')).toString('utf-8');
  fs.writeFileSync(path.join(outDir, 'vendor/echarts.min.js'), echartsJs, 'utf-8');
  const echBefore = html;
  html = html.replace(
    /<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/echarts[^"]*">\s*<\/script>/,
    '<script src="vendor/echarts.min.js"></script>'
  );
  report.push(html !== echBefore ? 'ECharts → vendor/echarts.min.js' : '⚠ 未找到 ECharts 标签');

  // 2) Tailwind Play → 移除（未被使用）
  const twBefore = html;
  html = html.replace(/<script\s+src="https:\/\/cdn\.tailwindcss\.com">\s*<\/script>\s*/g, '');
  report.push(html !== twBefore ? 'Tailwind Play 已移除(未使用)' : '(无 Tailwind 标签)');

  // 3) Font Awesome → vendor/fontawesome.min.css + vendor/fa-solid-900.woff2 + <link>
  //    solid woff2 改为同目录相对引用（不再 base64）；其它格式(ttf/woff/eot)删除。
  let faCss = (await getAsset('faCss')).toString('utf-8');
  const woff2Buf = await getAsset('faSolidWoff2');
  fs.writeFileSync(path.join(outDir, 'vendor/fa-solid-900.woff2'), woff2Buf);
  faCss = faCss.replace(/url\(\.\.\/webfonts\/fa-solid-900\.woff2\)/g, 'url(fa-solid-900.woff2)');
  faCss = faCss.replace(/,?\s*url\(\.\.\/webfonts\/fa-solid-900\.(?:ttf|woff|eot|svg)[^)]*\)\s*format\([^)]*\)/g, '');
  fs.writeFileSync(path.join(outDir, 'vendor/fontawesome.min.css'), faCss, 'utf-8');
  const faBefore = html;
  html = html.replace(
    /<link[^>]*href="https:\/\/cdn\.jsdelivr\.net\/npm\/@fortawesome\/fontawesome-free[^"]*"[^>]*>/,
    '<link rel="stylesheet" href="vendor/fontawesome.min.css">'
  );
  report.push(html !== faBefore ? 'Font Awesome → vendor/fontawesome.min.css + 字体' : '⚠ 未找到 Font Awesome 标签');

  // 4) 页面模板 CSS → css/page.css + <link>
  //    此时 FA 已是 <link>，输入里唯一的内联 <style> 即 knowledge-graph-map 的页面样式。
  const pageStyleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (pageStyleMatch) {
    const pageCss = minCss(pageStyleMatch[1]);
    fs.writeFileSync(path.join(outDir, 'css/page.css'), pageCss, 'utf-8');
    html = html.replace(pageStyleMatch[0], '<link rel="stylesheet" href="css/page.css">');
    report.push('页面样式 → css/page.css' + (noMinify ? '' : '(minified)'));
  } else {
    report.push('⚠ 未找到页面 <style>，跳过 page.css');
  }

  // 5) 提取模板内联 <script> → js/graph.js
  //    输入里"无 src"的内联 <script> 只有模板一个（echarts/tailwind 都是 src=）。
  //    模板块已验证不含内部 </script>，非贪婪匹配安全。
  const templateMatch = html.match(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/);
  if (templateMatch) {
    const templateJs = minJs(templateMatch[1]);
    if (!/echarts\.init/.test(templateJs)) {
      report.push('⚠ 提取的模板脚本未含 echarts.init，可能匹配错误');
    }
    fs.writeFileSync(path.join(outDir, 'js/graph.js'), templateJs, 'utf-8');
    html = html.replace(templateMatch[0], '<script src="js/graph.js"></script>');
    report.push('模板逻辑 → js/graph.js' + (noMinify ? '' : '(minified)'));
  } else {
    report.push('⚠ 未找到模板内联 <script>，跳过 graph.js');
  }

  // 6) 主题选择器：pickerCSS → css/theme-picker.css + <link>，pickerJS → js/theme-picker.js + <script src>
  //    picker CSS 注入 </head> 末尾（在 page.css 之后），保证级联覆盖（如 .toolbar 过渡规则）。
  fs.writeFileSync(path.join(outDir, 'css/theme-picker.css'), minCss(pickerCSS), 'utf-8');
  fs.writeFileSync(path.join(outDir, 'js/theme-picker.js'), minJs(pickerJS), 'utf-8');
  html = injectBeforeLast(html, '</head>', '<link rel="stylesheet" href="css/theme-picker.css">\n');
  html = injectBeforeLast(html, '</body>', '<script src="js/theme-picker.js"></script>\n');
  report.push('主题选择器 → css/theme-picker.css + js/theme-picker.js');

  // 自检：index.html 是否还有外部 http(s) 引用（应全部本地化）
  const leftover = (html.match(/https?:\/\/(cdn|unpkg|cdnjs|jsdelivr)/g) || []);
  if (leftover.length) report.push('ℹ 剩余外部引用 ' + leftover.length + ' 处');

  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
  return report;
}

// ─────────────────────────────────────────────────────────
// single 模式（--single）：全部内联进一个 HTML（向后兼容）
// ─────────────────────────────────────────────────────────
async function buildSingle(input, output, noMinify) {
  let html = fs.readFileSync(input, 'utf-8');
  const report = [];
  const minJs = (s) => (noMinify ? s : minifyJs(s));
  const minCss = (s) => (noMinify ? s : minifyCss(s));

  // 0) 提取并 minify 模板 JS + 页面 CSS（此时 echarts/tailwind 是 <script src>、FA 是 <link>，
  //    输入里唯一的内联 <script> 即模板、唯一的内联 <style> 即页面样式；echarts/FA 稍后内联，不参与 minify）。
  const tplMatch = html.match(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/);
  if (tplMatch) {
    html = html.replace(tplMatch[0], '<script>' + minJs(tplMatch[1]) + '</script>');
  }
  const pageMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (pageMatch) {
    html = html.replace(pageMatch[0], '<style>' + minCss(pageMatch[1]) + '</style>');
  }
  if (!noMinify) report.push('模板 JS / 页面 CSS / picker 已 minify');

  // 1) ECharts → 内联（源码内部含字面量 </script>，需转义，否则 HTML 解析器提前截断 <script>）
  let echartsJs = (await getAsset('echarts')).toString('utf-8');
  echartsJs = echartsJs.replace(/<\/script/gi, '<\\/script');
  const echBefore = html;
  html = html.replace(
    /<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/echarts[^"]*">\s*<\/script>/,
    '<script>\n' + echartsJs + '\n</script>'
  );
  report.push(html !== echBefore ? 'ECharts 已内联' : '⚠ 未找到 ECharts 标签');

  // 2) Tailwind Play → 移除（未被使用）
  const twBefore = html;
  html = html.replace(/<script\s+src="https:\/\/cdn\.tailwindcss\.com">\s*<\/script>\s*/g, '');
  report.push(html !== twBefore ? 'Tailwind Play 已移除(未使用)' : '(无 Tailwind 标签)');

  // 3) Font Awesome → 内联 CSS + base64 solid 字体（已是压缩版，不再 minify）
  const faCss = await buildFaCss();
  const faBefore = html;
  html = html.replace(
    /<link[^>]*href="https:\/\/cdn\.jsdelivr\.net\/npm\/@fortawesome\/fontawesome-free[^"]*"[^>]*>/,
    '<style>\n' + faCss + '\n</style>'
  );
  report.push(html !== faBefore ? 'Font Awesome 已内联(含 solid 字体)' : '⚠ 未找到 Font Awesome 标签');

  // 4) 主题选择器：pickerCSS/pickerJS 都内联（先 minify）
  html = injectBeforeLast(html, '</head>', '<style id="kg-picker-css">\n' + minCss(pickerCSS) + '\n</style>\n');
  html = injectBeforeLast(html, '</body>', '<script id="kg-picker-js">\n' + minJs(pickerJS) + '\n</script>\n');
  report.push('主题选择器替换为自定义主题化下拉(内联)');

  const leftover = (html.match(/https?:\/\/(cdn|unpkg|cdnjs|jsdelivr)/g) || []);
  if (leftover.length) report.push('ℹ 剩余外部引用 ' + leftover.length + ' 处(未使用的 regular/brands 字体，不影响)');

  fs.writeFileSync(output, html, 'utf-8');
  return report;
}

function usage() {
  console.error('用法:');
  console.error('  node offline-bundle.js <input.html>                  # 默认：单一压缩 HTML，覆盖 input');
  console.error('  node offline-bundle.js <input.html> <out.html>       # 单一压缩 HTML，写到 out.html');
  console.error('  node offline-bundle.js <input.html> --folder         # modular 文件夹 <input名>/');
  console.error('  node offline-bundle.js <input.html> --no-minify      # 关闭 minify');
  console.error('  （--single 作为别名保留，等同默认单文件行为）');
}

async function main() {
  const argv = process.argv.slice(2);
  const folder = argv.includes('--folder');
  const noMinify = argv.includes('--no-minify');
  const positional = argv.filter((a) => a !== '--folder' && a !== '--no-minify' && a !== '--single');
  const input = positional[0];
  const output = positional[1];
  if (!input) { usage(); process.exit(1); }

  if (folder) {
    const parsed = path.parse(input);
    const outDir = output || path.join(parsed.dir, parsed.name);
    fs.mkdirSync(outDir, { recursive: true });
    const report = await buildModular(input, outDir, noMinify);
    // 统计文件夹总大小
    let total = 0;
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p); else total += fs.statSync(p).size;
      }
    })(outDir);
    console.error('离线化完成(文件夹): ' + outDir + ' (' + Math.round(total / 1024) + ' KB)');
    report.forEach((r) => console.error('  - ' + r));
    console.error('  打开 ' + path.join(outDir, 'index.html'));
  } else {
    const out = output || input;
    const report = await buildSingle(input, out, noMinify);
    const kb = Math.round(fs.statSync(out).size / 1024);
    console.error('离线化完成(单一HTML): ' + out + ' (' + kb + ' KB)');
    report.forEach((r) => console.error('  - ' + r));
  }
}

main().catch((e) => { console.error('失败: ' + e.message); process.exit(1); });
