// 初始化giscus评论组件
function initGiscus() {
  // 检查是否已经加载了giscus脚本
  if (document.querySelector('script[src*="giscus.app"]')) {
    console.log('Giscus script already loaded');
    return;
  }

  // 创建giscus脚本元素
  const giscusScript = document.createElement('script');
  giscusScript.src = 'https://giscus.app/client.js';
  giscusScript.setAttribute('data-repo', 'lmc26817/tourtalk');
  giscusScript.setAttribute('data-repo-id', 'R_kgDOOWDnbQ');
  giscusScript.setAttribute('data-category', 'Announcements');
  giscusScript.setAttribute('data-category-id', 'DIC_kwDOOWDnbc4Co5Rh');
  giscusScript.setAttribute('data-mapping', 'specific');
  giscusScript.setAttribute('data-strict', '0');
  giscusScript.setAttribute('data-reactions-enabled', '1');
  giscusScript.setAttribute('data-emit-metadata', '1');
  giscusScript.setAttribute('data-input-position', 'bottom');
  giscusScript.setAttribute('data-theme', 'light_high_contrast');
  giscusScript.setAttribute('data-lang', 'zh-CN');
  giscusScript.setAttribute('data-loading', 'lazy');
  giscusScript.setAttribute('crossorigin', 'anonymous');
  giscusScript.async = true;

  // 将脚本添加到页面
  document.body.appendChild(giscusScript);

  console.log('Giscus script initialized');
}

// 在页面加载完成后初始化giscus
document.addEventListener('DOMContentLoaded', initGiscus);

// 导出初始化函数供其他模块使用
window.initGiscus = initGiscus;