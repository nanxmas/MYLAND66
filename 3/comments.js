// 初始化giscus评论组件
function initGiscus(pointId) {
    // 移除现有的giscus容器
    const existingGiscus = document.querySelector('.giscus');
    if (existingGiscus) {
        existingGiscus.remove();
    }

    // 移除现有的giscus脚本
    const existingScript = document.querySelector('script[src*="giscus.app"]');
    if (existingScript) {
        existingScript.remove();
    }
  
    // 创建giscus脚本元素
    const giscusScript = document.createElement('script');
    giscusScript.src = 'https://giscus.app/client.js';
    giscusScript.setAttribute('data-repo', 'lmc26817/tourtalk');
    giscusScript.setAttribute('data-repo-id', 'R_kgDOOWDnbQ');
    giscusScript.setAttribute('data-category', 'Announcements');
    giscusScript.setAttribute('data-category-id', 'DIC_kwDOOWDnbc4Co5Rh');
    giscusScript.setAttribute('data-mapping', 'url');
    giscusScript.setAttribute('data-strict', '0');
    giscusScript.setAttribute('data-reactions-enabled', '1');
    giscusScript.setAttribute('data-emit-metadata', '0');
    giscusScript.setAttribute('data-input-position', 'top');
    giscusScript.setAttribute('data-theme', 'light_high_contrast');
    giscusScript.setAttribute('data-lang', 'zh-CN');
    giscusScript.setAttribute('data-loading', 'lazy');
    giscusScript.setAttribute('crossorigin', 'anonymous');
    giscusScript.async = true;
  
    // 将脚本添加到页面
    document.body.appendChild(giscusScript);
  
    console.log('Giscus script initialized for point:', pointId);
  }
  
  // 导出初始化函数供其他模块使用
  window.initGiscus = initGiscus;