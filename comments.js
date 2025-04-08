// 初始化giscus评论组件
function initGiscus(discussionId) {
  // 移除旧的giscus容器内容
  const giscusContainer = document.querySelector('.giscus');
  if (giscusContainer) {
    giscusContainer.innerHTML = '';
  }

  // 创建giscus脚本元素
  const giscusScript = document.createElement('script');
  giscusScript.src = 'https://giscus.app/client.js';
  giscusScript.setAttribute('data-repo', 'lmc26817/tourtalk');
  giscusScript.setAttribute('data-repo-id', 'R_kgDOOWDnbQ');
  giscusScript.setAttribute('data-category', 'Announcements');
  giscusScript.setAttribute('data-category-id', 'DIC_kwDOOWDnbc4Co5Rh');
  giscusScript.setAttribute('data-mapping', 'specific');
  
  // 设置特定讨论ID，如果提供了discussionId参数
  if (discussionId) {
    giscusScript.setAttribute('data-term', discussionId);
  }
  
  giscusScript.setAttribute('data-strict', '0');
  giscusScript.setAttribute('data-reactions-enabled', '1');
  giscusScript.setAttribute('data-emit-metadata', '0');
  giscusScript.setAttribute('data-input-position', 'bottom');
  giscusScript.setAttribute('data-theme', 'light_high_contrast');
  giscusScript.setAttribute('data-lang', 'zh-CN');
  giscusScript.setAttribute('crossorigin', 'anonymous');
  giscusScript.async = true;

  // 将脚本添加到giscus容器
  if (giscusContainer) {
    giscusContainer.appendChild(giscusScript);
  } else {
    console.error('找不到giscus容器');
  }

  console.log('Giscus script initialized with discussionId:', discussionId);
}

// 不在页面加载完成后自动初始化giscus
// 而是等待用户选择特定巡礼点后再初始化
// document.addEventListener('DOMContentLoaded', initGiscus);

// 导出初始化函数供其他模块使用
window.initGiscus = initGiscus;